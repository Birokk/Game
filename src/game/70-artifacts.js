/* ---------- Ancient Artifacts (the owner's ask) ----------
   A showcase of the ancient artifacts you find in the game, on shelves: the page (openArtifacts, home row under the
   profile → Artifacts) shows the admin's shelf wallpaper (`artifacts:bg`, admin → Ancient Artifacts, with Adjust position;
   without one a drawn display cabinet) with every artifact standing where the admin placed it (S.farmLayout['af:<id>'] =
   {x, y} = the bottom middle of the icon, % of the 16:9 stage; size S.farmLayout['afs:<id>'] = {w}, % of the stage width).
   Not owned = black and white, owned = in colour with a glow. Tapping one opens its power (afPop).
   Icons: icon slots `af-<id>` (admin → Ancient Artifacts, or the default drawing AF_ART).
   Owning one (S.artifacts = {id: time owned}, player save) gives its power:
   - Last Stand: once a match, when your hero would fall it revives with 1 HP (the leader bonus `last`, ccHit in 44)
   - Emperor's Artifact: 8 Arena battles every 12 hours instead of 5, for good (arTickets in 61)
   - Cleopatra's Necklace: +10% gold from the game's modes (afGold): Card Battle match gold, gold raids (battles and instant
     clears, rollGold), the guild boss, expeditions and the Base's Market. Not on gold bought or given as a reward (shop,
     packs, offers, Pearl Honor, memberships, VIP, levels, quests, mail, login, spin, summons)
   They can't be obtained yet: only admin → Ancient Artifacts / Test tools give them. */
const ARTIFACTS = [
  { id: 'laststand', name: 'Last Stand', kind: 'Battle', col: '#ff7a8f', where: 'Every Card Battle',
    power: 'If your hero would fall, it revives with <b>1 HP</b>. Once a match, in every Card Battle.',
    lore: 'A crimson heart sealed in phoenix gold. It is said to beat once more for those who refuse to fall.' },
  { id: 'emperor', name: "Emperor's Artifact", kind: 'Arena', col: '#ffd36b', where: 'The Arena',
    power: 'You get <b>8 Arena battles</b> every 12 hours instead of 5. For good.',
    lore: 'The orb of a forgotten emperor. Whoever holds it is never refused a challenge.' },
  { id: 'cleo', name: "Cleopatra's Necklace", kind: 'Gold', col: '#3fd8c4', where: 'Card Battles, gold raids, the guild boss, expeditions and the Market',
    power: 'You get <b>10% more gold</b> from every mode: Card Battle matches, gold raids (battles and instant clears), the guild boss, expeditions and the Base\'s Market. Gold you buy or get as a reward (shop, Pearl Honor, memberships, quests…) is not raised.',
    lore: 'A collar of gold, lapis and turquoise from the last queen of the Nile. Coins seem to find their way to whoever wears it.' }
];
const AF_GOLD = .1;   // Cleopatra's Necklace
const afGold = n => typeof artOwned === 'function' && artOwned('cleo') && n > 0 ? Math.round(n * AF_GOLD) : 0;
const AF_DEF_POS = { laststand: { x: 40, y: 33.5 }, emperor: { x: 60, y: 33.5 }, cleo: { x: 50, y: 62 } }, AF_DEF_W = 11;
const afOf = id => ARTIFACTS.find(a => a.id === id);
const afState = () => (S.artifacts = S.artifacts && typeof S.artifacts === 'object' ? S.artifacts : {});
const artOwned = id => !!afState()[id];
const afCount = () => ARTIFACTS.filter(a => artOwned(a.id)).length;
const afPos = id => ({ ...(AF_DEF_POS[id] || { x: 50, y: 33.5 }), ...((S.farmLayout || {})['af:' + id] || {}) });
const afW = id => ((S.farmLayout || {})['afs:' + id] || {}).w || AF_DEF_W;
function afGive(id, on = true) { const st = afState(); if (on) st[id] = st[id] || Date.now(); else delete st[id]; persist(); if (afEl) renderArtifacts(); }

/* default drawings (120×120), used until the admin uploads an icon */
const AF_ART = {
  laststand: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs>
    <linearGradient id="afLsG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset=".5" stop-color="#e9b44c"/><stop offset="1" stop-color="#8a5a1c"/></linearGradient>
    <radialGradient id="afLsH" cx=".42" cy=".35" r=".75"><stop offset="0" stop-color="#ffd0da"/><stop offset=".35" stop-color="#ff4d6d"/><stop offset=".8" stop-color="#a3102e"/><stop offset="1" stop-color="#5c0618"/></radialGradient>
    <radialGradient id="afLsA" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff6d86" stop-opacity=".55"/><stop offset="1" stop-color="#ff6d86" stop-opacity="0"/></radialGradient></defs>
    <circle cx="60" cy="54" r="46" fill="url(#afLsA)"/>
    <path d="M38 104h44l-6-12H44z" fill="url(#afLsG)"/><path d="M34 110h52v-6H34z" fill="#6b4414"/><path d="M47 92h26l-4-10H51z" fill="#b98232"/>
    <path d="M58 70C44 62 22 56 10 30c14 8 22 6 30 14-8-12-4-20-2-30 6 14 10 22 20 32z" fill="url(#afLsG)" stroke="#6b4414" stroke-width="1.5"/>
    <path d="M62 70c14-8 36-14 48-40-14 8-22 6-30 14 8-12 4-20 2-30-6 14-10 22-20 32z" fill="url(#afLsG)" stroke="#6b4414" stroke-width="1.5"/>
    <path d="M60 86C40 72 34 62 34 52c0-9 7-15 14-15 6 0 10 4 12 8 2-4 6-8 12-8 7 0 14 6 14 15 0 10-6 20-26 34z" fill="url(#afLsH)" stroke="#ffd98a" stroke-width="2.4"/>
    <path d="M44 48c2-5 7-7 11-5" stroke="#fff" stroke-opacity=".75" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M60 46l-4 10h8l-5 12" stroke="#ffe7ad" stroke-width="2" fill="none" stroke-linejoin="round" opacity=".8"/>
    <path d="M60 30c-4-6 0-10 0-14 4 4 7 8 3 14z" fill="#ffb347"/><path d="M60 30c-2-3 0-6 0-8 2 2 3 5 1 8z" fill="#fff3c4"/></svg>`,
  emperor: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs>
    <radialGradient id="afEmO" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#ffd76a"/><stop offset=".8" stop-color="#b07a1e"/><stop offset="1" stop-color="#6b440c"/></radialGradient>
    <linearGradient id="afEmC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d5bd6"/><stop offset="1" stop-color="#3b1d6e"/></linearGradient>
    <radialGradient id="afEmA" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe08a" stop-opacity=".55"/><stop offset="1" stop-color="#ffe08a" stop-opacity="0"/></radialGradient></defs>
    <circle cx="60" cy="58" r="46" fill="url(#afEmA)"/>
    <path d="M18 100c0-10 18-14 42-14s42 4 42 14c0 6-18 10-42 10s-42-4-42-10z" fill="url(#afEmC)" stroke="#d7b8ff" stroke-width="1.4"/>
    <path d="M24 100c8 4 22 6 36 6s28-2 36-6" stroke="#f7d774" stroke-width="2" fill="none"/>
    <circle cx="22" cy="100" r="3" fill="#f7d774"/><circle cx="98" cy="100" r="3" fill="#f7d774"/>
    <circle cx="60" cy="64" r="26" fill="url(#afEmO)" stroke="#6b440c" stroke-width="1.6"/>
    <path d="M34 64h52" stroke="#7a4d10" stroke-width="5"/><path d="M34 64h52" stroke="#ffe9a8" stroke-width="1.6"/>
    <path d="M60 38v52" stroke="#7a4d10" stroke-width="4" opacity=".65"/>
    <circle cx="47" cy="64" r="3.4" fill="#e8344f"/><circle cx="60" cy="64" r="4" fill="#3ec8ff"/><circle cx="73" cy="64" r="3.4" fill="#3fd47e"/>
    <path d="M44 52c3-6 9-9 14-9" stroke="#fff" stroke-opacity=".8" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M56 38V26h8v12z" fill="url(#afEmO)" stroke="#6b440c" stroke-width="1.2"/><path d="M50 28h20v-6H50z" fill="url(#afEmO)" stroke="#6b440c" stroke-width="1.2"/>
    <path d="M46 40l4-8 5 5 5-8 5 8 5-5 4 8z" fill="#f7d774" stroke="#6b440c" stroke-width="1.2"/><circle cx="60" cy="16" r="3" fill="#e8344f" stroke="#6b440c"/></svg>`,
  cleo: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs>
    <linearGradient id="afClG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4c2"/><stop offset=".5" stop-color="#e8b84a"/><stop offset="1" stop-color="#8a5a16"/></linearGradient>
    <linearGradient id="afClL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b7bff"/><stop offset="1" stop-color="#1c2a8a"/></linearGradient>
    <linearGradient id="afClT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ff5e6"/><stop offset="1" stop-color="#1a9e8e"/></linearGradient>
    <radialGradient id="afClA" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#3fd8c4" stop-opacity=".5"/><stop offset="1" stop-color="#3fd8c4" stop-opacity="0"/></radialGradient></defs>
    <circle cx="60" cy="56" r="48" fill="url(#afClA)"/>
    <path d="M30 104h60l-5-8H35z" fill="url(#afClG)"/><path d="M26 110h68v-6H26z" fill="#6b4414"/>
    <path d="M60 96c-14 0-22-8-26-20l8-3c3 8 9 13 18 13s15-5 18-13l8 3c-4 12-12 20-26 20z" fill="#c9cfd8" opacity=".25"/>
    <path d="M14 30c0 30 20 52 46 52s46-22 46-52h-12c0 24-15 40-34 40S26 54 26 30z" fill="url(#afClG)" stroke="#6b4414" stroke-width="1.4"/>
    <path d="M20 30c1 26 18 46 40 46s39-20 40-46h-5c-1 22-15 40-35 40S26 52 25 30z" fill="url(#afClL)"/>
    <path d="M26 30c1 20 14 36 34 36s33-16 34-36" fill="none" stroke="url(#afClT)" stroke-width="5"/>
    <path d="M31 30c1 16 12 30 29 30s28-14 29-30" fill="none" stroke="#f7d774" stroke-width="2.4" stroke-dasharray="2.6 3"/>
    <g fill="url(#afClT)" stroke="#6b4414" stroke-width=".8"><path d="M20 76l-4 8 6-2z"/><path d="M32 84l-2 9 5-4z"/><path d="M88 84l2 9-5-4z"/><path d="M100 76l4 8-6-2z"/></g>
    <path d="M14 30h12M94 30h12" stroke="#6b4414" stroke-width="1.4"/>
    <ellipse cx="60" cy="88" rx="10" ry="12" fill="url(#afClT)" stroke="#6b4414" stroke-width="1.6"/>
    <path d="M60 77v22M51 86c-6-2-10-1-13 2M69 86c6-2 10-1 13 2" stroke="#6b4414" stroke-width="1.4" fill="none"/>
    <path d="M38 88c-4 0-8 3-9 7 5-1 8-3 9-7zM82 88c4 0 8 3 9 7-5-1-8-3-9-7z" fill="url(#afClG)" stroke="#6b4414" stroke-width="1"/>
    <circle cx="60" cy="73" r="4.4" fill="#e8344f" stroke="#ffe7ad" stroke-width="1.4"/>
    <path d="M55 84c1-3 3-4 5-4" stroke="#fff" stroke-opacity=".8" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M30 40c4 10 10 16 16 19" stroke="#fff" stroke-opacity=".45" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>`
};
const afIcon = a => { const u = customIcon('af-' + a.id); return u ? `<img src="${u}" alt="">` : AF_ART[a.id] || icon('sparkle'); };

/* the drawn display cabinet, until the admin uploads a shelf wallpaper (1600×900, three shelves with their tops at 33.5 / 62 / 90.5%) */
const AF_SHELF_SVG = (() => {
  const shelf = y => `<rect x="150" y="${y}" width="1300" height="26" fill="url(#afsP)"/><rect x="150" y="${y}" width="1300" height="4" fill="#f4c98a" opacity=".55"/><rect x="150" y="${y + 26}" width="1300" height="40" fill="url(#afsS)"/>`;
  const spot = x => `<path d="M${x - 30} 70 L${x - 190} 820 L${x + 190} 820 L${x + 30} 70z" fill="url(#afsL)" opacity=".55"/>`;
  return `<svg class="afx-def" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
    <linearGradient id="afsW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a2e"/><stop offset="1" stop-color="#120b18"/></linearGradient>
    <linearGradient id="afsB" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2b1530"/><stop offset=".5" stop-color="#3d2142"/><stop offset="1" stop-color="#2b1530"/></linearGradient>
    <linearGradient id="afsP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a06a3a"/><stop offset="1" stop-color="#5a3316"/></linearGradient>
    <linearGradient id="afsS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
    <linearGradient id="afsF" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a2a17"/><stop offset=".5" stop-color="#7d4b25"/><stop offset="1" stop-color="#4a2a17"/></linearGradient>
    <linearGradient id="afsL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7b8" stop-opacity=".5"/><stop offset="1" stop-color="#ffe7b8" stop-opacity="0"/></linearGradient>
    <pattern id="afsT" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M30 6l6 24-6 24-6-24z" fill="#ffffff" opacity=".025"/></pattern></defs>
    <rect width="1600" height="900" fill="url(#afsW)"/><rect width="1600" height="900" fill="url(#afsT)"/>
    <rect x="120" y="40" width="1360" height="860" rx="10" fill="url(#afsF)"/><rect x="150" y="70" width="1300" height="830" fill="url(#afsB)"/>
    <path d="M150 70h1300v830H150z" fill="none" stroke="#f4c98a" stroke-opacity=".25" stroke-width="3"/>
    ${[560, 1040].map(spot).join('')}${[301, 558, 815].map(shelf).join('')}
    ${[540, 800, 1060].map(x => `<circle cx="${x}" cy="56" r="7" fill="#ffe7b8"/><circle cx="${x}" cy="56" r="22" fill="#ffe7b8" opacity=".18"/>`).join('')}
    <path d="M150 70l260 830h-80L150 300z" fill="#fff" opacity=".035"/><path d="M900 70l200 830h-40L860 70z" fill="#fff" opacity=".03"/></svg>`;
})();

/* the 16:9 stage: wallpaper (or the drawn cabinet) and every artifact; edit = the admin preview (drag the artifacts) */
function afStageHTML(edit) {
  const bg = MEDIA.get('artifacts:bg') ? artImgClip('artifacts:bg', 'afx-wp') : AF_SHELF_SVG;
  return `<div class="afx-stage ${edit ? 'edit' : ''}" ${edit ? 'id="afPrev"' : ''}>${bg}${ARTIFACTS.map(a => { const p = afPos(a.id), own = artOwned(a.id);
    return `<button class="afx-it ${own ? 'own' : ''}" style="--x:${p.x};--y:${p.y};--w:${afW(a.id)};--ac:${a.col}" ${edit ? `data-afdrag="${a.id}"` : `data-afit="${a.id}"`} aria-label="${esc(a.name)}${own ? '' : ' (not found yet)'}">
      <span class="afx-ic">${afIcon(a)}</span><span class="afx-pl"><b>${esc(a.name)}</b>${own ? '' : '<small>Not found</small>'}</span></button>`; }).join('')}</div>`;
}

let afEl = null;
function openArtifacts() {
  if (afEl) afEl.remove();
  afEl = document.createElement('div'); afEl.className = 'afx'; afEl.setAttribute('role', 'dialog'); afEl.setAttribute('aria-label', 'Ancient Artifacts');
  document.body.appendChild(afEl); renderArtifacts();
  const b = afEl.querySelector('.afx-body'); if (b) b.scrollLeft = (b.scrollWidth - b.clientWidth) / 2;   // portrait phones: the shelf scrolls sideways, start in the middle
}
function closeArtifacts() { if (afEl) { afEl.remove(); afEl = null; } document.querySelectorAll('.afp').forEach(e => e.remove()); }
function renderArtifacts() {
  if (!afEl) return;
  const keep = afEl.querySelector('.afx-body'), sx = keep ? keep.scrollLeft : null;
  afEl.innerHTML = `<div class="afx-bg">${MEDIA.get('artifacts:bg') ? artImg('artifacts:bg') : ''}</div>
    <header class="afx-head"><div class="inv-title"><span class="inv-badge">${icon('artifact')}</span><h2 class="ts">Ancient Artifacts</h2></div>
      <span class="afx-n">${icon('sparkle')}<b>${afCount()}</b> / ${ARTIFACTS.length} found</span><span class="afx-hint">Tap an artifact to see its power</span>
      <span class="afx-sp"></span>${infoBtn('artifacts')}${canAdmin() ? `<button class="sx-btn afx-adm" id="afAdm" title="Admin: the shelf wallpaper, the icons and where they stand">${icon('wrench')}<span>Arrange</span></button>` : ''}
      <button class="inv-x" id="afX" aria-label="Close">${icon('close')}</button></header>
    <div class="afx-body">${afStageHTML(false)}</div>`;
  if (sx != null) afEl.querySelector('.afx-body').scrollLeft = sx;
  afEl.querySelector('#afX').onclick = closeArtifacts;
  const ad = afEl.querySelector('#afAdm'); if (ad) ad.onclick = () => openAdmin('artifacts');
  afEl.querySelectorAll('[data-afit]').forEach(b => b.onclick = () => afPop(b.dataset.afit));
}
/* an artifact's power, in a glass popup over the shelf */
function afPop(id) {
  const a = afOf(id); if (!a) return;
  document.querySelectorAll('.afp').forEach(e => e.remove());
  const own = artOwned(id), t = afState()[id];
  const el = document.createElement('div'); el.className = 'rdrop afp'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', a.name);
  el.innerHTML = `<div class="rdrop-box afp-box ${own ? 'own' : ''}" style="--ac:${a.col}">
    <button class="inv-x afp-x" data-afpx aria-label="Close">${icon('close')}</button>
    <div class="afp-art"><span class="afp-ring"></span><span class="afx-ic">${afIcon(a)}</span></div>
    <div class="afp-hd"><small>Ancient artifact · ${esc(a.kind)}</small><h2 class="ts">${esc(a.name)}</h2>
      <span class="afp-st ${own ? 'on' : ''}">${own ? `${icon('check')}Owned${typeof t === 'number' ? ` · since ${new Date(t).toLocaleDateString()}` : ''}` : `${icon('lock')}Not found yet`}</span></div>
    <div class="afp-pow"><span class="lbl-sm">Power</span><p>${a.power}</p><small>${icon('swords')}Works in: ${esc(a.where)}${own ? ' · active' : ''}</small></div>
    <p class="afp-lore">${esc(a.lore)}</p>
    ${own ? '' : '<p class="tiny afp-how">Ancient artifacts can\'t be found yet: the ways to get them are coming in a later update.</p>'}
    ${canAdmin() ? `<button class="btn ghost sm" data-afgive>${icon('wrench')}Admin: ${own ? 'take it away' : 'give it to me'}</button>` : ''}</div>`;
  const close = () => el.remove();
  el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-afpx]')) close(); });
  const g = el.querySelector('[data-afgive]'); if (g) g.onclick = () => { afGive(id, !own); close(); afPop(id); toast(`${a.name}: ${own ? 'removed' : 'owned'} (test).`); };
  document.body.appendChild(el);
}
addEventListener('keydown', e => { if (!afEl || e.key !== 'Escape' || document.querySelector('.modal-back')) return; e.stopPropagation(); const p = document.querySelector('.afp'); if (p) p.remove(); else closeArtifacts(); }, true);

INFO.artifacts = () => ({ title: 'Ancient Artifacts', body: `<p class="desc">Ancient artifacts are rare relics you find in the game. Each one you own stands in colour on the shelves and gives its power for good; the ones you haven't found yet stand in black and white.</p>
  <ul class="desc">${ARTIFACTS.map(a => `<li><b>${esc(a.name)}</b>: ${a.power}</li>`).join('')}</ul><p class="tiny">They can't be found yet: the ways to get them come in a later update.</p>` });

/* ---------- admin → Ancient Artifacts: the shelf wallpaper, each icon, where it stands and how big ---------- */
function renderArtifactsTab() {
  const p = $('#adPanel'); if (!p) return;
  const has = !!MEDIA.get('artifacts:bg');
  p.innerHTML = `<div class="stack"><p class="tiny">The Ancient Artifacts page shows this wallpaper as a 16:9 shelf display (1920×1080 best). Drag the artifacts on the preview to stand them on your shelves: the point you place is the middle of the artifact's <b>bottom edge</b>. Not owned = black and white, owned = colour.</p>
    <div class="setx-list ad-art">${setRow('Shelf wallpaper', `<label class="sx-btn">${icon('upload')}${has ? 'Replace' : 'Upload'}<input type="file" accept="image/*" class="sr" id="afBgUp"></label>${has ? `${artFrameBtn('artifacts:bg', 'stage', 'Ancient Artifacts')}<button type="button" class="sx-btn" id="afBgDel">${icon('trash')}Default</button>` : ''}`, has ? 'Your shelf picture' : 'Without one a drawn display cabinet')}</div>
    <div class="afa-prev">${afStageHTML(true)}</div>
    <div class="afa-list">${ARTIFACTS.map(a => { const q = afPos(a.id), w = afW(a.id), up = customIcon('af-' + a.id);
      return `<div class="afa-row"><span class="afa-ic ${artOwned(a.id) ? 'own' : ''}">${afIcon(a)}</span>
        <div class="afa-f"><b>${esc(a.name)}</b><small>${a.power}</small>
          <div class="afa-btns"><label class="sx-btn">${icon('upload')}${up ? 'Replace icon' : 'Upload icon'}<input type="file" accept="image/*" class="sr" data-iconup="af-${a.id}"></label>${up ? `<button type="button" class="sx-btn" data-iconreset="af-${a.id}">${icon('trash')}Default icon</button>` : ''}
            <button type="button" class="sx-btn" data-afown="${a.id}">${icon(artOwned(a.id) ? 'check' : 'lock')}${artOwned(a.id) ? 'Owned (test) · remove' : 'Give it to me (test)'}</button></div></div>
        <div class="afa-sl">${[['x', 'Left / right', q.x, 0, 100], ['y', 'Up / down', q.y, 0, 100], ['w', 'Size', w, 3, 40]].map(([k, n, v, lo, hi]) => `<label><span>${n}</span><input type="range" min="${lo}" max="${hi}" step=".5" value="${v}" data-afk="${k}" data-afid="${a.id}"><em>${v}%</em></label>`).join('')}</div></div>`; }).join('')}</div>
    <div class="row" style="gap:8px"><button class="btn ghost sm" id="afPosReset">${icon('refresh')}Default places and sizes</button><button class="btn sm" id="afOpen">${icon('artifact')}Open the page</button></div></div>`;
  const setPos = (id, x, y, save) => {
    S.farmLayout = { ...(S.farmLayout || {}), ['af:' + id]: { x: Math.round(clamp(x, 0, 100) * 2) / 2, y: Math.round(clamp(y, 0, 100) * 2) / 2 } };
    const q = afPos(id), it = p.querySelector(`[data-afdrag="${id}"]`); it.style.setProperty('--x', q.x); it.style.setProperty('--y', q.y);
    p.querySelectorAll(`[data-afid="${id}"]`).forEach(i => { if (i.dataset.afk !== 'w') { i.value = q[i.dataset.afk]; i.nextElementSibling.textContent = q[i.dataset.afk] + '%'; } });
    if (save) { persist(); if (afEl) renderArtifacts(); }
  };
  p.querySelectorAll('[data-afk]').forEach(i => { const id = i.dataset.afid;
    i.oninput = () => { i.nextElementSibling.textContent = i.value + '%'; if (i.dataset.afk === 'w') { S.farmLayout = { ...(S.farmLayout || {}), ['afs:' + id]: { w: +i.value } }; p.querySelector(`[data-afdrag="${id}"]`).style.setProperty('--w', i.value); } else { const q = afPos(id); setPos(id, i.dataset.afk === 'x' ? +i.value : q.x, i.dataset.afk === 'y' ? +i.value : q.y, false); } };
    i.onchange = () => { persist(); if (afEl) renderArtifacts(); }; });
  p.querySelectorAll('[data-afdrag]').forEach(it => it.onpointerdown = e => {
    e.preventDefault(); it.setPointerCapture(e.pointerId); const box = it.parentElement, r0 = it.getBoundingClientRect(), q0 = afPos(it.dataset.afdrag);
    const offX = e.clientX - (r0.left + r0.width / 2), offY = e.clientY - r0.bottom;   // keep the grab point under the pointer
    const move = ev => { const r = box.getBoundingClientRect(); setPos(it.dataset.afdrag, (ev.clientX - offX - r.left) / r.width * 100, (ev.clientY - offY - r.top) / r.height * 100, false); };
    it.onpointermove = move; it.onpointerup = ev => { move(ev); it.onpointermove = it.onpointerup = null; const q = afPos(it.dataset.afdrag); setPos(it.dataset.afdrag, q.x, q.y, true); };
    void q0;
  });
  p.querySelectorAll('[data-afown]').forEach(b => b.onclick = () => { afGive(b.dataset.afown, !artOwned(b.dataset.afown)); renderArtifactsTab(); });
  $('#afBgUp').onchange = async ev => { try { if (await mediaSet('artifacts:bg', await resizeImage(ev.target.files[0], 1920, 'image/jpeg'))) { renderArtifactsTab(); if (afEl) renderArtifacts(); toast('Shelf wallpaper saved.'); } } catch (e) { toast(e.message, true); } };
  const del = $('#afBgDel'); if (del) del.onclick = async () => { await mediaDel('artifacts:bg'); renderArtifactsTab(); if (afEl) renderArtifacts(); toast('Back to the drawn cabinet.'); };
  $('#afPosReset').onclick = () => { const L = { ...(S.farmLayout || {}) }; Object.keys(L).filter(k => /^afs?:/.test(k)).forEach(k => delete L[k]); S.farmLayout = L; persist(); renderArtifactsTab(); if (afEl) renderArtifacts(); };
  $('#afOpen').onclick = () => { closeModal(); openArtifacts(); };
  bindAdminArt(p, () => { renderArtifactsTab(); if (afEl) renderArtifacts(); });
}
