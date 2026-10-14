'use strict';
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
function renderSalud() {
  const root = $('#view-salud');
  if (!root) return;
  S.charts = {};
  swap(root, labsHTML() + questionsHTML() + summaryHTML());
  drawCharts(root);
}
async function copySummary() {
  const ta = $('#sum-out');
  if (!ta) return;
  let ok = false;
  try { await navigator.clipboard.writeText(S.summary); ok = true; } catch (e) { ok = false; }
  if (!ok) { ta.focus(); ta.select(); return; }
  S.copied = true;
  renderSalud();
  setTimeout(() => { S.copied = false; if (S.tab === 'salud') renderSalud(); }, 2500);
}

/* ---------- GUÍA ---------- */

/* ---------- AJUSTES ---------- */
function medEditorHTML() {
  const d = S.medDraft;
  if (!d) return '';
  const isNew = !d.id;
  const days = Array.isArray(d.days) ? d.days : ALL_DAYS;
  return '<div class="med-ed" id="med-editor"><h3 class="form-t">' + (isNew ? 'Nuevo medicamento' : 'Editar medicamento') + '</h3>' +
    '<div class="field"><label class="lbl" for="md-name">Nombre</label><input type="text" id="md-name" data-md-field="name" value="' + esc(d.name || '') + '" autocomplete="off"></div>' +
    '<div class="grid2">' +
      '<div class="field"><label class="lbl" for="md-dose">Dosis</label><input type="text" id="md-dose" data-md-field="dose" value="' + esc(d.dose || '') + '" placeholder="La de tu fórmula"></div>' +
      '<div class="field"><label class="lbl" for="md-note">Nota</label><input type="text" id="md-note" data-md-field="note" value="' + esc(d.note || '') + '"></div>' +
    '</div>' +
    '<div class="field"><span class="lbl">Horarios</span><div class="toggles">' + SLOT_KEYS.map(k => '<button type="button" class="tgl" id="mds-' + k + '" data-act="md-slot" data-s="' + k + '" aria-pressed="' + ((d.slots || []).indexOf(k) >= 0) + '">' + esc(S.settings.slots[k].name) + '<small>' + fmtHM(S.settings.slots[k].time) + '</small></button>').join('') + '</div></div>' +
    '<div class="field"><span class="lbl">Días</span><div class="toggles days">' + WD_ORDER.map(n => '<button type="button" class="tgl" id="mdw-' + n + '" data-act="md-day" data-n="' + n + '" aria-pressed="' + (days.indexOf(n) >= 0) + '" aria-label="' + WD[n] + '">' + WD1[n] + '</button>').join('') + '</div></div>' +
    '<button type="button" class="switch" id="md-active" data-act="md-active" aria-pressed="' + !!d.active + '"><span class="sw"></span>' + (d.active ? 'Activo' : 'En pausa') + '</button>' +
    '<p class="form-err">' + esc(S.formErr.med || '') + '</p>' +
    '<div class="row"><button type="button" class="btn" id="md-save" data-act="md-save">' + (isNew ? 'Agregar' : 'Guardar cambios') + '</button><button type="button" class="btn quiet" id="md-cancel" data-act="md-cancel">Cancelar</button></div>' +
  '</div>';
}
function medRowHTML(m) {
  if (S.medDraft && S.medDraft.id === m.id) return '<div class="med editing">' + medEditorHTML() + '</div>';
  const tag = 'med:' + m.id, armed = S.confirmDel === tag;
  return '<div class="med' + (m.active ? '' : ' off') + '"><div class="med-info"><span class="med-n">' + esc(m.name || 'Sin nombre') + (m.dose ? ' <small>' + esc(m.dose) + '</small>' : '') + '</span>' +
    '<span class="med-s">' + (m.active ? esc(medSchedText(m)) : 'En pausa') + '</span></div>' +
    '<div class="med-btns"><button type="button" class="xbtn" id="me-' + m.id + '" data-act="med-edit" data-id="' + esc(m.id) + '"' + ro() + '>Editar</button>' +
    '<button type="button" class="xbtn' + (armed ? ' armed' : '') + '" id="mx-' + m.id + '" data-act="med-del" data-id="' + esc(m.id) + '"' + ro() + '>' + (armed ? '¿Eliminar?' : 'Eliminar') + '</button></div></div>';
}
function renderAjustes() {
  const root = $('#view-ajustes');
  if (!root) return;
  const s = S.settings;
  const setDis = S.readonly || !S.loaded.settings ? ' disabled' : '';
  const newDraft = !!(S.medDraft && !S.medDraft.id);
  let medsList;
  if (!S.medsLoaded) medsList = '<p class="empty">Cargando…</p>';
  else if (!S.meds.length) medsList = newDraft ? '' : '<p class="empty">Aún no hay medicamentos. Agrega el primero con su nombre, dosis y horario.</p>';
  else medsList = S.meds.map(medRowHTML).join('');
  const slotsHTML = SLOT_KEYS.map(k =>
    '<div class="slot-edit"><div class="field"><label class="lbl" for="sn-' + k + '">Nombre</label><input type="text" id="sn-' + k + '" data-slot-name="' + k + '" value="' + esc(s.slots[k].name) + '"' + setDis + '></div>' +
    '<div class="field"><label class="lbl" for="st-' + k + '">Hora</label><input type="time" id="st-' + k + '" data-slot-time="' + k + '" value="' + esc(s.slots[k].time) + '"' + setDis + '></div></div>'
  ).join('');
  const wipeArmed = S.confirmDel === 'wipe';
  swap(root,
    appSettingsCardHTML() +
    (medsOn() ?
    '<section class="card" id="card-medsed"><div class="card-h"><h2>Medicamentos</h2><span class="meta">' + S.meds.filter(m => m.active).length + ' activos</span></div>' +
      (newDraft ? '<div class="med editing new">' + medEditorHTML() + '</div>'
        : '<button type="button" class="btn add-top" id="med-new" data-act="med-new"' + (S.readonly || !S.medsLoaded ? ' disabled' : '') + '>Agregar medicamento</button>') +
      '<div class="meds">' + medsList + '</div>' +
      '<p class="hint">Copia nombre, dosis y horario tal como vienen en tu fórmula. Si un médico cambia algo, actualízalo aquí el mismo día.</p></section>' +
    '<section class="card"><div class="card-h"><h2>Horarios de tomas</h2></div><div class="slots-ed">' + slotsHTML + '</div></section>' : '') +
    '<section class="card"><div class="card-h"><h2>Metas</h2></div><div class="grid2">' +
      '<div class="field"><label class="lbl" for="set-water">Agua al día (ml)</label><input type="text" inputmode="numeric" id="set-water" data-set="waterGoal" value="' + esc(s.waterGoal) + '"' + setDis + '></div>' +
      '<div class="field"><label class="lbl" for="set-sleep">Sueño (horas)</label><input type="text" inputmode="decimal" id="set-sleep" data-set="sleepGoal" value="' + esc(fmtNum(s.sleepGoal, 1)) + '"' + setDis + '></div>' +
      '<div class="field"><label class="lbl" for="set-bed">Dormido a las</label><input type="time" id="set-bed" data-set="bedTarget" value="' + esc(s.bedTarget) + '"' + setDis + '></div>' +
      '<div class="field"><label class="lbl" for="set-wake">Me levanto a las</label><input type="time" id="set-wake" data-set="wakeTarget" value="' + esc(s.wakeTarget) + '"' + setDis + '></div>' +
    '</div><p class="hint">Si tu médico te indica otra meta de agua o de sueño, cámbiala aquí.</p></section>' +
    profileCardHTML() + goalsCardHTML() + myFoodsCardHTML() +
    '<section class="card" id="card-account"><div class="card-h"><h2>Tu cuenta</h2></div>' +
      '<p class="acct">' + esc(S.userEmail || '') + '</p>' +
      '<div class="row"><button type="button" class="btn quiet" id="acct-export" data-act="export">Descargar mis datos</button>' +
      '<label class="btn quiet" for="import-file" id="acct-import">Importar datos</label><input type="file" id="import-file" accept="application/json,.json" hidden></div>' +
      (S.dataMsg ? '<p class="hint">' + esc(S.dataMsg) + '</p>' : '') +
      '<div class="row acct-end"><button type="button" class="btn quiet" id="acct-logout" data-act="logout">Cerrar sesión</button>' +
      '<button type="button" class="btn sm ' + (wipeArmed ? 'danger' : 'quiet') + '" id="acct-wipe" data-act="wipe">' + (wipeArmed ? 'Toca otra vez para borrar todo' : 'Borrar todos mis datos') + '</button></div>' +
      '<p class="hint">Tus registros se guardan en tu cuenta de Ascend y solo tú los ves. Borrar tus datos no se puede deshacer.</p></section>' +
    '<section class="card" id="card-about"><div class="card-h"><h2>Sobre Ascend</h2></div><p class="prose">Ascend te ayuda a llevar medicamentos, comida, actividad, sueño y salud en un solo lugar. Los horarios y las dosis los define tu equipo médico.</p><details class="privacy"><summary>Privacidad y uso de tus datos</summary>' + privacyInner() + '</details></section>'
  );
}
