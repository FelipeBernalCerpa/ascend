'use strict';
function extChange(t) {
  if (v4Change(t)) return true;
  if (t.id === 'sh-meal' && S.sheet) { S.sheet.meal = t.value; return true; }
  if (t.dataset.prof === 'birth') {
    if (S.readonly || !S.loaded.profile) return true;
    const v = t.value;
    if (v && (v > todayKey() || v < '1900-01-01')) return true;
    S.profile = Object.assign({}, S.profile);
    if (v) S.profile.birth = v; else delete S.profile.birth;
    saveProfile();
    renderAjustes();
    return true;
  }
  if (t.id === 'steps-in') {
    if (t.value && Number(getDay(S.viewKey).steps)) t.value = fmtInt(getDay(S.viewKey).steps);
    return true;
  }
  return false;
}
function extSubmit(kind) {
  if (planSubmit(kind) || v4Submit(kind)) return true;
  const st = S.sheet;
  switch (kind) {
    case 'sh-search': {
      const inp = $('#sh-q');
      if (inp) { try { inp.blur(); } catch (e) {} }
      if (st && st.kind === 'food' && String(st.q || '').trim().length >= 2 && !searchFoods(st.q).length) runOffSearch();
      return true;
    }
    case 'sh-qty': submitQty(); return true;
    case 'sh-custom': saveCustomFood(); return true;
    case 'sh-code': { const inp = $('#sh-code'); lookupCode(inp ? inp.value : ''); return true; }
    case 'sh-rec': saveRecipe(); return true;
    case 'sh-exmin': submitEx(false); return true;
    case 'sh-excustom': submitEx(true); return true;
    default: return false;
  }
}
function onKey(e) {
  if (e.key === 'Escape' && S.sheet) { e.preventDefault(); closeSheet(); }
}

/* ---------- v6: gamificación (XP, rangos, racha) y medicamentos opcionales ----------
   El XP se calcula de lo que ya registras (hábitos, agua, sueño, ejercicio, comida): no guarda estado nuevo.
   Nada de esto premia ni castiga por calorías ni por peso. */

const RANKS = [
  { k: 'bronce',   name: 'Bronce',   min: 0,     icon: '🥉', color: '#a9713b' },
  { k: 'plata',    name: 'Plata',    min: 600,   icon: '🥈', color: '#9aa6ad' },
  { k: 'oro',      name: 'Oro',      min: 1800,  icon: '🥇', color: '#c9a227' },
  { k: 'platino',  name: 'Platino',  min: 4000,  icon: '🔷', color: '#5fb2c4' },
  { k: 'diamante', name: 'Diamante', min: 8000,  icon: '💠', color: '#6e8be0' },
  { k: 'maestro',  name: 'Maestro',  min: 15000, icon: '🔮', color: '#9b5de5' },
  { k: 'leyenda',  name: 'Leyenda',  min: 28000, icon: '👑', color: '#d9b43a' }
];

function dayExercise(d) {
  if (!d) return false;
  if (d.ex && Array.isArray(d.ex.types) && d.ex.types.some(t => t !== 'descanso')) return true;
  return Array.isArray(d.acts) && d.acts.length > 0;
}
function dayWaterMet(d) { return !!d && sum(d.water) >= (Number(S.settings.waterGoal) || 2000); }
function gDayXP(k) {
  const d = S.days[k];
  if (!d) return 0;
  let xp = 0;
  const hs = habDayStats(k);
  xp += hs.done * 10;
  if (hs.due > 0 && hs.done >= hs.due) xp += 25;
  if (dayWaterMet(d)) xp += 8;
  if (sleepHours(d.sleep) != null) xp += 5;
  if (dayExercise(d)) xp += 15;
  const food = Array.isArray(d.food) ? d.food.length : 0;
  xp += Math.min(food, 5) * 3;
  return xp;
}
function gDayActive(k) {
  const d = S.days[k];
  if (!d) return false;
  const hs = habDayStats(k);
  return hs.done > 0 || dayExercise(d) || dayWaterMet(d) || sleepHours(d.sleep) != null || (Array.isArray(d.food) && d.food.length > 0);
}
function gTotalXP() {
  let t = 0;
  for (const k of Object.keys(S.days)) t += gDayXP(k);
  return t + (typeof bossBonusXP === 'function' ? bossBonusXP() : 0) + (typeof retoXP === 'function' ? retoXP() : 0);
}
function gCurStreak() {
  const tk = todayKey();
  let k = gDayActive(tk) ? tk : addDays(tk, -1);
  let n = 0;
  while (gDayActive(k)) { n++; k = addDays(k, -1); }
  return n;
}
function gDaysInactive() {
  const tk = todayKey();
  for (let i = 0; i < 400; i++) if (gDayActive(addDays(tk, -i))) return i;
  return 400;
}
function gameStats() {
  const raw = gTotalXP();
  const di = gDaysInactive();
  const factor = 1 - Math.min(0.3, Math.max(0, di - 3) * 0.02);
  const xp = Math.round(raw * factor);
  let ri = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].min) ri = i;
  const r = RANKS[ri], next = RANKS[ri + 1];
  let divName = '', divNow = r.min, divEnd = r.min, barPct = 0, toNext = 0, nextLabel = '';
  if (next) {
    const third = (next.min - r.min) / 3;
    let d = Math.floor((xp - r.min) / third);
    if (d > 2) d = 2; if (d < 0) d = 0;
    divName = ['III', 'II', 'I'][d];
    divNow = Math.round(r.min + d * third);
    divEnd = Math.round(r.min + (d + 1) * third);
    barPct = Math.max(0, Math.min(100, Math.round((xp - divNow) / (divEnd - divNow) * 100)));
    toNext = Math.max(0, divEnd - xp);
    const nextName = d < 2 ? r.name + ' ' + ['II', 'I'][d] : next.name + ' III';
    nextLabel = 'Te faltan ' + fmtInt(toNext) + ' XP para ' + nextName + '.';
  } else {
    const lvl = Math.floor((xp - r.min) / 5000) + 1;
    divNow = r.min + (lvl - 1) * 5000; divEnd = r.min + lvl * 5000;
    barPct = Math.max(0, Math.min(100, Math.round((xp - divNow) / 5000 * 100)));
    toNext = Math.max(0, divEnd - xp);
    nextLabel = 'Leyenda nivel ' + lvl + ' · ' + fmtInt(toNext) + ' XP para el siguiente.';
  }
  const streak = gCurStreak();
  return { raw, xp, rankObj: r, divName, divNow, divEnd, barPct, toNext, nextLabel, streak,
    shields: Math.min(3, Math.floor(streak / 7)), todayXp: gDayXP(todayKey()), decaying: di > 3 && raw > 0 };
}
function gameCardHTML() {
  if (!S.daysLoaded || !S.loaded.settings) return '<section class="card game" id="card-game"><p class="empty">Cargando tu progreso…</p></section>';
  const g = gameStats(), r = g.rankObj, rn = esc(r.name + (g.divName ? ' ' + g.divName : ''));
  return '<section class="card game" id="card-game">' +
    '<div class="g-top">' +
      '<div class="g-badge" style="--rc:' + r.color + '"><span class="g-ic">' + r.icon + '</span><small>' + esc((r.name + (g.divName ? ' ' + g.divName : '')).toUpperCase()) + '</small></div>' +
      '<div class="g-meta"><div class="g-rank">' + rn + '</div><div class="g-sub">' + fmtInt(g.raw) + ' XP en total</div></div>' +
      (g.todayXp ? '<span class="g-today">+' + g.todayXp + ' hoy</span>' : '') +
    '</div>' +
    '<div class="g-xprow"><span>' + fmtInt(g.divNow) + ' XP</span><span>' + fmtInt(g.divEnd) + ' XP</span></div>' +
    '<div class="g-bar"><i style="width:' + g.barPct + '%"></i></div>' +
    '<div class="g-hint">' + esc(g.nextLabel) + '</div>' +
    '<div class="g-streak"><span class="g-flame">🔥</span><div class="g-stxt"><b>' + g.streak + (g.streak === 1 ? ' día' : ' días') + '</b><small>' + (g.streak ? 'tu racha' : 'empieza una racha hoy') + '</small></div>' +
      '<div class="g-shields" title="Escudos de racha">' + [0, 1, 2].map(i => '<span class="g-sh' + (i < g.shields ? ' on' : '') + '">🛡️</span>').join('') + '</div></div>' +
    (g.decaying ? '<p class="g-decay">Tu nivel bajó un poco mientras descansabas. Vuelve hoy y lo recuperas en días.</p>' : '') +
    '</section>';
}

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
