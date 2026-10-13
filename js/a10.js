'use strict';
async function runOffSearch() {
  const st = S.sheet;
  if (!st) return;
  const q = String(st.q || '').trim();
  if (q.length < 2) return;
  st.off = { q, status: 'loading', items: [] };
  refreshRes();
  let next;
  try { next = { q, status: 'ok', items: await offSearch(q) }; }
  catch (e) { next = { q, status: 'error', items: [] }; }
  if (S.sheet !== st || !st.off || st.off.q !== q) return;
  st.off = next;
  refreshRes();
}
async function pickOff(code) {
  const st = S.sheet;
  if (!st) return;
  const cached = S.foods.find(x => x.id === 'off-' + code);
  if (cached) { toQty(st, myFoodObj(cached)); return; }
  toast('Cargando el producto…');
  try {
    const r = await offProduct(code);
    if (S.sheet !== st) return;
    if (r.food) { toQty(st, r.food); return; }
    if (r.miss === 'nodata') { toast('Ese producto no tiene tabla nutricional. Créalo con los datos de la etiqueta.'); goStep('custom', { cf: { basis: 'g', code, name: r.name || '' } }); return; }
    toast('No se encontró ese producto.');
  } catch (e) { if (S.sheet === st) toast('No se pudo conectar con Open Food Facts.'); }
}
function setScanOut(msg, offerCreate) {
  const el = $('#sh-scanout');
  if (!el) return;
  el.innerHTML = '<p class="hint">' + esc(msg) + '</p>' + (offerCreate ? '<button type="button" class="btn quiet" id="sh-code-new" data-act="sh-code-new">Crear alimento con este código</button>' : '');
}
async function lookupCode(raw) {
  const st = S.sheet;
  if (!st) return;
  const code = String(raw || '').replace(/\D/g, '');
  st.scan = st.scan || {};
  st.scan.code = code;
  if (!/^\d{8,14}$/.test(code)) { setScanOut('El código debe tener entre 8 y 14 números.'); return; }
  const mine = S.foods.find(x => x.code === code);
  if (mine) { toQty(st, myFoodObj(mine)); return; }
  setScanOut('Buscando el producto…');
  try {
    const r = await offProduct(code);
    if (S.sheet !== st || st.step !== 'scan') return;
    if (r.food) { toQty(st, r.food); return; }
    st.scan.name = r.name || '';
    setScanOut(r.miss === 'nodata' ? 'El producto está en Open Food Facts pero sin tabla nutricional. Créalo con los datos de la etiqueta.' : 'No encontramos ese código. Puedes crear el alimento con los datos de la etiqueta.', true);
  } catch (e) {
    if (S.sheet !== st || st.step !== 'scan') return;
    setScanOut('No se pudo conectar con Open Food Facts. Revisa tu internet o crea el alimento a mano.', true);
  }
}
let scanStream = null, scanTimer = 0, zxReader = null, zxLoading = null, scanToken = 0;
function setScanMsg(msg) {
  if (S.sheet && S.sheet.scan) S.sheet.scan.msg = msg;
  const el = $('#sh-scanmsg');
  if (el) el.textContent = msg;
}
function hideVideo() { const v = $('#sh-video'); if (v) v.hidden = true; }
function loadZXing() {
  if (window.ZXing && window.ZXing.BrowserMultiFormatReader) return Promise.resolve();
  if (zxLoading) return zxLoading;
  zxLoading = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = ZXING_URL;
    s.integrity = ZXING_SRI;
    s.crossOrigin = 'anonymous';
    s.referrerPolicy = 'no-referrer';
    s.async = true;
    s.onload = () => res();
    s.onerror = () => { zxLoading = null; rej(new Error('zxing')); };
    document.head.appendChild(s);
  });
  return zxLoading;
}
async function startScan() {
  const st = S.sheet;
  if (!st || st.step !== 'scan') return;
  const token = ++scanToken;
  const video = $('#sh-video');
  const md = navigator.mediaDevices;
  if (!video || !md || typeof md.getUserMedia !== 'function') { hideVideo(); setScanMsg('Este navegador no deja usar la cámara aquí. Escribe el número del código.'); return; }
  setScanMsg('Abriendo la cámara…');
  const cons = { video: { facingMode: { ideal: 'environment' } }, audio: false };
  try {
    let det = null;
    if ('BarcodeDetector' in window) { try { det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] }); } catch (e) { det = null; } }
    if (det) {
      const stream = await md.getUserMedia(cons);
      if (token !== scanToken) { stream.getTracks().forEach(t => t.stop()); return; }
      scanStream = stream;
      video.srcObject = stream;
      try { await video.play(); } catch (e) {}
      setScanMsg('Apunta al código de barras del empaque.');
      const tick = async () => {
        if (token !== scanToken || !scanStream) return;
        try { const codes = await det.detect(video); const c = codes && codes[0] && codes[0].rawValue; if (c && token === scanToken) { onScanned(c); return; } } catch (e) {}
        if (token === scanToken) scanTimer = setTimeout(tick, 220);
      };
      tick();
      return;
    }
    await loadZXing();
    if (token !== scanToken) return;
    zxReader = new window.ZXing.BrowserMultiFormatReader();
    setScanMsg('Apunta al código de barras del empaque.');
    await zxReader.decodeFromConstraints(cons, video, res => { if (res && token === scanToken) onScanned(res.getText()); });
  } catch (e) {
    if (token !== scanToken) return;
    stopScan();
    hideVideo();
    const n = e && e.name;
    setScanMsg(n === 'NotAllowedError' || n === 'SecurityError' ? 'No hay permiso para usar la cámara. Escribe el número del código.' : 'No se pudo abrir la cámara. Escribe el número del código.');
  }
}
function stopScan() {
  scanToken++;
  clearTimeout(scanTimer);
  if (scanStream) { try { scanStream.getTracks().forEach(t => t.stop()); } catch (e) {} scanStream = null; }
  if (zxReader) { try { zxReader.reset(); } catch (e) {} zxReader = null; }
}
function onScanned(code) {
  stopScan();
  const c = String(code || '').replace(/\D/g, '');
  const inp = $('#sh-code');
  if (inp) inp.value = c;
  setScanMsg('Código leído: ' + c);
  lookupCode(c);
}

/* eventos de lo nuevo */
function extClick(act, el, id) {
  const st = S.sheet;
  switch (act) {
    case 'food-add':
      if (S.readonly || !S.daysLoaded) return;
      openSheet({ kind: 'food', step: 'search', meal: el.dataset.meal || guessMeal(), q: '' });
      return;
    case 'food-repeat': repeatMeal(el.dataset.meal); return;
    case 'rec-new': {
      const items = (getDay(S.viewKey).food || []).filter(e => e.m === el.dataset.meal);
      if (!items.length || S.readonly || !S.loaded.recipes) return;
      openSheet({ kind: 'rec', step: 'rec', items: clone(items), recname: mealLabel(el.dataset.meal) + ' de siempre' });
      return;
    }
    case 'fe-edit': editEntry(id); return;
    case 'fe-del':
      confirmOrDo('fe:' + id, () => { mutDay(S.viewKey, d => { d.food = (d.food || []).filter(e => e.id !== id); }); }, () => renderHoy(['food', 'meters', 'act']));
      return;
    case 'act-add':
      if (S.readonly || !S.daysLoaded) return;
      openSheet({ kind: 'ex', step: 'search', q: '' });
      return;
    case 'act-del':
      confirmOrDo('act:' + id, () => { mutDay(S.viewKey, d => { d.acts = (d.acts || []).filter(a => a.id !== id); }); }, () => renderHoy(['act', 'meters']));
      return;
    case 'sheet-close': closeSheet(); return;
    case 'sh-back':
      if (!st) return;
      if (st.kind === 'plan') { goStep('form'); return; }
      if (st.kind === 'gym') { goStep('gym'); return; }
      if (st.kind === 'habit' || st.kind === 'hdetail' || st.kind === 'rem') { closeSheet(); return; }
      if (st.ctx === 'ajustes' || st.editId || st.kind === 'rec') { closeSheet(); return; }
      goStep('search', { food: null });
      return;
    case 'sh-pick': {
      if (!st) return;
      const f = findFood(el.dataset.src, el.dataset.ref);
      if (f) toQty(st, f);
      return;
    }
    case 'sh-offpick': pickOff(el.dataset.code); return;
    case 'sh-off': runOffSearch(); return;
    case 'sh-scan': goStep('scan', { scan: { msg: '' } }); return;
    case 'sh-new': goStep('custom', { cf: { basis: 'g', name: st && st.q ? String(st.q).trim() : '' } }); return;
    case 'sh-code-new': { const sc = (st && st.scan) || {}; goStep('custom', { cf: { basis: 'g', code: sc.code || '', name: sc.name || '' } }); return; }
    case 'sh-unit': {
      if (!st || !st.food) return;
      const v = el.dataset.v;
      const g = gramsOf(st);
      st.unit = v === 'g' ? 'g' : Number(v);
      st.amt = st.unit === 'g' ? (g > 0 ? Math.round(g) : 100) : 1;
      st.err = '';
      renderSheet();
      return;
    }
    case 'sh-amt': if (st && st.food) { st.amt = Number(el.dataset.v); st.err = ''; renderSheet(); } return;
    case 'cf-basis': if (st && st.cf) { st.cf.basis = el.dataset.v; renderSheet(); } return;
    case 'sh-expick': { const x = EX_BY[el.dataset.k]; if (x) goStep('min', { ex: x, min: '' }); return; }
    case 'sh-exother': goStep('custom', { level: 'moderada', exname: st && st.q ? String(st.q).trim() : '', min: '', exkcal: '' }); return;
    case 'sh-min': if (st) { st.min = String(el.dataset.v); st.err = ''; renderSheet(); } return;
    case 'sh-level': if (st) { st.level = el.dataset.v; renderSheet(); } return;
    case 'prof-sex':
      if (S.readonly || !S.loaded.profile) return;
      S.profile = Object.assign({}, S.profile, { sex: el.dataset.v === 'f' ? 'f' : 'm' });
      saveProfile();
      renderAjustes();
      return;
    case 'food-new':
      if (S.readonly || !S.loaded.foods) return;
      openSheet({ kind: 'food', step: 'custom', ctx: 'ajustes', cf: { basis: 'g' } });
      return;
    case 'myfood-edit': {
      const x = S.foods.find(f => f.id === id);
      if (!x || S.readonly) return;
      const f = myFoodObj(x), u = f.units[0];
      const cf = { id: x.id, name: f.name, brand: f.brand, basis: f.liquid ? 'ml' : 'g', pname: u ? u.u : '', pg: u ? numText(u.g) : '', code: f.code };
      CF_FIELDS.forEach((c, i) => { cf[c[0]] = numText(f.v[i]); });
      openSheet({ kind: 'food', step: 'custom', ctx: 'ajustes', cf });
      return;
    }
    case 'myfood-del':
      confirmOrDo('myf:' + id, () => { S.foods = S.foods.filter(f => f.id !== id); delDoc('foods/' + id); }, renderAjustes);
      return;
    case 'rec-del':
      confirmOrDo('rec:' + id, () => { S.recipes = S.recipes.filter(r => r.id !== id); delDoc('recipes/' + id); }, renderAjustes);
      return;
    default: if (!planClick(act, el, id)) v4Click(act, el, id); return;
  }
}
function extInput(t) {
  if (planInput(t) || v4Input(t)) return true;
  if (t.dataset.sh && S.sheet) {
    const st = S.sheet, k = t.dataset.sh;
    if (k === 'q') {
      st.q = t.value;
      refreshRes();
      clearTimeout(offAutoT);
      const q = String(st.q || '').trim();
      if (st.kind === 'food' && q.length >= 3) offAutoT = setTimeout(() => { if (S.sheet === st && String(st.q || '').trim() === q && !(st.off && st.off.q === q)) runOffSearch(); }, 900);
    }
    else if (k === 'meal') st.meal = t.value;
    else if (k === 'amt') {
      st.amt = t.value;
      const p = $('#sh-prev');
      if (p && st.food) p.innerHTML = prevHTML(st.food, gramsOf(st));
      const cur = parseNum(t.value);
      for (const b of $$('[data-act="sh-amt"]', $('#sheet-card'))) b.setAttribute('aria-pressed', String(Number(b.dataset.v) === cur));
    } else if (k === 'min') {
      st.min = t.value;
      const p = $('#sh-exprev');
      if (p && st.ex) p.textContent = exPrevText(st.ex.met, st.min);
    } else if (k === 'code') { st.scan = st.scan || {}; st.scan.code = t.value; }
    else st[k] = t.value;
    return true;
  }
  if (t.dataset.cf && S.sheet && S.sheet.cf) { S.sheet.cf[t.dataset.cf] = t.value; return true; }
  if (t.id === 'steps-in') {
    const raw = String(t.value || '').replace(/\D/g, '');
    const n = raw ? parseInt(raw, 10) : 0;
    if (n > 200000) return true;
    if (mutDay(S.viewKey, d => { if (n > 0) d.steps = n; else delete d.steps; })) refreshEnergy();
    return true;
  }
  const key = t.dataset.set;
  if (key && (key.indexOf('nutri.') === 0 || key === 'stepGoal')) {
    if (S.readonly || !S.loaded.settings) return true;
    const nk = key === 'stepGoal' ? null : key.slice(6);
    if (nk && NK.indexOf(nk) < 0) return true;
    const raw = String(t.value || '').trim();
    if (!raw) {
      if (nk) { S.settings.nutri = Object.assign({}, S.settings.nutri); delete S.settings.nutri[nk]; }
      else S.settings.stepGoal = null;
      saveSettings();
      return true;
    }
    const intLike = !nk || nk === 'kcal' || nk === 'na';
    const n = intLike ? parseInt(raw.replace(/\D/g, ''), 10) : parseNum(raw);
    const lim = !nk ? [500, 100000] : nk === 'kcal' ? [300, 9000] : nk === 'na' ? [50, 20000] : [0.5, 2000];
    if (!isFinite(n) || n < lim[0] || n > lim[1]) return true;
    if (nk) S.settings.nutri = Object.assign({}, S.settings.nutri, { [nk]: intLike ? n : r1(n) });
    else S.settings.stepGoal = n;
    saveSettings();
    return true;
  }
  return false;
}
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

const HOY_ORDER = ['daynav', 'meters', 'meds', 'water', 'food', 'act', 'boost', 'sleep', 'feel', 'notes'];
const HOY = { daynav: daynavHTML, meters: metersHTML, meds: medsHTML, water: waterHTML, food: foodHTML, act: actHTML, boost: boostHTML, sleep: sleepHTML, feel: feelHTML, notes: notesHTML };
function renderHoy(parts) {
  const root = $('#view-hoy');
  if (!root) return;
  const c = { k: S.viewKey, day: getDay(S.viewKey), isToday: S.viewKey === todayKey() };
  if (!parts || !$('#card-meds', root)) { swap(root, quoteHTML() + HOY_ORDER.map(p => HOY[p](c)).join('')); return; }
  for (const p of parts) { const el = document.getElementById('card-' + p); if (el) replaceEl(el, HOY[p](c)); }
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
