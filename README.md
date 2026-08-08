# Trecento Network v0.6.1 — connection-aware layout

This iteration addresses graph readability rather than expanding the dataset.

## Changes

### Cione family
A proof-of-concept fallback explicitly connects:
- Andrea di Cione (Orcagna)
- Nardo di Cione
- Jacopo di Cione

as siblings using undirected dotted general-influence links.

This exists because the current ULAN display parser is still missing some family relations.
The persistent database should ultimately store the sourced family relationship rather than rely on this fallback.

### Connection-aware layout
After regional fan-out, a barycentric relaxation pass nudges connected artists toward one another horizontally.

- chronology/Y position remains fixed
- regional boundaries remain soft constraints
- anchor artists stay fixed
- collision resolution prevents same-region nodes from collapsing together

This reduces needless edge zig-zags while retaining regional organization.

### Faster navigation
Drag-panning is now approximately 2.15× faster.

### Node prominence
Node radius now grows automatically with graph degree.

High-connectivity artists such as Giotto, Gaddi, Simone Martini, etc. therefore become visibly larger hubs without needing a manually curated size list.

### Selection
The selected artist remains red.
All directly connected artists remain fully opaque.
Only unrelated context fades.
