'use strict';
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
    '<button type="button" class="switch' + (on ? ' on' : '') + '" id="set-meds" data-act="meds-toggle" aria-pressed="' + on + '"' + dis + '><span class="sw"></span>' + (on ? 'Activado' : 'Desactivado') + '</button></div></section>';
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

const HOY_ORDER = ['game', 'daynav', 'meters', 'meds', 'water', 'food', 'act', 'boost', 'sleep', 'feel', 'notes'];
const HOY = { game: gameCardHTML, daynav: daynavHTML, meters: metersHTML, meds: medsHTML, water: waterHTML, food: foodHTML, act: actHTML, boost: boostHTML, sleep: sleepHTML, feel: feelHTML, notes: notesHTML };
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
function statsRange(n) {
  const tk = todayKey();
  const r = { days: 0, doses: 0, taken: 0, sN: 0, sSum: 0, wN: 0, wSum: 0, bSum: 0, bDue: 0, ex: 0, intense: 0, fN: 0, nut: sumN([]), stN: 0, stSum: 0 };
  for (let i = 0; i < n; i++) {
    const k = addDays(tk, -i), d = S.days[k];
    if (!d) continue;
    r.days++;
    const ds = dosesFor(k);
    r.doses += ds.length;
    r.taken += ds.filter(x => d.meds && d.meds[x.key] && d.meds[x.key].s === 'taken').length;
    const h = sleepHours(d.sleep);
    if (h != null) { r.sN++; r.sSum += h; }
    const w = sum(d.water);
    if (w > 0) { r.wN++; r.wSum += w; }
    { const hs = habDayStats(k); r.bSum += hs.done; r.bDue += hs.due; }
    if (dayHasEx(d)) r.ex++;
    if (dayIntense(d)) r.intense++;
    const nu = dayNutri(d);
    if (nu.count) { r.fN++; for (const k of NK) r.nut[k] += nu[k]; }
    const stp = Number(d.steps) || 0;
    if (stp > 0) { r.stN++; r.stSum += stp; }
  }
  return r;
}
function medStreak() {
  const tk = todayKey();
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const k = addDays(tk, -i), ds = dosesFor(k);
    if (!ds.length) continue;
    const d = S.days[k];
    const all = !!d && ds.every(x => d.meds && d.meds[x.key] && d.meds[x.key].s === 'taken');
    if (all) n++;
    else if (i === 0) continue;
    else break;
  }
  return n;
}
function averagesHTML() {
  const head = meta => '<div class="card-h"><h2>Tus promedios</h2>' + (meta ? '<span class="meta">' + meta + '</span>' : '') + '</div>';
  if (!S.daysLoaded || !S.medsLoaded) return '<section class="card" id="card-avg">' + head('') + '<p class="empty">Cargando tus registros…</p></section>';
  const a = statsRange(7), b = statsRange(30);
  const pct = r => (r.doses ? Math.round(r.taken / r.doses * 100) + ' %<small>' + r.taken + '/' + r.doses + '</small>' : '—');
  const sl = r => (r.sN ? fmtNum(r.sSum / r.sN, 1, 1) + ' h' : '—');
  const wa = r => (r.wN ? fmtInt(r.wSum / r.wN) + ' ml' : '—');
  const bo = r => (r.bDue ? Math.round(r.bSum / r.bDue * 100) + ' %<small>' + r.bSum + '/' + r.bDue + '</small>' : '—');
  const dd = (v, r) => (r.days ? v + (v === 1 ? ' día' : ' días') : '—');
  const nd = (n) => '<small>' + n + (n === 1 ? ' día' : ' días') + '</small>';
  const kc = r => (r.fN ? fmtInt(r.nut.kcal / r.fN) + ' kcal' + nd(r.fN) : '—');
  const gr = (r, k) => (r.fN ? fmtNut(k, r.nut[k] / r.fN) + ' g' : '—');
  const mg = r => (r.fN ? fmtInt(r.nut.na / r.fN) + ' mg' : '—');
  const stp = r => (r.stN ? fmtInt(r.stSum / r.stN) + nd(r.stN) : '—');
  const rows = [
    ['Medicamentos tomados', pct(a), pct(b)],
    ['Calorías por día', kc(a), kc(b)],
    ['Proteína por día', gr(a, 'p'), gr(b, 'p')],
    ['Grasas por día', gr(a, 'f'), gr(b, 'f')],
    ['Sodio por día', mg(a), mg(b)],
    ['Pasos por día', stp(a), stp(b)],
    ['Sueño promedio', sl(a), sl(b)],
    ['Agua promedio', wa(a), wa(b)],
    ['Hábitos cumplidos', bo(a), bo(b)],
    ['Días con ejercicio', dd(a.ex, a), dd(b.ex, b)],
    ['Días de cardio intenso', dd(a.intense, a), dd(b.intense, b)]
  ];
  const streak = medStreak();
  return '<section class="card" id="card-avg">' + head(b.days + ' de 30 días con registro') +
    '<div class="tbl-wrap"><table class="tbl stats"><thead><tr><th>Hábito</th><th>7 días</th><th>30 días</th></tr></thead><tbody>' +
    rows.map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('') + '</tbody></table></div>' +
    '<p class="streak"><span class="big">' + streak + '</span><span class="unit">' + (streak === 1 ? 'día seguido' : 'días seguidos') + ' con todas las tomas</span></p>' +
    '<p class="hint">Los promedios cuentan solo los días que registraste.</p></section>';
}
function bmiSeries() {
  const hs = S.measures.filter(m => hasNum(m.height)).sort(byDate);
  const out = [];
  for (const w of S.measures.filter(m => hasNum(m.weight)).sort(byDate)) {
    let h = null;
    for (const x of hs) { if (x.date <= w.date) h = x; else break; }
    if (!h || diffDays(h.date, w.date) > 120) continue;
    const mt = Number(h.height) / 100;
    out.push({ date: w.date, bmi: Math.round(Number(w.weight) / (mt * mt) * 10) / 10, weight: Number(w.weight), height: Number(h.height) });
  }
  return out;
}
function bmiHTML() {
  let body;
  const ser = bmiSeries();
  if (!S.loaded.measures) body = '<p class="empty">Cargando…</p>';
  else if (!ser.length) body = '<p class="empty">Registra tu peso y tu estatura para calcular el IMC.</p>';
  else {
    const last = ser[ser.length - 1], prev = ser[ser.length - 2];
    const delta = prev ? Math.round((last.bmi - prev.bmi) * 10) / 10 : null;
    body = '<div class="m-top"><div><span class="big">' + fmtNum(last.bmi, 1, 1) + '</span><span class="unit">kg/m²</span></div>' +
      '<div class="m-meta"><span>' + fmtNum(last.weight, 1, 1) + ' kg · ' + fmtNum(last.height, 1, 1) + ' cm</span><span>' + fmtDate(last.date) + '</span>' +
      (delta != null ? '<span class="delta">' + sign(delta) + fmtNum(Math.abs(delta), 1, 1) + ' desde el ' + fmtShort(prev.date) + '</span>' : '') + '</div></div>';
    S.charts.bmi = { points: ser.map(p => ({ x: parseKey(p.date).getTime(), y: p.bmi })), unit: '', dec: 1, label: 'IMC en el tiempo' };
    body += '<div class="chart" data-chart="bmi"></div>';
  }
  return '<section class="card" id="card-bmi"><div class="card-h"><h2>IMC</h2><span class="meta">Peso ÷ estatura²</span></div>' + body +
    bmiNoteHTML(ser) + '</section>';
}
function compHTML() {
  const list = S.measures.filter(m => hasNum(m.fat) || hasNum(m.muscle)).sort(byDate);
  const tk = todayKey();
  let top;
  if (!S.loaded.measures) top = '<p class="empty">Cargando…</p>';
  else if (!list.length) top = '<p class="empty">Aún no hay mediciones de composición corporal. Anota la próxima que te hagas.</p>';
  else {
    const fats = list.filter(m => hasNum(m.fat)), mus = list.filter(m => hasNum(m.muscle));
    const lf = fats[fats.length - 1], pf = fats[fats.length - 2], lm = mus[mus.length - 1];
    top = '<div class="comp-top">' +
      (lf ? '<div class="comp-v"><span class="lbl">Grasa corporal</span><div><span class="big">' + fmtNum(lf.fat, 1, 1) + '</span><span class="unit">%</span></div><span class="delta">' +
        (pf ? sign(lf.fat - pf.fat) + fmtNum(Math.abs(lf.fat - pf.fat), 1, 1) + ' desde el ' + fmtShort(pf.date) : fmtDate(lf.date)) + '</span></div>' : '') +
      (lm ? '<div class="comp-v"><span class="lbl">Masa muscular</span><div><span class="big">' + fmtNum(lm.muscle, 1, 1) + '</span><span class="unit">kg</span></div><span class="delta">' + fmtDate(lm.date) + '</span></div>' : '') +
    '</div>';
    if (fats.length) {
      S.charts.fat = { points: fats.map(m => ({ x: parseKey(m.date).getTime(), y: Number(m.fat) })), unit: '%', dec: 1, label: 'Grasa corporal en el tiempo' };
      top += '<div class="chart" data-chart="fat"></div>';
    }
  }
  const rows = list.slice().reverse().map(m => {
    const tag = 'm:' + m.id + ':comp', armed = S.confirmDel === tag;
    const txt = [hasNum(m.fat) ? fmtNum(m.fat, 1, 1) + ' % grasa' : '', hasNum(m.muscle) ? fmtNum(m.muscle, 1, 1) + ' kg músculo' : ''].filter(Boolean).join(' · ');
    return '<div class="hrow"><span class="h-date">' + fmtShort(m.date) + '</span><span class="h-val">' + txt + '</span><span></span>' +
      '<button type="button" class="xbtn' + (armed ? ' armed' : '') + '" id="del-comp-' + m.id + '" data-act="m-del" data-id="' + esc(m.id) + '" data-field="comp"' + ro() + '>' + (armed ? '¿Eliminar?' : 'Eliminar') + '</button></div>';
  }).join('');
  const hist = list.length ? '<details class="hist" data-hist="comp"' + (S.openHist === 'comp' ? ' open' : '') + '><summary>Historial (' + list.length + ')</summary>' + rows + '</details>' : '';
  return '<section class="card" id="card-comp"><div class="card-h"><h2>Composición corporal</h2><span class="meta">Grasa y músculo</span></div>' + top +
    '<p class="hint">Anota lo que marque una báscula de composición corporal o lo que te mida tu nutricionista. Compara siempre con la misma báscula.</p>' +
    '<form class="form" data-form="comp" novalidate>' +
      '<div class="field"><label class="lbl" for="comp-date">Fecha</label><input type="date" id="comp-date" data-draft max="' + tk + '" value="' + esc(draft('comp-date', tk)) + '"></div>' +
      '<div class="grid2">' +
        '<div class="field"><label class="lbl" for="comp-fat">Grasa (%)</label><input type="text" inputmode="decimal" id="comp-fat" data-draft value="' + esc(draft('comp-fat', '')) + '"></div>' +
        '<div class="field"><label class="lbl" for="comp-muscle">Masa muscular (kg)</label><input type="text" inputmode="decimal" id="comp-muscle" data-draft value="' + esc(draft('comp-muscle', '')) + '"></div>' +
      '</div><p class="form-err">' + esc(S.formErr.comp || '') + '</p>' +
      '<button type="submit" class="btn" id="comp-save"' + ro() + '>Guardar medición</button></form>' + hist + '</section>';
}
