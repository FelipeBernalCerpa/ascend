'use strict';
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
function refreshEnergy() {
  const c = hoyCtx();
  const en = energyFor(c.k, c.day);
  const so = $('#steps-out'); if (so) so.innerHTML = stepsOutHTML(en);
  const eb = $('#energy-box'); if (eb) eb.innerHTML = energyBoxHTML(c, en);
  const m = $('#card-meters'); if (m) replaceEl(m, metersHTML(c));
}

/* ---------- PROGRESO: nutrición día a día ---------- */
function nutri7HTML() {
  if (!S.daysLoaded) return '';
  const tk = todayKey(), rows = [];
  let any = false;
  for (let i = 0; i < 7; i++) {
    const k = addDays(tk, -i), d = S.days[k], nu = dayNutri(d);
    const en = d ? energyFor(k, d) : null;
    if (nu.count) any = true;
    const dd = parseKey(k);
    const lbl = i === 0 ? 'Hoy' : i === 1 ? 'Ayer' : WD[dd.getDay()].slice(0, 3) + ' ' + dd.getDate();
    rows.push('<tr><td><button type="button" class="link inline" id="n7-' + k + '" data-act="goto-day" data-day="' + k + '">' + lbl + '</button></td>' +
      (nu.count ? '<td>' + fmtInt(nu.kcal) + '</td><td>' + fmtNut('p', nu.p) + '</td><td>' + fmtNut('f', nu.f) + '</td><td>' + fmtInt(nu.na) + '</td>'
        : '<td>—</td><td>—</td><td>—</td><td>—</td>') +
      '<td>' + (en && en.total != null ? fmtInt(r10(en.total)) : '—') + '</td></tr>');
  }
  return '<section class="card" id="card-n7"><div class="card-h"><h2>Nutrición día a día</h2><span class="meta">Últimos 7 días</span></div>' +
    (any ? '' : '<p class="empty">Registra lo que comes en Hoy y aquí verás tus totales de cada día.</p>') +
    '<div class="tbl-wrap"><table class="tbl stats n7"><thead><tr><th>Día</th><th>kcal</th><th>Prot.</th><th>Grasa</th><th>Sodio</th><th>Quem.</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' +
    '<p class="hint">Proteína y grasa en gramos, sodio en mg. «Quem.» son las calorías quemadas estimadas. Toca un día para ver todo lo que comiste, con carbohidratos, azúcar, fibra y saturadas.</p></section>';
}

/* ---------- AJUSTES: perfil, metas de nutrición y alimentos propios ---------- */
function saveProfile() { if (S.loaded.profile) saver.queue('config/profile', clone(S.profile), 300); }
function profileCardHTML() {
  const p = S.profile || {}, dis = S.readonly || !S.loaded.profile ? ' disabled' : '';
  const tk = todayKey();
  const age = ageOn(p.birth, tk), w = latestOn('weight', tk), h = latestOn('height', tk), bmr = bmrOf(p.sex, age, w);
  const facts = [];
  if (age != null) facts.push(age + (age === 1 ? ' año' : ' años'));
  if (w) facts.push(fmtNum(w, 1, 1) + ' kg');
  if (h) facts.push(fmtNum(h, 1, 1) + ' cm');
  return '<section class="card" id="card-profile"><div class="card-h"><h2>Tu perfil</h2><span class="meta">Para calcular calorías</span></div>' +
    '<div class="grid2"><div class="field"><span class="lbl">Sexo</span><div class="toggles">' +
      [['m', 'Hombre'], ['f', 'Mujer']].map(x => '<button type="button" class="tgl" id="prof-' + x[0] + '" data-act="prof-sex" data-v="' + x[0] + '" aria-pressed="' + (p.sex === x[0]) + '"' + dis + '>' + x[1] + '</button>').join('') + '</div></div>' +
    '<div class="field"><label class="lbl" for="prof-birth">Fecha de nacimiento</label><input type="date" id="prof-birth" data-prof="birth" min="1900-01-01" max="' + tk + '" value="' + esc(p.birth || '') + '"' + dis + '></div></div>' +
    '<p class="hint">' + (facts.length ? esc(facts.join(' · ')) + (w || h ? ' (peso y estatura salen de Progreso)' : '') + '. ' : '') +
      (bmr ? 'Gasto en reposo estimado: ' + fmtInt(r10(bmr)) + ' kcal al día (ecuación de Schofield, FAO/OMS).' : 'Con sexo, fecha de nacimiento y peso, Ascend estima las calorías que quemas.') + '</p>' + planProfileHTML() + '</section>';
}
function goalText(k, v) { return k === 'kcal' || k === 'na' ? String(Math.round(v)) : numText(v); }
function goalsCardHTML() {
  const s = S.settings, g = s.nutri || {}, dis = S.readonly || !S.loaded.settings ? ' disabled' : '';
  const KL = { meta: 'meta', max: 'máximo', min: 'mínimo' };
  return '<section class="card" id="card-goals"><div class="card-h"><h2>Metas de nutrición</h2><span class="meta">Opcionales</span></div><div class="grid2 goals">' +
    NUTRIENTS.map(n => '<div class="field"><label class="lbl" for="goal-' + n.k + '">' + n.label + ' · ' + KL[goalKind(n.k)] + ' (' + n.unit + ')</label>' +
      '<input type="text" inputmode="' + (n.k === 'kcal' || n.k === 'na' ? 'numeric' : 'decimal') + '" id="goal-' + n.k + '" data-set="nutri.' + n.k + '" placeholder="Sin meta" autocomplete="off" value="' + (g[n.k] ? esc(goalText(n.k, g[n.k])) : '') + '"' + dis + '></div>').join('') +
    '<div class="field"><label class="lbl" for="goal-steps">Pasos al día · meta</label><input type="text" inputmode="numeric" id="goal-steps" data-set="stepGoal" placeholder="Sin meta" autocomplete="off" value="' + (s.stepGoal ? esc(String(s.stepGoal)) : '') + '"' + dis + '></div>' +
    '</div><p class="hint">El asistente de la pestaña Plan las calcula por ti. Si tienes una condición médica (riñón, diabetes, presión alta, embarazo), usa las cifras de tu médico o nutricionista.</p></section>';
}
function myFoodsCardHTML() {
  const dis = S.readonly || !S.loaded.foods ? ' disabled' : '';
  const disR = S.readonly || !S.loaded.recipes ? ' disabled' : '';
  const foods = S.foods.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'));
  const recs = S.recipes.slice().sort(byCreated);
  const fRow = x => {
    const tag = 'myf:' + x.id, armed = S.confirmDel === tag;
    return '<div class="med"><div class="med-info"><span class="med-n">' + esc(x.name || 'Alimento') + (x.brand ? ' <small>' + esc(x.brand) + '</small>' : '') + '</span>' +
      '<span class="med-s">' + fmtInt(Array.isArray(x.v) ? x.v[0] : 0) + ' kcal por 100 ' + unitOf(x.liquid) + ' · ' + (x.src === 'off' ? 'Open Food Facts' : 'creado por ti') + '</span></div>' +
      '<div class="med-btns">' + (x.src !== 'off' ? '<button type="button" class="xbtn" id="mfe-' + esc(x.id) + '" data-act="myfood-edit" data-id="' + esc(x.id) + '"' + dis + '>Editar</button>' : '') +
      '<button type="button" class="xbtn' + (armed ? ' armed' : '') + '" id="mfx-' + esc(x.id) + '" data-act="myfood-del" data-id="' + esc(x.id) + '"' + dis + '>' + (armed ? '¿Eliminar?' : 'Eliminar') + '</button></div></div>';
  };
  const rRow = r => {
    const tag = 'rec:' + r.id, armed = S.confirmDel === tag;
    const items = Array.isArray(r.items) ? r.items : [];
    const kc = items.reduce((s, it) => s + (Number(it.n && it.n.kcal) || 0), 0);
    return '<div class="med"><div class="med-info"><span class="med-n">' + esc(r.name || 'Comida frecuente') + '</span><span class="med-s">' + items.length + (items.length === 1 ? ' alimento' : ' alimentos') + ' · ' + fmtInt(kc) + ' kcal</span></div>' +
      '<div class="med-btns"><button type="button" class="xbtn' + (armed ? ' armed' : '') + '" id="rx-' + esc(r.id) + '" data-act="rec-del" data-id="' + esc(r.id) + '"' + disR + '>' + (armed ? '¿Eliminar?' : 'Eliminar') + '</button></div></div>';
  };
  return '<section class="card" id="card-myfoods"><div class="card-h"><h2>Tus alimentos y comidas frecuentes</h2></div>' +
    '<button type="button" class="btn add-top" id="food-new" data-act="food-new"' + dis + '>Crear alimento</button>' +
    (foods.length ? '<div class="meds">' + foods.map(fRow).join('') + '</div>' : '<p class="empty">Aún no tienes alimentos propios. Los productos que escanees o crees aparecen aquí.</p>') +
    (recs.length ? '<p class="sh-sec">Comidas frecuentes</p><div class="meds">' + recs.map(rRow).join('') + '</div>' : '') +
    '<p class="hint">Borrar un alimento no cambia lo que ya registraste.</p></section>';
}

/* ---------- hoja para agregar comida y ejercicio ---------- */
function mealOptions(sel) { return FOOD_MEALS.map(m => '<option value="' + m.k + '"' + (m.k === sel ? ' selected' : '') + '>' + m.label + '</option>').join(''); }
function sheetTop(title, back) {
  return '<div class="sh-top">' + (back ? '<button type="button" class="navbtn sm" id="sh-back" data-act="sh-back" aria-label="Volver">' + ICON.left + '</button>' : '') +
    '<h2 class="sh-t" id="sheet-t">' + esc(title) + '</h2><button type="button" class="btn sm quiet" id="sh-close" data-act="sheet-close">Listo</button></div>';
}
function resMeta(f) {
  if (f.src === 'rec') return '1 porción · ' + fmtInt(f.v[0] * f.units[0].g / 100) + ' kcal · comida frecuente';
  const u = f.units[0], lu = unitOf(f.liquid);
  return fmtInt(f.v[0]) + ' kcal por 100 ' + lu + (u ? ' · ' + u.u + ' ' + fmtNum(u.g, 1) + ' ' + lu : '') + (f.src === 'my' ? ' · tuyo' : f.src === 'off' ? ' · empacado' : '');
}
function resBtn(f) {
  return '<button type="button" class="fres" data-act="sh-pick" data-src="' + f.src + '" data-ref="' + esc(f.id) + '"><span class="fres-n">' + esc(f.name) + (f.brand ? ' <small>' + esc(f.brand) + '</small>' : '') + '</span><span class="fres-m">' + esc(resMeta(f)) + '</span></button>';
}
function offHitBtn(h) {
  const meta = [h.qty, h.kcal != null ? fmtInt(h.kcal) + ' kcal por 100 g' : ''].filter(Boolean).join(' · ') || 'Toca para ver la tabla nutricional';
  return '<button type="button" class="fres" data-act="sh-offpick" data-code="' + esc(h.code) + '"><span class="fres-n">' + esc(h.name) + (h.brand ? ' <small>' + esc(h.brand) + '</small>' : '') + '</span><span class="fres-m">' + esc(meta) + '</span></button>';
}
function offBlockHTML(st) {
  const q = String(st.q || '').trim();
  if (q.length < 2) return '';
  const o = st.off && st.off.q === q ? st.off : null;
  let h = '<div class="off"><p class="sh-sec">Productos empacados · Open Food Facts</p>';
  if (!o) h += '<button type="button" class="btn sm quiet" id="sh-off" data-act="sh-off">Buscar «' + esc(q) + '» en productos empacados</button>';
  else if (o.status === 'loading') h += '<p class="hint">Buscando…</p>';
  else if (o.status === 'error') h += '<p class="hint warn-t">No se pudo conectar con Open Food Facts. Revisa tu internet o crea el alimento con los datos de la etiqueta.</p><button type="button" class="btn sm quiet" id="sh-off" data-act="sh-off">Intentar de nuevo</button>';
  else if (!o.items.length) h += '<p class="hint">Sin resultados. Prueba con la marca o escanea el código de barras.</p>';
  else h += '<div class="fres-list">' + o.items.map(offHitBtn).join('') + '</div>';
  return h + '</div>';
}
function foodResultsHTML(st) {
  const q = norm(st.q || '');
  const list = arr => '<div class="fres-list">' + arr.map(resBtn).join('') + '</div>';
  if (!q) {
    let h = '';
    const rec = recentFoods();
    if (rec.length) h += '<p class="sh-sec">Recientes</p>' + list(rec);
    const mineR = S.recipes.slice().sort(byCreated).map(r => recipeFood(r.id)).filter(Boolean);
    if (mineR.length) h += '<p class="sh-sec">Tus comidas frecuentes</p>' + list(mineR);
    h += '<p class="sh-sec">Combinaciones listas</p>' + RECIPE_GROUPS.map(g => {
      const items = BUILTIN_RECIPES.filter(b => b.g === g.k).map(b => recipeFood(b.id)).filter(Boolean);
      return items.length ? '<details class="cat"><summary>' + esc(g.label) + ' <small>' + items.length + '</small></summary>' + list(items) + '</details>' : '';
    }).join('');
    const mine = S.foods.map(myFoodObj).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (mine.length) h += '<p class="sh-sec">Tus alimentos</p>' + list(mine.slice(0, 15));
    h += '<p class="sh-sec">Todos por categoría</p>' + FOOD_CATS.map((c, i) => {
      const items = FOODS.filter(f => f.cat === i);
      return items.length ? '<details class="cat"><summary>' + esc(c) + ' <small>' + items.length + '</small></summary>' + list(items) + '</details>' : '';
    }).join('');
    return h;
  }
  const found = searchFoods(st.q);
  return (found.length ? list(found.slice(0, 60)) : '<p class="empty">No está en la lista de Ascend. Búscalo en productos empacados o créalo.</p>') + offBlockHTML(st);
}
function shFoodSearchHTML(st) {
  return sheetTop('Agregar comida') +
    '<div class="field"><label class="lbl" for="sh-meal">Agregar a</label><select id="sh-meal" data-sh="meal">' + mealOptions(st.meal) + '</select></div>' +
    '<form data-form="sh-search" role="search" novalidate><label class="lbl sr" for="sh-q">Buscar alimento</label><input type="search" id="sh-q" data-sh="q" placeholder="Busca: arroz, huevo, arepa, yogur…" value="' + esc(st.q || '') + '" autocomplete="off" enterkeyhint="search"></form>' +
    '<div class="row"><button type="button" class="btn sm quiet" id="sh-scan" data-act="sh-scan">Escanear código de barras</button><button type="button" class="btn sm quiet" id="sh-new" data-act="sh-new">Crear alimento</button></div>' +
    '<div id="sh-res">' + foodResultsHTML(st) + '</div>';
}
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
