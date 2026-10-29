import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import MagicString, { Bundle } from 'magic-string';

/*
 * The game code lives in src/game/NN-name.js. The files are joined in name order into one
 * module ("virtual:game"), so they share one scope exactly like the old single <script>.
 * Source maps point errors back to the right file and line.
 */
const GAME_DIR = path.resolve('src/game');
const VIRTUAL_ID = 'virtual:game', RESOLVED_ID = '\0virtual:game.js';
const gameFiles = () => fs.readdirSync(GAME_DIR).filter(f => /^\d+-[\w-]+\.js$/.test(f)).sort();

function gamePlugin() {
  return {
    name: 'blank-game',
    resolveId(id) { if (id === VIRTUAL_ID) return RESOLVED_ID; },
    load(id) {
      if (id !== RESOLVED_ID) return;
      const bundle = new Bundle({ separator: '\n' }), names = new Set();
      for (const f of gameFiles()) {
        const file = path.join(GAME_DIR, f), code = fs.readFileSync(file, 'utf8');
        this.addWatchFile(file);
        bundle.addSource({ filename: file, content: new MagicString(code) });
        for (const m of code.matchAll(/^(?:async\s+)?(?:function\*?|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
        // top-level const/let, including "let a = 1, b = 2" (only lines that start at column 0)
        for (const line of code.match(/^(?:const|let)\s.*$/gm) || [])
          for (const m of line.matchAll(/(?:^(?:const|let)\s+|,\s*)([A-Za-z_$][\w$]*)\s*=(?!=)/g)) names.add(m[1]);
      }
      // dev builds expose the top-level names on window, for the console and browser tests
      bundle.append(`\nif (import.meta.env.DEV || import.meta.env.VITE_DEBUG_GLOBALS === 'true') {\n  for (const [k, get] of Object.entries({ ${[...names].map(n => `${n}: () => ${n}`).join(', ')} })) {\n    try { Object.defineProperty(window, k, { get, configurable: true }); } catch (e) {}\n  }\n}\n`);
      return { code: bundle.toString(), map: bundle.generateMap({ hires: true, includeContent: true }) };
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(GAME_DIR)) { server.ws.send({ type: 'full-reload' }); return []; }
    }
  };
}

export default defineConfig({
  base: './',            // relative asset paths: works on GitHub Pages sub-folders and any static host
  plugins: [gamePlugin()],
  build: { sourcemap: true, chunkSizeWarningLimit: 1500 }
});
