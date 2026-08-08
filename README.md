# Trecento Network v0.7 — stability refactor

This revision replaces several prototype patches with explicit layout/data invariants.

## Hard invariants

1. Chronology controls Y.
2. A failed date parser never silently becomes 1350.
3. Trusted seed chronology outranks failed/imported fallback values.
4. Artists stay inside their assigned/inferred regional neighborhood.
5. Relationship optimization may refine X only inside that neighborhood.
6. Node/label overlap is prohibited by a minimum effective-footprint clearance.
7. Regional gaps are minimized after satisfying non-overlap.
8. There is no visible `Unclassified Italy` region.
9. Undated/unresolved artists remain searchable/data-backed but do not enter the chronological graph until resolved.
10. Gray activity bubbles are completely removed from the renderer.

## Regional inference

When ULAN provides no usable region:
1. use explicit regional override where known
2. use a documented/known anchor region
3. use connected-neighbor region voting
4. use first-degree anchor inheritance
5. as a last visual fallback, place near Florence rather than create a garbage region

This fallback is layout metadata only, not an asserted commission/activity claim.

## Startup

The site now opens centered on Giotto at a readable zoom rather than on a fully zoomed-out overview.
The Overview button still shows the full network.

## Compact packing

Region width is based on actual local time-slice density.
Adjacent regions use a modest gutter after node footprints are packed.
The graph expands only when needed to satisfy the hard non-overlap constraint.

## Navigation

Drag-pan speed is increased for large canvases.
