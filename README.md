# Trecento Network — starter project

This is the first deployable prototype for the Trecento artist network.

## What works now

- Nine seed artists.
- School-based layout (Florence / Siena) loosely constrained by chronology.
- Three relationship line styles:
  - solid = pupil/workshop
  - dashed = collaborator/direct influence
  - dotted = general influence
- Clicking an artist fades the network and shows activity overlays.
- Wikimedia importer:
  - resolves Wikidata entity
  - chooses English Wikipedia unless Wikipedia itself categorizes the page as a stub
  - falls back to Italian Wikipedia
  - pulls up to six images from the artist's Wikimedia Commons category
- Getty ULAN resolver:
  - queries Getty's official SPARQL endpoint
  - stores a candidate ULAN ID/URI

## Important limitation

The existing activity and relationship records are still **prototype seed data**. The importer currently enriches identity, Wikipedia routing, Commons media, and ULAN identity.

The next development step is automated extraction of **activity + artist relationships + dates + source passages** from ULAN records and Italian Wikipedia. That layer should write claims with provenance rather than silently replacing the seed records.

## Run locally

You need Node.js 20.9+.

```bash
npm install
npm run import:data
npm run dev
```

Open http://localhost:3000.

## Put it on GitHub (web browser method)

1. Open your empty `trecento-network` repository on GitHub.
2. Choose **Add file → Upload files**.
3. Unzip this project on your computer.
4. Drag the *contents* of the `trecento-network` folder into GitHub (not the outer folder itself).
5. Commit the upload.

## Deploy on Vercel

1. In Vercel choose **Add New → Project**.
2. Import your GitHub `trecento-network` repository.
3. Vercel should detect **Next.js** automatically.
4. Click **Deploy**.
5. You will receive a `*.vercel.app` test URL.

You do not need Supabase yet.

## Data file

`data/artists.json`

The visualization reads this file directly. Import scripts update it, so the interface and data pipeline stay separate.

## Why activity overlays are not maps

The main visualization is an art-historical network, not geography. Activity records are therefore positioned over the relevant school/chronological region to show possible contact without asserting an influence relationship.
