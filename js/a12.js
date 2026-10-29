'use strict';
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
function renderProgreso() {
  const root = $('#view-progreso');
  if (!root) return;
  S.charts = {};
  swap(root, achievementsHTML() + anaCardHTML('gen') + weekHTML() + averagesHTML() + nutri7HTML() + measureHTML('weight') + compHTML() + bmiHTML() + measureHTML('height'));
  drawCharts(root);
}

/* ---------- SALUD ---------- */
function labsHTML() {
  let body;
  if (!S.loaded.labs) body = '<p class="empty">Cargando tus exámenes…</p>';
  else if (!S.labs.length) body = '<p class="empty">Aún no hay exámenes. Agrega el primero abajo.</p>';
  else {
    const groups = new Map();
    for (const l of S.labs.slice().sort(byDate)) { const g = labGroupKey(l); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(l); }
    const idx = g => { const i = LAB_TYPES.findIndex(t => t.k === g.split(':')[0]); return i < 0 ? 99 : i; };
    const keys = Array.from(groups.keys()).sort((a, b) => idx(a) - idx(b) || a.localeCompare(b));
    body = '<div class="labs">' + keys.map((g, gi) => {
      const arr = groups.get(g), last = arr[arr.length - 1], st = labStatus(last), open = S.openLab === g, name = labName(last);
      let detail = '';
      if (open) {
        const range = rangeShort(last);
        const pts = arr.filter(l => hasNum(l.value)).map(l => ({ x: parseKey(l.date).getTime(), y: Number(l.value) }));
        if (pts.length >= 2) S.charts['lab' + gi] = { points: pts, unit: last.unit || '', dec: 2, band: { low: hasNum(last.low) ? Number(last.low) : null, high: hasNum(last.high) ? Number(last.high) : null }, label: name };
        detail = '<div class="lab-detail">' + (range ? '<p class="hint">Referencia de tu laboratorio: ' + esc(range) + '</p>' : '') +
          (pts.length >= 2 ? '<div class="chart" data-chart="lab' + gi + '"></div>' : '') +
          arr.slice().reverse().map(l => {
            const tag = 'l:' + l.id, armed = S.confirmDel === tag, s2 = labStatus(l);
            return '<div class="hrow"><span class="h-date">' + fmtShort(l.date) + '</span><span class="h-val">' + fmtNum(l.value) + ' ' + esc(l.unit || '') + (l.note ? '<small>' + esc(l.note) + '</small>' : '') + '</span>' +
              '<span class="h-delta">' + (s2 ? '<span class="pill ' + s2[0] + '">' + s2[1] + '</span>' : '') + '</span>' +
              '<button type="button" class="xbtn' + (armed ? ' armed' : '') + '" id="del-lab-' + l.id + '" data-act="lab-del" data-id="' + esc(l.id) + '"' + ro() + '>' + (armed ? '¿Eliminar?' : 'Eliminar') + '</button></div>';
          }).join('') + '</div>';
      }
      return '<div class="lab"><button type="button" class="lab-row" id="labg-' + gi + '" data-act="lab-open" data-g="' + esc(g) + '" aria-expanded="' + open + '">' +
        '<span class="lab-name">' + esc(name) + '<small>' + fmtShort(last.date) + (arr.length > 1 ? ' · ' + arr.length + ' resultados' : '') + '</small></span>' +
        '<span class="lab-val">' + fmtNum(last.value) + '<small>' + esc(last.unit || '') + '</small></span>' +
        (st ? '<span class="pill ' + st[0] + '">' + st[1] + '</span>' : '<span></span>') + '</button>' + detail + '</div>';
    }).join('') + '</div>';
  }
  const hasProt = S.labs.some(l => l.key === 'proteinuria');
  return '<section class="card" id="card-labs"><div class="card-h"><h2>Exámenes</h2><span class="meta">Toca uno para ver su historia</span></div>' + body +
    labFormHTML() + '</section>';
}
function labFormHTML() {
  const tk = todayKey();
  const type = draft('lab-type', 'glucosa');
  const def = labDefaults(type, draft('lab-name', ''));
  return '<form class="form" data-form="lab" novalidate><h3 class="form-t">Agregar resultado</h3>' +
    '<div class="grid2">' +
      '<div class="field"><label class="lbl" for="lab-type">Examen</label><select id="lab-type" data-draft>' + LAB_TYPES.map(t => '<option value="' + t.k + '"' + (t.k === type ? ' selected' : '') + '>' + esc(t.name) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label class="lbl" for="lab-date">Fecha</label><input type="date" id="lab-date" data-draft max="' + tk + '" value="' + esc(draft('lab-date', tk)) + '"></div>' +
    '</div>' +
    (type === 'otro' ? '<div class="field"><label class="lbl" for="lab-name">Nombre del examen</label><input type="text" id="lab-name" data-draft value="' + esc(draft('lab-name', '')) + '"></div>' : '') +
    '<div class="grid2">' +
      '<div class="field"><label class="lbl" for="lab-value">Resultado</label><input type="text" inputmode="decimal" id="lab-value" data-draft value="' + esc(draft('lab-value', '')) + '"></div>' +
      '<div class="field"><label class="lbl" for="lab-unit">Unidad</label><input type="text" id="lab-unit" data-draft value="' + esc(draft('lab-unit', def.unit)) + '"></div>' +
    '</div>' +
    '<div class="grid2">' +
      '<div class="field"><label class="lbl" for="lab-low">Referencia mínima</label><input type="text" inputmode="decimal" id="lab-low" data-draft value="' + esc(draft('lab-low', def.low)) + '"></div>' +
      '<div class="field"><label class="lbl" for="lab-high">Referencia máxima</label><input type="text" inputmode="decimal" id="lab-high" data-draft value="' + esc(draft('lab-high', def.high)) + '"></div>' +
    '</div>' +
    '<p class="hint">Copia la referencia que trae tu examen. Si no trae, deja esos campos vacíos.</p>' +
    '<div class="field"><label class="lbl" for="lab-note">Nota</label><input type="text" id="lab-note" data-draft value="' + esc(draft('lab-note', '')) + '"></div>' +
    '<p class="form-err">' + esc(S.formErr.lab || '') + '</p>' +
    '<button type="submit" class="btn" id="lab-save"' + ro() + '>Guardar resultado</button></form>';
}
