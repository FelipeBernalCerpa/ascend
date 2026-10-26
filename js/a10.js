'use strict';
async function getJSON(url, ms) {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = setTimeout(() => { try { if (ctl) ctl.abort(); } catch (e) {} }, ms || 9000);
  try {
    const res = await fetch(url, ctl ? { signal: ctl.signal } : undefined);
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok && res.status !== 404) throw new Error('HTTP ' + res.status);
    return { status: res.status, data };
  } finally { clearTimeout(t); }
}
function offName(p) {
  const pick = v => (typeof v === 'string' ? v : v && typeof v === 'object' ? (v.es || v.main || v.en || Object.values(v).find(x => typeof x === 'string') || '') : '');
  return String(pick(p.product_name_es) || pick(p.product_name) || '').trim().slice(0, 100);
}
function offBrand(p) {
  const b = p.brands;
  return String(Array.isArray(b) ? (b[0] || '') : String(b || '').split(',')[0]).trim().slice(0, 60);
}
function offToFood(p, code) {
  const nm = p && p.nutriments && typeof p.nutriments === 'object' ? p.nutriments : {};
  const num = k => { const v = nm[k]; if (v === '' || v == null) return null; const n = Number(v); return isFinite(n) && n >= 0 ? n : null; };
  let kcal = num('energy-kcal_100g');
  if (kcal == null) { const kj = num('energy-kj_100g') != null ? num('energy-kj_100g') : num('energy_100g'); if (kj != null) kcal = kj / 4.184; }
  if (kcal == null) return null;
  let na = num('sodium_100g');
  if (na == null) { const salt = num('salt_100g'); if (salt != null) na = salt / 2.5; }
  const raw = [kcal, num('proteins_100g'), num('carbohydrates_100g'), num('sugars_100g'), num('fiber_100g'), num('fat_100g'), num('saturated-fat_100g'), na == null ? null : na * 1000];
  const missing = NK.filter((k, i) => raw[i] == null);
  const v = raw.map((x, i) => (x == null ? 0 : i === 0 || i === 7 ? Math.round(x) : r1(x)));
  const qtyS = String(p.quantity || '');
  const liquid = /\d\s*(ml|cl|l|lt|litros?)\b/i.test(qtyS);
  const units = [];
  const sq = Number(p.serving_quantity);
  if (isFinite(sq) && sq > 0 && sq <= 5000) units.push({ u: 'porción' + (p.serving_size ? ' (' + String(p.serving_size).slice(0, 30) + ')' : ''), g: r1(sq) });
  const pk = /\d\s*[x×]\s*\d/i.test(qtyS) ? null : qtyS.match(/(\d+(?:[.,]\d+)?)\s*(g|gr|ml)\b/i);
  if (pk) { const pg = Number(pk[1].replace(',', '.')); if (pg > 0 && pg <= 5000 && !units.some(u => Math.abs(u.g - pg) < 0.5)) units.push({ u: 'empaque completo', g: pg }); }
  return { src: 'off', id: 'off-' + code, code, name: offName(p) || 'Producto ' + code, brand: offBrand(p), v, units, liquid, approx: false, missing };
}
async function offProduct(code) {
  const r = await getJSON('https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(code) + '.json?fields=' + OFF_FIELDS, 10000);
  const d = r.data;
  if (r.status === 404 || !d || Number(d.status) !== 1 || !d.product) return { miss: 'notfound' };
  const f = offToFood(d.product, code);
  if (!f) return { miss: 'nodata', name: offName(d.product) };
  return { food: f };
}
const luceneSafe = q => String(q).replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, ' ').replace(/\s+/g, ' ').trim();
async function offSearch(q) {
  const base = 'https://search.openfoodfacts.org/search?langs=es,en&page_size=20&fields=code,product_name,brands,quantity,nutriments&q=';
  const clean = luceneSafe(q);
  const hitsOf = r => (r && r.data && Array.isArray(r.data.hits) ? r.data.hits : []);
  let hits = [], fails = 0;
  try { hits = hitsOf(await getJSON(base + encodeURIComponent(clean + ' countries_tags:"en:colombia"'), 9000)); } catch (e) { fails++; }
  if (hits.length < 6) {
    try {
      const seen = new Set(hits.map(h => String(h.code)));
      for (const h of hitsOf(await getJSON(base + encodeURIComponent(clean), 9000))) if (!seen.has(String(h.code))) hits.push(h);
    } catch (e) { fails++; }
  }
  if (!hits.length && fails === 2) throw new Error('off');
  return hits.filter(h => h && /^\d{6,14}$/.test(String(h.code || ''))).slice(0, 20).map(h => {
    const k = Number(h.nutriments && h.nutriments['energy-kcal_100g']);
    return { code: String(h.code), name: offName(h) || 'Producto ' + h.code, brand: offBrand(h), qty: String(h.quantity || '').slice(0, 30), kcal: isFinite(k) && k >= 0 ? k : null };
  });
}
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
      if (st.kind === 'boss') { if (st.step === 'edit' && st.id) { st.step = 'view'; renderSheet(); } else closeSheet(); return; }
      if (st.kind === 'reto') { closeSheet(); return; }
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
