'use strict';
function exPerH() { return energyFor(S.viewKey, getDay(S.viewKey)).perH; }
function exResultsHTML(st) {
  const q = norm(st.q || ''), qt = q ? q.split(' ') : [];
  const perH = exPerH();
  const list = EXERCISES.filter(x => !q || matchScore(x.name + ' ' + x.alias, q, qt) >= 0);
  const btn = x => '<button type="button" class="fres" data-act="sh-expick" data-k="' + x.k + '"><span class="fres-n">' + esc(x.name) + '</span><span class="fres-m">' +
    (perH ? '≈ ' + fmtInt(r10((x.met - 1) * perH)) + ' kcal por hora' : 'MET ' + fmtNum(x.met, 1, 1)) + (x.hi ? ' · intenso' : '') + '</span></button>';
  let h = EX_CATS.map((c, i) => { const items = list.filter(x => x.cat === i); return items.length ? '<p class="sh-sec">' + c + '</p><div class="fres-list">' + items.map(btn).join('') + '</div>' : ''; }).join('');
  if (!list.length) h = '<p class="empty">No está en la lista. Agrégalo como «Otro ejercicio».</p>';
  return h + '<p class="sh-sec">¿No está?</p><div class="fres-list"><button type="button" class="fres" id="sh-exother" data-act="sh-exother"><span class="fres-n">Otro ejercicio</span><span class="fres-m">Escribe el nombre y elige la intensidad</span></button></div>';
}
function shExSearchHTML(st) {
  return sheetTop('Agregar ejercicio') +
    '<button type="button" class="gym-cta" id="sh-gym" data-act="gym-open"><span class="gym-cta-t">Entrenamiento de gimnasio</span><span class="gym-cta-s">Ejercicios con series, repeticiones y kilos' + (S.routines.length ? ' · ' + plural(S.routines.length, 'rutina guardada', 'rutinas guardadas') : '') + '</span></button>' +
    '<form data-form="sh-search" role="search" novalidate><label class="lbl sr" for="sh-q">Buscar ejercicio</label><input type="search" id="sh-q" data-sh="q" placeholder="Busca: fútbol, salsa, natación, pesas…" value="' + esc(st.q || '') + '" autocomplete="off" enterkeyhint="search"></form>' +
    '<div id="sh-res">' + exResultsHTML(st) + '</div>';
}
function exPrevText(met, min) {
  const perH = exPerH(), m = parseInt(min, 10);
  if (!perH) return 'Registra tu peso en Progreso para estimar las calorías.';
  if (!(m > 0)) return '≈ ' + fmtInt(r10((met - 1) * perH)) + ' kcal por hora, además de lo que gastas en reposo.';
  return '≈ ' + fmtInt(r10((met - 1) * perH * m / 60)) + ' kcal, además de lo que gastas en reposo.';
}
function shExMinHTML(st) {
  const x = st.ex, cur = parseInt(st.min, 10);
  return sheetTop('Minutos', true) + '<p class="sh-food">' + esc(x.name) + '</p>' +
    '<form class="sh-form" data-form="sh-exmin" novalidate><div class="field"><label class="lbl" for="sh-min">Minutos</label><div class="amt-row">' +
      '<input type="text" inputmode="numeric" id="sh-min" data-sh="min" autocomplete="off" value="' + esc(st.min || '') + '">' +
      [15, 30, 45, 60, 90].map(v => '<button type="button" class="tgl q" id="sh-m-' + v + '" data-act="sh-min" data-v="' + v + '" aria-pressed="' + (cur === v) + '">' + v + '</button>').join('') + '</div></div>' +
    '<p class="hint" id="sh-exprev">' + esc(exPrevText(x.met, st.min)) + '</p>' +
    '<p class="form-err" id="sh-err">' + esc(st.err || '') + '</p><button type="submit" class="btn" id="sh-exadd"' + (S.readonly ? ' disabled' : '') + '>Agregar</button></form>';
}
function shExCustomHTML(st) {
  const lv = st.level || 'moderada';
  return sheetTop('Otro ejercicio', true) +
    '<form class="sh-form" data-form="sh-excustom" novalidate>' +
      '<div class="field"><label class="lbl" for="sh-exname">Nombre</label><input type="text" id="sh-exname" data-sh="exname" maxlength="60" autocomplete="off" value="' + esc(st.exname || '') + '"></div>' +
      '<div class="field"><span class="lbl">Intensidad</span><div class="toggles">' + EX_LEVELS.map(l => '<button type="button" class="tgl" id="sh-lv-' + l.k + '" data-act="sh-level" data-v="' + l.k + '" aria-pressed="' + (lv === l.k) + '">' + l.label + '</button>').join('') + '</div></div>' +
      '<div class="grid2"><div class="field"><label class="lbl" for="sh-min">Minutos</label><input type="text" inputmode="numeric" id="sh-min" data-sh="min" autocomplete="off" value="' + esc(st.min || '') + '"></div>' +
      '<div class="field"><label class="lbl" for="sh-exkcal">Calorías (opcional)</label><input type="text" inputmode="numeric" id="sh-exkcal" data-sh="exkcal" autocomplete="off" placeholder="Las de tu reloj" value="' + esc(st.exkcal || '') + '"></div></div>' +
      '<p class="hint">Si dejas las calorías vacías, Ascend las calcula con la intensidad y los minutos.</p>' +
      '<p class="form-err" id="sh-err">' + esc(st.err || '') + '</p><button type="submit" class="btn" id="sh-exadd"' + (S.readonly ? ' disabled' : '') + '>Agregar</button>' +
    '</form>';
}
function renderSheet() {
  const card = $('#sheet-card');
  if (!card) return;
  const st = S.sheet;
  if (!st) { card.innerHTML = ''; return; }
  let html;
  if (st.kind === 'ex') html = st.step === 'min' ? shExMinHTML(st) : st.step === 'custom' ? shExCustomHTML(st) : shExSearchHTML(st);
  else if (st.kind === 'plan') html = shPlanHTML(st);
  else if (st.kind === 'gym') html = shGymHTML(st);
  else if (st.kind === 'habit') html = shHabitHTML(st);
  else if (st.kind === 'hdetail') html = shHabDetailHTML(st);
  else if (st.kind === 'rem') html = shRemHTML(st);
  else if (st.kind === 'rec') html = shRecHTML(st);
  else html = st.step === 'qty' ? shQtyHTML(st) : st.step === 'custom' ? shCustomHTML(st) : st.step === 'scan' ? shScanHTML(st) : shFoodSearchHTML(st);
  swap(card, html);
}
function refreshRes() {
  const st = S.sheet, r = $('#sh-res');
  if (!st || !r) return;
  r.innerHTML = st.kind === 'ex' ? exResultsHTML(st) : foodResultsHTML(st);
}
const finePointer = () => { try { return window.matchMedia('(pointer: fine)').matches; } catch (e) { return false; } };
function openSheet(st) {
  const a = document.activeElement;
  S.sheetFrom = a && a.id ? a.id : null;
  S.sheet = st;
  S.confirmDel = null;
  renderSheet();
  const el = $('#sheet');
  if (el) el.hidden = false;
  document.documentElement.classList.add('sheet-open');
  for (const s of ['#main', '.bar', '.tabs']) { const n = $(s); if (n) n.inert = true; }
  const card = $('#sheet-card');
  if (card) card.scrollTop = 0;
  afterStep(st.step);
}
function closeSheet() {
  stopScan();
  S.sheet = null;
  const el = $('#sheet');
  if (el) el.hidden = true;
  const card = $('#sheet-card');
  if (card) card.innerHTML = '';
  document.documentElement.classList.remove('sheet-open');
  for (const s of ['#main', '.bar', '.tabs']) { const n = $(s); if (n) n.inert = false; }
  const from = S.sheetFrom ? document.getElementById(S.sheetFrom) : null;
  S.sheetFrom = null;
  if (from) { try { from.focus({ preventScroll: true }); } catch (e) {} }
}
function afterStep(step) {
  const st = S.sheet;
  if (!st) return;
  if (step === 'scan') { startScan(); return; }
  if (step === 'search') { if (finePointer()) focusEl('sh-q'); return; }
  if (step === 'min') { focusEl('sh-min'); return; }
  if (step === 'custom') { focusEl(st.kind === 'ex' ? 'sh-exname' : (st.cf && st.cf.name ? 'cf-kcal' : 'cf-name')); return; }
  if (step === 'rec') focusEl('sh-recname');
}
function goStep(step, extra) {
  const st = S.sheet;
  if (!st) return;
  if (st.step === 'scan' && step !== 'scan') stopScan();
  st.step = step;
  st.err = '';
  if (extra) Object.assign(st, extra);
  renderSheet();
  const card = $('#sheet-card');
  if (card) card.scrollTop = 0;
  afterStep(step);
}
function toQty(st, f) {
  if (S.sheet !== st) return;
  stopScan();
  if (f.src === 'off') { st.offCache = st.offCache || {}; st.offCache[f.id] = f; }
  st.step = 'qty';
  st.food = f;
  st.unit = f.units.length ? 0 : 'g';
  st.amt = f.units.length ? 1 : 100;
  st.err = '';
  renderSheet();
  const card = $('#sheet-card');
  if (card) card.scrollTop = 0;
}
let toastT = 0, offAutoT = 0;
function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { el.hidden = true; }, 2800);
}

/* guardar desde la hoja */
function cacheOff(f) {
  if (!S.loaded.foods || S.foods.some(x => x.id === f.id)) return;
  const data = { name: f.name, brand: f.brand || '', v: f.v, units: f.units, liquid: !!f.liquid, code: f.code || '', src: 'off', missing: f.missing || [], createdAt: Date.now() };
  S.foods.push(Object.assign({ id: f.id }, data));
  putDoc('foods/' + f.id, data);
}
function sheetErr(st, msg) {
  st.err = msg;
  const el = $('#sh-err');
  if (el) el.textContent = msg; else renderSheet();
}
function submitQty() {
  const st = S.sheet;
  if (!st || !st.food || S.readonly) return;
  const f = st.food;
  const a = typeof st.amt === 'number' ? st.amt : parseNum(st.amt);
  const g = gramsOf(st);
  if (!isFinite(a) || a <= 0 || !(g > 0)) { sheetErr(st, 'Escribe una cantidad mayor que 0.'); return; }
  if (g > 5000) { sheetErr(st, 'Esa cantidad es muy grande. Revisa el número.'); return; }
  const u = st.unit === 'g' ? 'g' : f.units[st.unit].u;
  const entry = { id: st.editId || uid(), m: st.meal || 'desayuno', name: String(f.name + (f.brand ? ' · ' + f.brand : '')).slice(0, 120), src: f.src, ref: f.id, amt: r2(a), u, g: r1(g), n: nutriFor(f.v, g), at: Date.now() };
  if (f.liquid) entry.l = 1;
  let full = false;
  const ok = mutDay(S.viewKey, d => {
    const list = Array.isArray(d.food) ? d.food.slice() : [];
    const i = st.editId ? list.findIndex(e => e.id === st.editId) : -1;
    if (i >= 0) { entry.at = list[i].at || entry.at; list[i] = entry; }
    else if (list.length >= MAX_FOOD) { full = true; return; }
    else list.push(entry);
    d.food = list;
  });
  if (!ok) return;
  if (full) { sheetErr(st, 'Llegaste al máximo de alimentos para un día.'); return; }
  if (f.src === 'off') cacheOff(f);
  renderHoy(['food', 'meters', 'act']);
  if (st.editId) { closeSheet(); toast('Cantidad actualizada.'); return; }
  toast('Agregado a ' + mealLabel(entry.m).toLowerCase() + ': ' + f.name + ' (' + fmtInt(g) + ' ' + unitOf(f.liquid) + ').');
  goStep('search', { q: '', food: null, off: null });
}
function saveCustomFood() {
  const st = S.sheet;
  if (!st || !st.cf || S.readonly || !S.loaded.foods) return;
  const cf = st.cf, basis = cf.basis || 'g';
  const name = String(cf.name || '').trim();
  const pgRaw = String(cf.pg == null ? '' : cf.pg).trim();
  const pg = parseNum(pgRaw);
  const vals = {};
  let err = '';
  if (!name) err = 'Escribe el nombre del alimento.';
  for (const x of CF_FIELDS) {
    if (err) break;
    const raw = String(cf[x[0]] == null ? '' : cf[x[0]]).trim();
    if (!raw) { if (x[0] === 'kcal') err = 'Escribe las calorías.'; else vals[x[0]] = 0; continue; }
    const n = parseNum(raw);
    if (!isFinite(n) || n < 0) err = x[1] + ': escribe un número (0 o más).';
    else vals[x[0]] = n;
  }
  if (!err && basis === 'por' && !(pg > 0)) err = 'Escribe el tamaño de la porción.';
  if (!err && pgRaw && !(pg > 0 && pg <= 5000)) err = 'El tamaño de la porción debe estar entre 0 y 5000.';
  const factor = basis === 'por' ? 100 / pg : 1;
  const v = NK.map(k => (k === 'kcal' || k === 'na' ? Math.round((vals[k] || 0) * factor) : r1((vals[k] || 0) * factor)));
  if (!err) {
    if (v[0] > 950) err = 'Revisa las calorías: son demasiadas para 100 ' + (basis === 'ml' ? 'ml' : 'g') + '.';
    else if (v[1] + v[2] + v[5] > 105) err = 'Revisa: proteína, carbohidratos y grasa suman más de 100 g por cada 100 g.';
    else if (v[6] > v[5] + 0.5) err = 'La grasa saturada no puede ser mayor que la grasa total.';
    else if (v[3] > v[2] + 0.5) err = 'Los azúcares no pueden ser más que los carbohidratos.';
  }
  const code = String(cf.code || '').replace(/\D/g, '');
  if (!err && code && (code.length < 8 || code.length > 14)) err = 'El código de barras debe tener entre 8 y 14 números.';
  if (err) { sheetErr(st, err); return; }
  const units = [];
  if (pg > 0) units.push({ u: String(cf.pname || '').trim().slice(0, 40) || 'porción', g: r1(pg) });
  const id = cf.id || uid();
  const prev = S.foods.find(x => x.id === id);
  const data = { name: name.slice(0, 80), brand: String(cf.brand || '').trim().slice(0, 60), v, units, liquid: basis === 'ml', code, src: 'my', createdAt: (prev && prev.createdAt) || Date.now() };
  const i = S.foods.findIndex(x => x.id === id);
  if (i >= 0) S.foods[i] = Object.assign({ id }, data); else S.foods.push(Object.assign({ id }, data));
  putDoc('foods/' + id, data);
  if (st.ctx === 'ajustes') { closeSheet(); renderAjustes(); toast(cf.id ? 'Alimento actualizado.' : 'Alimento creado.'); return; }
  toast('Alimento creado.');
  toQty(st, myFoodObj(Object.assign({ id }, data)));
}
function saveRecipe() {
  const st = S.sheet;
  if (!st || S.readonly || !S.loaded.recipes) return;
  const name = String(st.recname || '').trim();
  if (!name) { sheetErr(st, 'Escribe un nombre.'); return; }
  const items = (st.items || []).map(e => ({ name: e.name, src: e.src, ref: e.ref, amt: e.amt, u: e.u, g: e.g, l: e.l ? 1 : 0, n: e.n }));
  const id = uid();
  const data = { name: name.slice(0, 60), items, createdAt: Date.now() };
  S.recipes.push(Object.assign({ id }, data));
  putDoc('recipes/' + id, data);
  closeSheet();
  toast('Guardada: ' + data.name + '. La encuentras en Agregar.');
}
function submitEx(custom) {
  const st = S.sheet;
  if (!st || S.readonly) return;
  const min = parseInt(String(st.min || '').replace(/\D/g, ''), 10);
  let item;
  if (custom) {
    const name = String(st.exname || '').trim();
    const lv = EX_LEVELS.find(l => l.k === (st.level || 'moderada')) || EX_LEVELS[1];
    const kRaw = String(st.exkcal || '').trim();
    const kc = kRaw ? parseInt(kRaw.replace(/\D/g, ''), 10) : null;
    if (!name) { sheetErr(st, 'Escribe el nombre del ejercicio.'); return; }
    if (!(min > 0 && min <= 600)) { sheetErr(st, 'Escribe los minutos (de 1 a 600).'); return; }
    if (kRaw && !(kc >= 0 && kc <= 5000)) { sheetErr(st, 'Las calorías deben estar entre 0 y 5000.'); return; }
    item = { id: uid(), k: 'otro', name: name.slice(0, 60), met: lv.met, min, hi: lv.hi, at: Date.now() };
    if (kRaw) item.kcal = kc;
  } else {
    const x = st.ex;
    if (!x) return;
    if (!(min > 0 && min <= 600)) { sheetErr(st, 'Escribe los minutos (de 1 a 600).'); return; }
    item = { id: uid(), k: x.k, name: x.name, met: x.met, min, hi: x.hi, at: Date.now() };
  }
  let full = false;
  const ok = mutDay(S.viewKey, d => {
    const l = Array.isArray(d.acts) ? d.acts.slice() : [];
    if (l.length >= MAX_ACTS) { full = true; return; }
    l.push(item);
    d.acts = l;
  });
  if (!ok) return;
  if (full) { sheetErr(st, 'Llegaste al máximo de ejercicios para un día.'); return; }
  closeSheet();
  renderHoy(['act', 'meters']);
  toast('Agregado: ' + item.name + ', ' + min + ' min.');
}
function repeatMeal(meal) {
  const y = S.days[addDays(S.viewKey, -1)];
  const items = (y && Array.isArray(y.food) ? y.food : []).filter(e => e.m === meal);
  if (!items.length) return;
  const now = Date.now();
  if (mutDay(S.viewKey, d => { d.food = (Array.isArray(d.food) ? d.food : []).concat(items.map(e => Object.assign(clone(e), { id: uid(), at: now }))).slice(0, MAX_FOOD); })) {
    renderHoy(['food', 'meters', 'act']);
    toast('Copiado de ayer: ' + items.length + (items.length === 1 ? ' alimento.' : ' alimentos.'));
  }
}
function editEntry(id) {
  if (S.readonly) return;
  const e = (getDay(S.viewKey).food || []).find(x => x.id === id);
  if (!e) return;
  const f = findFood(e.src, e.ref);
  if (!f) { toast('Ese alimento ya no está en tu lista. Quítalo y agrégalo de nuevo si quieres cambiarlo.'); return; }
  let unit = 'g', amt = Number(e.g) || 100;
  if (e.u && e.u !== 'g') { const i = f.units.findIndex(u => u.u === e.u); if (i >= 0) { unit = i; amt = Number(e.amt) || 1; } }
  openSheet({ kind: 'food', step: 'qty', food: f, meal: e.m, editId: e.id, unit, amt, err: '' });
}

/* Open Food Facts: productos empacados y códigos de barras */
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
