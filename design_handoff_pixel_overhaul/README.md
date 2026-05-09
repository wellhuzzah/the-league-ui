# Handoff: Rockwood Pixel-Art Visual Overhaul

## ⚠ Critical scope note — read first

**This is a visual overhaul only. Do not modify any data wiring, routing, API calls, hooks, or component logic.**

The existing repos already have:
- Frontend (React + Vite + React Router): `github.com/wellhuzzah/the-league-ui`
- Backend (data): `github.com/wellhuzzah/the-league`
- All routes wired (`/`, `/seasons/:year`, `/records`, `/draft/:year`, `/teams`, `/teams/:teamId`, `/h2h`, `/h2h/:a/:b`, `/players`)
- All API hooks in `src/api/*.js`
- All page components in `src/pages/*.jsx`

**Your job is to restyle these existing pages in a 16-bit pixel-art "video game menu" aesthetic anchored on the Rockwood, Michigan water tower. Do not refactor data flow. Do not change route structure. Do not rename props or components. Wrap and restyle in place.**

If a page currently does `const { data } = useSeasonData(year)` and renders a `<table>`, the ported version still does `const { data } = useSeasonData(year)` and renders a `<table>` — but inside a `<Placard>` shell with `.standings` table styles applied.

---

## Overview

The fantasy football league site is being redesigned around a single visual anchor: the **Rockwood, Michigan water tower** photographed at dusk, rendered in 16-bit pixel art (Super Nintendo / Sega Genesis era). The home page is styled as a video-game main menu (think *Into the Breach*); inner pages present data on **riveted steel placards** mounted on the tower's tank wall.

## About the design files

The files in `reference/` are **HTML/JSX prototypes built outside the target codebase** — they show the intended look, behavior, animations, and component structure. **Recreate them inside `the-league-ui` using its existing React + Vite + React Router patterns.** Do not ship the HTML files; treat them as a spec.

## Fidelity

**High-fidelity.** Pixel-perfect: exact hex values, font families, sizes, spacings, and animations are documented below and present in `reference/styles.css`. Match them.

---

## Directions chosen

After exploration, the user landed on these directions:

| Surface | Direction | Notes |
|---|---|---|
| **Home / main menu** | "Into the Breach" layout (`MenuA`) | Pixelated photo background, large stacked ROCKWOOD wordmark + sub-line top-left, vertical menu list left, footer chrome bottom |
| **Data-heavy inner pages** (Standings, Records, Draft, Head-to-Head) | "Detached" placard | Big placard fills most of the screen; tower implied via curved-wall texture, rivet seam, peeking ROCKWOOD paint |
| **Narrative inner pages** (Team page, single matchup recap, awards) | "Diorama" placard | Smaller placard floats over the wider tower photo; tower stays visible in frame |

Rejected (do not implement):
- Tower silhouette overlay — removed in favor of the pixelated photo carrying the visual weight
- Distant-town skyline silhouette
- Graffiti accents — didn't fit the dusk industrial mood

---

## Design tokens

All tokens live in `reference/styles.css` `:root`. Merge into `src/index.css`:

### Colors (dusk palette)
```
--sky-0:       #0a0820   /* deepest sky / void */
--sky-1:       #14102e
--sky-2:       #251c45
--sky-3:       #4a2654
--plum:        #6a2f4d
--ember:       #c4533a
--amber:       #f0a04b   /* primary accent — menu hover, season picker active, link */
--amber-glow:  #ffcf78   /* fireflies, lit windows */
--town:        #100c26   /* deprecated — was used for skyline silhouette */
--town-2:      #1d1638
--grass:       #07061a   /* ground plane */

--steel-hi:    #cfd2dc   /* placard rivet highlight */
--steel-1:     #9097a3
--steel-2:     #5e6470
--steel-3:     #383d4a
--steel-4:     #1f2230
--rivet:       #0d0f18

--neon:        #ff8a3a
--neon-2:      #ffb060
--warn:        #ff4a3a   /* aircraft warning light (unused after silhouette removal) */
--win:         #6cc36a
--loss:        #d65656
--gold:        #ffcf5a   /* CHAMP badge */
```

### Type
```
--f-pixel:     'Silkscreen', monospace        /* nav, labels, eyebrows, footers, "key" hints */
--f-display:   'Pixelify Sans', monospace     /* menu items, headers, team names, ROCKWOOD title */
--f-mono:      'VT323', monospace             /* body, table data */
'Press Start 2P', monospace                   /* numeric tabular values in standings (font-variant-numeric: tabular-nums) */
```

Google Fonts import (add to `index.html` or `index.css`):
```
@import url('https://fonts.googleapis.com/css2?family=VT323&family=Silkscreen:wght@400;700&family=Pixelify+Sans:wght@400;500;600;700&family=Press+Start+2P&display=swap');
```

### Other
```
Border-on-placard pattern:  2px solid #1a1c26 + box-shadow inset 0 0 0 2px #2a2d3a, 0 0 0 4px #14151c
Rivet (14×14):              radial-gradient(circle at 35% 30%, #b6b8c0 0%, #6c6f7c 40%, #2a2c36 80%, #0e0f15 100%)
Brushed-steel grain:        repeating-linear-gradient(90deg, rgba(255,255,255,.025) 0 1px, transparent 1px 3px)
Steel base gradient:        linear-gradient(180deg, #4a4d59 0%, #5a5e6c 12%, #535764 50%, #44485a 90%, #383b4a 100%)
```

---

## Components to build (drop into `src/components/`)

### 1. `PixelPhoto.jsx`
Canvas-based photo quantizer. Loads a JPG, downsizes to a low-res grid, applies Bayer-4 ordered dithering + nearest-color matching against the 16-color `DUSK_PALETTE`, draws back at low res with `image-rendering: pixelated`.

**Props:** `src`, `lowW=320`, `lowH=180`, `dither=true`, `tint=0` (0–1, pushes toward dusk warmth), `style`

Source: `reference/scene.jsx` lines containing `function PixelPhoto`. Logic is self-contained; no external deps. Lift verbatim.

### 2. `Fireflies.jsx`
Random pixel dots drifting via two CSS keyframes (`ff1`, `ff2`).
**Props:** `count=7`, `area={left,right,top,bottom}` (in % of parent).

### 3. `DriftingClouds.jsx`
Pixel-art cloud band SVG, animated horizontally via `cloud-drift` keyframe.
**Props:** `y` (% from top), `opacity`.

### 4. `Scene.jsx`
The shared CRT/atmosphere wrapper. Renders sky gradient + scanlines + chroma-aberration edges + vignette. All children render inside.

```jsx
<Scene>
  {/* page content */}
</Scene>
```

CSS classes used: `.scene`, `.scene .sky`, `.scene .scanlines`, `.scene .crt-vignette`, `.scene .chroma`. All in `reference/styles.css`.

### 5. `Placard.jsx`
The riveted steel-plate shell.

**Props:**
- `tabs` — array of strings (e.g. `['Standings','Weekly','Playoffs','Awards']`)
- `activeTab` — index
- `onTabChange(i)`
- `season` — string (e.g. `'2025'`)
- `onSeasonPrev()`, `onSeasonNext()`
- `title` — stencil header (e.g. `'SEASON STANDINGS'`)
- `subtitle` — small eyebrow under the title
- `variant` — `'detached' | 'diorama'` (controls rivet count + padding)
- `children`

Renders the tab strip (file-folder style on top), the steel plate (CSS classes `.placard`, `.placard-rivet`, `.placard-curve`), and lays out title/subtitle/season-picker row + children area.

Reference markup: `reference/mocks.jsx` `PlacardStandings` and `PlacardDiorama`.

### 6. `StatStamp.jsx`
The embossed-label stat boxes inside placards.
**Props:** `label`, `value`, `caption`.
CSS class: `.stat-stamp`.

### 7. `TopNav.jsx`
Replaces `<nav className="nav">`. Pixel-font links, amber active underline. Same NavLink wiring — just new clothes.

### 8. `MenuList.jsx` + `useMenuNav.js`
The Home page menu list. Hook handles ↑/↓/Enter; component renders rows with `.menu-row` + `.menu-row.is-active` styles, including 2-digit number prefix (`01`, `02`...) and `▸` arrow that fades in on active.

---

## Pages — port plan (do not touch data hooks)

| Existing page | Wrap in | Variant | Notes |
|---|---|---|---|
| `Home.jsx` | `<Scene>` | n/a | Replace markup with Menu A layout — see below. Keep `useNavigate` + `NAV_ITEMS` array exactly as-is. |
| `SeasonPage.jsx` | `<Scene><TopNav/><Placard variant="detached" tabs={['Standings','Weekly','Playoffs','Awards']}>...</Placard></Scene>` | Detached | Existing `<table>` becomes `<table className="standings">`. Stat-stamps row goes above. |
| `Records.jsx` | same | Detached | Multiple sub-tables — each in its own `.placard` section, or one big placard with section headers in `.stencil` class. |
| `Draft.jsx` | same | Detached | Draft board grid renders inside placard. Picks styled as small `.stat-stamp`-ish cells. |
| `HeadToHead.jsx` | same | Detached | Two team headers + matchup table. |
| `TeamPage.jsx` | `<Scene><TopNav/><Placard variant="diorama">` | Diorama | The team's all-time record, season-by-season chart, roster. Smaller placard, tower visible behind. |
| `PlayerPage.jsx` | same | Diorama | Single-player profile feels like a "trading card" reading. |

**Data and routes do not change.** Every existing API call, every `useParams`, every navigate stays.

---

## Screens

### Screen 1: **Home / Main Menu** (Menu A)

**Purpose:** Landing page. User picks where to go.

**Layout (1280×720 or fluid):**
- Full-bleed `<Scene>` wrapper
- **Background layer (z-index ~1):** `<PixelPhoto src="/tower_wide.jpg" lowW={400} lowH={225} dither tint={1} style={{ opacity: 0.92 }} />`
- **Left-side darkening gradient (z-index 38):** `linear-gradient(90deg, rgba(7,6,26,0.78) 0%, rgba(7,6,26,0.5) 30%, rgba(7,6,26,0.05) 55%, transparent 70%)` — ensures menu legibility over the photo
- **Drifting clouds (z-index 30):** two `<DriftingClouds>` at `y={30}` opacity 0.5 and `y={40}` opacity 0.35
- **Fireflies (z-index 60):** `<Fireflies count={5} area={{ left: 55, right: 90, top: 30, bottom: 60 }} />`
- **Title block (z-index 50, top-left, `left: 64px`, `top: 60px`):**
  - Eyebrow: `· EST. 2005 ·` — `font: var(--f-pixel) 12px`, color `var(--amber)`, letter-spacing 6px, margin-bottom 12
  - Wordmark: `ROCKWOOD` — class `.title-rockwood`, `font-size: 96px`, font `var(--f-display) 700`, letter-spacing 6px, line-height 0.92. Layered text-shadow stack creates a 6px outline + plum/indigo drop offset.
  - Sub: `THE LEAGUE` — `var(--f-display) 700, 34px`, letter-spacing 8px, color `#f4eedd`, text-shadow `-2px 2px 0 #2a1f4a`
- **Menu list (z-index 55, `left: 48px`, `top: 300px`):**
  - 5 items in `MENU_ITEMS` order — wire to existing `Home.jsx` paths
  - Each row: `.menu-row` — `.num` (amber 14px Silkscreen "01" prefix) + `.arrow` (▸, fades in on active) + label (`var(--f-display) 600, 36px`, letter-spacing 1px, color `#d8d2c2`)
  - On hover/active: background `linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 70%, transparent)`, color `#fff`, arrow visible
  - Keyboard: ↑/↓ moves selection, Enter navigates
- **Footer chrome (z-index 70, `left: 32px`, `right: 32px`, `bottom: 24px`):**
  - Left: `PROFILE: <username>` and `SEASON: 2025` (Silkscreen 11px, label `.lbl` in amber)
  - Right: `[↑↓] select  [↵] enter   v.0.12`
- **CRT overlays (top of stack):** `.scanlines`, `.chroma`, `.crt-vignette`

Reference: `reference/mocks.jsx` → `MenuA`

### Screen 2: **Detached placard** (Standings, Records, Draft, H2H)

**Purpose:** Big tabular data presented as a riveted steel plate.

**Layout:**
- `<Scene>` wrapper
- **Background:** `<PixelPhoto src="/tower.jpg" lowW={320} lowH={180} dither tint={0.5} style={{ opacity: 0.9 }} />` — the closer crop, shows curved tank wall
- **Curvature shading:** linear gradients on left/right edges + soft amber radial highlight at `50% 38%`, simulating sun on the tank
- **Rivet seam:** vertical line at `left: 72%` with 12 `.placard-rivet` dots descending — subtle, opacity 0.6
- **Background ROCKWOOD paint:** `.stencil-paint` at `top: 24, left: 32`, `font-size: 96px`, color `#0a0820`, opacity 0.18 — peeks behind the placard
- **Top nav (z-index 60, `top: 18px`):** ROCKWOOD brand, then HOME / SEASONS / RECORDS / DRAFT / TEAMS / H2H. Active link: white + amber bottom border. Inactive: `#8a8c98`. Right side: season selector `2025 ▾`.
- **Placard (z-index 50, centered, `width: 1080px`, `top: 54px`):**
  - **Tab strip** above — class `.placard-tabs` + `.placard-tab` (file-folder style)
  - **Body** — class `.placard`, padding `24px 28px 28px`
  - **8 corner+edge rivets** — `.placard-rivet` at all 4 corners, top-mid, bottom-mid, left-mid, right-mid
  - **Header row:** stencil title (`.stencil`, 36px) + subtitle (Silkscreen 11px, color `#3a3d4a`) on left, season picker `[◀] [2025] [▶]` on right (active = amber bg, dark text)
  - **4 stat-stamps** in a grid (`grid-template-columns: repeat(4, 1fr)`, gap 10) — High Score, Low Score, Avg PF, Tightest Game
  - **`<table className="standings">`** — see table spec below
- **Curve shadow** on placard: `.placard-curve` overlay
- **Footer hint:** `[ESC] back  [←→] change season  [TAB] switch view`
- **CRT overlays**

Reference: `reference/mocks.jsx` → `PlacardStandings`

### Screen 3: **Diorama placard** (Team page, recaps, single-matchup)

**Purpose:** Narrative single-subject page where the tower stays in frame.

**Layout:** same `<Scene>` + photo + clouds + fireflies as Detached, BUT:
- Heavier left darkening (`rgba(7,6,26,0.85) → 0.55 → 0.05 → 0`)
- **Placard is smaller** — `width: 700px`, `left: 56px`, `top: 72px` — anchored left, leaving the right two-thirds of the photo visible
- Only 2 stat-stamps, only 5 visible columns in the table (`#`, Team, W-L, PF, STRK)
- Smaller padding (`20px 22px 22px`), only 4 corner rivets
- Row text size dropped to 17px

Reference: `reference/mocks.jsx` → `PlacardDiorama`

---

## Standings table spec (`<table className="standings">`)

```
table:        border-collapse: separate; border-spacing: 0; font: var(--f-mono) 22px; color: #14151c
th:           font: var(--f-pixel) 11px; letter-spacing: 2px; color: #2a2c36;
              text-align: left; padding: 10px 12px 8px; border-bottom: 2px solid #2a2c36; uppercase
td:           padding: 8px 12px; border-bottom: 1px dashed rgba(20,21,28,0.25); line-height: 1
.rank:        font: var(--f-pixel) 16px; width: 32px; color: #2a2c36
.team:        font: var(--f-display) 600 22px; letter-spacing: 0.5px
.num:         font: 'Press Start 2P' 13px; text-align: right; font-variant-numeric: tabular-nums
.badge-tag:   inline-block; font: var(--f-pixel) 9px; letter-spacing 1px; padding 2px 6px;
              vertical-align: 2px; background #1a1c26; color var(--amber)
.badge-tag.gold: bg #2a1f08, color var(--gold)
.badge-tag.bad:  bg #4a1818, color #ff7a6a
hover row:    background rgba(0,0,0,0.06)
diff col:     positive → #2a6a3a, negative → #7a2a2a
streak col:   W* → #2a6a3a, L* → #7a2a2a
```

---

## Animations

| Element | CSS keyframe | Duration | Easing |
|---|---|---|---|
| Aircraft warning light flicker | `blink-light` | 2.4s | steps(1, end) infinite |
| Firefly pattern A | `ff1` | 6–14s (random) | ease-in-out infinite |
| Firefly pattern B | `ff2` | 6–14s (random) | ease-in-out infinite |
| Cloud drift | `cloud-drift` | 90s | ease-in-out infinite alternate |
| Menu row hover | background/color/transform | 0.12s | linear |
| Menu row arrow | opacity + translateX | 0.12s | linear |

Tower silhouette + its blink animation is no longer used; the keyframe can be deleted from the port unless you decide to add the warning light back somewhere.

---

## Behavior

- **Menu keyboard nav** — see `useMenuNav` hook in `reference/mocks.jsx`. Implement and attach in Home page only.
- **Tab switching** in placards — local state, swaps placard body content. Existing pages already have tabbing where applicable; just restyle the tabs to `.placard-tabs`.
- **Season picker** — `◀ 2025 ▶` — wire to existing season nav. The middle button is the current season; left/right step. (`SeasonPage.jsx` already takes `:year` param via React Router — keep that.)
- **No new state.** Every interactive piece in the design maps to existing app state. If something isn't already wired, leave it as a styled-but-static element and flag it.

---

## Assets

- `reference/assets/tower_wide.jpg` — wide shot, used as Home + Diorama background. Already in `the-league-ui/public/tower_wide.jpg`.
- `reference/assets/tower.jpg` — closer crop, used as Detached placard background. Already in `the-league-ui/public/tower.jpg`.

No new image assets needed. All other "art" is generated procedurally from these two photos via `<PixelPhoto>` plus hand-coded SVG/CSS.

---

## Files in this bundle

- `reference/index.html` — entry that mounts the design canvas with all 3 mocks
- `reference/styles.css` — **the source of truth for all CSS classes referenced above**. Lift wholesale into `src/index.css`.
- `reference/scene.jsx` — `PixelPhoto`, `PixelTower` (unused — delete), `Fireflies`, `DriftingClouds`. Lift the first three into `src/components/`.
- `reference/mocks.jsx` — `MenuA`, `MenuB` (unused — delete), `PlacardStandings`, `PlacardDiorama`. Use `MenuA` as the spec for `Home.jsx`. Use `PlacardStandings` and `PlacardDiorama` as the spec for the placard variants.
- `reference/design-canvas.jsx`, `reference/tweaks-panel.jsx` — design-tool scaffolding only. Do not port.
- `reference/assets/` — the two tower photos, identical to what's in `public/`.

---

## Quick checklist for the porting agent

- [ ] Add Google Fonts `<link>` to `index.html`
- [ ] Merge new `:root` tokens into `src/index.css` (keep old `--color-*` for now)
- [ ] Lift CSS classes from `reference/styles.css` into `src/index.css` — `.scene`, `.menu-list`, `.menu-row`, `.menu-box`, `.placard`, `.placard-rivet`, `.placard-curve`, `.placard-tabs`, `.placard-tab`, `.standings`, `.stat-stamp`, `.title-rockwood`, `.title-sub`, `.stencil`, `.stencil-paint`, `.scene-footer`, `.hint`, `.firefly`, `.clouds`, `.tower-svg`, plus all keyframes
- [ ] Create `src/components/{PixelPhoto,Fireflies,DriftingClouds,Scene,Placard,StatStamp,TopNav,MenuList}.jsx`
- [ ] Replace `Home.jsx` body with Menu A layout — keep `useNavigate` + `NAV_ITEMS` exactly
- [ ] Wrap each existing page in `<Scene>` + `<TopNav>` + `<Placard variant="...">` — do not touch data hooks
- [ ] Replace `<table>` markup classes with `.standings` and friends — do not change `<thead>`/`<tbody>`/data
- [ ] Delete the old `.nav`, `.home-*`, `.card`, `.page-header` styles only after every page is ported
- [ ] Smoke-test all routes — they should load and render with new visuals, same data, same navigation
