'use strict';
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
function onInput(e) {
  const t = e.target;
  if (!t || !t.dataset) return;
  if (extInput(t)) return;
  if (t.hasAttribute('data-draft')) { S.drafts[t.id] = t.value; return; }
  if (t.id === 'day-notes') { mutDay(S.viewKey, d => { d.notes = t.value; }); return; }
  if (t.dataset.qAns) {
    const q = S.questions.find(x => x.id === t.dataset.qAns);
    if (q && !S.readonly) { q.answer = t.value; saver.queue('questions/' + q.id, strip(q), 700); }
    return;
  }
  if (S.readonly) return;
  if (t.dataset.set && S.loaded.settings) {
    const k = t.dataset.set;
    let v = t.value;
    if (k === 'waterGoal') { const n = parseInt(String(v).replace(/\D/g, ''), 10); if (!n || n < 500 || n > 6000) return; v = n; }
    else if (k === 'sleepGoal') { const n = parseNum(v); if (!isFinite(n) || n < 5 || n > 12) return; v = n; }
    else if (!v) return;
    S.settings[k] = v;
    saveSettings();
    return;
  }
  if (t.dataset.slotName && S.loaded.settings) { const k = t.dataset.slotName; if (!t.value.trim()) return; S.settings.slots[k].name = t.value.trim(); saveSettings(); return; }
  if (t.dataset.slotTime && S.loaded.settings) { const k = t.dataset.slotTime; if (!t.value) return; S.settings.slots[k].time = t.value; saveSettings(); return; }
  if (t.dataset.mdField && S.medDraft) { S.medDraft[t.dataset.mdField] = t.value; return; }
}
function onChange(e) {
  const t = e.target;
  if (!t || !t.dataset) return;
  if (extChange(t)) return;
  if (t.dataset.sleep) {
    if (mutDay(S.viewKey, d => { d.sleep = Object.assign({}, d.sleep); if (t.value) d.sleep[t.dataset.sleep] = t.value; else delete d.sleep[t.dataset.sleep]; })) renderHoy(['sleep', 'meters']);
    return;
  }
  if (t.id === 'lab-type') {
    S.drafts['lab-type'] = t.value;
    ['lab-unit', 'lab-low', 'lab-high', 'lab-name'].forEach(k => { delete S.drafts[k]; });
    renderSalud();
    return;
  }
  if (t.id === 'height-date') { S.drafts[t.id] = t.value; renderProgreso(); return; }
  if (t.id === 'import-file') { importData(t); return; }
  if ((t.dataset.slotName || t.dataset.slotTime || t.dataset.set) && S.tab === 'ajustes') renderAjustes();
}
function onSubmit(e) {
  const f = e.target;
  const kind = f && f.dataset ? f.dataset.form : null;
  if (!kind) return;
  e.preventDefault();
  if (S.readonly) return;
  if (extSubmit(kind)) return;
  if (kind === 'weight' || kind === 'height') submitMeasure(kind, f);
  else if (kind === 'comp') submitComp(f);
  else if (kind === 'shop') submitShop(f);
  else if (kind === 'lab') submitLab(f);
  else if (kind === 'q') submitQ(f);
}

/* ---------- suscripciones ---------- */
function onDays(list) {
  const first = !S.daysLoaded;
  let touchView = false, any = false;
  for (const it of list) {
    const path = 'days/' + it.id;
    if (dirty.has(path)) continue;
    const prev = S.days[it.id];
    if (!prev || stable(prev) !== stable(it.data)) {
      S.days[it.id] = clone(it.data);
      any = true;
      if (it.id === S.viewKey || it.id === addDays(S.viewKey, -1)) touchView = true;
    }
  }
  S.daysCount = list.length;
  S.oldestLoaded = list.length ? list.reduce((m, x) => (x.id < m ? x.id : m), list[0].id) : '0000-00-00';
  S.daysLoaded = true;
  if (S.tab === 'hoy' && (first || touchView)) renderHoy();
  else if (S.tab === 'progreso' && (first || any)) renderProgreso();
  else if (S.tab === 'habitos' && (first || any)) renderHabitos();
}
function colHandler(name, sortFn, render) {
  return list => {
    const prev = S[name];
    const byId = new Map(prev.map(x => [x.id, x]));
    const next = [];
    for (const it of list) {
      const path = name + '/' + it.id;
      if (deleting.has(path)) continue;
      if (dirty.has(path) && byId.has(it.id)) next.push(byId.get(it.id));
      else next.push(Object.assign({ id: it.id }, clone(it.data)));
    }
    for (const x of prev) if (dirty.has(name + '/' + x.id) && !next.some(y => y.id === x.id)) next.push(x);
    next.sort(sortFn);
    const first = !S.loaded[name];
    const changed = first || stable(next) !== stable(prev.slice().sort(sortFn));
    S[name] = next;
    S.loaded[name] = true;
    if (changed) render();
  };
}
function subscribeAll() {
  store.watchDoc('config/settings', data => {
    const first = !S.loaded.settings;
    S.loaded.settings = true;
    if (dirty.has('config/settings')) return;
    const next = mergeSettings(data);
    const ch = stable(next) !== stable(S.settings);
    S.settings = next;
    applyAppVis();
    if (ch || (first && S.tab === 'ajustes')) renderActive();
  });
  store.watchDoc('config/meds', data => {
    const first = !S.medsLoaded;
    S.medsLoaded = true;
    if (dirty.has('config/meds')) { if (first) renderActive(); return; }
    const items = data && Array.isArray(data.items) ? clone(data.items) : [];
    const ch = stable(items) !== stable(S.meds);
    S.meds = items;
    if (ch || first) renderActive();
  });
  store.watchDoc('config/shopping', data => {
    const first = !S.loaded.shopping;
    S.loaded.shopping = true;
    if (dirty.has('config/shopping')) return;
    const next = data && data.checked ? clone(data.checked) : {};
    const nextC = data && Array.isArray(data.custom) ? clone(data.custom).filter(x => x && x.k && x.label) : [];
    const ch = stable(next) !== stable(S.shopping) || stable(nextC) !== stable(S.shopCustom);
    S.shopping = next;
    S.shopCustom = nextC;
    if ((ch || first) && S.tab === 'guia') renderGuia();
  });
  store.watchDoc('config/profile', data => {
    const first = !S.loaded.profile;
    S.loaded.profile = true;
    if (dirty.has('config/profile')) return;
    const next = {};
    if (data && (data.sex === 'm' || data.sex === 'f')) next.sex = data.sex;
    if (data && typeof data === 'object') Object.assign(next, cleanProfile(data));
    if (data && /^\d{4}-\d{2}-\d{2}$/.test(String(data.birth || ''))) next.birth = data.birth;
    const ch = stable(next) !== stable(S.profile);
    S.profile = next;
    if (!ch && !first) return;
    if (S.tab === 'hoy') renderHoy(['act', 'meters', 'boost']);
    else if (S.tab === 'ajustes') renderAjustes();
    else if (S.tab === 'progreso') renderProgreso();
    else if (S.tab === 'guia') renderGuia();
  });
  store.watchCol('days', onDays, ref => ref.orderBy('date', 'desc').limit(400));
  store.watchCol('measures', colHandler('measures', byDate, () => { if (S.tab === 'progreso') renderProgreso(); else if (S.tab === 'hoy') renderHoy(['act', 'meters']); else if (S.tab === 'ajustes') renderAjustes(); }));
  store.watchCol('labs', colHandler('labs', byDate, () => { applyAppVis(); if (S.tab === 'salud') renderSalud(); }));
  store.watchCol('questions', colHandler('questions', byCreated, () => { applyAppVis(); if (S.tab === 'salud') renderSalud(); }));
  const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es');
  const onLib = () => { if (S.tab === 'ajustes') renderAjustes(); if (S.sheet && S.sheet.step === 'search') refreshRes(); };
  store.watchCol('foods', colHandler('foods', byName, onLib));
  store.watchCol('recipes', colHandler('recipes', byCreated, onLib));
  store.watchDoc('config/guide', data => {
    S.loaded.guide = true;
    if (dirty.has('config/guide')) return;
    S.guide = data && typeof data === 'object' ? data : null;
    if (S.tab === 'guia') renderGuia();
  });
  store.watchDoc('config/habits', data => {
    S.loaded.habits = true;
    if (dirty.has('config/habits')) return;
    S.habits = data && Array.isArray(data.items) ? data : null;
    if (S.tab === 'hoy') renderHoy(['boost']);
    else if (S.tab === 'ajustes') renderAjustes();
    else if (S.tab === 'progreso') renderProgreso();
    else if (S.tab === 'habitos') renderHabitos();
  });
  store.watchDoc('config/bosses', data => {
    S.loaded.bosses = true;
    if (dirty.has('config/bosses')) return;
    S.bosses = data && Array.isArray(data.items) ? data : null;
    if (S.tab === 'habitos') renderHabitos();
    else if (S.tab === 'hoy') renderHoy(['game']);
  });
  store.watchDoc('config/social', data => {
    S.loaded.reto = true;
    if (dirty.has('config/social')) return;
    S.reto = data && typeof data === 'object' ? data : null;
    if (S.tab === 'hoy') renderHoy(['reto', 'game']);
    else if (S.tab === 'progreso') renderProgreso();
  });
  store.watchDoc('config/aichat', data => {
    S.loaded.aichat = true;
    if (dirty.has('config/aichat')) return;
    S.chat.items = data && Array.isArray(data.items) ? data.items.filter(x => x && (x.role === 'user' || x.role === 'assistant') && typeof x.text === 'string') : [];
    if (S.tab === 'guia') renderChat();
  });
}

/* ---------- cuenta: acceso, respaldo y cierre ---------- */
let authMode = 'in';
let authNote = '';
function authMsg(err, ok) { $('#auth-err').textContent = err || ''; $('#auth-ok').textContent = ok || ''; }
function setAuthMode(m) {
  authMode = m;
  const special = m === 'reset' || m === 'recovery';
  $('#auth-tabs').hidden = special;
  const h = $('#auth-h');
  h.hidden = !special;
  h.textContent = m === 'reset' ? 'Recuperar contraseña' : m === 'recovery' ? 'Crea tu contraseña nueva' : '';
  for (const b of $$('#auth-tabs button')) b.setAttribute('aria-selected', String(b.dataset.mode === m));
  $('#auth-email-f').hidden = m === 'recovery';
  $('#auth-pass-f').hidden = m === 'reset';
  $('#auth-consent-f').hidden = m !== 'up';
  $('#auth-pass').setAttribute('autocomplete', m === 'in' ? 'current-password' : 'new-password');
  $('#auth-pass-lbl').textContent = m === 'recovery' ? 'Contraseña nueva' : m === 'up' ? 'Contraseña (mínimo 6 caracteres)' : 'Contraseña';
  $('#auth-go').textContent = m === 'in' ? 'Entrar' : m === 'up' ? 'Crear cuenta' : m === 'reset' ? 'Enviarme el enlace' : 'Guardar contraseña';
  const fg = $('#auth-forgot');
  fg.hidden = m === 'up' || m === 'recovery';
  fg.textContent = m === 'reset' ? 'Volver a entrar' : 'Olvidé mi contraseña';
  authMsg(authNote, '');
}
function showAuth(msg, mode) {
  $('#splash').hidden = true;
  $('#app').hidden = true;
  $('#auth').hidden = false;
  if (!sb && msg) authNote = msg;
  setAuthMode(mode || 'in');
  if (msg) authMsg(msg, '');
}
function authErrText(err) {
  const m = String((err && err.message) || err || '');
  if (/invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/email not confirmed/i.test(m)) return 'Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.';
  if (/already registered|already exists/i.test(m)) return 'Ese correo ya tiene cuenta. Entra con tu contraseña.';
  if (/at least 6|password should/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/different from the old|same password/i.test(m)) return 'La contraseña nueva debe ser distinta a la anterior.';
  if (/rate limit|too many/i.test(m)) return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
  if (/sending confirmation|confirmation email|sending.*email/i.test(m)) return 'Supabase no pudo enviar el correo de confirmación. En Supabase apaga «Confirm email» (Authentication → Sign In / Providers → Email) y vuelve a intentar.';
  if (/not authorized/i.test(m)) return 'Todavía no se pueden enviar correos a esa dirección. El administrador debe desactivar la confirmación por correo o conectar un servicio de correo.';
  if (/fetch|network|load failed/i.test(m)) return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  return 'No se pudo completar: ' + m;
}
async function onAuthSubmit(e) {
  e.preventDefault();
  if (!sb) { authMsg(authNote || 'Esta copia de Ascend todavía no está conectada a su base de datos.', ''); return; }
  const email = $('#auth-email').value.trim();
  const pass = $('#auth-pass').value;
  authMsg('', '');
  if (authMode !== 'recovery' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { authMsg('Escribe un correo válido.'); return; }
  if (authMode !== 'reset' && pass.length < 6) { authMsg('La contraseña debe tener al menos 6 caracteres.'); return; }
  if (authMode === 'up' && !$('#auth-consent').checked) { authMsg('Para crear la cuenta, marca la casilla de aceptación.'); return; }
  const go = $('#auth-go');
  go.disabled = true;
  const back = location.origin + location.pathname;
  try {
    if (authMode === 'in') {
      const res = await sb.auth.signInWithPassword({ email, password: pass });
      if (res.error) throw res.error;
      if (res.data && res.data.session) startApp(res.data.session.user);
    } else if (authMode === 'up') {
      const res = await sb.auth.signUp({ email, password: pass, options: { emailRedirectTo: back } });
      if (res.error) throw res.error;
      if (res.data && res.data.session) startApp(res.data.session.user);
      else authMsg('', 'Te enviamos un correo para confirmar la cuenta. Confírmala y luego entra con tu correo y contraseña.');
    } else if (authMode === 'reset') {
      const res = await sb.auth.resetPasswordForEmail(email, { redirectTo: back });
      if (res.error) throw res.error;
      authMsg('', 'Si ese correo tiene cuenta, te llegará un enlace para crear una contraseña nueva.');
    } else if (authMode === 'recovery') {
      const res = await sb.auth.updateUser({ password: pass });
      if (res.error) throw res.error;
      authMsg('', 'Contraseña actualizada. Entrando…');
      setTimeout(() => location.replace(back), 900);
    }
  } catch (err) {
    authMsg(authErrText(err));
  } finally {
    go.disabled = false;
  }
}
