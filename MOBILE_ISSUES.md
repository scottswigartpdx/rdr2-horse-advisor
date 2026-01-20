# Mobile Testing Issues - 375px

Captured from ChatGPT review on 2026-01-19.

## Common Issues (All Pages)

### Header Crowding
- Email + "SIGN OUT" cluster tight against right edge
- Risk of overlap on smaller phones
- **Fix:** On mobile, show avatar/pawn icon only that expands to show sign out. Don't display full email on mobile. Current full email + sign out is fine for desktop.

```css
/* Desktop: show full email + sign out */
/* Mobile: avatar icon only, tap to expand sign out menu */
@media (max-width: 600px) {
  .header-email { display: none; }
  .sign-out-btn { display: none; }
  .user-avatar { display: flex; } /* pawn icon that opens dropdown */
}
```

### Touch Targets Under 44px
- "SIGN OUT" button looks ~32-36px tall
- Icon buttons (send/reset) borderline ~40px
- **Fix:** Enforce 44px minimum

```css
.sign-out-btn, .icon-btn { min-height: 44px; min-width: 44px; padding: 10px 14px; }
.send-btn, .reset-btn { min-width: 44px; min-height: 44px; }
```

### Text Readability
- Helper text ("Horses, weapons, gear...", "Or try one of these:") too small/low contrast
- **Fix:** Bump font size and contrast

```css
.helper-text { font-size: 15px; color: #cfc7bd; }
.small-muted { font-size: 13px; color: #bdb5ac; }
body { line-height: 1.5; }
```

### Nav Cards Look Flat
- Large nav panels don't look obviously tappable
- **Fix:** Add stronger affordance

```css
.nav-card { background: #1e1e1e; border: 1px solid #3b342c; box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
.nav-card:active { transform: scale(0.98); }
```

### Chat Input
- Input height looks <44px, placeholder baseline low
- **Fix:** Increase height and padding

```css
.chat-input { min-height: 48px; padding: 12px 14px; font-size: 16px; line-height: 1.4; }
```

---

## Page-Specific Issues

### All Horses / All Weapons Tables
- 5 columns on 375px makes headers/values cramped
- Row height too tight for mobile scanning
- **Fix:** Horizontal scroll or card layout

```css
.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.data-table { min-width: 520px; }
.data-table th, .data-table td { padding: 10px 8px; line-height: 1.4; }
```

### All Weapons Table - Dual Column
- Tiny icon/mark unclear at a glance on mobile
- **Fix:** Add text label or increase icon size

```css
.dual-icon { font-size: 14px; }
@media (max-width: 420px) {
  .dual-icon { display: none; }
  .dual-text { display: inline; }
}
```

### Horse Gear
- Tabs wrap to two lines, creating inconsistent spacing
- Tip box is text-heavy, pushes content down
- **Fix:** Allow horizontal scroll on tabs

```css
.gear-tabs { display: flex; overflow-x: auto; gap: 8px; }
.gear-tabs button { white-space: nowrap; }
.tip-box { font-size: 14px; line-height: 1.4; }
```

### Weapon Detail
- Upgrades/Ammo tables show right-side columns getting clipped
- Stats grid too dense (2-column cramped)
- **Fix:** Horizontal scroll and single column at narrow widths

```css
.detail-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.detail-table { min-width: 520px; }

@media (max-width: 420px) {
  .weapon-stats-grid { grid-template-columns: 1fr; gap: 12px; }
}
```

### Horse Detail
- "How to Get" 2-column layout cramped, long location names wrap awkwardly
- **Fix:** Stack to single column on mobile

```css
@media (max-width: 420px) {
  .howto-grid { grid-template-columns: 1fr; }
  .howto-grid dt { margin-top: 8px; }
}
```

### Loadout Builder / Horse Chooser
- Option buttons not full width, multi-line labels cramped
- Textarea has no visible label (placeholder-only)
- **Fix:** Full-width options with visible labels

```css
.option-btn { width: 100%; text-align: left; padding: 12px 14px; }
.field-label { display: block; font-size: 14px; color: #cfc7bd; margin-bottom: 6px; }
```

### Admin
- Error state lacks recovery action
- **Fix:** Add retry button

```css
.error-actions .btn { min-height: 44px; }
```

---

## Status

- [x] 325px testing complete
- [x] 375px testing complete
- [ ] 1024px testing pending
- [ ] Issues above are documented but not yet fixed
