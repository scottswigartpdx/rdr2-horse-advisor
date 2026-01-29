# Missing horses vs IGN coat list (Story Mode)

Source: `https://www.ign.com/wikis/red-dead-redemption-2/Horses_Guide_-_Locations,_Stats,_Bonding,_Taming,_and_Breeds`

Method:
- Parsed IGN’s **Horse Bonding** breed→coats table plus the **PC Exclusive Horses** table.
- Compared against `horses.json` entries (breed+coat pairs).

## Missing from `horses.json` (12)
*(0 — all previously missing coats have now been added to `horses.json`.)*

### Note: “White Brindle Arabian” likely an IGN typo
IGN’s “PC Exclusive Horses” table lists **White Brindle Arabian** near Wapiti, but multiple independent sources (Fandom + rdr2.org + Shacknews/Gamepur) document this horse as the **Warped Brindle Arabian** (which we already have in `horses.json`). We are treating “White Brindle Arabian” as a naming error for now rather than adding a duplicate entry.

## Present in `horses.json` but not in IGN coat list (4)
These are expected “extras” because IGN’s coat list does not include some bonus/special variants.
- Arabian — Warped Brindle
- Ardennes — Iron Grey Roan (bonus)
- Dutch Warmblood — Cremello Gold (Buell) (mission)
- Thoroughbred — Dappled Black (bonus)

