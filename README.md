# Trecento Network v0.5.3 — readability and ULAN relationship pass

This revision focuses on readability and ULAN relationship handling.

## Layout
- vertical chronology remains primary
- regional/school territories are elastic, not equal-width
- width grows with the number of artists assigned to the region
- collision avoidance spreads contemporaries
- major anchors receive larger exclusion zones
- Giotto and Duccio receive extra spacing when needed
- the canvas becomes wider as density requires

## ULAN relationship mapping
- teacher / student / employee / workshop-style membership -> solid
- worked with / collaborator / partner / explicit influence -> dashed
- parent / child / sibling / brother / sister -> dotted

Family alone therefore creates a baseline general-influence edge.
Stronger evidence upgrades the visible edge with precedence:

solid > dashed > dotted

Multiple pieces of evidence are retained behind the displayed edge.

## Scope
No new seed artists were added. This is still the same proof population so we can judge readability before expansion or persistent-database work.
