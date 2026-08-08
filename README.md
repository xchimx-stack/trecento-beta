# Trecento Network v0.7.2 — controlled ULAN expansion

Purpose: stress-test the graph before persistent database work.

## Expansion

The importer keeps the existing seed/anchor population and adds at most 50 additional ULAN records.

Expansion sources are ranked:
1. hard-coded regional anchors
2. highest-degree current artists

Related artist candidates are prioritized:
1. teacher/student/workshop
2. family
3. direct collaboration/influence
4. other association

No recursive unlimited crawl occurs.

## Layout

Regional packing is tightened again to reduce unnecessary horizontal whitespace.

The non-overlap rule remains hard:
- tighter region widths
- smaller inter-region gutters
- slightly stronger collision clearance

Chronology and regional constraints remain unchanged.

## Expected scale

This build should land around roughly 100–120 total ULAN records depending on how many unique first-degree candidates Getty exposes.
