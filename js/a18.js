'use strict';
function remQuickAdd() {
  if (S.readonly || !S.loaded.reminders) return;
  const inp = $('#rq-in');
  const t = String(inp ? inp.value : '').trim().slice(0, 120);
  if (!t) return;
  if (S.reminders.length >= MAX_REMS) { toast('Llegaste al máximo de recordatorios. Borra los completados.'); return; }
  const v = S.hab.rview, tk = todayKey();
  const isList = ['today', 'scheduled', 'all', 'flagged', 'done', 'home'].indexOf(v) < 0;
  const data = { t, n: '', l: isList ? v : 'inbox', due: v === 'today' || v === 'scheduled' ? tk : null, time: null, rep: null, flag: v === 'flagged', pri: 0, done: false, createdAt: Date.now() };
  const id = uid();
  S.reminders.push(Object.assign({ id }, data));
  putDoc('reminders/' + id, data);
  delete S.drafts['rq-in'];
  renderHabitos();
  focusEl('rq-in');
}
function openRem(id) {
  if (S.readonly || !S.loaded.reminders) return;
  const r = id ? S.reminders.find(x => x.id === id) : null;
  if (id && !r) return;
  const v = S.hab.rview, tk = todayKey();
  const isList = ['today', 'scheduled', 'all', 'flagged', 'done', 'home'].indexOf(v) < 0;
  const rp = r && r.rep ? r.rep : {};
  const e = rp.end || {};
  const f = r ? { t: r.t, n: r.n || '', l: r.l || 'inbox', due: r.due || '', time: r.time || '', rf: rp.f || '', ri: String(rp.i || 1), rdays: Array.isArray(rp.days) ? rp.days.slice() : [], endT: e.t || 'never', endD: e.d || '', endN: String(e.n || 5), flag: !!r.flag, pri: r.pri || 0 }
    : { t: '', n: '', l: isList ? v : 'inbox', due: v === 'today' || v === 'scheduled' ? tk : '', time: '', rf: '', ri: '1', rdays: [], endT: 'never', endD: '', endN: '5', flag: v === 'flagged', pri: 0 };
  openSheet({ kind: 'rem', step: 'edit', id: id || null, f, err: '' });
  if (!id) focusEl('rf-t');
}
function shRemHTML(st) {
  const f = st.f, tk = todayKey(), armed = S.confirmDel === 'rdel:' + st.id;
  const tg = (act, v, on, label, extra) => '<button type="button" class="tgl" id="' + act + '-' + v + '" data-act="' + act + '" data-v="' + v + '" aria-pressed="' + !!on + '"' + (extra || '') + '>' + label + '</button>';
  const nextMon = addDays(tk, ((8 - parseKey(tk).getDay()) % 7) || 7);
  const quick = [['today', 'Hoy', tk], ['tomorrow', 'Mañana', addDays(tk, 1)], ['nextweek', 'Próx. lunes', nextMon], ['none', 'Sin fecha', '']];
  const unit = { d: ['día', 'días'], w: ['semana', 'semanas'], m: ['mes', 'meses'], y: ['año', 'años'] }[f.rf];
  return sheetTop(st.id ? 'Editar recordatorio' : 'Nuevo recordatorio') +
    '<form class="sh-form" data-form="sh-rem" novalidate>' +
      '<div class="field"><label class="lbl" for="rf-t">Recordatorio</label><input type="text" id="rf-t" data-rf="t" maxlength="120" autocomplete="off" value="' + esc(f.t) + '"></div>' +
      '<div class="field"><label class="lbl" for="rf-n">Notas</label><textarea id="rf-n" data-rf="n" rows="2" maxlength="500">' + esc(f.n) + '</textarea></div>' +
      '<div class="field"><label class="lbl" for="rf-l">Lista</label><select id="rf-l" data-rf="l">' + rlists().map(l => '<option value="' + esc(l.id) + '"' + (l.id === f.l ? ' selected' : '') + '>' + esc(l.name) + '</option>').join('') + '</select></div>' +
      '<div class="field"><span class="lbl">Fecha</span><div class="toggles">' + quick.map(q => tg('rf-date', q[0], f.due === q[2], q[1])).join('') + '</div></div>' +
      '<div class="grid2"><div class="field"><label class="lbl" for="rf-due">Día</label><input type="date" id="rf-due" data-rf="due" value="' + esc(f.due) + '"></div>' +
      '<div class="field"><label class="lbl" for="rf-time">Hora (opcional)</label><input type="time" id="rf-time" data-rf="time" value="' + esc(f.time) + '"' + (f.due ? '' : ' disabled') + '></div></div>' +
      '<div class="field"><span class="lbl">Repetir</span><div class="toggles">' + REP.map(x => tg('rf-rep', x.k || 'no', f.rf === x.k, x.label)).join('') + '</div></div>' +
      (f.rf && f.rf !== 'wd' ? '<div class="field"><label class="lbl" for="rf-ri">Cada cuántos ' + unit[1] + '</label><input type="text" inputmode="numeric" id="rf-ri" data-rf="ri" autocomplete="off" value="' + esc(f.ri) + '"></div>' : '') +
      (f.rf === 'w' ? '<div class="field"><span class="lbl">Qué días (opcional)</span><div class="toggles days">' + WD_ORDER.map(n => tg('rf-day', n, f.rdays.indexOf(n) >= 0, WD1[n], ' aria-label="' + WD[n] + '"')).join('') + '</div></div>' : '') +
      (f.rf ? '<div class="field"><span class="lbl">Dejar de repetir</span><div class="toggles">' + tg('rf-end', 'never', f.endT === 'never', 'Nunca') + tg('rf-end', 'date', f.endT === 'date', 'En una fecha') + tg('rf-end', 'count', f.endT === 'count', 'Después de varias veces') + '</div></div>' +
        (f.endT === 'date' ? '<div class="field"><label class="lbl" for="rf-endd">Último día</label><input type="date" id="rf-endd" data-rf="endD" value="' + esc(f.endD) + '"></div>' : '') +
        (f.endT === 'count' ? '<div class="field"><label class="lbl" for="rf-endn">Cuántas veces en total</label><input type="text" inputmode="numeric" id="rf-endn" data-rf="endN" autocomplete="off" value="' + esc(f.endN) + '"></div>' : '') : '') +
      '<div class="field"><span class="lbl">Prioridad</span><div class="toggles">' + [[0, 'Ninguna'], [1, 'Baja'], [2, 'Media'], [3, 'Alta']].map(p => tg('rf-pri', p[0], f.pri === p[0], p[1])).join('') + '</div></div>' +
      '<button type="button" class="switch" id="rf-flag" data-act="rf-flag" aria-pressed="' + !!f.flag + '"><span class="sw"></span>Marcado</button>' +
      '<p class="form-err" id="sh-err">' + esc(st.err || '') + '</p>' +
      '<button type="submit" class="btn" id="rf-save">' + (st.id ? 'Guardar cambios' : 'Crear recordatorio') + '</button>' +
      (st.id ? '<button type="button" class="btn sm ' + (armed ? 'danger' : 'quiet') + '" id="rf-del" data-act="rem-del">' + (armed ? 'Toca otra vez para borrarlo' : 'Borrar recordatorio') + '</button>' : '') +
    '</form>';
}
function remFormSync() {
  const st = S.sheet;
  if (!st || st.kind !== 'rem') return;
  for (const [id, f] of [['rf-t', 't'], ['rf-n', 'n'], ['rf-l', 'l'], ['rf-due', 'due'], ['rf-time', 'time'], ['rf-ri', 'ri'], ['rf-endd', 'endD'], ['rf-endn', 'endN']]) { const el = document.getElementById(id); if (el) st.f[f] = el.value; }
}
function remSave() {
  const st = S.sheet;
  if (!st || st.kind !== 'rem' || S.readonly) return;
  remFormSync();
  const f = st.f, prev = st.id ? S.reminders.find(x => x.id === st.id) : null;
  const t = String(f.t || '').trim().slice(0, 120);
  let due = isKey(f.due) ? f.due : '';
  let err = '';
  if (!t) err = 'Escribe el recordatorio.';
  else if (f.due && !due) err = 'Revisa la fecha.';
  else if (!st.id && S.reminders.length >= MAX_REMS) err = 'Llegaste al máximo de recordatorios. Borra los completados.';
  if (!err && (f.rf || isHM(f.time)) && !due) due = todayKey();
  let rep = null;
  if (!err && f.rf) {
    const i = parseInt(f.ri, 10);
    if (f.rf !== 'wd' && !(i >= 1 && i <= 99)) err = 'El intervalo va de 1 a 99.';
    const end = f.endT === 'date' ? { t: 'date', d: f.endD } : f.endT === 'count' ? { t: 'count', n: parseInt(f.endN, 10) } : { t: 'never' };
    const days = f.rf === 'w' ? WD_ORDER.filter(d => f.rdays.indexOf(d) >= 0) : [];
    /* la fecha pasa al primer día que de verdad toca, antes de revisar el último día */
    if (!err && f.rf === 'w' && days.length && days.indexOf(parseKey(due).getDay()) < 0) { let k = due; for (let j = 0; j < 7 && days.indexOf(parseKey(k).getDay()) < 0; j++) k = addDays(k, 1); due = k; }
    if (!err && f.rf === 'wd') while ([0, 6].indexOf(parseKey(due).getDay()) >= 0) due = addDays(due, 1);
    if (!err && end.t === 'date' && (!isKey(end.d) || end.d < due)) err = 'El último día debe ser después de la fecha del recordatorio.';
    if (!err && end.t === 'count' && !(end.n >= 2 && end.n <= 999)) err = 'Escribe de 2 a 999 veces.';
    if (!err) {
      const same = prev && prev.rep && prev.rep.f === f.rf;
      rep = { f: f.rf, i: f.rf === 'wd' ? 1 : i, days, end, count: same ? (prev.rep.count || 0) : 0 };
      /* mensual o anual el 31 (o el 29 de febrero): si solo se edita el texto, conserva el día original */
      if (f.rf === 'm' || f.rf === 'y') rep.anchor = same && prev.due === due && prev.rep.anchor ? clampInt(prev.rep.anchor, 1, 31, parseKey(due).getDate()) : parseKey(due).getDate();
    }
  }
  if (err) { sheetErr(st, err); return; }
  const lid = rlists().some(l => l.id === f.l) ? f.l : 'inbox';
  const data = { t, n: String(f.n || '').trim().slice(0, 500), l: lid, due: due || null, time: due && isHM(f.time) ? f.time : null, rep, flag: !!f.flag, pri: clampInt(f.pri, 0, 3, 0), done: prev ? !!prev.done : false, createdAt: prev ? prev.createdAt : Date.now() };
  if (prev && prev.doneAt) data.doneAt = prev.doneAt;
  const id = st.id || uid();
  const i = S.reminders.findIndex(x => x.id === id);
  if (i >= 0) S.reminders[i] = Object.assign({ id }, data); else S.reminders.push(Object.assign({ id }, data));
  putDoc('reminders/' + id, data);
  closeSheet();
  remRerender();
  toast(st.id ? 'Recordatorio actualizado.' : 'Recordatorio creado' + (data.due ? ' para ' + dayWord(data.due).toLowerCase() : '') + '.');
}
function remDelete() {
  const st = S.sheet;
  if (!st || !st.id) return;
  confirmOrDo('rdel:' + st.id, () => { const id = st.id; S.reminders = S.reminders.filter(r => r.id !== id); delDoc('reminders/' + id); closeSheet(); remRerender(); toast('Recordatorio borrado.'); },
    () => { if (S.sheet && S.sheet.kind === 'rem') { remFormSync(); renderSheet(); } });
}
function rlistSave(editing) {
  if (S.readonly || !S.loaded.rlists) return;
  const name = String((($('#rl-name') || {}).value) || '').trim().slice(0, 40);
  const items = rlists().slice(1).map(x => Object.assign({}, x));
  S.formErr.rl = !name ? 'Escribe el nombre.' : items.some(x => norm(x.name) === norm(name) && (!editing || x.id !== S.hab.rview)) || norm(name) === norm('Recordatorios') ? 'Ya tienes una lista con ese nombre.' : (!editing && items.length >= MAX_RLISTS) ? 'Puedes tener hasta ' + MAX_RLISTS + ' listas.' : '';
  if (S.formErr.rl) { renderHabitos(); return; }
  const pick = RCOLORS.indexOf(S.hab.listColor) >= 0 ? S.hab.listColor : null, color = pick || RCOLORS[1];
  if (editing) { const l = items.find(x => x.id === S.hab.rview); if (l) { l.name = name; l.color = pick || l.color; } }
  else items.push({ id: 'l' + uid(), name, color });
  S.rlists = { items };
  saver.queue('config/rlists', clone(S.rlists), 100);
  delete S.drafts['rl-name'];
  S.hab.newList = false; S.hab.editList = false; S.hab.listColor = null;
  renderHabitos();
}
function rlistDelete() {
  const id = S.hab.rview;
  if (id === 'inbox' || !S.loaded.rlists || S.readonly) return;
  confirmOrDo('rl-del', () => {
    S.rlists = { items: rlists().slice(1).filter(x => x.id !== id) };
    saver.queue('config/rlists', clone(S.rlists), 100);
    for (const r of S.reminders) if (r.l === id) { r.l = 'inbox'; putDoc('reminders/' + r.id, strip(r)); }
    S.hab.rview = 'home';
    toast('Lista borrada. Sus recordatorios están en «Recordatorios».');
  }, renderHabitos);
}

/* avisos dentro de la app */
let v4Tick = 0;
function v4Notify() {
  if (!S.dataReady) return;
  const tk = todayKey(), now = new Date(), nm = now.getHours() * 60 + now.getMinutes();
  let seen = {};
  try { seen = JSON.parse(lsGet('ascend-avisos') || '{}') || {}; } catch (e) { seen = {}; }
  const out = [];
  const near = hm => { const m = hm2min(hm); return m <= nm && nm - m < 180; };
  for (const r of S.reminders) if (!r.done && r.due === tk && isHM(r.time) && near(r.time)) { const key = 'r:' + r.id + ':' + r.due + ':' + r.time; if (!seen[key]) { seen[key] = tk; out.push(['Recordatorio', r.t]); } }
  for (const h of habs()) if (h.remind && habDueOn(h, tk) && !habDone(h, tk) && near(h.remind)) { const key = 'h:' + h.k + ':' + tk; if (!seen[key]) { seen[key] = tk; out.push(['Hábito', h.label]); } }
  if (!out.length) return;
  for (const k of Object.keys(seen)) if (seen[k] < addDays(tk, -3)) delete seen[k];
  lsSet('ascend-avisos', JSON.stringify(seen));
  toast(out.map(x => x[0] + ': ' + x[1]).join(' · '));
  try { if (typeof Notification !== 'undefined' && Notification.permission === 'granted') for (const x of out) new Notification(x[0], { body: x[1] }); } catch (e) {}
}

/* ---------- pestaña Hábitos ---------- */
function renderHabitos() {
  const root = $('#view-habitos');
  if (!root) return;
  const t = S.hab.tab;
  const seg = '<div class="segc" role="tablist" aria-label="Hábitos o recordatorios">' +
    '<button type="button" role="tab" id="ht-hab" data-act="htab" data-v="hab" aria-selected="' + (t === 'hab') + '">Hábitos</button>' +
    '<button type="button" role="tab" id="ht-rem" data-act="htab" data-v="rem" aria-selected="' + (t === 'rem') + '">Recordatorios</button></div>';
  swap(root, seg + (t === 'hab' ? habSectionHTML() : remSectionHTML()));
}

/* ---------- gimnasio ---------- */
function lastGym() {
  const tk = todayKey();
  let best = null;
  for (let i = 0; i < 90; i++) {
    const d = S.days[addDays(tk, -i)];
    if (!d || !Array.isArray(d.acts)) continue;
    for (const a of d.acts) if (a && a.k === 'gym' && (!best || (a.at || 0) > (best.at || 0))) best = a;
    if (best) return best;
  }
  return null;
}
function gymVolume(a) {
  let sets = 0, kg = 0;
  for (const x of a.ex || []) for (const s of x.sets || []) { sets++; kg += (Number(s.r) || 0) * (Number(s.kg) || 0); }
  return { sets, kg: Math.round(kg) };
}
function setsText(sets) {
  const ok = (sets || []).filter(s => s && (Number(s.r) > 0 || Number(s.kg) > 0));
  if (!ok.length) return 'sin series';
  const same = ok.every(s => String(s.r) === String(ok[0].r) && String(s.kg || '') === String(ok[0].kg || ''));
  const one = s => (Number(s.r) || 0) + (Number(s.kg) > 0 ? ' × ' + numText(Number(s.kg)) + ' kg' : ' rep.');
  if (same) return ok.length + ' × ' + one(ok[0]);
  return ok.map(s => (Number(s.r) || 0) + (Number(s.kg) > 0 ? '×' + numText(Number(s.kg)) : '')).join(', ') + (ok.some(s => Number(s.kg) > 0) ? ' kg' : ' rep.');
}
function gymCopyEx(ex) { return (ex || []).map(x => ({ n: String(x.n || ''), sets: (x.sets || []).map(s => ({ r: s.r == null ? '' : String(s.r), kg: s.kg == null ? '' : String(s.kg) })) })); }
function openGym(id) {
  if (S.readonly || !S.daysLoaded) return;
  let st;
  if (id) {
    const a = (getDay(S.viewKey).acts || []).find(x => x.id === id);
    if (!a) return;
    st = { kind: 'gym', step: 'gym', editId: id, name: a.title || String(a.name || '').replace(/^Gimnasio:?\s*/, ''), min: String(a.min || 60), lv: GYM_LEVELS.some(l => l.k === a.lv) ? a.lv : 'moderada', ex: gymCopyEx(a.ex), err: '', saveRt: false, q: '' };
  } else st = { kind: 'gym', step: 'gym', editId: null, name: '', min: '60', lv: 'moderada', ex: [], err: '', saveRt: false, q: '' };
  if (S.sheet) { stopScan(); S.sheet = st; renderSheet(); const c = $('#sheet-card'); if (c) c.scrollTop = 0; } else openSheet(st);
}
function gymEstimate(st) {
  const perH = exPerH(), min = parseInt(st.min, 10), lv = GYM_LEVELS.find(l => l.k === st.lv) || GYM_LEVELS[1];
  const vol = gymVolume({ ex: st.ex.map(x => ({ sets: x.sets.map(s => ({ r: parseNum(s.r), kg: parseNum(s.kg) })) })) });
  const parts = [];
  if (perH && min > 0) parts.push('≈ ' + fmtInt(r10((lv.met - 1) * perH * min / 60)) + ' kcal además de tu gasto en reposo');
  else if (!perH) parts.push('Registra tu peso en Progreso para estimar las calorías');
  if (st.ex.length) parts.push(plural(st.ex.length, 'ejercicio', 'ejercicios'), plural(vol.sets, 'serie', 'series'));
  if (vol.kg) parts.push(fmtInt(vol.kg) + ' kg levantados');
  return parts.join(' · ');
}
function shGymHTML(st) {
  if (st.step === 'pick') return shGymPickHTML(st);
  const last = st.editId ? null : lastGym();
  const rts = S.routines.slice().sort(byCreated);
  const start = !st.editId && (last || rts.length) ? '<p class="sh-sec">Empezar desde</p><div class="toggles gym-rts">' +
      (last ? '<button type="button" class="tgl" id="gym-last" data-act="gym-last">Repetir el último<small>' + esc(last.title || last.name || 'Gimnasio') + '</small></button>' : '') +
      rts.map(r => '<span class="gym-rt"><button type="button" class="tgl" id="gym-rt-' + esc(r.id) + '" data-act="gym-rt" data-id="' + esc(r.id) + '">' + esc(r.name) + '<small>' + plural((r.ex || []).length, 'ejercicio', 'ejercicios') + '</small></button>' +
        (st.rtManage ? '<button type="button" class="xbtn' + (S.confirmDel === 'rt:' + r.id ? ' armed' : '') + '" id="gym-rtx-' + esc(r.id) + '" data-act="gym-rtdel" data-id="' + esc(r.id) + '">' + (S.confirmDel === 'rt:' + r.id ? '¿Borrar?' : 'Borrar') + '</button>' : '') + '</span>').join('') + '</div>' +
      (rts.length ? '<button type="button" class="link" id="gym-rtm" data-act="gym-rtmanage">' + (st.rtManage ? 'Listo' : 'Administrar rutinas') + '</button>' : '') : '';
  const exHTML = st.ex.map((x, i) => '<div class="gx"><div class="gx-h"><span class="gx-n">' + esc(x.n) + '</span><button type="button" class="xbtn" id="gx-del-' + i + '" data-act="gym-xdel" data-i="' + i + '">Quitar</button></div>' +
      '<div class="gsets">' + x.sets.map((s, j) => '<div class="gset"><span class="gset-n">' + (j + 1) + '</span>' +
        '<label class="lbl sr" for="gs-' + i + '-' + j + '-r">Repeticiones de la serie ' + (j + 1) + '</label><input type="text" inputmode="numeric" id="gs-' + i + '-' + j + '-r" data-gs="' + i + ':' + j + ':r" autocomplete="off" placeholder="reps" value="' + esc(s.r) + '">' +
        '<span class="gset-x">×</span><label class="lbl sr" for="gs-' + i + '-' + j + '-kg">Kilos de la serie ' + (j + 1) + '</label><input type="text" inputmode="decimal" id="gs-' + i + '-' + j + '-kg" data-gs="' + i + ':' + j + ':kg" autocomplete="off" placeholder="kg" value="' + esc(s.kg) + '"><span class="gset-u">kg</span>' +
        (x.sets.length > 1 ? '<button type="button" class="gset-del" id="gs-del-' + i + '-' + j + '" data-act="gym-sdel" data-i="' + i + '" data-j="' + j + '" aria-label="Quitar serie ' + (j + 1) + '">×</button>' : '<span></span>') + '</div>').join('') + '</div>' +
      '<button type="button" class="btn sm quiet" id="gs-add-' + i + '" data-act="gym-sadd" data-i="' + i + '">+ Serie</button></div>').join('');
  return sheetTop(st.editId ? 'Editar entrenamiento' : 'Entrenamiento de gimnasio') +
    start +
    '<form class="sh-form" data-form="sh-gym" novalidate>' +
      '<div class="field"><label class="lbl" for="gy-name">Nombre (opcional)</label><input type="text" id="gy-name" data-gy="name" maxlength="50" autocomplete="off" placeholder="Pierna, pecho y tríceps, full body…" value="' + esc(st.name) + '"></div>' +
      '<div class="field"><label class="lbl" for="gy-min">Duración (minutos)</label><div class="amt-row"><input type="text" inputmode="numeric" id="gy-min" data-gy="min" autocomplete="off" value="' + esc(st.min) + '">' +
        [30, 45, 60, 90].map(v => '<button type="button" class="tgl q" id="gy-m-' + v + '" data-act="gym-min" data-v="' + v + '" aria-pressed="' + (String(v) === String(st.min)) + '">' + v + '</button>').join('') + '</div></div>' +
      '<div class="field"><span class="lbl">Intensidad</span><div class="toggles lv3">' + GYM_LEVELS.map(l => '<button type="button" class="tgl" id="gy-lv-' + l.k + '" data-act="gym-lv" data-v="' + l.k + '" aria-pressed="' + (st.lv === l.k) + '">' + l.label + '<small>' + l.sub + '</small></button>').join('') + '</div></div>' +
      '<p class="sh-sec">Ejercicios</p>' + (st.ex.length ? exHTML : '<p class="hint">Agrega los ejercicios que hiciste con sus series, repeticiones y kilos. Si no quieres el detalle, guarda solo los minutos.</p>') +
      '<button type="button" class="btn quiet" id="gym-addx" data-act="gym-addx">Agregar ejercicio</button>' +
      '<p class="hint" id="gym-est">' + esc(gymEstimate(st)) + '</p>' +
      (!st.editId ? '<button type="button" class="switch" id="gym-rtsave" data-act="gym-rtsave" aria-pressed="' + !!st.saveRt + '"><span class="sw"></span>Guardar también como rutina</button>' : '') +
      '<p class="form-err" id="sh-err">' + esc(st.err || '') + '</p>' +
      '<button type="submit" class="btn" id="gym-save"' + (S.readonly ? ' disabled' : '') + '>' + (st.editId ? 'Guardar cambios' : 'Guardar entrenamiento') + '</button>' +
    '</form>';
}
