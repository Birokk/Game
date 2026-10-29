# Blank: Project

A browser gacha game with a 2.5D lantern-festival plaza. Plain JavaScript, built with [Vite](https://vite.dev).
It runs fully offline in the browser, and becomes an online game (accounts, cloud saves, shared art, live multiplayer) when you connect a free [Supabase](https://supabase.com) project.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open the address it prints (usually http://localhost:5173). Changes to the code reload the page automatically.

- `npm run build` makes the website in `dist/`.
- `npm run preview` serves that build locally.
- Add `?mp=local` to the address and open two tabs to try multiplayer without a server.

## Put it online (GitHub Pages)

1. Merge your work into the `main` branch.
2. On GitHub: **Settings → Pages → Source: GitHub Actions**.
3. Every push to `main` now builds and publishes the game (see `.github/workflows/deploy.yml`). The address is shown in the workflow run, usually `https://<user>.github.io/<repo>/`.

Without a server, every player's progress stays in their own browser, and anyone can open the admin panel. To hide it on the website, add a repository variable `VITE_LOCAL_ADMIN` = `false` (Settings → Secrets and variables → Actions → Variables).

## Connect the server (Supabase)

This turns on accounts, cloud saves, your art for every player, the support inbox and the multiplayer plaza.

1. **Create a project** at [supabase.com](https://supabase.com) (the free plan is fine).
2. **Create the database**: in the project, open **SQL Editor → New query**, paste the whole of `supabase/migrations/0001_init.sql`, and press **Run**.
3. **Copy the keys**: **Project Settings → API**: the *Project URL* and the *anon public* key.
   - For your computer: copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then restart `npm run dev`.
   - For the website: add both as **repository secrets** (Settings → Secrets and variables → Actions → New repository secret) with the same names, then re-run the deploy.
4. **Make yourself admin**: start the game, choose *Create account* and sign up. Then in the SQL Editor run (with your email):
   ```sql
   update public.profiles set is_admin = true where id = (select id from auth.users where email = 'you@example.com');
   ```
   Reload the game: the admin button appears only for you.
5. **Publish your content**: open **Admin → Server → Publish to the server**. This uploads the characters, banners, skins, clothes, memories, notices and every image you made in this browser. From then on, admin changes go to the server automatically.

### Optional settings in Supabase
- **Email confirmation**: by default new accounts must confirm their email first (Authentication → Sign In / Providers → Email). Turn "Confirm email" off while testing if you like.
- **Google sign-in**: Authentication → Sign In / Providers → Google (needs a Google Cloud OAuth client). Add your website address under Authentication → URL Configuration → Redirect URLs.
- **Website address**: set Authentication → URL Configuration → Site URL to your GitHub Pages address.

## How the code is organised

| Path | What |
|---|---|
| `index.html` | Page markup: title screen, main menu, plaza HUD |
| `src/styles/main.css` | All styles |
| `src/game/NN-*.js` | Game code by feature, joined in order into one module (see `vite.config.js`) |
| `src/game/16-backend.js` | Supabase: accounts, saves, content, images, support |
| `src/game/18-net.js` | Multiplayer plaza (Supabase Realtime) |
| `supabase/migrations/` | Database tables and security rules |

## Before a real launch

- **The economy still runs in the browser.** Saves are protected per account, but a player can edit their own save (pearls, pulls) with developer tools. Moving summons and purchases to server functions (Supabase Edge Functions) is the next step before real money is involved.
- Multiplayer has no moderation or rate limits yet (chat filter, mute/report).
- Write the terms of service and privacy policy (the title screen has placeholders).
