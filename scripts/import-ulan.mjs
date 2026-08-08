import fs from "node:fs/promises";

const SEEDS = new URL("../data/seed-artists.json", import.meta.url);
const OUT = new URL("../data/imported-artists.json", import.meta.url);
const STATUS = new URL("../data/crawl-status.json", import.meta.url);
const RECONCILE = "https://services.getty.edu/vocab/reconcile/";

const BATCH_SIZE = 10;
const BETWEEN_BATCH_MS = 500;

const run = {
  run_id: `ulan-reconcile-${Date.now()}`,
  source: "Getty ULAN Reconciliation Service",
  endpoint: RECONCILE,
  started_at: new Date().toISOString(),
  completed_at: null,
  duration_ms: null,
  requested_seed_count: 0,
  matched_seed_count: 0,
  unmatched_seed_count: 0,
  request_count: 0,
  batch_count: 0,
  retries: 0,
  throttles_429: 0,
  service_503: 0,
  other_http_errors: 0,
  fatal_error: null,
  unmatched_seeds: [],
  batches: [],
  notes: [
    "Proof-of-concept ULAN-only ingestion using Getty's reconciliation service.",
    "Wikipedia, Wikidata, and Commons are intentionally excluded from this crawl.",
    "Results remain candidates pending review; reconciliation is not treated as fully automatic authority."
  ]
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function postQueries(queries, attempt=0){
  run.request_count += 1;
  const body = new URLSearchParams();
  body.set("queries", JSON.stringify(queries));

  const t0 = Date.now();
  const r = await fetch(RECONCILE, {
    method: "POST",
    headers: {
      "User-Agent": "TrecentoNetwork/0.5.1 ULAN reconciliation proof-of-concept",
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body
  });
  const latency_ms = Date.now() - t0;

  if(r.status === 429 || r.status === 503){
    if(r.status === 429) run.throttles_429 += 1;
    if(r.status === 503) run.service_503 += 1;
    if(attempt >= 5) throw new Error(`${r.status} ${r.statusText} after retries`);
    run.retries += 1;
    const retryAfter = Number(r.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(30000, 1200 * (2 ** attempt));
    await sleep(delay);
    return postQueries(queries, attempt + 1);
  }

  if(!r.ok){
    run.other_http_errors += 1;
    throw new Error(`${r.status} ${r.statusText}`);
  }

  return {json: await r.json(), latency_ms, status:r.status};
}

function chunk(arr,n){
  const out=[];
  for(let i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n));
  return out;
}

function normalizeResult(result){
  const idRaw = result?.id || "";
  const id = idRaw.includes("/") ? idRaw.split("/").pop() : idRaw || null;
  return {
    ulan_id: id,
    ulan_uri: id ? `http://vocab.getty.edu/ulan/${id}` : null,
    ulan_label: result?.name || null,
    score: typeof result?.score === "number" ? result.score : null,
    exact_match: Boolean(result?.match),
    types: result?.type || []
  };
}

async function main(){
  const t0=Date.now();
  const seed=JSON.parse(await fs.readFile(SEEDS,"utf8"));
  const names=seed.artists.map(x=>x.seed_name);
  run.requested_seed_count=names.length;

  const resultByName=new Map();
  const batches=chunk(names,BATCH_SIZE);
  run.batch_count=batches.length;

  for(let bi=0; bi<batches.length; bi++){
    const batch=batches[bi];
    const queries={};
    batch.forEach((name,i)=>{
      queries[`q${i}`]={query:name,type:"/ulan"};
    });

    const batchLog={
      batch_index:bi+1,
      names:batch,
      status:null,
      latency_ms:null,
      error:null
    };

    try{
      const {json,latency_ms,status}=await postQueries(queries);
      batchLog.status=status;
      batchLog.latency_ms=latency_ms;

      batch.forEach((name,i)=>{
        const list=json?.[`q${i}`]?.result || [];
        resultByName.set(name,list.map(normalizeResult));
      });
    }catch(e){
      batchLog.error=e.message;
      batch.forEach(name=>resultByName.set(name,[]));
    }

    run.batches.push(batchLog);
    if(bi < batches.length-1) await sleep(BETWEEN_BATCH_MS);
  }

  const artists=names.map(name=>{
    const candidates=resultByName.get(name) || [];
    if(!candidates.length) run.unmatched_seeds.push(name);
    const best=candidates[0] || null;
    return {
      seed_name:name,
      canonical_name:best?.ulan_label || name,
      ulan:{
        id:best?.ulan_id || null,
        uri:best?.ulan_uri || null,
        score:best?.score ?? null,
        exact_match:best?.exact_match ?? false,
        candidates:candidates.slice(0,5)
      },
      review_status:best ? "ulan_candidate" : "ulan_unmatched"
    };
  });

  run.matched_seed_count=artists.filter(x=>x.ulan.id).length;
  run.unmatched_seed_count=artists.length-run.matched_seed_count;
  run.completed_at=new Date().toISOString();
  run.duration_ms=Date.now()-t0;

  await fs.writeFile(OUT,JSON.stringify({
    generated_at:run.completed_at,
    source:"Getty ULAN Reconciliation Service",
    count:artists.length,
    note:"Candidate identity matches only. No Wikipedia/Wikidata/Commons calls and no automatically asserted art-historical relationships.",
    artists
  },null,2));

  await fs.writeFile(STATUS,JSON.stringify(run,null,2));

  console.log(`ULAN reconciliation: ${run.matched_seed_count}/${run.requested_seed_count} seeds have candidates.`);
  console.log(`Batches: ${run.batch_count}; requests: ${run.request_count}; retries: ${run.retries}; 429s: ${run.throttles_429}; duration: ${run.duration_ms}ms`);
}

main().catch(async e=>{
  run.fatal_error=e.message;
  run.completed_at=new Date().toISOString();
  try{await fs.writeFile(STATUS,JSON.stringify(run,null,2));}catch{}
  console.error(e);
  process.exit(1);
});
