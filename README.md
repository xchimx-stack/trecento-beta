# Trecento Network v0.7.1 — corrected stability build

This build is based on the last working pre-refactor branch and re-applies the stability rules cleanly.

Validated before packaging with `node --check` against the inline application JavaScript.

Key rules:
- no gray activity overlays render
- trusted seed chronology cannot be replaced by failed 1350 fallbacks
- no visible Unclassified Italy bucket
- regional inference uses overrides, relationships, or anchor inheritance
- compact regional spacing retains minimum non-overlap constraints
- startup centers on Giotto at readable zoom
- drag-panning is faster
- selection centering from v0.6.3 is retained
