# Trecento Network v0.7.4 — Getty Full Record diagnostic

This build stops guessing at unavailable JSON URLs.

## Relationship source

Artist identity still uses Getty's reconciliation service.

For relationships, the crawler now reads Getty's current `ULANFullDisplay` record, specifically the
`Related People or Corporate Bodies` section. This is the same current Getty page that visibly lists
Giotto's teacher/student relationships.

## Giotto diagnostic

`crawl-status.json` now contains `giotto_relationship_diagnostic`.

A successful run should parse relationships including:
- student of Cimabue
- teacher of Puccio Capanna
- teacher of Bernardo Daddi
- teacher of Taddeo Gaddi
- teacher of Maso di Banco
- teacher of Roberto d'Oderisi
- teacher of Stefano Fiorentino

If that diagnostic is correct, controlled expansion can trust the same parser.

## Reduced API traffic

The invalid `.json` / `.jsonld` probes that caused most of the HTTP errors in v0.7.3 are removed.
Each artist now needs the reconciliation stage plus one full-record fetch.

## Arrow fix

The renderer now has two layers of direction handling:
1. normalized relationship metadata where available
2. a direct fallback: every curated solid workshop edge is treated as master -> pupil

Therefore Bicci di Lorenzo -> Neri di Bicci should display an arrow even if imported metadata fails.
