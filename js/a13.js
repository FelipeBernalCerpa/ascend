'use strict';
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
    profileCardHTML() + goalsCardHTML() + myFoodsCardHTML() + socialCardHTML() +
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
function openNewMed() {
  if (S.readonly || !S.medsLoaded) return;
  S.medDraft = { id: null, name: '', dose: '', note: '', slots: ['manana'], days: ALL_DAYS.slice(), active: true };
  S.formErr.med = '';
  S.confirmDel = null;
  renderAjustes();
  focusEl('md-name');
}
function focusEl(id) {
  const f = document.getElementById(id);
  if (!f) return;
  try { f.focus({ preventScroll: true }); f.scrollIntoView({ block: 'center' }); } catch (e) {}
}
function saveMedDraft() {
  const d = S.medDraft;
  if (!d || S.readonly) return;
  for (const f of ['name', 'dose', 'note']) { const el = document.getElementById('md-' + f); if (el) d[f] = el.value; }
  const name = String(d.name || '').trim();
  let err = '';
  if (!name) err = 'Escribe el nombre del medicamento.';
  else if (!(d.slots || []).length) err = 'Elige al menos un horario.';
  else if (!(d.days || []).length) err = 'Elige al menos un día.';
  S.formErr.med = err;
  if (err) { renderAjustes(); return; }
  const item = { id: d.id || uid(), name, dose: String(d.dose || '').trim(), note: String(d.note || '').trim(), slots: d.slots.slice(), days: d.days.slice(), active: !!d.active };
  const i = S.meds.findIndex(m => m.id === item.id);
  if (i >= 0) S.meds[i] = item; else S.meds.push(item);
  S.medDraft = null;
  saveMeds();
  renderAjustes();
}

/* ---------- navegación ---------- */
function renderActive() {
  const t = S.tab;
  if (t === 'hoy') renderHoy();
  else if (t === 'progreso') renderProgreso();
  else if (t === 'salud') renderSalud();
  else if (t === 'guia') renderGuia();
  else if (t === 'ajustes') renderAjustes();
  else if (t === 'habitos') renderHabitos();
}
function setTab(t) {
  if (S.sheet) closeSheet();
  if (['hoy', 'progreso', 'habitos', 'salud', 'guia', 'ajustes'].indexOf(t) < 0) t = 'hoy';
  S.tab = t;
  S.confirmDel = null;
  for (const v of $$('.view')) v.hidden = v.dataset.view !== t;
  for (const b of $$('.tab')) { if (b.dataset.tab === t) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
  renderActive();
  lsSet(LS_TAB, t);
  try { window.scrollTo(0, 0); } catch (e) {}
}
function ensureDay() { /* al entrar se cargan todos los días de la cuenta */ }
function confirmOrDo(tag, fn, rerender) {
  if (S.readonly) return;
  clearTimeout(S.cdT);
  if (S.confirmDel === tag) { S.confirmDel = null; fn(); rerender(); return; }
  S.confirmDel = tag;
  rerender();
  S.cdT = setTimeout(() => { if (S.confirmDel === tag) { S.confirmDel = null; rerender(); } }, 4000);
}

/* ---------- acciones ---------- */
function doseAction(op, key, hm, btnEl) {
  const k = S.viewKey;
  const hadFocus = document.activeElement === btnEl;
  const ok = mutDay(k, d => {
    d.meds = Object.assign({}, d.meds);
    if (op === 'undo') delete d.meds[key];
    else if (op === 'take') d.meds[key] = { s: 'taken', at: k === todayKey() ? Date.now() : atMin(k, hm2min(hm)).getTime() };
    else if (op === 'had') d.meds[key] = { s: 'taken', at: atMin(k, hm2min(hm)).getTime(), late: true };
    else if (op === 'skip') d.meds[key] = { s: 'skipped', at: Date.now() };
  });
  if (!ok) return;
  renderHoy(['meds', 'meters']);
  if (hadFocus && btnEl && btnEl.id) {
    const base = btnEl.id.replace(/-(take|had|skip|undo)$/, '');
    const next = document.getElementById(base + (op === 'undo' ? '-take' : '-undo')) || document.getElementById(base + '-skip');
    if (next) { try { next.focus({ preventScroll: true }); } catch (e) {} }
  }
}
function mutMed(id, fn) {
  if (S.readonly || !S.medsLoaded) return;
  const m = S.meds.find(x => x.id === id);
  if (!m) return;
  fn(m);
  saveMeds();
  renderAjustes();
}
function saveMeds() { saver.queue('config/meds', { items: clone(S.meds) }); }
function saveSettings() { if (S.loaded.settings) saver.queue('config/settings', clone(S.settings), 700); }
function delMeasure(id, fields) {
  const m = S.measures.find(x => x.id === id);
  if (!m) return;
  for (const f of fields) delete m[f];
  if (MEASURE_FIELDS.some(f => hasNum(m[f]))) putDoc('measures/' + id, strip(m));
  else {
    S.measures = S.measures.filter(x => x.id !== id);
    delDoc('measures/' + id);
  }
}
function submitComp(form) {
  const date = ($('#comp-date', form) || {}).value || '';
  const fatS = (($('#comp-fat', form) || {}).value || '').trim();
  const musS = (($('#comp-muscle', form) || {}).value || '').trim();
  const fat = parseNum(fatS), mus = parseNum(musS);
  let err = '';
  if (!date || date > todayKey()) err = 'Elige una fecha válida.';
  else if (!fatS && !musS) err = 'Escribe la grasa, la masa muscular o las dos.';
  else if (fatS && (!isFinite(fat) || fat < 2 || fat > 60)) err = 'La grasa va en porcentaje, entre 2 y 60.';
  else if (musS && (!isFinite(mus) || mus < 5 || mus > 100)) err = 'La masa muscular va en kilos, entre 5 y 100.';
  S.formErr.comp = err;
  if (err || !S.loaded.measures) { renderProgreso(); return; }
  const data = { date, createdAt: Date.now() };
  if (fatS) data.fat = Math.round(fat * 10) / 10;
  if (musS) data.muscle = Math.round(mus * 10) / 10;
  const id = store.newId('measures');
  S.measures.push(Object.assign({ id }, data));
  S.measures.sort(byDate);
  delete S.drafts['comp-fat'];
  delete S.drafts['comp-muscle'];
  renderProgreso();
  putDoc('measures/' + id, data);
}
function saveShop() { saver.queue('config/shopping', { checked: clone(S.shopping), custom: clone(S.shopCustom || []) }); }
function submitShop(form) {
  const label = ((($('#shop-new', form) || {}).value) || '').trim().slice(0, 80);
  S.formErr.shop = label ? '' : 'Escribe el producto.';
  if (!label || !S.loaded.shopping) { renderGuia(); return; }
  S.shopCustom = (S.shopCustom || []).concat({ k: 'c-' + uid(), label });
  delete S.drafts['shop-new'];
  saveShop();
  renderGuia();
  const f = document.getElementById('shop-new');
  if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
}
function submitMeasure(kind, form) {
  const field = kind;
  const date = ($('#' + kind + '-date', form) || {}).value || '';
  const n = parseNum(($('#' + kind + '-val', form) || {}).value);
  const lim = field === 'weight' ? [20, 200] : [100, 230];
  let err = '';
  if (!date || date > todayKey()) err = 'Elige una fecha válida.';
  else if (!isFinite(n) || n < lim[0] || n > lim[1]) err = field === 'weight' ? 'Escribe el peso en kilos, entre 20 y 200.' : 'Escribe la estatura en centímetros, entre 100 y 230.';
  S.formErr[kind] = err;
  if (err || !S.loaded.measures) { renderProgreso(); return; }
  const data = { date, createdAt: Date.now() };
  data[field] = Math.round(n * 10) / 10;
  const id = store.newId('measures');
  S.measures.push(Object.assign({ id }, data));
  S.measures.sort(byDate);
  delete S.drafts[kind + '-val'];
  renderProgreso();
  putDoc('measures/' + id, data);
}
function submitLab(form) {
  const v = id => (($('#' + id, form) || {}).value || '');
  const type = v('lab-type') || 'otro';
  const date = v('lab-date');
  const val = parseNum(v('lab-value'));
  const unit = v('lab-unit').trim();
  const low = parseNum(v('lab-low')), high = parseNum(v('lab-high'));
  const note = v('lab-note').trim();
  const name = type === 'otro' ? v('lab-name').trim() : LAB_BY[type].name;
  let err = '';
  if (!date || date > todayKey()) err = 'Elige una fecha válida.';
  else if (!isFinite(val)) err = 'Escribe el resultado en número.';
  else if (type === 'otro' && !name) err = 'Escribe el nombre del examen.';
  else if ((v('lab-low').trim() && !isFinite(low)) || (v('lab-high').trim() && !isFinite(high))) err = 'La referencia debe ser un número.';
  S.formErr.lab = err;
  if (err || !S.loaded.labs) { renderSalud(); return; }
  const data = { key: type, name, date, value: val, unit, low: isFinite(low) ? low : null, high: isFinite(high) ? high : null, note, createdAt: Date.now() };
  const id = store.newId('labs');
  S.labs.push(Object.assign({ id }, data));
  S.labs.sort(byDate);
  delete S.drafts['lab-value'];
  delete S.drafts['lab-note'];
  S.openLab = labGroupKey(data);
  renderSalud();
  putDoc('labs/' + id, data);
}
function submitQ(form) {
  const text = (($('#q-new', form) || {}).value || '').trim();
  const doctor = (($('#q-doc', form) || {}).value) || 'otro';
  S.formErr.q = text ? '' : 'Escribe la pregunta.';
  if (!text || !S.loaded.questions) { renderSalud(); return; }
  const data = { text, doctor, done: false, answer: '', createdAt: Date.now() };
  const id = store.newId('questions');
  S.questions.push(Object.assign({ id }, data));
  delete S.drafts['q-new'];
  renderSalud();
  putDoc('questions/' + id, data);
}

function onClick(e) {
  const el = e.target.closest('[data-tab],[data-go],[data-act]');
  if (!el || el.disabled) return;
  if (el.dataset.tab) { setTab(el.dataset.tab); return; }
  if (el.dataset.go) { setTab(el.dataset.go); return; }
  const act = el.dataset.act, id = el.dataset.id;
  switch (act) {
    case 'day': {
      const nk = addDays(S.viewKey, Number(el.dataset.d) || 0);
      if (nk > todayKey()) return;
      S.viewKey = nk; ensureDay(nk); renderHoy();
      break;
    }
    case 'day-today': S.viewKey = todayKey(); renderHoy(); break;
    case 'goto-day': S.viewKey = el.dataset.day; ensureDay(S.viewKey); setTab('hoy'); break;
    case 'dose': doseAction(el.dataset.op, el.dataset.key, el.dataset.hm, el); break;
    case 'water':
      if (mutDay(S.viewKey, d => { d.water = (d.water || []).concat(Number(el.dataset.ml) || 0); })) renderHoy(['water', 'meters']);
      break;
    case 'water-undo':
      if (mutDay(S.viewKey, d => { d.water = (d.water || []).slice(0, -1); })) renderHoy(['water', 'meters']);
      break;
    case 'boost':
      if (mutDay(S.viewKey, d => { d.boost = Object.assign({}, d.boost); const k = el.dataset.k; if (d.boost[k]) delete d.boost[k]; else d.boost[k] = true; })) renderHoy(['boost', 'meters']);
      break;
    case 'feel':
      if (mutDay(S.viewKey, d => { const f = el.dataset.f, v = Number(el.dataset.v); if (d[f] === v) delete d[f]; else d[f] = v; })) renderHoy(['feel']);
      break;
    case 'sleep-fill':
      if (mutDay(S.viewKey, d => { d.sleep = { bed: S.settings.bedTarget, wake: S.settings.wakeTarget }; })) renderHoy(['sleep', 'meters']);
      break;
    case 'm-del': {
      const fld = el.dataset.field;
      confirmOrDo('m:' + id + ':' + fld, () => delMeasure(id, fld === 'comp' ? ['fat', 'muscle'] : [fld]), renderProgreso);
      break;
    }
    case 'lab-open': S.openLab = S.openLab === el.dataset.g ? null : el.dataset.g; renderSalud(); break;
    case 'lab-del': confirmOrDo('l:' + id, () => { S.labs = S.labs.filter(l => l.id !== id); delDoc('labs/' + id); }, renderSalud); break;
    case 'q-toggle': {
      if (S.readonly) return;
      const q = S.questions.find(x => x.id === id);
      if (!q) return;
      q.done = !q.done;
      renderSalud();
      putDoc('questions/' + id, strip(q));
      break;
    }
    case 'q-del': confirmOrDo('q:' + id, () => { S.questions = S.questions.filter(q => q.id !== id); delDoc('questions/' + id); }, renderSalud); break;
    case 'sum-build': S.summary = buildSummary(); S.copied = false; renderSalud(); break;
    case 'sum-copy': copySummary(); break;
    case 'shop': {
      if (S.readonly || !S.loaded.shopping) return;
      const k = el.dataset.k;
      S.shopping = Object.assign({}, S.shopping);
      if (S.shopping[k]) delete S.shopping[k]; else S.shopping[k] = true;
      saveShop();
      renderGuia();
      break;
    }
    case 'shop-clear':
      if (S.readonly || !S.loaded.shopping) return;
      S.shopping = {};
      saveShop();
      renderGuia();
      break;
    case 'shop-del': {
      if (S.readonly || !S.loaded.shopping) return;
      const k = el.dataset.k;
      S.shopCustom = (S.shopCustom || []).filter(x => x.k !== k);
      if (S.shopping[k]) { S.shopping = Object.assign({}, S.shopping); delete S.shopping[k]; }
      saveShop();
      renderGuia();
      break;
    }
    case 'meds-edit': setTab('ajustes'); break;
    case 'med-new-go': setTab('ajustes'); openNewMed(); break;
    case 'med-new': openNewMed(); break;
    case 'med-edit': {
      const m = S.meds.find(x => x.id === id);
      if (!m || S.readonly) return;
      S.medDraft = clone(m);
      if (!Array.isArray(S.medDraft.days)) S.medDraft.days = ALL_DAYS.slice();
      S.formErr.med = '';
      S.confirmDel = null;
      renderAjustes();
      focusEl('md-name');
      break;
    }
    case 'md-slot': {
      if (!S.medDraft) return;
      const set = new Set(S.medDraft.slots || []), s = el.dataset.s;
      if (set.has(s)) set.delete(s); else set.add(s);
      S.medDraft.slots = SLOT_KEYS.filter(k => set.has(k));
      renderAjustes();
      break;
    }
    case 'md-day': {
      if (!S.medDraft) return;
      const set = new Set(S.medDraft.days || []), n = Number(el.dataset.n);
      if (set.has(n)) set.delete(n); else set.add(n);
      S.medDraft.days = ALL_DAYS.filter(x => set.has(x));
      renderAjustes();
      break;
    }
    case 'md-active': if (S.medDraft) { S.medDraft.active = !S.medDraft.active; renderAjustes(); } break;
    case 'md-save': saveMedDraft(); break;
    case 'md-cancel': S.medDraft = null; S.formErr.med = ''; renderAjustes(); break;
    case 'med-del': confirmOrDo('med:' + id, () => { S.meds = S.meds.filter(m => m.id !== id); if (S.medDraft && S.medDraft.id === id) S.medDraft = null; saveMeds(); }, renderAjustes); break;
    case 'logout': logout(); break;
    case 'export': exportData(); break;
    case 'wipe': confirmOrDo('wipe', () => { wipeData(); }, renderAjustes); break;
    case 'reload': location.reload(); break;
    default: extClick(act, el, id); break;
  }
}
