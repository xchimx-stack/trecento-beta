# Trecento Network v0.5.2 — materialized ULAN proof dataset

This is intentionally a scale/layout test before expanding beyond the current curated 62-name seed population.

## New behavior

1. Reconcile all 62 seed names against Getty ULAN.
2. Fetch each matched ULAN display record.
3. Derive a layout year from the early ULAN record/biography text.
4. Derive a broad regional cluster from ULAN descriptors:
   Florence, Siena, Veneto, Bologna, Rimini, Rome, Naples, or Unclassified Italy.
5. Parse explicit ULAN teacher/student and a small number of direct-association relationship types.
6. Keep only ULAN relationships whose other endpoint is also in this 62-artist proof population.
7. Materialize all 62 records as actual graph nodes.

## Important limitations

This is a visualization proof of concept, not final scholarly normalization.

- ULAN reconciliation candidates remain reviewable.
- Region extraction is intentionally broad.
- A record with insufficient geographic description goes to `Unclassified Italy`.
- Birth/death/activity dates are reduced to one approximate layout year solely to position the node.
- Activity overlays are NOT inferred from birthplace/death place.
- Only explicit ULAN relationship labels generate new edges.
- No Wikipedia/Wikidata/Commons ingestion occurs during the crawl.

The purpose of v0.5.2 is to expose whether 62 real ULAN-derived nodes look coherent enough to justify building the persistent database and expanding the crawler.
