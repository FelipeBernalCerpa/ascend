'use strict';
async function importData(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file || S.readonly) return;
  let parsed = null;
  try { parsed = JSON.parse(await file.text()); } catch (e) { parsed = null; }
  const docs = parsed && parsed.docs && typeof parsed.docs === 'object' ? parsed.docs : null;
  if (!docs) { S.dataMsg = 'Ese archivo no es un respaldo de Ascend.'; renderAjustes(); return; }
  const rows = [];
  const now = new Date().toISOString();
  for (const path of Object.keys(docs)) {
    const seg = path.split('/');
    const data = docs[path];
    if (seg.length !== 2 || IMPORT_COLS.indexOf(seg[0]) < 0 || !/^[A-Za-z0-9_\-.~:@+]{1,200}$/.test(seg[1])) continue;
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
    rows.push({ user_id: store.userId, path, data, updated_at: now });
  }
  if (!rows.length) { S.dataMsg = 'El archivo no trae registros para importar.'; renderAjustes(); return; }
  S.dataMsg = 'Importando ' + rows.length + ' registros…';
  renderAjustes();
  try {
    for (let i = 0; i < rows.length; i += 200) {
      const res = await sb.from('docs').upsert(rows.slice(i, i + 200), { onConflict: 'user_id,path' });
      if (res.error) throw normErr(res.error, res.status);
    }
    await store.load();
    store.emit();
    S.dataMsg = 'Listo: se importaron ' + rows.length + ' registros.';
  } catch (e) {
    S.dataMsg = 'No se pudo importar. Revisa tu conexión e intenta de nuevo.';
  }
  renderAjustes();
}
async function wipeData() {
  saver.pend.clear();
  const res = await sb.from('docs').delete().eq('user_id', store.userId);
  if (res.error) { S.dataMsg = 'No se pudieron borrar los datos. Intenta de nuevo.'; renderAjustes(); return; }
  location.reload();
}

/* ---------- plan personal: perfil, objetivos y metas ---------- */
S.chat = { items: [], busy: false, err: '', remaining: null };
S.habits = null;
S.guide = null;

const prof = () => S.profile || {};
const profileGoal = () => (GOALS.some(g => g.k === prof().goal) ? prof().goal : '');
const hasCond = k => Array.isArray(prof().cond) && prof().cond.indexOf(k) >= 0;
const hasDiet = k => Array.isArray(prof().diet) && prof().diet.indexOf(k) >= 0;
const goalLabel = k => (GOALS.find(g => g.k === k) || {}).label || '';
const labelsOf = (list, keys) => list.filter(x => (keys || []).indexOf(x.k) >= 0).map(x => x.label);
function userAge() { return ageOn(prof().birth, todayKey()); }
/* cómo se lee cada meta según la persona: con enfermedad renal la proteína es un tope; para adultos que quieren bajar de peso, las calorías también */
function goalKind(k) {
  if (k === 'p') return hasCond('renal') ? 'max' : 'min';
  if (k === 'kcal') { const a = userAge(); return profileGoal() === 'bajar' && a != null && a >= 18 ? 'max' : 'meta'; }
  return GOAL_KIND[k];
}
function habitsList() {
  if (S.habits && Array.isArray(S.habits.items)) return S.habits.items.filter(x => x && x.k && x.label);
  return HABITS_BY_GOAL[profileGoal() || 'mantener'];
}
function guideShop() { return S.guide && Array.isArray(S.guide.shop) ? S.guide.shop.filter(x => x && x.k && x.label) : []; }
function guideList(sec) { return S.guide && Array.isArray(S.guide[sec]) ? S.guide[sec].filter(x => x && x.id && x.t) : []; }

/* Energía: adolescentes (13 a 17) con la ecuación EER del IOM (2005), que ya incluye el crecimiento;
   adultos con Mifflin-St Jeor por factor de actividad. Los topes siguen OMS e IOM. */
function computePlan(i) {
  const age = ageOn(i.birth, todayKey());
  if (i.sex !== 'm' && i.sex !== 'f') return { err: 'Elige tu sexo: lo usan las fórmulas de calorías.' };
  if (age == null) return { err: 'Escribe tu fecha de nacimiento.' };
  if (age < 13) return { err: 'Ascend está pensada para personas de 13 años o más. Pide a tu pediatra que te ayude con tus metas.' };
  const w = parseNum(i.weight), h = parseNum(i.height);
  if (!(h >= 100 && h <= 230)) return { err: 'Escribe tu estatura en centímetros, entre 100 y 230.' };
  if (!(w >= 25 && w <= 300)) return { err: 'Escribe tu peso en kilos, entre 25 y 300.' };
  if (!GOALS.some(g => g.k === i.goal)) return { err: 'Elige tu objetivo.' };
  const ai = ACTIVITY.findIndex(a => a.k === i.activity);
  if (ai < 0) return { err: 'Elige tu nivel de actividad.' };
  const cond = k => (i.cond || []).indexOf(k) >= 0;
  const teen = age < 18, hm = h / 100, bmi = w / (hm * hm), goal = i.goal, fast = i.pace === 'moderado';
  let maint;
  if (teen) {
    const pa = i.sex === 'm' ? [1, 1.13, 1.26, 1.42][ai] : [1, 1.16, 1.31, 1.56][ai];
    maint = i.sex === 'm' ? 88.5 - 61.9 * age + pa * (26.7 * w + 903 * hm) + 25 : 135.3 - 30.8 * age + pa * (10 * w + 934 * hm) + 25;
  } else {
    maint = (10 * w + 6.25 * h - 5 * age + (i.sex === 'm' ? 5 : -161)) * [1.2, 1.375, 1.55, 1.725][ai];
  }
  const notes = [];
  const r = { age, teen, bmi: r1(bmi), maint: r10(maint), notes, hideCal: cond('tca') };
  r.water = cond('renal') ? null : Math.min(3500, Math.max(1500, Math.round(w * 35 / 250) * 250)) + (cond('embarazo') ? 500 : 0);
  r.sleep = teen ? 9 : 8;
  r.steps = Math.min(12000, [6000, 7500, 9000, 10000][ai] + (goal === 'bajar' && !teen ? 1000 : 0));
  if (r.hideCal) {
    r.clear = NK.filter(k => k !== 'na');
    notes.push('Con un trastorno de la conducta alimentaria, contar calorías puede hacer daño. Ascend no te pone metas de calorías, nutrientes ni peso: arma esas metas con tu equipo de salud.');
    notes.push('Si te sientes mal, en Colombia puedes llamar a la Línea 106 (Bogotá) o a la 192, opción 4. En una emergencia, al 123.');
    for (const k of NK) r[k] = null;
    return r;
  }
  const preg = cond('embarazo');
  let adj = 0;
  if (goal === 'bajar') {
    if (teen) notes.push('Estás creciendo: Ascend no te pone déficit de calorías. Tu plan cuida el peso con hábitos; si necesitas bajar, hazlo con tu pediatra o nutricionista.');
    else if (cond('embarazo')) notes.push('En embarazo o lactancia no se hace déficit de calorías: tu plan queda en mantenimiento.');
    else if (bmi < 18.5) notes.push('Tu IMC está por debajo de 18,5, así que bajar de peso no es sano para ti. Tu plan queda en mantenimiento; habla con tu médico.');
    else adj = fast ? -500 : -250;
  } else if (goal === 'subir') adj = fast ? 450 : 250;
  else if (goal === 'musculo') adj = fast ? 300 : 150;
  if (preg) adj = 0;
  let kcal = r10(maint + adj);
  const floor = i.sex === 'm' ? 1500 : 1200;
  if (adj < 0 && kcal < floor) {
    if (maint <= floor) { kcal = r10(maint); adj = 0; notes.push('Tu gasto estimado ya es bajo, así que bajar de peso sin supervisión no es seguro para ti. Tu plan queda en mantenimiento; habla con tu médico.'); }
    else { kcal = floor; adj = kcal - maint; notes.push('Tus calorías quedan en ' + fmtInt(floor) + ', el mínimo seguro sin supervisión médica.'); }
  }
  r.kcal = kcal;
  const gkg = teen ? (goal === 'musculo' ? 1.2 : 1.0) : ({ bajar: 1.4, mantener: 1.0, subir: 1.2, musculo: 1.6 })[goal];
  const pCalc = Math.round(w * (preg ? 1.1 : gkg));
  r.p = cond('renal') ? null : pCalc;
  r.f = Math.round(kcal * (goal === 'subir' ? 0.33 : goal === 'musculo' ? 0.28 : 0.3) / 9);
  r.sf = Math.round(kcal * 0.1 / 9);
  r.c = cond('diabetes') ? null : Math.max(0, Math.round((kcal - pCalc * 4 - r.f * 9) / 4));
  r.s = Math.round(kcal * (goal === 'bajar' || cond('diabetes') ? 0.12 : 0.15) / 4);
  r.fi = Math.min(38, Math.max(20, Math.round(kcal * 14 / 1000)));
  r.na = cond('renal') ? null : cond('hta') ? 1500 : 2000;
  if (preg) {
    r.clear = ['kcal', 'c', 'f', 'sf', 's'];
    for (const k of r.clear) r[k] = null;
    r.fi = 28;
    r.hideKcal = true;
  }
  const kg = Math.abs(adj) * 7 / 7700;
  if (adj < 0) notes.push('Con este plan bajarías cerca de ' + fmtNum(kg, 1, 1) + ' kg por semana.');
  else if (adj > 0) notes.push((teen ? 'Además de lo que necesitas para crecer, ' : '') + 'el plan suma ' + fmtInt(adj) + ' kcal al día: cerca de ' + fmtNum(kg, 1, 1) + ' kg por semana.');
  if (teen) notes.push('Para menores de 18 Ascend usa la ecuación de energía del IOM, que incluye lo que tu cuerpo gasta en crecer.');
  if (cond('renal')) notes.push('Con enfermedad renal, la proteína, el sodio y los líquidos los define tu nefrólogo: Ascend deja esas metas como las tengas.');
  if (cond('diabetes')) notes.push('Con diabetes, los carbohidratos los define tu médico: Ascend no los fija.');
  if (cond('hta')) notes.push('Con presión alta, el sodio queda en 1.500 mg salvo que tu médico te indique otra cifra.');
  if (preg) notes.push('En embarazo o lactancia las calorías cambian según el trimestre o la lactancia: esa cifra te la da tu médico. Ascend fija proteína (1,1 g por kilo), fibra, agua, sueño y pasos.');
  notes.push('Pésate cada 2 a 4 semanas; si el peso no se mueve como esperas, recalcula.');
  return r;
}

/* ---------- hoja: asistente guiado ---------- */
function openPlan() {
  if (S.readonly) return;
  const p = prof(), tk = todayKey();
  const w = latestOn('weight', tk), h = latestOn('height', tk);
  openSheet({ kind: 'plan', step: 'form', err: '', res: null, in: {
    sex: p.sex === 'm' || p.sex === 'f' ? p.sex : '', birth: p.birth || '',
    height: h ? numText(h) : '', weight: w ? numText(w) : '',
    goal: profileGoal(), pace: p.pace === 'moderado' ? 'moderado' : 'suave',
    activity: ACTIVITY.some(a => a.k === p.activity) ? p.activity : '',
    diet: Array.isArray(p.diet) ? p.diet.slice() : [], cond: Array.isArray(p.cond) ? p.cond.slice() : []
  } });
}
const plTgl = (f, x, on, multi) => '<button type="button" class="tgl" id="pl-' + f + '-' + x.k + '" data-act="' + (multi ? 'pl-tog' : 'pl-set') + '" data-f="' + f + '" data-v="' + x.k + '" aria-pressed="' + !!on + '">' + esc(x.label) + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + '</button>';
function shPlanFormHTML(st) {
  const i = st.in, tk = todayKey();
  const pace = i.goal && i.goal !== 'mantener';
  return sheetTop('Tu plan') +
    '<p class="prose">Unas preguntas y Ascend calcula tus metas de calorías, nutrientes, agua, sueño y pasos. Puedes cambiarlas cuando quieras.</p>' +
    '<form class="sh-form" data-form="sh-plan" novalidate>' +
      '<p class="sh-sec">Sobre ti</p>' +
      '<div class="field"><span class="lbl">Sexo</span><div class="toggles">' + [{ k: 'm', label: 'Hombre' }, { k: 'f', label: 'Mujer' }].map(x => plTgl('sex', x, i.sex === x.k)).join('') + '</div></div>' +
      '<div class="field"><label class="lbl" for="pl-birth">Fecha de nacimiento</label><input type="date" id="pl-birth" data-pl="birth" min="1900-01-01" max="' + tk + '" value="' + esc(i.birth) + '"></div>' +
      '<div class="grid2">' +
        '<div class="field"><label class="lbl" for="pl-height">Estatura (cm)</label><input type="text" inputmode="decimal" id="pl-height" data-pl="height" autocomplete="off" value="' + esc(i.height) + '"></div>' +
        '<div class="field"><label class="lbl" for="pl-weight">Peso (kg)</label><input type="text" inputmode="decimal" id="pl-weight" data-pl="weight" autocomplete="off" value="' + esc(i.weight) + '"></div>' +
      '</div>' +
      '<p class="sh-sec">Tu objetivo</p>' +
      '<div class="toggles wide">' + GOALS.map(x => plTgl('goal', x, i.goal === x.k)).join('') + '</div>' +
      (pace ? '<div class="field"><span class="lbl">Ritmo</span><div class="toggles">' + PACES.map(x => plTgl('pace', x, i.pace === x.k)).join('') + '</div></div>' : '') +
      '<p class="sh-sec">Actividad</p>' +
      '<div class="toggles wide">' + ACTIVITY.map(x => plTgl('activity', x, i.activity === x.k)).join('') + '</div>' +
      '<p class="sh-sec">Alimentación (opcional)</p>' +
      '<div class="toggles">' + DIETS.map(x => plTgl('diet', x, i.diet.indexOf(x.k) >= 0, true)).join('') + '</div>' +
      '<p class="sh-sec">Salud (opcional)</p>' +
      '<div class="toggles">' + CONDITIONS.map(x => plTgl('cond', x, i.cond.indexOf(x.k) >= 0, true)).join('') + '</div>' +
      '<p class="hint">Marca una condición solo si la tienes diagnosticada: cambia qué metas pone Ascend y cuáles deja a tu médico. Todo queda solo en tu cuenta.</p>' +
      '<p class="form-err" id="sh-err">' + esc(st.err || '') + '</p>' +
      '<button type="submit" class="btn" id="pl-calc">Calcular mi plan</button>' +
    '</form>';
}
function planRows(v, kinds) {
  const KW = { meta: '', max: ' · máx.', min: ' · mín.' };
  const rows = NUTRIENTS.map(n => [n.label + KW[kinds(n.k)], v[n.k] == null ? null : fmtNut(n.k, v[n.k]) + ' ' + n.unit]);
  rows.push(['Agua', v.water == null ? null : fmtInt(v.water) + ' ml'], ['Sueño', fmtNum(v.sleep, 1) + ' h'], ['Pasos', fmtInt(v.steps)]);
  return '<div class="prev-g">' + rows.map(x => '<span class="pv"><span>' + x[0] + '</span><b>' + (x[1] == null ? 'Tu médico' : x[1]) + '</b></span>').join('') + '</div>';
}
function shPlanResultHTML(st) {
  const r = st.res, i = st.in;
  const kinds = k => (k === 'p' ? ((i.cond || []).indexOf('renal') >= 0 ? 'max' : 'min') : k === 'kcal' ? (i.goal === 'bajar' && !r.teen ? 'max' : 'meta') : GOAL_KIND[k]);
  return sheetTop('Tu plan', true) +
    '<p class="plan-sub">' + esc(goalLabel(i.goal)) + ' · ' + r.age + ' años · ' + esc(numText(r1(parseNum(i.height)))) + ' cm · ' + esc(numText(r1(parseNum(i.weight)))) + ' kg</p>' +
    (r.hideCal || r.hideKcal ? '' : '<div class="plan-top"><span class="big">' + fmtInt(r.kcal) + '</span><span class="unit">kcal al día</span></div>' +
      '<p class="hint">Tu gasto estimado es de ' + fmtInt(r.maint) + ' kcal al día.</p>') +
    '<div class="prev"><p class="sh-sec">Tus metas diarias</p>' + planRows({ ...r, water: r.water, sleep: r.sleep, steps: r.steps }, kinds) + '</div>' +
    '<ul class="plan-notes">' + r.notes.map(n => '<li>' + esc(n) + '</li>').join('') + '</ul>' +
    '<form class="sh-form" data-form="sh-plansave" novalidate>' +
      '<p class="form-err" id="sh-err">' + esc(st.err || '') + '</p>' +
      '<button type="submit" class="btn" id="pl-save"' + (S.readonly ? ' disabled' : '') + '>Guardar mi plan</button>' +
    '</form>' +
    '<p class="hint">Son estimaciones con fórmulas de referencia (IOM para adolescentes, Mifflin-St Jeor para adultos, topes de la OMS). No reemplazan a tu médico ni a tu nutricionista.</p>';
}
function shPlanHTML(st) { return st.step === 'result' && st.res ? shPlanResultHTML(st) : shPlanFormHTML(st); }
function submitPlanForm() {
  const st = S.sheet;
  if (!st || st.kind !== 'plan') return;
  for (const f of ['birth', 'height', 'weight']) { const el = document.getElementById('pl-' + f); if (el) st.in[f] = el.value; }
  const r = computePlan(st.in);
  if (r.err) { sheetErr(st, r.err); return; }
  st.res = r;
  goStep('result');
}
function savePlan() {
  const st = S.sheet;
  if (!st || st.kind !== 'plan' || !st.res || S.readonly) return;
  if (!S.loaded.profile || !S.loaded.settings || !S.loaded.measures) { sheetErr(st, 'Todavía se están cargando tus datos. Intenta en unos segundos.'); return; }
  const r = st.res, i = st.in, tk = todayKey();
  S.profile = Object.assign({}, S.profile, {
    sex: i.sex, birth: i.birth, goal: i.goal, pace: i.pace, activity: i.activity,
    diet: i.diet.slice(), cond: i.cond.slice(), onboarded: true,
    plan: { at: tk, maint: r.maint, kcal: r.kcal == null ? null : r.kcal }
  });
  saveProfile();
  const w = r1(parseNum(i.weight)), h = r1(parseNum(i.height));
  if (latestOn('weight', tk) !== w || latestOn('height', tk) !== h) {
    const ex = S.measures.find(m => m.date === tk);
    if (ex) { ex.weight = w; ex.height = h; putDoc('measures/' + ex.id, strip(ex)); }
    else {
      const id = store.newId('measures'), data = { date: tk, weight: w, height: h, createdAt: Date.now() };
      S.measures.push(Object.assign({ id }, data));
      S.measures.sort(byDate);
      putDoc('measures/' + id, data);
    }
  }
  const nutri = Object.assign({}, S.settings.nutri);
  for (const k of NK) {
    if (r[k] != null) nutri[k] = r[k];
    else if ((r.clear || []).indexOf(k) >= 0) delete nutri[k];
  }
  S.settings.nutri = nutri;
  if (r.water != null) S.settings.waterGoal = r.water;
  S.settings.sleepGoal = r.sleep;
  S.settings.stepGoal = r.steps;
  saveSettings();
  closeSheet();
  if (S.tab !== 'guia') setTab('guia'); else renderGuia();
  toast('Plan guardado. Tus metas ya aparecen en Hoy.');
}

/* ---------- pestaña Plan ---------- */
function planCardHTML() {
  const p = prof(), dis = S.readonly || !S.loaded.profile ? ' disabled' : '';
  if (!profileGoal()) {
    return '<section class="card" id="card-plan"><div class="card-h"><h2>Arma tu plan</h2></div>' +
      '<p class="prose">Responde unas preguntas y Ascend calcula tus metas de calorías, nutrientes, agua, sueño y pasos según tu edad, tu cuerpo y tu objetivo.</p>' +
      '<button type="button" class="btn" id="plan-start" data-act="plan-open"' + dis + '>Empezar</button></section>';
  }
  const s = S.settings, g = s.nutri || {};
  const v = { water: s.waterGoal, sleep: s.sleepGoal, steps: s.stepGoal || null };
  for (const k of NK) v[k] = g[k] == null ? null : g[k];
  const rows = NUTRIENTS.filter(n => v[n.k] != null).map(n => [n.label + ({ meta: '', max: ' · máx.', min: ' · mín.' })[goalKind(n.k)], fmtNut(n.k, v[n.k]) + ' ' + n.unit]);
  rows.push(['Agua', fmtInt(v.water) + ' ml'], ['Sueño', fmtNum(v.sleep, 1) + ' h']);
  if (v.steps) rows.push(['Pasos', fmtInt(v.steps)]);
  const extra = [labelsOf(ACTIVITY, [p.activity]).map(x => 'actividad ' + x.toLowerCase()).join(''), labelsOf(DIETS, p.diet).join(', ').toLowerCase()].filter(Boolean).join(' · ');
  return '<section class="card" id="card-plan"><div class="card-h"><h2>Tu plan</h2><span class="meta">' + esc(goalLabel(p.goal)) + '</span></div>' +
    (extra ? '<p class="plan-sub">' + esc(extra.charAt(0).toUpperCase() + extra.slice(1)) + (p.plan && p.plan.at ? ' · calculado el ' + fmtShort(p.plan.at) : '') + '</p>' : '') +
    '<div class="prev-g plan-g">' + rows.map(x => '<span class="pv"><span>' + x[0] + '</span><b>' + x[1] + '</b></span>').join('') + '</div>' +
    (hasCond('tca') ? '<p class="hint">Sin metas de calorías: tu equipo de salud las define contigo.</p>' : '') +
    '<div class="row plan-actions"><button type="button" class="btn sm" id="plan-redo" data-act="plan-open"' + dis + '>Recalcular</button><button type="button" class="btn sm quiet" id="plan-adjust" data-go="ajustes">Ajustar a mano</button></div></section>';
}
function tipsHTML() {
  const g = profileGoal(), age = userAge(), teen = age != null && age < 18;
  const T = [
    ['Medio plato de verduras', 'En almuerzo y cena: la mitad verdura, un cuarto proteína y un cuarto arroz, papa, plátano o similar.'],
    ['Agua como bebida principal', 'Gaseosas y jugos con azúcar suman calorías sin llenarte.'],
    ['Sueño', teen ? 'Entre 8 y 10 horas: a tu edad el cuerpo crece y se recupera durmiendo.' : 'Entre 7 y 9 horas; dormir poco aumenta el hambre al día siguiente.'],
    ['Movimiento', teen ? '60 minutos de actividad al día, con ejercicio fuerte 3 veces por semana.' : '150 minutos a la semana de actividad moderada y fuerza 2 días.']
  ];
  if (g === 'bajar' && !teen) T.push(['Déficit pequeño y constante', 'Entre 0,25 y 0,5 kg por semana se sostiene mejor que una dieta estricta.'], ['Proteína en cada comida', 'Te llena más y cuida el músculo mientras bajas.']);
  if (g === 'bajar' && teen) T.push(['Hábitos antes que dieta', 'Mientras creces, mejora lo que comes sin restringir calorías; tu pediatra te guía si necesitas bajar.']);
  if (g === 'subir') T.push(['Grasas buenas para sumar', 'Aceite de oliva, aguacate, frutos secos y mantequilla de maní suben calorías sin llenarte tanto.'], ['Batidos', 'Leche, fruta, avena y mantequilla de maní. Están listos en Hoy → Agregar → Comidas frecuentes.'], ['No te saltes comidas', 'Tres comidas y dos o tres refrigerios al día.']);
  if (g === 'musculo') T.push(['Fuerza 3 a 4 veces por semana', 'El músculo crece con el entrenamiento; la comida le da el material.'], ['Proteína repartida', 'Tres o cuatro comidas con proteína rinden más que una sola grande.']);
  if (g === 'mantener') T.push(['Pésate cada semana', 'Si subes o bajas más de 1 kg en un mes sin buscarlo, recalcula tu plan.']);
  if (teen) T.push(['Nada de suplementos de gimnasio', 'Proteína en polvo, creatina o quemadores, solo si tu médico los indica.']);
  if (hasDiet('sin_gluten')) T.push(['Busca el sello «sin gluten»', 'En avena, panes, pastas y galletas: la avena común suele contaminarse con trigo.']);
  if (hasDiet('vegetariana')) T.push(['Proteína vegetal', 'Combina legumbres con cereales y pregunta a tu médico por la vitamina B12.']);
  if (hasDiet('sin_lactosa')) T.push(['Calcio sin lactosa', 'La leche y el yogur deslactosados conservan el calcio.']);
  if ((prof().cond || []).length) T.push(['Tu médico va primero', 'Con una condición de salud, las cifras de tu médico mandan sobre las de Ascend.']);
  if (hasCond('tca')) T.push(['Tu bienestar primero', 'Si registrar comida te genera ansiedad, deja esa parte y usa Ascend para medicamentos, sueño y citas.']);
  return '<section class="card" id="card-tips"><div class="card-h"><h2>Lo básico</h2></div><ul class="rules">' +
    T.map(t => '<li><strong>' + esc(t[0]) + '</strong><span>' + esc(t[1]) + '</span></li>').join('') + '</ul></section>';
}
