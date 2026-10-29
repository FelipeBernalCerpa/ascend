'use strict';
function gramsOf(st) {
  const f = st.food;
  const a = typeof st.amt === 'number' ? st.amt : parseNum(st.amt);
  if (!f || !isFinite(a)) return 0;
  if (st.unit === 'g') return a;
  const u = f.units[st.unit];
  return u ? a * u.g : 0;
}
function prevHTML(f, g) {
  const n = nutriFor(f.v, g);
  return '<div class="prev"><p class="sh-sec">Para ' + fmtInt(g) + ' ' + unitOf(f.liquid) + '</p><div class="prev-g">' +
    NUTRIENTS.map(x => '<span class="pv"><span>' + x.label + '</span><b>' + fmtNut(x.k, n[x.k]) + ' ' + x.unit + '</b></span>').join('') + '</div></div>';
}
function shQtyHTML(st) {
  const f = st.food, lu = unitOf(f.liquid);
  const miss = (f.missing || []).map(k => (NUTRIENTS.find(n => n.k === k) || {}).label).filter(Boolean);
  const unitBtns = f.units.map((u, i) => '<button type="button" class="tgl" id="sh-u-' + i + '" data-act="sh-unit" data-v="' + i + '" aria-pressed="' + (st.unit === i) + '">' + esc(u.u) + '<small>' + fmtNum(u.g, 1) + ' ' + lu + '</small></button>').join('') +
    '<button type="button" class="tgl" id="sh-u-g" data-act="sh-unit" data-v="g" aria-pressed="' + (st.unit === 'g') + '">' + (f.liquid ? 'Mililitros' : 'Gramos') + '<small>' + lu + '</small></button>';
  const quick = st.unit === 'g' ? [50, 100, 150, 200] : [0.5, 1, 1.5, 2];
  const ql = v => (v === 0.5 ? '½' : v === 1.5 ? '1½' : String(v));
  const cur = typeof st.amt === 'number' ? st.amt : parseNum(st.amt);
  const items = f.src === 'rec' && f.items ? '<p class="hint">Incluye: ' + f.items.map(it => esc(it.name) + ' (' + fmtInt(it.g) + ' ' + unitOf(it.l) + ')').join(', ') + '.</p>' : '';
  return sheetTop(st.editId ? 'Cambiar cantidad' : 'Cantidad', !st.editId) +
    '<div><p class="sh-food">' + esc(f.name) + (f.brand ? ' <small>' + esc(f.brand) + '</small>' : '') + '</p>' +
      '<p class="hint">Por 100 ' + lu + ': ' + fmtInt(f.v[0]) + ' kcal · proteína ' + fmtNut('p', f.v[1]) + ' g · carbohidratos ' + fmtNut('c', f.v[2]) + ' g · grasas ' + fmtNut('f', f.v[5]) + ' g.' +
      (f.approx ? ' Valores aproximados: cambian según la receta.' : '') + (miss.length ? ' Sin dato de: ' + esc(miss.join(', ').toLowerCase()) + '.' : '') + '</p>' + items + '</div>' +
    '<form class="sh-form" data-form="sh-qty" novalidate>' +
      '<div class="field"><span class="lbl">Porción</span><div class="toggles">' + unitBtns + '</div></div>' +
      '<div class="field"><label class="lbl" for="sh-amt">' + (st.unit === 'g' ? (f.liquid ? 'Mililitros' : 'Gramos') : 'Cuántas porciones') + '</label>' +
        '<div class="amt-row"><input type="text" inputmode="decimal" id="sh-amt" data-sh="amt" autocomplete="off" value="' + esc(amtText(st.amt)) + '">' +
        quick.map(v => '<button type="button" class="tgl q" id="sh-q-' + String(v).replace('.', '_') + '" data-act="sh-amt" data-v="' + v + '" aria-pressed="' + (cur === v) + '">' + ql(v) + '</button>').join('') + '</div></div>' +
      '<div id="sh-prev">' + prevHTML(f, gramsOf(st)) + '</div>' +
      '<div class="field"><label class="lbl" for="sh-meal">Comida</label><select id="sh-meal" data-sh="meal">' + mealOptions(st.meal) + '</select></div>' +
      '<p class="form-err" id="sh-err">' + esc(st.err || '') + '</p>' +
      '<button type="submit" class="btn" id="sh-add"' + (S.readonly ? ' disabled' : '') + '>' + (st.editId ? 'Guardar cambios' : 'Agregar') + '</button>' +
    '</form>';
}
const CF_FIELDS = [['kcal', 'Calorías', 'kcal'], ['p', 'Proteína', 'g'], ['c', 'Carbohidratos', 'g'], ['s', 'Azúcares', 'g'], ['fi', 'Fibra', 'g'], ['f', 'Grasa total', 'g'], ['sf', 'Grasa saturada', 'g'], ['na', 'Sodio', 'mg']];
function shCustomHTML(st) {
  const cf = st.cf || {}, basis = cf.basis || 'g';
  const bBtn = (k, label) => '<button type="button" class="tgl" id="cf-b-' + k + '" data-act="cf-basis" data-v="' + k + '" aria-pressed="' + (basis === k) + '">' + label + '</button>';
  const pu = basis === 'ml' ? 'ml' : 'g';
  return sheetTop(cf.id ? 'Editar alimento' : 'Crear alimento', true) +
    '<form class="sh-form" data-form="sh-custom" novalidate>' +
      '<div class="field"><label class="lbl" for="cf-name">Nombre</label><input type="text" id="cf-name" data-cf="name" maxlength="80" autocomplete="off" value="' + esc(cf.name || '') + '"></div>' +
      '<div class="field"><label class="lbl" for="cf-brand">Marca (opcional)</label><input type="text" id="cf-brand" data-cf="brand" maxlength="60" autocomplete="off" value="' + esc(cf.brand || '') + '"></div>' +
      '<div class="field"><span class="lbl">La tabla nutricional está por</span><div class="toggles">' + bBtn('g', '100 g') + bBtn('ml', '100 ml') + bBtn('por', '1 porción') + '</div></div>' +
      '<div class="grid2">' +
        '<div class="field"><label class="lbl" for="cf-pname">Nombre de la porción</label><input type="text" id="cf-pname" data-cf="pname" maxlength="40" autocomplete="off" placeholder="paquete, unidad…" value="' + esc(cf.pname || '') + '"></div>' +
        '<div class="field"><label class="lbl" for="cf-pg">Tamaño de la porción (' + pu + ')' + (basis === 'por' ? '' : ', opcional') + '</label><input type="text" inputmode="decimal" id="cf-pg" data-cf="pg" autocomplete="off" value="' + esc(cf.pg || '') + '"></div>' +
      '</div>' +
      '<p class="sh-sec">Valores ' + (basis === 'por' ? 'por porción' : 'por 100 ' + pu) + '</p>' +
      '<div class="grid2">' + CF_FIELDS.map(x => '<div class="field"><label class="lbl" for="cf-' + x[0] + '">' + x[1] + ' (' + x[2] + ')</label><input type="text" inputmode="decimal" id="cf-' + x[0] + '" data-cf="' + x[0] + '" autocomplete="off" value="' + esc(cf[x[0]] == null ? '' : cf[x[0]]) + '"></div>').join('') + '</div>' +
      '<div class="field"><label class="lbl" for="cf-code">Código de barras (opcional)</label><input type="text" inputmode="numeric" id="cf-code" data-cf="code" maxlength="14" autocomplete="off" value="' + esc(cf.code || '') + '"></div>' +
      '<p class="form-err" id="sh-err">' + esc(st.err || '') + '</p>' +
      '<button type="submit" class="btn" id="cf-save"' + (S.readonly || !S.loaded.foods ? ' disabled' : '') + '>Guardar alimento</button>' +
    '</form>';
}
function shScanHTML(st) {
  const sc = st.scan || {};
  return sheetTop('Código de barras', true) +
    '<video id="sh-video" class="scan-v" playsinline muted autoplay></video>' +
    '<p class="hint" id="sh-scanmsg">' + esc(sc.msg || '') + '</p>' +
    '<form class="sh-form" data-form="sh-code" novalidate><div class="field"><label class="lbl" for="sh-code">O escribe el número que está debajo de las barras</label>' +
      '<div class="add-row"><input type="text" inputmode="numeric" id="sh-code" data-sh="code" maxlength="14" autocomplete="off" value="' + esc(sc.code || '') + '"><button type="submit" class="btn" id="sh-codego">Buscar</button></div></div></form>' +
    '<div id="sh-scanout"></div>';
}
function shRecHTML(st) {
  const items = st.items || [];
  return sheetTop('Comida frecuente') +
    '<p class="prose">Guarda estos alimentos juntos para agregarlos con un toque otro día.</p>' +
    '<ul class="rec-items">' + items.map(e => '<li>' + esc(e.name) + ' <small>' + esc(qtyText(e.amt, e.u, e.g, e.l)) + '</small></li>').join('') + '</ul>' +
    '<form class="sh-form" data-form="sh-rec" novalidate><div class="field"><label class="lbl" for="sh-recname">Nombre</label><input type="text" id="sh-recname" data-sh="recname" maxlength="60" autocomplete="off" value="' + esc(st.recname || '') + '"></div>' +
    '<p class="form-err" id="sh-err">' + esc(st.err || '') + '</p><button type="submit" class="btn" id="sh-recsave"' + (S.readonly || !S.loaded.recipes ? ' disabled' : '') + '>Guardar</button></form>';
}
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
  else if (st.kind === 'boss') html = shBossHTML(st);
  else if (st.kind === 'reto') html = shRetoHTML(st);
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
