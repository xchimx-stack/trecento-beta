# Trecento Network v0.4.2 — lazy-loaded Commons thumbnails

This version keeps the approved interactive graph behavior and adds a deployment-time enrichment pipeline.

## What happens on Vercel build

`npm run build` attempts to resolve the 62 curated seed names against:
- Wikidata
- English + Italian Wikipedia
- Wikipedia's own English stub categories
- Wikimedia Commons
- Getty ULAN

It writes `public/imported-artists.json`. If an external service is temporarily unavailable, the site
still deploys with the seed list rather than failing completely.

## What the browser does

- Loads `imported-artists.json`
- Adds all imported identities to artist search
- A searched imported artist can be materialized on the graph even if it is not a default-visible node
- Uses routed Wikipedia link in the drawer
- Uses real Commons thumbnails when available
- Shows Wikidata/ULAN identity metadata and resolved dates when available

## Important scope boundary

This version does NOT automatically assert workshop/influence/activity edges from prose.
Those need the next provenance-aware extraction layer.

The existing core network remains a curated/prototype topology so that unreviewed identity matches cannot silently
become historical claims.

## Deploy

Replace the repository contents with this package, commit to `main`, and Vercel should redeploy automatically.


## v0.4.1 deployment fix
The importer now:
- spaces external API requests
- retries HTTP 429/503 responses with exponential backoff
- respects Retry-After when supplied
- continues past an individual failed artist/service instead of aborting the deployment
- adds extra delay between artists for Vercel shared-IP rate limits


## v0.4.2 scaling change
Commons thumbnails are no longer fetched during the Vercel build.

The importer now stores only the artist's Commons category. When a user selects an artist,
the browser requests that artist's thumbnails directly from Wikimedia Commons, then caches
the result in memory for the rest of that browsing session.

This materially reduces deployment-time API traffic and makes the site scale better to hundreds
or thousands of artist records.
