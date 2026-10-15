'use strict';
function v8Click(act, el, id) {
  switch (act) {
    case 'soc-retry': S.social.ready = true; S.social.loadedMe = false; S.social._lastTry = 0; socialInit(); return true;
    case 'soc-setup': socialSetup(); return true;
    case 'soc-add': socialAddFriend(); return true;
    case 'soc-public': socialSetPublic(!(S.social.profile && S.social.profile.is_public !== false)); return true;
    case 'soc-view': S.social.view = el.dataset.v === 'global' ? 'global' : 'friends'; renderProgreso(); return true;
    case 'soc-copy': {
      const c = S.social.profile && S.social.profile.code;
      if (c && navigator.clipboard) navigator.clipboard.writeText(c).then(() => toast('Código copiado.'), () => {});
      else toast('Tu código es ' + (c || ''));
      return true;
    }
  }
  return false;
}

/* ---------- v10: salud opcional (exámenes y preguntas al doctor), apagada por defecto ----------
   Si ya tienes exámenes o preguntas guardados, sigue visible hasta que la apagues. */
function healthOn() {
  const s = S.settings || {};
  if (s.healthOn === true) return true;
  if (s.healthOn === false) return false;
  return !!((S.labs && S.labs.length) || (S.questions && S.questions.length));
}
function healthRowHTML() {
  const on = healthOn(), dis = S.readonly || !S.loaded.settings ? ' disabled' : '';
  return '<div class="setrow"><div class="setrow-i"><b>Salud y exámenes</b><span>Muestra la pestaña Salud: exámenes médicos y preguntas al doctor.</span></div>' +
    '<button type="button" class="switch' + (on ? ' on' : '') + '" id="set-health" data-act="health-toggle" aria-pressed="' + on + '"' + dis + '><span class="sw"></span>' + (on ? 'Activado' : 'Desactivado') + '</button></div>';
}
function applyAppVis() {
  const t = document.getElementById('tab-salud');
  if (t) t.hidden = !healthOn();
}
function v10Click(act, el, id) {
  if (act === 'health-toggle') {
    if (S.readonly || !S.loaded.settings) return true;
    S.settings.healthOn = !healthOn();
    saveSettings();
    applyAppVis();
    if (!healthOn() && S.tab === 'salud') setTab('hoy'); else renderAjustes();
    toast(S.settings.healthOn ? 'Salud activada.' : 'Salud oculta. Puedes volver a activarla en Ajustes.');
    return true;
  }
  return false;
}

/* ---------- v11: Competencia (amigos + clanes) ----------
   Pestaña propia con ranking EN VIVO. Sin ranking global: solo amigos y clanes.
   Un clan comparte SOLO el juego de cada miembro (alias, nivel, racha, XP de la semana).
   Nunca comida, peso, medicamentos ni exámenes. Todo pasa por funciones controladas
   en Supabase (ver entrega/ascend-clanes.sql). */
S.club = { list: null, boards: {}, open: null, busy: '', err: '', editing: null, loaded: false, _poll: 0, _last: 0 };

function clubReady() { return !!S.social && S.social.ready !== false; }
function clubAmAdmin(c) { return !!c && (c.is_owner || c.role === 'admin'); }
function clubStatus(c) {
  const t = todayKey();
  if (c.starts_at && t < c.starts_at) return { k: 'soon', t: 'Empieza ' + fmtDateShort(c.starts_at) };
  if (c.ends_at && t > c.ends_at) return { k: 'ended', t: 'Terminó ' + fmtDateShort(c.ends_at) };
  if (c.ends_at) return { k: 'live', t: 'Termina ' + fmtDateShort(c.ends_at) };
  return { k: 'live', t: 'En curso' };
}
function fmtDateShort(d) {
  try { const p = String(d).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }); }
  catch (e) { return String(d || ''); }
}

async function clubLoad(force) {
  if (!sb || !store.userId || !S.social || !S.social.has) return;
  const now = Date.now();
  if (!force && S.club._last && now - S.club._last < 1200) return;
  S.club._last = now;
  try {
    const { data, error } = await sb.rpc('club_list');
    if (error) { if (socialNotReady(error)) S.social.ready = false; S.club.loaded = true; if (S.tab === 'club') renderClub(); return; }
    S.club.list = data || []; S.club.loaded = true;
    if (S.club.open && !S.club.list.some(c => c.id === S.club.open)) S.club.open = null;
    if (S.club.open) clubLoadBoard(S.club.open);
    if (S.tab === 'club') renderClub();
  } catch (e) { if (socialNotReady(e)) S.social.ready = false; S.club.loaded = true; if (S.tab === 'club') renderClub(); }
}
async function clubLoadBoard(id) {
  if (!sb || !id) return;
  try {
    const { data, error } = await sb.rpc('club_board', { p_club: id });
    if (!error) { S.club.boards[id] = data || []; if (S.tab === 'club') renderClub(); }
  } catch (e) {}
}
async function clubCreate() {
  if (S.club.busy) return;
  const inp = $('#club-name'); const name = String(inp ? inp.value : '').trim();
  if (name.length < 3) { S.club.err = 'Ponle un nombre de al menos 3 letras.'; renderClub(); return; }
  S.club.busy = 'create'; S.club.err = ''; renderClub();
  try {
    const { data, error } = await sb.rpc('club_create', { p_name: name });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    S.club.busy = ''; S.drafts['club-name'] = '';
    S.club.open = row && row.id ? row.id : null;
    await clubLoad(true);
    toast('Clan creado. Comparte el código ' + (row && row.code ? row.code : '') + '.');
  } catch (e) { S.club.busy = ''; S.club.err = clubErr(e); renderClub(); }
}
async function clubJoin() {
  if (S.club.busy) return;
  const inp = $('#club-code'); const code = String(inp ? inp.value : '').trim();
  if (code.length < 4) { S.club.err = 'Escribe el código del clan.'; renderClub(); return; }
  S.club.busy = 'join'; S.club.err = ''; renderClub();
  try {
    const { data, error } = await sb.rpc('club_join', { p_code: code });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    S.club.busy = ''; S.drafts['club-code'] = '';
    S.club.open = row && row.id ? row.id : null;
    await clubLoad(true);
    toast('Te uniste a ' + (row && row.name ? row.name : 'el clan') + '.');
  } catch (e) { S.club.busy = ''; S.club.err = clubErr(e); renderClub(); }
}
function clubErr(e) { return socialNotReady(e) ? 'Los clanes todavía no están disponibles. Corre el SQL en Supabase y reintenta.' : (e && e.message ? e.message : 'No se pudo.'); }
async function clubLeave(id) {
  try { const { error } = await sb.rpc('club_leave', { p_club: id }); if (error) throw error; if (S.club.open === id) S.club.open = null; await clubLoad(true); toast('Saliste del clan.'); }
  catch (e) { S.club.err = clubErr(e); renderClub(); }
}
async function clubSetAdmin(id, uid, on) {
  try { const { error } = await sb.rpc('club_set_admin', { p_club: id, p_user: uid, p_admin: on }); if (error) throw error; clubLoadBoard(id); toast(on ? 'Ahora es admin.' : 'Ya no es admin.'); }
  catch (e) { toast(clubErr(e)); }
}
async function clubRemove(id, uid) {
  try { const { error } = await sb.rpc('club_remove_member', { p_club: id, p_user: uid }); if (error) throw error; clubLoadBoard(id); clubLoad(true); toast('Miembro expulsado.'); }
  catch (e) { toast(clubErr(e)); }
}
async function clubSaveEdit(id) {
  const nm = $('#club-ename'), s = $('#club-start'), en = $('#club-end');
  const name = String(nm ? nm.value : '').trim();
  const starts = s && s.value ? s.value : null, ends = en && en.value ? en.value : null;
  if (name.length < 3) { toast('El nombre debe tener al menos 3 letras.'); return; }
  try { const { error } = await sb.rpc('club_update', { p_club: id, p_name: name, p_starts: starts, p_ends: ends }); if (error) throw error; S.club.editing = null; await clubLoad(true); toast('Clan actualizado.'); }
  catch (e) { toast(clubErr(e)); }
}
function clubPoll() {
  clearInterval(S.club._poll);
  S.club._poll = setInterval(() => {
    if (S.tab !== 'club') { clearInterval(S.club._poll); return; }
    if (S.daysLoaded) { S.social._pub = 0; socialPublish(true); }
    clubLoad(true); socialLoadBoards();
  }, 15000);
}

function clubMemberRow(m, c, admin) {
  const you = m.me ? ' <small>(tú)</small>' : '';
  const tag = m.role === 'admin' ? '<span class="club-adm">admin</span>' : '';
  let ctrl = '';
  if (admin && !m.me) {
    ctrl = '<div class="club-mctrl">' +
      '<button type="button" class="btn xs quiet" data-act="club-admin" data-id="' + c.id + '" data-u="' + m.user_id + '" data-on="' + (m.role === 'admin' ? '0' : '1') + '">' + (m.role === 'admin' ? 'Quitar admin' : 'Hacer admin') + '</button>' +
      '<button type="button" class="btn xs danger" data-act="club-kick" data-id="' + c.id + '" data-u="' + m.user_id + '">Expulsar</button></div>';
  }
  return '<div class="lb-row' + (m.me ? ' me' : '') + '"><span class="lb-pos">' + '</span>' + socBadge(m.rank) +
    '<span class="lb-name">' + esc(m.username) + you + ' ' + tag + '</span>' +
    '<span class="lb-xp">' + fmtInt(m.week_xp || 0) + ' XP</span>' + ctrl + '</div>';
}
function clubBoardHTML(c) {
  const board = S.club.boards[c.id];
  if (!board) { clubLoadBoard(c.id); return '<p class="empty">Cargando…</p>'; }
  const admin = clubAmAdmin(c);
  const rows = board.slice().sort((a, b) => (b.week_xp || 0) - (a.week_xp || 0));
  return '<div class="lb club-lb">' + rows.map((m, i) =>
    clubMemberRow(Object.assign({}, m, {}), c, admin).replace('<span class="lb-pos"></span>', '<span class="lb-pos">' + (i + 1) + '</span>')
  ).join('') + '</div>';
}
function clubEditHTML(c) {
  return '<div class="club-edit"><div class="field"><label class="lbl" for="club-ename">Nombre</label>' +
    '<input type="text" id="club-ename" maxlength="30" value="' + esc(c.name) + '"></div>' +
    '<div class="amt-row"><div class="field"><label class="lbl" for="club-start">Inicio</label><input type="date" id="club-start" value="' + esc(c.starts_at || '') + '"></div>' +
    '<div class="field"><label class="lbl" for="club-end">Fin</label><input type="date" id="club-end" value="' + esc(c.ends_at || '') + '"></div></div>' +
    '<div class="reto-acts"><button type="button" class="btn sm" data-act="club-save" data-id="' + c.id + '">Guardar</button>' +
    '<button type="button" class="btn sm quiet" data-act="club-editx">Cancelar</button></div></div>';
}
function clubCardHTML(c) {
  const open = S.club.open === c.id;
  const admin = clubAmAdmin(c);
  const st = clubStatus(c);
  const head = '<button type="button" class="club-head" data-act="club-open" data-id="' + c.id + '" aria-expanded="' + open + '">' +
    '<span class="club-nm">' + esc(c.name) + '</span>' +
    '<span class="club-meta"><span class="club-st ' + st.k + '">' + st.t + '</span> · ' + c.members + (c.members === 1 ? ' miembro' : ' miembros') + '</span>' +
    '<span class="club-caret">' + (open ? '▾' : '▸') + '</span></button>';
  if (!open) return '<section class="card club-card">' + head + '</section>';
  let body = '<div class="club-codeline"><span>Código para invitar</span><div class="soc-code-v"><code>' + esc(c.code) + '</code>' +
    '<button type="button" class="btn sm quiet" data-act="club-copy" data-code="' + esc(c.code) + '">Copiar</button></div></div>';
  body += clubBoardHTML(c);
  if (admin && S.club.editing === c.id) body += clubEditHTML(c);
  body += '<div class="club-acts">';
  if (admin && S.club.editing !== c.id) body += '<button type="button" class="btn sm quiet" data-act="club-edit" data-id="' + c.id + '">Editar clan</button>';
  body += '<button type="button" class="btn sm ' + (S.confirmDel === ('club:' + c.id) ? 'danger' : 'quiet') + '" data-act="club-leave" data-id="' + c.id + '">' + (S.confirmDel === ('club:' + c.id) ? '¿Seguro? Salir' : 'Salir del clan') + '</button></div>';
  return '<section class="card club-card open">' + head + '<div class="club-body">' + body + '</div></section>';
}

function clubActivateHTML() {
  const dis = S.social.busy ? ' disabled' : '';
  return '<section class="card"><div class="card-h"><h2>Competencia</h2></div>' +
    '<p class="prose">Para competir con amigos y en clanes, primero elige tu <b>alias</b>. Se comparte solo tu alias, nivel, racha y XP — nunca tu salud.</p>' +
    '<div class="field"><label class="lbl" for="soc-name">Tu alias</label><input type="text" id="soc-name" data-draft maxlength="20" autocomplete="off" placeholder="Ej: felipe_fit" value="' + esc(draft('soc-name', '')) + '"></div>' +
    '<label class="consent sm"><input type="checkbox" id="soc-public" checked><span>Aparecer también en rankings públicos (puedes apagarlo luego).</span></label>' +
    (S.social.err ? '<p class="form-err">' + esc(S.social.err) + '</p>' : '') +
    '<button type="button" class="btn" data-act="soc-setup"' + dis + '>' + (S.social.busy ? 'Activando…' : 'Activar') + '</button></section>';
}
function renderClub() {
  const root = $('#view-club'); if (!root) return;
  socialMaybeInit();
  if (!S.social.loadedMe && clubReady()) { swap(root, '<section class="card"><p class="empty">Cargando…</p></section>'); return; }
  if (!clubReady()) {
    swap(root, '<section class="card"><div class="card-h"><h2>Competencia</h2></div><p class="empty">La competencia todavía no está disponible. Si ya corriste el SQL en Supabase, espera un momento y reintenta.</p><button type="button" class="btn sm quiet" data-act="soc-retry">Reintentar</button></section>');
    return;
  }
  if (!S.social.has) { swap(root, clubActivateHTML()); return; }
  clubPoll();
  if (S.daysLoaded) socialPublish(false);
  if (!S.social.fboard) socialLoadBoards();
  if (!S.club.loaded) clubLoad(true);
  const p = S.social.profile || {};

  let html = '';
  // ranking de amigos
  html += '<section class="card"><div class="card-h"><h2>Amigos</h2><span class="meta">esta semana</span></div>' +
    socRows(S.social.fboard, false) + '</section>';
  // tu código + agregar amigo
  html += '<section class="card"><div class="card-h"><h2>Tu código</h2></div>' +
    '<div class="soc-code"><span class="soc-code-l">Compártelo para que te agreguen</span><div class="soc-code-v"><code>' + esc(p.code || '······') + '</code><button type="button" class="btn sm quiet" data-act="soc-copy">Copiar</button></div></div>' +
    '<div class="field soc-add"><label class="lbl" for="soc-code">Agregar amigo por código</label><div class="amt-row"><input type="text" id="soc-code" data-draft maxlength="6" autocomplete="off" placeholder="ABC123" value="' + esc(draft('soc-code', '')) + '"><button type="button" class="btn sm" data-act="soc-add">Agregar</button></div></div>' +
    (S.social.err ? '<p class="form-err">' + esc(S.social.err) + '</p>' : '') + '</section>';
  // clanes
  let clanes = '<section class="card"><div class="card-h"><h2>Tus clanes</h2>' + (S.club.list ? '<span class="meta">' + S.club.list.length + '</span>' : '') + '</div>';
  if (!S.club.loaded && !S.club.list) clanes += '<p class="empty">Cargando…</p>';
  else if (!S.club.list || !S.club.list.length) clanes += '<p class="empty">Aún no estás en ningún clan. Crea uno o únete con un código.</p>';
  clanes += '</section>';
  html += clanes;
  if (S.club.list) html += S.club.list.map(clubCardHTML).join('');
  // crear / unirse
  const dc = S.club.busy === 'create' ? ' disabled' : '', dj = S.club.busy === 'join' ? ' disabled' : '';
  html += '<section class="card"><div class="card-h"><h2>Crear o unirte</h2></div>' +
    '<div class="field"><label class="lbl" for="club-name">Crear un clan nuevo</label><div class="amt-row"><input type="text" id="club-name" data-draft maxlength="30" autocomplete="off" placeholder="Ej: Los disciplinados" value="' + esc(draft('club-name', '')) + '"><button type="button" class="btn sm" data-act="club-create"' + dc + '>' + (S.club.busy === 'create' ? 'Creando…' : 'Crear') + '</button></div></div>' +
    '<div class="field"><label class="lbl" for="club-code">Unirte con un código</label><div class="amt-row"><input type="text" id="club-code" data-draft maxlength="6" autocomplete="off" placeholder="ABC123" value="' + esc(draft('club-code', '')) + '"><button type="button" class="btn sm" data-act="club-join"' + dj + '>' + (S.club.busy === 'join' ? 'Entrando…' : 'Unirme') + '</button></div></div>' +
    (S.club.err ? '<p class="form-err">' + esc(S.club.err) + '</p>' : '') +
    '<p class="hint">En un clan se ve el alias, nivel, racha y XP de cada miembro. Nunca su comida, peso, medicamentos ni exámenes.</p></section>';
  swap(root, html);
}

function v11Click(act, el, id) {
  switch (act) {
    case 'club-create': clubCreate(); return true;
    case 'club-join': clubJoin(); return true;
    case 'club-open': S.club.open = S.club.open === el.dataset.id ? null : el.dataset.id; S.club.editing = null; if (S.club.open) clubLoadBoard(S.club.open); renderClub(); return true;
    case 'club-leave': confirmOrDo('club:' + el.dataset.id, () => clubLeave(el.dataset.id), renderClub); return true;
    case 'club-edit': S.club.editing = el.dataset.id; renderClub(); return true;
    case 'club-editx': S.club.editing = null; renderClub(); return true;
    case 'club-save': clubSaveEdit(el.dataset.id); return true;
    case 'club-admin': clubSetAdmin(el.dataset.id, el.dataset.u, el.dataset.on === '1'); return true;
    case 'club-kick': confirmOrDo('kick:' + el.dataset.u, () => clubRemove(el.dataset.id, el.dataset.u), renderClub); return true;
    case 'club-copy': {
      const c = el.dataset.code || '';
      if (c && navigator.clipboard) navigator.clipboard.writeText(c).then(() => toast('Código copiado.'), () => {});
      else toast('El código es ' + c);
      return true;
    }
  }
  return false;
}

secInstall();
boot();
