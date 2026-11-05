/* ---------- events: full-screen page with an event list on the left and the chosen event over its own wallpaper ----------
   S.events (content, edited in admin → Events): [{ id, name, sub, text, end, days }]. 'login' is the built-in 7-day sign-in
   (days = Limited tickets per day); the rest are notice events the admin adds. Wallpapers live in media keys ev:<id>. */
const LOGIN_DAYS = [1, 1, 1, 1, 1, 1, 1];
function eventList() {
  let list = Array.isArray(S.events) ? S.events : [];
  if (!list.some(e => e.id === 'login')) list = [{ id: 'login', name: 'Daily Login', sub: 'Sign in to claim rewards', days: [...LOGIN_DAYS] }, ...list];
  if (!list.some(e => e.id === 'mystery')) list = [{ id: 'mystery', name: 'Mystery Fountain', sub: 'Limited summon · 10 wishes · premium outfit inside' }, ...list];
  list.forEach(e => { if (e.id === 'mystery' && e.name === 'Mystery Box') { e.name = 'Mystery Fountain'; if (e.sub === 'Limited summon · 10 pulls · premium outfit inside') e.sub = 'Limited summon · 10 wishes · premium outfit inside'; } });   // renamed
  if (!list.some(e => e.id === 'msign')) { const i = list.findIndex(e => e.id === 'login'); list = [...list.slice(0, i + 1), { id: 'msign', name: 'Monthly Sign-in', sub: 'Sign in on 28 days this month', makeups: MSIGN_MAKEUPS }, ...list.slice(i + 1)]; }
  if (!list.some(e => e.id === 'scratch')) { const i = list.findIndex(e => e.id === 'login'); list = [...list.slice(0, i + 1), { id: 'scratch', name: 'Scratch Cards', sub: 'Match three icons to win pearls' }, ...list.slice(i + 1)]; }
  if (list !== S.events) S.events = list;
  return list;
}
const eventOf = id => eventList().find(e => e.id === id);
const eventEnd = e => e.end ? new Date(e.end + 'T23:59:59').getTime() : null;
const EV_BUILTIN = ['mystery', 'login', 'msign', 'scratch'];
const eventLive = e => e.id === 'login' || e.id === 'msign' || e.id === 'scratch' || !eventEnd(e) || eventEnd(e) > Date.now();
/* ---------- Monthly Sign-in (built-in event 'msign') ----------
   28 rewards a month, one per day signed in (count based, not date based), resetting on the 1st: in total 10 Standard
   tickets, 10 Limited tickets, 30 pearls and 50,000 gold (MSIGN_REWARDS: each week = gold, 5 tickets, pearls on day 7).
   Missed days can be signed in afterwards for MSIGN_PEARL pearl each, up to MSIGN_MAKEUPS times a month (admin → Events
   sets the limit, msign.makeups). State S.msign {key: 'YYYY-MM', n: signed, last: dayKey, made: make-ups used}. */
const MSIGN_N = 28, MSIGN_PEARL = 1, MSIGN_MAKEUPS = 3;
const MSIGN_REWARDS = Array.from({ length: MSIGN_N }, (_, i) => { const w = Math.floor(i / 7), d = i % 7;
  if (d === 0) return { coins: 12500 };
  if (d === 6) return { pearls: w === 3 ? 15 : 5 };
  const std = (d + w) % 2 === 1; return std ? { wishes: 1 } : { tickets: 1 }; });
function msignState() { if (!S.msign || S.msign.key !== monthKey()) S.msign = { key: monthKey(), n: 0, last: '', made: 0 }; return S.msign; }
const msignMakeups = () => { const m = +(eventOf('msign') || {}).makeups; return Number.isFinite(m) && m >= 0 ? Math.floor(m) : MSIGN_MAKEUPS; };
const msignReady = () => { const m = msignState(); return m.last !== dayKey() && m.n < MSIGN_N; };
/* missed days this month that can still be made up: days passed (today counts once signed in) minus days signed in */
function msignMissed() { const m = msignState(), day = new Date().getDate(), passed = m.last === dayKey() ? day : day - 1; return Math.max(0, Math.min(passed - m.n, MSIGN_N - m.n)); }
const msignCanMake = () => msignMissed() > 0 && msignState().made < msignMakeups() && msignState().n < MSIGN_N;
function msignGive(r) { Object.entries(r).forEach(([k, n]) => { S.wallet[k] = (S.wallet[k] || 0) + n; }); }
function claimMsign() {
  if (!msignReady()) return; const m = msignState(), r = MSIGN_REWARDS[m.n];
  m.n++; m.last = dayKey(); msignGive(r); persist(); renderMenu(); refreshSummon(); renderEvents();
  showRewards(`Monthly Sign-in · day ${m.n}`, r, `${m.n} / ${MSIGN_N} this month`);
}
function makeupMsign() {
  if (!msignCanMake()) return; const m = msignState(), left = msignMakeups() - m.made;
  if (S.wallet.pearls < MSIGN_PEARL) { toast(`You need ${MSIGN_PEARL} pearl to sign in for a missed day.`); return; }
  openModal({ title: 'Make up a missed day', ic: 'calendar', small: true, body: `<div class="stack" style="justify-items:center;text-align:center">
    <p class="desc">Spend <b>${MSIGN_PEARL} pearl</b> to sign in for a missed day and claim day ${m.n + 1}'s reward? ${left} make-up${left === 1 ? '' : 's'} left this month.</p>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="muNo">Cancel</button><button class="btn gold" id="muYes">Sign in · ${curIcon('pearls')}${MSIGN_PEARL}</button></div></div>`,
    onMount: () => { $('#muNo').onclick = closeModal; $('#muYes').onclick = () => {
      if (!msignCanMake() || S.wallet.pearls < MSIGN_PEARL) return closeModal();
      closeModal(); const r = MSIGN_REWARDS[m.n]; S.wallet.pearls -= MSIGN_PEARL; m.n++; m.made++; msignGive(r); persist(); renderMenu(); refreshSummon(); renderEvents();
      showRewards(`Monthly Sign-in · day ${m.n}`, r, `Made up with ${MSIGN_PEARL} pearl · ${m.n} / ${MSIGN_N} this month`); }; } });
}
/* the board: 28 small reward cards in 7 columns, signed ones checked, today's glowing; totals and make-ups under it */
function msignBoard() {
  const m = msignState(), ready = msignReady(), miss = msignMissed(), mk = msignMakeups();
  const tot = MSIGN_REWARDS.reduce((a, r) => { Object.entries(r).forEach(([k, n]) => a[k] = (a[k] || 0) + n); return a; }, {});
  return `<div class="msg">${MSIGN_REWARDS.map((r, i) => { const [k, n] = Object.entries(r)[0], done = i < m.n, now = i === m.n && ready;
      return `<button class="msg-d r${REW_R[k] || 3} ${done ? 'done' : ''} ${now ? 'now' : ''}" ${now ? 'data-msnow' : 'tabindex="-1"'} aria-label="Day ${i + 1}: ${fmt(n)} ${REW_NAMES[k] ? REW_NAMES[k][n === 1 ? 0 : 1] : k}${done ? ', claimed' : now ? ', claim now' : ''}">
        <b>${i + 1}</b><span class="msg-ic">${curIcon(k)}</span><em>${n >= 1000 ? fmt(n / 1000) + 'k' : n}</em>${done ? `<span class="chk">${icon('check')}</span>` : ''}</button>`; }).join('')}</div>
    <div class="msg-foot"><span>Signed in <b>${m.n} / ${MSIGN_N}</b> this month · resets on the 1st (${nextMonthIn()})</span>
      ${ready ? '<button class="btn gold sm" data-msnow>Sign in today</button>' : ''}
      ${miss > 0 && m.n < MSIGN_N ? `<button class="btn ghost sm" id="msMake" ${msignCanMake() ? '' : 'disabled'}>Make up a missed day · ${curIcon('pearls')}${MSIGN_PEARL} <small>(${Math.max(0, mk - m.made)} / ${mk} left)</small></button>` : ''}</div>
    <p class="evp-note">This month: ${Object.entries(tot).map(([k, n]) => `${fmt(n)} ${REW_NAMES[k] ? REW_NAMES[k][n === 1 ? 0 : 1] : k}`).join(' · ')}. Missed ${miss} day${miss === 1 ? '' : 's'} so far; you can make up ${mk} a month for ${MSIGN_PEARL} pearl each.</p>`;
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
  if (!evEl) { evEl = document.createElement('div'); evEl.className = 'evp'; evEl.setAttribute('role', 'dialog'); evEl.setAttribute('aria-label', 'Events'); document.body.appendChild(evEl); }
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
/* the wallpaper: the admin's upload, else the limited banner's art, else a night-sky gradient */
function eventBg(e) {
  // the Mystery Fountain shows its premium outfit's art; other events use the admin's upload, else the limited banner's art
  const sk = e.id === 'mystery' && mboxSkin(), own = (sk && baseArt(sk)) || MEDIA.get('ev:' + e.id), f = findEntry(S.featuredId), art = own || (f && baseArt(f));
  return art ? `<img src="${art}" alt="">` : '';
}
function renderEvents() {
  if (!evEl) return;
  const list = eventList().filter(eventLive), e = eventOf(evSel) || list[0];
  evEl.innerHTML = `<div class="evp-bg ${eventBg(e) ? '' : 'none'} ${e.id === 'mystery' ? 'full' : ''}">${eventBg(e)}</div><div class="evp-shade"></div>
    <div class="evp-head"><span class="inv-badge">${icon('calendar')}</span><h2 class="ts">Event</h2></div>
    ${e.id === 'mystery' || e.id === 'scratch' ? `<div class="evp-cur"><span class="cur" title="Pearls">${curIcon('pearls')}<b>${fmt(S.wallet.pearls)}</b><button class="plus" data-open="shop" data-shoptab="topup" aria-label="Get more pearls">${icon('plus')}</button></span></div>` : ''}
    <button class="inv-x evp-x" id="evClose" aria-label="Close">${icon('close')}</button>
    <aside class="evp-side"><span class="evp-pill">${icon('clock')}Limited-Time</span>
      <div class="evp-list">${list.map(x => `<button class="evp-item ${x.id === e.id ? 'on' : ''}" data-ev="${esc(x.id)}"><span class="evp-ic">${x.id === 'scratch' ? scrIcon('star') : x.id === 'mystery' ? `<span class="ftn-ic sm">${icon('fountain')}</span>` : icon(x.id === 'login' || x.id === 'msign' ? 'calendar' : 'gift')}</span><b>${esc(x.name || 'Event')}</b>${(x.id === 'login' && loginReady()) || (x.id === 'msign' && msignReady()) || (x.id === 'scratch' && scratchOpen()) || (x.id === 'mystery' && !mboxState().got.length) ? '<span class="dot-n"></span>' : ''}</button>`).join('')}</div></aside>
    <section class="evp-main">
      <h1 class="evp-title">${esc(e.name || 'Event')}</h1>
      <span class="evp-time">${icon('clock')}<span id="evTime">${eventTimer(e)}</span></span>
      ${e.sub && e.id !== 'mystery' ? `<p class="evp-sub">${esc(e.sub)}</p>` : ''}
      ${e.id === 'login' ? loginBoard() : e.id === 'msign' ? msignBoard() : e.id === 'scratch' ? scratchBoard() : e.id === 'mystery' ? mysteryBoard() : e.text ? `<div class="evp-text">${esc(e.text).replace(/\n/g, '<br>')}</div>` : ''}
    </section>`;
  $('#evClose').onclick = closeEvents;
  evEl.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => { evSel = b.dataset.ev; renderEvents(); });
  evEl.querySelectorAll('.evl-day.now').forEach(b => b.onclick = claimLogin);
  evEl.querySelectorAll('[data-msnow]').forEach(b => b.onclick = claimMsign);
  const mk = $('#msMake'); if (mk) mk.onclick = makeupMsign;
  if (e.id === 'scratch') bindScratch();
  if (e.id === 'mystery') bindMystery();
}
/* the 7-day sign-in board: days 1-6 in a 3×2 grid, day 7 as a tall gold card */
function loginBoard() {
  const st = loginState(), days = loginDays();
  const card = d => { const done = d < st.today || (d === st.today && !st.ready), now = d === st.today && st.ready;
    return `<button class="evl-day ${d === 7 ? 'big' : ''} ${done ? 'done' : ''} ${now ? 'now' : ''}" ${now ? '' : 'tabindex="-1"'} aria-label="Day ${d}: ${days[d - 1]} Limited ticket${days[d - 1] === 1 ? '' : 's'}${done ? ', claimed' : now ? ', claim now' : ''}">
      <span class="evl-hd"><b>${d}</b><i>DAY</i></span>
      <span class="evl-rw">${curIcon('tickets')}<em>${days[d - 1]}</em>${done ? `<span class="chk">${icon('check')}</span>` : ''}</span>
      ${d === 7 ? '<span class="evl-band"><span>SEVEN-DAY SIGN-IN · SEVEN-DAY SIGN-IN · SEVEN-DAY SIGN-IN · </span></span>' : ''}
      <span class="evl-ft">${done ? 'Claimed' : now ? 'Claim' : `Day ${d}`}</span></button>`; };
  const streak = st.ready ? st.next - 1 : st.next;
  return `<div class="evl"><div class="evl-grid">${[1, 2, 3, 4, 5, 6].map(card).join('')}</div>${card(7)}</div>
    <p class="evp-note">${streak ? `Login streak: ${streak} day${streak === 1 ? '' : 's'}.` : 'Start your streak today.'} Missing a day starts the calendar again from day 1. Each day also gives ${expTag(EXP.login)}</p>`;
}

/* admin → Events: names, subtitles, end dates, text, login rewards and a wallpaper per event */
let evDelArm = null;
function renderEventsTab() {
  const p = $('#adPanel'); if (!p) return;
  const list = eventList();
  p.innerHTML = `<div class="stack">
    <div class="ad-head" style="margin:0"><h3>Events</h3><div class="row"><button class="btn mint sm" id="evAdd">${icon('plus')}New event</button><button class="btn ghost sm" id="evOpen">Open events</button></div></div>
    <p class="tiny">Each event has its own wallpaper behind the event page (best size 1920×1080; it covers the screen and other shapes are cropped). Without one, the limited banner's art is used. Events with an end date disappear for players after that day.</p>
    ${list.map(e => { const bg = MEDIA.get('ev:' + e.id), login = e.id === 'login', builtin = EV_BUILTIN.includes(e.id);
      return `<div class="ev-ad">
        <div class="ev-adprev">${(() => { const w = e.id === 'mystery' && mboxSkin() && baseArt(mboxSkin()) || bg; return w ? `<img src="${w}" alt="">` : '<span class="tiny">No wallpaper</span>'; })()}</div>
        <div class="stack" style="gap:8px;min-width:0">
          <div class="row" style="gap:8px"><input class="input" data-evf="name" data-evid="${esc(e.id)}" maxlength="40" value="${esc(e.name || '')}" placeholder="Event name" aria-label="Event name" style="flex:1">${builtin && e.id !== 'mystery' ? '<span class="tag">Built in</span>' : `<label class="tiny">Ends <input class="input" type="date" data-evf="end" data-evid="${esc(e.id)}" value="${esc(e.end || '')}"></label>`}</div>
          <input class="input" data-evf="sub" data-evid="${esc(e.id)}" maxlength="80" value="${esc(e.sub || '')}" placeholder="Subtitle (optional)" aria-label="Subtitle">
          ${e.id === 'msign' ? `<label class="field" style="max-width:320px"><span>Missed-day make-ups per month (${MSIGN_PEARL} pearl each)</span><input class="input" type="number" min="0" max="28" data-evmk value="${msignMakeups()}"></label>` : ''}
          ${login ? `<div class="ev-days"><span class="tiny">Limited tickets per day</span>${loginDays().map((n, i) => `<label>Day ${i + 1}<input class="input" type="number" min="1" max="99" data-evday="${i}" value="${n}"></label>`).join('')}</div>`
            : e.id === 'mystery' ? mboxAdmin() : builtin ? '<span class="tiny">Scratch cards: 5 pearls each, 10 a day. Prizes and odds are set in the game code.</span>' : `<textarea class="input" data-evf="text" data-evid="${esc(e.id)}" rows="3" maxlength="1200" placeholder="What the event is about" aria-label="Event text">${esc(e.text || '')}</textarea>`}
          <div class="row" style="gap:8px"><label class="btn mint sm">${icon('upload')}${bg ? 'Replace' : 'Upload'} wallpaper<input type="file" accept="image/*" class="sr" data-evbg="${esc(e.id)}"></label>
            ${bg ? `<button class="btn ghost sm" data-evbgdel="${esc(e.id)}">Remove wallpaper</button>` : ''}
            ${builtin ? '' : `<button class="link" data-evdel="${esc(e.id)}" style="color:${evDelArm === e.id ? '#ff6b81' : ''}">${evDelArm === e.id ? 'Tap again to delete' : 'Delete'}</button>`}</div>
        </div></div>`; }).join('')}
  </div>`;
  bindMboxAdmin();
  p.querySelectorAll('[data-evf]').forEach(i => i.onchange = () => { const e = eventOf(i.dataset.evid); if (!e) return; e[i.dataset.evf] = i.value.trim() || null; if (i.dataset.evf === 'name' && !e.name) e.name = 'Event'; persist(); });
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
