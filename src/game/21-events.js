/* ---------- events: full-screen page with an event list on the left and the chosen event over its own wallpaper ----------
   S.events (content, edited in admin → Events): [{ id, name, sub, text, end, days }]. 'login' is the built-in 7-day sign-in
   (days = Limited tickets per day); the rest are notice events the admin adds. Wallpapers live in media keys ev:<id>. */
const LOGIN_DAYS = [1, 1, 1, 1, 1, 1, 1];
function eventList() {
  let list = Array.isArray(S.events) ? S.events : [];
  if (!list.some(e => e.id === 'login')) list = [{ id: 'login', name: 'Daily Login', sub: 'Sign in to claim rewards', days: [...LOGIN_DAYS] }, ...list];
  if (!list.some(e => e.id === 'mystery')) list = [{ id: 'mystery', name: 'Mystery Fountain', sub: 'Limited summon · 10 wishes · premium outfit inside' }, ...list];
  list.forEach(e => { if (e.id === 'mystery' && e.name === 'Mystery Box') { e.name = 'Mystery Fountain'; if (e.sub === 'Limited summon · 10 pulls · premium outfit inside') e.sub = 'Limited summon · 10 wishes · premium outfit inside'; } });   // renamed
  if (!list.some(e => e.id === 'msign')) { const i = list.findIndex(e => e.id === 'login'); list = [...list.slice(0, i + 1), { id: 'msign', name: 'Monthly Sign-in', sub: 'A reward for every day of the month', makeups: MSIGN_MAKEUPS }, ...list.slice(i + 1)]; }
  if (!list.some(e => e.id === 'scratch')) { const i = list.findIndex(e => e.id === 'login'); list = [...list.slice(0, i + 1), { id: 'scratch', name: 'Scratch Cards', sub: 'Match three icons to win pearls' }, ...list.slice(i + 1)]; }
  if (list.some(e => e.type === 'tlogin')) list = list.filter(e => e.type !== 'tlogin');   // Total Login events were removed (Daily Login took their design)
  if (list !== S.events) S.events = list;
  return list;
}
const eventOf = id => eventList().find(e => e.id === id);
const eventEnd = e => e.end ? new Date(e.end + 'T23:59:59').getTime() : null;
const EV_BUILTIN = ['mystery', 'login', 'msign', 'scratch'];
const eventLive = e => e.id === 'login' || e.id === 'msign' || e.id === 'scratch' || !eventEnd(e) || eventEnd(e) > Date.now();
/* ---------- Monthly Sign-in (built-in event 'msign') ----------
   A calendar of the current month: day N's reward is claimed ON day N (today = today's date). Missed earlier days can be
   signed in afterwards by tapping that day, for MSIGN_PEARL pearl each, up to MSIGN_MAKEUPS times a month (admin →
   Events sets the limit, msign.makeups). The month always adds up to 10 Standard tickets, 10 Limited tickets, 30 pearls
   and 50,000 gold (msignRewards spreads them over 28–31 days). Calendar art: admin upload (media key msign:art).
   State S.msign {key: 'YYYY-MM', got: [days claimed], made: make-ups used}. */
const MSIGN_PEARL = 1, MSIGN_MAKEUPS = 3, MSIGN_TOTAL = { wishes: 10, tickets: 10, pearls: 30, coins: 50000 };
const monthDays = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
/* the month's rewards, one per day: pearls on days 7, 14, 21 (5 each) and the last day (15); 20 tickets alternating
   Standard / Limited; gold on the remaining days (1, 8, 15, 22, 29 first), split so it totals 50,000 */
function msignRewards(N = monthDays()) {
  const out = Array(N + 1).fill(null), pearl = [7, 14, 21, N];
  pearl.forEach((d, i) => { out[d] = { pearls: i === 3 ? 15 : 5 }; });
  const rest = []; for (let d = 1; d <= N; d++) if (!out[d]) rest.push(d);
  const G = rest.length - 20, order = [1, 8, 15, 22, 29, 4, 11, 18, 25, 2, 9, 16, 23, 30, 5, 12, 19, 26, 3, 10, 17, 24, 31, 6, 13, 20, 27, 28];
  const gold = order.filter(d => rest.includes(d)).slice(0, G).sort((a, b) => a - b), each = Math.floor(MSIGN_TOTAL.coins / G / 500) * 500;
  gold.forEach((d, i) => { out[d] = { coins: i === G - 1 ? MSIGN_TOTAL.coins - each * (G - 1) : each }; });
  let t = 0; rest.filter(d => !gold.includes(d)).forEach(d => { out[d] = t++ % 2 ? { tickets: 1 } : { wishes: 1 }; });
  return out;
}
function msignState() { if (!S.msign || S.msign.key !== monthKey() || !Array.isArray(S.msign.got)) S.msign = { key: monthKey(), got: [], made: 0 }; return S.msign; }
const msignMakeups = () => { const m = +(eventOf('msign') || {}).makeups; return Number.isFinite(m) && m >= 0 ? Math.floor(m) : MSIGN_MAKEUPS; };
const msignToday = () => new Date().getDate();
const msignReady = () => !msignState().got.includes(msignToday());
const msignMissedDays = () => { const g = msignState().got, out = []; for (let d = 1; d < msignToday(); d++) if (!g.includes(d)) out.push(d); return out; };
const msignMakeLeft = () => Math.max(0, msignMakeups() - msignState().made);
function msignGive(r) { Object.entries(r).forEach(([k, n]) => { S.wallet[k] = (S.wallet[k] || 0) + n; }); }
function claimMsign(day = msignToday()) {
  const m = msignState(); if (day !== msignToday() || m.got.includes(day)) return;
  const r = msignRewards()[day]; m.got.push(day); msignGive(r); persist(); renderMenu(); refreshSummon(); renderEvents();
  showRewards(`Monthly Sign-in · ${monthName()} ${day}`, r, `${m.got.length} / ${monthDays()} days this month`);
}
const monthName = (d = new Date()) => d.toLocaleDateString('en-GB', { month: 'long' });
function makeupMsign(day) {
  const m = msignState(); if (!(day < msignToday()) || m.got.includes(day)) return;
  if (!msignMakeLeft()) { toast(`You've used all ${msignMakeups()} make-ups this month.`); return; }
  if (S.wallet.pearls < MSIGN_PEARL) { toast(`You need ${MSIGN_PEARL} pearl to sign in for a missed day.`); return; }
  const r = msignRewards()[day];
  openModal({ title: 'Make up a missed day', ic: 'calendar', small: true, body: `<div class="stack" style="justify-items:center;text-align:center">
    <p class="desc">Spend <b>${MSIGN_PEARL} pearl</b> to sign in for <b>${monthName()} ${day}</b> and claim its reward? ${msignMakeLeft()} make-up${msignMakeLeft() === 1 ? '' : 's'} left this month.</p>
    <div class="rew-row">${Object.entries(r).map(([k, n]) => bpItem(k, n)).join('')}</div>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="muNo">Cancel</button><button class="btn gold" id="muYes">Sign in · ${curIcon('pearls')}${MSIGN_PEARL}</button></div></div>`,
    onMount: () => { $('#muNo').onclick = closeModal; $('#muYes').onclick = () => {
      if (m.got.includes(day) || !msignMakeLeft() || S.wallet.pearls < MSIGN_PEARL) return closeModal();
      closeModal(); S.wallet.pearls -= MSIGN_PEARL; m.got.push(day); m.made++; msignGive(r); persist(); renderMenu(); refreshSummon(); renderEvents();
      showRewards(`Monthly Sign-in · ${monthName()} ${day}`, r, `Made up with ${MSIGN_PEARL} pearl · ${msignMakeLeft()} make-up${msignMakeLeft() === 1 ? '' : 's'} left`); }; } });
}
/* the default calendar art (night sky, crescent moon, lanterns) when the admin hasn't uploaded one */
const MCAL_ART = '<svg class="mcal-def" viewBox="0 0 300 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="mcS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140c33"/><stop offset=".6" stop-color="#3b1d63"/><stop offset="1" stop-color="#b0467e"/></linearGradient><radialGradient id="mcG" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd9a8"/><stop offset="1" stop-color="#ff8a5c" stop-opacity="0"/></radialGradient></defs><rect width="300" height="360" fill="url(#mcS)"/><g fill="#fff">' + Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 73) % 300}" cy="${(i * 47) % 220}" r="${i % 5 ? .9 : 1.6}" opacity="${.4 + (i % 4) * .15}"/>`).join('') + '</g><circle cx="205" cy="80" r="34" fill="#fff4dc"/><circle cx="220" cy="70" r="30" fill="#2a1650"/><path d="M0 300 Q80 260 150 290 T300 280 V360 H0z" fill="#1a0f30"/>' + [[60, 170], [120, 210], [250, 190]].map(([x, y]) => `<g><line x1="${x}" y1="0" x2="${x}" y2="${y - 18}" stroke="#ffd9a8" stroke-width="1" opacity=".5"/><circle cx="${x}" cy="${y}" r="26" fill="url(#mcG)"/><rect x="${x - 10}" y="${y - 14}" width="20" height="28" rx="8" fill="#ff7a5c"/><rect x="${x - 6}" y="${y - 17}" width="12" height="4" fill="#5a2a1a"/></g>`).join('') + '</svg>';
function msignBoard() {
  const m = msignState(), N = monthDays(), today = msignToday(), rw = msignRewards(N), left = msignMakeLeft(), art = MEDIA.get('msign:art');
  const first = (new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() + 6) % 7;   // Monday-first offset
  const cell = d => { const r = rw[d], [k, n] = Object.entries(r)[0], got = m.got.includes(d), now = d === today && !got, miss = d < today && !got, fut = d > today;
    const st = got ? 'got' : now ? 'now' : miss ? (left ? 'miss' : 'miss off') : 'fut';
    return `<button class="mcal-d ${st} r${REW_R[k] || 3}" ${now || (miss && left) ? `data-msday="${d}"` : 'tabindex="-1"'} aria-label="${monthName()} ${d}: ${fmt(n)} ${REW_NAMES[k] ? REW_NAMES[k][n === 1 ? 0 : 1] : k}${got ? ', claimed' : now ? ', claim today' : miss ? ', missed' : ''}">
      <b>${d}</b><span class="mcal-ic">${curIcon(k)}</span><em>${n >= 1000 ? fmt(n / 1000) + 'k' : n}</em>${got ? `<span class="chk">${icon('check')}</span>` : now ? '<span class="mcal-tag">Claim</span>' : miss ? `<span class="mcal-tag">${left ? `${curIcon('pearls')}${MSIGN_PEARL}` : 'Missed'}</span>` : ''}</button>`; };
  return `<div class="mcal">
    <div class="mcal-art">${art ? artImg('msign:art') : MCAL_ART}<div class="mcal-hd"><b>${monthName()}</b><span>${new Date().getFullYear()} · Monthly Sign-in</span></div>
</div>
    <div class="mcal-main"><div class="mcal-wd">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => `<span>${w}</span>`).join('')}</div>
      <div class="mcal-grid">${'<i></i>'.repeat(first)}${Array.from({ length: N }, (_, i) => cell(i + 1)).join('')}</div>
      <div class="mcal-foot"><span>Signed in <b>${m.got.length} / ${N}</b></span><span>Make-ups left <b>${left} / ${msignMakeups()}</b> · tap a missed day to sign in for ${MSIGN_PEARL} pearl</span></div></div>
  </div>`;
}
const loginDays = () => { const d = (eventOf('login') || {}).days; return LOGIN_DAYS.map((v, i) => Math.max(0, Math.floor(+(d || [])[i] || 0)) || v); };
function loginState() {
  const y = new Date(); y.setDate(y.getDate() - 1);
  const ready = loginReady(), next = ready ? (S.login.last === dayKey(y) ? S.login.streak + 1 : 1) : S.login.streak;
  return { ready, next, today: (next - 1) % 7 + 1 };
}
function claimLogin() {
  const st = loginState(); if (!st.ready) return;
  const n = loginDays()[st.today - 1];
  S.wallet.tickets += n; S.login = { last: dayKey(), streak: st.next }; gainExp(EXP.login); persist(); renderMenu(); refreshSummon(); renderEvents();
  toast(`Claimed ${n} Limited ticket${n === 1 ? '' : 's'} (day ${st.today}). That is ${n} free pull${n === 1 ? '' : 's'} on the limited banner.`);
}
function openLogin() { openEvents('login'); }

let evEl = null, evSel = 'login', evTimer = null;
function openEvents(id) {
  closeModal();
  const live = eventList().filter(eventLive);
  evSel = id && live.some(e => e.id === id) ? id : live.some(e => e.id === evSel) ? evSel : 'login';
  if (!evEl) { evEl = document.createElement('div'); evEl.className = 'evp evx'; evEl.setAttribute('role', 'dialog'); evEl.setAttribute('aria-label', 'Events'); document.body.appendChild(evEl); }
  renderEvents();
  clearInterval(evTimer); evTimer = setInterval(() => { if (!evEl) return clearInterval(evTimer); const t = $('#evTime'); if (t) t.textContent = eventTimer(eventOf(evSel)); }, 30e3);
}
function closeEvents() { if (evEl) { evEl.remove(); evEl = null; } clearInterval(evTimer); renderMenu(); }
const dhLeft = ms => { const m = Math.max(0, Math.floor(ms / 6e4)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60); return d ? `${d}d ${h}h` : `${h}h ${m % 60}m`; };
function eventTimer(e) {
  if (!e) return '';
  if (e.id === 'msign') { const n = new Date(), r = new Date(n.getFullYear(), n.getMonth() + 1, 1); return `New month in ${dhLeft(r - n)}`; }
  if (e.id === 'login' || e.id === 'scratch') { const t = new Date(); t.setHours(24, 0, 0, 0); return `Resets in ${dhLeft(t - Date.now())}`; }
  return eventEnd(e) ? dhLeft(eventEnd(e) - Date.now()) : 'Ongoing';
}
/* the status line under each event in the list (the glass list of the remade Event page) */
function evSubOf(x) {
  if (x.id === 'login') return loginReady() ? 'Today’s reward is waiting' : 'Claimed today';
  if (x.id === 'msign') return msignReady() ? 'Sign in for today' : 'Signed in today';
  if (x.id === 'scratch') { const left = SCRATCH_DAILY - ((S.scratch && S.scratch.day === dayKey() && S.scratch.n) || 0); return left > 0 ? `${left} card${left === 1 ? '' : 's'} left today` : 'All cards used today'; }
  if (x.id === 'mystery') { const n = mboxState().got.length; return n >= MB_COST.length ? 'The fountain is empty' : `${n} / ${MB_COST.length} wishes made`; }
  const t = eventTimer(x); return t === 'Ongoing' ? 'Ongoing' : `Ends in ${t}`;
}
/* the wallpaper: the admin's upload, else the limited banner's art, else a night-sky gradient */
function eventBg(e) {
  // the Mystery Fountain shows its premium outfit's art; other events use the admin's upload, else the limited banner's art
  const sk = e.id === 'mystery' && mboxSkin(), own = (sk && baseArt(sk)) || MEDIA.get('ev:' + e.id), f = findEntry(S.featuredId), art = own || (f && baseArt(f));
  const evk = !(sk && baseArt(sk)) && MEDIA.get('ev:' + e.id) ? 'ev:' + e.id : null;   // only the event's own wallpaper is framed
  return art ? `<img src="${art}" alt="" style="${artPosStyle(evk)}">` : '';
}
function renderEvents() {
  if (!evEl) return;
  const list = eventList().filter(eventLive), e = eventOf(evSel) || list[0];
  evEl.innerHTML = `<div class="evp-bg ${eventBg(e) ? '' : 'none'} ${e.id === 'mystery' ? 'full' : ''}">${eventBg(e)}<i class="hgx-glow g1 evx-g1"></i><i class="hgx-glow g2 evx-g2"></i><i class="hgx-glow g3 evx-g3"></i></div><div class="evp-shade"></div>
    <div class="evp-head"><span class="inv-badge">${icon('calendar')}</span><h2 class="ts">Event</h2></div>
    ${e.id === 'mystery' || e.id === 'scratch' ? `<div class="evp-cur"><span class="cur" title="Pearls">${curIcon('pearls')}<b>${fmt(S.wallet.pearls)}</b><button class="plus" data-open="shop" data-shoptab="topup" aria-label="Get more pearls">${icon('plus')}</button></span></div>` : ''}
    <button class="inv-x evp-x" id="evClose" aria-label="Close">${icon('close')}</button>
    <aside class="evp-side"><span class="evp-pill evx-gh">${icon('clock')}Limited-time events<em>${list.length}</em></span>
      <div class="evp-list">${list.map(x => `<button class="evp-item ${x.id === e.id ? 'on' : ''}" data-ev="${esc(x.id)}"><span class="evp-ic">${x.id === 'scratch' ? scrIcon('star') : x.id === 'mystery' ? `<span class="ftn-ic sm">${icon('fountain')}</span>` : icon(x.id === 'login' || x.id === 'msign' ? 'calendar' : 'gift')}</span><span class="evx-it"><b>${esc(x.name || 'Event')}</b><small>${esc(evSubOf(x))}</small></span>${(x.id === 'login' && loginReady()) || (x.id === 'msign' && msignReady()) || (x.id === 'scratch' && scratchOpen()) || (x.id === 'mystery' && !mboxState().got.length) ? '<span class="dot-n"></span>' : ''}</button>`).join('')}</div></aside>
    ${e.id === 'login' ? loginCharHTML(e) : ''}
    <section class="evp-main ${e.id === 'msign' ? 'cal' : ''} ${e.id === 'login' ? 'tlm' + (loginCharHTML(e) ? '' : ' nochar') : ''}">
      <h1 class="evp-title">${esc(e.name || 'Event')}</h1>
      <span class="evp-time">${icon('clock')}<span id="evTime">${eventTimer(e)}</span></span>
      ${e.sub && e.id !== 'mystery' && e.id !== 'msign' ? `<p class="evp-sub">${esc(e.sub)}</p>` : ''}
      ${e.id === 'login' ? loginBoard() : e.id === 'msign' ? msignBoard() : e.id === 'scratch' ? scratchBoard() : e.id === 'mystery' ? mysteryBoard() : e.text ? `<div class="evp-text">${esc(e.text).replace(/\n/g, '<br>')}</div>` : ''}
    </section>`;
  $('#evClose').onclick = closeEvents;
  evEl.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => { evSel = b.dataset.ev; renderEvents(); });
  evEl.querySelectorAll('[data-lgclaim]').forEach(b => b.onclick = claimLogin);
  evEl.querySelectorAll('[data-msday]').forEach(b => b.onclick = () => { const d = +b.dataset.msday; if (d === msignToday()) claimMsign(d); else makeupMsign(d); });
  const ts = $('#tlStrip'); if (ts) { const c = ts.querySelector('.tl-day.can') || ts.querySelectorAll('.tl-day.got')[ts.querySelectorAll('.tl-day.got').length - 1]; if (c) ts.scrollLeft = Math.max(0, c.offsetLeft - ts.clientWidth / 2 + c.clientWidth / 2); ts.addEventListener('wheel', ev => { if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) { ts.scrollLeft += ev.deltaY; ev.preventDefault(); } }, { passive: false }); }
  if (e.id === 'scratch') bindScratch();
  if (e.id === 'mystery') bindMystery();
}
/* the 7-day sign-in board, in the look of the owner's "Total Login" reference: "Day n of 7" with the streak, a strip of Day
   cards (crystal header, reward card with the amount, claimed check, glowing "Claim" on today's), and an optional character
   on the right with a name plate (admin → Events → Daily Login: character, name plate, PNG cutout evchar:login) */
function loginBoard() {
  const st = loginState(), days = loginDays(), streak = st.ready ? st.next - 1 : st.next;
  const cards = [1, 2, 3, 4, 5, 6, 7].map(d => { const done = d < st.today || (d === st.today && !st.ready), now = d === st.today && st.ready, n = days[d - 1];
    return `<button class="tl-day ${done ? 'got' : ''} ${now ? 'can' : ''} ${d === 7 ? 'd7' : ''}" ${now ? 'data-lgclaim' : 'tabindex="-1"'} aria-label="Day ${d}: ${n} Limited ticket${n === 1 ? '' : 's'}${done ? ', claimed' : now ? ', claim now' : ''}">
      <span class="tl-hd">Day ${d}</span>
      <span class="tl-body"><span class="tl-rw r5">${curIcon('tickets')}<em>${n}</em></span>${done ? `<span class="tl-ok">${icon('check')}</span>` : ''}</span>
      <span class="tl-ft">${done ? 'Claimed' : now ? 'Claim' : '✦'}</span></button>`; }).join('');
  return `<div class="tl"><div class="tl-top"><span class="tl-count">Day <b>${st.today}</b> of 7</span><span class="tl-dates">${streak ? `Streak ${streak} day${streak === 1 ? '' : 's'}` : 'Start your streak today'}</span></div>
    <div class="tl-strip" id="tlStrip">${cards}</div>
    <p class="evp-note">${st.ready ? 'Tap the glowing card to claim today\'s Limited tickets.' : 'Claimed for today. Come back tomorrow.'} Missing a day starts again from day 1. Each day also gives ${expTag(EXP.login)}</p></div>`;
}
function loginCharHTML(e) {
  const cut = MEDIA.get('evchar:login'), c = e.char && findEntry(e.char), name = e.charName || (c && c.name) || '';
  if (!cut && !(c && baseArt(c))) return '';
  return `<div class="tl-char ${cut ? 'cut' : 'art'}"><img src="${cut || baseArt(c)}" alt="">${name ? `<span class="tl-name">${esc(name)}</span>` : ''}</div>`;
}
function loginCharAdmin(e) {
  const chars = S.pool.filter(x => x.type === 'character'), cut = MEDIA.get('evchar:login');
  return `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end">
    <label class="tiny">Character on the right <select class="input" data-lgf="char"><option value="">None</option>${chars.map(c => `<option value="${esc(c.id)}" ${e.char === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <label class="tiny">Name plate <input class="input" data-lgf="charName" maxlength="30" value="${esc(e.charName || '')}" placeholder="Character's name"></label>
    <label class="btn mint sm">${icon('upload')}${cut ? 'Replace' : 'Upload'} cutout (PNG)<input type="file" accept="image/png,image/webp,image/*" class="sr" data-lgcut></label>${cut ? '<button class="btn ghost sm" data-lgcutdel>Remove cutout</button>' : ''}</div>`;
}
function bindLoginCharAdmin(p) {
  p.querySelectorAll('[data-lgf]').forEach(i => i.onchange = () => { const e = eventOf('login'); e[i.dataset.lgf] = i.value || null; persist(); });
  p.querySelectorAll('[data-lgcut]').forEach(i => i.onchange = async ev => { try { if (await mediaSet('evchar:login', await resizeImage(ev.target.files[0], 1200, 'image/png'))) { renderEventsTab(); toast('Character cutout saved.'); } } catch (er) { toast(er.message, true); } });
  p.querySelectorAll('[data-lgcutdel]').forEach(b => b.onclick = async () => { await mediaDel('evchar:login'); renderEventsTab(); });
}

/* admin → Events: names, subtitles, end dates, text, login rewards and a wallpaper per event */
let evDelArm = null;
function renderEventsTab() {
  const p = $('#adPanel'); if (!p) return;
  const list = eventList();
  p.innerHTML = `<div class="stack">
    <div class="ad-head" style="margin:0"><h3>Events</h3><div class="row"><button class="btn mint sm" id="evAdd">${icon('plus')}New event</button><button class="btn ghost sm" id="evOpen">Open events</button></div></div>
    <p class="tiny">Each event has its own wallpaper behind the event page (best size 1920×1080; it covers the screen and other shapes are cropped). Without one, the limited banner's art is used. Events with an end date disappear for players after that day.</p>
    <div class="row" style="gap:10px;align-items:center;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05)"><b>Daily spin art</b><span class="tiny">The picture on the left of the Daily spin window (portrait, ~600×720)</span>${MEDIA.get('spin:art') ? `<img src="${MEDIA.get('spin:art')}" alt="" style="width:48px;height:58px;object-fit:cover;border-radius:8px">` : ''}<label class="btn mint sm">${icon('upload')}${MEDIA.get('spin:art') ? 'Replace' : 'Upload'}<input type="file" accept="image/*" class="sr" data-spinup></label>${MEDIA.get('spin:art') ? '<button class="btn ghost sm" data-spindel>Default art</button>' : ''}${artFrameBtn('spin:art', 'spin', 'Daily spin art')}</div>
    ${list.map(e => { const bg = MEDIA.get('ev:' + e.id), login = e.id === 'login', builtin = EV_BUILTIN.includes(e.id);
      return `<div class="ev-ad">
        <div class="ev-adprev">${(() => { const w = e.id === 'mystery' && mboxSkin() && baseArt(mboxSkin()) || bg; return w ? `<img src="${w}" alt="">` : '<span class="tiny">No wallpaper</span>'; })()}</div>
        <div class="stack" style="gap:8px;min-width:0">
          <div class="row" style="gap:8px"><input class="input" data-evf="name" data-evid="${esc(e.id)}" maxlength="40" value="${esc(e.name || '')}" placeholder="Event name" aria-label="Event name" style="flex:1">${builtin && e.id !== 'mystery' ? '<span class="tag">Built in</span>' : `<label class="tiny">Ends <input class="input" type="date" data-evf="end" data-evid="${esc(e.id)}" value="${esc(e.end || '')}"></label>`}</div>
          <input class="input" data-evf="sub" data-evid="${esc(e.id)}" maxlength="80" value="${esc(e.sub || '')}" placeholder="Subtitle (optional)" aria-label="Subtitle">
          ${e.id === 'msign' ? `<div class="row" style="gap:8px;align-items:center"><span class="tiny">Calendar art (portrait, ~600×720)</span><label class="btn mint sm">${icon('upload')}${MEDIA.get('msign:art') ? 'Replace' : 'Upload'}<input type="file" accept="image/*" class="sr" data-mcalup></label>${MEDIA.get('msign:art') ? '<button class="btn ghost sm" data-mcaldel>Default art</button>' : ''}${artFrameBtn('msign:art', 'msign', 'Monthly Sign-in calendar art')}</div>` : ''}
          ${e.id === 'msign' ? `<label class="field" style="max-width:320px"><span>Missed-day make-ups per month (${MSIGN_PEARL} pearl each)</span><input class="input" type="number" min="0" max="28" data-evmk value="${msignMakeups()}"></label>` : ''}
          ${login ? `${loginCharAdmin(e)}<div class="ev-days"><span class="tiny">Limited tickets per day</span>${loginDays().map((n, i) => `<label>Day ${i + 1}<input class="input" type="number" min="1" max="99" data-evday="${i}" value="${n}"></label>`).join('')}</div>`
            : e.id === 'mystery' ? mboxAdmin() : builtin ? '<span class="tiny">Scratch cards: 5 pearls each, 10 a day. Prizes and odds are set in the game code.</span>' : `<textarea class="input" data-evf="text" data-evid="${esc(e.id)}" rows="3" maxlength="1200" placeholder="What the event is about" aria-label="Event text">${esc(e.text || '')}</textarea>`}
          <div class="row" style="gap:8px"><label class="btn mint sm">${icon('upload')}${bg ? 'Replace' : 'Upload'} wallpaper<input type="file" accept="image/*" class="sr" data-evbg="${esc(e.id)}"></label>
            ${bg ? `<button class="btn ghost sm" data-evbgdel="${esc(e.id)}">Remove wallpaper</button>` : ''}${artFrameBtn('ev:' + e.id, 'screen', `${e.name || 'Event'} wallpaper`)}
            ${builtin ? '' : `<button class="link" data-evdel="${esc(e.id)}" style="color:${evDelArm === e.id ? '#ff6b81' : ''}">${evDelArm === e.id ? 'Tap again to delete' : 'Delete'}</button>`}</div>
        </div></div>`; }).join('')}
  </div>`;
  bindMboxAdmin(); bindLoginCharAdmin(p);
  p.querySelectorAll('[data-evf]').forEach(i => i.onchange = () => { const e = eventOf(i.dataset.evid); if (!e) return; e[i.dataset.evf] = i.value.trim() || null; if (i.dataset.evf === 'name' && !e.name) e.name = 'Event'; persist(); });
  p.querySelectorAll('[data-spinup]').forEach(i => i.onchange = async ev => { try { if (await mediaSet('spin:art', await resizeImage(ev.target.files[0], 900, 'image/jpeg'))) { renderEventsTab(); toast('Daily spin art saved.'); } } catch (er) { toast(er.message, true); } });
  p.querySelectorAll('[data-spindel]').forEach(b => b.onclick = async () => { await mediaDel('spin:art'); renderEventsTab(); });
  p.querySelectorAll('[data-mcalup]').forEach(i => i.onchange = async ev => { try { if (await mediaSet('msign:art', await resizeImage(ev.target.files[0], 900, 'image/jpeg'))) { renderEventsTab(); toast('Calendar art saved.'); } } catch (er) { toast(er.message, true); } });
  p.querySelectorAll('[data-mcaldel]').forEach(b => b.onclick = async () => { await mediaDel('msign:art'); renderEventsTab(); });
  p.querySelectorAll('[data-evmk]').forEach(i => i.onchange = () => { const e = eventOf('msign'); e.makeups = clamp(Math.floor(+i.value) || 0, 0, 28); i.value = e.makeups; persist(); });
  p.querySelectorAll('[data-evday]').forEach(i => i.onchange = () => { const e = eventOf('login'); e.days = loginDays(); e.days[+i.dataset.evday] = clamp(Math.floor(+i.value) || 1, 1, 99); i.value = e.days[+i.dataset.evday]; persist(); });
  p.querySelectorAll('[data-evbg]').forEach(i => i.onchange = async ev => { try { if (await mediaSet('ev:' + i.dataset.evbg, await resizeImage(ev.target.files[0], 1920, 'image/jpeg'))) { renderEventsTab(); toast('Event wallpaper saved.'); } } catch (e) { toast(e.message, true); } });
  p.querySelectorAll('[data-evbgdel]').forEach(b => b.onclick = async () => { await mediaDel('ev:' + b.dataset.evbgdel); renderEventsTab(); toast('Wallpaper removed.'); });
  p.querySelectorAll('[data-evdel]').forEach(b => b.onclick = async () => {
    const id = b.dataset.evdel; if (evDelArm !== id) { evDelArm = id; return renderEventsTab(); }
    evDelArm = null; await mediaDel('ev:' + id); S.events = eventList().filter(e => e.id !== id); persist(); renderEventsTab(); toast('Event deleted.');
  });
  $('#evAdd').onclick = () => { S.events = [...eventList(), { id: `ev-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: 'New event', sub: null, text: null, end: null }]; persist(); renderEventsTab(); };
  $('#evOpen').onclick = () => { closeModal(); openEvents(); };
}

