# Trecento Network v0.5 — ULAN-only proof of concept

This revision intentionally removes Wikipedia, Wikidata, and Wikimedia Commons from the deployment crawler.

## Proof-of-concept goal

Determine whether Getty ULAN alone can cheaply and reliably populate the initial artist identity layer.

The importer makes one batched SPARQL query for the curated seed list rather than several external
requests per artist.

## Crawler telemetry

Every crawl writes:

- `data/crawl-status.json`
- copied to `public/crawl-status.json`

The site exposes this through the **Crawl status** button.

Recorded fields include:
- run ID
- start/completion time
- duration
- seed count
- matched/unmatched count
- HTTP request count
- retries
- HTTP 429 throttle events
- HTTP 503 events
- other HTTP errors
- unmatched seed names
- fatal error, if any

This is the prototype for the eventual backend observability tables.

## Planned database observability

When the persistent database is added, use at least:

`crawl_runs`
- crawl_run_id
- source
- started_at
- completed_at
- requested_count
- success_count
- failure_count
- throttle_count
- retry_count
- status

`source_request_events`
- crawl_run_id
- source
- endpoint
- artist/entity key
- requested_at
- response_status
- retry_after
- latency_ms
- attempt_number

`artist_enrichment_status`
- artist_id
- source
- last_success_at
- last_attempt_at
- next_eligible_at
- failure_count
- last_http_status
- enrichment_state

That makes throttling visible and also lets incremental Wikipedia enrichment pause/resume intelligently.

## Future Wikipedia strategy

Wikipedia/Wikidata enrichment should be slow and incremental against the persistent database, not part
of Vercel deployment. Commons thumbnails should remain lazy-loaded only when an artist is selected.
