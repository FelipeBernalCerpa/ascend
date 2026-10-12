'use strict';
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
function chatErrText(res, data) {
  if (!res) return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  const e = data && data.error;
  if (res.status === 503) return 'El asistente con IA todavía no está activo en esta app.';
  if (res.status === 401) return 'Tu sesión venció. Cierra sesión y vuelve a entrar.';
  if (res.status === 429) return e === 'limit' ? 'Llegaste al límite de ' + (data.limit || '') + ' mensajes de hoy. Vuelve mañana.' : 'El asistente está muy ocupado hoy. Intenta más tarde.';
  if (res.status === 400 || res.status === 413) return 'No pude enviar ese mensaje: es muy largo o está vacío.';
  return 'No se pudo responder ahora. Intenta de nuevo en un momento.';
}
async function chatSend(text) {
  text = String(text || '').trim().slice(0, 1500);
  const c = S.chat;
  if (!text || c.busy || S.readonly || !S.loaded.aichat) return;
  c.items.push({ role: 'user', text, at: Date.now() });
  c.busy = true;
  c.err = '';
  delete S.drafts['chat-in'];
  renderChat();
  let res = null, data = null;
  try {
    const sess = await sb.auth.getSession();
    const tok = sess && sess.data && sess.data.session ? sess.data.session.access_token || '' : '';
    const messages = c.items.slice(-12).map(m => ({ role: m.role, content: String(m.text || '').slice(0, 3000) }));
    res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ messages, context: aiContext() }) });
    try { data = await res.json(); } catch (e) { data = null; }
  } catch (e) { res = null; }
  c.busy = false;
  if (res && res.ok && data && typeof data.text === 'string') {
    c.items.push({ role: 'assistant', text: data.text.slice(0, 6000), prop: data.proposal && typeof data.proposal === 'object' ? data.proposal : null, habits: Array.isArray(data.habits) ? data.habits.slice(0, 6) : null, at: Date.now() });
    if (typeof data.remaining === 'number') c.remaining = data.remaining;
    if (c.items.length > MAX_CHAT) c.items = c.items.slice(-MAX_CHAT);
    saveChat();
  } else {
    c.items.pop();
    S.drafts['chat-in'] = text;
    c.err = chatErrText(res, data);
  }
  renderChat();
  if (!c.err) focusEl('chat-in');
}
function applyProposal(i) {
  const it = S.chat.items[i];
  if (!it || !it.prop || it.applied || S.readonly || !S.loaded.settings) return;
  const chk = proposalCheck(it.prop), o = chk.out;
  if (!Object.keys(o).length) return;
  const nutri = Object.assign({}, S.settings.nutri);
  for (const k of NK) if (o[k] != null) nutri[k] = o[k];
  S.settings.nutri = nutri;
  if (o.waterGoal != null) S.settings.waterGoal = o.waterGoal;
  if (o.sleepGoal != null) S.settings.sleepGoal = o.sleepGoal;
  if (o.stepGoal != null) S.settings.stepGoal = o.stepGoal;
  saveSettings();
  it.applied = true;
  saveChat();
  renderGuia();
  toast('Metas aplicadas.' + (chk.skipped.length ? ' No cambié ' + chk.skipped.join(', ') + '.' : ''));
}

/* ---------- eventos de lo nuevo ---------- */
function planClick(act, el, id) {
  const st = S.sheet;
  switch (act) {
    case 'plan-open': openPlan(); return true;
    case 'pl-set':
      if (!st || st.kind !== 'plan') return true;
      for (const f of ['birth', 'height', 'weight']) { const x = document.getElementById('pl-' + f); if (x) st.in[f] = x.value; }
      st.in[el.dataset.f] = el.dataset.v;
      st.err = '';
      renderSheet();
      return true;
    case 'pl-tog': {
      if (!st || st.kind !== 'plan') return true;
      for (const f of ['birth', 'height', 'weight']) { const x = document.getElementById('pl-' + f); if (x) st.in[f] = x.value; }
      const arr = st.in[el.dataset.f], v = el.dataset.v, j = arr.indexOf(v);
      if (j >= 0) arr.splice(j, 1); else arr.push(v);
      renderSheet();
      return true;
    }
    case 'chat-quick': chatSend(el.dataset.q); return true;
    case 'chat-clear': confirmOrDo('chat-clear', () => { S.chat.items = []; S.chat.err = ''; saveChat(); }, renderGuia); return true;
    case 'ai-apply': applyProposal(Number(el.dataset.i)); return true;
    case 'gd-del': {
      const sec = el.dataset.sec;
      if (!S.loaded.guide || !GUIDE_SECTIONS.some(x => x.k === sec)) return true;
      confirmOrDo('gd:' + id, () => { S.guide = Object.assign({}, S.guide); S.guide[sec] = guideList(sec).filter(x => x.id !== id); saveGuide(); }, renderGuia);
      return true;
    }
    case 'shop-suggest': suggestShop(); return true;
    case 'hb-del': {
      const k = el.dataset.k;
      if (!S.loaded.habits) return true;
      confirmOrDo('hb:' + k, () => { saveHabits(habitsList().filter(x => x.k !== k)); }, renderAjustes);
      return true;
    }
    case 'hb-reset':
      if (S.readonly || !S.loaded.habits) return true;
      S.habits = null;
      delDoc('config/habits');
      renderAjustes();
      return true;
    default: return false;
  }
}
function planInput(t) {
  if (t.dataset.pl && S.sheet && S.sheet.kind === 'plan') { S.sheet.in[t.dataset.pl] = t.value; return true; }
  return false;
}
function planSubmit(kind) {
  const f = document.querySelector('[data-form="' + kind + '"]');
  switch (kind) {
    case 'sh-plan': submitPlanForm(); return true;
    case 'sh-plansave': savePlan(); return true;
    case 'chat': chatSend(f ? ($('#chat-in', f) || {}).value : ''); return true;
    case 'guide': submitGuide(f); return true;
    case 'habit': submitHabit(f); return true;
    default: return false;
  }
}

function cleanProfile(d) {
  const o = {};
  if (GOALS.some(g => g.k === d.goal)) o.goal = d.goal;
  if (d.pace === 'suave' || d.pace === 'moderado') o.pace = d.pace;
  if (ACTIVITY.some(a => a.k === d.activity)) o.activity = d.activity;
  if (Array.isArray(d.diet)) o.diet = d.diet.filter(k => DIETS.some(x => x.k === k));
  if (Array.isArray(d.cond)) o.cond = d.cond.filter(k => CONDITIONS.some(x => x.k === k));
  if (d.onboarded) o.onboarded = true;
  if (d.plan && typeof d.plan === 'object') o.plan = { at: /^\d{4}-\d{2}-\d{2}$/.test(String(d.plan.at || '')) ? d.plan.at : '', maint: Number(d.plan.maint) || null, kcal: Number(d.plan.kcal) || null };
  return o;
}

/* =====================================================================
   Ascend v4: hábitos con recurrencia, recordatorios, gimnasio y análisis con IA
   ===================================================================== */
S.reminders = []; S.loaded.reminders = false;
S.routines = []; S.loaded.routines = false;
S.rlists = null; S.loaded.rlists = false;
S.loaded.aianalysis = false;
S.ana = { period: 'week', hperiod: 'week', busy: '', err: {}, items: [] };
S.hab = { tab: lsGet('ascend-htab') === 'rem' ? 'rem' : 'hab', rview: 'home', flash: {}, newList: false, editList: false };
IMPORT_COLS.push('reminders', 'routines');
const MAX_REMS = 800, MAX_RLISTS = 30, MAX_ROUTINES = 30, MAX_ANA = 15;
const isKey = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const isHM = s => /^\d{2}:\d{2}$/.test(String(s || ''));
const weekStart = k => addDays(k, -((parseKey(k).getDay() + 6) % 7));
const monthStart = k => k.slice(0, 8) + '01';
const monthEnd = k => { const d = parseKey(k); return keyOf(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
const clampInt = (v, lo, hi, fb) => { const n = parseInt(v, 10); return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fb; };
const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);
const dayWord = k => { const tk = todayKey(); return k === tk ? 'Hoy' : k === addDays(tk, 1) ? 'Mañana' : k === addDays(tk, -1) ? 'Ayer' : fmtDay(k); };
