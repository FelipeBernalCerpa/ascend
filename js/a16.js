'use strict';
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
S.hab = { tab: ['rem', 'boss'].indexOf(lsGet('ascend-htab')) >= 0 ? lsGet('ascend-htab') : 'hab', rview: 'home', flash: {}, newList: false, editList: false };
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
async function authToken() {
  try { const s = await sb.auth.getSession(); return s && s.data && s.data.session ? s.data.session.access_token || '' : ''; } catch (e) { return ''; }
}

/* ---------- hábitos: modelo ---------- */
const HFREQ = [
  { k: 'daily', label: 'Todos los días' },
  { k: 'days', label: 'Algunos días' },
  { k: 'weekly', label: 'Veces por semana' },
  { k: 'monthly', label: 'Veces al mes' }
];
function habNorm(h) {
  const freq = HFREQ.some(f => f.k === h.freq) ? h.freq : 'daily';
  let days = Array.isArray(h.days) ? h.days.filter(n => Number.isInteger(n) && n >= 0 && n <= 6) : [];
  if (freq === 'days' && !days.length) days = [1, 2, 3, 4, 5];
  const times = clampInt(h.times, 1, freq === 'monthly' ? 31 : 7, freq === 'monthly' ? 4 : 3);
  return { k: String(h.k), label: String(h.label || ''), freq, days: freq === 'days' ? days : [], times, start: isKey(h.start) ? h.start : '', end: isKey(h.end) ? h.end : '', remind: isHM(h.remind) ? h.remind : '', note: String(h.note || '').slice(0, 200), createdAt: h.createdAt || 0 };
}
function habs() { return habitsList().map(habNorm); }
const habFlex = h => h.freq === 'weekly' || h.freq === 'monthly';
function habActive(h, k) { return (!h.start || k >= h.start) && (!h.end || k <= h.end); }
function habDone(h, k) { const d = S.days[k]; return !!(d && d.boost && d.boost[h.k]); }
function habPeriod(h, k) { return h.freq === 'weekly' ? [weekStart(k), addDays(weekStart(k), 6)] : h.freq === 'monthly' ? [monthStart(k), monthEnd(k)] : [k, k]; }
function habCount(h, a, b) { let n = 0; for (let k = a; k <= b; k = addDays(k, 1)) if (habDone(h, k)) n++; return n; }
/* el día está en el plan del hábito (los de veces por semana o mes sirven cualquier día) */
function habScheduled(h, k) {
  if (!habActive(h, k)) return false;
  return h.freq === 'days' ? h.days.indexOf(parseKey(k).getDay()) >= 0 : true;
}
/* toca ese día: los flexibles dejan de tocar cuando ya se cumplieron las veces del periodo */
function habDueOn(h, k) {
  if (!habScheduled(h, k)) return false;
  if (!habFlex(h)) return true;
  if (habDone(h, k)) return true;
  const a = habPeriod(h, k)[0];
  return (k > a ? habCount(h, a, addDays(k, -1)) : 0) < h.times;
}
/* veces que pide un periodo, recortado a los días en que el hábito estuvo activo (un hábito que empieza a mitad de semana pide menos) */
function habNeed(h, a, b) {
  const x = h.start && h.start > a ? h.start : a, y = h.end && h.end < b ? h.end : b;
  if (x > y) return 0;
  let n = 0;
  for (let k = x; k <= y && n < h.times; k = addDays(k, 1)) n++;
  return n;
}
/* para estadísticas: un hábito diario o de algunos días cuenta el día que toca; uno flexible (veces por semana o mes)
   cuenta solo los días que se hizo, y al cerrar el periodo suma las veces que faltaron */
function habDayStats(k) {
  let due = 0, done = 0;
  const tk = todayKey();
  for (const h of habs()) {
    if (!habFlex(h)) { if (habDueOn(h, k)) { due++; if (habDone(h, k)) done++; } continue; }
    if (!habActive(h, k)) continue;
    if (habDone(h, k)) { due++; done++; }
    const [a, b] = habPeriod(h, k), last = h.end && h.end < b ? h.end : b;
    if (k === last && last < tk) { const miss = habNeed(h, a, b) - habCount(h, a, b); if (miss > 0) due += miss; }
  }
  return { due, done };
}
/* periodos cerrados (antes de hoy) que terminan entre from y to: cuántos se cumplieron */
function habClosed(h, from, to) {
  let met = 0, total = 0, a = habPeriod(h, to)[0];
  const tk = todayKey();
  for (let i = 0; i < 60; i++) {
    const b = habPeriod(h, a)[1];
    if (b < from) break;
    if (b <= to && b < tk) { const need = habNeed(h, a, b); if (need) { total++; if (habCount(h, a, b) >= need) met++; } }
    a = habPrevPeriod(h, a);
  }
  return { met, total };
}
/* primer día del hábito: su inicio o, en hábitos viejos sin fecha de inicio, la primera vez que se marcó */
function habFrom(h) {
  if (h.start) return h.start;
  let f = '';
  for (const k of Object.keys(S.days)) if ((!f || k < f) && habDone(h, k)) f = k;
  return f;
}
function habPrevPeriod(h, a) { return h.freq === 'weekly' ? addDays(a, -7) : monthStart(addDays(a, -1)); }
function habStreak(h, k) {
  k = k || todayKey();
  if (habFlex(h)) {
    let n = 0;
    const [a0, b0] = habPeriod(h, k), need0 = habNeed(h, a0, b0);
    if (need0 && habCount(h, a0, b0 < k ? b0 : k) >= need0) n++;
    let a = habPrevPeriod(h, a0);
    for (let i = 0; i < 104; i++) {
      const b = habPeriod(h, a)[1], need = habNeed(h, a, b);
      if (!need) { if (h.start && b < h.start) break; a = habPrevPeriod(h, a); continue; }
      if (habCount(h, a, b) >= need) n++; else break;
      a = habPrevPeriod(h, a);
    }
    return n;
  }
  let n = 0, kk = k;
  if (h.end && kk > h.end) kk = h.end; /* hábito terminado: su racha es la que tenía al terminar */
  else if (habScheduled(h, kk) && !habDone(h, kk)) kk = addDays(kk, -1);
  for (let i = 0; i < 1000; i++, kk = addDays(kk, -1)) {
    if (h.start && kk < h.start) break;
    if (!habActive(h, kk)) break;
    if (!habScheduled(h, kk)) continue;
    if (habDone(h, kk)) n++; else break;
  }
  return n;
}
