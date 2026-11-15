# Blank: Project — Style Guide

A design system for the whole game: what the look already is, tidied into one set of rules, plus a motion system.

**How to read this document**

- **"Today"** means the value is already in the CSS (file and token named). Nothing in this guide asks to change how an existing screen looks.
- **"Rule"** means a decision for all new work and for any screen that gets remade.
- **"Proposed token"** means a new CSS custom property that does not exist yet. Section 11 explains how to add them without changing any look.
- This is a document only. It changes no code.

Three hard limits from the project rules that every section respects:

1. **The character screen (`.cs`) never changes.** Any shared rule must be scoped `:not(.cs *)`.
2. **Main actions use the crystal palette, never yellow or gold.**
3. **Everything works offline, on upright phones, on sideways phones, and with reduced motion.**

---

## 1. Design principles

| # | Principle | What it means in practice |
|---|---|---|
| 1 | **Glass over art** | The owner's art (wallpapers, splash arts) is the background of almost every page. UI sits on it as see-through glass, so the art is always felt. A page with no art still needs something worth seeing through: drifting colour glows. |
| 2 | **Crystal means "do it"** | The crystal gradient is spent on one thing per view: the main action (Summon, Start, Battle, Buy, Claim) and the currently selected item. If two crystal buttons compete on one view, one of them is wrong. |
| 3 | **Readable before pretty** | Art can be any brightness. Text must survive the brightest art. Every text block over art gets a scrim, a glass panel, or a text shadow (section 2.6). |
| 4 | **One shape language per place** | Full-screen pages use mixed round / sharp corners with small light brackets. The home screen uses uniform shapes (pills, circles, even rounded rectangles). They are never mixed on one screen. |
| 5 | **Calm motion, loud moments** | Everyday UI moves quickly and quietly (150–360 ms, small distances). Big animation is saved for the moments that deserve it: pulls, match start, victory. Looping motion is slow and faint. |
| 6 | **Same thing, same look** | A selected tab, a rarity tag, a red dot, a close button look the same on every page. New pages are built from the parts in section 8, not from new parts. |

---

## 2. Colour

### 2.1 Core tokens (today, `src/styles/main.css` `:root`)

| Token | Value | Role |
|---|---|---|
| `--ink` | `#0a0f1f` | Page background behind everything; the darkest colour. |
| `--ink-2` | `#141d3c` | Raised dark surface (older windows). |
| `--text` | `#f3f6ff` | Main text. |
| `--muted` | `#b3bedf` | Secondary text. |
| `--faint` | `#7f8bb3` | Tertiary text, placeholders. Not for anything the player must read (see 2.6). |
| `--glass` | `rgba(18,26,56,.34)` | Older "clear" glass fill (`.glass`). |
| `--glass-hi` | `rgba(255,255,255,.16)` | Light glass fill (ghost buttons). |
| `--glass-deep` | `rgba(15,21,44,.66)` | Dark glass for text-heavy panels (`.glass-deep`). |
| `--edge` / `--edge-soft` | `rgba(255,255,255,.24)` / `.12` | Glass borders. |
| `--field` | `rgba(4,8,22,.38)` | Input background. |
| `--mint` / `--mint-ink` | `#7ef3d4` / `#06352b` | Success, "free", the free-pull button. |
| `--gold` / `--gold-ink` | `#ffd36b` / `#4a2a00` | Gold the currency, S grade, scratch prizes. Not for actions. |
| `--pink` | `#ff9ec4` | Bond, hearts. |
| `--danger` | `#ff8a9a` | Destructive actions, errors. |

### 2.2 Crystal palette (today, `main.css` line ~2791)

| Token | Value | Role |
|---|---|---|
| `--cry-grad` | `linear-gradient(180deg,#ffe4f6 0%,#f5afe8 34%,#c8a2ff 68%,#94b8ff 100%)` | Fill of main action buttons and selected items. |
| `--cry-grad-h` | `linear-gradient(90deg,#f7b3e9,#c9a3ff 55%,#97b9ff)` | Horizontal version: progress bars, underlines. |
| `--cry-ink` | `#2b1855` | Text and icons on crystal. |
| `--cry-glow` | `rgba(190,150,255,.5)` | Glow under crystal things. |
| `--cry-edge` | `#fbe6ff` | 1 px border of crystal things. |

The four crystal stops as single colours, for accents that cannot take a gradient (focus rings, small dots, underline ends):

| Name | Hex |
|---|---|
| Crystal pearl | `#ffe4f6` |
| Crystal rose | `#f5afe8` |
| Crystal lavender | `#c8a2ff` |
| Crystal ice | `#94b8ff` |

**Rule:** `--cry-ink` on `--cry-grad` is the only allowed text pairing on crystal. White text on crystal fails contrast at the pale top.

### 2.3 Glass tokens (today, redefined per page)

Full-screen glass pages each set these on their root (`.rdx`, `.cmp`, `.bpx`, `.mallx`, `.evx` …). The values differ by a few percent between pages; the table gives the **reference values** (from `.rdx`), which new pages should use.

| Token | Reference value | Role |
|---|---|---|
| `--gl` | `linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.025))` | Clear glass fill. |
| `--gl-rim` | `rgba(238,224,255,.28)` | 1 px glass border, slightly lavender. |
| `--gl-hi` | `inset 0 1px 0 rgba(255,255,255,.18)` | Inner top highlight. |
| `--rc` | `22px 6px 22px 6px` | Panel corner set (see section 5). |

Home screen tokens (today, `home.css`, scoped to `.menu`): `--h-ink #15122d`, `--h-ink2 #221e45`, `--h-line rgba(255,255,255,.13)`, `--h-glass rgba(255,255,255,.13)`, `--h-rim rgba(255,255,255,.28)`, `--h-blur blur(16px) saturate(1.3)`, `--h-shadow 0 6px 18px rgba(0,0,0,.32)`.

UI refresh tokens (today, `ui2.css`): `--u2-rim rgba(232,214,255,.22)`, `--u2-rim-hi rgba(250,230,255,.62)`, `--u2-panel`, `--u2-hair` (the pink → lavender → blue hairline), `--u2-ring` (crystal ring for round frames), `--u2-ease cubic-bezier(.2,.8,.2,1)`.

### 2.4 Text levels on glass

| Level | Value | Use | Minimum size |
|---|---|---|---|
| Primary | `#fff` / `--text` | Names, values, titles | any |
| Secondary | `rgba(240,232,255,.78)` | Descriptions, sub lines | 12 px |
| Tertiary | `rgba(240,232,255,.62)` | Kickers, group headers, hints | 12 px, and never the only place a fact is shown |
| Disabled | `rgba(240,232,255,.40)` | Disabled labels | — |

**Rule:** today many sub lines are 11–11.5 px at `.6` opacity. That is fine as decoration, but anything the player needs in order to decide (a value, a limit, a state) uses Secondary or Primary.

### 2.5 Rarity, grade, VIP and status colours

**Rarity** (today, `:root`):

| Rarity | Token | Value | Tag look (`.rtag`) |
|---|---|---|---|
| R | `--r3` | `#74c7ff` | Blue fill. |
| SSR | `--r4` | `#ffaa5c` | `linear-gradient(180deg,#ffd6a6,#ff9a45)`, text `#4a1d00`. |
| UR | `--r5` / `--ur` | `#d07bff` / `linear-gradient(120deg,#a855f7,#ff6ec7 50%,#3ee6d0)` | Moving prism gradient, white text. |
| MR | `--r6` / `--mr` | `#ff4f7b` / `linear-gradient(120deg,#ff2d6f,#ff7aa8 50%,#ffc2d4)` | Pink-red, marriage skins only. |

**Grades** (today, `.grade.g-*`); VIP badges use the same ladder, a little brighter (`.vipb.v-*`):

| Grade | Fill | VIP level with this colour |
|---|---|---|
| F | `#3d4150` | 1 |
| E | `#4d5a66` | 2 |
| D | `#3f8f6a → #2b6a4d` | 3 |
| C | `#3a87c9 → #275f94` | 4 |
| B | `#6d5ad6 → #4a3aa3` | 5 |
| A | `#c24fd0 → #8e2f9e` | 6 |
| S | gold wave `#b8780f, #ffc94a, #ffe08a, #e8a42a` | 7 |
| SS | UR prism `#a855f7, #ff6ec7, #3ee6d0` | 8 |
| SSS | layered reds `#4a0008, #b3001e, #ff2a3d, #ff7a3d, #ff2a6e` with a pulsing glow | 9–12 |

**Status colours** (rule; the values are the ones already used most often):

| Status | Text / icon | Fill for chips | Used for |
|---|---|---|---|
| Success | `#9ff5c6` | `rgba(126,243,212,.18)` | Claimed, ready, "free", owned |
| Info | `#94b8ff` | `rgba(148,184,255,.18)` | Neutral facts, tips |
| Warning | `#ffd27a` | `rgba(255,210,122,.18)` | Limits nearly reached, "ends soon" |
| Danger | `#ffb3c0` text, `#ff5d76` solid | `rgba(255,93,118,.18)` | Full wardrobe, errors, destructive |
| Notification | `#ff3b30` core (`radial-gradient(#ffa293,#ff3b30 58%,#cf1d2b)`) | — | Red dots only |

**Mode colours.** Each battle mode has its own accent used for its kicker icon, title glow and backdrop glows, never for buttons: Free Training teal `#8ff5d2`, Quick Match per type, Raids violet, Golden Vault gold, Arena crimson, Guild Boss ember. Pass it as `--mc`.

### 2.6 Contrast rules

Art can be white. Glass is see-through. So contrast is guaranteed by layers, not by hoping the art is dark.

| Situation | Guarantee |
|---|---|
| Text directly on art (hero titles, descriptions) | A page scrim under it (today `.rdx-shade`: left edge `rgba(5,5,12,.6)` fading to `.1`; bottom `.6`; top `.45`) **and** a text shadow: titles `0 4px 18px rgba(0,0,0,.6)`, body `0 1px 6px rgba(0,0,0,.8)`. |
| Text on clear glass (`--gl`) | The backdrop picture is dimmed before blur: `brightness(.55–.62)`. Blurred + dimmed art cannot exceed mid grey, so white text holds 4.5:1. |
| Text on glass over a bright, sharp picture (Base town, event wallpapers) | Use deep glass (`--glass-deep`, `.66` alpha) instead of clear glass. |
| Small text (under 14 px) | Must reach 4.5:1 against the worst case. In practice: Secondary level or brighter, on dimmed glass. |
| Large text (24 px+) and icons | 3:1 is enough. |
| Text on crystal | `--cry-ink` only. |

**Check when building:** put a pure white picture behind the page. If any text disappears, add scrim or switch that panel to deep glass.

### 2.7 When not to use gold

Gold is a **meaning**, not a decoration. Use it only for:

- the gold currency and its amounts,
- the S grade and VIP 7,
- first place, 3-star / perfect states, crowns on boss stages,
- the Golden Vault's own page,
- scratch card prizes,
- Card Clash unit frames and victory.

Never for: main buttons, selected tabs, progress bars, generic highlights, links. If something needs to say "press me", it is crystal. If it needs to say "this is good", it is mint.

---

## 3. Typography

### 3.1 Families (today)

| Token | Family | Role |
|---|---|---|
| `--display`, `--body` | Cinzel Bold (the owner's file, embedded) | All UI text: titles, labels, buttons, numbers, names. Declared at `font-weight:400` because the file itself is the bold cut. |
| `--read` | Nunito | Anything read as a sentence: descriptions, hints, `.tiny`, inputs, chat, long lists. |

**Rule of thumb:** if it has a full stop, it is Nunito. If it is a name, a number or a command, it is Cinzel.

Cinzel has no real lowercase (it draws small capitals), so it gets wide and loud quickly. Keep Cinzel lines short; never set a paragraph in it.

### 3.2 Type scale

Desktop sizes; all values exist in the CSS today, collected into one ladder.

| Style | Family | Size / line height | Tracking | Extra | Use |
|---|---|---|---|---|---|
| Display | Cinzel | `clamp(36px, 4.6vw, 70px)` / 1.0 | 0 | italic, shadow `0 4px 18px rgba(0,0,0,.6)` | One per page: the page's hero title. |
| Page title | Cinzel | 26 / 1.15 | .02em | italic | Header pill title (`.inv-title h2`). |
| Section title | Cinzel | 20 / 1.2 | .02em | — | Window titles, big card names. |
| Item title | Cinzel | 16 / 1.15 | .02em | — | Rail items, card names, row labels. |
| Label | Cinzel | 14 / 1.2 | .03em | — | Control labels, button text (small buttons 13). |
| Panel header | Cinzel | 14 / 1.2 | **.12em** | UPPERCASE | The heading of a glass panel. |
| Kicker | Cinzel | 12 / 1.2 | **.12em** | UPPERCASE, Tertiary colour | Eyebrow above titles, group headers in rails. |
| Number, large | Cinzel | 24–34 / 1.0 | .02em | `font-variant-numeric: tabular-nums` | HP, level, big counts. |
| Number, inline | Cinzel | 15–17 / 1.0 | 0 | tabular | Values next to controls, currency amounts. |
| Body | Nunito 500 | 15 / 1.5 | 0 | — | Descriptions. |
| Body small | Nunito 600 | 13 / 1.4 | 0 | — | Card descriptions, list text. |
| Hint | Nunito 600 | 12 / 1.35 | 0 | Secondary colour | Sub lines under labels. |
| Tiny | Nunito 600–700 | 11 / 1.3 | 0 | — | Legal, footnotes, tags. Never for facts. |

**Wide-tracked labels look off-centre**, because the last letter carries trailing space. When a tracked label is centred (banners, chips), add `padding-left` equal to the tracking (the Card Clash turn banner already does this).

**Numbers that change** always use tabular figures so they do not jiggle while ticking.

### 3.3 Phone adjustments

| Style | Portrait phone (≤820 portrait) | Sideways phone (≤500 tall) |
|---|---|---|
| Display | 34 px | 28 px |
| Page title | 20 px (18 under 440 wide) | 17 px |
| Item title | 14 px | 13 px |
| Label | 13 px | 12.5 px |
| Panel header / Kicker | 12 / 11 px | 11 / 10 px |
| Body | 14 px | 12.5 px, clamp to 2 lines |
| Hint | 12 px | hidden unless it carries a fact |

**Rule:** never below 11 px anywhere; never below 12 px for Nunito text the player needs.

---

## 4. Spacing and layout

### 4.1 Spacing scale (proposed tokens; the values match what the CSS uses)

A 4-point scale with two half steps, because the existing pages lean on 6 and 10.

| Token | px | Typical use |
|---|---|---|
| `--sp-1` | 2 | Hairline gaps, text stacks |
| `--sp-2` | 4 | Icon to text inside a chip |
| `--sp-3` | 6 | Chip gaps, tight rows |
| `--sp-4` | 8 | Default gap between small things |
| `--sp-5` | 10 | Gap inside cards |
| `--sp-6` | 12 | Card padding, row gaps |
| `--sp-7` | 16 | Panel padding, gap between panels |
| `--sp-8` | 20 | Page side padding (desktop 22 today) |
| `--sp-9` | 24 | Column gap on desktop |
| `--sp-10` | 32 | Section breaks |
| `--sp-11` | 48 | Hero breathing room |

**Rule:** gaps grow with rank. Inside a control 4–8, between controls 8–12, between panels 16, between page regions 24.

### 4.2 Page anatomy for full-screen pages

Every full-screen glass page (Raids, Quick Match, Free Training, Arena, Hangout, Ranking, Shop …) is the same five regions. Today's reference is `.rdx`.

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER   [badge + title pill] (i)      chips   currencies  X │  56 px
├───────────┬──────────────────────────────────────────────────┤
│ RAIL      │ HERO   kicker · Display title · description      │
│ 300 px    │        summary chips                             │
│ glass     ├──────────────────────────────────────────────────┤
│ list of   │ PANELS  glass panels, the only scrolling region  │
│ choices   │                                                  │
│           ├──────────────────────────────────────────────────┤
│           │ ACTION BAR  context · cost · [ MAIN ACTION ]     │  pinned
└───────────┴──────────────────────────────────────────────────┘
```

| Region | Rules |
|---|---|
| Header | One row. Left: round badge + italic title in a pill, then (i). Right: status chips, currencies, close. Close is always the last thing, top right. |
| Rail | Choices that swap the whole page (which raid, which board, which preset). Glass panel, one column of items, the selected one in crystal tint. |
| Hero | Says where you are in one glance: kicker, Display title, at most two lines of description, summary chips. No controls. |
| Panels | The content. The **only** region that scrolls. Max width 1120 px, centred. |
| Action bar | Pinned at the bottom of the main column. Holds exactly one crystal button, on the right. Never scrolls away. |

Layers (z-order, bottom to top): backdrop picture → drifting glows → scrim → header / rail / main → popovers → modals → toasts.

### 4.3 Breakpoints

These five are the ones the CSS already uses most (53 sideways rules, 51 portrait rules, 15 medium rules). New work uses these and no others, unless a specific overflow needs a one-off fix.

| Name | Media query | What changes |
|---|---|---|
| **Desktop** | wider than 1240 px | Full layout. Rail 300 px, page padding 22 px, column gap 24 px. Home HUD zooms up with `hmZoom`. |
| **Medium** | `(min-width:821px) and (max-width:1240px)` | Rail 250 px. Two-column grids become one. Action bar wraps to two rows. Five-across card rows become three. |
| **Short desktop** | `(max-height:800px) and (min-height:501px)` | Display title and paddings shrink about 15% so pages still fit without scrolling. |
| **Portrait phone** | `(max-width:820px) and (orientation:portrait)` | One column. Rail becomes a horizontal strip under the header (labels only). Page padding 12 px. Hero shrinks. Action bar stays pinned and stacks. |
| **Short portrait** | portrait phone `and (max-height:700px)` | Drop decorative lines (kicker, sub lines), reduce hero to the title. |
| **Narrow portrait** | `(max-width:440px) and (orientation:portrait)` (and 400 / 380 for the tightest cases) | Drop avatars inside bars, shorten labels, hide secondary header chips. |
| **Sideways phone** | `(max-height:500px) and (orientation:landscape)` | Two columns stay. Rail 200 px with labels only. Header 36–42 px. Hero is one line. Everything decorative goes. Under 700–760 px wide, more labels go. |

**Sizes every page is checked at** (the project's standard list): 1920×1080, 1600×900, 1366×768, 1280×720, 1024×768, 844×390, 740×360, 667×375, 414×896, 390×844, 375×667, 360×740.

**Rule:** safe-area insets are added to page padding on all four sides (`env(safe-area-inset-*)`), as `.rdx` does.

---

## 5. Shape language

### 5.1 Two families, never mixed on one screen

| Family | Where | Shapes |
|---|---|---|
| **Mixed corners** | Every full-screen page and glass window: summon, shop, raids, quick match, training, campaign, arena, events, honor, bag … | Round top-left and bottom-right, nearly sharp top-right and bottom-left. |
| **Uniform** | The home screen (`.menu`) only | Pills and circles for small things; evenly rounded rectangles (14–24 px) for panels. |
| **Untouched** | The character screen (`.cs`) | Its own shapes. Do not restyle. |

Why mixed corners: the diagonal pair of sharp corners gives the pages a cut-crystal feel that matches the crystal palette, and it is the game's most recognisable shape.

### 5.2 Radius tokens (proposed names; values in use today)

| Token | Value | Use |
|---|---|---|
| `--rd-xs` | `11px 3px 11px 3px` | Segments inside a segmented control, tiny buttons |
| `--rd-sm` | `14px 4px 14px 4px` | Chips, small buttons, selects, kicker pill |
| `--rd-md` | `18px 5px 18px 5px` | Cards, rail items, option cards |
| `--rd-lg` | `22px 6px 22px 6px` | Panels, rail, action bar (= `--rc` today) |
| `--rd-xl` | `28px 8px 28px 8px` | Windows, the main action button (26/7) |
| `--rd-pill` | `999px` | Header title pill, counters, toggles |
| `--rd-round` | `50%` | Icon frames, avatars, steppers |

**Rule:** the sharp corner is about a quarter of the round one. A nested element uses the next size down, so inner corners never look fatter than outer ones.

### 5.3 Light brackets

Small L-shaped light strokes on the two **sharp** corners of a major surface (the page's main panel, the rail, a hero card).

| Property | Value |
|---|---|
| Arm length | 14 px (10 px on phones) |
| Stroke | 1.5 px, `rgba(255,255,255,.7)`, or the page's mode colour at 70% |
| Offset | −1 px, sitting on the border |
| How | A pseudo-element, or background layers when the panel scrolls (as the summon column does), so they stay put |

**Rule:** at most three bracketed surfaces per view. Brackets on every card turn into noise.

### 5.4 Dividers

| Divider | Spec | Use |
|---|---|---|
| Hairline | 1 px `rgba(255,255,255,.08–.10)` | Between rows inside a panel |
| Crystal hairline | 1 px `--u2-hair` (transparent → pearl → lavender → ice → transparent) | Under window headers, medium modal top edge |
| Diamond hairline | 1 px white gradient with a 6 px rotated square at each end (`.cs-sep`) | Under a name or a badge row. Must be `flex:none` inside flex columns. |

---

## 6. Surfaces and elevation

### 6.1 Glass levels

| Level | Fill | Blur | Border | Shadow | Use |
|---|---|---|---|---|---|
| **Clear** | `--gl` (white 10% → 2.5%) | `blur(16px) saturate(1.1)` | 1 px `--gl-rim` | `--gl-hi`, `0 16px 40px rgba(0,0,0,.28)` | Panels, rails and bars over a **blurred** backdrop. |
| **Clear, small** | `--gl` | `blur(10–12px)` | 1 px `--gl-rim` | `--gl-hi` | Chips and pills sitting directly on the backdrop. |
| **Nested** | `rgba(255,255,255,.05)` | **none** | 1 px `rgba(255,255,255,.12–.14)` | none | Cards and controls **inside** a glass panel. |
| **Deep** | `--glass-deep` (`rgba(15,21,44,.66)`) | `blur(26px) saturate(1.7)` | 1 px `--edge` | `0 24px 60px rgba(0,0,0,.45)` | Text-heavy panels over sharp or bright art; medium and small windows. |
| **Ink** | `--h-ink #15122d`, solid | none | 1 px `--h-line` | `--h-shadow` | Home screen solid pieces; anywhere glass would be unreadable or too costly. |
| **Crystal** | `--cry-grad` | none | 1 px `--cry-edge` | `0 0 22px var(--cry-glow)`, inset top highlight `.7` | The main action and selected markers. |

**Rule: never nest blur.** A blurred element inside a blurred panel costs a second full blur pass and adds nothing visible. Controls inside panels use the Nested level.

**Blur budget per view:** at most 8 elements with `backdrop-filter` on desktop, at most 4 on phones. (For reference, the current Free Training page has 13.)

### 6.2 Backdrop treatment

Every glass page has a backdrop built from three layers:

| Layer | Spec | Why |
|---|---|---|
| Picture | The page's wallpaper (admin upload, or a fitting art), drawn 5% larger than the screen (`inset:-5%`), `filter: blur(14–16px) saturate(1.15–1.2) brightness(.55–.62)` | Blur makes glass meaningful and hides detail that would fight the UI. Oversizing stops the blurred edges fading to transparent. Dimming guarantees contrast. |
| Glows | Three circles (`.hgx-glow`): 26–36 vw, `filter: blur(40px)`, opacity `.5` (`.16–.22` when there is a picture), drifting 16 s ease-in-out alternate, offset −6 s and −11 s | Gives colour and slow life when there is no picture; tints the picture in the page's mode colour when there is. |
| Scrim | Gradients: left `.6–.72` → `.1`, bottom `.6–.7` → 0, top `.45–.5` → 0 | Darkens exactly where the rail, the action bar and the header sit. |

How much blur:

| Case | Blur |
|---|---|
| Backdrop is the subject (event wallpaper, summon art) | 0 — keep sharp, use deep glass on top |
| Backdrop is atmosphere (most pages) | 14–16 px |
| Backdrop behind dense controls or long text | 16–18 px plus stronger scrim |
| Pearl Honor | admin slider, 12 px default |

The static blur is a CSS `filter` on one element that never changes, so the browser rasterises it once. That is cheap. `backdrop-filter` is what costs.

### 6.3 Elevation

| Level | Shadow | Things |
|---|---|---|
| 0 | none | Nested cards, rows |
| 1 | `0 6px 18px rgba(0,0,0,.32)` | Chips on art, home pieces |
| 2 | `0 16px 40px rgba(0,0,0,.28–.32)` | Panels, rail, action bar |
| 3 | `0 24px 60px rgba(0,0,0,.45)` | Windows, popovers |
| Glow | `0 0 12–22px` in the item's own colour at 25–40% | Selected items, crystal buttons. A glow replaces a shadow; do not stack both heavily. |

---

## 7. Iconography and imagery

### 7.1 Line icons

| Property | Value |
|---|---|
| Source | `ICONS` in `01-core.js`, drawn by `icon(name)` |
| Grid | 24×24 viewBox |
| Stroke | 2, round caps and joins, no fill (small solid details allowed) |
| Colour | `currentColor` |
| Sizes | 12 (inside hints), 14–16 (chips, small buttons), 18–20 (controls, rail), 22 (default `.ic`), 24 (main action orb) |

**Rule:** one icon per idea across the game (swords = battle, target = training, cards = deck, heart = HP, bolt = AP, clock = rounds, sparkle = event). Reuse before drawing a new one.

Filled icons exist in two places and stay there: currency icons (`CUR_SVG`, full colour) and Card Clash emblems (game-icons.net, CC BY 3.0, credited in the rules book).

### 7.2 Round icon frames

| Frame | Size | Fill | Border |
|---|---|---|---|
| Header badge (`.inv-badge`) | 46 (38 phone, 32 sideways) | dark gradient, conic crystal ring | 2 px |
| Rail item icon (`.rdx-iti`) | 40 (32 / 28) | `rgba(255,255,255,.08)`; crystal when selected | 1 px |
| Avatar in a bar (`.rdx-si`) | 38 (30) | tint of its side's colour | 1 px |
| Close (`.inv-x`) | 44 (36 sideways) | glass | 1 px; the X turns 90° on hover |
| Info (`.info-btn`) | 24 visual, 44 hit area | glass | 1 px |

**Uploaded icons** replace the whole face of their frame: the frame gets `.ic-up`, its circle is hidden and the picture is shown unclipped and auto-centred. New icon frames must support this.

### 7.3 Character and item art

| Kind | Shape | Rules |
|---|---|---|
| Splash art | 16:9, stored 1728×968 | Full-screen views use `object-fit:cover` at `50% 30%` so faces survive cropping. Admin framing (`S.artPos`) overrides. |
| Portrait card | 3:4, 196 px wide | One size everywhere. Framing per art via `cardPos`. Rarity tag top left, grade top right, name and stars bottom. |
| Round thumb | circle | `baseThumb` / the entry's custom icon. Ring in rarity colour where rarity matters. |
| Memory | 16:9 in a star frame; square crop in grids | Frame colour follows stars (white, blue, orange, animated prism). |
| Pet | square 1254×1254 | Shown whole. |
| Banners and pulls | base art only | Never the player's chosen 3★ / 6★ art or outfit. |
| No art | the glowing green orb (`drawOrb`); pets keep their drawn animal | Never an empty box. |

**Rule:** art is never stretched, never tinted except by the page scrim, and text is never placed over the upper middle of a splash art (that is where faces are).

---

## 8. Components

Shared states for every interactive component:

| State | Treatment |
|---|---|
| Default | As specified below. |
| Hover (pointer devices only) | Fill one step brighter, border to `rgba(251,230,255,.5)`, lift 1–2 px. 150 ms. |
| Pressed | `scale(.96)`, 90 ms. No lift. |
| Focus-visible | 2 px ring, 2 px offset: `#f5afe8` on glass, `#fff` on crystal (section 10). |
| Selected | Crystal tint or crystal fill (per component). Also exposed with `aria-pressed` / `aria-selected`. |
| Disabled | Opacity `.45–.5`, no hover, no shadow glow, `cursor:default`. Still readable. |
| Loading | Content swapped for three small dots pulsing in sequence (1.2 s loop); width held so nothing jumps; not clickable. |

### 8.1 Buttons

| Button | Anatomy | Sizes (height) | Look | Use |
|---|---|---|---|---|
| **Crystal primary** (`.btn.gold`, `.rdx-go`, `.summon2`) | Optional round white orb with icon, label, optional sub line | Hero 70 (56 phone, 46 sideways); regular 44; small 34 | `--cry-grad`, text `--cry-ink`, 1 px `--cry-edge`, glow `0 0 22px --cry-glow`, inset top highlight. Hero size carries a sheen sweep every 3.6 s. | The one main action of a view. |
| **Glass secondary** (`.rdx-sec`, `.btn.ghost`) | Icon + label | 36 (44 hit area) | `rgba(255,255,255,.07)`, 1 px `rgba(255,255,255,.22)` | Everything else that does something. |
| **Ghost** | Label only, or icon + label | 36 | No fill, no border until hover | Tertiary: "Cancel", "Use last". |
| **Danger** (`.btn.danger`) | Icon + label | 44 / 34 | 25% `--danger` fill, 55% border, text `#ffd9de` | Delete, leave, disband. Destructive actions confirm (tap twice, or a small window). |
| **Icon button** | One icon in a circle | 36–44 | Glass circle | Close, info, refresh. Always has `aria-label` and a tooltip. |
| **Pill** | Icon + label, fully round | 34–46 | Glass (pages) or ink (home) | Currencies, counters, header chips. |

Do:
- One crystal button per view; put it bottom right (desktop) or full width at the bottom (portrait).
- Give the hero button a sub line that states the cost or consequence ("5 stamina", "Free training").

Don't:
- Use gold or yellow for a button.
- Put two crystal buttons side by side. The second becomes glass.
- Disable a button without saying why nearby.

### 8.2 Chips and tags

| Kind | Spec | Use |
|---|---|---|
| Info chip (`.rdx-meta > span`) | 30 px tall, `--rd-sm`, clear-small glass, 17 px icon + 13 px Cinzel | Facts in a hero: cost, rules, counts. Not clickable. |
| Choice chip (`.ftx-ev`) | 32 px tall (44 hit area on phones), nested glass; selected = 22% tint of its own colour `--ec`, border 70% of it, glow 35% | Pick one of several named options that each have a colour (battle events). |
| Status tag | 20 px tall, pill, status fill from 2.5, 11 px Nunito 700 | "Full", "New", "Ready", "Custom". |
| Rarity tag (`.rtag`) | Cinzel 13, radius 7 | Rarity only. Never restyle. |
| Kicker pill (`.rdx-kind`) | 24 px tall, `--rd-sm`, Kicker type | Above a Display title. |

### 8.3 Segmented controls and tabs

| Kind | Spec |
|---|---|
| **Segmented control** (2–4 short options, pick one) | Track: nested glass, `--rd-sm`, 3 px padding. Segments: `--rd-xs`, 30 px tall (36 on phones), Cinzel 12.5. Selected segment: crystal fill, `--cry-ink`, glow `0 0 12px --cry-glow`. **Rule:** the crystal fill is one "thumb" element that slides between segments (section 9.5), not a fill that jumps. |
| **Page tabs** (switch the content of a region) | A glass strip; each tab is icon + name; selected tab: lit glass (`rgba(255,255,255,.12)`) with a **crystal underline** 2 px tall, `--cry-grad-h`, inset 12 px from each side. The underline slides. No solid crystal fill — tabs are navigation, not actions. |
| **Rail items** (`.rdx-it`) | 60 px tall (46 portrait, 40 sideways), `--rd-md`, 40 px round icon + title + sub line. Selected: gradient tint `rgba(245,175,232,.22) → rgba(200,162,255,.07)`, border `rgba(251,230,255,.6)`, glow, icon frame in crystal. |

Do: use a segmented control only when all options fit on one line at the smallest width. Otherwise use option cards or a select.

### 8.4 Cards

| Card | Spec | States |
|---|---|---|
| **Glass card** | Nested glass, `--rd-md`, padding 12 | Hover: brighter + lift 1 px. |
| **Option card** (pick one: difficulty, stage) | Glass card with header row (pips or numeral + name) and a 2-line Nunito description | Selected: tint of its own colour `--dc` 24% → transparent, border 75% of it, glow 38%. Locked: 45% opacity, lock badge, the unlock rule as its description. |
| **Rarity card** (`.inv-cell`) | Square, fill by rarity (R blue, SSR orange, UR prism), amount under it | Selected: 2 px white ring + lift. |
| **Portrait card** (`.skc`) | 3:4, 196 px, art cover | Locked: greyscale + lock. 6★: animated comet border. |

Selection uses colour **and** one more cue (border weight, glow, check mark, or position of an underline), so it does not rely on colour alone.

### 8.5 Sliders and steppers

| Control | Spec | When |
|---|---|---|
| **Slider** | Track 6 px tall, pill, `rgba(255,255,255,.14)`; filled part `--cry-grad-h`; thumb 20 px white circle with a 2 px `--cry-edge` ring and soft glow (28 px while dragging); hit area 44 px tall. Optional tick marks 2×6 px under the track; the "normal" value gets a brighter tick and a tiny label. A value readout sits to the right in Number-inline type, and is itself editable where precision matters. | Ranges of 10 or more steps (HP 1–60). |
| **Stepper** | `−` value `+`; buttons 30 px circles (36 on phones, 44 hit area), nested glass; value in Number-inline, min width 28 px; a prefix `+` for bonuses. Disabled end buttons at 35%. Press and hold repeats after 400 ms, every 80 ms. | Small ranges (0–6). |
| **Pip stepper** | A row of small shapes (diamonds, mini cards) that fill as the value rises; tapping a pip sets the value; `−` / `+` at the ends on phones | When the value is a count of game objects the player knows (AP crystals, cards). |

Do: always show min, max and the normal value near a slider. Don't: use a slider for fewer than 8 steps, or a native-looking slider with `accent-color` only (it ignores the glass look and has a tiny thumb on phones).

### 8.6 Selects

| Part | Spec |
|---|---|
| Closed | 36 px tall (44 on phones), `--rd-sm`, nested glass, value in Nunito 600 13, chevron right. Max width 240 px on desktop, full width on phones. |
| Open, 7 options or fewer and no groups | Native `<select>` is acceptable (it is accessible and reliable on phones). Options get a solid `#1a1830` background. |
| Open, grouped or needing pictures (decks, skins, characters) | A glass popover on desktop and a bottom sheet on phones: group headers in Kicker type, rows 44 px with icon / thumbnail, the current one with a crystal check. Reuse the existing pickers (`ccDeckPicker`, `openCharPicker`, `ccSkinPicker`) rather than a new list. |

### 8.7 Toggles

A two-state switch: track 44×24 pill, nested glass; on = `--cry-grad-h` fill; knob 18 px white circle that slides 20 px. Label on the left, state readable without colour (the knob position, plus "On" / "Off" text for settings rows). For choices with named states ("Draw" / "More HP wins") use a two-segment control instead — a toggle hides what "off" means.

### 8.8 Progress bars

| Kind | Spec |
|---|---|
| Standard | 8 px tall pill, track `rgba(255,255,255,.12)`, fill `--cry-grad-h`, optional soft glow at the fill's end. |
| Slim edge bar | 3 px, on the bottom edge of a plate (home EXP bar). |
| Segmented | Diamonds or pips, filled in the item's colour with a glow (`.qmx-pips`: 9 px rotated squares). For counts up to about 10. |
| Track with nodes | Bar plus reward nodes (quests, Honor, campaign stars). Reached nodes glow; claimed nodes turn crystal with a check. |

Fills animate by `transform: scaleX()` from the left, never by `width` (section 9.6).

### 8.9 Badges and red dots

| Thing | Spec |
|---|---|
| Red dot | 10 px, `radial-gradient(circle at 35% 30%, #ffa293, #ff3b30 58%, #cf1d2b)`, 1.5 px white border, glow `0 0 6px rgba(255,70,60,.65)`. A rotated square (diamond) on pages; round on the home screen. Top right of its owner, overlapping the corner by 3–6 px. |
| Count badge | Pill, min 18 px, solid `#ff5d76`, white Nunito 800 11. Shows `99+` past 99. |
| "New" tag | Crystal pill, `--cry-ink`, 10–11 px. |
| Level / grade / VIP badges | Existing components (`gradeTag`, `vipBadge`, `vipCircle`). Do not restyle. |

**Rule:** a red dot always means "something to collect or do right now". Never use it for "new feature" or decoration.

### 8.10 Tooltips

Shared tooltip (`showTip`, `data-tip`): deep glass, radius 12, padding 8×12, Nunito 600 12.5, max width 260 px, 8 px from its anchor, flips to stay on screen. Appears after 350 ms of hover, at once on keyboard focus, and on tap for touch (a second tap elsewhere closes). Never put information only in a tooltip on a touch-first control; repeat it in a sub line.

### 8.11 Modals

| Size | How | Width | Use |
|---|---|---|---|
| Small | `openModal({small:true})` | ≤ 480 px | Confirmations, single input. |
| Medium | default | 580–820 px (own widths via `data-kind`) | Self-contained tasks: stamina, buy, rename, profile. |
| Wide | `{wide:true}` | Full screen, no box | Menus and browsers. Content capped to the screen, scrolls inside. |

Shared anatomy: blurred see-through backdrop (`.modal-back`), title pill with round badge (`.inv-title` / `.inv-badge`), round close (`.inv-x`), body, actions at the bottom right (primary rightmost). Medium and small windows are deep glass (`.modal.glass-deep`) with mixed corners and small brackets. Esc and a backdrop tap close; focus moves into the window on open and returns to the opener on close.

Do: one primary action per window. Don't: open a window from a window more than one level deep; use a popover or replace the content instead.

### 8.12 Toasts

Slim glass banner, bottom centre, 96 px above the bottom edge (plus safe area): radius 14, padding 11×20, dark gradient fill, 1 px lavender border, an 8 px crystal diamond on the left; Cinzel 14. Error toasts swap the diamond for the danger colour and stay 6 s; ordinary toasts stay 2.6 s and never cover an error. One toast at a time; a new one replaces the old.

Toast text is a short fact in plain words: "Saved as Boss drill", "Pick a deck with 30 cards first."

### 8.13 Empty states

A centred stack inside the panel that would hold the content: a 56 px round glass frame with the feature's icon at 40% opacity, one Item-title line saying what is missing, one Hint line saying how to get it, and one glass button that goes there. Example: "No ready deck" / "A deck needs 30 cards." / [Open decks]. Never a blank panel, never just "None".

---

## 9. Motion system

### 9.1 Motion principles

1. **Motion explains.** Every animation answers one of: where did this come from, what changed, what can I do now. If it answers none, remove it.
2. **Fast in, faster out.** Things arrive with a soft landing and leave quickly. Leaving takes about two thirds of arriving.
3. **Small distances.** Everyday UI moves 4–24 px and scales 0.96–1.03. Big travel is for the summon and match set pieces only.
4. **The player is never waiting on us.** Input works from the first frame. Animations are interruptible: a new state starts from wherever the old animation is.
5. **One loud thing at a time.** Stagger groups so the eye is led; never start two attention-grabbing animations at once.
6. **Loops stay in the background.** Anything that repeats is slow (6 s or more), low contrast, and behind the content.

### 9.2 Duration tokens (proposed)

| Token | ms | Use |
|---|---|---|
| `--mo-instant` | 90 | Press feedback, toggles snapping, tick of a value |
| `--mo-quick` | 150 | Hover, focus ring, small colour changes |
| `--mo-base` | 220 | Selection changes, chips, underline slides, tooltips |
| `--mo-slow` | 360 | Panels and windows entering, crossfades of content |
| `--mo-slower` | 560 | Page-level moves, hero reveals, big number roll-ups |
| `--mo-ambient` | 6000 and up | Loops only |

These bracket what the CSS already does: `.2s` is by far the most used value (209 times), then `.15s`, `.25s`, `.3s`, `.35s`. The tokens round those to five steps.

**Rule:** exits use the next token down (a panel enters at `--mo-slow`, leaves at `--mo-base`).

### 9.3 Easing tokens (proposed; every curve is already in the CSS)

| Token | Curve | Feel | Use |
|---|---|---|---|
| `--mo-standard` | `cubic-bezier(.4, 0, .2, 1)` | Even, businesslike | Things that move from one place on screen to another: underline slides, slider thumbs, layout shifts |
| `--mo-enter` | `cubic-bezier(.2, .8, .2, 1)` (= `--u2-ease`) | Quick start, soft landing | Anything appearing: pages, panels, toasts, tooltips |
| `--mo-exit` | `cubic-bezier(.4, 0, 1, 1)` | Slow start, quick leave | Anything disappearing |
| `--mo-emphasis` | `cubic-bezier(.2, .9, .3, 1)` | Like enter, a touch more snap | Hero moments at page level: stage reveal, plates sliding in |
| `--mo-spring` | `cubic-bezier(.2, 1.4, .4, 1)` | Overshoots about 8% and settles | **Small** things popping in: badges, checks, pips, dots, the VS mark. Only on `transform`, only under 40 px of travel or 1.15× scale. |
| `linear` | — | Mechanical | Loops, sheens, progress that tracks real time, rotations |

**Rule:** never use the spring on large surfaces (panels, pages); an overshooting panel looks like a bug. Never use a spring on opacity or colour.

### 9.4 Page and panel patterns

| Pattern | Properties | Spec | Reduced motion |
|---|---|---|---|
| **Page enter** | opacity, transform | Root: opacity 0 → 1 and `scale(1.012)` → 1, `--mo-slow`, `--mo-enter` (today `u2Screen` .32 s). Then regions in order (9.8). | Opacity only, 150 ms. |
| **Page exit** | opacity | 0 over `--mo-base`, `--mo-exit`. No movement. The screen underneath is already drawn. | Instant. |
| **Panel stagger** | opacity, translateY | Each item: opacity 0 → 1, `translateY(10px)` → 0, `--mo-slow`, `--mo-enter`. Offset **30 ms** per item. **Cap: 8 items / 240 ms total**; items past the eighth share the eighth's delay. | All items fade together, 150 ms. |
| **Content swap** (same panel, new content) | opacity | Old content out 90 ms, new content in `--mo-base` with `translateY(6px)` → 0. Never animate the panel's own box. | Instant swap. |
| **Modal open** | opacity, transform | Backdrop opacity 0 → 1 `--mo-base`. Window: opacity 0 → 1, `translateY(10px) scale(.97)` → none, `--mo-slow`, `--mo-enter` (today `pop`). | Opacity only. |
| **Modal close** | opacity, transform | Window: opacity → 0, `scale(.98)`, `--mo-quick`, `--mo-exit`; backdrop `--mo-base`. | Instant. |
| **Popover / sheet** | transform, opacity | Desktop popover: from its anchor, `scale(.96)` → 1 with transform-origin at the anchor, `--mo-base`. Phone sheet: `translateY(100%)` → 0, `--mo-slow`, `--mo-enter`; drag down to dismiss. | Opacity only. |
| **Toast** | opacity, transform | In: `translateY(12px)` → 0 + opacity, `--mo-slow`, `--mo-enter` (today `u2Toast` .35 s). Out: opacity → 0, `--mo-base`. | Opacity only. |
| **Tooltip** | opacity | In 120 ms after a 350 ms hover delay; out 90 ms. No movement. | Same. |

### 9.5 Selection and feedback patterns

| Pattern | Spec | Reduced motion |
|---|---|---|
| **Hover** | Fill and border colour `--mo-quick`; lift `translateY(-1px)` (cards −2 px) `--mo-quick` `--mo-enter`. Pointer devices only (`@media (hover:hover)`), so phones do not get sticky hover. | Colour only. |
| **Press** | `scale(.96)` in `--mo-instant`; release back in `--mo-quick` with `--mo-spring`. | Colour darkens 6%; no scale. |
| **Underline slide** (tabs) | One underline element; `transform: translateX() scaleX()` to the new tab, `--mo-base`, `--mo-standard`. The tab's lit background crossfades `--mo-quick`. | Underline jumps; background crossfades. |
| **Segment thumb slide** | The crystal thumb moves with `transform`, `--mo-base`, `--mo-standard`; label colours crossfade over the same time. | Thumb jumps. |
| **Card select** | Old card: glow and tint out `--mo-quick`. New card: tint in `--mo-base`; lift `translateY(-2px)` and settle to 0 over `--mo-slow`; glow from 0 to full `--mo-slow`. | Tint only. |
| **Chip re-light** | Deselected chip dims `--mo-quick`; selected chip tint `--mo-base`, its icon pops `scale(1 → 1.18 → 1)` `--mo-slow` `--mo-spring`. | Tint only. |
| **Check / badge pop-in** | `scale(0)` → 1, `--mo-base`, `--mo-spring`. | Opacity. |
| **Error shake** | `translateX`: 0, −6, 5, −4, 2, 0 px over 320 ms, `--mo-standard`, once; border flashes danger for 600 ms. | Border flash only. |
| **Red dot pulse** | Glow ring `scale(1 → 1.8)` and opacity `.6 → 0`, 1.8 s, `--mo-enter`, every **4 s**; the dot itself is still. Only dots in view pulse; at most **3** pulsing dots per view (the rest are still). | No pulse. |

### 9.6 Value patterns

| Pattern | Spec | Reduced motion |
|---|---|---|
| **Number tick-up** | Count from old to new with an ease-out curve. Duration by size of change: under 10 → 220 ms; 10–999 → 360 ms; larger → 560 ms. Never longer. Whole numbers only. Tabular figures. The number gets a brief brightness lift (`filter:brightness(1.3)` → 1) at the end. | Value swaps at once. |
| **Single-step tick** (stepper, slider) | Old digit slides out 6 px and fades (90 ms); new digit slides in from the other side (150 ms). Direction follows the change: up for more, down for less. | Swap at once. |
| **Progress fill** | `transform: scaleX()` from the left edge, `--mo-slower`, `--mo-enter`. When the bar completes: a 300 ms white sheen passes over it once. | Jump to value. |
| **Slider drag** | Thumb follows the pointer with no easing. On grab: thumb 20 → 28 px `--mo-quick` `--mo-spring`; value bubble fades in above the thumb `--mo-quick`. On release: reverse, `--mo-base`. Keyboard steps move the thumb `--mo-instant`. | No size change; bubble appears at once. |
| **Currency gain** | The amount ticks up (above) and its pill's border flashes crystal for 400 ms. | Border flash only. |

### 9.7 Ambient loops and particles

| Loop | Period | Range | Notes |
|---|---|---|---|
| Backdrop glows drifting | 16 s, ease-in-out, alternate | Move 3–6% of the screen; opacity `.5` (`.16–.22` over a picture) | Three glows, start offsets 0, −6, −11 s so they are never in step. |
| Main-button sheen | 3.6 s; sweep takes 55% of it, then rests | A 30%-wide white band at 55% opacity, skewed −20° | Hero-size crystal buttons only. One per view. |
| Selected-item breathing | 4 s ease-in-out alternate | Glow opacity `.25 ↔ .4` | Only the single selected hero element, if any. |
| Crystal ring turning | 12–20 s linear | Full rotation | Level medallions, rune rings. |
| Twinkle | 2.4–4 s per star, random offsets | Opacity `.2 ↔ 1` | Decorative backdrops only. |
| Red dot pulse | every 4 s | see 9.5 | |

**Loop rules**

- At most **4 looping CSS animations visible at once** in the UI layer of a page (backdrop glows count as one group). Match boards and set pieces are exempt.
- Loops pause when the page is covered by a modal, when the tab is hidden, and when the element is off screen.
- A loop is never the only signal of a state. The state must still be clear in a still frame.

**Particles**

| Context | Budget | Rules |
|---|---|---|
| Menu and lobby pages | **0–24** particles, optional | Behind the content, under 40% opacity, no additive blending over text. |
| Lobby previews (mini boards) | **0** by default; up to 12 for a weather hint | Canvas at 1× device pixels. |
| Match board | Existing systems (`ccFx`, skin zones, weather) | Unchanged. |
| Set pieces (pull, victory) | Up to 200, as today | Two plain circles per particle; no canvas `shadowBlur`. |

All canvas loops: one `requestAnimationFrame` loop per canvas; motion scaled by elapsed time (same speed at 60 and 120 Hz); canvas at most 1.5× device pixels; the loop stops itself when its screen closes or the tab hides.

### 9.8 Choreography rules

| Rule | Value |
|---|---|
| Order of a page entry | Backdrop → header → navigation (rail / tabs) → hero → content panels → action bar. The main action arrives **last** so the eye ends on it. |
| Total entry time | The last element starts by **480 ms** and everything is still by **800 ms**. |
| Input during entry | Never blocked. A tap on a still-animating control works. |
| Longest input block anywhere in menus | **0 ms**. Transitions into set pieces (starting a match) may hold input for at most **400 ms** before the loading screen takes over. |
| Simultaneous movers | At most **3 groups** moving at once (a stagger counts as one group). |
| State change in place | Only the things that changed animate. A re-render must not replay entry animations (today several pages rebuild their HTML on every change; see section 11.4). |
| Interruptions | New input cancels and replaces a running animation on the same element. Use CSS transitions (which retarget) for state, keyframes for one-shot entries. |
| Direction | Things enter from where they live: rail from the left, action bar from the bottom, header from the top, opponent from the right, player from the left. |
| Repeat visits | Coming back to a page within the same session uses a short entry: one fade, `--mo-base`, no stagger. |

### 9.9 Performance rules

| Do | Don't |
|---|---|
| Animate `transform` and `opacity`. | Animate `width`, `height`, `top`, `left`, `margin`, `padding`. |
| Animate `filter` only on small, single elements (a number's brightness, one icon). | Animate `filter: blur()` on anything large, or at all on phones. |
| Fake a glow change by fading the opacity of a pseudo-element that holds the shadow. | Animate `box-shadow` on more than 3 elements at once. |
| Keep `backdrop-filter` values fixed. | Animate `backdrop-filter`, or fade in an element that has it from opacity 0 across a large area on phones (fade its content, or use a non-blurred fill during the transition). |
| Add `will-change: transform` only to elements that animate continuously, and remove it when done. | Leave `will-change` on dozens of elements "just in case" (each becomes its own layer and uses memory). |
| Use `contain: layout paint` on panels whose insides re-render. | Rebuild a whole page's HTML for a one-value change when the page has entry animations. |
| Stop canvas loops and pause CSS loops when hidden. | Run any timer or loop for a closed screen. |
| Use `@property` gradients for colour-angle sweeps only on single hero elements. | Run conic-gradient spins on lists. |

Targets: a state change costs under 8 ms of script and layout on a mid-range phone; no animation drops below 50 fps on the 844×390 test profile; the home redraw stays near its measured 4 ms.

### 9.10 Reduced motion

When `prefers-reduced-motion: reduce` is set:

| Normal behaviour | Fallback |
|---|---|
| Page and panel entries with movement | One opacity crossfade, 150 ms, no stagger |
| Slides, lifts, scales, springs | Removed; the end state appears, colour changes still crossfade at 150 ms |
| Number tick-ups | Value swaps at once |
| Progress fills | Jump to value |
| All ambient loops (glows, sheens, breathing, rings, twinkles, dot pulse) | Stopped, shown in their rest pose |
| Parallax and pointer-follow tilts | Off |
| Particles in menus | Off |
| Shake | A 600 ms border colour flash |
| Set pieces needed to understand an outcome (coin flip, pull reveal) | Kept, but in their shortest form with fades instead of travel — as the coin flip already does |

**Rule:** reduced motion never removes information. If an animation is the only thing that tells the player something happened, the fallback must show it another way (a colour flash, a toast, a changed label).

Implementation shape (advisory): one block per stylesheet section, `@media (prefers-reduced-motion: reduce){ … animation:none; transition-duration:.15s; transition-property:opacity,color,background-color,border-color }`, and JS checks `matchMedia('(prefers-reduced-motion: reduce)')` before starting any scripted motion.

---

## 10. Accessibility

| Topic | Rule |
|---|---|
| **Focus ring** | Always visible on keyboard focus (`:focus-visible`), never removed. 2 px solid, 2 px offset. Colour: `#f5afe8` (crystal rose) on glass and dark surfaces; `#fff` on crystal buttons. (Today the global default is mint `--mint`, and newer pages override it to rose; new work uses rose so one colour means "focus" everywhere.) |
| **Tap targets** | At least **44×44 px** hit area on touch layouts, even when the visible shape is smaller (pad with a transparent `::before`). At least 8 px between separate targets. |
| **Contrast** | Text 4.5:1 (3:1 at 24 px and up, and for icons and control borders that carry meaning). Guaranteed by the layer rules in 2.6. |
| **Colour is never alone** | Selection, rarity, status and errors each have a second cue: a mark, a label, a border weight or a position. |
| **Motion** | Section 9.10. Nothing flashes more than three times a second. |
| **Text size on phones** | Nunito body 14 px minimum, hints 12 px, nothing under 11 px. Text can wrap to two lines; it never shrinks to fit. |
| **Truncation** | Names end in "…" and have the full text in `title` / the tooltip. Numbers are never truncated. |
| **Keyboard** | Every control reachable with Tab in visual order; Enter / Space activate; arrow keys move inside radio groups, tabs and sliders; Esc closes the top-most layer only. |
| **Screen readers** | Full-screen pages are `role="dialog"` with `aria-label`. Icon-only buttons have `aria-label`. Toggle-like buttons use `aria-pressed`; one-of-many groups use `role="radiogroup"` / `radio`; tabs use `tablist` / `tab` / `tabpanel`. Decorative SVG is `aria-hidden`. Changing values that matter use `aria-live="polite"`. |
| **Pointer independence** | Nothing is hover-only. Tooltips also open on focus and tap. Drag interactions (sliders, map) have button or keyboard equivalents. |
| **Sideways phones** | Nothing requires vertical scrolling inside a region smaller than 120 px tall. |

---

## 11. Naming and implementation notes (advisory)

### 11.1 Token naming scheme

Keep every existing token. Add new families with the same short-prefix style:

| Prefix | Family | Examples | Status |
|---|---|---|---|
| `--cry-*` | Crystal palette | `--cry-grad`, `--cry-ink` | exists |
| `--gl*` | Glass | `--gl`, `--gl-rim`, `--gl-hi` | exists, per page |
| `--h-*` | Home screen | `--h-ink`, `--h-glass` | exists, `.menu` scope |
| `--u2-*` | UI refresh | `--u2-ease`, `--u2-ring`, `--u2-hair` | exists |
| `--r3…--r6`, `--ur`, `--mr` | Rarity | | exists |
| `--tx-1…--tx-4` | Text levels | primary, secondary, tertiary, disabled | proposed |
| `--st-*` | Status | `--st-ok`, `--st-info`, `--st-warn`, `--st-bad` (+ `-bg`) | proposed |
| `--sp-1…--sp-11` | Spacing | section 4.1 | proposed |
| `--rd-*` | Radius sets | `--rd-sm`, `--rd-md`, `--rd-lg`, `--rd-pill` | proposed |
| `--el-1…--el-3` | Elevation shadows | section 6.3 | proposed |
| `--mo-*` | Motion | `--mo-quick`, `--mo-base`, `--mo-enter`, `--mo-spring` | proposed |
| `--fc` | Focus ring colour | `#f5afe8` | proposed |
| `--mc`, `--dc`, `--ec` | Per-item accent (mode, difficulty, event) | set inline per element | exists as a convention |

Class prefixes stay per feature (`.rdx-`, `.ftx-`, `.qmx-`, `.cmp-`). State classes stay short and shared: `.on` (selected), `.off`, `.locked`, `.empty`, `.full`.

### 11.2 Consolidating tokens without changing looks

A future pass, in this order, each step shippable alone:

1. **Add a tokens file** (`src/styles/tokens.css`, imported first) that only **declares** the proposed tokens on `:root`. Nothing uses them yet, so nothing changes.
2. **Alias, don't replace.** Point the motion tokens at what exists (`--mo-enter: var(--u2-ease)`), and leave `--u2-ease` working.
3. **Move the scattered `:root` blocks** (main.css line 3, the `--cry-*` line near 2791, ui2.css line 8) into the tokens file unchanged.
4. **Unify `--gl` per page only where the values already match.** Where a page's glass differs on purpose (the Great Tree's bluer rim), keep its override and add a comment saying why.
5. **Adopt tokens page by page, only when a page is being remade anyway.** Verify with a pixel diff before / after, as was done for the character screen.
6. **Never touch `.cs` rules.** The tokens file must not redefine anything `.cs` reads to a different value.

### 11.3 Where new CSS goes

- A remade page gets its own section at the end of the stylesheet that owns it (`main.css` for lobby pages, `clash.css` for match UI), with a header comment naming the JS file and render function — the current convention.
- Rules that could reach the character screen are scoped `:not(.cs *)`.
- Each section ends with its own breakpoints in this order: short desktop, medium, portrait, narrow portrait, sideways, reduced motion.

### 11.4 A note on re-rendering and motion

Many pages rebuild their whole HTML on every change (`innerHTML = …`). That is simple and has been fast enough, but it fights motion: sliders cannot glide, underlines cannot slide, and entry animations replay. For any page that adopts section 9's in-place patterns:

- Render the page shell once; on a change, update only the parts whose data changed (text, classes, CSS variables).
- Drive visuals from CSS variables on the root where possible (`--hp-me: 20`), so a transition does the animating.
- Keep entry animations on a class that is added once on open and removed after it finishes.

This is the main implementation cost of the motion system, and it is paid page by page.

### 11.5 Review checklist for any new or remade page

- [ ] One crystal button per view; no gold on actions.
- [ ] Mixed corners (or uniform, if on home); brackets on at most three surfaces.
- [ ] White-picture test passes: all text readable.
- [ ] Blur budget met (8 desktop / 4 phone); no nested blur.
- [ ] All 12 standard sizes: nothing off screen, nothing overlapping, action bar pinned.
- [ ] Every touch target 44 px; focus ring visible on every control; Esc behaves.
- [ ] Entry finishes by 800 ms; input never blocked; changes animate in place.
- [ ] Reduced motion: no loops, crossfades only, no information lost.
- [ ] Works offline; `npm run smoke` passes.
- [ ] The character screen is pixel-identical.
