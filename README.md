# Trecento Network v0.7.3 — structured ULAN relationships

This build fixes two failures observed in v0.7.2:

1. expansion remained around 63 records because the relationship candidate pool was nearly empty
2. curated workshop edges lacked arrowheads

## Structured ULAN relationship ingestion

For each reconciled ULAN ID the importer now attempts:

1. `https://vocab.getty.edu/ulan/{ID}.json`
2. `https://vocab.getty.edu/ulan/{ID}.jsonld`
3. Getty human-readable record page as a fallback

The structured parser recursively inspects Getty relationship predicates and reified relationship objects.
It explicitly recognizes Getty ULAN relationship codes 1101 (teacher of) and 1102 (student of),
plus textual predicates for family, collaboration, employment, membership, and influence.

The HTML fallback is now constrained strictly to the `Related People or Corporate Bodies` section,
rather than applying a greedy regular expression to the whole record.

Crawler telemetry records how many records yielded structured relationships versus HTML fallback relationships.

## Direction normalization

Every relationship now has directional metadata when the evidence supports it.

Curated prototype edges are normalized as follows:
- solid pupil/workshop edge: array order = master -> pupil, with arrow
- dashed direct-influence edge: array order = influencer -> influenced, with arrow
- undirected collaboration: no arrow
- parent -> child: dotted arrow
- sibling/family association: dotted line without arrow

This means curated chains such as Bicci di Lorenzo -> Neri di Bicci now receive arrowheads even if ULAN metadata is absent.

## Controlled expansion

The +50 expansion cap remains.
Once structured relationships populate the candidate pool, the graph should finally grow beyond the original seed set.
