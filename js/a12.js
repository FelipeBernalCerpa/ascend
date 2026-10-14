'use strict';
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
  swap(root, achievementsHTML() + anaCardHTML('gen') + weekHTML() + averagesHTML() + nutri7HTML() + measureHTML('weight') + compHTML() + bmiHTML() + measureHTML('height') + rankingCardHTML());
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
function qHTML(q) {
  const tag = 'q:' + q.id, armed = S.confirmDel === tag;
  return '<div class="q' + (q.done ? ' done' : '') + '">' +
    '<button type="button" class="qchk" id="qc-' + q.id + '" data-act="q-toggle" data-id="' + esc(q.id) + '" aria-pressed="' + !!q.done + '" aria-label="' + (q.done ? 'Marcar como pendiente' : 'Marcar como resuelta') + '"' + ro() + '></button>' +
    '<div class="q-main"><p class="q-text">' + esc(q.text) + '</p>' +
      (q.done ? '<label class="lbl sr" for="qa-' + q.id + '">Respuesta</label><textarea id="qa-' + q.id + '" data-q-ans="' + esc(q.id) + '" rows="2" placeholder="Qué te respondieron"' + roText() + '>' + esc(q.answer || '') + '</textarea>' : '') +
    '</div>' +
    '<button type="button" class="xbtn' + (armed ? ' armed' : '') + '" id="qd-' + q.id + '" data-act="q-del" data-id="' + esc(q.id) + '"' + ro() + '>' + (armed ? '¿Eliminar?' : 'Eliminar') + '</button></div>';
}
function questionsHTML() {
  let body;
  if (!S.loaded.questions) body = '<p class="empty">Cargando tus preguntas…</p>';
  else if (!S.questions.length) body = '<p class="empty">Aún no hay preguntas. Escribe la primera abajo.</p>';
  else {
    body = DOCTORS.map(d => {
      const qs = S.questions.filter(q => (q.doctor || 'otro') === d.k).sort((a, b) => ((!!a.done) - (!!b.done)) || byCreated(a, b));
      if (!qs.length) return '';
      const pend = qs.filter(q => !q.done).length;
      return '<div class="qgroup"><h3 class="qg-t">' + d.label + '<span>' + (pend ? pend + (pend === 1 ? ' pendiente' : ' pendientes') : 'Todo resuelto') + '</span></h3>' + qs.map(qHTML).join('') + '</div>';
    }).join('');
  }
  const qd = draft('q-doc', 'general');
  return '<section class="card" id="card-q"><div class="card-h"><h2>Preguntas para el médico</h2></div>' + body +
    '<form class="form" data-form="q" novalidate><h3 class="form-t">Nueva pregunta</h3>' +
      '<div class="field"><label class="lbl" for="q-new">Pregunta</label><textarea id="q-new" data-draft rows="2">' + esc(draft('q-new', '')) + '</textarea></div>' +
      '<div class="field"><label class="lbl" for="q-doc">Para</label><select id="q-doc" data-draft>' + DOCTORS.map(d => '<option value="' + d.k + '"' + (d.k === qd ? ' selected' : '') + '>' + d.label + '</option>').join('') + '</select></div>' +
      '<p class="form-err">' + esc(S.formErr.q || '') + '</p>' +
      '<button type="submit" class="btn" id="q-save"' + ro() + '>Agregar pregunta</button>' +
    '</form></section>';
}
function summaryHTML() {
  return '<section class="card" id="card-sum"><div class="card-h"><h2>Resumen para la cita</h2></div>' +
    '<p class="prose">Junta los últimos 30 días, tus mediciones, exámenes, medicamentos y preguntas pendientes en un texto para mostrar o copiar.</p>' +
    '<div class="row"><button type="button" class="btn" id="sum-build" data-act="sum-build">' + (S.summary ? 'Actualizar resumen' : 'Armar resumen') + '</button>' +
    (S.summary ? '<button type="button" class="btn quiet" id="sum-copy" data-act="sum-copy">Copiar</button>' : '') + '</div>' +
    (S.summary ? '<label class="lbl sr" for="sum-out">Resumen</label><textarea id="sum-out" class="sum-out" rows="16" readonly>' + esc(S.summary) + '</textarea>' + (S.copied ? '<p class="hint ok-t">Copiado.</p>' : '') : '') +
  '</section>';
}
function buildSummary() {
  const tk = todayKey(), L = [];
  L.push('Resumen para la cita · ' + fmtDate(tk));
  let days = 0, doses = 0, taken = 0, skipped = 0, sN = 0, sSum = 0, wN = 0, wSum = 0;
  for (let i = 0; i < 30; i++) {
    const k = addDays(tk, -i), d = S.days[k];
    if (!d) continue;
    days++;
    const ds = dosesFor(k);
    doses += ds.length;
    for (const x of ds) { const r = d.meds && d.meds[x.key]; if (r && r.s === 'taken') taken++; else if (r && r.s === 'skipped') skipped++; }
    const h = sleepHours(d.sleep); if (h != null) { sN++; sSum += h; }
    const w = sum(d.water); if (w > 0) { wN++; wSum += w; }
  }
  L.push('');
  L.push('Últimos 30 días (' + days + (days === 1 ? ' día' : ' días') + ' con registro)');
  if (doses) L.push('· Medicamentos: ' + taken + ' de ' + doses + ' tomas marcadas como tomadas (' + Math.round(taken / doses * 100) + ' %). Saltadas: ' + skipped + '.');
  if (sN) L.push('· Sueño promedio: ' + fmtNum(sSum / sN, 1) + ' h (' + sN + ' noches).');
  if (wN) L.push('· Agua promedio: ' + fmtInt(wSum / wN) + ' ml al día (' + wN + ' días).');
  const rs = statsRange(30);
  if (rs.fN) L.push('· Alimentación registrada (' + rs.fN + (rs.fN === 1 ? ' día' : ' días') + '), promedio por día: ' + fmtInt(rs.nut.kcal / rs.fN) + ' kcal; proteína ' + fmtNut('p', rs.nut.p / rs.fN) + ' g; grasas ' + fmtNut('f', rs.nut.f / rs.fN) + ' g (saturadas ' + fmtNut('sf', rs.nut.sf / rs.fN) + ' g); carbohidratos ' + fmtNut('c', rs.nut.c / rs.fN) + ' g; azúcar ' + fmtNut('s', rs.nut.s / rs.fN) + ' g; fibra ' + fmtNut('fi', rs.nut.fi / rs.fN) + ' g; sodio ' + fmtInt(rs.nut.na / rs.fN) + ' mg.');
  if (rs.stN) L.push('· Pasos promedio: ' + fmtInt(rs.stSum / rs.stN) + ' al día (' + rs.stN + (rs.stN === 1 ? ' día' : ' días') + ').');
  if (rs.ex) L.push('· Días con ejercicio: ' + rs.ex + (rs.intense ? ' (' + rs.intense + ' con cardio intenso)' : '') + '.');
  if (!days) L.push('· Aún no hay días registrados.');
  const ms = [['weight', 'Peso', 'kg'], ['height', 'Estatura', 'cm']];
  const mLines = [];
  for (const [field, label, unit] of ms) {
    const list = S.measures.filter(m => hasNum(m[field])).sort(byDate);
    const a = list[list.length - 1], b = list[list.length - 2];
    if (a) mLines.push(label + ': ' + fmtNum(a[field], 1, 1) + ' ' + unit + ' (' + fmtDate(a.date) + ')' + (b ? '. Anterior: ' + fmtNum(b[field], 1, 1) + ' ' + unit + ' (' + fmtDate(b.date) + ')' : '') + '.');
  }
  const bs = bmiSeries();
  if (bs.length) { const bb = bs[bs.length - 1]; mLines.push('IMC: ' + fmtNum(bb.bmi, 1, 1) + ' (' + fmtDate(bb.date) + ').'); }
  const fats = S.measures.filter(m => hasNum(m.fat)).sort(byDate);
  if (fats.length) { const f = fats[fats.length - 1]; mLines.push('Grasa corporal: ' + fmtNum(f.fat, 1, 1) + ' % (' + fmtDate(f.date) + ').'); }
  const mus = S.measures.filter(m => hasNum(m.muscle)).sort(byDate);
  if (mus.length) { const f = mus[mus.length - 1]; mLines.push('Masa muscular: ' + fmtNum(f.muscle, 1, 1) + ' kg (' + fmtDate(f.date) + ').'); }
  if (mLines.length) { L.push(''); L.push('Mediciones'); mLines.forEach(x => L.push('· ' + x)); }  const groups = new Map();
  for (const l of S.labs.slice().sort(byDate)) groups.set(labGroupKey(l), l);
  if (groups.size) {
    L.push(''); L.push('Últimos exámenes');
    for (const l of groups.values()) { const r = rangeShort(l); L.push('· ' + labName(l) + ': ' + fmtNum(l.value) + (l.unit ? ' ' + l.unit : '') + ' (' + fmtDate(l.date) + ')' + (r ? ', referencia ' + r : '') + '.'); }
  }
  const active = S.meds.filter(m => m.active);
  if (active.length) {
    L.push(''); L.push('Medicamentos actuales');
    for (const m of active) L.push('· ' + (m.name || 'Sin nombre') + (m.dose ? ' ' + m.dose : '') + ': ' + medSchedText(m) + '.');
  }
  const pend = S.questions.filter(q => !q.done);
  if (pend.length) {
    L.push(''); L.push('Preguntas pendientes');
    for (const d of DOCTORS) {
      const qs = pend.filter(q => (q.doctor || 'otro') === d.k).sort(byCreated);
      if (!qs.length) continue;
      L.push(d.label + ':');
      for (const q of qs) L.push('· ' + q.text);
    }
  }
  return L.join('\n');
}
