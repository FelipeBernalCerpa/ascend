'use strict';
function quoteOfDay() {
  if (!QUOTES.length) return null;
  const k = (typeof todayKey === 'function') ? todayKey() : new Date().toISOString().slice(0, 10);
  const d = (typeof parseKey === 'function') ? parseKey(k) : new Date(k);
  const n = Math.floor(d.getTime() / 86400000);
  return QUOTES[((n % QUOTES.length) + QUOTES.length) % QUOTES.length];
}
function quoteHTML() {
  const q = quoteOfDay();
  if (!q) return '';
  return '<div class="quote-hoy" role="note"><p class="q-t">' + esc(q.t) + '</p><p class="q-a">' + esc(q.a) + '</p></div>';
}

/* ---------- v7: jefes finales editables ----------
   Una meta grande dividida en etapas; cada etapa tiene hábitos que marcas. Al terminar todo, derrotas al jefe y ganas XP. */
S.bosses = null; S.loaded.bosses = false;
const MAX_BOSSES = 12, MAX_STAGES = 8, MAX_BITEMS = 12;
const BOSS_ICONS = ['🧥', '🏃', '💪', '🏆', '🎯', '📚', '🧠', '🥇', '⛰️', '🔥', '💰', '🎸', '🩺', '🌱'];

function bossesList() { return (S.bosses && Array.isArray(S.bosses.items) ? S.bosses.items : []).filter(b => b && b.id && b.name); }
function saveBosses(items) {
  S.bosses = { items: items.slice(0, MAX_BOSSES) };
  saver.queue('config/bosses', clone(S.bosses), 200);
}
function bossProg(b) {
  let total = 0, done = 0, active = 0, found = false;
  const stages = Array.isArray(b.stages) ? b.stages : [];
  stages.forEach((s, i) => {
    const items = Array.isArray(s.items) ? s.items : [];
    total += items.length;
    const d = items.filter(x => x && x.done).length;
    done += d;
    if (!found && d < items.length) { active = i; found = true; }
  });
  if (!found) active = Math.max(0, stages.length - 1);
  return { total, done, pct: total ? Math.round(done / total * 100) : 0, active, defeated: total > 0 && done >= total };
}
function stageDone(s) { const it = Array.isArray(s.items) ? s.items : []; return it.length > 0 && it.every(x => x && x.done); }
function bossBonusXP() {
  let xp = 0;
  for (const b of bossesList()) {
    for (const s of (b.stages || [])) if (stageDone(s)) xp += 40;
    if (bossProg(b).defeated) xp += 150;
  }
  return xp;
}

function bossCardHTML(b) {
  const p = bossProg(b);
  return '<button type="button" class="bosscard' + (p.defeated ? ' won' : '') + '" id="bc-' + esc(b.id) + '" data-act="boss-open" data-id="' + esc(b.id) + '">' +
    '<span class="bc-ic">' + esc(b.icon || '🎯') + '</span>' +
    '<span class="bc-b"><span class="bc-n">' + esc(b.name) + '</span>' +
      '<span class="bc-s">' + (p.defeated ? '¡Derrotado!' : 'Etapa ' + (p.active + 1) + ' de ' + (b.stages ? b.stages.length : 0)) + ' · ' + p.done + '/' + p.total + '</span>' +
      '<span class="bc-bar"><i style="width:' + p.pct + '%"></i></span></span>' +
    (p.defeated ? '<span class="bc-win">🏆</span>' : '') + '</button>';
}
function bossSectionHTML() {
  const list = bossesList(), dis = S.readonly || !S.loaded.bosses ? ' disabled' : '';
  let html = '<section class="card" id="card-boss"><div class="card-h"><h2>Jefes finales</h2><span class="meta">' + list.length + '</span></div>';
  if (!S.loaded.bosses) html += '<p class="empty">Cargando…</p>';
  else if (!list.length) html += '<p class="empty">Un jefe final es una meta grande por etapas. Elige algo que quieras lograr y conviértelo en tu próximo reto.</p>';
  else html += '<div class="bosses">' + list.map(bossCardHTML).join('') + '</div>';
  html += '<button type="button" class="btn add-top" id="boss-new" data-act="boss-new"' + dis + '>Nuevo jefe final</button>' +
    '<p class="hint">Cada hábito que marcas le quita vida al jefe. Al vaciar su barra, lo derrotas y ganas XP.</p></section>';
  return html;
}

function shBossHTML(st) {
  if (st.step === 'edit') return shBossEditHTML(st);
  const b = bossesList().find(x => x.id === st.id);
  if (!b) return sheetTop('Jefe final') + '<p class="empty">Este jefe ya no existe.</p>';
  const p = bossProg(b), armed = S.confirmDel === 'bdel:' + b.id;
  let body = '';
  (b.stages || []).forEach((s, i) => {
    const sd = stageDone(s), act = i === p.active && !p.defeated;
    body += '<div class="bstage' + (sd ? ' done' : act ? ' act' : '') + '"><div class="bst-h"><span class="bst-n">' + esc(s.name || ('Etapa ' + (i + 1))) + '</span>' + (sd ? '<span class="bst-mk">✅</span>' : act ? '<span class="bst-mk">⚔️</span>' : '') + '</div>';
    (s.items || []).forEach(it => {
      body += '<button type="button" class="bitem' + (it.done ? ' done' : '') + '" data-act="boss-check" data-id="' + esc(b.id) + '" data-si="' + s.id + '" data-ii="' + it.id + '"' + (S.readonly ? ' disabled' : '') + '><span class="bchk' + (it.done ? ' on' : '') + '">' + (it.done ? '✓' : '') + '</span><span>' + esc(it.t) + '</span></button>';
    });
    body += '</div>';
  });
  return sheetTop((b.icon || '🎯') + '  ' + b.name) +
    (b.reward ? '<p class="boss-reward">🎁 Recompensa: ' + esc(b.reward) + '</p>' : '') +
    '<div class="hp-row"><span class="hp-l">' + (p.defeated ? 'Jefe derrotado' : 'Vida del jefe') + '</span><span class="hp-r">' + (p.defeated ? '0%' : 'quedan ' + (100 - p.pct) + '%') + '</span></div>' +
    '<div class="hpbar"><i style="width:' + (100 - p.pct) + '%"></i></div>' +
    (p.defeated ? '<p class="boss-won">🏆 ¡Lo lograste! Reclama tu recompensa.</p>' : '') +
    '<div class="bstages">' + (body || '<p class="empty">Este jefe no tiene etapas todavía. Edítalo para agregarlas.</p>') + '</div>' +
    '<div class="row"><button type="button" class="btn" id="boss-edit" data-act="boss-edit" data-id="' + esc(b.id) + '"' + (S.readonly ? ' disabled' : '') + '>Editar jefe</button>' +
      '<button type="button" class="btn sm ' + (armed ? 'danger' : 'quiet') + '" id="boss-del" data-act="boss-del" data-id="' + esc(b.id) + '">' + (armed ? 'Toca otra vez para borrarlo' : 'Borrar') + '</button></div>';
}
function shBossEditHTML(st) {
  const f = st.f;
  const stagesHTML = f.stages.map((s, i) =>
    '<div class="bedit-stage"><div class="bedit-sth"><input type="text" class="bedit-stname" id="bf-stname-' + i + '" data-bf="stname" data-si="' + i + '" maxlength="40" placeholder="Nombre de la etapa" value="' + esc(s.name) + '">' +
      '<button type="button" class="iconbtn" data-act="bf-delstage" data-si="' + i + '" aria-label="Borrar etapa">✕</button></div>' +
      s.items.map((it, j) => '<div class="bedit-item"><input type="text" id="bf-itext-' + i + '-' + j + '" data-bf="itext" data-si="' + i + '" data-ii="' + j + '" maxlength="60" placeholder="Hábito o mini-meta" value="' + esc(it.t) + '"><button type="button" class="iconbtn" data-act="bf-delitem" data-si="' + i + '" data-ii="' + j + '" aria-label="Borrar">✕</button></div>').join('') +
      '<button type="button" class="btn sm quiet" data-act="bf-additem" data-si="' + i + '">+ Hábito</button></div>'
  ).join('');
  return sheetTop(st.id ? 'Editar jefe' : 'Nuevo jefe final') +
    '<form class="sh-form" data-form="sh-boss" novalidate>' +
      '<div class="field"><label class="lbl" for="bf-name">Meta (el jefe)</label><input type="text" id="bf-name" data-bf="name" maxlength="50" placeholder="Correr 5 km sin parar" value="' + esc(f.name) + '"></div>' +
      '<div class="field"><label class="lbl" for="bf-reward">Recompensa (opcional)</label><input type="text" id="bf-reward" data-bf="reward" maxlength="80" placeholder="Lo que te darás al ganar" value="' + esc(f.reward) + '"></div>' +
      '<div class="field"><span class="lbl">Ícono</span><div class="iconpick">' + BOSS_ICONS.map(ic => '<button type="button" class="iconopt' + (ic === f.icon ? ' on' : '') + '" data-act="bf-icon" data-v="' + ic + '">' + ic + '</button>').join('') + '</div></div>' +
      '<div class="field"><span class="lbl">Etapas y hábitos</span>' + stagesHTML + '</div>' +
      '<button type="button" class="btn sm quiet" id="bf-addstage" data-act="bf-addstage">+ Etapa</button>' +
      '<p class="form-err" id="sh-err">' + esc(st.err || '') + '</p>' +
      '<button type="submit" class="btn" id="bf-save">' + (st.id ? 'Guardar jefe' : 'Crear jefe') + '</button>' +
    '</form><p class="hint">Divide la meta en 2 a 6 etapas. En cada etapa pon los hábitos que te acercan.</p>';
}
function bossSync() {
  const st = S.sheet;
  if (!st || st.kind !== 'boss' || st.step !== 'edit') return;
  const f = st.f, nm = $('#bf-name'), rw = $('#bf-reward');
  if (nm) f.name = nm.value;
  if (rw) f.reward = rw.value;
  f.stages.forEach((s, i) => {
    const sn = document.getElementById('bf-stname-' + i);
    if (sn) s.name = sn.value;
    s.items.forEach((it, j) => { const el = document.getElementById('bf-itext-' + i + '-' + j); if (el) it.t = el.value; });
  });
}
function openBoss(id) {
  if (!id) return;
  openSheet({ kind: 'boss', step: 'view', id });
}
function openBossEdit(id) {
  if (S.readonly || !S.loaded.bosses) return;
  const b = id ? bossesList().find(x => x.id === id) : null;
  const f = b ? { name: b.name, reward: b.reward || '', icon: b.icon || '🎯', stages: (b.stages || []).map(s => ({ name: s.name || '', items: (s.items || []).map(it => ({ t: it.t })) })) }
    : { name: '', reward: '', icon: BOSS_ICONS[0], stages: [{ name: '', items: [{ t: '' }] }] };
  const st = { kind: 'boss', step: 'edit', id: id || null, f, err: '' };
  if (S.sheet) { S.sheet = st; renderSheet(); } else openSheet(st);
  if (!id) focusEl('bf-name');
}
function bossSave() {
  const st = S.sheet;
  if (!st || st.kind !== 'boss' || st.step !== 'edit' || S.readonly) return;
  bossSync();
  const f = st.f, name = String(f.name || '').trim().slice(0, 50);
  const list = bossesList().map(x => clone(x));
  let err = '';
  const stages = f.stages.map((s, i) => ({ id: 's' + uid(), name: String(s.name || '').trim().slice(0, 40), items: s.items.map(it => ({ id: 'i' + uid(), t: String(it.t || '').trim().slice(0, 60), done: false })).filter(it => it.t) })).filter(s => s.items.length);
  if (!name) err = 'Escribe la meta del jefe.';
  else if (!st.id && list.length >= MAX_BOSSES) err = 'Puedes tener hasta ' + MAX_BOSSES + ' jefes.';
  else if (!stages.length) err = 'Agrega al menos una etapa con un hábito.';
  if (err) { sheetErr(st, err); return; }
  const prev = st.id ? list.find(x => x.id === st.id) : null;
  if (prev) {
    /* conserva lo ya marcado: empareja por texto dentro de cada etapa en orden */
    const oldItems = []; (prev.stages || []).forEach(s => (s.items || []).forEach(it => oldItems.push(it)));
    stages.forEach(s => s.items.forEach(it => { const m = oldItems.find(o => o && !o._used && norm(o.t) === norm(it.t)); if (m && m.done) { it.done = true; m._used = true; } }));
  }
  const boss = { id: st.id || 'b' + uid(), name, reward: String(f.reward || '').trim().slice(0, 80), icon: f.icon || '🎯', stages, createdAt: prev ? prev.createdAt : Date.now() };
  const i = list.findIndex(x => x.id === boss.id);
  if (i >= 0) list[i] = boss; else list.push(boss);
  saveBosses(list);
  st.step = 'view'; st.id = boss.id; renderSheet();
  renderActive();
  toast(prev ? 'Jefe actualizado.' : 'Jefe creado: ' + name + '.');
}
function bossDelete(id) {
  confirmOrDo('bdel:' + id, () => {
    saveBosses(bossesList().filter(x => x.id !== id));
    closeSheet();
    renderActive();
    toast('Jefe borrado.');
  }, () => { if (S.sheet && S.sheet.kind === 'boss') renderSheet(); });
}
function bossCheck(id, sid, iid) {
  if (S.readonly || !S.loaded.bosses) return;
  const list = bossesList().map(x => clone(x));
  const b = list.find(x => x.id === id);
  if (!b) return;
  const wasDef = bossProg(b).defeated;
  let it = null;
  for (const s of (b.stages || [])) if (s.id === sid) for (const x of (s.items || [])) if (x.id === iid) it = x;
  if (!it) return;
  it.done = !it.done;
  saveBosses(list);
  const def = bossProg(b).defeated;
  renderSheet();
  renderActive();
  if (def && !wasDef) toast('🏆 ¡Derrotaste a «' + b.name + '»! +XP');
}
function v7Click(act, el, id) {
  const st = S.sheet;
  switch (act) {
    case 'boss-new': openBossEdit(null); return true;
    case 'boss-open': openBoss(el.dataset.id); return true;
    case 'boss-edit': openBossEdit(el.dataset.id); return true;
    case 'boss-del': bossDelete(el.dataset.id); return true;
    case 'boss-check': bossCheck(el.dataset.id, el.dataset.si, el.dataset.ii); return true;
    case 'bf-icon': if (st && st.kind === 'boss' && st.step === 'edit') { bossSync(); st.f.icon = el.dataset.v; renderSheet(); } return true;
    case 'bf-addstage': if (st && st.kind === 'boss' && st.step === 'edit') { bossSync(); if (st.f.stages.length >= MAX_STAGES) { sheetErr(st, 'Hasta ' + MAX_STAGES + ' etapas.'); return true; } st.f.stages.push({ name: '', items: [{ t: '' }] }); renderSheet(); } return true;
    case 'bf-delstage': if (st && st.kind === 'boss' && st.step === 'edit') { bossSync(); st.f.stages.splice(Number(el.dataset.si), 1); renderSheet(); } return true;
    case 'bf-additem': if (st && st.kind === 'boss' && st.step === 'edit') { bossSync(); const s = st.f.stages[Number(el.dataset.si)]; if (s) { if (s.items.length >= MAX_BITEMS) { sheetErr(st, 'Hasta ' + MAX_BITEMS + ' hábitos por etapa.'); return true; } s.items.push({ t: '' }); } renderSheet(); } return true;
    case 'bf-delitem': if (st && st.kind === 'boss' && st.step === 'edit') { bossSync(); const s = st.f.stages[Number(el.dataset.si)]; if (s) s.items.splice(Number(el.dataset.ii), 1); renderSheet(); } return true;
  }
  return false;
}
function v7Submit(kind) {
  if (kind === 'sh-boss') { bossSave(); return true; }
  return false;
}

/* ---------- v8: amigos y ranking ----------
   Comparte SOLO el juego (alias, nivel, racha, logros). Nunca comida, peso, medicamentos ni exámenes.
   Todo pasa por funciones controladas en Supabase (ver entrega/ascend-social.sql). */
S.social = { profile: null, has: false, ready: true, loadedMe: false, fboard: null, gboard: null, view: 'friends', busy: false, err: '', _pub: 0 };

function weekXP() {
  let t = 0; const tk = todayKey(); let k = weekStart(tk);
  for (let i = 0; i < 8 && k <= tk; i++) { t += gDayXP(k); k = addDays(k, 1); }
  return t;
}
function achCount() {
  const a = achStats();
  return [a.best, a.water, a.habits, a.exDays, a.logged].filter(x => x > 0).length;
}
function rankByName(name) {
  const base = String(name || '').split(' ')[0];
  return RANKS.find(r => r.name === base) || RANKS[0];
}
function socialNotReady(e) {
  const m = ((e && (e.message || e.msg)) || '') + ' ' + ((e && e.code) || '');
  return /does not exist|not found|42P01|PGRST202|schema cache|Could not find/i.test(m);
}

async function socialLoadMe() {
  if (!sb || !store.userId) return;
  try {
    const { data, error } = await sb.from('profiles').select('username,code,rank,xp,week_xp,streak,ach,is_public').eq('user_id', store.userId).maybeSingle();
    if (error) { if (socialNotReady(error)) S.social.ready = false; S.social.loadedMe = true; return; }
    S.social.profile = data || null; S.social.has = !!data; S.social.ready = true; S.social.loadedMe = true;
  } catch (e) { if (socialNotReady(e)) S.social.ready = false; S.social.loadedMe = true; }
}
async function socialInit() {
  await socialLoadMe();
  if (S.social.has && S.daysLoaded) socialPublish(true);
  if (S.tab === 'ajustes') renderAjustes();
}
async function socialPublish(force) {
  if (!sb || !store.userId || !S.social.profile) return;
  const now = Date.now();
  if (!force && now - S.social._pub < 20000) return;
  S.social._pub = now;
  const g = gameStats();
  try {
    const { data, error } = await sb.rpc('game_publish', {
      p_username: S.social.profile.username, p_rank: g.rankObj.name + (g.divName ? ' ' + g.divName : ''),
      p_xp: g.raw, p_week_xp: weekXP(), p_streak: g.streak, p_ach: achCount(),
      p_public: S.social.profile.is_public !== false
    });
    if (!error && data) S.social.profile.code = data;
  } catch (e) {}
}
async function socialSetup() {
  if (S.social.busy) return;
  const inp = $('#soc-name'), pub = $('#soc-public');
  const name = String(inp ? inp.value : '').trim();
  const isPub = pub ? !!pub.checked : true;
  if (name.length < 3) { S.social.err = 'El nombre debe tener al menos 3 letras.'; renderAjustes(); return; }
  S.social.busy = true; S.social.err = ''; renderAjustes();
  const g = gameStats();
  try {
    const { data, error } = await sb.rpc('game_publish', { p_username: name, p_rank: g.rankObj.name + (g.divName ? ' ' + g.divName : ''), p_xp: g.raw, p_week_xp: weekXP(), p_streak: g.streak, p_ach: achCount(), p_public: isPub });
    if (error) throw error;
    S.social.profile = { username: name, code: data, is_public: isPub, rank: g.rankObj.name, week_xp: weekXP(), streak: g.streak };
    S.social.has = true; S.social.busy = false; S.social.err = '';
    renderActive();
    toast('¡Listo! Tu alias es ' + name + '.');
  } catch (e) {
    S.social.busy = false;
    S.social.err = socialNotReady(e) ? 'El ranking todavía no está disponible.' : (e && e.message ? e.message : 'No se pudo activar.');
    renderAjustes();
  }
}
async function socialSetPublic(on) {
  if (!S.social.profile) return;
  S.social.profile.is_public = on;
  renderActive();
  S.social._pub = 0; await socialPublish(true);
}
async function socialAddFriend() {
  if (S.social.busy) return;
  const inp = $('#soc-code');
  const code = String(inp ? inp.value : '').trim();
  if (code.length < 4) { S.social.err = 'Escribe el código de tu amigo.'; renderAjustes(); return; }
  S.social.busy = true; S.social.err = ''; renderAjustes();
  try {
    const { data, error } = await sb.rpc('game_add_friend', { p_code: code });
    if (error) throw error;
    S.social.busy = false; S.social.fboard = null;
    renderActive();
    toast('Agregaste a ' + (data || 'tu amigo') + '.');
    socialLoadBoards();
  } catch (e) {
    S.social.busy = false;
    S.social.err = socialNotReady(e) ? 'El ranking todavía no está disponible.' : (e && e.message ? e.message : 'No se pudo agregar.');
    renderAjustes();
  }
}
async function socialLoadBoards() {
  if (!sb || !store.userId || !S.social.has) return;
  if (S.daysLoaded) { S.social._pub = 0; await socialPublish(true); }
  try {
    const [f, g] = await Promise.all([sb.rpc('game_friends_board'), sb.rpc('game_global_board')]);
    if (!f.error) S.social.fboard = f.data || [];
    if (!g.error) S.social.gboard = g.data || [];
    if (S.tab === 'progreso') renderProgreso();
  } catch (e) {}
}

function socBadge(rankName) {
  const r = rankByName(rankName);
  return '<span class="soc-badge" style="--rc:' + r.color + '">' + r.icon + '</span>';
}
function socRows(list, global) {
  if (!list) return '<p class="empty">Cargando…</p>';
  if (!list.length || (list.length === 1 && list[0].me)) return global ? '<p class="empty">Aún no hay nadie en el ranking global. ¡Podrías ser el primero!</p>' : '<p class="empty">Todavía no tienes amigos aquí. Agrega a alguien con su código en Ajustes.</p>';
  return '<div class="lb">' + list.map((r, i) => {
    const pos = global && r.pos ? r.pos : i + 1;
    return '<div class="lb-row' + (r.me ? ' me' : '') + '"><span class="lb-pos">' + pos + '</span>' + socBadge(r.rank) +
      '<span class="lb-name">' + esc(r.username) + (r.me ? ' <small>(tú)</small>' : '') + '</span>' +
      '<span class="lb-xp">' + fmtInt(r.week_xp || 0) + ' XP</span></div>';
  }).join('') + '</div>';
}
function socialMaybeInit() { if (!S.social.loadedMe && sb && typeof store !== 'undefined' && store.userId) socialInit(); }
function rankingCardHTML() {
  socialMaybeInit();
  if (!S.social.has) {
    return '<section class="card" id="card-rank"><div class="card-h"><h2>Ranking</h2></div>' +
      (S.social.ready ? '<p class="empty">Activa el ranking en <b>Ajustes → Amigos y ranking</b> para competir con tus amigos y en el mundo.</p>'
        : '<p class="empty">El ranking todavía no está disponible.</p>') + '</section>';
  }
  const v = S.social.view;
  if ((v === 'friends' && !S.social.fboard) || (v === 'global' && !S.social.gboard)) socialLoadBoards();
  return '<section class="card" id="card-rank"><div class="card-h"><h2>Ranking</h2><span class="meta">esta semana</span></div>' +
    '<div class="segc" role="tablist"><button type="button" role="tab" data-act="soc-view" data-v="friends" aria-selected="' + (v === 'friends') + '">Amigos</button>' +
    '<button type="button" role="tab" data-act="soc-view" data-v="global" aria-selected="' + (v === 'global') + '">Global</button></div>' +
    (v === 'friends' ? socRows(S.social.fboard, false) : socRows(S.social.gboard, true)) +
    '<p class="hint">Se comparte solo tu alias, nivel, racha y logros. Nunca tu comida, peso, medicamentos ni exámenes.</p></section>';
}
