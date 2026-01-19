# RDR2 Companion - AI Workflow

## Claude + ChatGPT Collaboration Model

**Why two AIs?** Claude and ChatGPT have complementary strengths:

| Capability | Claude | ChatGPT |
|------------|--------|---------|
| Screenshot/UI analysis | ❌ Limited | ✅ Excellent |
| Chrome DevTools automation | ✅ Full access | ❌ None |
| Code editing | ✅ Direct | ❌ Suggestions only |
| Collecting diagnostics | ✅ Can run JS, measure elements | ❌ Cannot |

**The workflow**: ChatGPT analyzes visuals and suggests fixes. Claude drives Chrome to collect screenshots, run diagnostics, and implement changes. They work as a team.

---

## Communicating with ChatGPT for Design Review

Use the `chat-with-gpt.js` CLI tool to get design feedback from GPT. Do NOT use browser automation for ChatGPT - it's unreliable and slow.

### Basic Usage

```bash
# Review UI with screenshots
node chat-with-gpt.js \
  --prompt "Review this UI for issues" \
  --images screenshots/home.png screenshots/weapons.png

# Include code files for context
node chat-with-gpt.js \
  --prompt "Review the weapon card design" \
  --images screenshots/weapon-card.png \
  --files styles.css app.js

# Continue a conversation
node chat-with-gpt.js \
  --conversation-id <id> \
  --prompt "What about the mobile layout?"

# List recent conversations
node chat-with-gpt.js --list
```

### Taking Screenshots

```bash
# Create screenshots directory if needed
mkdir -p screenshots

# Use browser dev tools or a screenshot tool
# Screenshots should be saved to screenshots/ folder
```

### Example Review Request

```bash
node chat-with-gpt.js \
  --prompt "I'm building an RDR2 companion web app. Please review these UI screenshots and identify: 1) Visual consistency issues 2) Usability problems 3) Mobile-friendliness concerns 4) Elements that look out of place. Be specific and actionable." \
  --images screenshots/home.png screenshots/weapons.png screenshots/weapon-card.png \
  --files styles.css
```

---

## Troubleshooting UI Issues with ChatGPT

When you encounter visual bugs (overflow, alignment, etc.), collaborate with ChatGPT using this workflow. **Claude should not attempt to analyze screenshots directly** - ChatGPT is better at visual analysis. Instead, Claude collects the data ChatGPT needs.

### Step 1: Send Screenshot + Source Files

Always include both the screenshot AND the relevant source files (CSS, HTML):

```bash
node chat-with-gpt.js \
  --prompt "The nav buttons are overflowing to the right at 320px width. What CSS fix is needed?" \
  --images screenshots/mobile-issue.png \
  --files styles.css index.html
```

### Step 2: If Issue Persists, Ask What Diagnostics ChatGPT Needs

When ChatGPT's suggested fix doesn't work, ask what diagnostic information would help. **This is key** - ChatGPT can't access Chrome, but Claude can. Ask ChatGPT to specify exactly what measurements, computed styles, or DOM info it needs:

```bash
node chat-with-gpt.js \
  --conversation-id <id> \
  --prompt "The fix didn't work. I have Chrome DevTools access via Claude. What specific diagnostics should Claude collect? Claude can: run JavaScript, get computed styles, measure element dimensions, find overflow sources, inspect the DOM, etc. Be specific about what you need."
```

### Step 3: Claude Collects Diagnostics via Chrome DevTools

Claude uses the chrome-devtools MCP to run JavaScript and collect exactly what ChatGPT requested. Example diagnostic script:

```javascript
// Run via mcp__chrome-devtools__evaluate_script
() => {
  // Find elements overflowing the viewport
  const overflowEls = [...document.querySelectorAll('*')].filter(el => {
    const r = el.getBoundingClientRect();
    return r.right > window.innerWidth + 1;
  }).map(el => ({
    tag: el.tagName,
    class: el.className,
    width: el.getBoundingClientRect().width,
    right: el.getBoundingClientRect().right
  }));

  // Get widths of specific elements
  const selectors = ['.hero-panel', '.hero-panel-inner', '.section-nav'];
  const widths = selectors.map(sel => {
    const el = document.querySelector(sel);
    const r = el?.getBoundingClientRect();
    return {
      sel,
      width: r?.width,
      padding: el ? getComputedStyle(el).padding : null
    };
  });

  // Check body overflow
  const overflow = {
    bodyScrollWidth: document.body.scrollWidth,
    windowInnerWidth: window.innerWidth
  };

  // Get computed styles for key elements
  const el = document.querySelector('.hero-panel-inner');
  const computed = el ? {
    width: getComputedStyle(el).width,
    gridTemplateColumns: getComputedStyle(el).gridTemplateColumns,
    boxSizing: getComputedStyle(el).boxSizing
  } : null;

  return { overflowEls, widths, overflow, computed };
}
```

### Step 4: Send Diagnostics Back to ChatGPT

```bash
node chat-with-gpt.js \
  --conversation-id <id> \
  --prompt "Here are the diagnostics Claude collected:

  **Widths:**
  - .hero-panel-inner: width=285px, gridTemplateColumns='308px' <-- FIXED VALUE!

  **Overflow:**
  - bodyScrollWidth: 341, windowInnerWidth: 320

  What CSS fix is needed?"
```

### Step 5: Apply Fix and Verify

After Claude applies ChatGPT's fix, take a new screenshot and verify:

```bash
node chat-with-gpt.js \
  --conversation-id <id> \
  --prompt "Here's the result after applying the fix. Is the issue resolved?" \
  --images screenshots/mobile-after-fix.png
```

### Key Insights

- **CSS Grid gotcha**: Grid items default to `min-width: auto`, preventing shrinking. Fix with `min-width: 0`.
- **Fixed grid columns**: `grid-template-columns` with pixel values won't shrink. Use `minmax(0, 1fr)` instead.
- **Box-sizing**: Always use `box-sizing: border-box` on constrained elements.
- **Viewport diagnostics**: Compare `bodyScrollWidth` vs `windowInnerWidth` to confirm overflow exists.

---

## Pre-Merge Checklist

Before merging to main, verify:

### 1. Data Accuracy
- [ ] Weapon stats verified against GameWith/Fandom sources
- [ ] Horse stats verified
- [ ] No placeholder or test data in JSON files

### 2. UI/Visual Review
- [ ] Get ChatGPT review using `chat-with-gpt.js`
- [ ] Address any critical feedback
- [ ] Check visual consistency across pages

### 3. Mobile Testing
- [ ] Test at 325px width (small phones)
- [ ] Test at 375px width (standard phones)
- [ ] Test at 1024px width (tablets/desktop)
- [ ] Navigation usable on touch
- [ ] Text readable without zooming
- [ ] Buttons/links have adequate tap targets (44px min)
- [ ] Tables scroll horizontally or reflow
- [ ] Cards don't overflow viewport

### 4. Functionality Testing
- [ ] AI chat returns relevant results
- [ ] Weapon cards display correct stats
- [ ] Horse cards display correct stats
- [ ] Search/filter works on tables
- [ ] All navigation links work
- [ ] No console errors

### 5. Code Quality
- [ ] JSON files are valid (`node -e "JSON.parse(...)"`)
- [ ] No hardcoded test values
- [ ] CSS has no obvious issues

---

## Mobile Testing Instructions

### Using Chrome DevTools

1. Open the app in Chrome
2. Open DevTools (F12 or Cmd+Option+I)
3. Click the device toggle icon (or Cmd+Shift+M)
4. Select device or set custom dimensions
5. Test each page at multiple widths

### Key Breakpoints to Test

| Width | Device |
|-------|--------|
| 325px | Small phones |
| 375px | Standard phones |
| 1024px | Tablets/desktop |

### Mobile Testing Checklist

```
Home Page:
- [ ] Title readable
- [ ] Nav sidebar collapses or adapts
- [ ] Suggested prompts don't overflow
- [ ] Chat input accessible

Weapons Page:
- [ ] Sidebar navigation works
- [ ] Weapon cards fit viewport
- [ ] Stat bars readable

Weapons Table:
- [ ] Table scrolls horizontally
- [ ] Column headers stay visible
- [ ] Search input works
- [ ] Sort buttons accessible

Weapon Card (in chat):
- [ ] Two-column layout stacks on mobile
- [ ] Stat bars don't overflow
- [ ] Upgrade/ammo chips wrap properly
```

---

## Component System

The app uses a lightweight JavaScript component system for shared UI elements. Components are defined in `components.js` and utilities in `utils.js`.

### Available Components

| Component | Usage | Props |
|-----------|-------|-------|
| `header` | Page header with title | `{ backHref, backText, title }` |
| `headerFull` | Hub page header with auth UI | `{ title, subtitle, titleHref }` |
| `footer` | Standard footer disclaimer | None |
| `signInModal` | Google OAuth modal | None |
| `authContainer` | Login/user dropdown | None (internal) |
| `backLink` | Navigation link | `{ href, text }` |
| `sectionNav` | Hub page navigation grid | `{ items: [{href, label}] }` |

### Using Components

**Above-fold components** (no FOUC) - use `document.write`:
```html
<head>
  <script src="components.js"></script>
</head>
<body>
  <script>document.write(Components.header({backHref: "horses.html", backText: "Back to Horses", title: "Horse Gear"}))</script>
```

**Below-fold components** - use `data-component` attribute:
```html
<div data-component="footer"></div>
```

### Table Utilities

`utils.js` provides shared table functionality via `TableUtils`:

```javascript
// Initialize sortable table headers
const ascFirstColumns = ['price', 'name'];  // Columns that sort asc first
TableUtils.initSortListeners('.my-table', currentSort, updateTable, ascFirstColumns);

// Update sort indicator arrows
TableUtils.updateSortIndicators('.my-table', currentSort);

// Initialize mobile scroll shadow
TableUtils.initScrollShadow('tableScrollWrapper');
```

### Auth Utilities

`utils.js` provides centralized Supabase auth via `window.Auth`:

```javascript
// Get current user
const user = await Auth.getCurrentUser();

// Get auth token for API calls
const token = await Auth.getAuthToken();

// Sign in/out
await Auth.signInWithGoogle();
await Auth.signOut();

// Listen for auth changes
Auth.onAuthStateChange((event, session) => { ... });
```

### Adding New Components

1. Add component function to `components.js`:
   ```javascript
   myComponent: (props = {}) => {
     return `<div class="my-component">${props.content}</div>`;
   }
   ```

2. Add styles to `components.css`

3. Use in HTML with `document.write` (above-fold) or `data-component` (below-fold)

---

## Local Development

### Starting the Server

```bash
# Always use Vercel CLI - it's free and runs the full app including API routes
vercel dev --listen 3000

# If you don't have Vercel CLI installed:
npm i -g vercel
```

#### Check What's Running
```bash
# Check if port is in use
lsof -i :3000
```

### Validating Data Files

```bash
# Validate weapons.json
node -e "JSON.parse(require('fs').readFileSync('weapons.json')); console.log('Valid')"

# Validate horses.json
node -e "JSON.parse(require('fs').readFileSync('horses.json')); console.log('Valid')"

# Quick stats check
node -e "const d = require('./weapons.json'); console.log('Weapons:', d.weapons.length)"
```

---

## Git Workflow

### Feature Branch

```bash
# Create feature branch
git checkout -b feature/description

# Make changes, commit
git add .
git commit -m "Description of changes"

# Push to remote
git push -u origin feature/description
```

### Before Merging

1. Complete pre-merge checklist above
2. Get PR review if applicable
3. Merge to main

```bash
git checkout main
git pull
git merge feature/description
git push
```

---

## Deployment

The app is deployed via Vercel. Pushing to main triggers automatic deployment.

### Vercel Dashboard
- Check deployment status at vercel.com
- View analytics for usage patterns

---

## Troubleshooting

### Server not responding
```bash
# Check if port is in use
lsof -i :3000

# Kill existing process if needed
kill -9 <PID>
```

### ChatGPT script not working
```bash
# Check for API key
cat .env | grep OPENAI

# Test the script
node chat-with-gpt.js --help
```

### JSON parse errors
```bash
# Pretty-print and validate
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('weapons.json')), null, 2))" > weapons-formatted.json
```
