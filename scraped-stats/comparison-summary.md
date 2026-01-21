# RDR2 Weapon Stats Comparison

## Data Sources

| Source | Weapons | Scale | Stats Available |
|--------|---------|-------|-----------------|
| Fandom | 47 | 1.0-4.0 | damage, range, fireRate, accuracy |
| GameWith | 63 | 1.0-4.0 | damage, damageMax, range, reload |
| RankedBoost | 60 | custom | damage only |
| GTABase | 75 | 0-100 | damage, fireRate, accuracy, range, overall |

## Key Finding: Flaco's and Granger's Revolver

Our app currently shows:
- Flaco's Revolver: damage 2.8
- Granger's Revolver: damage 2.7

**All third-party sources agree these values are WRONG:**

| Source | Cattleman | Flaco's | Granger's |
|--------|-----------|---------|-----------|
| Fandom | 1.7 | 1.7 | 1.7 |
| GameWith | 1.7 | 1.4 | 1.7 |
| RankedBoost | 1.8 | 1.8 | 1.8 |
| GTABase (0-100) | 42 | 42 | 42 |

### Conclusion
Flaco's Revolver and Granger's Revolver are **variants of the Cattleman Revolver** with identical or nearly identical damage. They are NOT significantly better weapons - they're cosmetic variants with unique engravings/appearances.

Our app's data showing Flaco's at 2.8 and Granger's at 2.7 is incorrect and should be fixed to match the Cattleman's 1.7 damage.

## Other Notable Discrepancies

### Damage Scale Conversion (GTABase 0-100 → Game 1.0-4.0)
GTABase uses a 0-100 scale. To convert:
- Cattleman: 42/100 → approximately 1.7/4.0 (matches)
- Rolling Block: 85/100 → approximately 3.4/4.0 (matches 3.5)

### Weapons with damageMax (GameWith)
These weapons show potential max damage with upgrades/ammo:
- All pistols/revolvers cap at 4.02-4.03
- All rifles cap at 4.03-4.04
- Confirms the 4.0 hard cap for weapon damage
