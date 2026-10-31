/* ---------- events: full-screen page with an event list on the left and the chosen event over its own wallpaper ----------
   S.events (content, edited in admin → Events): [{ id, name, sub, text, end, days }]. 'login' is the built-in 7-day sign-in
   (days = Limited tickets per day); the rest are notice events the admin adds. Wallpapers live in media keys ev:<id>. */
const LOGIN_DAYS = [1, 1, 1, 1, 1, 1, 1];
function eventList() {
  let list = Array.isArray(S.events) ? S.events : [];
  if (!list.some(e => e.id === 'login')) list = [{ id: 'login', name: 'Daily Login', sub: 'Sign in to claim rewards', days: [...LOGIN_DAYS] }, ...list];
  if (!list.some(e => e.id === 'scratch')) { const i = list.findIndex(e => e.id === 'login'); list = [...list.slice(0, i + 1), { id: 'scratch', name: 'Scratch Cards', sub: 'Match three icons to win pearls' }, ...list.slice(i + 1)]; }
  if (list !== S.events) S.events = list;
  return list;
}
const eventOf = id => eventList().find(e => e.id === id);
const eventEnd = e => e.end ? new Date(e.end + 'T23:59:59').getTime() : null;
const EV_BUILTIN = ['login', 'scratch'];
const eventLive = e => EV_BUILTIN.includes(e.id) || !eventEnd(e) || eventEnd(e) > Date.now();
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
  if (EV_BUILTIN.includes(e.id)) { const t = new Date(); t.setHours(24, 0, 0, 0); return `Resets in ${dhLeft(t - Date.now())}`; }
  return eventEnd(e) ? dhLeft(eventEnd(e) - Date.now()) : 'Ongoing';
}
/* the wallpaper: the admin's upload, else the limited banner's art, else a night-sky gradient */
function eventBg(e) {
  const own = MEDIA.get('ev:' + e.id), f = findEntry(S.featuredId), art = own || (f && baseArt(f));
  return art ? `<img src="${art}" alt="">` : '';
}
function renderEvents() {
  if (!evEl) return;
  const list = eventList().filter(eventLive), e = eventOf(evSel) || list[0];
  evEl.innerHTML = `<div class="evp-bg ${eventBg(e) ? '' : 'none'}">${eventBg(e)}</div><div class="evp-shade"></div>
    <div class="evp-head"><span class="inv-badge">${icon('calendar')}</span><h2 class="ts">Event</h2></div>
    <button class="inv-x evp-x" id="evClose" aria-label="Close">${icon('close')}</button>
    <aside class="evp-side"><span class="evp-pill">${icon('clock')}Limited-Time</span>
      <div class="evp-list">${list.map(x => `<button class="evp-item ${x.id === e.id ? 'on' : ''}" data-ev="${esc(x.id)}"><span class="evp-ic">${x.id === 'scratch' ? scrIcon('star') : icon(x.id === 'login' ? 'calendar' : 'gift')}</span><b>${esc(x.name || 'Event')}</b>${(x.id === 'login' && loginReady()) || (x.id === 'scratch' && scratchOpen()) ? '<span class="dot-n"></span>' : ''}</button>`).join('')}</div></aside>
    <section class="evp-main">
      <h1 class="evp-title">${esc(e.name || 'Event')}</h1>
      <span class="evp-time">${icon('clock')}<span id="evTime">${eventTimer(e)}</span></span>
      ${e.sub ? `<p class="evp-sub">${esc(e.sub)}</p>` : ''}
      ${e.id === 'login' ? loginBoard() : e.id === 'scratch' ? scratchBoard() : e.text ? `<div class="evp-text">${esc(e.text).replace(/\n/g, '<br>')}</div>` : ''}
    </section>`;
  $('#evClose').onclick = closeEvents;
  evEl.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => { evSel = b.dataset.ev; renderEvents(); });
  evEl.querySelectorAll('.evl-day.now').forEach(b => b.onclick = claimLogin);
  if (e.id === 'scratch') bindScratch();
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
        <div class="ev-adprev">${bg ? `<img src="${bg}" alt="">` : '<span class="tiny">No wallpaper</span>'}</div>
        <div class="stack" style="gap:8px;min-width:0">
          <div class="row" style="gap:8px"><input class="input" data-evf="name" data-evid="${esc(e.id)}" maxlength="40" value="${esc(e.name || '')}" placeholder="Event name" aria-label="Event name" style="flex:1">${builtin ? '<span class="tag">Built in</span>' : `<label class="tiny">Ends <input class="input" type="date" data-evf="end" data-evid="${esc(e.id)}" value="${esc(e.end || '')}"></label>`}</div>
          <input class="input" data-evf="sub" data-evid="${esc(e.id)}" maxlength="80" value="${esc(e.sub || '')}" placeholder="Subtitle (optional)" aria-label="Subtitle">
          ${login ? `<div class="ev-days"><span class="tiny">Limited tickets per day</span>${loginDays().map((n, i) => `<label>Day ${i + 1}<input class="input" type="number" min="1" max="99" data-evday="${i}" value="${n}"></label>`).join('')}</div>`
            : builtin ? '<span class="tiny">Scratch cards: 5 pearls each, 5 a day. Prizes and odds are set in the game code.</span>' : `<textarea class="input" data-evf="text" data-evid="${esc(e.id)}" rows="3" maxlength="1200" placeholder="What the event is about" aria-label="Event text">${esc(e.text || '')}</textarea>`}
          <div class="row" style="gap:8px"><label class="btn mint sm">${icon('upload')}${bg ? 'Replace' : 'Upload'} wallpaper<input type="file" accept="image/*" class="sr" data-evbg="${esc(e.id)}"></label>
            ${bg ? `<button class="btn ghost sm" data-evbgdel="${esc(e.id)}">Remove wallpaper</button>` : ''}
            ${builtin ? '' : `<button class="link" data-evdel="${esc(e.id)}" style="color:${evDelArm === e.id ? '#ff6b81' : ''}">${evDelArm === e.id ? 'Tap again to delete' : 'Delete'}</button>`}</div>
        </div></div>`; }).join('')}
  </div>`;
  p.querySelectorAll('[data-evf]').forEach(i => i.onchange = () => { const e = eventOf(i.dataset.evid); if (!e) return; e[i.dataset.evf] = i.value.trim() || null; if (i.dataset.evf === 'name' && !e.name) e.name = 'Event'; persist(); });
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
