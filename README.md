# Trecento Network v0.7.6 — validation + canonical cleanup

## ULAN record hygiene
- related ULAN IDs are fetched normally
- displayed node name is taken from the related record's preferred ULAN name
- relationship prose is never trusted as the final node label
- corporate-body records (e.g. Gaddi family) are excluded from artist expansion
- sentence-like contaminated labels are rejected

## Cione-family stability
Nardo di Cione is a critical proof node and cannot silently disappear.
If import/materialization fails to create him, the browser creates a temporary Florentine fallback node.

Expected family edges:
- Orcagna — Nardo: dotted undirected sibling baseline
- Nardo — Jacopo: dotted undirected sibling baseline
- Nardo -> Mariotto: dotted directional parent/child baseline

## Visible arrows
Edges are now geometrically clipped to the source/target node boundaries.
Arrowheads terminate outside the target circle instead of being hidden underneath it.

All curated solid pupil/workshop edges are directional master -> pupil unless explicit metadata says otherwise.

## Runtime validation
The data-status badge reports validation X/6.

The six required tests are:
1. Nardo exists
2. Orcagna—Nardo dotted
3. Nardo—Jacopo dotted
4. Nardo->Mariotto dotted + directional
5. Giotto->Bernardo Daddi solid + directional
6. Bicci di Lorenzo->Neri di Bicci solid + directional

## Regional flow
Extra regional gutters are reduced to ordinary node-clearance scale.
Florence and Siena anchors sit toward the shared Tuscan core rather than at the centers of very wide independent blocks.
