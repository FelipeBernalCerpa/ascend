'use strict';
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
function guideCardHTML() {
  const dis = S.readonly || !S.loaded.guide ? ' disabled' : '';
  const secs = GUIDE_SECTIONS.map(sec => [sec, guideList(sec.k)]);
  const any = secs.some(x => x[1].length);
  const sel = draft('gd-sec', 'rules');
  return '<section class="card" id="card-guide"><div class="card-h"><h2>Mis indicaciones</h2></div>' +
    (any ? secs.filter(x => x[1].length).map(([sec, items]) => '<p class="sh-sec">' + esc(sec.label) + '</p><ul class="rules' + (sec.k === 'avoid' ? ' avoid' : '') + '">' +
      items.map(it => {
        const tag = 'gd:' + it.id, armed = S.confirmDel === tag;
        return '<li class="gi"><div class="gi-x"><strong>' + esc(it.t) + '</strong>' + (it.d ? '<span>' + esc(it.d) + '</span>' : '') + '</div>' +
          '<button type="button" class="xbtn' + (armed ? ' armed' : '') + '" id="gdx-' + esc(it.id) + '" data-act="gd-del" data-sec="' + sec.k + '" data-id="' + esc(it.id) + '"' + dis + '>' + (armed ? '¿Quitar?' : 'Quitar') + '</button></li>';
      }).join('') + '</ul>').join('')
      : '<p class="empty">Anota aquí lo que te indiquen tu médico o tu nutricionista, para tenerlo a mano.</p>') +
    '<form class="form" data-form="guide" novalidate>' +
      '<div class="grid2"><div class="field"><label class="lbl" for="gd-sec">Sección</label><select id="gd-sec" data-draft' + dis + '>' + GUIDE_SECTIONS.map(s2 => '<option value="' + s2.k + '"' + (s2.k === sel ? ' selected' : '') + '>' + s2.label + '</option>').join('') + '</select></div>' +
      '<div class="field"><label class="lbl" for="gd-t">Indicación</label><input type="text" id="gd-t" data-draft maxlength="80" autocomplete="off" value="' + esc(draft('gd-t', '')) + '"' + dis + '></div></div>' +
      '<div class="field"><label class="lbl" for="gd-d">Detalle (opcional)</label><input type="text" id="gd-d" data-draft maxlength="240" autocomplete="off" value="' + esc(draft('gd-d', '')) + '"' + dis + '></div>' +
      '<p class="form-err">' + esc(S.formErr.guide || '') + '</p>' +
      '<button type="submit" class="btn" id="gd-add"' + dis + '>Agregar</button>' +
    '</form></section>';
}
function shopCardHTML() {
  const checked = S.shopping || {};
  const base = guideShop(), custom = S.shopCustom || [];
  const nDone = base.concat(custom).filter(x => checked[x.k]).length, nAll = base.length + custom.length;
  const dis = S.readonly || !S.loaded.shopping ? ' disabled' : '';
  const chip = x => '<button type="button" class="chip" id="s-' + esc(x.k) + '" data-act="shop" data-k="' + esc(x.k) + '" aria-pressed="' + !!checked[x.k] + '"' + dis + '><span class="tick"></span><span>' + esc(x.label) + '</span></button>';
  return '<section class="card" id="card-shop"><div class="card-h"><h2>Lista de compras</h2><span class="meta">' + (nAll ? nDone + ' de ' + nAll : 'Vacía') + '</span></div>' +
    (nAll ? '<div class="shop">' + base.map(chip).join('') +
      custom.map(x => '<div class="shop-row">' + chip(x) + '<button type="button" class="xbtn" id="sx-' + esc(x.k) + '" data-act="shop-del" data-k="' + esc(x.k) + '" aria-label="' + esc('Quitar ' + x.label) + '"' + dis + '>Quitar</button></div>').join('') + '</div>' : '') +
    '<div class="row shop-acts">' + (nDone ? '<button type="button" class="link" id="shop-clear" data-act="shop-clear"' + dis + '>Desmarcar todo</button>' : '') +
      '<button type="button" class="btn sm quiet" id="shop-suggest" data-act="shop-suggest"' + dis + '>Sugerir según mi plan</button></div>' +
    '<form class="form" data-form="shop" novalidate><div class="field"><label class="lbl" for="shop-new">Agregar producto</label><div class="add-row"><input type="text" id="shop-new" data-draft maxlength="80" value="' + esc(draft('shop-new', '')) + '"' + (S.readonly ? ' readonly' : '') + '><button type="submit" class="btn" id="shop-add"' + dis + '>Agregar</button></div></div>' +
    '<p class="form-err">' + esc(S.formErr.shop || '') + '</p></form></section>';
}
function shopSuggestions() {
  const g = profileGoal(), veg = hasDiet('vegetariana'), sg = hasDiet('sin_gluten'), sl = hasDiet('sin_lactosa');
  const L = ['Frutas enteras para la semana', 'Verduras para almuerzo y cena', 'Huevos', veg ? 'Tofu o queso campesino' : 'Pollo, pescado o carne magra', 'Fríjol, lenteja o garbanzo', 'Arroz, papa, plátano o yuca', sg ? 'Avena certificada sin gluten' : 'Avena en hojuelas', sl ? 'Leche y yogur deslactosados' : 'Leche y yogur natural', 'Frutos secos sin sal', 'Aceite de oliva o de canola'];
  if (g === 'subir' || g === 'musculo') L.push('Aguacate', 'Mantequilla de maní sin azúcar');
  if (g === 'subir') L.push(sl ? 'Leche entera deslactosada' : 'Leche entera');
  if (g === 'bajar') L.push('Verduras para picar entre comidas', 'Aromáticas sin azúcar');
  if (sg) L.push('Pan o pasta con sello «sin gluten»');
  return L;
}
function suggestShop() {
  if (S.readonly || !S.loaded.shopping) return;
  const have = new Set(guideShop().concat(S.shopCustom || []).map(x => norm(x.label)));
  const add = shopSuggestions().filter(l => !have.has(norm(l))).map(l => ({ k: 'sg-' + norm(l).replace(/ /g, '-').slice(0, 40), label: l }));
  if (!add.length) { toast('Tu lista ya tiene todo lo sugerido.'); return; }
  S.shopCustom = (S.shopCustom || []).concat(add).slice(0, MAX_SHOP);
  saveShop();
  renderGuia();
  toast('Agregué ' + add.length + ' productos a tu lista.');
}
function renderGuia() {
  const root = $('#view-guia');
  if (!root) return;
  swap(root, planCardHTML() + chatCardHTML() + guideCardHTML() + shopCardHTML() + tipsHTML());
  const log = $('#chat-log');
  if (log) log.scrollTop = log.scrollHeight;
}
function saveGuide() { if (S.loaded.guide) saver.queue('config/guide', clone(S.guide || {}), 200); }
function submitGuide(form) {
  if (S.readonly || !S.loaded.guide) return;
  const sec = (($('#gd-sec', form) || {}).value) || 'rules';
  const t = ((($('#gd-t', form) || {}).value) || '').trim().slice(0, 80);
  const dd = ((($('#gd-d', form) || {}).value) || '').trim().slice(0, 240);
  S.formErr.guide = '';
  if (!GUIDE_SECTIONS.some(x => x.k === sec)) return;
  if (!t) S.formErr.guide = 'Escribe la indicación.';
  else if (guideList(sec).length >= MAX_GUIDE) S.formErr.guide = 'Esa sección ya tiene ' + MAX_GUIDE + ' indicaciones.';
  if (S.formErr.guide) { renderGuia(); return; }
  S.guide = Object.assign({}, S.guide);
  S.guide[sec] = guideList(sec).concat({ id: uid(), t, d: dd });
  delete S.drafts['gd-t'];
  delete S.drafts['gd-d'];
  S.drafts['gd-sec'] = sec;
  saveGuide();
  renderGuia();
  focusEl('gd-t');
}

/* ---------- Ajustes: hábitos y privacidad ---------- */
function saveHabits(items) {
  S.habits = { items: items.slice(0, MAX_HABITS).map(x => {
    const o = { k: x.k, label: x.label };
    for (const f of ['freq', 'times', 'start', 'end', 'remind', 'note', 'createdAt']) if (x[f] != null && x[f] !== '' && x[f] !== 0) o[f] = x[f];
    if (Array.isArray(x.days) && x.days.length && x.freq === 'days') o.days = x.days.slice();
    if (o.freq === 'daily') delete o.freq;
    if (!o.freq || o.freq === 'days') delete o.times;
    return o;
  }) };
  saver.queue('config/habits', clone(S.habits), 200);
}
function habitsCardHTML() {
  const dis = S.readonly || !S.loaded.habits ? ' disabled' : '';
  const own = !!(S.habits && Array.isArray(S.habits.items));
  const list = habitsList();
  return '<section class="card" id="card-habits"><div class="card-h"><h2>Tus hábitos del día</h2><span class="meta">' + (own ? 'Personalizados' : 'Según tu objetivo') + '</span></div>' +
    (list.length ? '<div class="meds">' + list.map(x => {
      const tag = 'hb:' + x.k, armed = S.confirmDel === tag;
      return '<div class="med"><div class="med-info"><span class="med-n">' + esc(x.label) + '</span></div><div class="med-btns"><button type="button" class="xbtn' + (armed ? ' armed' : '') + '" id="hbx-' + esc(x.k) + '" data-act="hb-del" data-k="' + esc(x.k) + '"' + dis + '>' + (armed ? '¿Quitar?' : 'Quitar') + '</button></div></div>';
    }).join('') + '</div>' : '<p class="empty">Sin hábitos. Agrega los que quieras marcar cada día.</p>') +
    '<form class="form" data-form="habit" novalidate><div class="field"><label class="lbl" for="hb-new">Nuevo hábito</label><div class="add-row"><input type="text" id="hb-new" data-draft maxlength="60" autocomplete="off" value="' + esc(draft('hb-new', '')) + '"' + dis + '><button type="submit" class="btn" id="hb-add"' + dis + '>Agregar</button></div></div>' +
    '<p class="form-err">' + esc(S.formErr.habit || '') + '</p></form>' +
    (own ? '<button type="button" class="link" id="hb-reset" data-act="hb-reset"' + dis + '>Volver a los de mi objetivo</button>' : '') +
    '<p class="hint">Aparecen en Hoy para marcarlos cada día. Lo que ya marcaste no cambia.</p></section>';
}
