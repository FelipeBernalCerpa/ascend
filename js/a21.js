'use strict';
function coachCardHTML() {
  const busy = S.ana.busy === 'coach';
  const items = S.ana.items.filter(x => x.kind === 'coach');
  const dis = S.readonly || !S.loaded.aianalysis || S.ana.busy ? ' disabled' : '';
  return '<section class="card ana" id="card-coach"><div class="card-h"><h2>Ideas de hábitos con IA</h2><span class="meta">Con IA</span></div>' +
    '<p class="prose">Cuéntale qué quieres lograr y te propone hábitos pequeños y realistas que puedes agregar con un toque.</p>' +
    '<form class="chat-form" data-form="coach" novalidate><label class="lbl sr" for="coach-in">Qué quieres lograr</label><textarea id="coach-in" data-draft rows="2" maxlength="1000" placeholder="Quiero dormir mejor, estudiar más, subir de peso…"' + (S.readonly ? ' readonly' : '') + '>' + esc(draft('coach-in', '')) + '</textarea>' +
    '<button type="submit" class="btn" id="coach-send"' + dis + '>' + (busy ? 'Pensando…' : 'Pedir ideas') + '</button></form>' +
    (S.ana.err.coach ? '<p class="form-err">' + esc(S.ana.err.coach) + '</p>' : '') +
    (items[0] ? anaOutHTML(items[0]) : '') + '</section>';
}
function aiDayHTML(c) {
  if (!c.isToday) return '<div id="card-aiday" hidden></div>';
  return '<section id="card-aiday" class="card aiday"><div><h2>¿Cómo vas hoy?</h2><p class="hint">' + (hasCond('tca') ? 'La IA revisa tu día: comidas, agua, sueño, ejercicio y hábitos.' : 'La IA revisa tu día: lo que comiste y quemaste, agua, proteína, ejercicio y hábitos.') + '</p></div>' +
    '<button type="button" class="btn sm" id="aiday-go" data-act="ana-day-go"' + (S.readonly ? ' disabled' : '') + '>Analizar mi día</button></section>';
}

/* ---------- eventos v4 ---------- */
function v4Click(act, el, id) {
  if (v6Click(act, el, id)) return;
  if (v7Click(act, el, id)) return;
  if (v8Click(act, el, id)) return;
  if (v9Click(act, el, id)) return;
  if (v10Click(act, el, id)) return;
  const st = S.sheet;
  switch (act) {
    case 'htab': S.hab.tab = ['rem', 'boss'].indexOf(el.dataset.v) >= 0 ? el.dataset.v : 'hab'; lsSet('ascend-htab', S.hab.tab); renderHabitos(); return true;
    case 'hab-new': openHabitEdit(null); return true;
    case 'hab-open': openSheet({ kind: 'hdetail', step: 'detail', k: el.dataset.k, month: monthStart(todayKey()) }); return true;
    case 'hab-edit': openHabitEdit(el.dataset.k); return true;
    case 'hab-del': habDelete(el.dataset.k); return true;
    case 'hab-day': {
      if (habToggle(el.dataset.k, el.dataset.day)) {
        if (S.sheet && S.sheet.kind === 'hdetail') renderSheet();
        if (S.tab === 'habitos') renderHabitos(); else if (S.tab === 'hoy') renderHoy(['boost']);
      }
      return true;
    }
    case 'hd-month': {
      if (!st || st.kind !== 'hdetail') return true;
      const d = parseKey(st.month || monthStart(todayKey()));
      d.setMonth(d.getMonth() + (Number(el.dataset.d) || 0));
      const m = keyOf(d).slice(0, 8) + '01';
      if (m <= monthStart(todayKey())) { st.month = m; renderSheet(); }
      return true;
    }
    case 'hf-freq': if (st && st.kind === 'habit') { habFormSync(); st.f.freq = el.dataset.v; if (st.f.freq === 'weekly' && !(parseInt(st.f.times, 10) <= 7)) st.f.times = '3'; st.err = ''; renderSheet(); } return true;
    case 'hf-day': if (st && st.kind === 'habit') { habFormSync(); const n = Number(el.dataset.v), j = st.f.days.indexOf(n); if (j >= 0) st.f.days.splice(j, 1); else st.f.days.push(n); renderSheet(); } return true;
    case 'hf-times': if (st && st.kind === 'habit') { habFormSync(); st.f.times = el.dataset.v; renderSheet(); } return true;
    case 'hf-end': if (st && st.kind === 'habit') { habFormSync(); st.f.endMode = el.dataset.v; if (st.f.endMode === 'date' && !st.f.end) st.f.end = addDays(st.f.start || todayKey(), 29); renderSheet(); } return true;
    case 'hf-dur': if (st && st.kind === 'habit') { habFormSync(); st.f.end = addDays(isKey(st.f.start) ? st.f.start : todayKey(), Number(el.dataset.v) - 1); renderSheet(); } return true;
    case 'hab-coach': { const t = $('#coach-in'); if (t) { try { t.scrollIntoView({ block: 'center' }); t.focus({ preventScroll: true }); } catch (e) {} } return true; }
    case 'rem-view': S.hab.rview = el.dataset.v; S.hab.newList = false; S.hab.editList = false; S.hab.listColor = null; S.confirmDel = null; renderHabitos(); try { window.scrollTo(0, 0); } catch (e) {} return true;
    case 'rem-goto': S.hab.tab = 'rem'; S.hab.rview = 'today'; lsSet('ascend-htab', 'rem'); setTab('habitos'); return true;
    case 'rem-check': remCheck(id); return true;
    case 'rem-edit': openRem(id); return true;
    case 'rem-new': openRem(null); return true;
    case 'rem-del': remDelete(); return true;
    case 'rem-clear': confirmOrDo('rem-clear', () => { const gone = S.reminders.filter(r => r.done); S.reminders = S.reminders.filter(r => !r.done); for (const r of gone) delDoc('reminders/' + r.id); toast(plural(gone.length, 'recordatorio borrado', 'recordatorios borrados') + '.'); }, renderHabitos); return true;
    case 'rem-notif':
      try { Notification.requestPermission().then(() => renderHabitos()); } catch (e) {}
      return true;
    case 'rl-new': S.hab.newList = true; S.hab.listColor = RCOLORS[1]; S.formErr.rl = ''; renderHabitos(); focusEl('rl-name'); return true;
    case 'rl-edit': S.hab.editList = true; S.hab.listColor = rlistOf(S.hab.rview).color; S.drafts['rl-name'] = rlistOf(S.hab.rview).name; S.formErr.rl = ''; renderHabitos(); focusEl('rl-name'); return true;
    case 'rl-cancel': S.hab.newList = false; S.hab.editList = false; S.hab.listColor = null; delete S.drafts['rl-name']; renderHabitos(); return true;
    case 'rl-color': { const n = $('#rl-name'); if (n) S.drafts['rl-name'] = n.value; S.hab.listColor = el.dataset.v; renderHabitos(); return true; }
    case 'rl-del': rlistDelete(); return true;
    case 'rf-rep': if (st && st.kind === 'rem') { remFormSync(); st.f.rf = el.dataset.v === 'no' ? '' : el.dataset.v; if (st.f.rf && !st.f.due) st.f.due = todayKey(); st.err = ''; renderSheet(); } return true;
    case 'rf-day': if (st && st.kind === 'rem') { remFormSync(); const n = Number(el.dataset.v), j = st.f.rdays.indexOf(n); if (j >= 0) st.f.rdays.splice(j, 1); else st.f.rdays.push(n); renderSheet(); } return true;
    case 'rf-end': if (st && st.kind === 'rem') { remFormSync(); st.f.endT = el.dataset.v; if (st.f.endT === 'date' && !st.f.endD) st.f.endD = addDays(st.f.due || todayKey(), 30); renderSheet(); } return true;
    case 'rf-date': if (st && st.kind === 'rem') {
      remFormSync();
      const tk = todayKey(), v = el.dataset.v;
      st.f.due = v === 'today' ? tk : v === 'tomorrow' ? addDays(tk, 1) : v === 'nextweek' ? addDays(tk, ((8 - parseKey(tk).getDay()) % 7) || 7) : '';
      if (!st.f.due) { st.f.time = ''; st.f.rf = ''; }
      renderSheet();
    } return true;
    case 'rf-pri': if (st && st.kind === 'rem') { remFormSync(); st.f.pri = Number(el.dataset.v) || 0; renderSheet(); } return true;
    case 'rf-flag': if (st && st.kind === 'rem') { remFormSync(); st.f.flag = !st.f.flag; renderSheet(); } return true;
    case 'gym-open': openGym(null); return true;
    case 'gym-edit': openGym(id); return true;
    case 'gym-min': if (st && st.kind === 'gym') { gymSync(); st.min = el.dataset.v; renderSheet(); } return true;
    case 'gym-lv': if (st && st.kind === 'gym') { gymSync(); st.lv = el.dataset.v; renderSheet(); } return true;
    case 'gym-addx': if (st && st.kind === 'gym') { gymSync(); if (st.ex.length >= 25) { sheetErr(st, 'Máximo 25 ejercicios por entrenamiento.'); return true; } st.q = ''; goStep('pick'); if (finePointer()) focusEl('gym-q'); } return true;
    case 'gym-pick': if (st && st.kind === 'gym') {
      const n = String(el.dataset.n || '').trim().slice(0, 50);
      if (!n) return true;
      const prev = lastGym(), ref = prev && (prev.ex || []).find(x => norm(x.n) === norm(n));
      st.ex.push({ n, sets: ref && ref.sets.length ? ref.sets.map(s => ({ r: String(s.r || ''), kg: s.kg == null ? '' : String(s.kg) })) : [{ r: '10', kg: '' }, { r: '10', kg: '' }, { r: '10', kg: '' }] });
      st.q = '';
      goStep('gym');
      const c = $('#sheet-card'); if (c) c.scrollTop = c.scrollHeight;
    } return true;
    case 'gym-xdel': if (st && st.kind === 'gym') { gymSync(); st.ex.splice(Number(el.dataset.i), 1); renderSheet(); } return true;
    case 'gym-sadd': if (st && st.kind === 'gym') { gymSync(); const x = st.ex[Number(el.dataset.i)]; if (x && x.sets.length < 15) { const l = x.sets[x.sets.length - 1] || { r: '10', kg: '' }; x.sets.push({ r: l.r, kg: l.kg }); renderSheet(); } } return true;
    case 'gym-sdel': if (st && st.kind === 'gym') { gymSync(); const x = st.ex[Number(el.dataset.i)]; if (x && x.sets.length > 1) { x.sets.splice(Number(el.dataset.j), 1); renderSheet(); } } return true;
    case 'gym-last': if (st && st.kind === 'gym') { const a = lastGym(); if (a) { st.name = a.title || ''; st.min = String(a.min || 60); st.lv = a.lv || 'moderada'; st.ex = gymCopyEx(a.ex); renderSheet(); } } return true;
    case 'gym-rt': if (st && st.kind === 'gym') { const r = S.routines.find(x => x.id === id); if (r) { st.name = r.name; st.min = String(r.min || 60); st.lv = r.lv || 'moderada'; st.ex = gymCopyEx(r.ex); st.saveRt = false; renderSheet(); } } return true;
    case 'gym-rtsave': if (st && st.kind === 'gym') { gymSync(); st.saveRt = !st.saveRt; renderSheet(); } return true;
    case 'gym-rtmanage': if (st && st.kind === 'gym') { gymSync(); st.rtManage = !st.rtManage; renderSheet(); } return true;
    case 'gym-rtdel': if (st && st.kind === 'gym') { gymSync(); confirmOrDo('rt:' + id, () => { S.routines = S.routines.filter(r => r.id !== id); delDoc('routines/' + id); }, () => { if (S.sheet && S.sheet.kind === 'gym') renderSheet(); }); } return true;
    case 'ana-p': {
      if (S.ana.busy) return true;
      if (el.dataset.kind === 'hab') S.ana.hperiod = el.dataset.v; else S.ana.period = el.dataset.v;
      renderActive();
      return true;
    }
    case 'ana-run': anaRun(el.dataset.kind); return true;
    case 'ana-apply': anaApply(id); return true;
    case 'ana-day-go': S.ana.period = 'day'; setTab('progreso'); anaRun('gen'); return true;
    case 'hp-add': habAddProposals(el.dataset.src, el.dataset.id, Number(el.dataset.i)); return true;
    case 'hp-all': habAddProposals(el.dataset.src, el.dataset.id, null); return true;
    default: return false;
  }
}
function v4Input(t) {
  const st = S.sheet;
  if (t.dataset.hf && st && st.kind === 'habit') { st.f[t.dataset.hf] = t.value; return true; }
  if (t.dataset.rf && st && st.kind === 'rem') {
    st.f[t.dataset.rf] = t.value;
    if (t.dataset.rf === 'due') { const tm = $('#rf-time'); if (tm) tm.disabled = !t.value; }
    return true;
  }
  if (t.dataset.gy && st && st.kind === 'gym') {
    st[t.dataset.gy] = t.value;
    if (t.dataset.gy === 'min') for (const b of $$('[data-act="gym-min"]', $('#sheet-card'))) b.setAttribute('aria-pressed', String(b.dataset.v === String(t.value).trim()));
    const e = $('#gym-est'); if (e) e.textContent = gymEstimate(st);
    return true;
  }
  if (t.dataset.gs && st && st.kind === 'gym') {
    const [i, j, f] = t.dataset.gs.split(':');
    if (st.ex[i] && st.ex[i].sets[j]) st.ex[i].sets[j][f] = t.value;
    const e = $('#gym-est'); if (e) e.textContent = gymEstimate(st);
    return true;
  }
  if (t.dataset.gq && st && st.kind === 'gym') {
    st.q = t.value;
    const r = $('#gym-res');
    if (r) { const tmp = document.createElement('div'); tmp.innerHTML = shGymPickHTML(st); const nr = tmp.querySelector('#gym-res'); if (nr) r.innerHTML = nr.innerHTML; }
    return true;
  }
  return false;
}
function v4Submit(kind) {
  if (v7Submit(kind)) return true;
  switch (kind) {
    case 'sh-habit': habSave(); return true;
    case 'sh-rem': remSave(); return true;
    case 'sh-gym': gymSave(); return true;
    case 'gym-search': { const st = S.sheet; const q = st && String(st.q || '').trim(); if (q) { const b = $('#gym-res .fres'); if (b) b.click(); } return true; }
    case 'rem-quick': remQuickAdd(); return true;
    case 'rl-new': rlistSave(false); return true;
    case 'rl-edit': rlistSave(true); return true;
    case 'coach': { const t = $('#coach-in'); anaRun('coach', t ? t.value : ''); return true; }
    default: return false;
  }
}
function v4Subscribe() {
  const remH = colHandler('reminders', byCreated, () => { if (S.tab === 'habitos') renderHabitos(); else if (S.tab === 'hoy') renderHoy(['rems']); });
  store.watchCol('reminders', list => remH(list.filter(it => it.data && typeof it.data === 'object').map(it => ({ id: it.id, data: remFix(it.data) }))));
  store.watchCol('routines', colHandler('routines', byCreated, () => { if (S.sheet && S.sheet.kind === 'gym' && S.sheet.step === 'gym') { gymSync(); renderSheet(); } }));
  store.watchDoc('config/rlists', data => {
    S.loaded.rlists = true;
    if (dirty.has('config/rlists')) return;
    S.rlists = data && Array.isArray(data.items) ? data : null;
    if (S.tab === 'habitos') renderHabitos();
  });
  store.watchDoc('config/aianalysis', data => {
    S.loaded.aianalysis = true;
    if (dirty.has('config/aianalysis')) return;
    S.ana.items = data && Array.isArray(data.items) ? data.items.filter(x => x && x.id && typeof x.text === 'string') : [];
    if (S.tab === 'progreso' || S.tab === 'habitos') renderActive();
  });
  store.watchDoc('config/habits', () => { if (S.tab === 'habitos') renderHabitos(); });
  clearInterval(v4Tick);
  v4Tick = setInterval(v4Notify, 30000);
  setTimeout(v4Notify, 1500);
}
function v4Change(t) { return !!(t.dataset && (t.dataset.rf || t.dataset.hf) && v4Input(t)); }
HOY.rems = remsTodayHTML;
HOY.aiday = aiDayHTML;
HOY_ORDER.splice(HOY_ORDER.indexOf('meds') + 1, 0, 'rems');
HOY_ORDER.push('aiday');

/* ---------- arranque ---------- */
async function refreshData() {
  if (!store.userId || S.refreshing || !S.dataReady) return;
  if (saver.pend.size || saver.busy.size || S.inflight > 0 || deleting.size) return;
  S.refreshing = true;
  const wv = store.wv;
  /* si algo se guardó o se borró mientras leía, esa lectura ya es vieja: se descarta */
  const quiet = () => store.wv === wv && !saver.pend.size && !saver.busy.size && S.inflight <= 0 && !deleting.size;
  try { if (await store.load(quiet)) store.emit(); S.offline = false; }
  catch (e) { if (e && e.code === 'unavailable') S.offline = true; }
  S.refreshing = false;
  refreshStatus();
}
function showLoadError(msg) {
  S.offline = true;
  refreshStatus();
  const v = $('#view-hoy');
  for (const x of $$('.view')) x.hidden = x !== v;
  v.innerHTML = '<section class="card"><div class="card-h"><h2>Sin datos por ahora</h2></div><p class="prose">' + esc(msg) + '</p>' +
    '<button type="button" class="btn" data-act="reload">Intentar de nuevo</button></section>';
}
let appBound = false;
function bindApp() {
  if (appBound) return;
  appBound = true;
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('keydown', onKey);
  document.addEventListener('toggle', e => {
    const d = e.target;
    if (d && d.dataset && d.dataset.hist) {
      if (d.open) S.openHist = d.dataset.hist;
      else if (S.openHist === d.dataset.hist) S.openHist = null;
    }
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { saver.flushAll(); if (S.sheet && S.sheet.step === 'scan') { stopScan(); setScanMsg('La cámara se pausó. Toca volver y abre el escáner otra vez, o escribe el código.'); } return; }
    if (S.tab === 'hoy') renderHoy(['meds', 'meters']);
    if (Date.now() - store.lastLoad > 60000) refreshData();
  });
  window.addEventListener('pagehide', () => saver.flushAll());
  window.addEventListener('online', () => { S.offline = false; refreshStatus(); refreshData(); });
  setInterval(() => {
    const tk = todayKey();
    if (S.lastToday !== tk) {
      const wasToday = S.viewKey === S.lastToday;
      S.lastToday = tk;
      if (wasToday) S.viewKey = tk;
      renderActive();
      return;
    }
    if (S.tab === 'hoy' && S.viewKey === tk && S.dataReady) renderHoy(['meds']);
  }, 30000);
  try {
    let lastW = 0, rt = 0;
    const obs = new ResizeObserver(entries => {
      const w = Math.round(entries[0].contentRect.width);
      if (w === lastW) return;
      lastW = w;
      clearTimeout(rt);
      rt = setTimeout(() => drawCharts($('#view-' + S.tab)), 120);
    });
    obs.observe($('#main'));
  } catch (e) {}
}
async function startApp(user) {
  if (S.started || !user || S.recovering) return;
  S.started = true;
  store.kind = 'cloud';
  store.userId = user.id;
  S.userEmail = user.email || '';
  S.canWrite = true;
  $('#splash').hidden = true;
  $('#auth').hidden = true;
  $('#app').hidden = false;
  bindApp();
  setTab(lsGet(LS_TAB) || 'hoy');
  setStatus('loading');
  try {
    await store.load();
  } catch (e) {
    const raw = (e && e.raw) || {};
    const missing = /PGRST205|42P01|does not exist|Could not find the table/i.test(String(raw.code || '') + ' ' + String(raw.message || e.message || ''));
    showLoadError(missing
      ? 'La base de datos de Ascend todavía no está lista: falta crear la tabla de registros.'
      : 'No se pudieron cargar tus datos. Revisa tu conexión e intenta de nuevo.');
    return;
  }
  S.dataReady = true;
  storeReadyResolve();
  subscribeAll();
  v4Subscribe();
  refreshStatus();
  renderActive();
  if (!Object.keys(store.docs).length && !S.readonly) { setTab('guia'); openPlan(); }
}
async function boot() {
  bindAuth();
  if (!sb) {
    showAuth(CONFIGURED
      ? 'No se pudo cargar la conexión. Revisa tu internet y recarga la página.'
      : 'Esta copia de Ascend todavía no está conectada a su base de datos: falta poner la URL y la clave de Supabase en index.html.');
    return;
  }
  if (/type=recovery/.test(location.hash)) S.recovering = true;
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') { S.recovering = true; setTimeout(() => showAuth('', 'recovery'), 0); return; }
    if (event === 'SIGNED_OUT') { if (S.started) setTimeout(() => location.reload(), 0); return; }
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && session.user && !S.recovering) {
      const u = session.user;
      setTimeout(() => startApp(u), 0);
    }
  });
  try {
    const res = await sb.auth.getSession();
    const session = res && res.data ? res.data.session : null;
    if (S.recovering) { showAuth('', 'recovery'); return; }
    if (session && session.user) startApp(session.user);
    else if (!S.started) showAuth();
  } catch (e) {
    showAuth('No se pudo conectar. Revisa tu internet y recarga la página.');
  }
}
/* =====================================================================
   Ascend v5: seguridad y privacidad
   - cifrado de extremo a extremo opcional (bóveda con frase secreta y código de recuperación)
   - verificación en dos pasos (TOTP) opcional
   - cierre de sesión por inactividad, cerrar sesión en todos los dispositivos
   - permiso explícito antes de enviar datos a la IA
   - eliminar la cuenta, contraseñas más fuertes
   ===================================================================== */
const SEC = {
  VAULT: 'sec/vault', CONSENT: 'config/consent', POLICY_V: '2026-10-05',
  vault: { meta: null, key: null, remembered: false, bad: [] },
  mfa: { on: null },
  consent: null,
  inflight: 0, last: 0, lastW: 0, pendingAi: null, started: null,
  /* la sesión de esta carga quedó cerrada: nada puede volver a abrir la app hasta que la página recargue */
  dead: false
};
let secGateP = null;
const SEC_PBKDF_IT = 600000, SEC_REC_IT = 100000;
const SEC_B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SEC_IDLE = [[0, 'Nunca'], [15, '15 minutos'], [60, '1 hora'], [480, '8 horas']];
const SEC_COMMON = ['password', 'contrasena', 'contraseña', '123456', '12345678', '123456789', '1234567890', 'qwerty', 'qwertyuiop', 'asdfgh', 'zxcvbn', 'abc123', '111111', 'iloveyou', 'teamo', 'admin', 'ascend', 'colombia', 'futbol', 'football', 'millonarios', 'nacional', 'america', 'welcome', 'bienvenido'];
