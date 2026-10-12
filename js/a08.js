'use strict';
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
