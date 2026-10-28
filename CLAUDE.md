# Prism Plaza

Browser gacha game, built step by step. Everything lives in one self-contained file: `index.html` (HTML + CSS + JS, no build step, no libraries). Open it in a browser to play.

## How we work
- The owner adds features in small batches. Keep it a single file unless asked to split it.
- Keep the visual style: dark frosted-glass UI (tokens in `:root`), fonts Lilita One (display) and Nunito (body).

## What exists
- **Main screen (home):** full-screen wallpaper (default "Pearl Tide" or the splash art of an owned character/skin; chibi wallpapers show the whole character) with HUD pieces floating over it: level ring + name + collection count, Wallpaper and **Hide UI** buttons (hides everything except the wallpaper; any tap or Esc brings it back), currencies, Mail/Settings/Admin, a world-chat ticker (bots), a limited-summon promo card, round event icons (Pearl Wish, Events, Ranking, Friends / Shop, Quests, Bag, Team), an Enter Plaza portal, bottom tabs (Characters, Skins, Collection), a UR pity card and the Summon button. Red diamond dots mark things to do. Events, Quests, Friends, Ranking, Shop, Bag and Team are still templates.
- **Character screen:** full-screen (`openCharacters`): roster of round avatars on the left, splash art shown whole and full height (never cropped; a blurred copy fills the sides), tabs Home (copies, stars, skins, wallpaper / plaza look), Bond (placeholder for a future update) and Character Info (profile). Hanger button switches outfits (skins), eye button hides the UI to view the art. No combat stats by design.
- **Currencies:** gold coins, pearls, summon tickets (tickets do nothing yet).
- **Rarities:** UR (purple/pink/turquoise) and SSR (light orange). The lowest tier is a 500 gold coin drop instead of a character.
- **Summons:** 3 pearls per pull, 30 per ×10.
  - UR 2% per pull, guaranteed by pull 50. SSR 5.1%, at least one every 10 pulls.
  - Limited banner: one featured UR, 50/50; losing gives a random permanent-banner UR and guarantees the featured UR next time.
  - Permanent banner: every UR flagged `standard` has an equal chance.
  - Each banner has its own pity (`S.gacha.limited`, `S.gacha.standard`).
  - Duplicates: first copy = 0 stars, each duplicate +1 star up to 6, then each extra copy = 67 pearls.
- **Summon screen:** full-screen (`openSummon`): Back/?, tickets and pearls top-right, banner tabs on the left (Permanent "Pearl Wish", Limited with timer), a lineup of the banner's characters (featured UR in the middle with SSRs beside it, or every permanent UR), the title with "Summon N more times / Guaranteed UR", Rates / History / Shop buttons, a **Skip** checkbox (`S.settings.skipPull`, jumps straight to the results) and Summon 1 / Summon 10 buttons. Rates, pity and history open in a modal (`openRates`).
- **Pull animation:** shooting star, charge orb, UR/SSR stamp, full-screen 9:16 splash reveal with layered canvas sparkles in the rarity colors. Taps can't skip the intro (Skip button does).
- **Character art:** 9:16 PNG splash art, uploaded in the admin panel (scaled to 1600px tall). Without art, a chibi is drawn from the entry's "plaza look".
- **Admin panel:** Game pool (add/edit characters, skins, weapons, items), Banners (limited featured UR + end date, permanent UR list), Icons (replace any icon with an image), Wallet & summons (test balances, reset pity).
- **Plaza (world):** 2.5D isometric lantern-festival town at night (canvas, all art procedural): warm stone paving with baked lamp light, tiled-roof houses with glowing lattice windows, lantern strings, street lamps, market stalls, red carpets, maple trees, a pond with floating lanterns, fireworks and drifting leaves/confetti. Two ground levels: the Tea Terrace is one level up (`hgt`, `stairs`, `heightAt`), and walkers use BFS pathfinding (`findPath`) so they take the stairs. Five areas (Lantern Square, Tea Terrace, Night Market, Maple Garden, Firework Stage) with a teleport map (M), minimap, area titles and a people list. Other players are bots; there is no real multiplayer yet.
- **Chibi style:** `drawChibi` draws big-head chibis (outlined, big anime eyes, pointed fringe, 5 hair styles); it's used in the plaza and for card portraits/splashes when an entry has no uploaded art.

## Data
- Game state: `localStorage` key `prismplaza.v1` (object `S`).
- Images (splash art, custom icons): IndexedDB database `prismplaza`, store `media`.
- Admin panel → Game pool → "Backup and import" copies/pastes all of it as JSON.

## Likely next steps
- Real multiplayer needs a server (e.g. WebSockets) and shared storage for the admin pool.
- Pull logic and admin access currently run in the browser, so a player could edit them; move them server-side before a real launch.
