import fs from "node:fs/promises";

const root = new URL("../", import.meta.url);
const imported = new URL("../data/imported-artists.json", import.meta.url);
const publicData = new URL("../public/imported-artists.json", import.meta.url);

try {
  console.log("Running Trecento enrichment importer...");
  await import("./import-scale-test.mjs");
  // import script is async via main(); give the output a short chance to land
  for(let i=0;i<120;i++){
    try { await fs.access(imported); break; }
    catch { await new Promise(r=>setTimeout(r,250)); }
  }
} catch(e) {
  console.warn("Importer did not complete; deploying with seed/fallback data:", e.message);
}

try {
  await fs.copyFile(imported, publicData);
  console.log("Copied generated artist dataset to public/imported-artists.json");
} catch {
  const seed = JSON.parse(await fs.readFile(new URL("../data/seed-artists.json", import.meta.url),"utf8"));
  const fallback = {
    generated_at:null,
    count:seed.artists.length,
    note:"Fallback seed dataset; enrichment unavailable during this build.",
    artists:seed.artists.map(x=>({
      seed_name:x.seed_name,
      canonical_name:x.seed_name,
      wikipedia:{preferred:null},
      commons:{category:null,images:[]},
      wikidata:{},
      ulan:{candidates:[]},
      review_status:"seed"
    }))
  };
  await fs.writeFile(publicData, JSON.stringify(fallback,null,2));
  console.log("Wrote fallback public/imported-artists.json");
}

await fs.access(new URL("../public/index.html", import.meta.url));
console.log("Trecento Network v0.4 ready.");
