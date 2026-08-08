import fs from "node:fs/promises";

const SEEDS = new URL("../data/seed-artists.json", import.meta.url);
const OUT = new URL("../data/imported-artists.json", import.meta.url);
const STATUS = new URL("../data/crawl-status.json", import.meta.url);
const GETTY = "https://vocab.getty.edu/sparql";

const run = {
  run_id: `ulan-${Date.now()}`,
  source: "Getty ULAN",
  started_at: new Date().toISOString(),
  completed_at: null,
  duration_ms: null,
  requested_seed_count: 0,
  matched_seed_count: 0,
  unmatched_seed_count: 0,
  request_count: 0,
  retries: 0,
  throttles_429: 0,
  service_503: 0,
  other_http_errors: 0,
  fatal_error: null,
  unmatched_seeds: [],
  notes: [
    "Proof-of-concept ULAN-only ingestion.",
    "Wikipedia, Wikidata, and Commons are intentionally excluded from this crawl."
  ]
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJSON(url, attempt=0){
  run.request_count += 1;
  const r = await fetch(url, {
    headers: {
      "User-Agent": "TrecentoNetwork/0.5 ULAN proof-of-concept",
      "Accept": "application/sparql-results+json"
    }
  });

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
    return getJSON(url, attempt + 1);
  }

  if(!r.ok){
    run.other_http_errors += 1;
    throw new Error(`${r.status} ${r.statusText}`);
  }
  return r.json();
}

function esc(s){
  return s.replaceAll("\\","\\\\").replaceAll('"','\\"');
}

async function main(){
  const t0 = Date.now();
  const seed = JSON.parse(await fs.readFile(SEEDS, "utf8"));
  const names = seed.artists.map(x => x.seed_name);
  run.requested_seed_count = names.length;

  // One SPARQL request for the full seed list. This is intentionally much lighter
  // than the prior multi-source, multi-request-per-artist build.
  const values = names.map(n => `"${esc(n)}"`).join(" ");
  const query = `
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT ?needle ?s ?label WHERE {
  VALUES ?needle { ${values} }
  ?s skos:prefLabel ?label .
  FILTER(STRSTARTS(STR(?s), "http://vocab.getty.edu/ulan/"))
  FILTER(CONTAINS(LCASE(STR(?label)), LCASE(?needle)))
}
ORDER BY ?needle ?label
`;

  const u = new URL(GETTY);
  u.searchParams.set("query", query);
  u.searchParams.set("format", "application/sparql-results+json");

  let rows = [];
  try{
    const result = await getJSON(u);
    rows = result.results?.bindings || [];
  }catch(e){
    run.fatal_error = e.message;
  }

  const byNeedle = new Map();
  for(const row of rows){
    const needle = row.needle?.value;
    if(!needle) continue;
    if(!byNeedle.has(needle)) byNeedle.set(needle, []);
    byNeedle.get(needle).push({
      ulan_id: row.s?.value?.split("/").pop() || null,
      ulan_uri: row.s?.value || null,
      ulan_label: row.label?.value || null
    });
  }

  const artists = names.map(name => {
    const candidates = byNeedle.get(name) || [];
    if(!candidates.length) run.unmatched_seeds.push(name);
    const best = candidates[0] || null;
    return {
      seed_name: name,
      canonical_name: best?.ulan_label || name,
      ulan: {
        id: best?.ulan_id || null,
        uri: best?.ulan_uri || null,
        candidates
      },
      review_status: best ? "ulan_candidate" : "ulan_unmatched"
    };
  });

  run.matched_seed_count = artists.filter(x => x.ulan.id).length;
  run.unmatched_seed_count = artists.length - run.matched_seed_count;
  run.completed_at = new Date().toISOString();
  run.duration_ms = Date.now() - t0;

  await fs.writeFile(OUT, JSON.stringify({
    generated_at: run.completed_at,
    source: "Getty ULAN only",
    count: artists.length,
    note: "Identity candidates only. No Wikipedia/Wikidata/Commons calls and no automatically asserted art-historical relationships.",
    artists
  }, null, 2));

  await fs.writeFile(STATUS, JSON.stringify(run, null, 2));

  console.log(`ULAN proof-of-concept: ${run.matched_seed_count}/${run.requested_seed_count} seeds matched.`);
  console.log(`Requests: ${run.request_count}; retries: ${run.retries}; 429s: ${run.throttles_429}; duration: ${run.duration_ms}ms`);
}

main().catch(async e => {
  run.fatal_error = e.message;
  run.completed_at = new Date().toISOString();
  try { await fs.writeFile(STATUS, JSON.stringify(run, null, 2)); } catch {}
  console.error(e);
  process.exit(1);
});
