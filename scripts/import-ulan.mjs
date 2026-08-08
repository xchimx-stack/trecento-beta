import fs from "node:fs/promises";

const SEEDS = new URL("../data/seed-artists.json", import.meta.url);
const OUT = new URL("../data/imported-artists.json", import.meta.url);
const STATUS = new URL("../data/crawl-status.json", import.meta.url);
const RECONCILE = "https://services.getty.edu/vocab/reconcile/";
const ULAN_PAGE = id => `https://vocab.getty.edu/page/ulan/${id}`;

const BATCH_SIZE = 10;
const PAGE_CONCURRENCY = 5;

const REGIONAL_ANCHORS = [
  {seed_name:"Giotto di Bondone", region:"Florence"},
  {seed_name:"Duccio di Buoninsegna", region:"Siena"},
  {seed_name:"Pietro Cavallini", region:"Rome"},
  {seed_name:"Paolo Veneziano", region:"Veneto"},
  {seed_name:"Vitale da Bologna", region:"Bologna"},
  {seed_name:"Giovanni da Rimini", region:"Rimini"}
];

const run = {
  run_id:`ulan-materialize-${Date.now()}`,
  source:"Getty ULAN",
  started_at:new Date().toISOString(),
  completed_at:null,
  duration_ms:null,
  requested_seed_count:0,
  matched_seed_count:0,
  detail_pages_requested:0,
  detail_pages_ok:0,
  request_count:0,
  retries:0,
  throttles_429:0,
  service_503:0,
  other_http_errors:0,
  fatal_error:null,
  region_counts:{},
  relationship_count:0,
  notes:[
    "ULAN reconciliation plus ULAN record-page enrichment.",
    "Node chronology/region are derived from ULAN display data for layout testing.",
    "Only explicit teacher/student/workshop-like ULAN relations create edges."
  ]
};

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function request(url, options={}, attempt=0){
  run.request_count++;
  const r=await fetch(url,{
    ...options,
    headers:{
      "User-Agent":"TrecentoNetwork/0.5.2 materialization proof-of-concept",
      ...(options.headers||{})
    }
  });
  if(r.status===429 || r.status===503){
    if(r.status===429) run.throttles_429++;
    if(r.status===503) run.service_503++;
    if(attempt>=5) throw new Error(`${r.status} ${r.statusText} after retries`);
    run.retries++;
    const ra=Number(r.headers.get("retry-after"));
    const delay=Number.isFinite(ra)&&ra>0 ? ra*1000 : Math.min(20000,800*(2**attempt));
    await sleep(delay);
    return request(url,options,attempt+1);
  }
  if(!r.ok){
    run.other_http_errors++;
    throw new Error(`${r.status} ${r.statusText}`);
  }
  return r;
}

function chunk(a,n){const o=[];for(let i=0;i<a.length;i+=n)o.push(a.slice(i,i+n));return o;}

async function reconcile(names){
  const result=new Map();
  for(const batch of chunk(names,BATCH_SIZE)){
    const queries={};
    batch.forEach((name,i)=>queries[`q${i}`]={query:name,type:"/ulan"});
    const body=new URLSearchParams();
    body.set("queries",JSON.stringify(queries));
    const r=await request(RECONCILE,{
      method:"POST",
      headers:{
        "Accept":"application/json",
        "Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"
      },
      body
    });
    const j=await r.json();
    batch.forEach((name,i)=>{
      const candidates=(j?.[`q${i}`]?.result||[]).map(x=>({
        id:String(x.id||"").split("/").pop()||null,
        name:x.name||null,
        score:typeof x.score==="number"?x.score:null,
        match:Boolean(x.match)
      }));
      result.set(name,candidates);
    });
    await sleep(250);
  }
  return result;
}

function decodeHtml(s){
  return String(s||"")
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;|&#160;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&ndash;|&#8211;/gi,"–")
    .replace(/&mdash;|&#8212;/gi,"—")
    .replace(/\s+/g," ")
    .trim();
}

function deriveRegion(text){
  const t=text.toLowerCase();
  if(/\bvenetian\b|\bvenice\b/.test(t)) return "Veneto";
  if(/\bflorentine\b|\bflorence\b/.test(t)) return "Florence";
  if(/\bsienese\b|\bsiena\b/.test(t)) return "Siena";
  if(/\bbolognese\b|\bbologna\b/.test(t)) return "Bologna";
  if(/\brimini\b|\briminese\b/.test(t)) return "Rimini";
  if(/\bpadua\b|\bpaduan\b|\bpadova\b/.test(t)) return "Veneto";
  if(/\brome\b|\broman\b/.test(t)) return "Rome";
  if(/\bnaples\b|\bneapolitan\b/.test(t)) return "Naples";
  return "Unclassified Italy";
}

function deriveYear(text){
  // Use the early record/biography text only so source/publication dates do not contaminate chronology.
  const recordIdx=text.indexOf("Record Type:");
  let section=recordIdx>=0 ? text.slice(recordIdx,recordIdx+1600) : text.slice(0,1600);

  // Handle "active 1341-1347", "1266-1337", "ca. 1300-after 1360", etc.
  const years=[...section.matchAll(/\b(12\d{2}|13\d{2}|14\d{2})\b/g)].map(m=>Number(m[1]));
  if(years.length>=2){
    const a=years[0], b=years[1];
    if(Math.abs(b-a)<=180) return Math.round((a+b)/2);
  }
  if(years.length===1) return years[0];
  return 1350;
}

function extractSummary(text){
  const m=text.match(/Record Type:\s*(?:Person|Corporate Body)\s+(.{1,260}?)(?:\s+Note:|\s+Names:)/i);
  return m ? m[1].trim() : null;
}



function extractRelationships(text,currentId){
  const out=[];
  const relationTypes=[
    "student of","teacher of","employee of","member of",
    "worked with","partner of","collaborated with",
    "influenced by","influenced",
    "child of","parent of","sibling of","brother of","sister of"
  ];

  const relAlt=relationTypes.map(x=>x.replaceAll(" ","\\s+")).join("|");
  const rx=new RegExp(
    `(${relAlt})\\s*\\.{0,24}\\s*([^\\[]]{1,240}?)\\s*\\[(5\\d{8})\\]`,
    "gi"
  );

  for(const m of text.matchAll(rx)){
    const type=m[1].toLowerCase().replace(/\s+/g," ").trim();
    const relatedId=m[3];
    const relatedLabel=m[2]
      .replace(/\([^)]*\)\s*$/,"")
      .replace(/\.+/g," ")
      .replace(/\s+/g," ")
      .trim();

    let from=currentId;
    let to=relatedId;
    let style="dotted";
    let meaning="general influence";
    let directed=false;
    let evidence_class="association";

    if(type==="student of"){
      // current artist is pupil -> arrow teacher -> current
      from=relatedId; to=currentId;
      style="solid"; directed=true;
      meaning="pupil / workshop";
      evidence_class="documented_training";
    }else if(type==="teacher of"){
      from=currentId; to=relatedId;
      style="solid"; directed=true;
      meaning="pupil / workshop";
      evidence_class="documented_training";
    }else if(type==="employee of"){
      // employer/workshop -> employee
      from=relatedId; to=currentId;
      style="solid"; directed=true;
      meaning="pupil / workshop";
      evidence_class="workshop_employment";
    }else if(type==="member of"){
      // membership alone lacks reliable direction
      style="solid"; directed=false;
      meaning="pupil / workshop";
      evidence_class="workshop_membership";
    }else if(type==="influenced by"){
      from=relatedId; to=currentId;
      style="dashed"; directed=true;
      meaning="collaborator / direct influence";
      evidence_class="direct_influence";
    }else if(type==="influenced"){
      from=currentId; to=relatedId;
      style="dashed"; directed=true;
      meaning="collaborator / direct influence";
      evidence_class="direct_influence";
    }else if(type==="worked with" || type==="partner of" || type==="collaborated with"){
      style="dashed"; directed=false;
      meaning="collaborator / direct influence";
      evidence_class="collaboration";
    }else if(type==="parent of"){
      from=currentId; to=relatedId;
      style="dotted"; directed=true;
      meaning="general influence";
      evidence_class="family_parent_child";
    }else if(type==="child of"){
      from=relatedId; to=currentId;
      style="dotted"; directed=true;
      meaning="general influence";
      evidence_class="family_parent_child";
    }else if(type==="sibling of" || type==="brother of" || type==="sister of"){
      style="dotted"; directed=false;
      meaning="general influence";
      evidence_class="family_sibling";
    }

    out.push({
      current_id:currentId,
      related_id:relatedId,
      related_label:relatedLabel,
      source_relation:type,
      from_ulan:from,
      to_ulan:to,
      style,
      meaning,
      directed,
      evidence_class
    });
  }
  return out;
}

async function enrichOne(base){
  if(!base.ulan.id) return base;
  run.detail_pages_requested++;
  try{
    const r=await request(ULAN_PAGE(base.ulan.id),{headers:{"Accept":"text/html"}});
    const html=await r.text();
    const text=decodeHtml(html);
    run.detail_pages_ok++;
    const region=deriveRegion(text);
    run.region_counts[region]=(run.region_counts[region]||0)+1;
    return {
      ...base,
      ulan:{
        ...base.ulan,
        page_url:ULAN_PAGE(base.ulan.id),
        summary:extractSummary(text)
      },
      layout:{
        year:deriveYear(text),
        region
      },
      relationships:extractRelationships(text,base.ulan.id)
    };
  }catch(e){
    return {...base,layout:{year:1350,region:"Unclassified Italy"},relationships:[],detail_error:e.message};
  }
}

async function mapLimit(items,limit,fn){
  const results=new Array(items.length);
  let next=0;
  async function worker(){
    while(true){
      const i=next++;
      if(i>=items.length) return;
      results[i]=await fn(items[i],i);
      await sleep(120);
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},()=>worker()));
  return results;
}


async function main(){
  const t0=Date.now();
  const seed=JSON.parse(await fs.readFile(SEEDS,"utf8"));
  const names=[...new Set([
    ...seed.artists.map(x=>x.seed_name),
    ...REGIONAL_ANCHORS.map(x=>x.seed_name)
  ])];
  run.requested_seed_count=names.length;

  const rec=await reconcile(names);
  let artists=names.map(name=>{
    const c=rec.get(name)||[];
    const best=c[0]||null;
    return {
      seed_name:name,
      canonical_name:best?.name||name,
      ulan:{
        id:best?.id||null,
        uri:best?.id?`http://vocab.getty.edu/ulan/${best.id}`:null,
        score:best?.score??null,
        exact_match:best?.match??false,
        candidates:c.slice(0,5)
      },
      anchor_region:REGIONAL_ANCHORS.find(x=>x.seed_name===name)?.region||null,
      review_status:best?"ulan_candidate":"ulan_unmatched"
    };
  });
  run.matched_seed_count=artists.filter(x=>x.ulan.id).length;

  artists=await mapLimit(artists,PAGE_CONCURRENCY,enrichOne);

  // Discover one degree of related ULAN records from the hard-coded regional anchors.
  const anchorIds=new Set(
    artists.filter(a=>a.anchor_region && a.ulan.id).map(a=>a.ulan.id)
  );
  const knownIds=new Set(artists.map(a=>a.ulan.id).filter(Boolean));
  const discovered=[];

  for(const a of artists){
    if(!anchorIds.has(a.ulan.id)) continue;
    for(const rel of a.relationships||[]){
      if(!rel.related_id || knownIds.has(rel.related_id)) continue;
      knownIds.add(rel.related_id);
      discovered.push({
        seed_name:rel.related_label || `ULAN ${rel.related_id}`,
        canonical_name:rel.related_label || `ULAN ${rel.related_id}`,
        ulan:{
          id:rel.related_id,
          uri:`http://vocab.getty.edu/ulan/${rel.related_id}`,
          score:null,
          exact_match:true,
          candidates:[]
        },
        discovered_from_anchor:a.ulan.id,
        review_status:"ulan_related_candidate"
      });
    }
  }

  const enrichedDiscovered=await mapLimit(discovered,PAGE_CONCURRENCY,enrichOne);
  artists.push(...enrichedDiscovered);

  // Build relationship graph across all included records.
  const ids=new Set(artists.map(a=>a.ulan.id).filter(Boolean));
  const priority={solid:3,dashed:2,dotted:1};
  const byPair=new Map();

  for(const a of artists){
    for(const rel of a.relationships||[]){
      if(!ids.has(rel.related_id)) continue;

      const from=rel.from_ulan||a.ulan.id;
      const to=rel.to_ulan||rel.related_id;
      const unordered=[from,to].sort().join("|");

      const evidence={
        from_ulan:from,
        to_ulan:to,
        style:rel.style,
        meaning:rel.meaning,
        directed:Boolean(rel.directed),
        source:"Getty ULAN",
        source_relation:rel.source_relation,
        evidence_class:rel.evidence_class
      };

      const existing=byPair.get(unordered);
      if(!existing){
        byPair.set(unordered,{
          ...evidence,
          evidence:[evidence]
        });
      }else{
        existing.evidence.push(evidence);
        if((priority[rel.style]||0) > (priority[existing.style]||0)){
          existing.from_ulan=from;
          existing.to_ulan=to;
          existing.style=rel.style;
          existing.meaning=rel.meaning;
          existing.directed=Boolean(rel.directed);
          existing.source_relation=rel.source_relation;
          existing.evidence_class=rel.evidence_class;
        }else if(
          (priority[rel.style]||0)===(priority[existing.style]||0) &&
          rel.directed && !existing.directed
        ){
          // Same strength, but a directional source is more informative.
          existing.from_ulan=from;
          existing.to_ulan=to;
          existing.directed=true;
          existing.source_relation=rel.source_relation;
          existing.evidence_class=rel.evidence_class;
        }
      }
    }
  }

  const graphRelationships=[...byPair.values()];
  run.relationship_count=graphRelationships.length;
  run.anchor_count=REGIONAL_ANCHORS.length;
  run.discovered_first_degree_count=enrichedDiscovered.length;
  run.total_artist_count=artists.length;

  run.completed_at=new Date().toISOString();
  run.duration_ms=Date.now()-t0;

  await fs.writeFile(OUT,JSON.stringify({
    generated_at:run.completed_at,
    source:"Getty ULAN",
    count:artists.length,
    anchors:REGIONAL_ANCHORS,
    note:"Proof dataset with hard-coded regional anchors and one-degree ULAN expansion from anchors.",
    artists,
    relationships:graphRelationships
  },null,2));
  await fs.writeFile(STATUS,JSON.stringify(run,null,2));

  console.log(`Materialized ${artists.length} ULAN records (${enrichedDiscovered.length} first-degree anchor discoveries).`);
  console.log(`Relationships: ${graphRelationships.length}; detail pages ${run.detail_pages_ok}/${run.detail_pages_requested}.`);
}
main().catch(async e=>{
  run.fatal_error=e.message;
  run.completed_at=new Date().toISOString();
  try{await fs.writeFile(STATUS,JSON.stringify(run,null,2));}catch{}
  console.error(e); process.exit(1);
});
