# Trecento Network v0.6 — anchor expansion + directional relationships

This revision implements the interaction/layout rules agreed before persistent-database work.

## Hard-coded regional anchors

- Florence — Giotto
- Siena — Duccio
- Rome — Pietro Cavallini
- Veneto — Paolo Veneziano
- Bologna — Vitale da Bologna
- Rimini — Giovanni da Rimini

These are visual starting anchors, not claims that each artist is literally the sole founder of the regional tradition.

## Organic layout

Regions are no longer equal columns. Each region gets an elastic horizontal territory whose width grows with artist density.

Artists fan around the regional anchor while chronology remains vertical. Collision avoidance spreads contemporaries horizontally.

No visible region boxes are drawn.

## ULAN expansion

The importer still begins with the curated seed list, but now performs a **one-degree expansion from the hard-coded regional anchors**.

If an anchor's ULAN record names a related artist not already in the seed population, that related ULAN record is added to the proof dataset and enriched.

This is specifically intended to test how real relationship density behaves before recursive expansion.

## Relationship mapping and arrows

### Solid
teacher → pupil / workshop follower  
employee/workshop relationships where direction is known

### Dashed
documented influence → influenced artist  
collaboration / partnership stays undirected when ULAN does not imply direction

### Dotted
parent → child  
siblings/family associations remain undirected

Family alone is a baseline general-influence relationship. Stronger evidence upgrades the edge:
solid > dashed > dotted.

All source evidence remains retained behind the displayed edge.

## Selection behavior

- selected node remains light red
- all directly connected nodes remain fully opaque
- all directly connected edges remain fully opaque
- unrelated graph context fades
- selection does not change zoom
