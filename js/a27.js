'use strict';
function v11Click(act, el, id) {
  switch (act) {
    case 'club-create': clubCreate(); return true;
    case 'club-join': clubJoin(); return true;
    case 'club-open': S.club.open = S.club.open === el.dataset.id ? null : el.dataset.id; S.club.editing = null; if (S.club.open) clubLoadBoard(S.club.open); renderClub(); return true;
    case 'club-leave': confirmOrDo('club:' + el.dataset.id, () => clubLeave(el.dataset.id), renderClub); return true;
    case 'club-edit': S.club.editing = el.dataset.id; renderClub(); return true;
    case 'club-editx': S.club.editing = null; renderClub(); return true;
    case 'club-save': clubSaveEdit(el.dataset.id); return true;
    case 'club-admin': clubSetAdmin(el.dataset.id, el.dataset.u, el.dataset.on === '1'); return true;
    case 'club-kick': confirmOrDo('kick:' + el.dataset.u, () => clubRemove(el.dataset.id, el.dataset.u), renderClub); return true;
    case 'club-copy': {
      const c = el.dataset.code || '';
      if (c && navigator.clipboard) navigator.clipboard.writeText(c).then(() => toast('Código copiado.'), () => {});
      else toast('El código es ' + c);
      return true;
    }
  }
  return false;
}

/* ---------- v12: avisos de medicamentos en el celular ----------
   Los medicamentos ahora avisan a su hora igual que los hábitos (misma función v4Notify). */
function medNotifHTML() {
  try { if (typeof Notification === 'undefined' || Notification.permission !== 'default') return ''; } catch (e) { return ''; }
  return '<div class="med-notif"><button type="button" class="btn sm quiet" data-act="med-notif">Activar avisos en este dispositivo</button>' +
    '<span class="hint">Te recordamos cada toma a su hora, igual que los hábitos.</span></div>';
}
function v12Click(act, el, id) {
  if (act === 'med-notif') { try { Notification.requestPermission().then(() => renderAjustes()); } catch (e) {} return true; }
  return false;
}

/* ---------- v16: micronutrientes, fuente (comida/suplemento/medicamento) y gluten ----------
   El cálculo (nutriFor/sumN/dayNutri) ya es genérico sobre NK, así que al extender
   NUTRIENTS + NK los nuevos nutrientes se suman solos en todas las fuentes del día. */
const MICRO_NUTRIENTS = [
  { k: 'ca', label: 'Calcio', unit: 'mg', grp: 'micro' },
  { k: 'zn', label: 'Zinc', unit: 'mg', grp: 'micro' },
  { k: 'fe', label: 'Hierro', unit: 'mg', grp: 'micro' },
  { k: 'mg', label: 'Magnesio', unit: 'mg', grp: 'micro' },
  { k: 'ph', label: 'Fósforo', unit: 'mg', grp: 'micro' },
  { k: 'k', label: 'Potasio', unit: 'mg', grp: 'micro' },
  { k: 'vd', label: 'Vitamina D', unit: 'mcg', grp: 'micro' },
  { k: 'va', label: 'Vitamina A', unit: 'mcg', grp: 'micro' },
  { k: 'vk', label: 'Vitamina K', unit: 'mcg', grp: 'micro' },
  { k: 'vc', label: 'Vitamina C', unit: 'mg', grp: 'micro' },
  { k: 'b12', label: 'Vitamina B12', unit: 'mcg', grp: 'micro' },
  { k: 'o3', label: 'Omega-3', unit: 'g', grp: 'micro' }
];
// RDA por defecto (hombre ~15 años); editable por el usuario en Ajustes → Metas.
const DEFAULT_RDA = { ca: 1300, zn: 11, fe: 11, mg: 410, ph: 1250, k: 3000, vd: 15, va: 900, vk: 75, vc: 75, b12: 2.4, o3: 1.6 };

if (!NK.includes('ca')) {
  for (const n of MICRO_NUTRIENTS) { NUTRIENTS.push(n); NK.push(n.k); GOAL_KIND[n.k] = 'min'; CF_FIELDS.push([n.k, n.label, n.unit]); }
}
// marcar los macros existentes como grupo "macro" (los nuevos ya traen grp:'micro')
for (const n of NUTRIENTS) if (!n.grp) n.grp = 'macro';

function nutGoal(k) {
  const g = (S.settings && S.settings.nutri) || {};
  const v = Number(g[k]);
  return v > 0 ? v : (DEFAULT_RDA[k] || 0);
}
function nutKind(e) { return e && (e.k === 'suplemento' || e.k === 'medicamento') ? e.k : 'comida'; }
const KIND_LABEL = { comida: 'Comida', suplemento: 'Suplemento', medicamento: 'Medicamento' };
const KIND_TAG = { suplemento: '💊 Suplemento', medicamento: '⚕️ Medicamento' };

/* ----- micros y gluten de alimentos clave (por 100 g; fuente: USDA aprox) ----- */
const MICRO_SEED = {
  leche: { ca: 125, zn: 0.4, fe: 0.03, mg: 11, ph: 95, k: 150, vd: 1.3, va: 46, vk: 0.3, vc: 0, b12: 0.45, o3: 0.08 },
  yogur: { ca: 121, zn: 0.6, fe: 0.05, mg: 12, ph: 95, k: 155, vd: 0.1, va: 27, vk: 0.2, vc: 0.5, b12: 0.37, o3: 0 },
  queso_camp: { ca: 360, zn: 2.9, fe: 0.2, mg: 20, ph: 380, k: 90, vd: 0.4, va: 150, vk: 1, vc: 0, b12: 0.8, o3: 0.1 },
  huevo: { ca: 50, zn: 1.1, fe: 1.2, mg: 10, ph: 172, k: 126, vd: 2, va: 160, vk: 0.3, vc: 0, b12: 1.1, o3: 0.1 },
  pechuga: { ca: 15, zn: 1, fe: 1, mg: 29, ph: 228, k: 256, vd: 0.1, va: 9, vk: 0.3, vc: 0, b12: 0.3, o3: 0.05 },
  res: { ca: 18, zn: 4.8, fe: 2.6, mg: 21, ph: 198, k: 318, vd: 0.1, va: 0, vk: 1.5, vc: 0, b12: 2.6, o3: 0.05 },
  salmon: { ca: 9, zn: 0.6, fe: 0.5, mg: 29, ph: 240, k: 380, vd: 11, va: 50, vk: 0.1, vc: 0, b12: 3, o3: 2.3 },
  atun: { ca: 10, zn: 0.8, fe: 1.3, mg: 28, ph: 220, k: 237, vd: 2, va: 5, vk: 0.1, vc: 0, b12: 2.5, o3: 0.3 },
  sardinas: { ca: 382, zn: 1.3, fe: 2.9, mg: 39, ph: 490, k: 397, vd: 4.8, va: 32, vk: 2.6, vc: 0, b12: 8.9, o3: 1.5 },
  lenteja: { ca: 19, zn: 1.3, fe: 3.3, mg: 36, ph: 180, k: 369, vd: 0, va: 0, vk: 1.7, vc: 1.5, b12: 0, o3: 0.1 },
  arroz: { ca: 10, zn: 0.5, fe: 1.2, mg: 12, ph: 43, k: 35, vd: 0, va: 0, vk: 0, vc: 0, b12: 0, o3: 0 },
  banano: { ca: 5, zn: 0.15, fe: 0.26, mg: 27, ph: 22, k: 358, vd: 0, va: 3, vk: 0.5, vc: 8.7, b12: 0, o3: 0 },
  naranja: { ca: 40, zn: 0.07, fe: 0.1, mg: 10, ph: 14, k: 181, vd: 0, va: 11, vk: 0, vc: 53, b12: 0, o3: 0 },
  brocoli: { ca: 40, zn: 0.45, fe: 0.67, mg: 21, ph: 67, k: 293, vd: 0, va: 77, vk: 141, vc: 65, b12: 0, o3: 0.1 },
  espinaca: { ca: 136, zn: 0.76, fe: 3.6, mg: 87, ph: 56, k: 466, vd: 0, va: 524, vk: 494, vc: 9.8, b12: 0, o3: 0.1 },
  almendras: { ca: 269, zn: 3.1, fe: 3.7, mg: 270, ph: 481, k: 733, vd: 0, va: 0, vk: 0, vc: 0, b12: 0, o3: 0 }
};
const GLUTEN_YES = ['pan', 'pan_int', 'pan_frances', 'pasta', 'pasta_int', 'galletas_soda', 'croissant', 'mantecada', 'mogolla', 'empanada_arg', 'pan_corazon_choc', 'pan_corazon', 'pan_palitoqueso', 'pan_rollocanela', 'pan_cacho', 'pan_roscon_areq', 'pan_liberal', 'ham_tocineta', 'ham_bbq', 'ham_pollo_plancha', 'ham_huevo', 'ham_gourmet', 'hamburguesa'];
const GLUTEN_NO = ['arepa', 'pandebono', 'pan_queso', 'arroz', 'leche', 'yogur', 'queso_camp', 'huevo', 'pechuga', 'res', 'salmon', 'atun', 'sardinas', 'lenteja', 'banano', 'naranja', 'brocoli', 'espinaca', 'almendras'];
(function seedFoods() {
  if (typeof FOOD_BY === 'undefined') return;
  for (const id in MICRO_SEED) {
    const f = FOOD_BY[id];
    if (!f || !Array.isArray(f.v)) continue;
    const s = MICRO_SEED[id];
    MICRO_NUTRIENTS.forEach(n => { const i = NK.indexOf(n.k); if (i >= 0) f.v[i] = s[n.k] != null ? s[n.k] : 0; });
  }
  for (const id of GLUTEN_YES) if (FOOD_BY[id]) FOOD_BY[id].gluten = true;
  for (const id of GLUTEN_NO) if (FOOD_BY[id]) FOOD_BY[id].gluten = false;
})();

/* ----- resumen diario: macros + sección colapsable de micros + gluten + desglose por fuente ----- */
function nutRow(n, nu) {
  const v = nu[n.k] || 0, g = nutGoal(n.k), kind = goalKind(n.k);
  let cls = '', extra = '';
  if (g > 0) {
    if (kind === 'max' && v > g) cls = ' over';
    else if ((kind === 'min' || kind === 'meta') && v >= (kind === 'meta' ? g * 0.9 : g)) cls = ' done';
    const word = kind === 'max' ? 'Máx.' : kind === 'min' ? 'Mín.' : 'Meta';
    extra = '<span class="nut-g">' + word + ' ' + fmtNut(n.k, g) + ' ' + n.unit + (cls === ' over' ? ' · te pasaste' : '') + '</span>' +
      '<span class="m-bar"><i style="width:' + Math.round(Math.min(1, v / g) * 100) + '%"></i></span>';
  }
  return '<div class="nut' + cls + '"><span class="nut-l">' + n.label + '</span><span class="nut-v">' + fmtNut(n.k, v) + '<small> ' + n.unit + '</small></span>' + extra + '</div>';
}
function dayFoodList() { const d = getDay(S.viewKey); return Array.isArray(d.food) ? d.food : []; }
function sourceBreakdownHTML() {
  const list = dayFoodList();
  if (!list.length) return '';
  const kinds = ['comida', 'suplemento', 'medicamento'];
  const rows = kinds.map(kd => {
    const items = list.filter(e => nutKind(e) === kd);
    if (!items.length) return '';
    const t = sumN(items.map(e => e.n));
    return '<div class="src-row"><span class="src-k">' + KIND_LABEL[kd] + ' <small>(' + items.length + ')</small></span><span class="src-v">' +
      fmtInt(t.kcal) + ' kcal · Ca ' + fmtNut('ca', t.ca) + ' · Zn ' + fmtNut('zn', t.zn) + ' · Fe ' + fmtNut('fe', t.fe) + ' mg</span></div>';
  }).filter(Boolean).join('');
  if (list.every(e => nutKind(e) === 'comida')) return '';
  return '<details class="nut-src"><summary>Por fuente (comida / suplemento / medicamento)</summary>' + rows + '</details>';
}
function nutriGridHTML(nu) {
  const macros = NUTRIENTS.filter(n => n.grp !== 'micro');
  const micros = NUTRIENTS.filter(n => n.grp === 'micro');
  let h = '<div class="nutri" role="group" aria-label="Nutrientes del día">' + macros.map(n => nutRow(n, nu)).join('') + '</div>';
  h += '<details class="nut-micros"><summary>Micronutrientes</summary>' +
    '<div class="nutri">' + micros.map(n => nutRow(n, nu)).join('') + '</div>' +
    '<p class="hint">Metas (RDA) editables en Ajustes → Metas. Varios alimentos de la lista aún no traen micronutrientes: aparecen en 0 hasta que los cargues al crear el alimento.</p></details>';
  const glc = dayFoodList().filter(e => e && e.gl).length;
  h += '<div class="gluten-badge' + (glc ? ' has' : '') + '">🌾 ' + (glc ? 'Con gluten: ' + glc + (glc === 1 ? ' comida hoy' : ' comidas hoy') : 'Ninguna comida con gluten marcada hoy') + '</div>';
  h += sourceBreakdownHTML();
  return h;
}

/* ----- etiqueta de fuente en cada registro ----- */
function feHTML(e) {
  const tag = 'fe:' + e.id, armed = S.confirmDel === tag;
  const n = e.n || {};
  const kd = nutKind(e), ktag = KIND_TAG[kd] ? ' <span class="fe-kind">' + KIND_TAG[kd] + '</span>' : '';
  return '<div class="fe"><button type="button" class="fe-main" id="fe-' + esc(e.id) + '" data-act="fe-edit" data-id="' + esc(e.id) + '"' + ro() + '>' +
    '<span class="fe-n">' + esc(e.name || 'Alimento') + ktag + '</span><span class="fe-s">' + esc(qtyText(e.amt, e.u, e.g, e.l)) + ' · ' + fmtInt(n.kcal) + ' kcal · proteína ' + fmtNut('p', n.p) + ' g</span></button>' +
    '<button type="button" class="xbtn' + (armed ? ' armed' : '') + '" id="fx-' + esc(e.id) + '" data-act="fe-del" data-id="' + esc(e.id) + '"' + ro() + '>' + (armed ? '¿Quitar?' : 'Quitar') + '</button></div>';
}

/* ----- formulario de crear/editar alimento: fuente + gluten + macros + micros colapsables ----- */
const CF_MICRO_SET = {}; MICRO_NUTRIENTS.forEach(n => CF_MICRO_SET[n.k] = 1);
function cfInput(x, cf) {
  return '<div class="field"><label class="lbl" for="cf-' + x[0] + '">' + x[1] + ' (' + x[2] + ')</label>' +
    '<input type="text" inputmode="decimal" id="cf-' + x[0] + '" data-cf="' + x[0] + '" autocomplete="off" value="' + esc(cf[x[0]] == null ? '' : cf[x[0]]) + '"></div>';
}
function shCustomHTML(st) {
  const cf = st.cf || {}, basis = cf.basis || 'g';
  const kind = cf.kind || 'comida', gluten = cf.gluten === true;
  const bBtn = (k, label) => '<button type="button" class="tgl" id="cf-b-' + k + '" data-act="cf-basis" data-v="' + k + '" aria-pressed="' + (basis === k) + '">' + label + '</button>';
  const kBtn = (k, label) => '<button type="button" class="tgl" data-act="cf-kind" data-v="' + k + '" aria-pressed="' + (kind === k) + '">' + label + '</button>';
  const pu = basis === 'ml' ? 'ml' : 'g';
  const macros = CF_FIELDS.filter(x => !CF_MICRO_SET[x[0]]);
  const micros = CF_FIELDS.filter(x => CF_MICRO_SET[x[0]]);
  return sheetTop(cf.id ? 'Editar alimento' : 'Crear alimento', true) +
    '<form class="sh-form" data-form="sh-custom" novalidate>' +
      '<div class="field"><label class="lbl" for="cf-name">Nombre</label><input type="text" id="cf-name" data-cf="name" maxlength="80" autocomplete="off" value="' + esc(cf.name || '') + '"></div>' +
      '<div class="field"><label class="lbl" for="cf-brand">Marca (opcional)</label><input type="text" id="cf-brand" data-cf="brand" maxlength="60" autocomplete="off" value="' + esc(cf.brand || '') + '"></div>' +
      '<div class="field"><span class="lbl">Fuente</span><div class="toggles">' + kBtn('comida', 'Comida') + kBtn('suplemento', 'Suplemento') + kBtn('medicamento', 'Medicamento') + '</div></div>' +
      '<button type="button" class="switch' + (gluten ? ' on' : '') + '" data-act="cf-gluten" aria-pressed="' + gluten + '"><span class="sw"></span>' + (gluten ? 'Contiene gluten' : 'Sin gluten') + '</button>' +
      '<div class="field"><span class="lbl">La tabla nutricional está por</span><div class="toggles">' + bBtn('g', '100 g') + bBtn('ml', '100 ml') + bBtn('por', '1 porción') + '</div></div>' +
      '<div class="grid2">' +
        '<div class="field"><label class="lbl" for="cf-pname">Nombre de la porción</label><input type="text" id="cf-pname" data-cf="pname" maxlength="40" autocomplete="off" placeholder="paquete, unidad…" value="' + esc(cf.pname || '') + '"></div>' +
        '<div class="field"><label class="lbl" for="cf-pg">Tamaño de la porción (' + pu + ')' + (basis === 'por' ? '' : ', opcional') + '</label><input type="text" inputmode="decimal" id="cf-pg" data-cf="pg" autocomplete="off" value="' + esc(cf.pg || '') + '"></div>' +
      '</div>' +
      '<p class="sh-sec">Valores ' + (basis === 'por' ? 'por porción' : 'por 100 ' + pu) + '</p>' +
      '<div class="grid2">' + macros.map(x => cfInput(x, cf)).join('') + '</div>' +
      '<details class="cf-micros"><summary>Micronutrientes (opcional)</summary><div class="grid2">' + micros.map(x => cfInput(x, cf)).join('') + '</div>' +
        '<p class="hint">Útil sobre todo para suplementos y medicamentos: copia los valores de la etiqueta. Déjalos vacíos si no los sabes.</p></details>' +
      '<div class="field"><label class="lbl" for="cf-code">Código de barras (opcional)</label><input type="text" inputmode="numeric" id="cf-code" data-cf="code" maxlength="14" autocomplete="off" value="' + esc(cf.code || '') + '"></div>' +
      '<p class="form-err" id="sh-err">' + esc(st.err || '') + '</p>' +
      '<button type="submit" class="btn" id="cf-save"' + (S.readonly || !S.loaded.foods ? ' disabled' : '') + '>Guardar alimento</button>' +
    '</form>';
}

function v16Click(act, el, id) {
  const st = S.sheet;
  if (act === 'cf-kind') { if (st && st.cf) { st.cf.kind = el.dataset.v; renderSheet(); } return true; }
  if (act === 'cf-gluten') { if (st && st.cf) { st.cf.gluten = !(st.cf.gluten === true); renderSheet(); } return true; }
  return false;
}

/* ----- metas de nutrición: macros + micros (RDA) en sección colapsable ----- */
function goalFieldHTML(n, g, dis) {
  const sug = DEFAULT_RDA[n.k] ? 'Sugerido ' + goalText(n.k, DEFAULT_RDA[n.k]) : 'Sin meta';
  const KL = { meta: 'meta', max: 'máximo', min: 'mínimo' };
  return '<div class="field"><label class="lbl" for="goal-' + n.k + '">' + n.label + ' · ' + KL[goalKind(n.k)] + ' (' + n.unit + ')</label>' +
    '<input type="text" inputmode="' + (n.k === 'kcal' || n.k === 'na' ? 'numeric' : 'decimal') + '" id="goal-' + n.k + '" data-set="nutri.' + n.k + '" placeholder="' + sug + '" autocomplete="off" value="' + (g[n.k] ? esc(goalText(n.k, g[n.k])) : '') + '"' + dis + '></div>';
}
function goalsCardHTML() {
  const s = S.settings, g = s.nutri || {}, dis = S.readonly || !S.loaded.settings ? ' disabled' : '';
  const macros = NUTRIENTS.filter(n => n.grp !== 'micro'), micros = NUTRIENTS.filter(n => n.grp === 'micro');
  return '<section class="card" id="card-goals"><div class="card-h"><h2>Metas de nutrición</h2><span class="meta">Opcionales</span></div><div class="grid2 goals">' +
    macros.map(n => goalFieldHTML(n, g, dis)).join('') +
    '<div class="field"><label class="lbl" for="goal-steps">Pasos al día · meta</label><input type="text" inputmode="numeric" id="goal-steps" data-set="stepGoal" placeholder="Sin meta" autocomplete="off" value="' + (s.stepGoal ? esc(String(s.stepGoal)) : '') + '"' + dis + '></div>' +
    '</div><details class="goals-micros"><summary>Metas de micronutrientes (RDA)</summary><div class="grid2 goals">' +
    micros.map(n => goalFieldHTML(n, g, dis)).join('') +
    '</div><p class="hint">Valores sugeridos para un adolescente; ajústalos a tu edad, peso o lo que indique tu médico.</p></details>' +
    '<p class="hint">El asistente de la pestaña Plan las calcula por ti. Si tienes una condición médica (riñón, diabetes, presión alta), usa las cifras de tu médico o nutricionista.</p></section>';
}

/* ---------- v17: micronutrientes para TODOS los alimentos (estimado) + aporte de medicamentos ----------
   Los valores por alimento son ESTIMADOS a partir del ingrediente principal (base USDA por 100 g);
   los 16 alimentos del MICRO_SEED conservan sus valores exactos. Para suplementos/medicamentos,
   al marcar una toma como tomada, su aporte nutricional se suma a la tabla del día. */

// Aporte por TOMA de un suplemento/medicamento, según el nombre (editable con med.nutri).
const MED_NUTRI_DEFAULT = [
  ['emulsion de scott', { kcal: 45, va: 375, vd: 2.5, o3: 0.4, ca: 40, ph: 30 }],
  ['scott', { kcal: 45, va: 375, vd: 2.5, o3: 0.4, ca: 40, ph: 30 }],
  ['omega', { o3: 0.5 }],
  ['zinc', { zn: 20 }],
  ['calcio', { ca: 600, vd: 5 }],
  ['vitamina d', { vd: 25 }],
  ['vitamina c', { vc: 500 }],
  ['hierro', { fe: 30 }],
  ['magnesio', { mg: 250 }],
  ['vitamina b12', { b12: 500 }],
  ['b12', { b12: 500 }],
  ['vitamina a', { va: 800 }],
  ['vitamina k', { vk: 60 }],
  ['multivit', { ca: 100, fe: 5, zn: 5, mg: 50, va: 400, vd: 5, vc: 60, b12: 2 }],
  ['centrum', { ca: 100, fe: 5, zn: 5, mg: 50, va: 400, vd: 5, vc: 60, b12: 2 }]
];
function medNutriOf(med) {
  if (med && med.nutri && typeof med.nutri === 'object') return med.nutri;
  const nm = norm(med && med.name);
  if (!nm) return null;
  for (const row of MED_NUTRI_DEFAULT) if (nm.indexOf(row[0]) >= 0) return row[1];
  return null;
}
function dayMedNutri(dayKey) {
  if (typeof medsOn === 'function' && !medsOn()) return null;
  if (typeof dosesFor !== 'function' || typeof getDay !== 'function') return null;
  const day = getDay(dayKey), recs = (day && day.meds) || {};
  const t = {}; for (const k of NK) t[k] = 0; let any = false;
  for (const ds of dosesFor(dayKey)) {
    const r = recs[ds.key];
    if (!r || r.s !== 'taken') continue;
    const prof = medNutriOf(ds.med);
    if (!prof) continue;
    any = true;
    for (const k of NK) t[k] += Number(prof[k]) || 0;
  }
  return any ? t : null;
}

// Perfil de micronutrientes por 100 g del ingrediente base (aprox. USDA). Solo valores relevantes.
const ING_PROFILES = [
  ['higado', { ca: 11, zn: 4, fe: 6.5, mg: 18, ph: 387, k: 313, vd: 1.2, va: 6500, vk: 3, vc: 1.3, b12: 70, o3: 0.05 }],
  ['pechuga', { ca: 15, zn: 1, fe: 1, mg: 29, ph: 228, k: 256, vd: 0.1, va: 9, vc: 0, b12: 0.3, o3: 0.05 }],
  ['pollo', { ca: 15, zn: 1.3, fe: 1.1, mg: 25, ph: 200, k: 240, vd: 0.1, va: 20, vc: 0, b12: 0.4, o3: 0.1 }],
  ['pavo', { ca: 18, zn: 2.5, fe: 1.4, mg: 26, ph: 215, k: 250, vd: 0.1, va: 10, b12: 1.2, o3: 0.1 }],
  ['res', { ca: 18, zn: 4.8, fe: 2.6, mg: 21, ph: 198, k: 318, vd: 0.1, b12: 2.6, vk: 1.5, o3: 0.05 }],
  ['carne molida', { ca: 20, zn: 5.3, fe: 2.4, mg: 19, ph: 180, k: 290, b12: 2.4, o3: 0.05 }],
  ['bistec', { ca: 18, zn: 4.8, fe: 2.6, mg: 21, ph: 198, k: 318, b12: 2.6, o3: 0.05 }],
  ['carne', { ca: 18, zn: 4.5, fe: 2.5, mg: 21, ph: 195, k: 310, b12: 2.5, o3: 0.05 }],
  ['cerdo', { ca: 16, zn: 2.4, fe: 0.9, mg: 24, ph: 220, k: 360, vd: 0.7, b12: 0.7, o3: 0.05 }],
  ['chuleta', { ca: 16, zn: 2.4, fe: 0.9, mg: 24, ph: 220, k: 360, vd: 0.7, b12: 0.7, o3: 0.05 }],
  ['costilla', { ca: 25, zn: 3.5, fe: 1.3, mg: 20, ph: 180, k: 290, b12: 1, o3: 0.1 }],
  ['tocineta', { ca: 6, zn: 2.2, fe: 0.6, mg: 17, ph: 180, k: 200, b12: 0.6, o3: 0.1 }],
  ['tocino', { ca: 6, zn: 2.2, fe: 0.6, mg: 17, ph: 180, k: 200, b12: 0.6, o3: 0.1 }],
  ['jamon', { ca: 6, zn: 1.8, fe: 0.9, mg: 18, ph: 200, k: 290, b12: 0.6, o3: 0.05 }],
  ['salchicha', { ca: 20, zn: 1.9, fe: 1, mg: 14, ph: 140, k: 180, b12: 0.9, o3: 0.1 }],
  ['chorizo', { ca: 10, zn: 2.5, fe: 1.3, mg: 17, ph: 180, k: 230, b12: 1.8, o3: 0.1 }],
  ['mortadela', { ca: 20, zn: 1.8, fe: 1.2, mg: 13, ph: 130, k: 160, b12: 1, o3: 0.1 }],
  ['salmon', { ca: 9, zn: 0.6, fe: 0.5, mg: 29, ph: 240, k: 380, vd: 11, va: 50, b12: 3, o3: 2.3 }],
  ['atun', { ca: 10, zn: 0.8, fe: 1.3, mg: 28, ph: 220, k: 237, vd: 2, b12: 2.5, o3: 0.3 }],
  ['sardina', { ca: 382, zn: 1.3, fe: 2.9, mg: 39, ph: 490, k: 397, vd: 4.8, b12: 8.9, o3: 1.5 }],
  ['trucha', { ca: 43, zn: 0.7, fe: 0.3, mg: 28, ph: 245, k: 375, vd: 15, b12: 5, o3: 1 }],
  ['tilapia', { ca: 14, zn: 0.4, fe: 0.7, mg: 34, ph: 204, k: 380, vd: 3, b12: 1.9, o3: 0.2 }],
  ['camaron', { ca: 70, zn: 1.6, fe: 0.5, mg: 39, ph: 240, k: 260, b12: 1.5, o3: 0.3 }],
  ['pescado', { ca: 30, zn: 0.8, fe: 0.8, mg: 30, ph: 230, k: 350, vd: 5, b12: 2.5, o3: 0.6 }],
  ['clara', { ca: 7, zn: 0.03, fe: 0.08, mg: 11, ph: 15, k: 163, b12: 0.1, o3: 0 }],
  ['huevo', { ca: 50, zn: 1.1, fe: 1.2, mg: 10, ph: 172, k: 126, vd: 2, va: 160, b12: 1.1, o3: 0.1 }],
  ['lenteja', { ca: 19, zn: 1.3, fe: 3.3, mg: 36, ph: 180, k: 369, vk: 1.7, vc: 1.5, o3: 0.1 }],
  ['frijol', { ca: 35, zn: 1, fe: 2.2, mg: 45, ph: 140, k: 405, vk: 2.8, o3: 0.1 }],
  ['garbanzo', { ca: 49, zn: 1.5, fe: 2.9, mg: 48, ph: 168, k: 291, vk: 4, vc: 1.3, o3: 0.1 }],
  ['arveja', { ca: 27, zn: 1.2, fe: 1.5, mg: 36, ph: 117, k: 271, vc: 14, vk: 25, va: 38 }],
  ['haba', { ca: 36, zn: 1, fe: 1.5, mg: 43, ph: 125, k: 268, vc: 3.5 }],
  ['soya', { ca: 102, zn: 1.2, fe: 5.1, mg: 86, ph: 245, k: 515, vk: 19, o3: 0.6 }],
  ['leche', { ca: 125, zn: 0.4, fe: 0.03, mg: 11, ph: 95, k: 150, vd: 1.3, va: 46, b12: 0.45, o3: 0.08 }],
  ['yogur', { ca: 121, zn: 0.6, fe: 0.05, mg: 12, ph: 95, k: 155, vd: 0.1, va: 27, vc: 0.5, b12: 0.37 }],
  ['kumis', { ca: 110, zn: 0.5, mg: 11, ph: 90, k: 140, b12: 0.4, va: 30 }],
  ['cuajada', { ca: 180, zn: 1.5, mg: 15, ph: 200, k: 100, b12: 0.6, va: 90 }],
  ['queso', { ca: 360, zn: 2.9, fe: 0.2, mg: 20, ph: 380, k: 90, vd: 0.4, va: 150, b12: 0.8, o3: 0.1 }],
  ['mantequilla', { ca: 24, mg: 2, ph: 24, k: 24, vd: 1.5, va: 684, vk: 7, o3: 0.3 }],
  ['crema de leche', { ca: 65, mg: 7, ph: 60, k: 110, va: 290, vd: 1.1 }],
  ['avena', { ca: 54, zn: 2.3, fe: 2.5, mg: 59, ph: 180, k: 140, vk: 1, o3: 0.1 }],
  ['quinua', { ca: 17, zn: 1.1, fe: 1.5, mg: 64, ph: 152, k: 172, vc: 0 }],
  ['arroz integral', { ca: 10, zn: 0.6, fe: 0.5, mg: 43, ph: 83, k: 43 }],
  ['arroz', { ca: 10, zn: 0.5, fe: 1.2, mg: 12, ph: 43, k: 35 }],
  ['pasta', { ca: 7, zn: 0.5, fe: 0.5, mg: 18, ph: 58, k: 44 }],
  ['pan integral', { ca: 55, zn: 1.8, fe: 2.4, mg: 76, ph: 200, k: 250, vk: 7 }],
  ['pan', { ca: 150, zn: 0.9, fe: 3.6, mg: 24, ph: 100, k: 120 }],
  ['arepa', { ca: 8, zn: 0.5, fe: 1.1, mg: 25, ph: 80, k: 60 }],
  ['maiz', { ca: 7, zn: 0.6, fe: 0.5, mg: 37, ph: 89, k: 270, vc: 6.8, va: 9 }],
  ['tortilla', { ca: 81, zn: 0.5, fe: 1.2, mg: 25, ph: 120, k: 90 }],
  ['harina', { ca: 15, zn: 0.7, fe: 1.2, mg: 22, ph: 108, k: 107 }],
  ['papa criolla', { ca: 8, zn: 0.4, fe: 0.9, mg: 23, ph: 57, k: 455, vc: 19 }],
  ['papa', { ca: 10, zn: 0.3, fe: 0.8, mg: 23, ph: 57, k: 425, vc: 19.7 }],
  ['yuca', { ca: 16, zn: 0.3, fe: 0.3, mg: 21, ph: 27, k: 271, vc: 20.6 }],
  ['platano', { ca: 3, zn: 0.14, fe: 0.6, mg: 37, ph: 34, k: 499, vc: 18, va: 56 }],
  ['patacon', { ca: 3, zn: 0.2, fe: 0.6, mg: 37, ph: 34, k: 480, vc: 10, va: 50 }],
  ['batata', { ca: 30, zn: 0.3, fe: 0.6, mg: 25, ph: 47, k: 337, vc: 2.4, va: 709 }],
  ['cereal', { ca: 120, zn: 4, fe: 8, mg: 40, ph: 120, k: 180, vc: 15, b12: 2 }],
  ['espinaca', { ca: 136, zn: 0.76, fe: 3.6, mg: 87, ph: 56, k: 466, va: 524, vk: 494, vc: 9.8 }],
  ['acelga', { ca: 58, zn: 0.33, fe: 2.3, mg: 86, ph: 46, k: 549, va: 306, vk: 327, vc: 18 }],
  ['brocoli', { ca: 40, zn: 0.45, fe: 0.67, mg: 21, ph: 67, k: 293, va: 77, vk: 141, vc: 65 }],
  ['coliflor', { ca: 22, zn: 0.3, fe: 0.4, mg: 15, ph: 44, k: 299, vc: 48, vk: 15 }],
  ['repollo', { ca: 40, zn: 0.18, fe: 0.5, mg: 12, ph: 26, k: 170, vc: 37, vk: 76 }],
  ['lechuga', { ca: 36, zn: 0.2, fe: 1, mg: 13, ph: 29, k: 194, va: 370, vk: 126, vc: 9 }],
  ['tomate', { ca: 10, zn: 0.17, fe: 0.27, mg: 11, ph: 24, k: 237, vc: 14, va: 42, vk: 7.9 }],
  ['zanahoria', { ca: 33, zn: 0.24, fe: 0.3, mg: 12, ph: 35, k: 320, va: 835, vk: 13, vc: 6 }],
  ['cebolla', { ca: 23, zn: 0.17, fe: 0.21, mg: 10, ph: 29, k: 146, vc: 7.4 }],
  ['pimenton', { ca: 10, zn: 0.25, fe: 0.4, mg: 12, ph: 26, k: 211, vc: 128, va: 157 }],
  ['pepino', { ca: 16, zn: 0.2, fe: 0.28, mg: 13, ph: 24, k: 147, vc: 2.8, vk: 16 }],
  ['calabacin', { ca: 16, zn: 0.32, fe: 0.37, mg: 18, ph: 38, k: 261, vc: 17.9, va: 10 }],
  ['ahuyama', { ca: 21, zn: 0.32, fe: 0.8, mg: 12, ph: 44, k: 340, va: 426, vc: 9 }],
  ['habichuela', { ca: 37, zn: 0.24, fe: 1, mg: 25, ph: 38, k: 211, vc: 12, vk: 43 }],
  ['apio', { ca: 40, zn: 0.13, fe: 0.2, mg: 11, ph: 24, k: 260, vk: 29, vc: 3 }],
  ['remolacha', { ca: 16, zn: 0.35, fe: 0.8, mg: 23, ph: 40, k: 325, vc: 4.9 }],
  ['aguacate', { ca: 12, zn: 0.64, fe: 0.55, mg: 29, ph: 52, k: 485, vk: 21, vc: 10, o3: 0.11 }],
  ['banano', { ca: 5, zn: 0.15, fe: 0.26, mg: 27, ph: 22, k: 358, vc: 8.7, va: 3 }],
  ['manzana', { ca: 6, zn: 0.04, fe: 0.12, mg: 5, ph: 11, k: 107, vc: 4.6 }],
  ['naranja', { ca: 40, zn: 0.07, fe: 0.1, mg: 10, ph: 14, k: 181, vc: 53, va: 11 }],
  ['mandarina', { ca: 37, zn: 0.07, fe: 0.15, mg: 12, ph: 20, k: 166, vc: 27, va: 34 }],
  ['limon', { ca: 26, zn: 0.06, fe: 0.6, mg: 8, ph: 16, k: 138, vc: 53 }],
  ['fresa', { ca: 16, zn: 0.14, fe: 0.41, mg: 13, ph: 24, k: 153, vc: 59 }],
  ['mango', { ca: 11, zn: 0.09, fe: 0.16, mg: 10, ph: 14, k: 168, vc: 36, va: 54 }],
  ['papaya', { ca: 20, zn: 0.08, fe: 0.25, mg: 21, ph: 10, k: 182, vc: 61, va: 47 }],
  ['pina', { ca: 13, zn: 0.12, fe: 0.29, mg: 12, ph: 8, k: 109, vc: 48 }],
  ['pera', { ca: 9, zn: 0.1, fe: 0.18, mg: 7, ph: 12, k: 116, vc: 4.3 }],
  ['uva', { ca: 10, zn: 0.07, fe: 0.36, mg: 7, ph: 20, k: 191, vc: 3.2, vk: 14.6 }],
  ['sandia', { ca: 7, zn: 0.1, fe: 0.24, mg: 10, ph: 11, k: 112, vc: 8.1, va: 28 }],
  ['melon', { ca: 9, zn: 0.18, fe: 0.21, mg: 12, ph: 15, k: 267, vc: 36.7, va: 169 }],
  ['kiwi', { ca: 34, zn: 0.14, fe: 0.31, mg: 17, ph: 34, k: 312, vc: 92.7, vk: 40 }],
  ['guayaba', { ca: 18, zn: 0.23, fe: 0.26, mg: 22, ph: 40, k: 417, vc: 228, va: 31 }],
  ['maracuya', { ca: 12, zn: 0.1, fe: 1.6, mg: 29, ph: 68, k: 348, vc: 30, va: 64 }],
  ['mora', { ca: 29, zn: 0.53, fe: 0.62, mg: 20, ph: 22, k: 162, vc: 21, vk: 19.8 }],
  ['durazno', { ca: 6, zn: 0.17, fe: 0.25, mg: 9, ph: 20, k: 190, vc: 6.6, va: 16 }],
  ['ciruela', { ca: 6, zn: 0.1, fe: 0.17, mg: 7, ph: 16, k: 157, vc: 9.5 }],
  ['guanabana', { ca: 14, zn: 0.1, fe: 0.6, mg: 21, ph: 27, k: 278, vc: 20.6 }],
  ['lulo', { ca: 8, fe: 0.6, mg: 13, ph: 20, k: 200, vc: 25, va: 30 }],
  ['coco', { ca: 14, zn: 1.1, fe: 2.4, mg: 32, ph: 113, k: 356, vc: 3.3 }],
  ['almendra', { ca: 269, zn: 3.1, fe: 3.7, mg: 270, ph: 481, k: 733 }],
  ['mani', { ca: 92, zn: 3.3, fe: 4.6, mg: 168, ph: 376, k: 705, vk: 0 }],
  ['nuez', { ca: 98, zn: 3.1, fe: 2.9, mg: 158, ph: 346, k: 441, o3: 9 }],
  ['maranon', { ca: 37, zn: 5.8, fe: 6.7, mg: 292, ph: 593, k: 660 }],
  ['pistacho', { ca: 105, zn: 2.2, fe: 3.9, mg: 121, ph: 490, k: 1025, vc: 5 }],
  ['chia', { ca: 631, zn: 4.6, fe: 7.7, mg: 335, ph: 860, k: 407, o3: 17.8 }],
  ['linaza', { ca: 255, zn: 4.3, fe: 5.7, mg: 392, ph: 642, k: 813, o3: 22.8 }],
  ['ajonjoli', { ca: 975, zn: 7.8, fe: 14.6, mg: 351, ph: 629, k: 468 }],
  ['girasol', { ca: 78, zn: 5, fe: 5.2, mg: 325, ph: 660, k: 645 }],
  ['aceite de oliva', { vk: 60, o3: 0.76 }],
  ['aceite', { vk: 25, o3: 0.9 }],
  ['chocolate', { ca: 70, zn: 2, fe: 4, mg: 150, ph: 200, k: 400 }],
  ['cacao', { ca: 128, zn: 6.8, fe: 13.9, mg: 499, ph: 734, k: 1524 }],
  ['bocadillo', { ca: 12, fe: 0.5, mg: 10, k: 120, vc: 20 }],
  ['arequipe', { ca: 250, zn: 0.9, mg: 20, ph: 200, k: 320, va: 60 }],
  ['miel', { ca: 6, fe: 0.42, mg: 2, ph: 4, k: 52 }],
  ['panela', { ca: 80, fe: 4, mg: 40, ph: 20, k: 330 }],
  ['helado', { ca: 128, zn: 0.7, mg: 14, ph: 105, k: 199, va: 118 }],
  ['galleta', { ca: 40, zn: 0.5, fe: 2, mg: 20, ph: 90, k: 100 }],
  ['torta', { ca: 70, zn: 0.5, fe: 1.3, mg: 15, ph: 150, k: 110, va: 80 }],
  ['cafe', { ca: 2, mg: 3, ph: 3, k: 49 }],
  ['te', { ca: 0, mg: 1, k: 21 }],
  ['gaseosa', { ca: 2, ph: 10, k: 2 }],
  ['malta', { ca: 10, fe: 0.1, mg: 6, ph: 30, k: 60 }],
  ['limonada', { ca: 4, mg: 3, k: 30, vc: 10 }],
  ['jugo', { ca: 8, mg: 8, k: 150, vc: 25, va: 15 }],
  ['agua', {}]
];
const CAT_MICRO = {
  0: { zn: 2, fe: 1.5, mg: 25, ph: 200, k: 300, b12: 1, o3: 0.05, ca: 20 },
  1: { fe: 1, mg: 25, ph: 100, k: 150, zn: 0.8, ca: 15 },
  2: { k: 200, vc: 20, mg: 12, ca: 12, va: 5 },
  3: { k: 300, vc: 25, mg: 25, ca: 45, fe: 1, vk: 80, va: 120 },
  4: { ca: 150, ph: 120, k: 140, zn: 0.6, b12: 0.5, va: 50, vd: 0.5 },
  5: { mg: 150, ph: 300, k: 400, fe: 2.5, zn: 2.5, ca: 100 },
  6: { k: 40, ca: 5 },
  7: { ca: 20, k: 80, mg: 15 },
  8: { zn: 1.2, fe: 1.3, mg: 25, ph: 140, k: 220, ca: 40, vc: 5 },
  9: { k: 150, mg: 20, ph: 120, fe: 1, zn: 0.8 },
  10: { fe: 1.2, mg: 20, ph: 90, k: 120, ca: 30, zn: 0.7 },
  11: { zn: 1.2, fe: 1.3, mg: 25, ph: 140, k: 220, ca: 40 },
  12: { k: 100, ca: 15 },
  13: {}
};
const ING_RX = ING_PROFILES.map(row => [new RegExp('\\b' + row[0].trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b'), row[1]]);
function estMicros(f) {
  const hay = norm((f.name || '') + ' ' + (f.alias || ''));
  for (const row of ING_RX) if (row[0].test(hay)) return row[1];
  return CAT_MICRO[f.cat] || {};
}
(function seedAllFoods() {
  if (typeof FOODS === 'undefined') return;
  const exact = {}; for (const id in MICRO_SEED) exact[id] = 1;
  let n = 0;
  for (const f of FOODS) {
    if (!f || !Array.isArray(f.v) || exact[f.id]) continue;
    const prof = estMicros(f);
    MICRO_NUTRIENTS.forEach(nu => { const i = NK.indexOf(nu.k); if (i >= 0 && (f.v[i] == null)) f.v[i] = prof[nu.k] != null ? prof[nu.k] : 0; });
    f.micEst = true; n++;
  }
})();

// Reemplazo del resumen: suma comida + aporte de medicamentos tomados; desglose por fuente con medicamentos.
function sourceBreakdownHTML() {
  const list = dayFoodList();
  const medN = dayMedNutri(S.viewKey);
  const kinds = ['comida', 'suplemento', 'medicamento'];
  const rowOf = (label, cnt, t) => '<div class="src-row"><span class="src-k">' + label + ' <small>(' + cnt + ')</small></span><span class="src-v">' +
    fmtInt(t.kcal || 0) + ' kcal · Ca ' + fmtNut('ca', t.ca) + ' · Zn ' + fmtNut('zn', t.zn) + ' · Fe ' + fmtNut('fe', t.fe) + ' mg</span></div>';
  let rows = '';
  for (const kd of kinds) {
    const items = list.filter(e => nutKind(e) === kd);
    let t = items.length ? sumN(items.map(e => e.n)) : null;
    if (kd === 'medicamento' && medN) { if (!t) { t = {}; for (const k of NK) t[k] = 0; } for (const k of NK) t[k] += medN[k] || 0; }
    const cnt = items.length + (kd === 'medicamento' && medN ? 1 : 0);
    if (cnt) rows += rowOf(KIND_LABEL[kd], cnt, t);
  }
  const onlyComida = !medN && list.every(e => nutKind(e) === 'comida');
  if (!list.length && !medN) return '';
  if (onlyComida) return '';
  return '<details class="nut-src"><summary>Por fuente (comida / suplemento / medicamento)</summary>' + rows + '</details>';
}
function nutriGridHTML(nu) {
  const medN = dayMedNutri(S.viewKey);
  const tot = {}; for (const k of NK) tot[k] = (Number(nu[k]) || 0) + (medN ? Number(medN[k]) || 0 : 0);
  const macros = NUTRIENTS.filter(n => n.grp !== 'micro');
  const micros = NUTRIENTS.filter(n => n.grp === 'micro');
  let h = '<div class="nutri" role="group" aria-label="Nutrientes del día">' + macros.map(n => nutRow(n, tot)).join('') + '</div>';
  h += '<details class="nut-micros"><summary>Micronutrientes</summary>' +
    '<div class="nutri">' + micros.map(n => nutRow(n, tot)).join('') + '</div>' +
    '<p class="hint">Metas (RDA) editables en Ajustes → Metas. Los micronutrientes de la lista son estimados a partir del ingrediente principal; para suplementos y medicamentos usa los valores de la etiqueta.' +
    (medN ? ' Incluye el aporte de los medicamentos marcados como tomados hoy.' : '') + '</p></details>';
  const glc = dayFoodList().filter(e => e && e.gl).length;
  h += '<div class="gluten-badge' + (glc ? ' has' : '') + '">🌾 ' + (glc ? 'Con gluten: ' + glc + (glc === 1 ? ' comida hoy' : ' comidas hoy') : 'Ninguna comida con gluten marcada hoy') + '</div>';
  h += sourceBreakdownHTML();
  return h;
}

secInstall();
boot();
