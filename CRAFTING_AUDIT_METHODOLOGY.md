# Crafting Audit Methodology (RDR2 Ultimate)

This document describes the process used to audit and improve `crafting.json` for correctness and usability (especially ingredient-based lookups like “what can I craft with X?”).

## Scope & goals

- **Primary goal**: Ensure each recipe’s **ingredients**, **quantities**, **crafting location**, **unlock**, and (when applicable) **Fence crafting price** are accurate.
- **Secondary goal**: Keep the dataset **usable for search** and UI rendering, including alternative-ingredient cases.
- **Non-goals**: Add speculative recipes or rely on memory. If reputable sources conflict, mark the entry **unclear** rather than “fixing” it.

## Operating rules

- **Audit first, fix second**: For each batch, publish findings as **match / mismatch / unclear** *before* editing anything.
- **Edits only after approval**: Apply dataset changes only after the user explicitly says **“fix”** (or “fix batch N”).
- **Prefer surgical changes**: Make the smallest targeted modifications needed to align with sources and existing schema conventions.

## Batch selection (10 at a time)

- Recipes are audited in **`crafting.json` file order**: `craftingRecipes[0..]`.
- Each batch is **10 recipes**:
  - Batch 1 = 1–10, Batch 2 = 11–20, etc.
- For each new batch, generate a **checkpoint snapshot** of the current local recipe fields so we can see exactly what we’re auditing and avoid drifting targets.

## Evidence and sources

### Source requirements

- Use **at least 2 reputable sources per recipe** when possible.
- Prefer sources that explicitly state:
  - Ingredients and quantities
  - Crafting location (Campfire/Fence/Trapper/Pearson/etc.)
  - Crafting fee (for Fence items)
  - Unlock/availability triggers (mission/pamphlet/chapter)

### Preferred source hierarchy (typical)

- **IGN RDR2 Wiki** pages for specific items/recipes.
- **Red Dead Wiki (Fandom)** pages for the same.
- A third source (Polygon, Eurogamer, GamesRadar, rdr2.org, etc.) when:
  - IGN/Fandom disagree
  - A value is missing on one page (often prices)
  - The entry is known to have naming variants (trinket vs talisman, “white bison” vs “tatanka,” etc.)

### Citation approach

- In audit notes, attach a direct page link for each key claim (ingredients/price/effect/unlock).
- If a source is low-quality or derivative, treat it as **supporting** only; do not override better sources.

## Match / mismatch / unclear criteria

### Match

Mark **match** when the local data agrees with sources on:
- **Ingredient items and quantities**
- **Craft location** (where it’s made/obtained)
- **Price** (if a Fence crafting fee is part of the recipe)
- **Effect/benefit** (when represented in the dataset)
- **Unlock/availability** (when represented in the dataset)

Minor phrasing differences in `benefit` are allowed if the meaning is identical.

### Mismatch

Mark **mismatch** when any of the following are wrong/incomplete:
- Missing ingredient(s) or incorrect ingredient name
- Wrong quantity
- Wrong crafting location
- Wrong Fence fee / price
- Wrong effect (meaningfully different)
- Wrong or misleading unlock text (especially if it implies the wrong gate, e.g., a mission when the real gate is a Legendary Animal availability)

### Unclear

Mark **unclear** when:
- Reputable sources conflict and cannot be reconciled
- A recipe is not explicitly listed in good sources (only implied)
- The “true” requirement differs between Story Mode / Online / patches and sources don’t agree

For unclear entries: do **not** change `crafting.json`; record uncertainty and move on.

## Data modeling conventions (to preserve searchability)

### Ingredient representation

Ingredients are stored as objects with a `qty` and one of:
- `item`: a single concrete ingredient name
- `anyOf`: a list of concrete ingredient names where any one satisfies the slot
- `label` + `match`: a predicate-based selector for broad classes (“any regular cartridge except shotgun”)

### When to convert to `anyOf`

Use `anyOf` when:
- Sources explicitly allow multiple equivalent ingredients (e.g., **Alaskan vs American Ginseng**).
- The game accepts a set of items and the UI should show them as alternatives.

### When to use `match`

Use `match` when:
- The ingredient is defined as a *category/class* rather than a specific named item (e.g., “any express cartridge (except shotgun)”).
- We need ingredient-search indexing to include a broad match without enumerating every item.

## Change discipline (how fixes are applied)

When approved:
- Apply only the changes that are justified by citations for that batch.
- Avoid unrelated refactors.
- After edits:
  - Validate JSON parses
  - Spot-check a couple key lookups/search flows in the UI (ingredient search + detail links)

## Common pitfalls tracked explicitly

- **Naming collisions** (Trinket vs Talisman, “White Bison” vs “Tatanka Bison,” “Boar Tusk Trinket” historical naming, etc.)
- **Fence items**: Many pages list a legendary part + **cash fee**; both must be reflected if we store `price`.
- **Unlock fields**: Prefer describing the real gate (pamphlet source / legendary availability / mission) rather than a random “earliest chapter” claim unless sourced.

