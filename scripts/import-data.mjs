import fs from "node:fs/promises";

const DATA_PATH = new URL("../data/artists.json", import.meta.url);
const WD = "https://www.wikidata.org/w/api.php";
const COMMONS = "https://commons.wikimedia.org/w/api.php";

async function getJSON(url) {
  const r = await fetch(url, { headers: { "User-Agent": "TrecentoNetwork/0.1 (research prototype)" }});
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${url}`);
  return r.json();
}

async function wikidataSearch(name) {
  const u = new URL(WD);
  u.search = new URLSearchParams({
    action:"wbsearchentities", search:name, language:"en", format:"json", origin:"*", limit:"5"
  });
  const j = await getJSON(u);
  return j.search?.[0]?.id || null;
}

async function wikidataEntity(qid) {
  const u = new URL(WD);
  u.search = new URLSearchParams({
    action:"wbgetentities", ids:qid, props:"sitelinks|claims|labels", languages:"en|it", format:"json", origin:"*"
  });
  const j = await getJSON(u);
  return j.entities?.[qid] || null;
}

async function wikipediaStubStatus(lang, title) {
  const endpoint = `https://${lang}.wikipedia.org/w/api.php`;
  const u = new URL(endpoint);
  u.search = new URLSearchParams({
    action:"query", titles:title, prop:"categories", cllimit:"max", format:"json", origin:"*"
  });
  const j = await getJSON(u);
  const page = Object.values(j.query?.pages || {})[0] || {};
  const cats = (page.categories || []).map(c => c.title.replace(/^Category:/, ""));
  // Wikipedia's own stub templates place pages in stub categories.
  const isStub = cats.some(c => /\bstubs?\b/i.test(c) || /\bstub\b/i.test(c));
  return { isStub, categories: cats };
}

function claimString(entity, property) {
  return entity?.claims?.[property]?.[0]?.mainsnak?.datavalue?.value || null;
}

async function commonsCategoryImages(categoryName, limit=6) {
  if (!categoryName) return [];
  const u = new URL(COMMONS);
  u.search = new URLSearchParams({
    action:"query",
    generator:"categorymembers",
    gcmtitle:`Category:${categoryName}`,
    gcmtype:"file",
    gcmlimit:String(limit),
    prop:"imageinfo",
    iiprop:"url|extmetadata",
    iiurlwidth:"360",
    format:"json",
    origin:"*"
  });
  const j = await getJSON(u);
  const pages = Object.values(j.query?.pages || {});
  return pages.map(p => {
    const ii = p.imageinfo?.[0] || {};
    return {
      title:p.title,
      thumb_url:ii.thumburl || ii.url || null,
      description_url:ii.descriptionurl || null,
      license:ii.extmetadata?.LicenseShortName?.value || null,
      credit:ii.extmetadata?.Credit?.value || null
    };
  }).filter(x => x.thumb_url);
}

async function resolveWikipedia(entity) {
  const en = entity?.sitelinks?.enwiki?.title || null;
  const it = entity?.sitelinks?.itwiki?.title || null;

  if (en) {
    const status = await wikipediaStubStatus("en", en);
    if (!status.isStub) {
      return { language:"en", title:en, is_stub:false, url:`https://en.wikipedia.org/wiki/${encodeURIComponent(en.replaceAll(" ","_"))}` };
    }
  }
  if (it) {
    return { language:"it", title:it, is_stub:null, url:`https://it.wikipedia.org/wiki/${encodeURIComponent(it.replaceAll(" ","_"))}` };
  }
  if (en) {
    return { language:"en", title:en, is_stub:true, url:`https://en.wikipedia.org/wiki/${encodeURIComponent(en.replaceAll(" ","_"))}` };
  }
  return {};
}

async function gettyResolveULAN(name) {
  // Lightweight resolver against Getty's official SPARQL endpoint.
  // This only stores candidate identity in v0.1; detailed ULAN event parsing is the next importer step.
  const query = `
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    SELECT ?s ?label WHERE {
      ?s skos:prefLabel ?label .
      FILTER(STRSTARTS(STR(?s), "http://vocab.getty.edu/ulan/"))
      FILTER(CONTAINS(LCASE(STR(?label)), LCASE("${name.replaceAll('"','\\"')}")))
    } LIMIT 5
  `;
  const u = new URL("https://vocab.getty.edu/sparql");
  u.searchParams.set("query", query);
  u.searchParams.set("format", "application/sparql-results+json");
  try {
    const j = await getJSON(u);
    const hit = j.results?.bindings?.[0];
    if (!hit) return {};
    const uri = hit.s?.value || "";
    return { ulan_uri:uri, ulan_id:uri.split("/").pop(), ulan_label:hit.label?.value || null };
  } catch (e) {
    console.warn(`ULAN lookup failed for ${name}: ${e.message}`);
    return {};
  }
}

async function main() {
  const db = JSON.parse(await fs.readFile(DATA_PATH, "utf8"));

  for (const artist of db.artists) {
    console.log(`Importing ${artist.name}...`);

    try {
      const qid = await wikidataSearch(artist.name);
      if (qid) {
        const entity = await wikidataEntity(qid);
        artist.external_ids.wikidata = qid;
        artist.wikipedia = await resolveWikipedia(entity);

        const commonsCategory = claimString(entity, "P373");
        if (commonsCategory) {
          artist.external_ids.commons_category = commonsCategory;
          artist.commons_images = await commonsCategoryImages(commonsCategory, 6);
        }
      }
    } catch (e) {
      console.warn(`Wikimedia import failed for ${artist.name}: ${e.message}`);
    }

    const ulan = await gettyResolveULAN(artist.name);
    Object.assign(artist.external_ids, ulan);
  }

  db.generated_at = new Date().toISOString();
  db.status = "machine-enriched; activity/relationship claims still require source extraction";
  await fs.writeFile(DATA_PATH, JSON.stringify(db, null, 2));
  console.log(`Updated ${DATA_PATH.pathname}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
