/* =========================================================
   Cloud (Supabase): accounts, cloud saves, shared content, the admin's images, support messages.
   Turned on by VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (see .env.example and README).
   Without them, or when the server can't be reached, everything stays in this browser like before.
   ========================================================= */
const SB_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, ''), SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
// offline, the admin panel is open to whoever runs the game (set VITE_LOCAL_ADMIN=false to hide it); online, only admins see it
const LOCAL_ADMIN = import.meta.env.DEV || import.meta.env.VITE_LOCAL_ADMIN !== 'false';
let sb = null, saveTimer = null, contentTimer = null, cloudStatus = CLOUD_CONFIGURED ? 'connecting' : 'off';
const canAdmin = () => Backend.on ? Backend.isAdmin : LOCAL_ADMIN;
/* media keys like "art:aria" are stored in the public "media" bucket as art/aria */
const mediaPath = k => k.split(':').map(encodeURIComponent).join('/');
const mediaUrl = (k, v) => `${SB_URL}/storage/v1/object/public/media/${mediaPath(k)}${v ? `?v=${v}` : ''}`;
function applyMediaManifest() { for (const [k, v] of Object.entries(S.media || {})) MEDIA.set(k, mediaUrl(k, v)); }

Object.assign(Backend, {
  async upload(k, dataUrl) {
    const blob = await (await fetch(dataUrl)).blob();
    const { error } = await sb.storage.from('media').upload(mediaPath(k), blob, { upsert: true, contentType: blob.type, cacheControl: '31536000' });
    if (error) throw error;
    return mediaUrl(k, Date.now());
  },
  async remove(k) { const { error } = await sb.storage.from('media').remove([mediaPath(k)]); if (error) throw error; },
  saveChanged() { if (!this.on || !this.user) return; clearTimeout(saveTimer); saveTimer = setTimeout(pushSave, 2500); },
  contentChanged() { if (!this.canEditContent()) return; clearTimeout(contentTimer); contentTimer = setTimeout(pushContent, 1200); }
});

async function pushSave() {
  clearTimeout(saveTimer);
  if (!sb || !Backend.user) return;
  const { error } = await sb.from('saves').upsert({ user_id: Backend.user.id, data: splitState(S).save, updated_at: new Date().toISOString() });
  if (error) { console.warn('Cloud save failed', error); cloudStatus = 'save failed'; } else cloudStatus = 'saved';
}
async function pushContent() {
  clearTimeout(contentTimer);
  if (!Backend.canEditContent()) return false;
  const { error } = await sb.from('game_content').upsert({ id: 1, data: splitState(S).content, updated_at: new Date().toISOString(), updated_by: Backend.user.id });
  if (error) { console.warn('Publishing content failed', error); toast(`Could not publish to the server: ${error.message}`); return false; }
  return true;
}
// best effort: send pending changes when the tab is hidden or closed
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (saveTimer) pushSave(); if (contentTimer) pushContent(); } });

/* called from boot before anything is drawn; never blocks for more than a few seconds */
async function initBackend() {
  if (!CLOUD_CONFIGURED) return;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    sb = createClient(SB_URL, SB_KEY);
    const [content, auth] = await Promise.all([
      sb.from('game_content').select('data').eq('id', 1).maybeSingle(),
      sb.auth.getSession()
    ]);
    if (content.error) throw content.error;
    Backend.on = true; cloudStatus = 'connected';
    if (content.data && content.data.data) applyContent(content.data.data);
    applyMediaManifest();
    const session = auth.data && auth.data.session;
    if (session && await signedIn(session.user, false) === 'reload') return 'reload';
    sb.auth.onAuthStateChange((ev, ses) => {
      if (ev === 'SIGNED_OUT') signedOut();
      else if (ses && ses.user && (!Backend.user || ses.user.id !== Backend.user.id)) setTimeout(() => signedIn(ses.user, true), 0);
    });
  } catch (e) {
    console.warn('Cloud unavailable, playing offline', e);
    Backend.on = false; sb = null; cloudStatus = 'offline';
  }
}

/* account → save: the cloud save wins, unless this browser has newer progress for the same account */
async function signedIn(user, interactive) {
  Backend.user = user;
  const [prof, row] = await Promise.all([
    sb.from('profiles').select('is_admin, display_name').eq('id', user.id).maybeSingle(),
    sb.from('saves').select('data').eq('user_id', user.id).maybeSingle()
  ]);
  Backend.isAdmin = !!(prof.data && prof.data.is_admin);
  const provider = (user.app_metadata && user.app_metadata.provider) || 'email';
  const account = { type: provider === 'google' ? 'google' : 'email', email: user.email || null, userId: user.id, since: (S.account && S.account.userId === user.id && S.account.since) || Date.now() };
  const cloud = row.data && row.data.data, local = splitState(S).save;
  const localIsMine = S.account && S.account.userId === user.id;
  if (cloud && !(localIsMine && (local.savedAt || 0) >= (cloud.savedAt || 0))) {
    // load the account's progress: write it as this browser's save and restart the game on it
    localStorage.setItem(KEY, JSON.stringify({ ...cloud, account: account }));
    if (sessionStorage.getItem('pp.cloudLoad') === cloud.savedAt + '') { console.warn('Cloud save already loaded once, not reloading again'); }
    else { sessionStorage.setItem('pp.cloudLoad', cloud.savedAt + ''); if (interactive) toast('Loading your account…'); location.reload(); return 'reload'; }
  }
  S.account = account; persist(); pushSave();
  updateAdminAccess(); if (titleOn) renderTitle();
  if (interactive) { closeModal(); toast(cloud ? 'Signed in.' : 'Signed in. Your progress is now saved to your account.'); if (titleOn) enterGame(); }
  return 'ok';
}
async function signOut() {
  if (saveTimer) await pushSave();
  if (sb) await sb.auth.signOut();
  signedOut();
}
function signedOut() {
  Backend.user = null; Backend.isAdmin = false;
  // the progress belongs to the account (it is in the cloud): start this browser fresh
  localStorage.removeItem(KEY); sessionStorage.removeItem('pp.cloudLoad');
  location.reload();
}
function confirmSignOut() {
  openModal({ title: 'Sign out', ic: 'door', small: true, body: `<div class="stack"><p class="desc">Your progress is saved to your account. Signing out starts this browser fresh; sign in again any time to continue.</p>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>Cancel</button><button class="btn mint" id="soGo">Sign out</button></div></div>`,
    onMount: () => { $('#soGo').onclick = signOut; modalEl.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal); } });
}
function updateAdminAccess() { document.querySelectorAll('.rbtn[data-open=admin]').forEach(b => b.hidden = !canAdmin()); }

/* sign-in forms (title screen and Settings) */
async function cloudEmail(mode, email, password) {
  if (!sb) return 'The server is not connected.';
  const r = mode === 'up' ? await sb.auth.signUp({ email, password }) : await sb.auth.signInWithPassword({ email, password });
  if (r.error) return r.error.message;
  if (mode === 'up' && !r.data.session) return 'confirm';
  return null;   // onAuthStateChange takes it from here
}
async function cloudGoogle() {
  if (!sb) return;
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href.split('#')[0] } });
  if (error) toast(error.message);
}
async function sendSupport(topic, message) {
  if (!sb) return false;
  const { error } = await sb.from('support_messages').insert({ topic, message: `${message}\n\nUID ${S.profile.uid}`, user_id: Backend.user ? Backend.user.id : null, contact: Backend.user ? Backend.user.email : null });
  return !error;
}
async function loadSupportMessages() {
  if (!Backend.canEditContent()) return null;
  const { data, error } = await sb.from('support_messages').select('*').order('created_at', { ascending: false }).limit(50);
  return error ? null : data;
}
/* admin: push everything this browser has (content + every image in its cache) to the server */
async function publishLocalToCloud(progress) {
  if (!Backend.canEditContent()) return 'Sign in with an admin account first.';
  const local = await DB.all(), media = { ...S.media };
  let n = 0;
  for (const [k, v] of local) {
    if (typeof v !== 'string' || !v.startsWith('data:')) continue;
    progress && progress(`Uploading images ${++n}/${local.length}…`);
    MEDIA.set(k, await Backend.upload(k, v)); media[k] = Date.now();
  }
  S.media = media; persist();
  return await pushContent() ? null : 'Publishing the content failed.';
}
async function reloadCloudContent() {
  const { data, error } = await sb.from('game_content').select('data').eq('id', 1).maybeSingle();
  if (error) return error.message;
  if (!data) return 'The server has no content yet. Publish it first.';
  applyContent(data.data); applyMediaManifest(); renderMenu(); hydrateIcons();
  return null;
}

/* admin → Server tab: connection status, publishing this browser's content and images, support inbox */
async function renderServerTab() {
  const p = $('#adPanel'); if (!p) return;
  if (!CLOUD_CONFIGURED) {
    p.innerHTML = `<div class="stack"><h3>Server: not connected</h3>
      <p class="desc">The game runs fully in this browser. To add accounts, cloud saves, shared art and multiplayer, connect a free Supabase project:</p>
      <ol class="desc srv-steps"><li>Create a project at supabase.com.</li><li>In its SQL Editor, run <code>supabase/migrations/0001_init.sql</code> from this repository.</li>
      <li>Copy the project URL and anon key (Project Settings → API) into <code>.env.local</code> (see <code>.env.example</code>), or into the GitHub repository secrets for the website.</li>
      <li>Start the game, create an account, then make it admin with the line at the bottom of the SQL file.</li>
      <li>Come back here and press <b>Publish to the server</b> so every player gets your characters and art.</li></ol>
      <p class="tiny">The full guide is in README.md.</p></div>`;
    return;
  }
  const u = Backend.user;
  p.innerHTML = `<div class="stack">
    <div class="srv-status"><span class="dot ${Backend.on ? 'on' : ''}"></span><b>${Backend.on ? 'Connected' : 'Offline'}</b><span class="tiny">${esc(SB_URL)}</span></div>
    <p class="desc">${u ? `Signed in as <b>${esc(u.email || u.id)}</b>${Backend.isAdmin ? ' · <span class="feat">Admin</span>' : ' · not an admin: changes stay in this browser'}` : 'Not signed in. Sign in with your admin account to publish.'}</p>
    <div><h3>Publish</h3><p class="tiny">While you are signed in as an admin, every change you make in this panel (pool, banners, skins, clothes, memories, notices, images) goes to the server automatically and every player gets it on their next start. Use this button once to upload what you made in this browser before the server was connected.</p>
      <div class="row"><button class="btn mint" id="srvPub" ${Backend.canEditContent() ? '' : 'disabled'}>${icon('upload')}Publish to the server</button><button class="btn ghost" id="srvPull" ${Backend.on ? '' : 'disabled'}>Reload content from the server</button><span class="tiny" id="srvMsg"></span></div></div>
    <div><h3>Support messages</h3><div id="srvInbox" class="tiny">${Backend.canEditContent() ? 'Loading…' : 'Only admins can read them.'}</div></div>
  </div>`;
  const msg = t => { const m = $('#srvMsg'); if (m) m.textContent = t; };
  $('#srvPub').onclick = async () => { msg('Publishing…'); const err = await publishLocalToCloud(msg); msg(err || 'Published. Players get it on their next start.'); };
  $('#srvPull').onclick = async () => { const err = await reloadCloudContent(); msg(err || 'Content reloaded from the server.'); };
  const list = await loadSupportMessages(), box = $('#srvInbox');
  if (box && list) box.innerHTML = list.length ? `<div class="hist">${list.map(m => `<div><span><b>${esc(m.topic)}</b>: ${esc(m.message.slice(0, 140))}${m.contact ? ` · ${esc(m.contact)}` : ''}</span><time>${new Date(m.created_at).toLocaleDateString('en-GB')}</time></div>`).join('')}</div>` : 'No messages yet.';
}
