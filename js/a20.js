'use strict';
function anaPrompt(kind, period) {
  if (kind === 'hab') return 'Analiza mis hábitos de ' + anaP(period).msg + ': qué cumplí, qué me está costando y qué ajustar para cumplirlos. Si conviene, propón hábitos nuevos o más fáciles.';
  if (hasCond('tca')) return 'Revisa ' + anaP(period).msg + ': si hice mis comidas con regularidad, agua, sueño, ánimo, ejercicio, hábitos y medicamentos. Sin hablar de calorías, peso, porciones ni cantidades. Dime qué salió bien y una cosa pequeña para mejorar.';
  return 'Analiza ' + anaP(period).msg + ': calorías que comí y quemé frente a mi meta, proteína y nutrientes, agua, sueño, ejercicio y hábitos. Dime si cumplí mis metas y cómo mejorar en mi caso.';
}
function saveAna() { if (S.loaded.aianalysis) saver.queue('config/aianalysis', { items: clone(S.ana.items.slice(0, MAX_ANA)) }, 200); }
async function anaRun(kind, msg) {
  if (S.ana.busy || S.readonly || !S.loaded.aianalysis) return;
  const period = kind === 'hab' ? S.ana.hperiod : kind === 'gen' ? S.ana.period : null;
  const text = kind === 'coach' ? String(msg || '').trim().slice(0, 1000) : anaPrompt(kind, period);
  if (!text) { S.ana.err.coach = 'Escribe qué quieres lograr.'; renderActive(); return; }
  S.ana.busy = kind;
  S.ana.err[kind] = '';
  renderActive();
  let res = null, data = null;
  try {
    const tok = await authToken();
    const context = anaContext(kind === 'coach' ? 'week' : period, kind === 'gen' ? 'gen' : 'hab');
    res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ mode: kind === 'gen' ? 'analysis' : 'habits', messages: [{ role: 'user', content: text }], context }) });
    try { data = await res.json(); } catch (e) { data = null; }
  } catch (e) { res = null; }
  S.ana.busy = '';
  if (res && res.ok && data && typeof data.text === 'string') {
    const item = { id: uid(), kind, period, at: Date.now(), q: kind === 'coach' ? text : '', text: data.text.slice(0, 8000), prop: data.proposal && typeof data.proposal === 'object' ? data.proposal : null, habits: Array.isArray(data.habits) ? data.habits.slice(0, 6) : null };
    S.ana.items = [item].concat(S.ana.items).slice(0, MAX_ANA);
    if (typeof data.remaining === 'number') S.chat.remaining = data.remaining;
    if (kind === 'coach') delete S.drafts['coach-in'];
    saveAna();
  } else S.ana.err[kind] = chatErrText(res, data);
  renderActive();
}
function anaApply(id) {
  const it = S.ana.items.find(x => x.id === id);
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
  saveAna();
  renderActive();
  toast('Metas aplicadas.' + (chk.skipped.length ? ' No cambié ' + chk.skipped.join(', ') + '.' : ''));
}
function anaPropHTML(it) {
  const chk = proposalCheck(it.prop), keys = Object.keys(chk.out);
  const note = chk.skipped.length ? '<p class="hint">No se aplica en tu caso: ' + esc(chk.skipped.join(', ')) + '.</p>' : '';
  if (!keys.length) return note ? '<div class="prop">' + note + '</div>' : '';
  const rows = keys.map(k => '<span class="pv"><span>' + PROP_LABELS[k][0] + '</span><b>' + (k === 'sleepGoal' ? fmtNum(chk.out[k], 1) : fmtInt(chk.out[k])) + (PROP_LABELS[k][1] ? ' ' + PROP_LABELS[k][1] : '') + '</b></span>').join('');
  return '<div class="prop"><p class="sh-sec">Metas propuestas</p><div class="prev-g">' + rows + '</div>' + note +
    (it.applied ? '<p class="pill ok">Aplicadas</p>' : '<button type="button" class="btn sm" id="ana-apply-' + esc(it.id) + '" data-act="ana-apply" data-id="' + esc(it.id) + '"' + (S.readonly ? ' disabled' : '') + '>Aplicar a mis metas</button>') + '</div>';
}
function anaOutHTML(it) {
  const when = new Date(it.at);
  const head = it.kind === 'coach' ? 'Pediste: ' + it.q : (it.kind === 'hab' ? 'Hábitos · ' : '') + (anaP(it.period).k === 'day' ? 'Día' : anaP(it.period).label) + ' · ' + fmtDay(keyOf(when)) + ', ' + fmtClock(when);
  return '<div class="ana-out"><p class="ana-when">' + esc(head) + '</p><div class="ana-text">' + fmtAiText(it.text) + '</div>' +
    (it.prop && hasCond('tca') ? '' : it.prop ? anaPropHTML(it) : '') + (it.habits ? habPropHTML(it.habits, 'ana', it.id) : '') + '</div>';
}
function anaCardHTML(kind) {
  const isH = kind === 'hab', per = isH ? S.ana.hperiod : S.ana.period;
  const opts = isH ? ANA_P.filter(p => p.k !== 'day') : ANA_P;
  const busy = S.ana.busy === kind, other = S.ana.busy && !busy;
  const items = S.ana.items.filter(x => x.kind === kind);
  const last = items[0];
  const dis = S.readonly || !S.loaded.aianalysis || S.ana.busy ? ' disabled' : '';
  return '<section class="card ana" id="card-ana-' + kind + '"><div class="card-h"><h2>' + (isH ? 'Análisis de tus hábitos' : 'Análisis con IA') + '</h2><span class="meta">Con IA</span></div>' +
    '<p class="prose">' + (isH ? 'La IA revisa qué hábitos cumpliste, tus rachas y qué ajustar para que te sea más fácil.' : (hasCond('tca') ? 'La IA revisa tus comidas, agua, sueño, ejercicio y hábitos, y te dice qué salió bien y qué ajustar.' : 'La IA revisa lo que registraste: calorías consumidas y quemadas frente a tu meta, proteína y nutrientes, agua, sueño, ejercicio y hábitos, y te dice cómo mejorar en tu caso.')) + '</p>' +
    '<div class="segc small" role="group" aria-label="Periodo">' + opts.map(p => '<button type="button" id="ana-' + kind + '-' + p.k + '" data-act="ana-p" data-kind="' + kind + '" data-v="' + p.k + '" aria-pressed="' + (per === p.k) + '"' + (S.ana.busy ? ' disabled' : '') + '>' + p.label + '</button>').join('') + '</div>' +
    '<button type="button" class="btn" id="ana-run-' + kind + '" data-act="ana-run" data-kind="' + kind + '"' + dis + '>' + (busy ? 'Analizando…' : 'Analizar ' + anaP(per).msg.replace(' de hoy', '')) + '</button>' +
    (other ? '<p class="hint">Espera a que termine el otro análisis.</p>' : '') +
    (S.ana.err[kind] ? '<p class="form-err">' + esc(S.ana.err[kind]) + '</p>' : '') +
    (last ? anaOutHTML(last) : '') +
    (items.length > 1 ? '<details class="hist"><summary>Análisis anteriores (' + (items.length - 1) + ')</summary>' + items.slice(1).map(anaOutHTML).join('') + '</details>' : '') +
    '<p class="hint">Responde con IA (Claude): puede equivocarse y no reemplaza a tu médico. Usa un mensaje de tu cupo diario' + (S.chat.remaining != null ? ' (te quedan ' + S.chat.remaining + ' hoy)' : '') + '.</p></section>';
}
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
