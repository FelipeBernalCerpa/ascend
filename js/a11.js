'use strict';
function achStats() {
  const keys = Object.keys(S.days);
  const act = new Set(), water = new Set();
  let habits = 0, exDays = 0, logged = 0;
  for (const k of keys) {
    const d = S.days[k];
    if (!d) continue;
    logged++;
    if (d.boost) for (const x of Object.keys(d.boost)) if (d.boost[x]) habits++;
    if (dayWaterMet(d)) water.add(k);
    if (dayExercise(d)) exDays++;
    if (gDayActive(k)) act.add(k);
  }
  let best = 0;
  for (const k of act) {
    if (act.has(addDays(k, -1))) continue;
    let n = 0, x = k;
    while (act.has(x)) { n++; x = addDays(x, 1); }
    if (n > best) best = n;
  }
  return { best, cur: gCurStreak(), water: water.size, habits, exDays, logged };
}
function achievementsHTML() {
  if (!S.daysLoaded) return '';
  const a = achStats();
  const card = (ic, v, l, tag, gold) => '<div class="ach"><div class="ach-ic' + (gold ? ' gold' : '') + '">' + ic + '</div><div class="ach-b"><div class="ach-v">' + esc(v) + '</div><div class="ach-l">' + esc(l) + '</div></div>' + (tag ? '<span class="ach-tag">' + esc(tag) + '</span>' : '') + '</div>';
  let rows = '';
  if (a.best) rows += card('🔥', a.best + (a.best === 1 ? ' día' : ' días'), 'tu racha más larga', (a.cur >= a.best && a.cur > 0) ? 'Récord ahora' : '', true);
  if (a.water) rows += card('💧', a.water + (a.water === 1 ? ' día' : ' días'), 'cumpliendo tu meta de agua');
  if (a.habits) rows += card('✅', fmtInt(a.habits) + ' hábitos', 'completados en total');
  if (a.exDays) rows += card('🏋️', fmtInt(a.exDays), a.exDays === 1 ? 'sesión de ejercicio' : 'sesiones de ejercicio', '', true);
  if (a.logged) rows += card('📅', fmtInt(a.logged) + (a.logged === 1 ? ' día' : ' días'), 'registrando en Ascend');
  if (typeof retoAchRows === 'function') rows += retoAchRows();
  if (!rows) return '<section class="card" id="card-ach"><div class="card-h"><h2>Lo que estás logrando</h2></div><p class="empty">Empieza a registrar y aquí verás tus rachas, totales y récords.</p></section>';
  return '<section class="card" id="card-ach"><div class="card-h"><h2>Lo que estás logrando</h2></div>' + rows + '<p class="hint">Comparado con tu propio récord. Cada número lo construiste tú.</p></section>';
}

/* ---------- medicamentos opcionales ---------- */
/* Apagados por defecto, pero si ya tienes medicamentos guardados siguen visibles hasta que los apagues. */
function medsOn() {
  const s = S.settings || {};
  if (s.medsOn === true) return true;
  if (s.medsOn === false) return false;
  return !!(S.meds && S.meds.length > 0);
}
function appSettingsCardHTML() {
  const on = medsOn(), dis = S.readonly || !S.loaded.settings ? ' disabled' : '';
  return '<section class="card" id="card-appset"><div class="card-h"><h2>Ajustes de la app</h2></div>' +
    '<div class="setrow"><div class="setrow-i"><b>Medicamentos</b><span>Muestra la sección de medicamentos y sus recordatorios en Hoy.</span></div>' +
    '<button type="button" class="switch' + (on ? ' on' : '') + '" id="set-meds" data-act="meds-toggle" aria-pressed="' + on + '"' + dis + '><span class="sw"></span>' + (on ? 'Activado' : 'Desactivado') + '</button></div>' + healthRowHTML() + '</section>';
}
function v6Click(act, el, id) {
  if (act === 'meds-toggle') {
    if (S.readonly || !S.loaded.settings) return true;
    S.settings.medsOn = !medsOn();
    saveSettings();
    renderAjustes();
    if (S.tab === 'hoy') renderHoy();
    toast(S.settings.medsOn ? 'Medicamentos activados.' : 'Medicamentos ocultos. Puedes volver a activarlos aquí.');
    return true;
  }
  return false;
}

/* ---------- v9: retos sociales (zona de confort) ----------
   Un reto pequeño al día para ganar confianza social. Sano y respetuoso: confianza y conexión genuina,
   nada de tácticas ni de ver a nadie como objetivo. Da XP, racha y trofeos (reusa el juego). */
S.reto = null; S.loaded.reto = false;
const RETO_LEVELS = [
  { n: 1, name: 'Calentamiento', desc: 'Presencia: saludar, mirar, pedir algo.', items: [
    { id: 'r101', t: 'Sonríe y saluda a alguien que no sueles saludar.' },
    { id: 'r102', t: 'Sostén el contacto visual 3 segundos al hablar con alguien.' },
    { id: 'r103', t: 'Dale los buenos días a alguien del colegio que casi no conoces.' },
    { id: 'r104', t: 'Pídele la hora, un lápiz o una ayuda pequeña a alguien.' },
    { id: 'r105', t: 'Agradece de verdad a alguien, mirándolo a los ojos.' },
    { id: 'r106', t: 'Saluda tú primero, sin esperar a que lo hagan.' },
    { id: 'r107', t: 'Preséntate con alguien nuevo: di tu nombre.' },
    { id: 'r108', t: 'Haz una pregunta en clase o en un grupo.' }
  ] },
  { n: 2, name: 'Conversación', desc: 'Conectar: preguntar, escuchar, opinar.', items: [
    { id: 'r201', t: 'Hazle una pregunta a un compañero sobre él y escucha de verdad.' },
    { id: 'r202', t: 'Dale un cumplido genuino a alguien (algo que admires).' },
    { id: 'r203', t: 'Opina en una conversación de grupo, aunque sea corto.' },
    { id: 'r204', t: 'Cuenta una anécdota tuya en una charla.' },
    { id: 'r205', t: 'Mantén una conversación de 2 minutos con alguien nuevo.' },
    { id: 'r206', t: 'Haz reír a alguien con algo que digas.' },
    { id: 'r207', t: 'Pregúntale a alguien cómo está y escucha la respuesta completa.' },
    { id: 'r208', t: 'Únete a una conversación que ya estaba pasando.' }
  ] },
  { n: 3, name: 'Iniciativa', desc: 'Dar el paso: hablar en grupo, invitar.', items: [
    { id: 'r301', t: 'Inicia una conversación con alguien que te intimida un poco.' },
    { id: 'r302', t: 'Habla o participa frente a la clase o un grupo.' },
    { id: 'r303', t: 'Invita a alguien a hacer un plan (estudiar, jugar, algo).' },
    { id: 'r304', t: 'Comparte una opinión distinta a la del grupo, con respeto.' },
    { id: 'r305', t: 'Empieza tú una actividad o un grupo.' },
    { id: 'r306', t: 'Preséntate con alguien que te gustaría conocer.' },
    { id: 'r307', t: 'Propón una idea en un grupo.' },
    { id: 'r308', t: 'Pide un favor a alguien que no conoces mucho.' }
  ] },
  { n: 4, name: 'Ser real', desc: 'Honestidad: decir no, mostrarte.', items: [
    { id: 'r401', t: 'Cuéntale algo honesto a un amigo, algo que te importa.' },
    { id: 'r402', t: 'Di «no» a algo que no quieres hacer, sin dar mil excusas.' },
    { id: 'r403', t: 'Admite frente a alguien que algo te cuesta o te da miedo.' },
    { id: 'r404', t: 'Pide disculpas si sientes que debes.' },
    { id: 'r405', t: 'Acepta un cumplido sin minimizarlo: solo «gracias».' },
    { id: 'r406', t: 'Expresa cómo te sientes en vez de guardártelo.' },
    { id: 'r407', t: 'Reconoce un error en voz alta.' },
    { id: 'r408', t: 'Dale las gracias a alguien importante por algo real.' }
  ] }
];
const RETO_MOOD = { hard: 'me costó', ok: 'normal', good: 'bien', easy: 'fácil' };

function retoData() { return (S.reto && typeof S.reto === 'object') ? S.reto : {}; }
function saveReto(d) { S.reto = d; saver.queue('config/social', clone(d), 200); }
function retoLevel() { const l = retoData().level; return (l >= 1 && l <= 4) ? l : 1; }
function retoItem(id) { for (const lv of RETO_LEVELS) for (const it of lv.items) if (it.id === id) return it; return null; }
function retoOfDay() {
  const k = todayKey(), d = retoData();
  if (d.done && d.done[k]) { const it = retoItem(d.done[k].id) || { t: 'Reto completado', id: d.done[k].id }; return { item: it, done: true, mood: d.done[k].mood }; }
  const pool = RETO_LEVELS[retoLevel() - 1].items;
  const off = (d.roll && d.roll[k]) || 0;
  const n = Math.floor(parseKey(k).getTime() / 86400000);
  const idx = (((n + off) % pool.length) + pool.length) % pool.length;
  return { item: pool[idx], done: false };
}
function retoStreak() {
  const d = retoData(); if (!d.done) return 0;
  const tk = todayKey(); let k = d.done[tk] ? tk : addDays(tk, -1), n = 0;
  while (d.done[k]) { n++; k = addDays(k, -1); }
  return n;
}
function retoCount() { const d = retoData(); return d.done ? Object.keys(d.done).length : 0; }
function retoXP() { return retoCount() * 15; }

function retoDone() {
  if (S.readonly || !S.loaded.reto) return;
  const k = todayKey(), r = retoOfDay();
  if (r.done) return;
  const d = clone(retoData()); d.done = d.done || {}; d.done[k] = { id: r.item.id };
  saveReto(d); renderHoy(['reto', 'game']); toast('¡Reto hecho! +15 XP 💪');
}
function retoMood(m) {
  const k = todayKey(), d = clone(retoData());
  if (!d.done || !d.done[k]) return;
  d.done[k].mood = m; saveReto(d); renderHoy(['reto']);
}
function retoReroll() {
  if (S.readonly || !S.loaded.reto) return;
  const k = todayKey(), d = clone(retoData());
  d.roll = d.roll || {}; d.roll[k] = (d.roll[k] || 0) + 1;
  saveReto(d); renderHoy(['reto']);
}
function retoSetLevel(l) {
  if (S.readonly || !(l >= 1 && l <= 4)) return;
  const d = clone(retoData()); d.level = l; saveReto(d);
  if (S.sheet && S.sheet.kind === 'reto') renderSheet();
  renderHoy(['reto']);
}
function retoCardHTML() {
  if (!S.loaded.reto || !S.daysLoaded) return '<section class="card" id="card-reto"><div class="card-h"><h2>Reto de hoy</h2></div><p class="empty">Cargando…</p></section>';
  const r = retoOfDay(), lvl = RETO_LEVELS[retoLevel() - 1];
  const head = '<div class="card-h"><h2>Reto de hoy</h2><span class="meta">' + esc(lvl.name) + ' · <button type="button" class="link inline" data-act="reto-open">niveles</button></span></div>';
  if (r.done) {
    if (r.mood) return '<section class="card reto" id="card-reto">' + head + '<p class="reto-t isdone">✓ ' + esc(r.item.t) + '</p><p class="reto-note">¡Hecho! Lo marcaste como «' + esc(RETO_MOOD[r.mood] || '') + '».</p></section>';
    const moods = [['hard', '😣'], ['ok', '😐'], ['good', '🙂'], ['easy', '😎']];
    return '<section class="card reto" id="card-reto">' + head + '<p class="reto-t isdone">✓ ' + esc(r.item.t) + '</p>' +
      '<p class="reto-ask">¿Cómo se sintió?</p><div class="reto-moods">' + moods.map(m => '<button type="button" class="reto-mood" data-act="reto-mood" data-m="' + m[0] + '" aria-label="' + esc(RETO_MOOD[m[0]]) + '">' + m[1] + '</button>').join('') + '</div></section>';
  }
  return '<section class="card reto" id="card-reto">' + head +
    '<p class="reto-t">' + esc(r.item.t) + '</p>' +
    '<div class="row reto-acts"><button type="button" class="btn" data-act="reto-done"' + (S.readonly ? ' disabled' : '') + '>Hecho</button>' +
    '<button type="button" class="btn quiet sm" data-act="reto-reroll"' + (S.readonly ? ' disabled' : '') + '>Otro reto</button></div>' +
    '<p class="hint">Un paso pequeño fuera de tu zona de confort. Tú pones el ritmo.</p></section>';
}
function shRetoHTML() {
  const cur = retoLevel(), done = retoCount(), st = retoStreak();
  const stat = (lbl, v) => '<div class="meter"><span class="m-lbl">' + lbl + '</span><span class="m-val">' + v + '</span></div>';
  return sheetTop('Retos sociales') +
    '<p class="plan-sub">Sal de tu zona de confort de a poco. Es confianza y conexión genuina, nada de tácticas ni de ver a nadie como objetivo. Tú eliges el nivel.</p>' +
    '<div class="meters">' + stat('Retos hechos', fmtInt(done)) + (st ? stat('Racha', st + (st === 1 ? ' día' : ' días')) : '') + '</div>' +
    '<p class="sh-sec">Tu nivel</p>' +
    RETO_LEVELS.map(l => '<button type="button" class="reto-lv' + (l.n === cur ? ' on' : '') + '" data-act="reto-lv" data-v="' + l.n + '"><b>' + l.n + ' · ' + esc(l.name) + '</b><span>' + esc(l.desc) + '</span></button>').join('') +
    '<p class="hint">Sube de nivel cuando te sientas listo. Puedes bajar cuando quieras.</p>';
}
function retoAchRows() {
  const n = retoCount(); if (!n) return '';
  const st = retoStreak();
  const c = (ic, v, l) => '<div class="ach"><div class="ach-ic gold">' + ic + '</div><div class="ach-b"><div class="ach-v">' + esc(v) + '</div><div class="ach-l">' + esc(l) + '</div></div></div>';
  let h = c('💪', fmtInt(n) + (n === 1 ? ' reto social' : ' retos sociales'), 'completados');
  if (st > 1) h += c('🔥', st + ' días', 'de retos sociales seguidos');
  return h;
}
function v9Click(act, el, id) {
  switch (act) {
    case 'reto-done': retoDone(); return true;
    case 'reto-reroll': retoReroll(); return true;
    case 'reto-mood': retoMood(el.dataset.m); return true;
    case 'reto-open': openSheet({ kind: 'reto', step: 'view' }); return true;
    case 'reto-lv': retoSetLevel(Number(el.dataset.v)); return true;
  }
  return false;
}

const HOY_ORDER = ['game', 'daynav', 'meters', 'meds', 'water', 'food', 'act', 'boost', 'reto', 'sleep', 'feel', 'notes'];
const HOY = { game: gameCardHTML, daynav: daynavHTML, meters: metersHTML, meds: medsHTML, water: waterHTML, food: foodHTML, act: actHTML, boost: boostHTML, reto: retoCardHTML, sleep: sleepHTML, feel: feelHTML, notes: notesHTML };
function renderHoy(parts) {
  const root = $('#view-hoy');
  if (!root) return;
  const c = { k: S.viewKey, day: getDay(S.viewKey), isToday: S.viewKey === todayKey() };
  if (!parts || !$('#card-water', root)) { swap(root, quoteHTML() + HOY_ORDER.map(p => HOY[p](c)).join('')); return; }
  for (const p of parts) { const el = document.getElementById('card-' + p); if (el) replaceEl(el, HOY[p](c)); }
  if (parts.indexOf('game') < 0) { const _g = document.getElementById('card-game'); if (_g) replaceEl(_g, gameCardHTML()); }
}

/* ---------- PROGRESO ---------- */
const tone = (r, ok, warn) => (r >= ok ? 'ok' : r >= warn ? 'warn' : 'crit');
function weekHTML() {
  const tk = todayKey(), keys = [];
  for (let i = 6; i >= 0; i--) keys.push(addDays(tk, -i));
  const goal = Number(S.settings.waterGoal) || 2000, sg = Number(S.settings.sleepGoal) || 8.5;
  const rows = [
    { k: 'med', label: 'Medicinas', f: (k, d) => {
      const ds = dosesFor(k);
      if (!d || !ds.length) return null;
      const t = ds.filter(x => d.meds && d.meds[x.key] && d.meds[x.key].s === 'taken').length;
      return { txt: t + '/' + ds.length, t: tone(t / ds.length, 0.9, 0.6), aria: t + ' de ' + ds.length + ' tomas' };
    } },
    { k: 'agua', label: 'Agua', f: (k, d) => {
      const w = d ? sum(d.water) : 0;
      if (!w) return null;
      return { txt: fmtNum(w / 1000, 1), t: tone(w / goal, 0.9, 0.6), aria: fmtInt(w) + ' ml' };
    } },
    { k: 'ref', label: 'Hábitos', f: (k, d) => {
      const hs = habDayStats(k);
      if (!hs.done || !hs.due) return null;
      return { txt: hs.done + '/' + hs.due, t: tone(hs.done / hs.due, 0.8, 0.5), aria: hs.done + ' de ' + hs.due + ' hábitos' };
    } },
    { k: 'sueno', label: 'Sueño', f: (k, d) => {
      const h = d ? sleepHours(d.sleep) : null;
      if (h == null) return null;
      return { txt: fmtNum(h, 1), t: h >= sg ? 'ok' : h >= sg - 1 ? 'warn' : 'crit', aria: fmtNum(h, 1) + ' horas' };
    } },
    { k: 'kcal', label: 'Calorías', f: (k, d) => {
      const nu = dayNutri(d);
      if (!nu.count) return null;
      const g = Number((S.settings.nutri || {}).kcal) || 0;
      return { txt: fmtK(nu.kcal), t: g ? tone(nu.kcal / g, 0.9, 0.7) : 'prog', aria: fmtInt(nu.kcal) + ' kcal' };
    } },
    { k: 'pasos', label: 'Pasos', f: (k, d) => {
      const n = d ? Number(d.steps) || 0 : 0;
      if (!n) return null;
      const g = Number(S.settings.stepGoal) || 0;
      return { txt: fmtK(n), t: g ? tone(n / g, 1, 0.6) : 'prog', aria: fmtInt(n) + ' pasos' };
    } }
  ];
  let html = '<div class="week"><span></span>' + keys.map(k => { const d = parseKey(k); return '<span class="wk-h' + (k === tk ? ' today' : '') + '"><b>' + WD1[d.getDay()] + '</b>' + d.getDate() + '</span>'; }).join('');
  for (const r of rows) {
    html += '<span class="wk-lbl">' + r.label + '</span>';
    for (const k of keys) {
      const v = r.f(k, S.days[k]);
      let t = v ? v.t : 'none';
      if (k === tk && v && t !== 'ok') t = 'prog';
      html += '<button type="button" class="cell' + (k === tk ? ' today' : '') + '" id="wk-' + r.k + '-' + k + '" data-act="goto-day" data-day="' + k + '" data-t="' + t + '" aria-label="' + esc(r.label + ', ' + fmtDay(k) + ': ' + (v ? v.aria : 'sin registro')) + '">' + (v ? esc(v.txt) : '·') + '</button>';
    }
  }
  html += '</div>';
  return '<section class="card" id="card-week"><div class="card-h"><h2>Tu semana</h2><span class="meta">Toca un día para abrirlo</span></div>' + html +
    '<p class="legend"><span class="lg"><i data-t="ok"></i>Cumplido</span><span class="lg"><i data-t="warn"></i>A medias</span><span class="lg"><i data-t="crit"></i>Bajo</span><span class="lg"><i></i>Sin registro</span></p></section>';
}
function measureHTML(kind) {
  const isW = kind === 'weight', field = kind, unit = isW ? 'kg' : 'cm', title = isW ? 'Peso' : 'Estatura';
  const every = isW ? 7 : 28;
  const list = S.measures.filter(m => hasNum(m[field])).sort(byDate);
  const last = list[list.length - 1], prev = list[list.length - 2];
  const tk = todayKey();
  let top;
  if (!S.loaded.measures) top = '<p class="empty">Cargando tus mediciones…</p>';
  else if (!last) top = '<p class="empty">Aún no hay registros de ' + title.toLowerCase() + '. Agrega el primero abajo.</p>';
  else {
    const delta = prev ? Number(last[field]) - Number(prev[field]) : null;
    const next = addDays(last.date, every), due = next <= tk;
    const sign = d => (d > 0 ? '+' : d < 0 ? '−' : '±');
    top = '<div class="m-top"><div><span class="big">' + fmtNum(last[field], 1, 1) + '</span><span class="unit">' + unit + '</span></div>' +
      '<div class="m-meta"><span>' + fmtDate(last.date) + '</span>' + (delta != null ? '<span class="delta">' + sign(delta) + fmtNum(Math.abs(delta), 1, 1) + ' ' + unit + ' desde el ' + fmtShort(prev.date) + '</span>' : '') + '</div></div>' +
      '<p class="pill ' + (due ? 'accent' : 'muted') + ' next">' + (due ? (isW ? 'Toca pesarte esta semana' : 'Ya puedes medirte este mes') : (isW ? 'Próxima pesada: ' : 'Próxima medición: ') + fmtDay(next)) + '</p>';
    S.charts[kind] = { points: list.map(m => ({ x: parseKey(m.date).getTime(), y: Number(m[field]) })), unit, dec: 1, label: title + ' en el tiempo' };
    top += '<div class="chart" data-chart="' + kind + '"></div>';
  }
  const tip = isW
    ? 'Pésate una vez por semana, en ayunas, después de ir al baño y en la misma báscula.'
    : 'Mídete una vez al mes, en la mañana, sin zapatos y con los talones contra la pared. En la tarde mides hasta 1 cm menos por la compresión normal de la columna.';
  const dId = kind + '-date', vId = kind + '-val';
  const dv = draft(dId, tk);
  let soon = '';
  if (!isW && last) {
    const since = diffDays(last.date, dv || tk);
    if (since >= 0 && since < 28) soon = '<p class="hint warn-t">Tu última medición fue hace ' + since + (since === 1 ? ' día' : ' días') + '. El hueso cambia en meses: la próxima es el ' + fmtDay(addDays(last.date, 28)) + '.</p>';
  }
  const rows = list.slice().reverse().map((m, i, arr) => {
    const p = arr[i + 1];
    const dd = p ? Number(m[field]) - Number(p[field]) : null;
    const tag = 'm:' + m.id + ':' + field;
    const armed = S.confirmDel === tag;
    return '<div class="hrow"><span class="h-date">' + fmtShort(m.date) + '</span><span class="h-val">' + fmtNum(m[field], 1, 1) + ' ' + unit + '</span><span class="h-delta">' +
      (dd == null ? '' : (dd > 0 ? '+' : dd < 0 ? '−' : '±') + fmtNum(Math.abs(dd), 1, 1)) + '</span>' +
      '<button type="button" class="xbtn' + (armed ? ' armed' : '') + '" id="del-' + kind + '-' + m.id + '" data-act="m-del" data-id="' + esc(m.id) + '" data-field="' + field + '"' + ro() + '>' + (armed ? '¿Eliminar?' : 'Eliminar') + '</button></div>';
  }).join('');
  const hist = list.length ? '<details class="hist" data-hist="' + kind + '"' + (S.openHist === kind ? ' open' : '') + '><summary>Historial (' + list.length + ')</summary>' + rows + '</details>' : '';
  return '<section class="card" id="card-' + kind + '"><div class="card-h"><h2>' + title + '</h2>' + (isW ? '<span class="meta">1 vez por semana</span>' : '<span class="meta">1 vez al mes</span>') + '</div>' + top +
    '<p class="hint">' + tip + '</p>' +
    '<form class="form" data-form="' + kind + '" novalidate><div class="grid2">' +
      '<div class="field"><label class="lbl" for="' + dId + '">Fecha</label><input type="date" id="' + dId + '" data-draft max="' + tk + '" value="' + esc(dv) + '"></div>' +
      '<div class="field"><label class="lbl" for="' + vId + '">' + title + ' (' + unit + ')</label><input type="text" inputmode="decimal" id="' + vId + '" data-draft value="' + esc(draft(vId, '')) + '"></div>' +
    '</div>' + soon + '<p class="form-err">' + esc(S.formErr[kind] || '') + '</p>' +
    '<button type="submit" class="btn" id="' + kind + '-save"' + ro() + '>' + (isW ? 'Guardar peso' : 'Guardar estatura') + '</button></form>' + hist + '</section>';
}
