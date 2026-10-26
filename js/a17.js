'use strict';
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
function habBestStreak(h, k) {
  if (habFlex(h)) return null;
  let best = 0, cur = 0;
  const from = h.start && h.start > addDays(k, -365) ? h.start : addDays(k, -365);
  for (let kk = from; kk <= k; kk = addDays(kk, 1)) {
    if (!habScheduled(h, kk)) continue;
    if (habDone(h, kk)) { cur++; if (cur > best) best = cur; } else if (kk < k) cur = 0;
  }
  return Math.max(best, habStreak(h, k));
}
/* cumplimiento: días que tocaban y se hicieron (diarios) o veces logradas sobre las pedidas (flexibles) */
function habRate(h, k) {
  if (habFlex(h)) {
    let got = 0, need = 0, a = habPeriod(h, k)[0];
    const n = h.freq === 'weekly' ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const b = habPeriod(h, a)[1], nd = habNeed(h, a, b);
      if (!nd) { if (h.start && b < h.start) break; a = habPrevPeriod(h, a); continue; }
      const c = habCount(h, a, b < k ? b : k);
      if (i > 0 || c >= nd) { got += Math.min(c, nd); need += nd; }
      a = habPrevPeriod(h, a);
    }
    return need ? Math.round(got / need * 100) : null;
  }
  let due = 0, done = 0;
  const from = habFrom(h), s0 = habDone(h, k) ? 0 : 1;
  for (let i = s0; i < s0 + 30; i++) {
    const kk = addDays(k, -i);
    if (from && kk < from) break;
    if (habScheduled(h, kk)) { due++; if (habDone(h, kk)) done++; }
  }
  return due ? Math.round(done / due * 100) : null;
}
function habFreqText(h) {
  if (h.freq === 'daily') return 'Todos los días';
  if (h.freq === 'days') return h.days.length === 7 ? 'Todos los días' : WD_ORDER.filter(d => h.days.indexOf(d) >= 0).map(d => WD[d].slice(0, 3).toLowerCase()).join(', ');
  return plural(h.times, 'vez', 'veces') + (h.freq === 'weekly' ? ' por semana' : ' al mes');
}
function habStreakText(h, n) {
  if (!n) return '';
  return 'racha ' + (h.freq === 'weekly' ? plural(n, 'semana', 'semanas') : h.freq === 'monthly' ? plural(n, 'mes', 'meses') : plural(n, 'día', 'días'));
}
function habProgText(h, k) {
  if (!habFlex(h)) return '';
  const a = habPeriod(h, k)[0];
  return habCount(h, a, k) + ' de ' + h.times + (h.freq === 'weekly' ? ' esta semana' : ' este mes');
}
function habToggle(k, day) {
  const h = habs().find(x => x.k === k);
  if (!h || S.readonly || !isKey(day) || day > todayKey() || (h.end && day > h.end)) return false;
  const marking = !habDone(h, day);
  /* marcar un día anterior al inicio mueve el inicio hacia atrás, para que cuente en rachas y estadísticas */
  if (marking && h.start && day < h.start) saveHabits(habitsList().map(x => (x.k === k ? Object.assign({}, x, { start: day }) : x)));
  return mutDay(day, d => { d.boost = Object.assign({}, d.boost); if (d.boost[k]) delete d.boost[k]; else d.boost[k] = true; });
}

/* ---------- hábitos: Hoy y pestaña ---------- */
function habRowHTML(h, tk) {
  const done = habDone(h, tk), active = habActive(h, tk);
  const st = habStreak(h, tk);
  const ws = weekStart(tk);
  const ended = h.end && h.end < tk, notYet = h.start && h.start > tk;
  const sub = [ended ? 'terminó el ' + fmtShort(h.end) : notYet ? 'empieza el ' + fmtShort(h.start) : habFreqText(h), active ? habProgText(h, tk) : '', habStreakText(h, st)].filter(Boolean).join(' · ');
  const strip = WD_ORDER.map((wd, i) => {
    const k = addDays(ws, i), fut = k > tk, dn = habDone(h, k);
    const s = dn ? 'done' : fut ? 'future' : habScheduled(h, k) ? 'due' : 'off';
    return '<button type="button" class="hday' + (k === tk ? ' today' : '') + '" id="hd-' + esc(h.k) + '-' + k + '" data-act="hab-day" data-k="' + esc(h.k) + '" data-day="' + k + '" data-s="' + s + '" aria-pressed="' + dn + '" aria-label="' + esc(h.label + ', ' + fmtDay(k)) + '"' + (fut || (h.end && k > h.end) || S.readonly ? ' disabled' : '') + '>' + WD1[wd] + '</button>';
  }).join('');
  return '<div class="hab' + (done ? ' done' : '') + '">' +
    '<button type="button" class="hchk" id="hc-' + esc(h.k) + '" data-act="hab-day" data-k="' + esc(h.k) + '" data-day="' + tk + '" aria-pressed="' + done + '" aria-label="' + esc((done ? 'Desmarcar ' : 'Marcar ') + h.label) + '"' + (!active || S.readonly ? ' disabled' : '') + '></button>' +
    '<button type="button" class="hab-main" id="ho-' + esc(h.k) + '" data-act="hab-open" data-k="' + esc(h.k) + '"><span class="hab-n">' + esc(h.label) + '</span><span class="hab-s">' + esc(sub) + '</span></button>' +
    '<div class="hstrip" role="group" aria-label="' + esc('Esta semana: ' + h.label) + '">' + strip + '</div></div>';
}
function habSectionHTML() {
  const tk = todayKey(), list = habs();
  const dis = S.readonly || !S.loaded.habits ? ' disabled' : '';
  const today = list.filter(h => habDueOn(h, tk) || habDone(h, tk));
  const other = list.filter(h => today.indexOf(h) < 0);
  const done = today.filter(h => habDone(h, tk)).length;
  const own = !!(S.habits && Array.isArray(S.habits.items));
  let html = '<section class="card" id="card-habs"><div class="card-h"><h2>Hábitos de hoy</h2><span class="meta">' + (today.length ? done + ' de ' + today.length : fmtDay(tk)) + '</span></div>';
  if (today.length) html += '<span class="m-bar hab-bar"><i style="width:' + Math.round(done / today.length * 100) + '%"></i></span>';
  if (!S.loaded.habits) html += '<p class="empty">Cargando…</p>';
  else if (today.length) html += '<div class="habs">' + today.map(h => habRowHTML(h, tk)).join('') + '</div>';
  else html += '<p class="empty">' + (list.length ? 'Hoy no te toca ningún hábito.' : 'Aún no tienes hábitos. Empieza con uno pequeño que puedas cumplir casi todos los días.') + '</p>';
  if (other.length) html += '<p class="sh-sec">Otros días</p><div class="habs">' + other.map(h => habRowHTML(h, tk)).join('') + '</div>';
  html += '<div class="row hab-acts"><button type="button" class="btn" id="hab-new" data-act="hab-new"' + dis + '>Nuevo hábito</button>' +
    '<button type="button" class="btn quiet" id="hab-coach-go" data-act="hab-coach">Ideas con IA</button></div>' +
    (!own && list.length ? '<p class="hint">Estos hábitos salen de tu objetivo. Toca uno para cambiarlo o borrarlo.</p>' : '<p class="hint">Toca un hábito para ver su calendario, su racha y editarlo. Los días de la semana se pueden marcar o desmarcar.</p>') +
    '</section>';
  return html + coachCardHTML() + anaCardHTML('hab');
}

/* hoja: detalle del hábito con calendario del mes */
function shHabDetailHTML(st) {
  const h = habs().find(x => x.k === st.k);
  if (!h) return sheetTop('Hábito') + '<p class="empty">Este hábito ya no existe.</p>';
  const tk = todayKey(), m = st.month || monthStart(tk);
  const first = parseKey(m), dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span></span>';
  for (let d = 1; d <= dim; d++) {
    const k = m.slice(0, 8) + pad2(d), fut = k > tk, dn = habDone(h, k);
    const s = dn ? 'done' : fut ? 'future' : habScheduled(h, k) ? 'due' : 'off';
    cells += '<button type="button" class="hcd' + (k === tk ? ' today' : '') + '" id="hcd-' + k + '" data-act="hab-day" data-k="' + esc(h.k) + '" data-day="' + k + '" data-s="' + s + '" aria-pressed="' + dn + '" aria-label="' + esc(fmtDay(k)) + '"' + (fut || (h.end && k > h.end) || S.readonly ? ' disabled' : '') + '>' + d + '</button>';
  }
  const st1 = habStreak(h, tk), best = habBestStreak(h, tk), rate = habRate(h, tk);
  let total = 0; for (const k of Object.keys(S.days)) if (habDone(h, k)) total++;
  const mo = MO[first.getMonth()] + ' ' + first.getFullYear();
  const stat = (lbl, v) => '<div class="meter"><span class="m-lbl">' + lbl + '</span><span class="m-val">' + v + '</span></div>';
  return sheetTop(h.label) +
    '<p class="plan-sub">' + esc(habFreqText(h)) + (h.start ? ' · desde el ' + fmtShort(h.start) : '') + (h.end ? ' · hasta el ' + fmtShort(h.end) : '') + (h.remind ? ' · aviso ' + fmtHM(h.remind) : '') + '</p>' +
    (h.note ? '<p class="prose">' + esc(h.note) + '</p>' : '') +
    '<div class="meters">' + stat('Racha', st1 ? esc(habStreakText(h, st1).replace('racha ', '')) : '0') + (best != null ? stat('Mejor racha', plural(best, 'día', 'días')) : '') + stat(habFlex(h) ? 'Cumplido (periodos recientes)' : 'Cumplido (30 días)', rate == null ? '—' : rate + ' %') + stat('Veces en total', fmtInt(total)) + '</div>' +
    '<div class="hcal-h"><button type="button" class="navbtn sm" id="hd-prev" data-act="hd-month" data-d="-1" aria-label="Mes anterior">' + ICON.left + '</button><span>' + esc(mo) + '</span>' +
    '<button type="button" class="navbtn sm" id="hd-next" data-act="hd-month" data-d="1" aria-label="Mes siguiente"' + (m >= monthStart(tk) ? ' disabled' : '') + '>' + ICON.right + '</button></div>' +
    '<div class="hcal">' + WD_ORDER.map(d => '<span class="hcal-w">' + WD1[d] + '</span>').join('') + cells + '</div>' +
    '<p class="hint">Toca un día para marcarlo o desmarcarlo.</p>' +
    '<div class="row"><button type="button" class="btn" id="hd-edit" data-act="hab-edit" data-k="' + esc(h.k) + '"' + (S.readonly ? ' disabled' : '') + '>Editar hábito</button></div>';
}

/* hoja: crear o editar un hábito */
