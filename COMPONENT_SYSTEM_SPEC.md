# UI Component System Spec

## Overview

A lightweight JavaScript-based component injection system that eliminates HTML duplication without requiring a build step. Components are defined in a single `components.js` file and injected at runtime via `data-component` attributes.

## Goals

- Eliminate ~1,800 lines of duplicated HTML/CSS/JS
- Zero build step - works with plain `vercel dev`
- Single source of truth for header, footer, modal, nav patterns
- Consistent styling and behavior across all pages
- Minimal flash of unstyled content (FOUC)

## Architecture

```
/
├── components.js      # Component definitions + injection logic
├── components.css     # Shared component styles (extracted from inline)
├── utils.js           # Shared utilities (auth, table sort/filter, etc.)
├── styles.css         # Existing global styles
└── *.html             # Pages with data-component placeholders
```

## Component API

### HTML Usage

```html
<!-- Simple component (no props) -->
<div data-component="footer"></div>

<!-- Component with variant prop (structural difference) -->
<div data-component="header" data-props='{"variant": "full", "title": "Weapons", "subtitle": "Choose your arsenal"}'></div>

<!-- Simple variant with back-link -->
<div data-component="header" data-props='{"variant": "simple", "title": "Horse Gear", "backHref": "/horses.html", "backText": "Back to Horses"}'></div>

<!-- Component with content props only -->
<div data-component="backLink" data-props='{"href": "/weapons.html", "text": "Back to Weapons"}'></div>

<!-- Component with array props -->
<div data-component="sectionNav" data-props='{"items": [{"href": "/horses.html", "label": "Horses"}, {"href": "/weapons.html", "label": "Weapons"}]}'></div>
```

### JavaScript Definition

```javascript
// components.js
const Components = {

  // Simple component (no props)
  footer: () => `
    <footer>
      <p>Data sourced from the RDR2 community. Not affiliated with Rockstar Games.</p>
    </footer>
  `,

  // Component with variant prop for structural differences
  header: ({ variant = 'simple', title = 'RDR2 Companion', subtitle = '', backHref, backText = 'Back' }) => {
    if (variant === 'full') {
      // Hub pages: index, weapons, horses - has auth UI
      return `
        <header>
          <div class="header-top">
            <h1><a href="/">${title}</a></h1>
            ${Components.authContainer()}
          </div>
          ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
        </header>
      `;
    }
    // Simple variant: detail/list pages - has back-link, no auth
    return `
      <header>
        ${backHref ? Components.backLink({ href: backHref, text: backText }) : ''}
        <h1>${title}</h1>
        ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
      </header>
    `;
  },

  // Props for simple content variations
  backLink: ({ href, text = 'Back' }) => `
    <a href="${href}" class="back-link">&larr; ${text}</a>
  `,

  // Composable - components can call other components
  authContainer: () => `
    <div class="auth-container">
      <!-- auth UI markup -->
    </div>
  `
};
```

## Components to Create

### 1. `header`
**Props:**
- `variant` (string) - `"full"` (with auth) or `"simple"` (back-link style), defaults to "simple"
- `title` (string) - Page title in h1, defaults to "RDR2 Companion"
- `subtitle` (string, optional) - Subtitle text below title
- `backHref` (string, optional) - Back link destination (simple variant only)
- `backText` (string, optional) - Back link text, defaults to "Back"

**Variants:**
- `full`: Used on hub pages (index, weapons, horses). Has auth container with login/logout UI.
- `simple`: Used on detail/list pages. Has optional back-link, no auth UI.

**Includes:** Auth container (full variant), back-link (simple variant)

### 2. `footer`
**Props:** None

**Content:** Standard disclaimer text

### 3. `signInModal`
**Props:** None

**Content:** Modal overlay with Google OAuth button

### 4. `authContainer`
**Props:** None (internal component used by header)

**Content:** Login button, user info dropdown, mobile avatar button

### 5. `backLink`
**Props:**
- `href` (string) - Link destination
- `text` (string) - Link text, defaults to "Back"

### 6. `sectionNav`
**Props:**
- `items` (array) - Array of `{ href, icon, label, description }` objects
- `columns` (number) - Grid columns, defaults to 3

**Content:** Hero panel navigation with revolver pointer icons

### 7. `searchInput`
**Props:**
- `id` (string) - Input element ID
- `placeholder` (string) - Placeholder text

### 8. `tableWrapper`
**Props:**
- `id` (string) - Wrapper ID for scroll shadow JS

**Content:** Wrapper with mobile scroll shadow gradient

## Injection Strategy

### Option A: DOMContentLoaded (Simple)

```javascript
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-component]').forEach(el => {
    const name = el.dataset.component;
    const props = el.dataset.props ? JSON.parse(el.dataset.props) : {};
    const html = Components[name]?.(props);
    if (html) el.outerHTML = html;
  });
});
```

**Pros:** Simple, reliable
**Cons:** Brief FOUC while JS loads

### Option B: Synchronous in `<head>` (No FOUC)

```html
<head>
  <script src="components.js"></script>
  <script>
    // Runs synchronously, blocks render until complete
    document.write(Components.signInModal());
  </script>
</head>
<body>
  <script>document.write(Components.header({ title: 'Weapons' }));</script>
  <!-- page content -->
  <script>document.write(Components.footer());</script>
</body>
```

**Pros:** No FOUC at all
**Cons:** Inline scripts, less clean HTML

### Option C: Hybrid (Recommended)

Use `document.write` for above-the-fold components (header, modal) and `DOMContentLoaded` for below-fold (footer, etc.):

```html
<head>
  <script src="components.js"></script>
</head>
<body>
  <script>document.write(Components.signInModal() + Components.header({ title: 'Weapons' }));</script>

  <!-- page content -->

  <div data-component="footer"></div>
  <script src="components-init.js"></script> <!-- Injects remaining components -->
</body>
```

**Pros:** No FOUC for header, clean HTML for body content
**Cons:** Mix of approaches

## CSS Extraction

### Extract to `components.css` (shared patterns)

Move these repeated styles from inline `<style>` blocks:

| Style Block | Current Location | Lines |
|-------------|------------------|-------|
| `.back-link` | 8 pages | ~15 each |
| `.search-input` | 4 pages | ~25 each |
| `.modal-overlay` | 5 pages | ~40 each |
| `.auth-container` | 5 pages | ~60 each |
| `.section-nav` / `.hero-panel-nav` | 3 pages | ~80 each |
| `.data-table` (base table styling) | 4 pages | ~100 each |
| `.stat-box` (base→max bars) | 3 pages | ~50 each |
| `.info-grid` (2-column layout) | 2 pages | ~30 each |
| Table sort indicators | 4 pages | ~10 each |
| `.table-scroll-wrapper` (mobile shadows) | 3 pages | ~40 each |

**Estimated reduction:** ~600-800 lines of CSS moved to single file

### Keep Inline (truly page-specific)

These styles are unique to their pages and should remain inline:

| Page | Unique Styles | Reason |
|------|--------------|--------|
| loadout.html | Quiz UI, progress bar, freeform textarea | 95% unique - questionnaire is one-of-a-kind |
| crafting.html | 11 category badge colors, ingredients list | Category colors specific to crafting items |
| gear.html | Stat-cell coloring (positive/negative) | Gear-specific stat display logic |
| weapon.html | Weapon-specific badge variants | Dual-wield, ammo type badges |
| horse.html | Horse hero flexbox layout | Unique image+info arrangement |

**Rationale:** External CSS is best for shared patterns; inline is acceptable for genuinely unique page styles that won't be reused. This avoids per-page CSS files (extra HTTP requests) while eliminating duplication.

## JavaScript Extraction

Move to `utils.js`:

| Function | Current Location | Lines |
|----------|------------------|-------|
| Supabase auth setup | 5 pages | ~30 each |
| Table sort logic | 4 pages | ~50 each |
| Table filter logic | 4 pages | ~40 each |
| Mobile scroll shadow | 3 pages | ~15 each |
| Auth UI toggle | 5 pages | ~20 each |

**Estimated reduction:** ~400 lines of JS moved to single file

### Supabase Auth Singleton Pattern

All pages use identical Supabase credentials and config. Use singleton pattern to ensure single client instance:

```javascript
// utils.js
const SUPABASE_URL = 'https://vejhtrzmesjpxlonwhig.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_...';

let _supabaseClient = null;

function getSupabaseClient() {
  if (!_supabaseClient) {
    _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'pkce'
      }
    });
  }
  return _supabaseClient;
}

async function getAuthToken() {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  return session?.access_token || null;
}

async function signInWithGoogle() {
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
  if (error) console.error('Auth error:', error);
}

async function signOut() {
  await getSupabaseClient().auth.signOut();
  window.location.reload();
}

// Export for use across pages
window.Auth = { getSupabaseClient, getAuthToken, signInWithGoogle, signOut };
```

**Why singleton:** Prevents multiple client instances, ensures consistent config, single source of truth for credentials.

## Implementation Plan

Incremental approach - each phase is independently deployable and testable.

### Phase 1: CSS Extraction (Low Risk)
**Goal:** Extract duplicated CSS to `components.css` without changing any HTML or JS.

1. Create `components.css` with shared styles:
   - `.back-link` (from 8 pages)
   - `.search-input` (from 4 pages)
   - `.data-table` base styles (from 4 pages)
   - `.stat-box` pattern (from 3 pages)
   - `.info-grid` layout (from 2 pages)
   - `.table-scroll-wrapper` with shadows (from 3 pages)
   - Sort indicators (`.sorted-asc::after`, `.sorted-desc::after`)

2. Add `<link rel="stylesheet" href="components.css">` to all pages

3. Remove duplicated CSS from inline `<style>` blocks (one page at a time)

**Test:** Visual regression check on each page after removing inline styles.
**Commit:** "Extract shared CSS patterns to components.css"

---

### Phase 2: Auth Singleton (Medium Risk)
**Goal:** Centralize Supabase auth without changing UI.

1. Create `utils.js` with:
   - Supabase client singleton (`getSupabaseClient()`)
   - `getAuthToken()`
   - `signInWithGoogle()`
   - `signOut()`
   - Export as `window.Auth`

2. Update `app.js` to use `window.Auth` instead of local functions

3. Update `loadout.html` inline script to use `window.Auth`

4. Update `chooser.html` inline script to use `window.Auth`

5. Update `admin.html` inline script to use `window.Auth`

**Test:** Sign in/out works on all pages. AI features work on loadout/chooser.
**Commit:** "Centralize Supabase auth in utils.js singleton"

---

### Phase 3: Footer Component (Low Risk, Proof of Concept)
**Goal:** Validate component injection pattern with simplest component.

1. Create `components.js` with:
   - `Components.footer()` function
   - `Components.init()` injection logic

2. Create `components-init.js` (DOMContentLoaded injector)

3. Convert ONE page (e.g., `crafting.html`):
   - Add `<script src="components.js"></script>` to head
   - Replace `<footer>...</footer>` with `<div data-component="footer"></div>`
   - Add `<script src="components-init.js"></script>` before `</body>`

4. Verify it works, then convert remaining 12 pages

**Test:** Footer appears correctly on all pages.
**Commit:** "Add footer component, migrate all pages"

---

### Phase 4: Back-Link Component (Low Risk)
**Goal:** Extract back-link pattern.

1. Add `Components.backLink({ href, text })` to `components.js`

2. Convert pages one at a time (8 pages):
   - `gear.html`, `crafting.html`, `table.html`, `weapons-table.html`
   - `weapon.html`, `horse.html`, `loadout.html`, `admin.html`

3. Replace inline `<a class="back-link">` with:
   ```html
   <div data-component="backLink" data-props='{"href": "...", "text": "..."}'></div>
   ```

**Test:** Back links work and look correct on all pages.
**Commit:** "Add backLink component, migrate all pages"

---

### Phase 5: Sign-In Modal Component (Medium Risk)
**Goal:** Extract modal that appears on 5 pages.

1. Add `Components.signInModal()` to `components.js`

2. Convert hub pages (use `document.write` for no FOUC):
   - `index.html`
   - `weapons.html`
   - `horses.html`

3. Remove duplicate modal HTML from each page

4. Verify OAuth flow still works (modal opens, Google auth completes)

**Test:** Sign in works on all hub pages. Modal appears without flash.
**Commit:** "Add signInModal component, migrate hub pages"

---

### Phase 6: Header Component - Simple Variant (Medium Risk)
**Goal:** Extract simple header (back-link style, no auth).

1. Add `Components.header({ variant: 'simple', ... })` to `components.js`

2. Convert detail/list pages (10 pages):
   - `gear.html`, `crafting.html`, `table.html`, `weapons-table.html`
   - `weapon.html`, `horse.html`, `weapon-gear.html`
   - `loadout.html`, `chooser.html`, `admin.html`

3. Use `document.write` in body for no FOUC:
   ```html
   <script>document.write(Components.header({ variant: 'simple', title: '...', backHref: '...', backText: '...' }));</script>
   ```

**Test:** Headers render correctly, back links work.
**Commit:** "Add header simple variant, migrate detail pages"

---

### Phase 7: Header Component - Full Variant (Higher Risk)
**Goal:** Extract full header with auth UI.

1. Add `Components.header({ variant: 'full', ... })` to `components.js`

2. Add `Components.authContainer()` (internal component)

3. Convert hub pages (3 pages):
   - `index.html`
   - `weapons.html`
   - `horses.html`

4. Ensure auth UI updates work (login button ↔ user dropdown)

**Test:** Auth UI shows correct state. Login/logout updates header.
**Commit:** "Add header full variant with auth, migrate hub pages"

---

### Phase 8: Section Nav Component (Low Risk)
**Goal:** Extract navigation grid pattern.

1. Add `Components.sectionNav({ items })` to `components.js`

2. Convert 3 pages:
   - `index.html`
   - `weapons.html`
   - `horses.html`

3. Pass items array with href, label, description

**Test:** Navigation links work, hover states correct.
**Commit:** "Add sectionNav component, migrate hub pages"

---

### Phase 9: Table Utilities (Medium Risk)
**Goal:** Extract shared table JS (sort, filter, scroll shadows).

1. Add to `utils.js`:
   - `TableUtils.initSort(tableId, columnMap)`
   - `TableUtils.initFilter(inputId, tableId, filterFn)`
   - `TableUtils.initScrollShadow(wrapperId)`

2. Update `gear.html` to use `TableUtils`

3. Update `crafting.html` to use `TableUtils`

4. Update `table.html` (horses) to use `TableUtils`

5. Update `weapons-table.html` to use `TableUtils`

**Test:** Sort, filter, scroll shadows work on all table pages.
**Commit:** "Extract table utilities to utils.js"

---

### Phase 10: Cleanup & Documentation
**Goal:** Final polish.

1. Remove any remaining duplicate code

2. Audit all pages for consistency

3. Update `AI_WORKFLOW.md` with component usage guide

4. Add component examples to spec

**Test:** Full site walkthrough on mobile and desktop.
**Commit:** "Complete component system migration, update docs"

---

## Phase Summary

| Phase | Risk | Pages Affected | New Files |
|-------|------|----------------|-----------|
| 1. CSS Extraction | Low | All 13 | `components.css` |
| 2. Auth Singleton | Medium | 5 | `utils.js` |
| 3. Footer Component | Low | All 13 | `components.js`, `components-init.js` |
| 4. Back-Link | Low | 8 | - |
| 5. Sign-In Modal | Medium | 3 | - |
| 6. Header (simple) | Medium | 10 | - |
| 7. Header (full) | Higher | 3 | - |
| 8. Section Nav | Low | 3 | - |
| 9. Table Utilities | Medium | 4 | - |
| 10. Cleanup | Low | All | - |

**Estimated total: 10 commits, each independently deployable.**

## File Size Impact

| Before | After |
|--------|-------|
| 13 HTML files × ~300 lines duplicated | 13 HTML files × ~50 lines unique |
| ~4,000 lines total | ~650 lines HTML + 500 lines components.js + 500 lines components.css |
| | **Net reduction: ~2,300 lines** |

## Example: Converted Page

### Before (weapons.html excerpt)
```html
<!DOCTYPE html>
<html>
<head>
  <title>Weapons - RDR2 Companion</title>
  <link rel="stylesheet" href="styles.css">
  <style>
    /* 50+ lines of repeated component CSS */
  </style>
</head>
<body>
  <div class="modal-overlay" id="signInModal">
    <!-- 20 lines of modal HTML -->
  </div>
  <header>
    <!-- 20 lines of header HTML -->
  </header>

  <!-- actual page content -->

  <footer>
    <p>Data sourced from...</p>
  </footer>
  <script>
    // 100+ lines of repeated auth/utility JS
  </script>
</body>
</html>
```

### After (weapons.html - hub page with auth)
```html
<!DOCTYPE html>
<html>
<head>
  <title>Weapons - RDR2 Companion</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="components.css">
  <script src="components.js"></script>
</head>
<body>
  <script>document.write(Components.signInModal() + Components.header({ variant: 'full', title: 'Weapons', subtitle: 'Choose your arsenal' }));</script>

  <!-- actual page content (unchanged) -->

  <div data-component="footer"></div>
  <script src="utils.js"></script>
  <script src="components-init.js"></script>
</body>
</html>
```

### After (gear.html - detail page, no auth)
```html
<!DOCTYPE html>
<html>
<head>
  <title>Horse Gear - RDR2 Companion</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="components.css">
  <script src="components.js"></script>
</head>
<body>
  <script>document.write(Components.header({ variant: 'simple', title: 'Horse Gear', backHref: '/horses.html', backText: 'Back to Horses' }));</script>

  <!-- actual page content (unchanged) -->
  <style>
    /* Page-specific styles stay inline (gear stat coloring, etc.) */
  </style>

  <div data-component="footer"></div>
  <script src="utils.js"></script>
  <script src="components-init.js"></script>
</body>
</html>
```

## Design Decisions

### 1. Auth Initialization: Centralized Singleton in `utils.js`

**Decision:** All Supabase auth code moves to `utils.js` as a singleton.

**Rationale:**
- All 5 pages with auth use identical credentials and config
- `app.js` already has centralized auth; `admin.html`, `loadout.html`, `chooser.html` duplicate it inline
- Singleton pattern prevents multiple client instances and ensures consistent behavior
- Single source of truth = one place to update if config changes

**References:**
- [Supabase docs recommend singleton](https://supabase.com/docs/reference/javascript/initializing)
- [Singleton pattern example](https://gist.github.com/ftonato/23585d6098490d0239feaeddb7f1e56c)

### 2. Page-Specific CSS: Hybrid (Extract Shared, Keep Unique Inline)

**Decision:** Extract duplicated patterns to `components.css`; keep truly unique styles inline.

**Rationale:**
- ~55% of inline CSS is duplicated across pages (tables, stat boxes, info grids)
- Remaining ~45% is genuinely page-specific (quiz UI, category badges, etc.)
- External CSS for shared patterns = caching, single source of truth
- Inline for unique styles = no extra HTTP requests, keeps page-specific code together
- Per-page CSS files would add complexity with minimal benefit

**References:**
- [CSS best practices](https://kinsta.com/blog/css-best-practices/)
- [Inline vs external guidance](https://www.geeksforgeeks.org/css/difference-between-inline-internal-and-external-css/)

### 3. Component Variants: Props for Content, `variant` Prop for Structure

**Decision:** Use three patterns based on variation type:

| Variation Type | Pattern | Example |
|----------------|---------|---------|
| Content only | Props | `backLink({ href, text })` |
| Structural | `variant` prop | `header({ variant: 'full' \| 'simple' })` |
| Complex render | Wrapper only | `tableWrapper({ id })` - content rendered by page JS |

**Rationale:**
- Props work for simple swaps (text, href, array of items)
- `variant` prop handles structural differences within one logical component (header with/without auth)
- Tables have identical wrappers but wildly different column rendering - extract wrapper, keep render logic per-page

**References:**
- [Vanilla JS component pattern](https://dev.to/megazear7/the-vanilla-javascript-component-pattern-37la)
- [Variants pattern](https://swizec.com/blog/variants-a-quick-tip-for-better-react-components/)

## Known Issues

### Pre-existing (Not Migration Related)
These styling inconsistencies existed before the component refactor:
- Back link position/style varies across pages
- Search input heights inconsistent (gear vs crafting)
- Tip box styling differs between pages
- Card shadow intensities vary
- Table row density could be improved
- Detail page image sizes inconsistent

### API Issues
- [ ] **Admin API 500 error**: `/api/admin/stats` returns 500 "Failed to fetch stats"

## Success Criteria

- [x] All 13 HTML pages use component system
- [x] No duplicate HTML blocks > 10 lines (verified by code audit)
- [x] No duplicate CSS blocks > 10 lines (extracted to components.css)
- [x] No duplicate JS functions (extracted to utils.js)
- [x] Auth works on all pages
- [x] No visual regressions (verified by ChatGPT review)
- [x] No FOUC on header/modal (using document.write)
