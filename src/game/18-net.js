/* =========================================================
   Multiplayer plaza: everyone in the plaza sees each other walk, chat and emote.
   Online it uses Supabase Realtime (presence + broadcast on one "plaza" channel), so there is no extra server to run.
   Offline the demo bots stay. Add ?mp=local to the URL to test multiplayer with two tabs of the same browser.
   ========================================================= */
const NET_ID = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
const remotes = new Map();   // player id → entity
let net = null, netSendT = 0, netTrackT = 0, netLast = { x: -1, y: -1, m: false, name: '' };

const netState = () => ({ id: NET_ID, name: S.player.name, mc: S.player.mc || 'm', x: +player.x.toFixed(2), y: +player.y.toFixed(2) });
const netNum = (v, d) => Number.isFinite(+v) ? clamp(+v, 0, N) : d;
function startNet() {
  if (net) return;
  if (new URLSearchParams(location.search).get('mp') === 'local' && 'BroadcastChannel' in window) net = localTransport();
  else if (Backend.on && sb) net = supabaseTransport();
  else return;
  // real players replace the demo bots
  for (const b of bots) entities.splice(entities.indexOf(b), 1);
  bots.length = 0; updateOnline();
  logChat('', 'Multiplayer is on: the people here are real players.', '', true);
  net.onEvent((ev, p) => {
    if (!p || p.id === NET_ID) return;
    if (ev === 'move') { const e = remoteFor(p); e.tx = netNum(p.x, e.tx); e.ty = netNum(p.y, e.ty); e.netMoving = !!p.m; }
    else if (ev === 'chat') { const e = remotes.get(p.id); if (e && typeof p.text === 'string') say(e, p.text.slice(0, 120)); }
    else if (ev === 'emote') { const e = remotes.get(p.id); if (e && EMOTES.includes(p.e)) emote(e, p.e); }
  });
  net.onPresence(list => {
    const seen = new Set();
    for (const p of list) { if (!p || p.id === NET_ID) continue; seen.add(p.id); remoteFor(p); }
    for (const [id, e] of remotes) if (!seen.has(id)) { remotes.delete(id); entities.splice(entities.indexOf(e), 1); }
    updateOnline();
  });
  net.start(netState());
}
/* the entity for a remote player; created on first sight, name and look kept up to date */
function remoteFor(p) {
  let e = remotes.get(p.id);
  const name = String(p.name || 'Traveler').slice(0, 16), mc = p.mc === 'f' ? 'f' : 'm';
  if (!e) {
    e = makeEntity(name, netNum(p.x, SPAWN.x), netNum(p.y, SPAWN.y), { ...MC_LOOK[mc] }, false);
    Object.assign(e, { net: true, tx: e.x, ty: e.y, mc });
    remotes.set(p.id, e); entities.push(e); updateOnline();
  }
  if (e.name !== name) e.name = name;
  if (e.mc !== mc) { e.mc = mc; e.look = { ...MC_LOOK[mc] }; }
  return e;
}
/* every frame: glide remote players toward their last known spot, and send our own position a few times a second */
function netUpdate(dt) {
  if (!net) return;
  for (const e of remotes.values()) {
    const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy);
    if (d > 4) { e.x = e.tx; e.y = e.ty; e.moving = false; continue; }   // teleported
    if (d > .02) {
      const k = Math.min(1, dt * 9); e.x += dx * k; e.y += dy * k;
      e.dir = Math.abs(dx) > Math.abs(dy) * 1.1 ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      e.moving = true; e.phase += dt * 9;
    } else e.moving = e.netMoving && d > .005;
  }
  netSendT -= dt; netTrackT -= dt;
  const moved = Math.hypot(player.x - netLast.x, player.y - netLast.y) > .01;
  if (netSendT <= 0 && (moved || player.moving !== netLast.m)) {
    netSendT = .1; netLast = { ...netLast, x: player.x, y: player.y, m: player.moving };
    net.send('move', { id: NET_ID, x: +player.x.toFixed(2), y: +player.y.toFixed(2), m: player.moving, name: S.player.name, mc: S.player.mc || 'm' });
  }
  // presence keeps the position for players who join later
  if (netTrackT <= 0) { netTrackT = 3; net.track(netState()); }
}
const netChat = text => { if (net) net.send('chat', { id: NET_ID, text }); };
const netEmote = e => { if (net) net.send('emote', { id: NET_ID, e }); };

/* Supabase Realtime: one public channel; presence = who is here (+ where), broadcast = moves, chat, emotes */
function supabaseTransport() {
  let ch = null, me = null, onEv = () => {}, onPres = () => {};
  return {
    onEvent(f) { onEv = f; }, onPresence(f) { onPres = f; },
    start(state) {
      me = state;
      ch = sb.channel('plaza', { config: { broadcast: { self: false }, presence: { key: NET_ID } } });
      for (const ev of ['move', 'chat', 'emote']) ch.on('broadcast', { event: ev }, msg => onEv(ev, msg.payload));
      ch.on('presence', { event: 'sync' }, () => onPres(Object.values(ch.presenceState()).map(a => a[a.length - 1])));
      ch.subscribe(status => { if (status === 'SUBSCRIBED') ch.track(me); else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('Plaza connection:', status); });
    },
    send(ev, payload) { if (ch) ch.send({ type: 'broadcast', event: ev, payload }); },
    track(state) { me = state; if (ch && ch.state === 'joined') ch.track(state); }
  };
}
/* local test transport: tabs of the same browser talk through a BroadcastChannel; presence by heartbeats */
function localTransport() {
  const bc = new BroadcastChannel('blank-plaza'), peers = new Map();
  let me = null, onEv = () => {}, onPres = () => {};
  const presence = () => onPres([...peers.values()].map(x => x.state));
  bc.onmessage = ({ data }) => {
    if (!data || !data.p || data.p.id === NET_ID) return;
    if (data.ev === 'hello' || data.ev === 'beat') {
      const isNew = !peers.has(data.p.id); peers.set(data.p.id, { state: data.p, seen: Date.now() });
      if (data.ev === 'hello') bc.postMessage({ ev: 'beat', p: me });
      if (isNew) presence();
    } else if (data.ev === 'bye') { peers.delete(data.p.id); presence(); }
    else onEv(data.ev, data.p);
  };
  setInterval(() => {
    if (me) bc.postMessage({ ev: 'beat', p: me });
    let gone = false; for (const [id, x] of peers) if (Date.now() - x.seen > 6000) { peers.delete(id); gone = true; }
    if (gone) presence();
  }, 2000);
  addEventListener('pagehide', () => { if (me) bc.postMessage({ ev: 'bye', p: me }); });
  return {
    onEvent(f) { onEv = f; }, onPresence(f) { onPres = f; },
    start(state) { me = state; bc.postMessage({ ev: 'hello', p: me }); },
    send(ev, payload) { bc.postMessage({ ev, p: payload }); },
    track(state) { me = state; }
  };
}
