# Trecento Network v0.5.1 — Getty ULAN reconciliation proof of concept

This revision replaces the failed one-shot SPARQL name query with Getty's
**Vocabulary Reconciliation Service**, which is specifically intended to match
text strings such as artist names to ULAN records.

## Crawl behavior

- ULAN only
- 62 curated seed names
- batches of 10 names
- one reconciliation POST per batch
- 500 ms pause between batches
- retry/backoff for HTTP 429 and 503
- candidate results are stored with ULAN ID, label, score, exact-match flag and up to five candidates

No Wikipedia, Wikidata or Wikimedia Commons requests occur during deployment.

## Important scholarly safeguard

Getty's reconciliation workflow itself is semi-automated. A candidate ULAN match
is therefore recorded as `ulan_candidate`, not silently treated as verified identity.

## Crawl telemetry

The **Crawl status** drawer is now scrollable and shows:
- source endpoint
- duration
- batch count
- request count
- matches/unmatched
- retries and throttles
- batch-by-batch HTTP status/latency/errors
- unmatched names

This telemetry will become database tables once the proof of concept is stable.

## Why reconciliation instead of SPARQL for discovery?

SPARQL remains useful for retrieving structured fields from a known ULAN ID.
Name-to-entity matching is a different problem. Getty provides the reconciliation
service specifically for this use case, so the intended future flow is:

1. Reconcile artist name → ULAN ID
2. Store/review identity
3. Retrieve structured ULAN fields for the known ID
4. Later enrich slowly from Wikipedia/Wikidata
5. Load Commons media only on artist selection
