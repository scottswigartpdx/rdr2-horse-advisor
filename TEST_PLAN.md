# Mobile & Responsive Test Plan

## Overview

Systematic testing of all pages at all target resolutions, capturing full-page screenshots and getting ChatGPT feedback for each.

## Target Resolutions

| Width | Device | Priority |
|-------|--------|----------|
| 325px | Small phones | High |
| 375px | Standard phones | High |
| 1024px | Tablets/desktop | Medium |

## Pages to Test

| Page | URL | Has Chat/AI | Notes |
|------|-----|-------------|-------|
| Home | `/` | Yes | Main chat interface |
| Horses Hub | `/horses.html` | Yes | Section nav + chat |
| Weapons Hub | `/weapons.html` | Yes | Section nav + chat |
| All Horses | `/table.html` | No | Sortable table |
| All Weapons | `/weapons-table.html` | No | Sortable table |
| Horse Gear | `/gear.html` | No | Tabs + table |
| Crafting | `/crafting.html` | No | Filters + table |
| Horse Detail | `/horse.html?breed=Arabian&coat=White` | No | Detail page |
| Weapon Detail | `/weapon.html?name=Cattleman%20Revolver` | No | Detail page |
| Loadout Builder | `/loadout.html` | Yes | Multi-step AI wizard |
| Horse Chooser | `/chooser.html` | Yes | Multi-step AI wizard |
| Admin | `/admin.html` | No | Stats dashboard |

## Test Procedure

### For Each Resolution:

1. **Set viewport** to target width
2. **For each page:**

#### Standard Pages (No Chat):
```
1. Navigate to page
2. Take viewport screenshot
3. If page scrolls, scroll down and take additional screenshots
4. Send all screenshots to ChatGPT with prompt:
   "Review this [PAGE_NAME] at [WIDTH]px. Check for:
   - Layout overflow
   - Touch targets (44px min)
   - Text readability
   - Navigation usability
   - Any visual bugs"
5. Log any issues found
6. Move to next page
```

#### Pages with Chat/AI:
```
1. Navigate to page
2. Take initial state screenshot(s)
3. Enter test prompt: "What's the best horse for speed?"
4. Wait for AI response
5. Take full conversation screenshot(s)
6. Send all screenshots to ChatGPT with prompt:
   "Review this [PAGE_NAME] with chat at [WIDTH]px. Check for:
   - Layout overflow
   - Touch targets (44px min)
   - Text readability
   - Chat bubble formatting
   - Input area usability
   - Any visual bugs"
7. Log any issues found
8. Move to next page
```

### After Each Resolution:
- Compile list of issues found
- Prioritize fixes (High/Medium/Low)
- Fix critical issues before moving to next resolution

## Test Prompts by Page

| Page | Test Prompt |
|------|-------------|
| Home | "What's the best horse for speed?" |
| Horses Hub | "Compare Arabian vs Turkoman" |
| Weapons Hub | "What's the best revolver?" |
| Loadout Builder | (Use wizard flow) |
| Horse Chooser | (Use wizard flow) |

## ChatGPT Review Prompt Template

```
Review this {PAGE_NAME} page at {WIDTH}px width ({DEVICE_TYPE}).

Check for:
1. Layout overflow - anything extending past viewport?
2. Touch targets - buttons/links at least 44px?
3. Text readability - font sizes adequate?
4. Navigation - easy to use?
5. {EXTRA_CHECKS}

Be specific about any issues. Include CSS selectors if possible.
```

## Issue Tracking

### Format:
```
| Resolution | Page | Issue | Severity | Status |
|------------|------|-------|----------|--------|
| 325px | gear.html | Tabs wrap to 2 lines | Low | Won't fix (intentional) |
```

## Execution Checklist

### 325px (Small Phones)
- [ ] Home
- [ ] Horses Hub
- [ ] Weapons Hub
- [ ] All Horses
- [ ] All Weapons
- [ ] Horse Gear
- [ ] Crafting
- [ ] Horse Detail
- [ ] Weapon Detail
- [ ] Loadout Builder
- [ ] Horse Chooser
- [ ] Admin

### 375px (Standard Phones)
- [ ] Home
- [ ] Horses Hub
- [ ] Weapons Hub
- [ ] All Horses
- [ ] All Weapons
- [ ] Horse Gear
- [ ] Crafting
- [ ] Horse Detail
- [ ] Weapon Detail
- [ ] Loadout Builder
- [ ] Horse Chooser
- [ ] Admin

### 1024px (Tablets/Desktop)
- [ ] Home
- [ ] Horses Hub
- [ ] Weapons Hub
- [ ] All Horses
- [ ] All Weapons
- [ ] Horse Gear
- [ ] Crafting
- [ ] Horse Detail
- [ ] Weapon Detail
- [ ] Loadout Builder
- [ ] Horse Chooser
- [ ] Admin

## Notes

- Screenshots should be saved to `screenshots/test-{resolution}-{page}.png`
- Full-page captures may require multiple screenshots stitched or scrolled
- Chat pages require waiting for AI response before final screenshot
- Admin page may show errors if not authenticated - note this separately
