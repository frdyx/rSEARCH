# Asset specifications

The public visual system uses warm off-white, graphite, teal and restrained amber. White document cards and thin connections explain how research informs a decision. Amber marks a remaining question. There are no illustrated users or photographic office scenes.

## Files and exports

| Asset | Purpose | Export |
|---|---|---|
| [Hero](../assets/hero.webp) | Question → research → evidence dossier | WebP, up to 1400 px wide |
| [Technology selection](../assets/technology-selection.webp) | Options → evidence → decision | WebP, 16:9 |
| [Migration planning](../assets/migration-planning.webp) | Current system → research → migration plan | WebP, 16:9 |
| [Interaction research](../assets/interface-research.webp) | Prior art → patterns → design direction | WebP, 16:9 |
| [Source audit](../assets/source-audit.webp) | Shared origins and separate evidence paths | WebP, 16:9 |
| [Dataflow](../assets/dataflow.svg) | Exact runtime architecture | Editable SVG; [PNG alternative](../assets/dataflow.png) |
| [Social preview](../assets/social-preview.png) | GitHub link preview | PNG, 1280 × 640 |
| [Icon](../assets/icon.svg) | Desktop extension identity | Editable SVG; [PNG](../assets/icon.png) |

The four use-case cards carry their matching two-line title in the left 35%, with the explanatory illustration and functional labels on the right. Titles use bold graphite sans-serif type with consistent scale and spacing. The hero and social preview include the brand headline. README image alt text names the use case and explains the mechanism.

## Reproduce or revise

[specifications.json](../assets/specifications.json) records the prompts, reference relationships, palette, file names and alt text. Original generated PNGs and the title editions are retained in [assets/raw](../assets/raw). Each card records its exact headline, line breaks and edit prompts. Bitmap art and headline edits use OpenAI imagegen. A new generation can vary; the saved source files make the published exports reproducible.

Run `npm ci --ignore-scripts`, then `npm run build:assets`. This converts the selected sources from the specifications to compact WebP exports, makes the social preview exactly 1280 × 640, and rebuilds the SVG/PNG architecture and icon from [build-assets.mjs](../scripts/build-assets.mjs).

Edit the vector source for architecture changes so arrows and labels correspond to the runtime. Use imagegen for changes to the bitmap illustrations, with the technology-selection image as the series reference.

The artwork explains inspectable research. It does not assert measured speed improvements, automatic correctness or guaranteed source independence.
