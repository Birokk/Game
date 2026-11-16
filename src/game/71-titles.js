/* ---------- Titles v2 (the owner's ask, after reference pictures of ornate title plates) ----------
   Every title is a banner plate (pointed ends, a metal rim, bold white text with a dark outline) with ornaments in its
   theme, and its rarity tier sets how big and how lively it is:
     1 Common     small plain plate, no animation
     2 Rare       coloured plate, small side ornaments, a light sheen now and then
     3 Epic       bigger, side ornaments that sway, a faster sheen, a soft glow
     4 Legendary  bigger again, big ornaments, a crest on top, the plate's colours flowing, twinkling sparkles
     5 Mythic     the biggest: huge ornaments that flicker / flap, a crest, a pulsing aura, more sparkles
   TITLE_LOOK = {title id: [tier, theme]}; TT_THEMES = colours + ornament per theme. The ornaments are SVG pictures built
   once into a <style> (one background per theme, the right one mirrored), so a title is light markup. Places with little
   room only change the base size (--tb); the tier scale (--tk) stays, so a rarer title is still bigger everywhere. */
const TITLE_LOOK = {
  newcomer: [1, 'plain'], wanderer: [2, 'aqua'], lantern: [2, 'ember'], collector: [2, 'violet'], lucky: [3, 'lucky'],
  boxbreaker: [3, 'sweet'], 'vip-tide': [3, 'tide'], 'rk-3': [3, 'bronze'], 'rk-2': [4, 'silver'], prism: [4, 'prism'],
  'vip-monarch': [4, 'monarch'], 'rk-1': [5, 'dragon'], maxwinner: [5, 'inferno']
};
const TT_TIER = ['', 'Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
const ttLook = t => TITLE_LOOK[t && t.id] || [1, 'plain'];
const ttTier = t => ttLook(t)[0];
/* plate fill f1 → f2, rim r1 → r2, text glow g, ornament kind + its two colours, crest */
const TT_THEMES = {
  plain: { f: ['#30344c', '#1a1d2e'], r: ['#a9afcc', '#4a4f6a'], g: '#9aa4d0' },
  aqua: { f: ['#11607a', '#08283a'], r: ['#b6fff0', '#2aa58e'], g: '#7ef3d4', o: 'wave', c: ['#c8fff4', '#2fb59c'] },
  ember: { f: ['#c42a2e', '#5a0f14'], r: ['#ffe0a0', '#c0582a'], g: '#ff9a5a', o: 'lantern', c: ['#ffd36b', '#d2452a'] },
  violet: { f: ['#5a2aa8', '#22104a'], r: ['#ecd6ff', '#8a4ad8'], g: '#c58bff', o: 'stars', c: ['#fff3ff', '#c58bff'] },
  lucky: { f: ['#8a6410', '#2e1e04'], r: ['#fff3b8', '#c8901e'], g: '#ffd36b', o: 'burst', c: ['#fff6c8', '#f0a818'] },
  sweet: { f: ['#ff7ab8', '#c2307a'], r: ['#fff0f8', '#ff9ac8'], g: '#ff9ad0', o: 'sweet', c: ['#ffe4f1', '#ff6aa8'] },
  tide: { f: ['#0aa5b8', '#03404f'], r: ['#e6fffb', '#3fd8c8'], g: '#5ff0e0', o: 'wing', c: ['#e6fffb', '#2fb5c8'] },
  bronze: { f: ['#9a5226', '#3a1a08'], r: ['#ffdcc0', '#a85a2c'], g: '#ffb98a', o: 'wing', c: ['#ffe0c8', '#9a4a1c'] },
  silver: { f: ['#64708e', '#232a3c'], r: ['#ffffff', '#9aa4bd'], g: '#dfe6ff', o: 'wing', c: ['#ffffff', '#8a94b0'], crest: 'gem', cc: ['#e6f0ff', '#7aa0ff'] },
  prism: { f: ['#a855f7', '#ff6ec7', '#ffd36b', '#3ee6d0'], r: ['#ffffff', '#d8c8ff'], g: '#ffc0f0', o: 'wing', c: ['#ffe8fb', '#a98cff'], crest: 'star', cc: ['#fffbe0', '#ff8ad8'] },
  monarch: { f: ['#2048b8', '#0a1640'], r: ['#fff3b8', '#d4a030'], g: '#ffe08a', o: 'wing', c: ['#fff6d0', '#d4a030'], crest: 'crown', cc: ['#fff3b8', '#d4a030'] },
  dragon: { f: ['#c88a14', '#4a2600'], r: ['#fff6c8', '#e0a020'], g: '#ffcf5a', o: 'dragon', c: ['#ff9a3a', '#a01818'], crest: 'crown', cc: ['#fff3b8', '#e0a020'] },
  inferno: { f: ['#d81e30', '#3a0408'], r: ['#ffe0a0', '#ff5a2a'], g: '#ff6a3a', o: 'flame', c: ['#ffd36b', '#ff2a2a'], crest: 'burst', cc: ['#fff6c8', '#ff7a2a'] }
};
/* the ornaments, drawn for the LEFT end (the plate is to their right); 48×48 */
const ttOrnSvg = (o, c) => {
  const g = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs>`, k = '#1a0e1c';
  const P = {
    wing: `<path d="M47 27C35 9 19 5 3 7c10 4 16 8 20 12C13 17 7 19 1 24c10 0 16 2 20 4-8 2-14 6-18 12 12-4 22-6 30-8z" fill="url(#g)" stroke="${k}" stroke-width="1.3" stroke-linejoin="round"/><path d="M41 24C31 15 21 11 10 10M39 27c-10-3-20-4-31-3M37 30c-8 1-16 4-24 7" stroke="${c[1]}" stroke-width="1.1" fill="none" opacity=".8"/><path d="M44 25C34 13 22 9 10 9" stroke="#fff" stroke-width="1.2" fill="none" opacity=".7"/>`,
    dragon: `<path d="M47 25L31 5l-2 9-8-9-1 10-9-7 1 10L2 16l8 10c12-2 22 0 37 3z" fill="url(#g)" stroke="${k}" stroke-width="1.3" stroke-linejoin="round"/><path d="M30 6l3 19M20 6l5 19M11 9l9 17" stroke="${k}" stroke-width=".9" opacity=".55"/><path d="M45 31c-7 1-11 7-18 9-5 1-10 1-13-1l6-2-5-2c7 0 11-4 16-6z" fill="#ffcf5a" stroke="${k}" stroke-width="1.2" stroke-linejoin="round"/><path d="M16 37l-5-4 2 5zM19 34l-2-5 3 3" fill="#fff6c8" stroke="${k}" stroke-width=".8"/><circle cx="19" cy="37" r="1.1" fill="#ff2a2a"/>`,
    flame: `<path d="M44 40C30 44 6 36 8 18c2 8 8 10 10 8-4-8 2-18 10-22-2 8 4 12 8 12 0-6 4-8 6-12 2 10 8 18 2 36z" fill="url(#g)" stroke="${k}" stroke-width="1.2" stroke-linejoin="round"/><path d="M40 38c-10 2-22-2-22-12 4 4 8 3 8 0-2-6 2-10 6-12 0 6 4 8 6 6 4 6 6 12 2 18z" fill="#ffe680"/><path d="M6 44L34 14M10 46L36 18" stroke="#e8ecff" stroke-width="2.2" stroke-linecap="round"/><path d="M30 12l8 0-1 7z" fill="#c8d0e8" stroke="${k}" stroke-width=".8"/><path d="M4 42l6 4" stroke="#8a5a2a" stroke-width="3" stroke-linecap="round"/>`,
    burst: `<path d="M24 2l4 14 14-6-8 13 13 5-14 4 6 13-12-8-3 14-4-14-12 8 6-13L0 24l13-5-8-13 14 6z" fill="url(#g)" stroke="${k}" stroke-width="1.2" stroke-linejoin="round"/><path d="M24 12l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="#fff"/>`,
    sweet: `<circle cx="17" cy="20" r="11" fill="url(#g)" stroke="#fff" stroke-width="1.6"/><path d="M17 20m-7 0a7 7 0 0 1 14 0 4.5 4.5 0 0 1-9 0 2 2 0 0 1 4 0" fill="none" stroke="#ff4f98" stroke-width="2.2"/><path d="M17 31l-7 15" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M38 10c-8-6-12 0-6 4-6 4-2 10 6 4zM38 10c8-6 10 2 4 4 4 5-2 8-4 4z" fill="#ffd0e6" stroke="#ff6aa8" stroke-width="1.2"/><circle cx="38" cy="12" r="2.2" fill="#ff6aa8"/><path d="M36 34l1.6 3.4 3.6.4-2.7 2.4.8 3.6-3.3-1.9-3.3 1.9.8-3.6-2.7-2.4 3.6-.4z" fill="#fff6c8" stroke="#ff9ac8" stroke-width=".8"/>`,
    wave: `<path d="M44 34C34 38 18 38 10 30 4 24 8 12 18 12c8 0 10 10 4 12-4 1-6-4-3-5" fill="none" stroke="url(#g)" stroke-width="4.4" stroke-linecap="round"/><path d="M44 34C34 38 18 38 10 30 4 24 8 12 18 12" fill="none" stroke="#fff" stroke-width="1.2" opacity=".7"/>`,
    lantern: `<path d="M24 6v6" stroke="#ffd36b" stroke-width="2"/><rect x="15" y="12" width="18" height="4" rx="1.5" fill="#8a3a14"/><path d="M14 16h20l-2 18H16z" fill="url(#g)" stroke="${k}" stroke-width="1.2"/><path d="M19 18v14M24 18v14M29 18v14" stroke="#8a3a14" stroke-width="1" opacity=".6"/><rect x="15" y="34" width="18" height="4" rx="1.5" fill="#8a3a14"/><path d="M24 38v6" stroke="#ffd36b" stroke-width="2"/>`,
    stars: `<path d="M18 6l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="url(#g)" stroke="${k}" stroke-width="1"/><path d="M36 26l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="url(#g)" stroke="${k}" stroke-width=".8"/><circle cx="34" cy="12" r="2" fill="#fff"/>`
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${g}${P[o] || ''}</svg>`;
};
const ttCrestSvg = (o, c) => {
  const g = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs>`, k = '#1a0e1c';
  const P = {
    crown: `<path d="M4 20L2 6l9 7 9-11 9 11 9-7-2 14z" fill="url(#g)" stroke="${k}" stroke-width="1.4" stroke-linejoin="round"/><circle cx="20" cy="13" r="2.6" fill="#ff3a5a" stroke="${k}" stroke-width=".8"/><circle cx="10" cy="15" r="1.6" fill="#3ec8ff"/><circle cx="30" cy="15" r="1.6" fill="#3fd47e"/><path d="M5 18h30" stroke="#fff" stroke-width="1" opacity=".7"/>`,
    gem: `<path d="M20 2l12 9-12 13L8 11z" fill="url(#g)" stroke="${k}" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 11h24M20 2l-5 9 5 13 5-13z" stroke="#fff" stroke-width=".9" fill="none" opacity=".7"/>`,
    star: `<path d="M20 1l4.6 8 9 1.6-6.4 6.6 1.4 9L20 22l-8.6 4.2 1.4-9-6.4-6.6 9-1.6z" fill="url(#g)" stroke="${k}" stroke-width="1.3" stroke-linejoin="round"/><circle cx="20" cy="13" r="3" fill="#fff"/>`,
    burst: `<path d="M20 0l3 8 8-4-4 8 9 2-8 4 6 7-9-2 0 8-5-7-5 7 0-8-9 2 6-7-8-4 9-2-4-8 8 4z" fill="url(#g)" stroke="${k}" stroke-width="1.1" stroke-linejoin="round"/><circle cx="20" cy="13" r="3.4" fill="#fff"/>`
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 28">${g}${P[o] || ''}</svg>`;
};
const ttUri = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
/* one stylesheet with each theme's colours and pictures */
(() => {
  let css = '';
  for (const [id, T] of Object.entries(TT_THEMES)) {
    const fill = T.f.length > 2 ? `linear-gradient(100deg,${T.f.join(',')},${T.f[0]})` : `linear-gradient(180deg,${T.f[0]},${T.f[1]})`;
    css += `.ttl.tt.th-${id}{--tf:${fill};--tr:linear-gradient(180deg,${T.r[0]},${T.r[1]});--tg:${T.g}}`;
    if (T.o) css += `.ttl.tt.th-${id} .tt-o{background-image:${ttUri(ttOrnSvg(T.o, T.c))}}`;
    if (T.crest) css += `.ttl.tt.th-${id} .tt-cr{background-image:${ttUri(ttCrestSvg(T.crest, T.cc))}}`;
  }
  const st = document.createElement('style'); st.id = 'ttThemes'; st.textContent = css; document.head.appendChild(st);
})();
function ttlMarkup(t) {
  const [tier, th] = ttLook(t), T = TT_THEMES[th] || TT_THEMES.plain;
  return `<span class="ttl tt tr${tier} th-${th} ${t.cls || ''}" title="${esc(t.name)} · ${TT_TIER[tier]} title">${tier >= 4 ? '<i class="tt-aura"></i>' : ''}${T.o && tier >= 2 ? '<i class="tt-o l"></i><i class="tt-o r"></i>' : ''}<span class="tt-pl"><b>${esc(t.name)}</b></span>${T.crest && tier >= 4 ? '<i class="tt-cr"></i>' : ''}${tier >= 4 ? '<i class="tt-sp"></i>' : ''}</span>`;
}
