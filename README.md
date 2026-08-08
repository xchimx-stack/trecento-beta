# Trecento Network v0.7.5 — Tuscany-centered compact layout

Importer is unchanged from v0.7.4.

## Geographic grammar

Tuscany is fixed at the visual center:

Naples / Rome / Pisa <- Florence / Siena -> Bologna / Rimini / Veneto

The ordering is approximate visual geography, not a literal map.

## Dense-region behavior

Region width is driven by the maximum density of artists active in overlapping 20-year bands.

Florence therefore expands more than Bologna or Rimini when it has more contemporaneous nodes.

## Label-aware collision

Spacing now estimates both:
- node-circle footprint
- rendered artist-name width

This prevents the prior situation where circles technically did not overlap but labels did.

## Compactness

Regions are packed outward from Tuscany with a 70px base gutter.
Large empty gaps are no longer created from a raw artist-count multiplier.

Hard non-overlap still takes precedence over compactness.

## Startup

The default view centers on Giotto at a readable zoom.
Overview remains available for the full graph.
