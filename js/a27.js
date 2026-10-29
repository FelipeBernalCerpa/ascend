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

secInstall();
boot();
