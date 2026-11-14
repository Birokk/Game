/* ---------- Home: the mini banner carousel ----------
   The home screen's left column shows every active banner as a mini banner (the owner asked for more than the limited
   one): the summon banners that are open (Limited, Weekly, Step-Up, Beginner, Outfit), live special offers, the live
   events (Mystery Fountain, the admin's events, and the daily ones only while something is left to claim: Daily Login,
   Monthly Sign-in, Scratch cards). Only summon banners, offers and events: no battles or the battle pass (the owner's
   rule; Pearl Honor, the Arena and the Guild Boss have their own buttons). One banner shows at a time; ‹ › arrows and
   dots move between them, a swipe too, and they advance by themselves every HB_MS while the home screen is really in view
   (not covered by another screen or window, the tab visible, not hovered, not just moved by hand).
   hmBanners() builds the list; renderHomeBanners() (end of renderMenu) only rebuilds the markup when the list changes,
   otherwise it just refreshes the timers, so the slide doesn't jump on every redraw. */
const HB_MS = 5000, HB_PAUSE_MS = 9000;
let hbI = 0, hbSig = '', hbHold = 0, hbHover = false, hbList = [];
const hbLeft = t => { if (!t) return ''; const ms = t - Date.now(); return ms <= 0 ? 'Ended' : dhLeft(ms); };
function hmBanners() {
  const L = [], now = Date.now();
  const sumB = (bk, kind, col) => {
    if (!bannerKeys().includes(bk) || !bannerOpen(bk)) return;
    const B = bannerInfo(bk); if (B.ends && B.ends < now) return;
    if (bk === 'skins' && !B.feat) return;   // the Outfit banner only gets a banner while it features an outfit
    const e = B.feat || (B.ur || []).find(x => baseArt(x)) || (B.ur || [])[0];
    const sub = bk === 'stepup' ? `Step ${Math.min(STEP_N, stepIdx() + 1)} of ${STEP_N}` : bk === 'beginner' ? `${beginLeft()} beginner pulls left` : bk === 'weekly' ? 'A new UR every Monday' : B.feat ? 'Rate up' : '';
    L.push({ id: 'b:' + bk, kind, col, ic: 'summon', title: e ? e.name : B.title, sub, ends: B.ends, art: e ? baseArt(e) : null, dot: bk === 'limited' && (canPull(10, bk) || freeReady(bk)), go: () => openSummon(bk) });
  };
  sumB('limited', 'Limited summon', '#ff6f91');
  liveOffers().forEach(o => L.push({ id: 'o:' + o.id, kind: 'Special offer', col: '#ff9ad8', ic: 'offer', title: o.name, sub: offerLeftTxt(o), art: MEDIA.get('offer:bg:' + o.id), png: MEDIA.get('offer:png:' + o.id), go: () => openOffer(o.id) }));
  eventList().filter(eventLive).forEach(e => {
    const go = () => openEvents(e.id);
    if (e.id === 'mystery') { const sk = mboxSkin(); L.push({ id: 'e:mystery', kind: 'Event', col: '#9ad8ff', ic: 'fountain', title: e.name, sub: sk ? `Premium outfit · ${sk.name}` : 'Make a wish', ends: eventEnd(e), art: (sk && baseArt(sk)) || MEDIA.get('ev:mystery'), go }); return; }
    if (e.id === 'login') { if (loginReady()) L.push({ id: 'e:login', kind: 'Daily', col: '#ffd36b', ic: 'calendar', title: 'Daily Login', sub: 'Today’s reward is waiting', art: MEDIA.get('ev:login'), dot: true, go }); return; }
    if (e.id === 'msign') { if (msignDot()) L.push({ id: 'e:msign', kind: 'Daily', col: '#c8a2ff', ic: 'calendar', title: 'Monthly Sign-in', sub: msignReady() ? 'Sign in for today' : 'A sign-in bonus is ready', art: MEDIA.get('ev:msign') || MEDIA.get('msign:art'), dot: true, go }); return; }
    if (e.id === 'scratch') { const left = SCRATCH_DAILY - ((S.scratch && S.scratch.day === dayKey() && S.scratch.n) || 0); if (left > 0) L.push({ id: 'e:scratch', kind: 'Daily', col: '#ffcf6a', ic: 'star', title: 'Scratch Cards', sub: `${left} cards left today`, art: MEDIA.get('ev:scratch'), go }); return; }
    L.push({ id: 'e:' + e.id, kind: 'Event', col: '#ff8fc8', ic: 'calendar', title: e.name, sub: e.sub || '', ends: eventEnd(e), art: MEDIA.get('ev:' + e.id), go });
  });
  sumB('weekly', 'Weekly spotlight', '#5aa9ff');
  sumB('stepup', 'Step-Up summon', '#ffb84a');
  sumB('beginner', 'Beginner banner', '#4fd1a5');
  sumB('skins', 'Outfit banner', '#ff7ccf');
  return L;
}
function hbCardHTML(b, i) {
  return `<button class="hbx-card" data-hb="${i}" style="--hc:${b.col}" aria-label="${esc(b.kind)}: ${esc(b.title)}${b.sub ? ', ' + esc(b.sub) : ''}" ${i === hbI ? '' : 'tabindex="-1"'}>
    <span class="hbx-art">${b.art ? `<img src="${b.art}" alt="" loading="lazy">` : `<span class="hbx-draw">${icon(b.ic)}</span>`}${b.png ? `<img class="hbx-png" src="${b.png}" alt="">` : ''}</span>
    <span class="hbx-shade"></span>
    <span class="hbx-kind">${icon(b.ic)}${esc(b.kind)}</span>
    <span class="hbx-t"><b>${esc(b.title)}</b>${b.sub ? `<small>${esc(b.sub)}</small>` : ''}</span>
    ${b.ends ? `<span class="hbx-time" data-hbt="${b.ends}">${icon('clock')}<i>${hbLeft(b.ends)}</i></span>` : ''}
    ${b.dot ? '<span class="dot-n"></span>' : ''}</button>`;
}
function renderHomeBanners() {
  const box = document.getElementById('promo'); if (!box) return;
  const L = hbList = hmBanners(), sig = L.map(b => [b.id, b.title, b.sub, b.art ? 1 : 0, b.png ? 1 : 0, b.dot ? 1 : 0].join('|')).join('/');
  if (!L.length) { box.innerHTML = ''; hbSig = ''; return; }
  if (hbI >= L.length) hbI = 0;
  if (sig === hbSig && box.querySelector('.hbx')) { box.querySelectorAll('[data-hbt]').forEach(t => { const i = t.querySelector('i'); if (i) i.textContent = hbLeft(+t.dataset.hbt); }); return; }
  hbSig = sig;
  box.innerHTML = `<div class="hbx" role="region" aria-roledescription="carousel" aria-label="Active banners and events">
      <div class="hbx-view"><div class="hbx-track" style="--hb:${hbI}">${L.map(hbCardHTML).join('')}</div></div>
      ${L.length > 1 ? `<button class="hbx-arr l" data-hbm="-1" aria-label="Previous banner">${icon('back')}</button><button class="hbx-arr r" data-hbm="1" aria-label="Next banner">${icon('back')}</button>
      <div class="hbx-dots" role="tablist" aria-label="Choose a banner">${L.map((b, i) => `<button class="hbx-dot ${i === hbI ? 'on' : ''}" data-hbd="${i}" role="tab" aria-selected="${i === hbI}" aria-label="${esc(b.title)}" style="--hc:${b.col}"></button>`).join('')}</div>` : ''}</div>`;
  const x = box.querySelector('.hbx');
  x.querySelectorAll('[data-hb]').forEach(c => c.onclick = e => { if (x._drag) { e.preventDefault(); return; } const b = hbList[+c.dataset.hb]; if (b) b.go(); });
  x.querySelectorAll('[data-hbm]').forEach(a => a.onclick = e => { e.stopPropagation(); hbGo(hbI + +a.dataset.hbm, true); });
  x.querySelectorAll('[data-hbd]').forEach(d => d.onclick = e => { e.stopPropagation(); hbGo(+d.dataset.hbd, true); });
  x.onpointerenter = () => { hbHover = true; }; x.onpointerleave = () => { hbHover = false; };
  x.addEventListener('focusin', () => { hbHover = true; }); x.addEventListener('focusout', () => { hbHover = false; });
  // swipe: a horizontal drag of 36 px or more moves one banner (and doesn't count as a tap)
  let sx = 0, sy = 0, on = false;
  x.onpointerdown = e => { on = true; sx = e.clientX; sy = e.clientY; x._drag = false; };
  x.onpointermove = e => { if (on && Math.abs(e.clientX - sx) > 12 && Math.abs(e.clientX - sx) > Math.abs(e.clientY - sy)) x._drag = true; };
  x.onpointerup = e => { if (!on) return; on = false; const dx = e.clientX - sx; if (x._drag && Math.abs(dx) >= 36) hbGo(hbI + (dx < 0 ? 1 : -1), true); setTimeout(() => { x._drag = false; }, 0); };
  x.onpointercancel = () => { on = false; x._drag = false; };
}
function hbGo(i, byHand) {
  const n = hbList.length; if (n < 2) return;
  hbI = (i % n + n) % n;
  if (byHand) hbHold = Date.now() + HB_PAUSE_MS;
  const x = document.querySelector('#promo .hbx'); if (!x) return;
  x.querySelector('.hbx-track').style.setProperty('--hb', hbI);
  x.querySelectorAll('.hbx-dot').forEach((d, k) => { d.classList.toggle('on', k === hbI); d.setAttribute('aria-selected', k === hbI); });
  x.querySelectorAll('.hbx-card').forEach((c, k) => c.tabIndex = k === hbI ? 0 : -1);
}
/* is the carousel really on screen (home open, nothing covering its middle, tab visible)? */
function hbInView() {
  const x = document.querySelector('#promo .hbx'); if (!x || !menuOpen || uiHidden || document.hidden) return false;
  const r = x.getBoundingClientRect(); if (!r.width) return false;
  const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height * .45);
  return !!el && x.contains(el);
}
setInterval(() => { if (hbHover || Date.now() < hbHold || hbList.length < 2 || !hbInView()) return; hbGo(hbI + 1); }, HB_MS);
