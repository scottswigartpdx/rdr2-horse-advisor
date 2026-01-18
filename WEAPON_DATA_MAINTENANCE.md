# Weapon Data Maintenance Guide

## Data Sources

There is **no official Rockstar source** for exact weapon stats. The in-game UI shows visual bars, not numbers. Community sites have reverse-engineered approximate values.

### Primary Sources (in order of reliability)

1. **GameWith** - https://gamewith.net/red-dead-redemption2/article/show/1154
   - Shows base stats (black text) and max stats with upgrades (red text)
   - Individual weapon pages have more detail
   - URL pattern: `gamewith.net/red-dead-redemption2/article/show/{id}`
   - Useful pages:
     - All weapons list: `/article/show/1154`
     - All revolvers: `/article/show/1222`
     - Cattleman Revolver: `/article/show/1197`

2. **Red Dead Wiki (Fandom)** - https://reddead.fandom.com/wiki/Weapons_in_Redemption_2
   - Has tables with base/max stats
   - Good for cross-referencing
   - Community-edited, so verify against GameWith

3. **GTABase** - https://www.gtabase.com/red-dead-redemption-2/weapons/
   - Sortable database
   - Good for comparing weapons
   - May not show upgrade progressions clearly

### Known Issues with Sources

- Stats between sources don't always match exactly
- Some sources show "4.0" as max for all upgraded stats (this is wrong - it's the scale max, not the weapon's max)
- Fire Rate and Accuracy are sometimes swapped in older guides
- Unique/variant weapons sometimes have wrong stats copied from base weapons

## Stats Scale

All stats use a **0-4.0 scale** as defined in `weapons.json`:

```json
"statsScale": {
  "min": 0,
  "max": 4,
  "description": "All stats are on a 0-4.0 scale"
}
```

## Stat Definitions

| Stat | What it means |
|------|---------------|
| **Damage** | Raw damage per shot |
| **Range** | Effective distance before damage falloff |
| **Fire Rate** | How quickly the weapon can fire (higher = faster) |
| **Accuracy** | Bloom/spread - how tight the shots group |
| **Reload** | Speed of reloading (higher = faster reload) |

## Base vs Max Stats

- **baseStats**: Weapon with no upgrades, no affinity bonus
- **maxStats**: Weapon with all upgrades AND max affinity (clean, oiled)

Upgrades that affect stats:
- `improved_rifling`: +Range
- `longer_barrel`: +Range, +Accuracy
- `improved_sights`: +Accuracy
- `scope`: +Range, +Accuracy

## Unique/Variant Weapons

Unique weapons (Flaco's Revolver, Midnight's Pistol, etc.):
- Have `"variant": "Base Weapon Name"` field
- Have `"maxStats": null` (cannot be upgraded)
- Stats are often pre-upgraded or have unique values
- Cannot be customized at gunsmith

## Verifying Stats

When verifying a weapon's stats:

1. **Check GameWith individual page first**
   - Search: `site:gamewith.net rdr2 [weapon name]`
   - Look for black (base) and red (max) stat values

2. **Cross-reference with Fandom Wiki**
   - Check the weapons table for that category
   - Note any discrepancies

3. **Sanity check the values**
   - Fire Rate should be higher for semi-auto/double-action weapons
   - Damage should increase with upgrades for most weapons
   - Range always increases with rifling/barrel upgrades
   - Unique weapons often have slightly different stats than their base

## Common Mistakes to Avoid

1. **Don't assume max = 4.0** - That's the scale maximum, not the weapon's maximum
2. **Don't copy stats from base weapon to variant** - Variants often have different stats
3. **Check Fire Rate vs Accuracy** - These get swapped in some sources
4. **Verify damage upgrades** - Not all weapons get damage increases from upgrades

## Updating weapons.json

When updating stats:

```bash
# Validate JSON after editing
node -e "JSON.parse(require('fs').readFileSync('weapons.json'))"

# Quick stats check
node -e "
const d = require('./weapons.json');
const w = d.weapons.find(x => x.name === 'WEAPON_NAME');
console.log('Base:', w.baseStats);
console.log('Max:', w.maxStats);
"
```

## Last Verified

Stats were last comprehensively verified: **January 2026**

Sources used:
- GameWith all weapons page
- GameWith individual weapon pages
- Red Dead Fandom Wiki weapons tables
