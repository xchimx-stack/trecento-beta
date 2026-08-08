# Trecento Network integrated scale-test

This is the single replacement project for the current prototype.

## Current deployed UI behavior
- white, frameless pan/zoom canvas
- vertical chronology
- organic regional/workshop clustering
- left artist drawer
- selected artist in light red
- activity washes positioned by regional/time field
- selection preserves the user's zoom
- progressive disclosure of minor artists
- up to 9 minor connections plus an ADDITIONAL node and right overflow drawer

The UI still contains temporary Artist 1–18 nodes under Giotto specifically to test overflow.
Remove these before publication.

## Data pipeline
`data/seed-artists.json` contains 62 manually selected discovery seeds.
`scripts/import-scale-test.mjs` enriches them from Wikidata/Wikipedia/Commons/Getty ULAN.
`data/visibility-rules.json` contains the current prominence/reveal policy.

The importer is intentionally NOT run during Vercel build yet. Its output still needs to be
connected to the visualization and relationship/activity extraction needs provenance review.
This prevents a deployment from silently publishing unreviewed identity matches.

## Deploy
Upload the CONTENTS of this folder to the root of the GitHub repository, replacing the old prototype.
Vercel will serve `public/index.html`.

## Next development milestone
Run the importer, review identity matches, add sourced activity/relationship extraction, then replace
the temporary hard-coded visualization dataset with generated data.
