'use strict';
function boostHTML(c) {
  const b = c.day.boost || {};
  const list = habs().filter(h => habDueOn(h, c.k) || b[h.k]);
  const n = list.filter(x => b[x.k]).length;
  return '<section id="card-boost" class="card"><div class="card-h"><h2>Hábitos del día</h2>' + (list.length ? '<span class="meta">' + n + ' de ' + list.length + '</span>' : '') + '</div>' +
    (list.length ? '<div class="chips">' + list.map(x => '<button type="button" class="chip" id="b-' + esc(x.k) + '" data-act="boost" data-k="' + esc(x.k) + '" aria-pressed="' + !!b[x.k] + '"' + ro() + '><span class="tick"></span><span>' + esc(x.label) +
        (habFlex(x) ? '<small class="chip-s">' + esc(habProgText(x, c.k)) + '</small>' : '') + '</span></button>').join('') + '</div>' +
      '<p class="hint">Marca lo que cumpliste. <button type="button" class="link inline" id="boost-go" data-go="habitos">Editar mis hábitos</button></p>'
      : '<p class="empty">Hoy no tienes hábitos pendientes. <button type="button" class="link inline" id="boost-go" data-go="habitos">Ir a Hábitos</button></p>') + '</section>';
}
function sleepHTML(c) {
  const s = c.day.sleep || {}, h = sleepHours(s), goal = Number(S.settings.sleepGoal) || 8.5;
  let out = '<p class="hint">Anota a qué hora te dormiste anoche y a qué hora te levantaste.</p>';
  if (h != null) {
    const tone = h >= goal ? 'ok' : h >= goal - 1 ? 'warn' : 'crit';
    const txt = h >= goal ? 'Meta cumplida' : h >= goal - 1 ? 'Cerca de la meta' : 'Por debajo de la meta';
    const late = bedDelay(s.bed);
    out = '<div class="sleep-out"><span class="big">' + fmtNum(h, 1) + '</span><span class="unit">horas</span><span class="pill ' + tone + '">' + txt + '</span></div>' +
      (late > 30 ? '<p class="hint">Te dormiste ' + fmtDelay(late) + ' después de la meta de las ' + fmtHM(S.settings.bedTarget) + '.</p>' : '');
  }
  const dis = S.readonly || !S.daysLoaded ? ' disabled' : '';
  return '<section id="card-sleep" class="card"><div class="card-h"><h2>Sueño de anoche</h2><span class="meta">Meta ' + fmtNum(goal, 1) + ' h</span></div>' +
    '<div class="grid2">' +
      '<div class="field"><label class="lbl" for="sleep-bed">Me dormí</label><input type="time" id="sleep-bed" data-sleep="bed" value="' + esc(s.bed || '') + '"' + dis + '></div>' +
      '<div class="field"><label class="lbl" for="sleep-wake">Me levanté</label><input type="time" id="sleep-wake" data-sleep="wake" value="' + esc(s.wake || '') + '"' + dis + '></div>' +
    '</div>' + out +
    (!s.bed && !s.wake ? '<button type="button" class="btn sm ghost" id="sleep-fill" data-act="sleep-fill"' + dis + '>Usar la meta: ' + fmtHM(S.settings.bedTarget) + ' a ' + fmtHM(S.settings.wakeTarget) + '</button>' : '') +
  '</section>';
}
function feelHTML(c) {
  const seg = (f, label) => {
    const v = c.day[f];
    return '<div class="field"><span class="lbl">' + label + '</span><div class="seg" role="group" aria-label="' + label + '">' +
      [1, 2, 3, 4, 5].map(n => '<button type="button" id="f-' + f + '-' + n + '" data-act="feel" data-f="' + f + '" data-v="' + n + '" aria-pressed="' + (v === n) + '"' + ro() + '>' + n + '</button>').join('') +
      '</div></div>';
  };
  return '<section id="card-feel" class="card"><div class="card-h"><h2>Cómo estás</h2><span class="meta">1 bajo · 5 alto</span></div><div class="feel">' + seg('energy', 'Energía') + seg('mood', 'Ánimo') + '</div></section>';
}
function notesHTML(c) {
  return '<section id="card-notes" class="card"><div class="card-h"><h2>Notas del día</h2></div><label class="lbl sr" for="day-notes">Notas del día</label>' +
    '<textarea id="day-notes" rows="3" placeholder="Síntomas, cómo te sentiste, qué preguntar en la próxima cita"' + roText() + '>' + esc(c.day.notes || '') + '</textarea></section>';
}
/* ---------- nutrición y actividad: cálculos ---------- */
const FOOD_BY = Object.fromEntries(FOODS.map(f => [f.id, f]));
const EX_BY = Object.fromEntries(EXERCISES.map(x => [x.k, x]));
const LEGACY_MEALS = Object.fromEntries(MEALS.map(m => [m.k, m.label]));
const OFF_FIELDS = 'code,product_name,product_name_es,brands,quantity,serving_quantity,serving_size,nutriments';
const ZXING_URL = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.23.0/umd/index.min.js';
const ZXING_SRI = 'sha384-0ASr5PEWAMtTnWsn0PzKmioHVDA4+QqFiJr94io/0DCrGP6E1gRAmbO6O8y5WZW9';
const MAX_FOOD = 200, MAX_ACTS = 40;
const SCHOFIELD = {
  m: [[3, 59.512, -30.4], [10, 22.706, 504.3], [18, 17.686, 658.2], [30, 15.057, 692.2], [60, 11.472, 873.1], [200, 11.711, 587.7]],
  f: [[3, 58.317, -31.1], [10, 20.315, 485.9], [18, 13.384, 692.6], [30, 14.818, 486.6], [60, 8.126, 845.6], [200, 9.082, 658.5]]
};

const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const r1 = x => Math.round((Number(x) || 0) * 10) / 10;
const r2 = x => Math.round((Number(x) || 0) * 100) / 100;
const r10 = x => Math.round((Number(x) || 0) / 10) * 10;
const unitOf = liquid => (liquid ? 'ml' : 'g');
const numText = v => (v == null || v === '' ? '' : String(v).replace('.', ','));
const amtText = a => (typeof a === 'number' ? String(r2(a)).replace('.', ',') : String(a == null ? '' : a));
const fmtK = v => (v >= 1000 ? fmtNum(v / 1000, 1) + 'k' : fmtInt(v));
function fmtNut(k, v) {
  v = Number(v) || 0;
  if (k === 'kcal' || k === 'na') return fmtInt(v);
  return fmtNum(v, Math.abs(v) < 10 ? 1 : 0);
}
function nutriFor(v, g) {
  const o = {};
  NK.forEach((k, i) => {
    const x = (Number(v && v[i]) || 0) * (Number(g) || 0) / 100;
    o[k] = k === 'kcal' || k === 'na' ? Math.round(x) : r1(x);
  });
  return o;
}
function sumN(list) {
  const t = {};
  for (const k of NK) t[k] = 0;
  for (const n of list) if (n) for (const k of NK) t[k] += Number(n[k]) || 0;
  return t;
}
function dayNutri(d) {
  const list = d && Array.isArray(d.food) ? d.food : [];
  const t = sumN(list.map(e => e && e.n));
  t.count = list.length;
  return t;
}
function mealLabel(k) { const m = FOOD_MEALS.find(x => x.k === k); return m ? m.label : 'Otros'; }
function guessMeal() {
  const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
  return h < 9.5 ? 'desayuno' : h < 11.5 ? 'media' : h < 15 ? 'almuerzo' : h < 18.5 ? 'onces' : h < 21 ? 'cena' : 'noche';
}
function qtyText(amt, u, g, liquid) {
  const gt = fmtInt(g) + ' ' + unitOf(liquid);
  if (!u || u === 'g') return gt;
  const a = Number(amt) || 0;
  const lead = a === 1 ? (/^[½¼¾\d]/.test(u) ? '' : '1 ') : amtText(a) + ' × ';
  return lead + u + ' · ' + gt;
}
function dayIntense(d) {
  return !!d && ((((d.ex && d.ex.types) || []).indexOf('intenso') >= 0) || (Array.isArray(d.acts) && d.acts.some(a => a && a.hi)));
}
function dayHasEx(d) {
  return !!d && ((((d.ex && d.ex.types) || []).some(t => t !== 'descanso')) || (Array.isArray(d.acts) && d.acts.length > 0));
}

/* alimentos: de la lista de Ascend, propios, de Open Food Facts o comidas frecuentes */
function myFoodObj(x) {
  const v = NK.map((k, i) => Number(Array.isArray(x.v) ? x.v[i] : 0) || 0);
  const units = (Array.isArray(x.units) ? x.units : []).filter(u => u && u.u && Number(u.g) > 0).map(u => ({ u: String(u.u), g: Number(u.g) }));
  return { src: x.src === 'off' ? 'off' : 'my', id: x.id, name: x.name || 'Alimento', brand: x.brand || '', v, units, liquid: !!x.liquid, approx: false, code: x.code || '', missing: Array.isArray(x.missing) ? x.missing : [] };
}
function recipeFood(id) {
  const b = BUILTIN_RECIPES.find(x => x.id === id);
  let name, items;
  if (b) {
    name = b.name;
    items = b.items.filter(it => FOOD_BY[it[0]]).map(it => { const f = FOOD_BY[it[0]]; return { name: f.name, g: it[1], l: f.liquid ? 1 : 0, n: nutriFor(f.v, it[1]) }; });
  } else {
    const r = S.recipes.find(x => x.id === id);
    if (!r) return null;
    name = r.name || 'Comida frecuente';
    items = Array.isArray(r.items) ? r.items : [];
  }
  const tg = items.reduce((s, it) => s + (Number(it.g) || 0), 0);
  if (!(tg > 0)) return null;
  const tot = sumN(items.map(it => it.n));
  return { src: 'rec', id, name, brand: '', v: NK.map(k => tot[k] / tg * 100), units: [{ u: 'porción', g: tg }], liquid: false, approx: false, items, builtin: !!b, missing: [] };
}
function allRecipes() {
  return BUILTIN_RECIPES.map(b => recipeFood(b.id)).concat(S.recipes.slice().sort(byCreated).map(r => recipeFood(r.id))).filter(Boolean);
}
function findFood(src, ref) {
  if (src === 'db') return FOOD_BY[ref] || null;
  if (src === 'rec') return recipeFood(ref);
  if (src === 'my' || src === 'off') {
    const x = S.foods.find(f => f.id === ref);
    if (x) return myFoodObj(x);
    const st = S.sheet;
    if (st && st.offCache && st.offCache[ref]) return st.offCache[ref];
  }
  return null;
}
function tokVariants(t) {
  const out = [t];
  if (t.length > 4 && /es$/.test(t)) out.push(t.slice(0, -2));
  if (t.length > 3 && /s$/.test(t)) out.push(t.slice(0, -1));
  return out;
}
function matchScore(text, q, qt) {
  const hay = norm(text);
  if (!hay) return -1;
  if (hay.indexOf(q) === 0) return 0;
  const words = hay.split(' ');
  if (qt.every(t => tokVariants(t).some(v => words.some(w => w.indexOf(v) === 0)))) return 1;
  if (hay.indexOf(q) >= 0) return 2;
  return -1;
}
function searchFoods(qRaw) {
  const q = norm(qRaw);
  if (!q) return [];
  const qt = q.split(' ');
  const pool = allRecipes().concat(S.foods.map(myFoodObj), FOODS);
  const out = [];
  for (const f of pool) {
    const s = matchScore(f.name + ' ' + (f.brand || '') + ' ' + (f.alias || '') + (f.code ? ' ' + f.code : ''), q, qt);
    if (s >= 0) out.push([s, f.src === 'db' ? 1 : 0, f.name.length, f]);
  }
  out.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  return out.map(x => x[3]);
}
function recentFoods() {
  const seen = new Set(), out = [];
  const tk = todayKey();
  for (let i = 0; i < 21 && out.length < 10; i++) {
    const d = S.days[addDays(tk, -i)];
    if (!d || !Array.isArray(d.food)) continue;
    for (let j = d.food.length - 1; j >= 0 && out.length < 10; j--) {
      const e = d.food[j];
      const key = e.src + ':' + e.ref;
      if (seen.has(key)) continue;
      seen.add(key);
      const f = findFood(e.src, e.ref);
      if (f) out.push(f);
    }
  }
  return out;
}

/* energía: gasto en reposo (Schofield, FAO/OMS) + digestión y vida diaria + pasos + ejercicio */
function latestOn(field, k) {
  const list = S.measures.filter(m => hasNum(m[field])).sort(byDate);
  let v = null;
  for (const m of list) { if (m.date <= k) v = m; else break; }
  if (!v && list.length) v = list[0];
  return v ? Number(v[field]) : null;
}
function ageOn(birth, k) {
  if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
  const b = parseKey(birth), d = parseKey(k);
  let a = d.getFullYear() - b.getFullYear();
  if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) a--;
  return a >= 0 && a < 120 ? a : null;
}
function bmrOf(sex, age, w) {
  const t = SCHOFIELD[sex];
  if (!t || age == null || !(w > 0)) return null;
  const r = t.find(x => age < x[0]) || t[t.length - 1];
  const v = r[1] * w + r[2];
  return v > 0 ? v : null;
}
function actKcal(a, perH) {
  if (a && hasNum(a.kcal)) return Number(a.kcal);
  if (!perH || !a) return null;
  return Math.max(0, (Number(a.met) || 0) - 1) * perH * (Number(a.min) || 0) / 60;
}
function energyFor(k, d) {
  d = d || {};
  const p = S.profile || {};
  const w = latestOn('weight', k), h = latestOn('height', k), age = ageOn(p.birth, k);
  const profileOk = (p.sex === 'm' || p.sex === 'f') && age != null;
  const bmr = profileOk ? bmrOf(p.sex, age, w) : null;
  const perH = bmr ? bmr / 24 : (w || null);
  const steps = Math.max(0, Math.min(200000, Number(d.steps) || 0));
  const km = steps ? steps * (h ? h * 0.415 / 100 : 0.7) / 1000 : 0;
  const stepsKcal = steps ? (perH ? km * 0.5 * perH : null) : 0;
  let exKcal = 0, exUnknown = false;
  for (const a of (Array.isArray(d.acts) ? d.acts : [])) { const kc = actKcal(a, perH); if (kc == null) exUnknown = true; else exKcal += kc; }
  const life = bmr ? bmr * 0.3 : null;
  const total = bmr && stepsKcal != null && !exUnknown ? bmr + life + stepsKcal + exKcal : null;
  return { w, h, age, profileOk, bmr, life, perH, steps, km, stepsKcal, exKcal, exUnknown, total };
}
function hoyCtx() { return { k: S.viewKey, day: getDay(S.viewKey), isToday: S.viewKey === todayKey() }; }

/* ---------- HOY: comida ---------- */
function nutriGridHTML(nu) {
  const goals = (S.settings && S.settings.nutri) || {};
  return '<div class="nutri" role="group" aria-label="Nutrientes del día">' + NUTRIENTS.map(n => {
    const v = nu[n.k] || 0, g = Number(goals[n.k]) || 0, kind = goalKind(n.k);
    let cls = '', extra = '';
    if (g > 0) {
      if (kind === 'max' && v > g) cls = ' over';
      else if ((kind === 'min' || kind === 'meta') && v >= (kind === 'meta' ? g * 0.9 : g)) cls = ' done';
      const word = kind === 'max' ? 'Máx.' : kind === 'min' ? 'Mín.' : 'Meta';
      extra = '<span class="nut-g">' + word + ' ' + fmtNut(n.k, g) + ' ' + n.unit + (cls === ' over' ? ' · te pasaste' : '') + '</span>' +
        '<span class="m-bar"><i style="width:' + Math.round(Math.min(1, v / g) * 100) + '%"></i></span>';
    }
    return '<div class="nut' + cls + '"><span class="nut-l">' + n.label + '</span><span class="nut-v">' + fmtNut(n.k, v) + '<small> ' + n.unit + '</small></span>' + extra + '</div>';
  }).join('') + '</div>';
}
function feHTML(e) {
  const tag = 'fe:' + e.id, armed = S.confirmDel === tag;
  const n = e.n || {};
  return '<div class="fe"><button type="button" class="fe-main" id="fe-' + esc(e.id) + '" data-act="fe-edit" data-id="' + esc(e.id) + '"' + ro() + '>' +
    '<span class="fe-n">' + esc(e.name || 'Alimento') + '</span><span class="fe-s">' + esc(qtyText(e.amt, e.u, e.g, e.l)) + ' · ' + fmtInt(n.kcal) + ' kcal · proteína ' + fmtNut('p', n.p) + ' g</span></button>' +
    '<button type="button" class="xbtn' + (armed ? ' armed' : '') + '" id="fx-' + esc(e.id) + '" data-act="fe-del" data-id="' + esc(e.id) + '"' + ro() + '>' + (armed ? '¿Quitar?' : 'Quitar') + '</button></div>';
}
function foodHTML(c) {
  const nu = dayNutri(c.day);
  const head = '<div class="card-h"><h2>Comida</h2><span class="meta">' + (nu.count ? fmtInt(nu.kcal) + ' kcal' : 'Sin registros') + '</span></div>';
  if (!S.daysLoaded) return '<section id="card-food" class="card">' + head + '<p class="empty">Cargando…</p></section>';
  const dis = S.readonly ? ' disabled' : '';
  const list = Array.isArray(c.day.food) ? c.day.food : [];
  const y = S.days[addDays(c.k, -1)];
  const yl = y && Array.isArray(y.food) ? y.food : [];
  const known = new Set(FOOD_MEALS.map(m => m.k));
  const groups = FOOD_MEALS.map(m => ({ k: m.k, label: m.label, items: list.filter(e => e.m === m.k) }));
  const other = list.filter(e => !known.has(e.m));
  if (other.length) groups.push({ k: '_otros', label: 'Otros', items: other });
  const meals = groups.map(g => {
    const kc = g.items.reduce((s, e) => s + (Number(e.n && e.n.kcal) || 0), 0);
    const real = g.k !== '_otros';
    const canRep = real && !g.items.length && yl.some(e => e.m === g.k);
    const canSave = real && g.items.length >= 2;
    return '<div class="fmeal"><div class="fmeal-h"><span class="fmeal-n">' + esc(g.label) + '</span>' +
      (g.items.length ? '<span class="fmeal-k">' + fmtInt(kc) + ' kcal</span>' : '') +
      (real ? '<button type="button" class="btn sm ghost" id="fa-' + g.k + '" data-act="food-add" data-meal="' + g.k + '"' + dis + '>Agregar</button>' : '') + '</div>' +
      g.items.map(feHTML).join('') +
      (canRep || canSave ? '<div class="fmeal-x">' +
        (canRep ? '<button type="button" class="link inline" id="fr-' + g.k + '" data-act="food-repeat" data-meal="' + g.k + '"' + dis + '>Repetir lo de ayer</button>' : '') +
        (canSave ? '<button type="button" class="link inline" id="fs-' + g.k + '" data-act="rec-new" data-meal="' + g.k + '"' + dis + '>Guardar como comida frecuente</button>' : '') +
      '</div>' : '') +
    '</div>';
  }).join('');
  const lm = c.day.meals && typeof c.day.meals === 'object' ? Object.keys(c.day.meals).filter(k => String(c.day.meals[k] || '').trim()) : [];
  const legacy = lm.length ? '<details class="hist"><summary>Notas de comidas (' + lm.length + ')</summary>' +
    lm.map(k => '<p class="prose"><strong>' + esc(LEGACY_MEALS[k] || k) + ':</strong> ' + esc(c.day.meals[k]) + '</p>').join('') + '</details>' : '';
  return '<section id="card-food" class="card">' + head + nutriGridHTML(nu) + '<div class="fmeals">' + meals + '</div>' + legacy +
    '<p class="hint">Toca un alimento para cambiar la cantidad. Los valores son aproximados; en carnes, pescados y verduras no incluyen la sal que se agrega al cocinar (agrégala como «Sal»).</p></section>';
}

/* ---------- HOY: actividad y energía ---------- */
function stepsOutHTML(en) {
  if (!en.steps) return 'Copia los pasos que marca tu celular o tu reloj.';
  return '≈ ' + fmtNum(en.km, 1, 1) + ' km' + (en.stepsKcal != null ? ' · ' + fmtInt(r10(en.stepsKcal)) + ' kcal' : '');
}
function actRowHTML(a, perH) {
  const tag = 'act:' + a.id, armed = S.confirmDel === tag;
  const kc = actKcal(a, perH);
  const gym = a.k === 'gym' && Array.isArray(a.ex);
  const vol = gym ? gymVolume(a) : null;
  const sub = [fmtInt(a.min) + ' min', kc != null ? fmtInt(r10(kc)) + ' kcal' : '', gym && a.ex.length ? plural(a.ex.length, 'ejercicio', 'ejercicios') : '', gym && vol.kg ? fmtInt(vol.kg) + ' kg' : '', a.hi ? 'intenso' : ''].filter(Boolean).join(' · ');
  const main = gym ? '<button type="button" class="fe-main" id="ae-' + esc(a.id) + '" data-act="gym-edit" data-id="' + esc(a.id) + '"' + ro() + '>' : '<div class="fe-main static">';
  return '<div class="fe">' + main + '<span class="fe-n">' + esc(a.name || 'Ejercicio') + '</span><span class="fe-s">' + sub + '</span>' +
    (gym && a.ex.length ? '<span class="gx-sum">' + a.ex.map(x => '<span>' + esc(x.n) + ': ' + esc(setsText(x.sets)) + '</span>').join('') + '</span>' : '') +
    (gym ? '</button>' : '</div>') +
    '<button type="button" class="xbtn' + (armed ? ' armed' : '') + '" id="ax-' + esc(a.id) + '" data-act="act-del" data-id="' + esc(a.id) + '"' + ro() + '>' + (armed ? '¿Quitar?' : 'Quitar') + '</button></div>';
}
function energyBoxHTML(c, en) {
  const nu = dayNutri(c.day);
  if (!en.bmr) {
    const miss = [];
    if (!en.profileOk) miss.push('tu sexo y tu fecha de nacimiento en Ajustes');
    if (!en.w) miss.push('tu peso en Progreso');
    return '<div class="energy"><p class="prose"><strong>Calorías quemadas.</strong> Para calcularlas, registra ' + miss.join(' y ') + '.</p><div class="row">' +
      (!en.profileOk ? '<button type="button" class="btn sm quiet" id="en-prof" data-go="ajustes">Ir a Ajustes</button>' : '') +
      (!en.w ? '<button type="button" class="btn sm quiet" id="en-peso" data-go="progreso">Ir a Progreso</button>' : '') + '</div>' +
      (nu.count ? '<div class="en-row"><span>Consumidas</span><b>' + fmtInt(nu.kcal) + ' kcal</b></div>' : '') + '</div>';
  }
  const row = (a, b, cls) => '<div class="en-row' + (cls ? ' ' + cls : '') + '"><span>' + a + '</span><b>' + b + '</b></div>';
  let h = '<div class="energy">' +
    row('Consumidas', nu.count ? fmtInt(nu.kcal) + ' kcal' : '—') +
    row('Quemadas (estimado del día)', fmtInt(r10(en.total)) + ' kcal') +
    '<p class="en-parts">En reposo ' + fmtInt(r10(en.bmr)) + ' · Digestión y vida diaria ' + fmtInt(r10(en.life)) + ' · Pasos ' + fmtInt(r10(en.stepsKcal)) + ' · Ejercicio ' + fmtInt(r10(en.exKcal)) + '</p>';
  if (nu.count) {
    const b = r10(nu.kcal - en.total);
    h += row('Balance', (b > 0 ? '+' : b < 0 ? '−' : '') + fmtInt(Math.abs(b)) + ' kcal', 'en-bal');
  }
  return h + '</div><p class="hint">Estimación con tu peso, edad y sexo (±15 %): úsala para ver tendencias. Si los pasos ya incluyen una caminata, no la registres también como ejercicio.</p>';
}
function actHTML(c) {
  const d = c.day, dis = S.readonly || !S.daysLoaded ? ' disabled' : '';
  const en = energyFor(c.k, d);
  const acts = Array.isArray(d.acts) ? d.acts : [];
  const lt = d.ex ? (d.ex.types || []).map(t => (EX_TYPES.find(x => x.k === t) || {}).label).filter(Boolean) : [];
  const legacy = lt.length || (d.ex && d.ex.min != null) ? '<p class="hint">Registro anterior: ' + esc(lt.join(', ') || 'ejercicio') + (d.ex.min != null ? ' · ' + esc(d.ex.min) + ' min' : '') + '.</p>' : '';
  const intense = countIntense(c.k);
  const meta = acts.length && en.perH && !en.exUnknown ? fmtInt(r10(en.exKcal)) + ' kcal en ejercicio' : '';
  return '<section id="card-act" class="card"><div class="card-h"><h2>Actividad y energía</h2>' + (meta ? '<span class="meta">' + meta + '</span>' : '') + '</div>' +
    '<div class="steps-row"><div class="field"><label class="lbl" for="steps-in">' + (c.isToday ? 'Pasos de hoy' : 'Pasos') + '</label><input type="text" inputmode="numeric" id="steps-in" autocomplete="off" placeholder="0" value="' + (d.steps ? esc(fmtInt(d.steps)) : '') + '"' + (S.readonly || !S.daysLoaded ? ' readonly' : '') + '></div>' +
    '<p class="steps-out" id="steps-out">' + stepsOutHTML(en) + '</p></div>' +
    (acts.length ? '<div class="acts">' + acts.map(a => actRowHTML(a, en.perH)).join('') + '</div>' : '') +
    '<div class="row act-btns"><button type="button" class="btn sm add" id="act-add" data-act="act-add"' + dis + '>Agregar ejercicio</button><button type="button" class="btn sm ghost" id="gym-add" data-act="gym-open"' + dis + '>Gimnasio</button></div>' + legacy +
    (intense >= 4 && (profileGoal() === 'subir' || profileGoal() === 'musculo') ? '<p class="hint warn-t">Llevas ' + intense + ' días de cardio intenso en la última semana. Si buscas subir de peso o ganar músculo, aflójale o come más esos días.</p>' : '') +
    '<div id="energy-box">' + energyBoxHTML(c, en) + '</div></section>';
}
