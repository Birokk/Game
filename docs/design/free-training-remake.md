# Free Training — Remake Plan

A full design plan for remaking the Free Training page (the Card Battle practice lobby). It is a plan only: no UI code is changed by this document.

- Companion document: [`style-guide.md`](./style-guide.md). Tokens named here (`--mo-*`, `--rd-*`, `--sp-*`, glass levels, component names) are defined there.
- Current code: `src/game/63-training.js` (`renderTraining`), styles `.ftx-*` in `src/styles/main.css` (from line ~5725), on the Raids layout `.rdx-*`.
- Working name for the new layout: **the Sparring Ring**.

---

## 1. The current page, and an honest critique

### 1.1 What it is today

A glass page on the Raids layout: a rail of presets on the left (My preset, then 7 presets, then a "Custom" entry when you change something), and on the right one long scrolling column — a hero block ("Training Ground", description, summary chips), an Opponent panel (5 brain cards), then four panels in a two-column grid (Decks, Heroes, Match rules, Opponent's look) — and a pinned bar with "your deck VS opponent", a "Free practice" note and the crystal **Start** button.

Every change calls `ftSet`, which saves and then rebuilds the entire page's HTML.

### 1.2 Measurements (taken from the live page with Playwright)

| Size | Visible height of the settings column | Full height of its content | How much is on screen |
|---|---|---|---|
| 1600×900 | 686 px | 987 px | 70% — Match rules and Opponent's look are cut off at the fold |
| 1024×768 | 479 px | 1,421 px | 34% |
| 390×844 | 529 px | 1,931 px | 27% — about 3.6 screens of scrolling |
| 844×390 | 253 px | 795 px | 32% |

Other numbers: 52 interactive controls on the page (48 tab stops); **36–38 of them are smaller than 40 px** in one direction (steppers 30 px, segments about 28 px tall, event chips about 30 px, selects 36 px); **13 elements use `backdrop-filter`**; the action bar is 147 px tall on a portrait phone and 173 px at 1024×768.

### 1.3 What works (keep)

| Keep | Why |
|---|---|
| The presets and their names (Punching bag, Combo lab, Last stand, Blitz drill, Event practice, Boss rehearsal) | They are the fastest way in and each teaches what the page can do. |
| "My preset" as the first entry | The owner's ask; one tap back to your own setup. |
| The five brains with diamond pips and their colours | Clear ladder from Dummy to Expert, matches Quick Match. |
| One pinned crystal Start button, "Free" stated plainly | Correct hierarchy; nobody wonders what it costs. |
| The glass look, teal mode colour, blurred wallpaper | Consistent with the rest of the Battle pages. |
| The data model (`S.cc.ft`, `S.cc.ftMine`, `ftState` repair, `ftSetup`) | Solid, tested, deterministic. The remake does not need to change it. |
| The fixed seed and the seed shown at the end of a match | A real practice tool; just hard to discover today. |

### 1.4 What does not work

| # | Problem | Evidence |
|---|---|---|
| 1 | **The page is a form, not a matchup.** The thing the player is building — "me versus that" — only appears as two small text boxes in the bottom bar. The largest thing on screen is the words "Training Ground", which carry no information. | Screenshot at 1600×900: the hero block takes about 200 px; the matchup takes 70 px. |
| 2 | **Too much below the fold.** On desktop two of five panels are cut. On phones the first screen shows only the brain cards; decks, heroes, rules and look are 1–3 screens down. | Table in 1.2. |
| 3 | **All settings have equal weight.** "Card back" (cosmetic) looks as important as "Hero HP". There is no order telling a new player what to set first. | Four equal panels in a grid. |
| 4 | **No live feedback while adjusting.** Dragging the HP slider updates only the small number beside it; the summary chips and the bar update when you let go. Extra AP is just "+4" — nothing shows what 8 AP looks like. A battle event is a lit chip; nothing shows how it will feel. | `r.oninput` only writes the readout; `r.onchange` re-renders. |
| 5 | **Every change rebuilds the page.** Nothing can animate between states, and **keyboard focus is lost after a change**: pressing an arrow key on the HP slider moves it one step and then focus drops to the page body, so the slider cannot be driven by keyboard. | Verified: after one ArrowRight on the slider, `document.activeElement` is `BODY`. Cause: `renderTraining` replaces `innerHTML`. |
| 6 | **Small touch targets.** Most controls are under the 44 px minimum; the steppers and segments sit close together. | 36–38 of 52 controls under 40 px. |
| 7 | **Native controls break the look.** The HP slider is a browser slider tinted with `accent-color`; decks, board skin and card back are native selects. Skins and backs are visual things chosen from a list of words. | `.ftx-rng input`, `.ftx-sel`. |
| 8 | **"Custom" is confusing.** Changing one value deselects the preset and adds a separate "Custom · Not saved" entry at the bottom of the rail (off screen on phones, where the rail is a horizontal strip). The player cannot see what they changed or get back. | `f.preset = 'custom'` in `ftSet`; the rail's `.ftx-cus` entry. |
| 9 | **The seed is hidden and unexplained.** It is two rows deep in Match rules ("Shuffle → Fixed seed → Seed"), shown as a raw 10-digit number. | `row('Shuffle' …)`, `row('Seed' …)`. |
| 10 | **Sideways phones lose half the matchup.** The bar shows only the opponent's side; the first screen shows brain names with no descriptions and about 60 px of the next panels. | Screenshot at 844×390. |
| 11 | **Screen-reader labels are raw keys.** The selects are labelled "me", "foe", "skin", "back". | `aria-label="${k}"` in the `sel` helper. |
| 12 | **The disabled Start button explains nothing.** With no ready deck, Start is greyed out and the only hint is "No ready deck" in small text in the bar. | `${valid ? '' : 'disabled'}`. |
| 13 | **Redundant summary.** The chips in the hero repeat the bar, which repeats the panels. Three places say "20 vs 20 HP". | `ftChips(f)` in the hero and the same facts in `.rdx-bar`. |

---

## 2. Goals

### 2.1 Who it is for

| Player | What they come to do | What they need first |
|---|---|---|
| **The combo tester** | Try a line of play with extra AP and cards against something that does not fight back | A one-tap drill; AP and hand controls; fast restart |
| **The deck tuner** | Play the same deck against several opponent decks and brains | Deck pickers front and centre; "Play again" keeping the setup |
| **The boss rehearser** | Practise a hard fight (Great Tree guardian, guild boss style) without spending tries | Boss preset; HP and who-goes-first; round limit |
| **The learner** | Understand an event or a rule safely | Event picker that shows what the event does |
| **The replayer** | Repeat the exact same draw to compare two lines | A visible, friendly "same shuffle" switch |

### 2.2 Goals of the remake

1. **Show the matchup, not a form.** The centre of the page is "You vs Opponent" as a small picture of the match that reacts to every setting.
2. **Start in one or two taps.** Open → Start works. Open → pick a drill → Start works.
3. **Nothing important below the fold.** At every standard size the matchup, the group tabs and Start are visible without scrolling. Only the open settings group may scroll.
4. **Every change is felt at once**, in place, without a page rebuild.
5. **Phone-first controls.** 44 px targets, no native slider look, pictures for visual choices.
6. **"Custom" is a state of a preset**, not a separate place.
7. **No data migration.** `S.cc.ft` and `S.cc.ftMine` keep loading as they are.

### 2.3 Success criteria

| Criterion | Target |
|---|---|
| Taps from open to a running Combo lab match | 2 (drill, Start) |
| Scroll needed to reach any setting, portrait phone | At most 1 screen inside one group (today 3.6 screens overall) |
| Start button and both sides of the matchup visible | At all 12 standard sizes, without scrolling |
| Touch targets under 44 px | 0 on phone layouts |
| Elements with `backdrop-filter` | 6 or fewer on desktop, 4 or fewer on phones (today 13) |
| Keyboard | Every setting adjustable without losing focus |
| Entry animation | Still by 800 ms; input never blocked |
| Reduced motion | No loops, crossfades only, nothing lost |

---

## 3. Information architecture

### 3.1 What the player needs, in order

| Order | Question | Where it lives |
|---|---|---|
| 1 | "What kind of practice?" | **Drills** (presets) — the rail |
| 2 | "Me against what?" | **The Ring** — the matchup preview: both sides, decks, HP, AP, hand, who goes first, event |
| 3 | "Change something" | **Setup** — four groups in tabs |
| 4 | "Go" | **Start bar** — pinned |

### 3.2 The four setup groups

One group is open at a time. Tabs are in order of how often they are used.

| Tab | Icon | Holds | Why grouped |
|---|---|---|---|
| **Opponent** | `target` | Brain (Dummy → Expert); opponent's deck | "Who am I fighting and how well does it play" — the most changed settings. |
| **Heroes** | `heart` | For each side: hero HP, extra AP, extra opening cards | All numbers, all per side, all shown on the Ring. |
| **Rules** | `swords` | Who goes first; battle event; round limit and what happens at the limit; shuffle (new / same) and seed | How the match itself behaves. |
| **Look** | `sparkle` | Opponent's character; its board skin; its card back | Cosmetic only. Last, and labelled "Only for show". |

**Your deck** is not in a tab. It is chosen on your own plate in the Ring, because it is the one setting that belongs to you rather than to the practice setup (and presets already leave it alone).

### 3.3 Progressive disclosure — the decision

**No separate "simple / advanced" switch.** A mode switch is one more thing to understand, and half the players would never find the advanced half. Instead:

- The **default view is already the simple mode**: drills on the left, the Ring in the middle, the Opponent tab open. A new player sees presets, a picture and five difficulty cards.
- The other three tabs **are** the advanced settings. They are one tap away and always visible as tabs.
- A tab whose settings differ from a standard match carries a small teal dot, so hidden settings are never a surprise.
- The Start bar lists **what is different from a standard match** as chips ("+4 AP", "Dummy", "60 HP"), so the whole setup can be read without opening any tab.

### 3.4 Drills, My preset and the "Edited" state

| Concept | Behaviour |
|---|---|
| **Drill** (preset) | Tapping a drill applies it (as `ftApply` does today: it keeps your deck, the look and the shuffle choice). The drill card becomes selected. |
| **Edited** | Changing any setting by hand keeps the drill card selected but changes its marker from "selected" to "**edited**": a dashed crystal border and a small "Edited" tag. The Ring's title line reads "Combo lab · edited". Tapping the same drill again restores it (with a 4 s "Undo" toast so nothing is lost by accident). |
| **My preset** | First card in the rail, with a star. Empty: dashed card "Save your setup". Saved: its name and a one-line summary; tap loads it. While the current setup differs from it, a **Save** button appears on the card (crystal-rose text, not a crystal fill) — "Update" when My preset is the base, "Save here" otherwise. |
| **No more "Custom" rail entry** | The separate "Your setup → Custom" block is removed. "Edited" replaces it. |

Data note: this needs one small new field, `base` (the id of the drill the setup started from; `'standard'` when missing). `preset: 'custom'` keeps its current meaning ("edited by hand"), so old saves and `ftSaveMine` work unchanged. See section 9.

### 3.5 How the seed shows up

The word "seed" stays out of the main path; the idea is "**shuffle**".

| Place | What the player sees |
|---|---|
| Rules tab → Shuffle | A two-segment control: **New each match** / **Same each match**. |
| When "Same each match" is on | A **shuffle code** row: the number in groups of three digits (`2 814 003 117`) in an editable field, a **dice** button (new random code), a **copy** button, and — when the last match used a different code — a **Use last match** button. |
| On the Ring | A small padlock-on-a-deck chip on the battle line: "Same shuffle". Tapping it opens the Rules tab at Shuffle. Absent when shuffles are new. |
| End of a training match | The existing line "Seed N" becomes a button: **Replay this shuffle** — turns on "Same each match" with that match's code and starts again. (Plain "Play again" keeps today's behaviour.) |
| Drill cards and Start bar | A "Same shuffle" chip among the difference chips. |

---

## 4. Layout per breakpoint

Shared rules for every size:

- **Pinned:** header, the Ring, the setup tabs, the Start bar. **Scrolls:** only the open tab's content (and the drill rail if it is taller than its space).
- Page padding and safe areas as `.rdx` today (22 px desktop, 12 px portrait, 14 px / 6 px sideways).
- Gaps: 20 px between columns on desktop, 16 px medium, 8 px on phones.

### 4.1 Desktop — 1600×900 (three columns, from 1241 px wide)

Usable area 1556×868. Rail 264, setup 420, Ring takes the rest (832).

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ (◎) Free Training   (i) (book)                          [✓ Free · no stamina, no rewards] [↻] (X)│ 56
├──────────────┬───────────────────────────────────────────────────┬─────────────────────────────┤
│ DRILLS  264  │ THE RING                                     832  │ SETUP                   420 │
│              │ ◎ CARD BATTLE · PRACTICE                          │ ┌─────────────────────────┐ │
│ ★ MY PRESET  │ Combo lab · edited              [Revert] [Save]   │ │Opponent│Heroes│Rules│Look│ │ 48
│ ┌──────────┐ │ ┌───────────────────────────────────────────────┐ │ └───▔▔▔▔─────────────────┘ │
│ │★ Boss run│ │ │(face) Training Dummy   ◇◇◇◇   ♥40  ◆◆◆◆  ▮▮▮▮▮│ │                             │
│ └──────────┘ │ │       Dummy · Mirror deck                      │ │  HOW IT PLAYS               │
│              │ ├───────────────────────────────────────────────┤ │  ┌───────────────────────┐  │
│ ✦ DRILLS     │ │        opponent's half of the board           │ │  │ ◇◇◇◇ Dummy            │  │
│ ┌──────────┐ │ │        (its board skin, 3 lanes)              │ │  │ Never acts …          │  │
│ │⚔ Standard│ │ ├──[event]────────( coin )────────[R12][lock]───┤ │  ├───────────────────────┤  │
│ ├──────────┤ │ │        your half of the board                 │ │  │ ◆◇◇◇ Easy             │  │
│ │◎ Punching│ │ │        (your board skin)                      │ │  ├───────────────────────┤  │
│ ├──────────┤ │ ├───────────────────────────────────────────────┤ │  │ ◆◆◇◇ Normal           │  │
│ │⚡ Combo ⋯│ │ │(face) Balanced Deck  [Change]                  │ │  ├───────────────────────┤  │
│ ├──────────┤ │ │       Leader Aria      ♥20  ◆◆◆◆◆◆◆◆  ▮▮▮▮▮▮▮▮│ │  │ ◆◆◆◇ Hard             │  │
│ │🛡 Last   │ │ └───────────────────────────────────────────────┘ │  ├───────────────────────┤  │
│ ├──────────┤ │                                                   │  │ ◆◆◆◆ Expert           │  │
│ │◷ Blitz   │ ├───────────────────────────────────────────────────┴──┴───────────────────────┴──┤
│ ├──────────┤ │ START BAR                                                                       │
│ │✧ Event   │ │ Different from a standard match:  [Dummy] [40 HP] [+4 AP] [+3 cards] [You first] │ 84
│ ├──────────┤ │                                                        ╔═══════════════════════╗│
│ │♛ Boss    │ │                                                        ║ (◎)  START            ║│
│ └──────────┘ │                                                        ║      Free training    ║│
│              │                                                        ╚═══════════════════════╝│
└──────────────┴─────────────────────────────────────────────────────────────────────────────────┘
```

| Region | Size at 1600×900 | Notes |
|---|---|---|
| Header | 1556 × 56 | As today, minus nothing. |
| Drill rail | 264 × 796 | Scrolls if needed (it does not at this size: 9 cards × 60 + headers = about 640). |
| Ring | 832 × 698 | Title block 72; opponent strip 72; opponent half 150; battle line 44; your half 150; your strip 72; inner gaps and padding make up the rest. The preview is centred and capped at 960 px wide. |
| Setup | 420 × 698 | Tabs 48, then the open group. Opponent, Rules and Look fit without scrolling; Heroes fits. |
| Start bar | 1272 × 84 | Spans Ring + Setup. Difference chips left (max 2 rows), Start right (260 × 64). |

**1920×1080:** same three columns. Rail 280, setup 440, Ring 1,116 wide with the preview capped at 960 and centred; board halves grow to 190 px; the Ring's title uses the larger end of its clamp. Nothing else changes.

**Short desktop (height 501–800, e.g. 1366×768, 1280×720):** the Ring's title block drops the kicker and becomes one line (40 px); strips 60 px; halves 112 px; battle line 36 px; Start bar 72 px. At 1280×720 the Ring is 512 px wide: the hand-cards readout on each strip becomes a count ("▮ 8") instead of a fan.

### 4.2 Medium — 821 to 1240 wide (e.g. 1024×768)

Three columns do not fit, so the **rail becomes a strip** under the header (as the Raids layout already does on portrait), and the body is two columns.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ (◎) Free Training  (i)(book)                     [✓ Free]   [↻]   (X)    │ 56
├──────────────────────────────────────────────────────────────────────────┤
│ [★ Boss run] [⚔ Standard] [◎ Punching bag] [⚡ Combo lab ⋯] [🛡 Last st→ │ 60  scrolls sideways
├───────────────────────────────────────┬──────────────────────────────────┤
│ THE RING                          584 │ SETUP                        380 │
│ Combo lab · edited   [Revert][Save]   │ [Opponent][Heroes][Rules][Look]  │ 44
│ ┌───────────────────────────────────┐ │                                  │
│ │(f) Training Dummy ◇◇◇◇ ♥40 ◆4 ▮5  │ │   open group                     │
│ ├───────────────────────────────────┤ │   (scrolls inside if needed)     │
│ │   opponent half            110    │ │                                  │
│ ├─[ev]───────( coin )───────[lock]──┤ │                                  │
│ │   your half                110    │ │                                  │
│ ├───────────────────────────────────┤ │                                  │
│ │(f) Balanced Deck [Change] ♥20 ◆8 ▮8│ │                                  │
│ └───────────────────────────────────┘ │                                  │
├───────────────────────────────────────┴──────────────────────────────────┤
│ [Dummy] [40 HP] [+4 AP] [+3 cards] +1                 ╔═ (◎) START ═════╗│ 76
└──────────────────────────────────────────────────────────────────────────┘
```

| Region | Size at 1024×768 | Notes |
|---|---|---|
| Drill strip | 980 × 60 | Cards 200 px wide with title + one-line summary; the selected one scrolls into view. |
| Ring | 584 × 508 | Title one line (40); strips 60; halves 110; line 36. AP shown as crystals up to 6, then "◆ 8". |
| Setup | 380 × 508 | Heroes tab scrolls a little (about 60 px). |
| Start bar | 980 × 76 | One row: chips (one line, "+n" for the rest) and Start 220 × 56. |

### 4.3 Portrait phone — 390×844

One column. The board picture is replaced by the **Ring card**: the two sides next to each other with the coin between them, and a thin "board ribbon" under them that carries the skin colours, the event tint and the event name. This keeps the live feedback at a fraction of the cost and height.

```
┌────────────────────────────────────┐
│ (◎) Free Training  (i)    [↻] (X)  │ 48
├────────────────────────────────────┤
│ [★ Mine] [⚔ Standard] [◎ Punch… →  │ 52  drill strip, scrolls sideways
├────────────────────────────────────┤
│ Combo lab · edited        [Revert] │ 28
│ ┌──────────────┐    ┌─────────────┐│
│ │(f) You       │(coin)│(f) Dummy  ││
│ │Balanced Deck │    │Mirror deck  ││ 104  THE RING CARD
│ │♥20 ◆8 ▮8     │    │♥40 ◆4 ▮5    ││
│ │[Change deck] │    │◇◇◇◇ Dummy   ││
│ └──────────────┘    └─────────────┘│
│ ▓▓▓▓ your skin ▓│ Blood Moon │▓ foe│ 24  board ribbon
├────────────────────────────────────┤
│ [Opponent][Heroes][ Rules ][ Look ]│ 44  pinned
├────────────────────────────────────┤
│                                    │
│   open group                       │ ≈ 400  the only scrolling area
│   (full-width controls,            │
│    44 px rows)                     │
│                                    │
├────────────────────────────────────┤
│ Dummy · 40 HP · +4 AP · +3 cards   │ 20
│ ╔════════ (◎)  START ═════════════╗│ 56  pinned
└────────────────────────────────────┘
```

| Region | Height | Notes |
|---|---|---|
| Header | 48 | "Free" chip hidden (the Start button says "Free training"); How-to-play moves into the (i) window as a link. |
| Drill strip | 52 | Icon + name only; My preset first. "Edited" shows as a dot on the selected chip. |
| Ring card | 156 (28 + 104 + 24) | Two plates 44% wide each; coin 44 px between. |
| Tabs | 44 | Four equal segments, icons + labels; labels only under 380 px wide. |
| Open group | 844 − 24 − 48 − 52 − 156 − 44 − 84 − (6 gaps × 8) = **about 388** | Each group is designed to be at most about 620 px tall here, so at most one short scroll. |
| Start bar | 84 | One summary line (truncates with "…"), Start full width 56 px. |

**360×740:** same layout; the open group gets about 284 px. Plates drop the "Change deck" label to an icon button; the summary line in the Start bar is hidden (bar 64 px) to give the group about 304 px.

**Short portrait (under 700 tall, e.g. 375×667):** the Ring card collapses to **one line per side** (72 px total: face, name, ♥ ◆ ▮ values in a row; coin 32 px between the two lines' ends), the drill strip is 44 px, the Start bar 64 px. Open group about 280 px.

### 4.4 Sideways phone — 844×390

Two columns. The left column is the matchup and Start; the right column is the settings. Drills move into a **Drill button** that opens a sheet, because a third column or a strip would leave no room.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ (◎) Free Training (i)                                  [✓ Free]   [↻]   (X)     │ 40
├──────────────────────────────┬──────────────────────────────────────────────────┤
│ [⚡ Combo lab · edited    ▾] │ [ Opponent ][ Heroes ][ Rules ][ Look ]          │ 36
│ ┌──────────────────────────┐ ├──────────────────────────────────────────────────┤
│ │(f) Dummy   ♥40 ◆4 ▮5     │ │                                                  │
│ │    Mirror deck  ◇◇◇◇     │ │   open group                                     │
│ ├─▓▓▓ Blood Moon (coin) ▓▓─┤ │   two columns of controls where they fit         │ ≈ 278
│ │(f) You     ♥20 ◆8 ▮8     │ │   (scrolls)                                      │
│ │    Balanced Deck  [⇄]    │ │                                                  │
│ └──────────────────────────┘ │                                                  │
│ ╔══════ (◎) START ══════════╗│                                                  │
└──────────────────────────────┴──────────────────────────────────────────────────┘
   300                              502
```

| Region | Size at 844×390 | Notes |
|---|---|---|
| Header | 816 × 40 | |
| Left column | 300 × 322 | Drill button 40; Ring card 64 + 24 + 64 = 152 (opponent on top, you below, like the real board); spare space; Start 52 pinned to the bottom. |
| Right column | 502 × 322 | Tabs 36; group about 278, scrolls. Heroes shows You and Opponent as two columns; Rules puts First / Limit side by side. |
| Drill sheet | slides up over the left column, full height | The drill list as 44 px rows; closes on pick. |

**667×375:** left column 250, right 389; header 38; the Ring card's values become icon + number only; tab labels shorten to icons with an accessible name. Start 48 px.

### 4.5 What collapses, in one table

| Element | Desktop | Medium | Portrait | Short portrait | Sideways |
|---|---|---|---|---|---|
| Drills | rail, cards with summary | strip, cards with summary | strip, name only | strip, 44 px | button + sheet |
| Ring title block | kicker + title + actions | title + actions | title + Revert | title only | inside drill button |
| Board picture | two halves with skins | two halves, smaller | ribbon | ribbon | ribbon |
| Side strips / plates | full strips | full strips, counts | two plates | two one-liners | two one-liners |
| Setup | panel 420 | panel 380 | full width | full width | right column |
| Difference chips | up to 2 rows | 1 row, "+n" | 1 text line | hidden | hidden |
| "Free" header chip | full | short | hidden | hidden | short |

---

## 5. Component specs

Tokens are from the style guide. "Nested glass" = `rgba(255,255,255,.05)` fill, 1 px `rgba(255,255,255,.14)` border, no blur.

### 5.1 Header

| Part | Spec | Copy |
|---|---|---|
| Title pill | Existing `.inv-title` + `.inv-badge` with `icon('target')` | "Free Training" |
| Info | Existing `infoBtn('training')`; 44 px hit area | tooltip "How Free Training works" |
| How to play | Existing book button → `ccRules(0)`; hidden on portrait (linked from the info window instead) | tooltip "How to play" |
| Free chip | Clear-small glass, `--rd-sm`, check icon in teal `#9ff5d6` | "Free" + "No stamina · no rewards" |
| Reset | Glass secondary, `icon('refresh')`; icon-only on phones. Shows a 4 s Undo toast. | "Reset" · toast "Back to a standard match · Undo" |
| Close | Existing `.inv-x` | aria-label "Close" |

### 5.2 Drill card (rail)

| Property | Spec |
|---|---|
| Anatomy | 40 px round icon frame (icon in the drill's colour `--mc`) · title (Item title, 16 px) · summary (Hint, 12 px, one line, "…") · optional status tag on the right |
| Size | 60 px tall, full rail width, `--rd-md`; strip version 200 × 48 (medium) or auto × 40 (portrait) |
| Default | Nested glass |
| Hover | Fill `.08`, border `.24`, lift 1 px |
| Selected | Crystal tint, border `rgba(251,230,255,.6)`, glow, icon frame crystal (today's `.rdx-it.on`) |
| **Edited** | Same tint at half strength, border **dashed** `rgba(251,230,255,.6)`, tag "Edited" (status tag, info colour), icon frame keeps the drill colour |
| Focus | 2 px `#f5afe8` ring |
| Role | `radio` inside a `radiogroup` labelled "Drills" |

Summaries (kept from today, trimmed to fit): "Normal rules, average opponent" · "A 60 HP Dummy that never fights back" · "+4 AP and 3 more cards vs a Dummy" · "You on 10 HP vs an Expert who goes first" · "12 HP each, ends after round 12" · "A random battle event every match" · "The Sky Sovereign's deck on Expert, 30 HP".

### 5.3 My preset card and save dialog

| State | Look | Copy |
|---|---|---|
| Empty | Dashed rose border, plus icon | "Save your setup" / "Keep these settings as your own drill" |
| Saved, in use, unchanged | Selected look, star icon | name / "Hard · 20 vs 30 HP · Blood Moon" |
| Saved, current setup differs | Default or edited look + a **Save** button on the right (44 × full height, rose text, left hairline) | button tooltip "Save the current setup here"; label "Update" when My preset is the base |

Save dialog: the existing small glass window (`ftSaveMine`, kind `ftsave`) is kept. Changes: the setup is shown as the same difference chips as the Start bar; the name field has a visible character counter ("12 / 20"); Enter saves; the primary button is the only crystal thing. Copy: title "Save my preset" / "Update my preset"; body "Keep the setup you have now as your own drill, first in the list." / "This replaces **{name}** with the setup you have now."; buttons "Cancel", "Save" / "Update".

### 5.4 The Ring — title block

| Part | Spec | Copy |
|---|---|---|
| Kicker | Kicker pill, target icon in teal; desktop only | "Card Battle · Practice" |
| Title | Section-title size on medium and below; on desktop `clamp(28px, 2.6vw, 44px)` italic Cinzel with a teal glow (`0 0 26px rgba(120,240,210,.5)`). This replaces the 70 px "Training Ground": the title now **names the setup**, so it earns its space. | drill name, e.g. "Combo lab"; edited → "Combo lab · edited"; My preset → its name |
| Revert | Ghost button, shown only when edited | "Revert" |
| Save | Glass secondary with star, shown only when edited | "Save as my preset" (desktop) / "Save" |

### 5.5 The Ring — side strips (desktop / medium) and plates (phones)

Each side shows the same five things in the same order, so the eye can compare top against bottom.

| Slot | Opponent | You | Spec |
|---|---|---|---|
| Face | Chosen character's round thumb (`baseThumb`), or the target icon for the Dummy, or "?" for a random character | Your deck leader's thumb (`ccLeaderOf`), else the cards icon | 48 px circle (40 medium, 36 phones); ring in the side's colour: opponent = the brain's colour `--dc`, you = crystal lavender |
| Name | Character name / "Training Dummy" / "Random character" | Deck name | Item title; "…" when long |
| Sub line | brain pips + brain name · deck name | "Leader {name}" + **Change** | Hint; Change is a glass secondary button (icon-only on small sizes) that opens the deck picker |
| HP gem | number in a faceted gem | same | Gem 44 px (36 phones), crimson for the opponent, crystal for you; Number-large inside (tabular). The number is the live HP setting. |
| AP crystals | base crystals + bonus crystals | same | Diamonds 12 px with 4 px gaps: the 4 base ones (5 under Rainstorm) solid, bonus ones glowing brighter with a thin ring. Blue for you, crimson for the opponent — the match's own colours. Past 8 visible, or on small sizes: "◆ 8". |
| Hand | base cards + bonus cards | same | A fan of mini card backs 14 × 20 px overlapping by half; the opponent's use its chosen card back (`ccBackHTML`), yours use your equipped back; bonus cards are lifted 3 px. On small sizes: "▮ 8". |

Interaction: the whole opponent strip is a button → opens the **Opponent** tab. The HP gem on either side is a button → opens **Heroes** with that side's HP slider focused. Your strip's Change opens the deck picker. Each has a tooltip and an `aria-label` ("Opponent: Training Dummy, Dummy brain, mirror deck, 40 HP, 4 AP a turn, 5 cards. Change opponent.").

States: when there is **no ready deck**, your strip shows the empty state — dashed rose border, cards icon, "No ready deck" / "A deck needs 30 cards." and the button reads **Build a deck** (opens the Deck screen).

### 5.6 The Ring — board picture and battle line

Covered in section 6. Sizes: halves 150 px tall on desktop (190 at 1080p, 110–112 medium / short), battle line 44 px (36).

### 5.7 Setup tabs

Page-tabs pattern from the style guide: a glass strip, four tabs, icon + label, selected = lit glass + **crystal underline that slides**. 48 px tall (44 phones, 36 sideways). A 6 px teal dot after the label marks a tab that holds non-standard settings. `role="tablist"`; arrow keys move between tabs.

Labels: "Opponent", "Heroes", "Rules", "Look".

### 5.8 Opponent tab

**How it plays** (brain selector) — option cards in one column on desktop (5 × 64 px), a 2-column grid on portrait (last card full width), one row of five compact cards on sideways.

| Part | Spec |
|---|---|
| Card | Option card, `--rd-md`, `--dc` = the brain's colour (kept from `FT_BRAINS`: Dummy `#8ff5d2`, Easy `#9ff5c6`, Normal `#94b8ff`, Hard `#ffb3dd`, Expert `#ff8a8a`) |
| Header row | 4 diamond pips (`.qmx-pips`) + name (Item title) |
| Description | Hint, 2 lines max; hidden on sideways |
| Selected | 24% tint of `--dc`, border, glow, plus a small check at the right end (second cue besides colour) |
| Role | `radiogroup` "How the opponent plays" |

Descriptions (shortened): Dummy "Never acts. Try combos in peace." · Easy "Makes mistakes, sometimes ends early." · Normal "An average player." · Hard "Plans its whole turn." · Expert "The toughest. Plans like auto play."

**Opponent's deck** — a picker row, not a native select.

| Part | Spec |
|---|---|
| Closed row | 52 px, nested glass, `--rd-sm`: cards icon · deck name · group as Hint ("Starter deck", "Campaign deck", "The Great Tree", "Your deck", "A copy of your deck") · chevron |
| Open | Desktop: glass popover anchored to the row, 360 px wide, max 420 px tall. Phones: bottom sheet. Group headers in Kicker type (Mirror · Starter decks · Campaign decks · The Great Tree · Your decks, from `ftFoeList()`); rows 44 px with a playstyle bar; the current one has a crystal check. |
| Copy | label "Opponent's deck"; mirror option "Mirror · a copy of your deck" |

### 5.9 Heroes tab

A two-column table: **You** | **Opponent** (column headers in Kicker type with each side's face at 24 px). Three rows. On portrait the two columns stay side by side for AP and hand, and stack for HP (a slider needs the width).

| Row | Control | Spec | Readout and hints |
|---|---|---|---|
| **Hero HP** | Slider + editable value | Style-guide slider. Range 1–60 (`FT_HP`). Ticks every 10; the **20** tick is brighter and labelled "normal". Thumb 20 px (28 while dragging), hit area 44 px. | Value to the right as an editable number field (Number-inline, 44 px wide). Under the track: "1" at the left end, "60" at the right. Hint: "A hero heals back to 20 at most." shown only when the value is above 20. |
| **Extra AP every turn** | Pip stepper | 6 bonus slots as crystals (tap a slot to set that many); `−` / `+` 36 px at the ends on touch layouts. Range 0–6 (`FT_AP`). | Readout "+4 → 8 AP a turn" (base from `CC_CFG.ap`; says 9 when Rainstorm is the chosen event). At 0: "Normal: 4 AP a turn". |
| **Opening hand** | Pip stepper | 3 bonus slots as mini cards. Range 0–3 (`FT_HAND`). | Readout "+3 → 8 cards". At the cap: "A hand holds 8 cards at most." |

**Why a slider for HP and steppers for the others:** HP has 60 steps and players think of it as "about 40" or "max" — a slider gets there in one drag, and the editable number covers exact values. AP and hand have 7 and 4 steps and are counts of real game pieces, so discrete pips that look like those pieces are faster and clearer than a slider.

A small ghost button under the table: **Copy mine to opponent** (sets the opponent's three values to yours). Useful for mirror practice, saves six taps.

### 5.10 Rules tab

| Setting | Control | Options and copy |
|---|---|---|
| **Who goes first** | 3-segment control, each segment with a small icon | "You" · "Coin flip" · "Opponent" |
| **Battle event** | Choice chips in a wrapping grid (2 columns on portrait); 40 px tall (44 on touch) | "None" (close icon, `#cfd6ff`) · "Random" (refresh icon, `#f5afe8`) · the 7 events with their own icon and colour from `CC_EV_LOOK`: Rainstorm `#8fc4ff`, Blood Moon `#ff4d5e`, Arcane Surge `#c99bff`, Tailwind `#9ff5dc`, Starfall `#ffe9a8`, Sacred Ground `#ffd36b`, Scorching Sun `#ff9a3c` |
| Event rule line | Body-small text under the chips, `aria-live="polite"` | The chosen event's full rule (`CC_EVENTS[k].text`); "No battle event." ; "A different event every match." |
| **Round limit** | 4-segment control | "Off" · "8" · "12" · "20"; hint: "Off: a draw after round 40." |
| **At the limit** | 2-segment control; appears (height animates open) only when a limit is set | "Draw" · "More HP wins" |
| **Shuffle** | 2-segment control | "New each match" · "Same each match" |
| Shuffle code | Appears only for "Same each match": number field (grouped digits, `inputmode="numeric"`), dice, copy, Use last match | field label "Shuffle code"; buttons' labels "New code", "Copy", "Use last match" |

Note on the event colour Sacred Ground: it is gold-coloured by design (it is an event's identity, not an action), which the style guide allows.

### 5.11 Look tab

Headed by a status tag: "Only for show — changes nothing in how it plays."

| Setting | Control | Spec |
|---|---|---|
| **Plays as** | Picker row | 56 px row: 40 px face · name ("Random character" / the Dummy) · **Choose** (opens the existing `openCharPicker`) · **Random** (ghost; only when a character is chosen) |
| **Board skin** | Swatch row | One 72 × 44 px swatch per skin + a "Random" swatch (a "?" on a split of two skin colours). Each swatch is a tiny picture of the skin: its two colours from `CC_SKIN_COL` as a diagonal split, its crest icon (`ccSkinIco`) in the middle, its name under it in Tiny type. Selected: crystal ring + check. Scrolls sideways if it does not fit. |
| **Card back** | Swatch row | One real card back per option at 34 × 48 px (`ccBackHTML`), + "Random" (a face-down card with "?"). Name under each. Selected: crystal ring + check, card lifted 3 px. |

Skins and backs the player does not own are still selectable here (it is the opponent's look, as today).

### 5.12 Start bar

| Part | Spec | Copy |
|---|---|---|
| Container | Clear glass, `--rd-lg`, the page's one bracketed bar; pinned | |
| Lead-in | Kicker | "Different from a standard match" — or, when nothing differs, a single line "Standard rules · 20 HP each · coin flip" |
| Difference chips | Chips in the info-chip look, 32 px tall; each is a button that opens the tab its setting lives in. Built from `ftChips`-style data, **only for values that differ from `FT_DEF`**; max 2 rows desktop, 1 row medium with "+n" | "Dummy", "40 HP", "You 10 HP", "+4 AP", "Opp. +1 AP", "+3 cards", "You first", "Opponent first", "Blood Moon", "Random event", "Ends round 12", "More HP wins", "Same shuffle", "Sky Sovereign deck" |
| Start | Crystal primary, hero size: 260 × 64 desktop, 220 × 56 medium, full width × 56 portrait, 52 sideways. White orb with the target icon, label, sub line, sheen. | "Start" / "Free training" |
| Start when no deck is ready | **Not disabled.** Same shape, crystal at 55% saturation, `aria-disabled="true"`. A tap runs the error motion (7.11) and moves focus to "Build a deck". | sub line "Needs a 30-card deck" |

The old "Free practice · No stamina · no rewards · no record" block in the bar is removed: the header chip and the button's sub line already say it.

### 5.13 End-of-match box (in the match, existing `ftEndHTML` / `ftEndBtns`)

Keep the box. Changes: the chips become the same difference chips; the seed line becomes a row with the code and **Replay this shuffle**; buttons stay "Play again" (crystal) and "Training" (ghost). Copy for the seed row: "Shuffle code 2 814 003 117".

---

## 6. The live preview — "the Ring"

### 6.1 The idea

The centre of the page is a small, quiet picture of the match the player is about to start, laid out the way the real board is: **opponent on top, battle line in the middle, you at the bottom**. Every setting has one visible place on it. The player learns the real board's layout before the match starts, and can read the whole setup at a glance.

### 6.2 What maps to what

| Setting | Where it shows on the Ring | Built from (already in the game) |
|---|---|---|
| Opponent's character | Face on the opponent strip | `baseThumb(findEntry(f.char))`; target icon for the Dummy; "?" for random |
| Brain | Pips and name on the opponent strip; the face's ring colour | `FT_BRAINS` colour and pips, `.qmx-pips` |
| Decks | Names on both strips | `ftFoe(f)`, `ftMyDeck()` |
| Your leader | Face on your strip | `ccLeaderOf(deck.id)` |
| Hero HP | The number in each HP gem | The match's hero HP gem look, reused as a static element |
| Extra AP | Extra glowing crystals after the base ones | The match's AP crystal look (diamonds; blue for you, crimson for the opponent) |
| Opening hand | Extra lifted cards in each fan | `ccBackHTML('', back)` at mini size |
| Opponent's card back | The backs in the opponent's fan | `ccBackHTML` with `f.back` |
| Opponent's board skin | The top half of the board | `ccSkinPreview(skin)` in a `.ccsk-scale` box, flipped for the top side as the match does |
| Your board skin | The bottom half | `ccSkinPreview(ccMySkin())` |
| Who goes first | The coin on the battle line: crystal face = you, crimson face = opponent; edge-on and slowly rocking = coin flip | The coin's faces (`.ccn-*`), posed with the same squash trick as `ccCoinRun` |
| Battle event | A tint over the whole board in the event's colour + the event chip on the battle line (left) | `ccEvIco(k)`, `ccEvCol(k)`; tint = a plain CSS overlay in the spirit of `.ccwx-tint` (no weather canvas) |
| Round limit | A small round badge on the battle line (right): "R12" | New, tiny |
| Same shuffle | A padlock chip on the battle line (right) | New, tiny |

### 6.3 Rules that keep it cheap

| Rule | Why |
|---|---|
| The two half-boards are **static**: built once per skin, with every animation inside paused (`animation-play-state: paused` on the preview subtree) and `pointer-events: none`. | `ccSkinPreview` draws a real half-board with slot runes, sheens and skin decorations that loop; two of them looping in a lobby would be the most expensive thing on the page for no benefit. |
| A half-board is rebuilt **only when its skin changes** — not on any other setting. | Everything else (HP, AP, hand, coin, tint) is separate small elements updated in place. |
| "Random" skin shows the default table with a "?" crest and a "Random skin" label. It does not cycle through skins. | Calm, and honest: the skin is picked at Start from the seed. |
| "Random" event shows a neutral rose tint and the refresh icon. | Same reason. |
| No particles, no weather canvas in the lobby. The event is a tint and an icon. | Style guide budget: 0 particles in lobby previews by default. |
| The preview has no `backdrop-filter` of its own. It sits inside the Ring panel (one blur). | Blur budget. |
| `contain: layout paint` on the preview box. | Its internal changes never relayout the page. |

### 6.4 The lite preview (phones)

On portrait and sideways phones there is no board picture. Instead:

- **Plates / one-liners** carry face, name, HP gem, AP and hand counts.
- **Board ribbon** (24 px): left part in your skin's two colours, right (or top, on sideways) in the opponent's, as soft gradients from `CC_SKIN_COL`; the event's tint washes over it and the event's icon and name sit in the middle. "No event" shows a thin battle line only.
- **Coin** (44 / 32 px) sits between the two sides.

This keeps the "every setting has a place" idea with a handful of plain elements and no half-boards at all.

### 6.5 What the preview is not

It is not playable, has no units to drag, and does not simulate anything. The sample units that `ccSkinPreview` places on its slots are **removed or dimmed to 35%** in the Ring so nobody reads them as "these units start on the board".

---

## 7. Motion design

Tokens: durations `--mo-instant` 90 · `--mo-quick` 150 · `--mo-base` 220 · `--mo-slow` 360 · `--mo-slower` 560 ms. Easings `--mo-standard`, `--mo-enter`, `--mo-exit`, `--mo-emphasis`, `--mo-spring` (style guide 9.3).

General rules for this page: input is live from the first frame; every state change animates **in place** (no page rebuild); only `transform` and `opacity` move; at most three groups move at once.

### 7.1 Page entry — "Step into the Ring" (FT-01)

Trigger: `openTraining()` from the Battle screen. Total: still by 780 ms.

| t (ms) | Element | Motion | Duration | Easing |
|---|---|---|---|---|
| 0 | Backdrop (picture, glows, scrim) | opacity 0 → 1 | 360 | enter |
| 40 | Header | opacity 0 → 1, translateY −8 → 0 | 220 | enter |
| 100 | Drill cards (rail) | stagger from the left: opacity, translateX −12 → 0; 30 ms apart, capped at 8 | 220 each | enter |
| 160 | Ring panel | opacity 0 → 1, scale .97 → 1 | 360 | emphasis |
| 240 | Your strip | translateX −24 → 0, opacity | 360 | emphasis |
| 240 | Opponent strip | translateX +24 → 0, opacity | 360 | emphasis |
| 300 | Setup panel | opacity, translateY 10 → 0 | 360 | enter |
| 380 | Setup rows (open tab) | stagger: opacity, translateY 6 → 0; 25 ms apart, capped at 6 | 220 each | enter |
| 420 | Coin | scale 0 → 1 (lands in its pose) | 220 | spring |
| 440 | HP gems | numbers tick up from 0 to their values | 360 | ease-out |
| 440 | AP crystals, hand cards | light / deal one by one, 30 ms apart | 150 each | spring |
| 480 | Start bar | translateY 16 → 0, opacity | 300 | enter |
| 760 | Start button | first sheen sweep | — | linear |

The Start bar arrives last so the eye finishes on the main action. **Repeat visits** in the same session (returning from the deck screen, a picker, a match): one fade of the whole page, 220 ms, no stagger, no tick-ups.

Reduced motion: the whole page fades in over 150 ms; values are already final; no sheen.

### 7.2 Named motions — reference table

| ID | Name | Trigger | What moves (properties) | Duration | Delay | Easing | Reduced motion |
|---|---|---|---|---|---|---|---|
| FT-01 | Step into the Ring | Page opens | See 7.1 | ≤ 780 total | — | — | 150 ms fade |
| FT-02 | Drill swap | A drill or My preset is applied | See 7.3 | ≤ 600 total | — | — | Values swap; 150 ms crossfade of the Ring |
| FT-03 | Edited mark | First manual change after a drill | Drill card border solid → dashed (crossfade of two borders, opacity); "Edited" tag scale 0 → 1; Revert / Save buttons fade in with translateX 8 → 0 | 220 | 0 / 60 / 90 | standard; tag spring | Appear at once |
| FT-04 | Tab slide | A setup tab is picked | Underline translateX + scaleX to the new tab; old group opacity → 0 (90 ms); new group opacity 0 → 1 with translateX ±12 → 0 (direction = where the tab is) | 220 | new group +60 | standard; group enter | Underline jumps; groups crossfade 150 |
| FT-05 | Brain change | A brain card is picked | See 7.4 | 360 | — | — | Tint and text swap |
| FT-06 | Slider drag | HP slider grabbed / moved / released | See 7.5 | — | — | — | No size change; values swap |
| FT-07 | Pip set | AP or hand value changes | See 7.6 | 150 per pip | 30 per pip | spring | Pips swap at once |
| FT-08 | First-turn coin | "Who goes first" changes | See 7.7 | 360 | — | standard | Face swaps, 150 ms crossfade |
| FT-09 | Event wash | Battle event changes | See 7.8 | 360 | — | standard | 150 ms crossfade, no pop |
| FT-10 | Rule reveal | Round limit turned on / off; shuffle set to "Same" | The dependent row ("At the limit", "Shuffle code") opens: opacity 0 → 1 and translateY −6 → 0 while the rows below slide down with `transform` (the group's height is fixed by a grid row that switches `0fr → 1fr`); badge on the battle line scale 0 → 1 | 220 | badge +80 | enter; badge spring | Appears at once |
| FT-11 | Look swap | Skin, card back or character changes | Skin: the half-board crossfades (old over new, opacity 1 → 0), 360 ms. Card back: the opponent's fan flips, each card scaleX 1 → 0 → 1 with the new back at the midpoint, 30 ms apart. Character: face crossfades and its ring pulses once (scale 1 → 1.08 → 1). Selected swatch: crystal ring scale .9 → 1 + check pop. | 360 / 220 per card / 220 | — | standard; pops spring | Crossfades 150 |
| FT-12 | Deck change | A deck is picked on your plate or in the opponent's picker | Deck name: old slides up 6 px and fades, new slides in from below; leader face crossfades | 220 | — | standard | Swap |
| FT-13 | Preset saved | Save / Update in the dialog | See 7.9 | 560 | after the dialog closes | spring + enter | Toast and tag only |
| FT-14 | Start charge | Start pressed (deck ready) | See 7.10 | ≤ 400 before loading | — | — | Straight to the loading screen |
| FT-15 | Not ready | Start pressed with no ready deck | See 7.11 | 320 | — | standard | Border flash + toast |
| FT-16 | Back from a match | "Training" on the end box, or Leave | See 7.12 | 220 + 560 | — | enter | Fade only |
| FT-17 | Revert | Revert pressed, or the edited drill tapped again | Same as FT-02 but values run back; "Edited" tag scale 1 → 0 (150, exit); Undo toast | ≤ 600 | — | — | Swap + toast |
| FT-18 | Difference chips | The set of differences changes | Leaving chips: opacity → 0, scale .9 (150, exit). Arriving chips: opacity 0 → 1, scale .9 → 1 (220, spring). Remaining chips slide to their new places with `transform` (220, standard). | 220 | — | as noted | Swap |
| FT-19 | Idle | Page at rest | See 7.13 | loops | — | — | All stopped |

### 7.3 Drill swap (FT-02) in detail

The signature motion of the page: the setup visibly **re-arms** itself.

| t (ms) | What | Spec |
|---|---|---|
| 0 | Rail | Old card: tint and glow out (150). New card: tint in (220), lift 2 px and settle (360), icon frame turns crystal. |
| 0 | Ring title | Old name slides up 8 px and fades (90); new name slides in from below (220, enter). |
| 60 | HP gems | Numbers tick from old to new (360, ease-out); each gem scales 1 → 1.06 → 1 as its number lands (spring). |
| 60 | AP crystals | Bonus crystals that go away dim one by one from the right; new ones light one by one from the left; 30 ms apart, 150 each (spring). |
| 90 | Hand fans | Extra cards slide out to the right and fade / deal in from the right, 30 ms apart. |
| 90 | Brain | Pips refill left to right, 50 ms apart; the face's ring colour crossfades (220). |
| 120 | Coin | Turns to its new face (FT-08). |
| 120 | Event | Tint crossfades; chip swaps (FT-09). |
| 120 | Setup panel | Controls in the **open** tab glide to their new values: slider thumb and fill (220, standard), segment thumbs (220, standard), chips re-light, pips set. Tabs gain or lose their dots (scale, spring). |
| 200 | Difference chips | Reflow (FT-18). |
| 520 | Start button | One sheen sweep: "ready". |

Nothing here blocks input. If another drill is tapped mid-way, every element retargets from where it is.

### 7.4 Brain change (FT-05)

| Element | Motion |
|---|---|
| Picked card | Tint in 220; lift 2 px and settle 360; check pops (spring). Old card dims 150. |
| Pips on the opponent strip | Fill (or empty) one by one, 50 ms apart, each scale 0.4 → 1 (150, spring). |
| Opponent's face | Ring colour crossfades to the brain's colour (220). The face "squares up": scale 1 → 1.07 → 1 (360, spring). For **Dummy** it does the opposite: a small slump, rotate 0 → −4° and settle at −2° with 15% less saturation, so it reads as lifeless. Picking any other brain straightens it. |
| Brain name on the strip | Old slides up and fades, new slides in (220). |
| Expert only | The face's ring gains a slow breathing glow (4 s, opacity .25 ↔ .45) — the one "danger" loop on the page. |

### 7.5 Slider interaction (FT-06)

| Moment | Motion |
|---|---|
| Hover (pointer) | Thumb gains a soft glow, 150 ms. |
| Grab | Thumb 20 → 28 px (150, spring). A value bubble fades in 10 px above the thumb (150) showing the number in Number-large. |
| Drag | Thumb and fill follow the pointer with no easing. The value updates every step **everywhere at once**: the bubble, the field, and the HP gem on the Ring (plain swaps while dragging — no tick animation, so it never lags). |
| Detents | Crossing **20** (normal), and reaching **1** or **60**: the bubble pops 1 → 1.12 → 1 (150, spring) and the matching tick flashes white for 220 ms. On devices that support it, a single 8 ms vibration (`navigator.vibrate`), skipped under reduced motion and where unsupported. The thumb does **not** stick — the value still moves freely one by one. |
| Release | Thumb back to 20 px, bubble fades (220). The HP gem scales 1 → 1.08 → 1 once (360, spring) to confirm, and the setting is saved. |
| Keyboard | Arrow keys ±1, Page Up / Down ±5, Home / End to 1 / 60. The thumb moves in 90 ms; the bubble shows while the slider is focused. Focus stays on the slider. |
| Typing in the field | On blur or Enter the thumb glides to the value (220, standard) and the gem number ticks (220). Out-of-range input is clamped and the field border flashes warning for 600 ms. |

### 7.6 Pip set (FT-07)

Raising: new pips fill left to right, 30 ms apart, each scale 0.4 → 1 with a brief glow (150, spring); the matching crystals or cards on the Ring appear in the same rhythm. Lowering: pips empty right to left, 90 ms each, no spring. The readout ("+4 → 8 AP a turn") ticks its numbers (single-step tick, up or down). At the limit, the `+` button dims (150) and the readout's cap hint fades in.

### 7.7 First-turn coin (FT-08)

The coin is posed, not tossed (the real toss belongs to the match).

| Choice | Pose | Transition |
|---|---|---|
| You | Crystal face toward the viewer, tilted a little toward your side | One half-turn about its horizontal axis (face squashes to the edge and opens on the other face), 360 ms, standard |
| Opponent | Crimson face, tilted toward the opponent's side | Same |
| Coin flip | Edge-on at 60%, rocking slowly between the two faces (idle loop, 6 s) with a small "?" above it | Turns to the edge pose, then the loop starts |

The side that goes first also gets a small "1st" tag beside its strip (scale 0 → 1, spring; none for coin flip).

### 7.8 Event wash (FT-09)

| Element | Motion |
|---|---|
| Tint over the board | Old colour's layer opacity → 0 while the new colour's layer → its strength (18% over the board, 10% at the Ring's edges), 360 ms, standard. Two stacked layers crossfade; no colour interpolation of gradients. |
| Event chip on the battle line | Old chip scale 1 → 0.8 and fades (150, exit); new chip scale 0.6 → 1 (220, spring) with its icon. |
| Picked chip in the Rules tab | Chip re-light (tint 220, icon pop 1 → 1.18 → 1). |
| Rule line | Crossfade 220. |
| Knock-on values | If the event changes a number shown on the Ring (Rainstorm: 5 base AP), the base crystals update with FT-07. |

### 7.9 Preset saved (FT-13)

1. The dialog closes (150 ms).
2. The My preset card's star: scale 0.6 → 1.25 → 1 (360, spring).
3. One crystal ring ripples out from the star: scale 1 → 1.9, opacity .55 → 0 (560, enter).
4. The card's border flashes crystal and settles into the selected look (360).
5. The "Edited" tag and the Revert / Save buttons leave (150, exit); the Ring title changes to the preset's name (FT-02's title swap).
6. Toast: "Saved as {name}".

### 7.10 Start pressed (FT-14)

Total hold before the loading screen: **at most 400 ms**. Input is locked for that time only, and a second tap is ignored.

| t (ms) | Element | Motion |
|---|---|---|
| 0 | Start button | Press: scale .97 (90). The sheen is replaced by a **charge**: a white-rose fill sweeps left to right across the button (240, standard) while the orb's icon turns 90°. |
| 60 | Both strips | Lean toward the battle line: yours translateY −6 px, the opponent's +6 px (220, emphasis). |
| 120 | Coin | A quick squash-pop (scale 1 → 1.15 → 1, spring). For "Coin flip" it stops rocking, edge-on. |
| 240 | Whole page | Ring scales 1 → 1.04; everything fades to 0 (160, exit). |
| 400 | — | The existing loading screen (`showLoading`) is up; the match opens behind it as today (VS intro, coin flip, event reveal). |

The lean and the edge-on coin hand over to the match's own VS intro and coin toss, so the lobby and the match feel like one continuous move.

Reduced motion: the press colour change only, then the loading screen at once.

### 7.11 Not ready (FT-15)

Trigger: Start tapped with no 30-card deck.

- Your strip shakes: translateX 0, −6, 5, −4, 2, 0 px over 320 ms, once; its border flashes danger for 600 ms.
- The Start button does a 4 px version of the same shake.
- Toast (error style): "Pick a deck with 30 cards first."
- Focus moves to **Build a deck** on your strip.

Reduced motion: border flash and toast only.

### 7.12 Returning from a match (FT-16)

| Route | What happens |
|---|---|
| **Play again** (end box) | No lobby at all — straight into the next match, as today. |
| **Replay this shuffle** | Same, with "Same each match" switched on. |
| **Training** (end box) or **Leave** | The page fades in with the short repeat-visit entry (220 ms). Then, once: if shuffles are "New each match", a small chip appears on the battle line — "Last match's shuffle · Replay" — sliding in from the right (220, enter) with one soft pulse of its border (560). It stays until the setup changes or the page closes. The Start button plays one sheen. |

### 7.13 Idle and ambient (FT-19)

Four loops at most, all slow, all behind or beside the content:

| Loop | Spec | When |
|---|---|---|
| Backdrop glows | Three teal / blue / rose glows drifting, 16 s alternate, opacity .5 (.16 over a wallpaper) — as today | Always |
| Start sheen | 3.6 s; a 30% white band sweeps in the first 55% | Always, while the deck is ready |
| Coin rock | Edge-on coin rocks ±25° of its turn, 6 s ease-in-out alternate | Only when "Coin flip" is chosen |
| Expert glow | Opponent face ring, 4 s, opacity .25 ↔ .45 | Only when the brain is Expert |

Not looping: the half-boards (paused), pips, gems, chips, the event tint (static), brackets, tabs. All loops pause when a modal or picker covers the page and when the tab is hidden.

### 7.14 Compact timeline — one typical session

```
open        0 ─ backdrop ─ header ─ rail ─ Ring ─ strips ─ setup ─ coin/gems ─ Start bar ─ 780 still
tap drill   0 ─ card ─ title ─ gems tick ─ crystals ─ fans ─ pips ─ coin ─ tint ─ chips ─ 600 still
drag HP     grab 150 ─ live values ─ detent pops ─ release 220 ─ gem confirm 360
pick event  0 ─ chip re-light ─ tint 360 ─ battle-line chip pop
press Start 0 press ─ charge 240 ─ lean ─ fade 160 ─ 400 loading screen
```

---

## 8. Accessibility and input

### 8.1 Keyboard order

1. Header: info → how to play → reset → close
2. Drills: one tab stop (a radio group; arrow keys move and apply; Enter on My preset's Save button)
3. Ring: Revert → Save → opponent strip → opponent HP gem → your HP gem → Change deck
4. Setup tabs: one tab stop (arrow keys switch tabs)
5. The open group's controls, top to bottom, You before Opponent
6. Difference chips (each opens its tab) → **Start**

| Key | Does |
|---|---|
| Tab / Shift+Tab | Next / previous stop in the order above |
| Arrow keys | Move within drills, tabs, brain cards, segmented controls, swatch rows, sliders |
| Enter / Space | Activate |
| Ctrl / Cmd + Enter | Start, from anywhere on the page |
| Esc | Closes the top-most layer only: popover or sheet → picker or dialog → the page (back to Battle) |
| Home / End, Page Up / Down | Slider to ends, ±5 |

**Focus never drops.** Because the page updates in place, the focused control stays focused after every change. After a tab switch, focus stays on the tab; after a picker closes, focus returns to the row that opened it.

### 8.2 Focus and visible states

2 px `#f5afe8` ring with 2 px offset on glass; `#fff` on the Start button. Selected states always pair colour with a second cue: check marks on brain cards and swatches, underline position on tabs, dashed border for "edited".

### 8.3 Screen-reader labels

| Element | Label / role |
|---|---|
| Page | `role="dialog"`, `aria-label="Free Training"` (as today) |
| Drills | `radiogroup` "Drills"; each `radio` "Combo lab. Plus 4 AP and 3 more cards against a Dummy. Edited." |
| Ring preview | The picture is `aria-hidden`; a visually hidden summary sentence replaces it, `aria-live="polite"`: "You: Balanced Deck, 20 HP, 8 AP a turn, 8 cards. Opponent: Training Dummy, Dummy, mirror deck, 40 HP. You go first. Blood Moon." Updated at most once per 500 ms. |
| Tabs | `tablist` / `tab` / `tabpanel`; a tab with a dot adds "has changes" |
| Brain cards | `radiogroup` "How the opponent plays"; each "Hard, 3 of 4. Plans its whole turn." |
| HP sliders | `aria-label="Your hero HP"` / `"Opponent's hero HP"`, `aria-valuetext="20 HP, normal"` |
| Pip steppers | `spinbutton` semantics: "Your extra AP every turn", value text "plus 4, 8 AP a turn" |
| Pickers | "Opponent's deck: Mirror, a copy of your deck" (replaces today's raw "me" / "foe" / "skin" / "back" labels) |
| Swatches | `radiogroup` "Opponent's board skin"; each named |
| Icon-only buttons | Always labelled: "New shuffle code", "Copy shuffle code", "Change deck", "Reset the setup" |
| Start | "Start free training"; when not ready `aria-disabled="true"` and `aria-describedby` → "Needs a 30-card deck" |

### 8.4 Touch

- Every target is at least 44×44 px on portrait and sideways layouts (visual size may be smaller; the hit area is padded).
- At least 8 px between neighbouring targets; steppers' `−` and `+` are separated by the pips.
- The HP slider has a 44 px tall grab area; dragging it does not scroll the group (`touch-action: pan-y` on the track's parent, horizontal handled by the slider).
- Bottom sheets drag down to close and also have a visible close button.
- No hover-only information: every tooltip's content is also in a sub line or the (i) window.
- Press-and-hold on a stepper repeats (400 ms, then every 80 ms).

---

## 9. Implementation plan (advisory — no code here)

### 9.1 Reuse, change, replace

| Existing piece | Plan |
|---|---|
| `FT_BRAINS`, `FT_PRESETS`, `FT_DEF`, `FT_HP`, `FT_AP`, `FT_HAND`, `FT_ROUNDS` | **Reuse unchanged.** |
| `ftState()` | **Reuse**, plus repair of one new field `base` (a preset id or `'mine'`; default `'standard'`). |
| `ftSetup`, `ftMatch`, `ftFoeChar`, `ftFoeList`, `ftMyDeck`, `ftFoe`, `ftChars` | **Reuse unchanged.** The match is built exactly as today. |
| `ftBattle()` | **Small change:** play FT-14, then do what it does now (guard against a second tap during the 400 ms). |
| `ftApply`, `ftApplyMine` | **Small change:** also set `base`; then update in place instead of a full render. |
| `ftSet(fn)` | **Change:** keeps `preset = 'custom'`, persists, then calls a targeted update (which parts changed) instead of `renderTraining()`. |
| `ftChips(f)` | **Replace** with a "differences from `FT_DEF`" list (same shape: icon + text, plus which tab it belongs to). Keep the old function until `ftEndHTML` and `ftSaveMine` are moved to the new one. |
| `ftSaveMine`, `ftMine` | **Reuse**; add the character counter and the difference chips. `S.cc.ftMine` shape unchanged. |
| `renderTraining()` | **Replace** by two functions: a shell built once on open (header, rail, Ring, tabs, Start bar), and a sync that writes values, classes and CSS variables for what changed. The Admin wallpaper hooks (`ftAdminBind` calls `renderTraining`) call the shell builder. |
| `openTraining`, `closeTraining`, Esc handler | **Reuse**; Esc learns about the new popover / sheet layer. |
| `ftEndHTML`, `ftEndBtns` | **Small change** (difference chips, Replay this shuffle). The match-side handlers `#ftAgain` / `#ftBack` in `45-clash-ui.js` stay; one new handler for the replay button. |
| `INFO.training` | **Update the text** to the new names (Drills, Shuffle code). |
| `ccDeckPicker(back)` | It writes the globally selected deck (`S.cc.sel`), while Free Training keeps its own `f.me`. **Add a way to pass the pick back** (an optional callback), or build the small list from `ccAllDecks()` in the same glass style. Do not change what other callers get. |
| `openCharPicker` | **Reuse** as is. |
| `ccSkinPreview(bs)`, `ccBackHTML`, `ccSkinIco`, `CC_SKIN_COL`, `ccEvIco`, `ccEvCol`, `ccLeaderOf`, `baseThumb`, `ccMySkin` | **Reuse** for the Ring and the Look swatches. |
| Coin faces (`.ccn-*`) | **Reuse the look** for a static, posed coin. Do not call `ccCoinFlip`; it is a full-screen set piece. |
| CSS `.rdx-head`, `.rdx-rail`, `.rdx-it`, `.rdx-iti`, `.rdx-itt`, `.rdx-gh`, `.rdx-go`, `.rdx-bg`, `.rdx-shade`, `.hgx-glow`, `.qmx-pips` | **Reuse.** Keep `rdx` on the root so the header, rail and Start button inherit. |
| CSS `.rdx` grid on this page, `.rdx-hero`, `.rdx-panel`, `.rdx-bar`, `.rdx-vs`, `.rdx-side` as used here | **Override / stop using** on this page only (Raids, Quick Match, Arena and the others keep them). |
| CSS `.ftx-brs`, `.ftx-grid`, `.ftx-row`, `.ftx-sel`, `.ftx-seg`, `.ftx-sg`, `.ftx-step`, `.ftx-rng`, `.ftx-hero`, `.ftx-ev*`, `.ftx-cus`, `.ftx-sum` | **Retire** after phase 1 is accepted (delete in the same change that removes their markup). |
| Tab memory | Which tab is open is a per-visit convenience: keep it in a module variable, not in the save. |

### 9.2 New CSS

A new section at the end of `main.css`: **"Free Training v2 — the Sparring Ring (`.ftx.ft2`, 63-training.js)"**, in this order: layout grid → rail additions (edited state) → Ring (title, strips, board, battle line, lite versions) → tabs → controls (slider, pip stepper, picker row, swatches, segmented thumb) → Start bar and difference chips → motion classes → breakpoints (short desktop, medium, portrait, short portrait, narrow portrait, sideways) → reduced motion.

New tokens needed (page-scoped on `.ft2` until a project tokens file exists):

| Token | Value | For |
|---|---|---|
| `--mo-instant / quick / base / slow / slower` | 90 / 150 / 220 / 360 / 560 ms | All motion on the page |
| `--mo-standard / enter / exit / emphasis / spring` | style guide 9.3 | |
| `--ft-mc` | `#8ff5d2` | The page's teal mode colour |
| `--ft-me` / `--ft-op` | crystal lavender `#c8a2ff` / the brain's colour | Side colours on the Ring |
| `--ft-ev` | the chosen event's colour, or transparent | Event tint |
| `--ft-hp-me`, `--ft-hp-op` | 1–60 as numbers | Drive slider fills (as a 0–1 scale) without layout |

### 9.3 Risks and how to handle them

| Risk | Handling |
|---|---|
| **Old saves.** `S.cc.ft` without `base`; `preset: 'custom'` from before. | `ftState` adds `base: 'standard'`. A custom setup from an old save shows as "Standard match · edited", which is true. `S.cc.ftMine` is untouched (its `cfg` may or may not carry `base`; both load). Test with a save made by the current version. |
| **Preview cost on phones.** Two real half-boards plus blur. | Phones never build the half-boards (lite preview). Desktop builds each once per skin with animations paused. Check frame times at 1024×768 on a slow profile. |
| **Blur.** 13 `backdrop-filter` elements today. | New page: header chip, rail, Ring, setup, Start bar = 5 (+1 for an open popover). Everything inside is nested glass. On phones the rail strip and the Ring card share one glass surface. |
| **Hidden settings behind tabs.** Players may not notice a non-standard rule. | Tab dots + difference chips + the Ring itself. Acceptance check: every setting that differs from standard is visible somewhere without opening its tab. |
| **In-place updates are more code than a rebuild.** | Limit it: values, classes and CSS variables only; lists that change shape (difference chips, opponent deck list) may rebuild their own small container. |
| **Start delay.** 400 ms before the loading screen. | Lock input, ignore repeats; if the tab is hidden or reduced motion is on, skip the delay. |
| **`ccSkinPreview` markup assumptions.** It was made for the Skins window (`.ccsk-scale`). | Verify it renders at the Ring's sizes and flipped for the top half before relying on it; if it does not scale down cleanly, fall back to the swatch look (two colours + crest) for the board too. |
| **Long names.** Deck and character names up to 16–20 characters in narrow strips. | One line with "…" and a tooltip; the difference chips cap at 2 rows / 1 row with "+n". |
| **Smoke test.** `npm run smoke` opens every screen. | Run it after each phase; update it if it targets removed `.ftx-*` selectors (not checked in this plan). |
| **Admin wallpaper.** `ft:bg` with Adjust position must keep working. | The backdrop markup is unchanged. |
| **Other `.rdx` pages.** | All new rules are scoped to `.ftx.ft2`. Screenshot Raids, Quick Match, Arena, Hangout and Ranking before and after. |

### 9.4 Phased build

**Phase 1 — layout and components (the page is fully usable; no board picture, simple transitions)**

Build: the shell + in-place sync; rail with edited state and My preset; Ring title; side strips / plates with HP, AP and hand as numbers and simple pips; the four tabs with all controls (slider, pip steppers, pickers, swatches as colour splits, segmented controls, seed row); Start bar with difference chips; not-ready state; all breakpoints; labels and keyboard.

Acceptance:
- [ ] At all 12 standard sizes (1920×1080, 1600×900, 1366×768, 1280×720, 1024×768, 844×390, 740×360, 667×375, 414×896, 390×844, 375×667, 360×740): nothing off screen, nothing overlapping, both sides of the matchup and Start visible without scrolling, only the open group scrolls.
- [ ] Every setting of today's page can be set, and a match started from each drill uses the same options as today (compare `ftSetup` output for the same `S.cc.ft`).
- [ ] A save from the current version loads; My preset loads and saves; Reset and Revert work with Undo.
- [ ] No control loses keyboard focus after a change; the HP slider can be driven by arrow keys.
- [ ] 0 touch targets under 44 px on phone layouts; `backdrop-filter` count ≤ 6 desktop / ≤ 4 phone.
- [ ] White-wallpaper test: all text readable with a pure white `ft:bg`.
- [ ] Works offline; `npm run smoke` passes; other `.rdx` pages unchanged.

**Phase 2 — the live preview**

Build: half-boards from `ccSkinPreview` (desktop / medium), battle line with coin, event chip, round and shuffle badges; event tint; HP gems, AP crystals and hand fans in the match's look; the lite ribbon and coin on phones; real card backs and skin crests in the Look swatches; the hidden summary sentence for screen readers.

Acceptance:
- [ ] Every setting changes its place on the Ring at once (table 6.2), on every breakpoint.
- [ ] Half-boards rebuild only on a skin change; no looping animation runs inside the preview.
- [ ] Scripting + layout for one setting change under 8 ms on a mid-range phone profile; no dropped frames while dragging the HP slider at 844×390.
- [ ] Overlap / off-screen check passes again at the 12 sizes.
- [ ] "Random" skin, event and character read as random, not as a specific choice.

**Phase 3 — motion polish**

Build: FT-01 to FT-19; the sliding underline and segment thumbs; number ticks; the Start charge and hand-over to the loading screen; returning-from-match chip; idle loops; reduced-motion block.

Acceptance:
- [ ] Entry still by 800 ms; taps work during it; repeat visits use the short fade.
- [ ] Drill swap still by 600 ms and interruptible (tap three drills quickly: no jump, no stuck state).
- [ ] At most 4 loops running at rest; all pause under a modal and in a hidden tab.
- [ ] Start locks input for at most 400 ms; double taps start one match.
- [ ] With `prefers-reduced-motion: reduce`: no loops, no movement, crossfades of 150 ms only, and every state change is still visible (edited tag, saved toast, error flash).
- [ ] Only `transform` and `opacity` animate (plus small single-element `filter` on numbers); no animated `backdrop-filter` or layout properties.
- [ ] Final pass of the 12-size overlap check and the smoke test.

### 9.5 Out of scope for this remake

- More than one saved preset (the save holds one; a list would need a data change).
- Sharing a setup as a code.
- A playable or simulated preview.
- Changing any match rule, brain or reward behaviour.
