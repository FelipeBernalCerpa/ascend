'use strict';
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
function submitHabit(form) {
  if (S.readonly || !S.loaded.habits) return;
  const label = ((($('#hb-new', form) || {}).value) || '').trim().slice(0, 60);
  const list = habitsList();
  S.formErr.habit = !label ? 'Escribe el hábito.' : list.length >= MAX_HABITS ? 'Puedes tener hasta ' + MAX_HABITS + ' hábitos.' : list.some(x => norm(x.label) === norm(label)) ? 'Ese hábito ya está.' : '';
  if (S.formErr.habit) { renderAjustes(); return; }
  saveHabits(list.concat({ k: 'c-' + uid(), label }));
  delete S.drafts['hb-new'];
  renderAjustes();
  focusEl('hb-new');
}
function planProfileHTML() {
  const p = prof(), dis = S.readonly || !S.loaded.profile ? ' disabled' : '';
  const bits = [goalLabel(p.goal), labelsOf(CONDITIONS, p.cond).join(', ')].filter(Boolean);
  return '<div class="row plan-actions">' + (bits.length ? '<span class="plan-sub">' + esc(bits.join(' · ')) + '</span>' : '') +
    '<button type="button" class="btn sm ghost" id="prof-plan" data-act="plan-open"' + dis + '>' + (profileGoal() ? 'Recalcular mi plan' : 'Armar mi plan') + '</button></div>';
}
function privacyInner() {
  return '<p>Tus registros (comida, medicamentos, medidas, exámenes y notas) se guardan en tu cuenta, en servidores de Supabase. Las reglas de la base de datos hacen que solo tu cuenta pueda leerlos o cambiarlos.</p>' +
    '<p>Puedes descargar todos tus datos o borrarlos en Ajustes cuando quieras.</p>' +
    '<p>Si usas el asistente con IA, tu mensaje y un resumen de tu plan y tus registros se envían a Anthropic (Claude) solo para responderte.</p>' +
    '<p>Ascend es una herramienta de registro y educación: no reemplaza a tu médico, a tu nutricionista ni ningún tratamiento.</p>' +
    '<p>Si tienes menos de 18 años, úsala con permiso de tu mamá, papá o acudiente.</p>';
}
function bmiNoteHTML(ser) {
  const age = userAge(), last = ser && ser.length ? ser[ser.length - 1] : null;
  let cat = '';
  if (last && age != null && age >= 18) {
    const b = last.bmi, c = b < 18.5 ? ['warn', 'Bajo peso'] : b < 25 ? ['ok', 'Peso saludable'] : b < 30 ? ['warn', 'Sobrepeso'] : ['crit', 'Obesidad'];
    cat = '<p class="pill ' + c[0] + ' next">' + c[1] + '</p>';
  }
  return cat + '<p class="hint">Se calcula con cada peso y la estatura más reciente. ' + (age != null && age < 18
    ? 'Antes de los 18 años el IMC se lee con las tablas de la OMS por edad y sexo; la interpretación la hace tu médico o nutricionista.'
    : 'En adultos: menos de 18,5 es bajo peso, de 18,5 a 24,9 saludable, de 25 a 29,9 sobrepeso y 30 o más obesidad. No distingue músculo de grasa.') + '</p>';
}

/* ---------- asistente con IA ---------- */
const PROP_LABELS = { kcal: ['Calorías', 'kcal'], p: ['Proteína', 'g'], c: ['Carbohidratos', 'g'], s: ['Azúcar máx.', 'g'], fi: ['Fibra mín.', 'g'], f: ['Grasas', 'g'], sf: ['Saturadas máx.', 'g'], na: ['Sodio máx.', 'mg'], waterGoal: ['Agua', 'ml'], sleepGoal: ['Sueño', 'h'], stepGoal: ['Pasos', ''] };
function fmtAiText(t) {
  return esc(String(t || '')).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^[-*•] /gm, '• ').replace(/\n/g, '<br>');
}
/* mínimo de calorías que Ascend acepta de una propuesta: menores de 18, nunca por debajo de su gasto; adultos, nunca por debajo de 1.200 (mujeres) o 1.500 (hombres) ni más de 500 bajo su gasto */
function kcalFloor() {
  const p = prof(), age = userAge(), tk = todayKey();
  let maint = p.plan && Number(p.plan.maint) > 0 ? Number(p.plan.maint) : null;
  if (!maint) {
    const w = latestOn('weight', tk), h = latestOn('height', tk);
    if (w && h && p.birth && (p.sex === 'm' || p.sex === 'f')) {
      const r = computePlan({ sex: p.sex, birth: p.birth, weight: String(w), height: String(h), goal: 'mantener', activity: ACTIVITY.some(a => a.k === p.activity) ? p.activity : 'poca', cond: [], diet: [] });
      if (!r.err) maint = r.maint;
    }
  }
  if (age == null || age < 18) return maint ? Math.round(maint * 0.95) : Infinity;
  return Math.max(p.sex === 'f' ? 1200 : 1500, maint ? maint - 500 : 0);
}
function proposalCheck(pr) {
  const out = {}, skipped = [];
  const LAB = { kcal: 'las calorías', p: 'la proteína', c: 'los carbohidratos', s: 'el azúcar', fi: 'la fibra', f: 'las grasas', sf: 'las saturadas', na: 'el sodio', waterGoal: 'el agua' };
  const block = new Set();
  if (hasCond('tca')) NK.filter(k => k !== 'na').concat(['waterGoal', 'stepGoal']).forEach(k => block.add(k));
  if (hasCond('renal')) ['p', 'na', 'waterGoal'].forEach(k => block.add(k));
  if (hasCond('diabetes')) block.add('c');
  if (hasCond('embarazo')) ['kcal', 'c', 'f', 'sf', 's'].forEach(k => block.add(k));
  const range = { waterGoal: [500, 6000], sleepGoal: [5, 12], stepGoal: [1000, 30000] };
  for (const k of Object.keys(PROP_LABELS)) {
    let v = Number(pr && pr[k]);
    if (!pr || pr[k] == null || !isFinite(v) || v <= 0) continue;
    if (range[k] && !(v >= range[k][0] && v <= range[k][1])) continue;
    if (block.has(k)) { skipped.push(LAB[k]); continue; }
    if (k === 'kcal' && v < kcalFloor()) { skipped.push('las calorías (quedaban por debajo de lo seguro para ti)'); continue; }
    if (k === 'na' && hasCond('hta')) v = Math.min(v, 1500);
    out[k] = k === 'kcal' || k === 'na' || k === 'waterGoal' || k === 'stepGoal' ? Math.round(v) : r1(v);
  }
  return { out, skipped: hasCond('tca') ? [] : skipped };
}
function proposalHTML(pr, i, applied) {
  const chk = proposalCheck(pr), keys = Object.keys(chk.out);
  const rows = keys.map(k => '<span class="pv"><span>' + PROP_LABELS[k][0] + '</span><b>' + (k === 'sleepGoal' ? fmtNum(chk.out[k], 1) : fmtInt(chk.out[k])) + (PROP_LABELS[k][1] ? ' ' + PROP_LABELS[k][1] : '') + '</b></span>').join('');
  const note = chk.skipped.length ? '<p class="hint">No se aplica en tu caso: ' + esc(chk.skipped.join(', ')) + '.</p>' : '';
  if (!rows) return note ? '<div class="prop">' + note + '</div>' : '';
  return '<div class="prop"><p class="sh-sec">Metas propuestas</p><div class="prev-g">' + rows + '</div>' + note +
    (applied ? '<p class="pill ok">Aplicadas</p>' : '<button type="button" class="btn sm" id="ai-apply-' + i + '" data-act="ai-apply" data-i="' + i + '"' + (S.readonly ? ' disabled' : '') + '>Aplicar a mis metas</button>') + '</div>';
}
function chatCardHTML() {
  const c = S.chat, items = c.items;
  const dis = S.readonly || !S.loaded.aichat || c.busy ? ' disabled' : '';
  const armed = S.confirmDel === 'chat-clear';
  const QUICK = ['Ayúdame a fijar mis metas', '¿Qué como hoy con lo que me falta?', 'Ayúdame con mis hábitos', 'Ideas de desayuno para mi plan'];
  return '<section class="card" id="card-ai"><div class="card-h"><h2>Asistente</h2><span class="meta">Con IA</span></div>' +
    (items.length ? '<div class="chat" id="chat-log" aria-live="polite">' + items.map((it, i) => it.role === 'user'
        ? '<div class="msg me">' + esc(it.text) + '</div>'
        : '<div class="msg ai">' + fmtAiText(it.text) + (it.prop ? proposalHTML(it.prop, i, it.applied) : '') + (it.habits ? habPropHTML(it.habits, 'chat', i) : '') + '</div>').join('') +
        (c.busy ? '<div class="msg ai typing">Pensando…</div>' : '') + '</div>'
      : '<p class="prose">Pregúntale por tus metas, ideas de comidas con lo que te falta hoy o por qué tu peso no cambia. Ve tu plan y tus registros para responderte.</p>' +
        (c.busy ? '<p class="hint">Pensando…</p>' : '<div class="quick">' + QUICK.map((q, i) => '<button type="button" class="xbtn" id="chat-q' + i + '" data-act="chat-quick" data-q="' + esc(q) + '"' + dis + '>' + esc(q) + '</button>').join('') + '</div>')) +
    (c.err ? '<p class="form-err" id="chat-err">' + esc(c.err) + '</p>' : '') +
    '<form class="chat-form" data-form="chat" novalidate><label class="lbl sr" for="chat-in">Tu pregunta</label><textarea id="chat-in" data-draft rows="2" maxlength="1500" placeholder="Escribe tu pregunta…"' + (S.readonly ? ' readonly' : '') + '>' + esc(draft('chat-in', '')) + '</textarea>' +
    '<button type="submit" class="btn" id="chat-send"' + dis + '>Enviar</button></form>' +
    '<p class="hint">Responde con IA (Claude): puede equivocarse y no reemplaza a tu médico. Para responder recibe tu mensaje y un resumen de tu plan y tus registros.' + (c.remaining != null ? ' Te quedan ' + c.remaining + ' mensajes hoy.' : '') + '</p>' +
    (items.length ? '<button type="button" class="link" id="chat-clear" data-act="chat-clear"' + (c.busy ? ' disabled' : '') + '>' + (armed ? 'Toca otra vez para borrar la conversación' : 'Borrar conversación') + '</button>' : '') +
  '</section>';
}
function renderChat() {
  if (S.tab !== 'guia') return;
  const el = $('#card-ai');
  if (!el) return;
  replaceEl(el, chatCardHTML());
  const log = $('#chat-log');
  if (log) log.scrollTop = log.scrollHeight;
}
function saveChat() { if (S.loaded.aichat) saver.queue('config/aichat', { items: clone(S.chat.items.slice(-MAX_CHAT)) }, 200); }
function aiContext() {
  const p = prof(), tk = todayKey(), L = [];
  const age = ageOn(p.birth, tk), w = latestOn('weight', tk), h = latestOn('height', tk);
  L.push('Fecha de hoy: ' + fmtDate(tk));
  L.push('Edad: ' + (age != null ? age + ' años' : 'sin dato') + '. Sexo: ' + (p.sex === 'm' ? 'hombre' : p.sex === 'f' ? 'mujer' : 'sin dato') + '.');
  L.push('Estatura: ' + (h ? fmtNum(h, 1) + ' cm' : 'sin dato') + '. Peso: ' + (w ? fmtNum(w, 1) + ' kg' : 'sin dato') + '.');
  const ws = S.measures.filter(m => hasNum(m.weight)).sort(byDate).slice(-5);
  if (ws.length > 1) L.push('Pesos recientes: ' + ws.map(m => fmtShort(m.date) + ' ' + fmtNum(m.weight, 1) + ' kg').join('; ') + '.');
  L.push('Objetivo: ' + (goalLabel(p.goal) || 'sin definir') + (p.goal && p.goal !== 'mantener' ? ' (ritmo ' + (p.pace || 'suave') + ')' : '') + '. Actividad: ' + ((labelsOf(ACTIVITY, [p.activity])[0] || 'sin dato').toLowerCase()) + '.');
  L.push('Alimentación: ' + (labelsOf(DIETS, p.diet).join(', ').toLowerCase() || 'sin restricciones') + '. Condiciones de salud: ' + (labelsOf(CONDITIONS, p.cond).join(', ').toLowerCase() || 'ninguna registrada') + '.');
  const meds = S.meds.filter(m => m.active).map(m => m.name).filter(Boolean);
  if (meds.length) L.push('Medicamentos activos: ' + meds.join(', ').slice(0, 400) + '.');
  const s = S.settings, g = s.nutri || {};
  const gl = NUTRIENTS.filter(n => g[n.k] != null).map(n => n.label.toLowerCase() + ' ' + ({ meta: 'meta', max: 'máximo', min: 'mínimo' })[goalKind(n.k)] + ' ' + fmtNut(n.k, g[n.k]) + ' ' + n.unit);
  L.push('Metas actuales: ' + (gl.length ? gl.join('; ') : 'sin metas de nutrientes') + '; agua ' + fmtInt(s.waterGoal) + ' ml; sueño ' + fmtNum(s.sleepGoal, 1) + ' h' + (s.stepGoal ? '; pasos ' + fmtInt(s.stepGoal) : '') + '.');
  const d = getDay(tk), nu = dayNutri(d);
  if (nu.count) {
    L.push('Hoy lleva: ' + NUTRIENTS.map(n => n.label.toLowerCase() + ' ' + fmtNut(n.k, nu[n.k]) + ' ' + n.unit).join('; ') + '.');
    L.push('Comidas de hoy: ' + d.food.slice(0, 25).map(e => mealLabel(e.m) + ': ' + String(e.name || '').slice(0, 60) + ' (' + fmtInt(e.g) + ' ' + unitOf(e.l) + ')').join('; ') + '.');
  } else L.push('Hoy no ha registrado comida.');
  const en = energyFor(tk, d);
  L.push('Hoy: agua ' + fmtInt(sum(d.water)) + ' ml; pasos ' + fmtInt(d.steps || 0) + (Array.isArray(d.acts) && d.acts.length ? '; ejercicio: ' + d.acts.map(a => String(a.name || '').slice(0, 40) + ' ' + a.min + ' min').join(', ') : '') + (en.total != null ? '; gasto estimado ' + fmtInt(r10(en.total)) + ' kcal' : '') + '.');
  const r = statsRange(7);
  if (r.fN) L.push('Últimos 7 días (' + r.fN + ' con comida registrada), promedio por día: ' + fmtInt(r.nut.kcal / r.fN) + ' kcal; proteína ' + fmtNut('p', r.nut.p / r.fN) + ' g; grasas ' + fmtNut('f', r.nut.f / r.fN) + ' g; carbohidratos ' + fmtNut('c', r.nut.c / r.fN) + ' g; sodio ' + fmtInt(r.nut.na / r.fN) + ' mg.');
  if (r.sN) L.push('Sueño promedio 7 días: ' + fmtNum(r.sSum / r.sN, 1) + ' h.');
  const gi = GUIDE_SECTIONS.map(sec => guideList(sec.k).map(it => sec.label + ': ' + it.t)).flat();
  if (gi.length) L.push('Indicaciones que guardó de sus médicos: ' + gi.join('; ').slice(0, 1200) + '.');
  const hl = habs();
  if (hl.length) L.push('Hábitos: ' + hl.map(h => h.label + ' (' + habFreqText(h).toLowerCase() + (habDone(h, tk) ? ', hecho hoy' : habDueOn(h, tk) ? ', pendiente hoy' : '') + (habStreak(h, tk) ? ', ' + habStreakText(h, habStreak(h, tk)) : '') + ')').join('; ').slice(0, 900) + '.');
  const rp = S.reminders.filter(r => !r.done && r.due && r.due <= tk);
  if (rp.length) L.push('Recordatorios para hoy o vencidos: ' + rp.slice(0, 10).map(r => r.t).join('; ').slice(0, 400) + '.');
  return L.join('\n').slice(0, 6000);
}
