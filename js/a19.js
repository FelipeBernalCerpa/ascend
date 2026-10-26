'use strict';
function remSectionHTML() {
  const tk = todayKey(), v = S.hab.rview;
  if (!S.loaded.reminders || !S.loaded.rlists) return '<section class="card"><p class="empty">Cargando tus recordatorios…</p></section>';
  if (v === 'home') return remHomeHTML(tk);
  return remListHTML(v, tk);
}
function remHomeHTML(tk) {
  const c = remCounts(tk);
  const tile = (v, label, n, cls) => '<button type="button" class="rtile ' + cls + '" id="rv-' + v + '" data-act="rem-view" data-v="' + v + '"><span class="rtile-n">' + n + '</span><span class="rtile-l">' + label + '</span></button>';
  const lists = rlists();
  const nl = S.hab.newList;
  const canNotif = typeof Notification !== 'undefined' && Notification.permission === 'default';
  return '<section class="card" id="card-rhome"><div class="rtiles">' + tile('today', 'Hoy', c.today, 't-today') + tile('scheduled', 'Programados', c.scheduled, 't-sched') + tile('all', 'Todos', c.all, 't-all') + tile('flagged', 'Marcados', c.flagged, 't-flag') + '</div>' +
    '<button type="button" class="link rdone-link" id="rv-done" data-act="rem-view" data-v="done">Completados (' + c.done + ')</button></section>' +
    '<section class="card" id="card-rlists"><div class="card-h"><h2>Mis listas</h2><span class="meta">' + lists.length + '</span></div><div class="rlists">' +
      lists.map(l => '<button type="button" class="rlist" id="rl-' + esc(l.id) + '" data-act="rem-view" data-v="' + esc(l.id) + '"><i class="rdot" style="background:' + esc(l.color) + '"></i><span>' + esc(l.name) + '</span><b>' + (c.lists[l.id] || 0) + '</b></button>').join('') + '</div>' +
      (nl ? rlistFormHTML(null) : '<button type="button" class="btn sm quiet add-top" id="rl-new" data-act="rl-new"' + (S.readonly || lists.length > MAX_RLISTS ? ' disabled' : '') + '>Nueva lista</button>') +
      '<p class="hint">Agrupa tus recordatorios por tema: colegio, casa, compras, citas…</p></section>' +
    '<section class="card"><div class="row between"><button type="button" class="btn" id="rem-new" data-act="rem-new"' + (S.readonly ? ' disabled' : '') + '>Nuevo recordatorio</button>' +
      (canNotif ? '<button type="button" class="btn sm quiet" id="rem-notif" data-act="rem-notif">Activar avisos</button>' : '') + '</div>' +
      '<p class="hint">Los avisos de hora salen mientras Ascend está abierta en tu celular o computador.</p></section>';
}
function rlistFormHTML(l) {
  const col = S.hab.listColor || (l ? l.color : RCOLORS[1]);
  return '<form class="form rl-form" data-form="' + (l ? 'rl-edit' : 'rl-new') + '" novalidate><div class="field"><label class="lbl" for="rl-name">Nombre de la lista</label><input type="text" id="rl-name" data-draft maxlength="40" autocomplete="off" value="' + esc(draft('rl-name', l ? l.name : '')) + '"></div>' +
    '<div class="rcolors" role="group" aria-label="Color">' + RCOLORS.map(c => '<button type="button" class="rcolor" data-act="rl-color" data-v="' + c + '" aria-pressed="' + (c === col) + '" style="background:' + c + '" aria-label="Color"></button>').join('') + '</div>' +
    '<p class="form-err">' + esc(S.formErr.rl || '') + '</p><div class="row"><button type="submit" class="btn sm" id="rl-save">' + (l ? 'Guardar lista' : 'Crear lista') + '</button><button type="button" class="btn sm quiet" id="rl-cancel" data-act="rl-cancel">Cancelar</button></div></form>';
}
function remListHTML(v, tk) {
  const smart = { today: 'Hoy', scheduled: 'Programados', all: 'Todos', flagged: 'Marcados', done: 'Completados' };
  const isList = !smart[v];
  const l = isList ? rlistOf(v) : null;
  if (isList && l.id !== v) { S.hab.rview = 'home'; return remHomeHTML(tk); }
  let items = S.reminders.filter(r => remInView(r, v, tk));
  items = v === 'done' ? items.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)) : items.sort(remSort);
  const title = isList ? l.name : smart[v];
  const showList = !isList;
  let body = '';
  if (!items.length) body = '<p class="empty">' + (v === 'done' ? 'Aún no hay recordatorios completados.' : v === 'today' ? 'Nada pendiente para hoy.' : 'No hay recordatorios aquí.') + '</p>';
  else if (v === 'scheduled' || v === 'all') {
    const groups = [];
    for (const r of items) {
      const g = v === 'all' ? rlistOf(r.l).name : (!r.due ? 'Sin fecha' : r.due < tk ? 'Vencidos' : dayWord(r.due));
      let last = groups[groups.length - 1];
      if (v === 'all') last = groups.find(x => x.g === g);
      if (!last || last.g !== g) { last = { g, items: [] }; groups.push(last); }
      last.items.push(r);
    }
    body = groups.map(gr => '<p class="sh-sec">' + esc(gr.g) + '</p><div class="rems">' + gr.items.map(r => remRowHTML(r, v === 'scheduled')).join('') + '</div>').join('');
  } else body = '<div class="rems">' + items.map(r => remRowHTML(r, showList)).join('') + '</div>';
  const armedClear = S.confirmDel === 'rem-clear';
  const armedDel = S.confirmDel === 'rl-del';
  const quick = v === 'done' ? '' : '<form class="rq" data-form="rem-quick" novalidate><label class="lbl sr" for="rq-in">Nuevo recordatorio</label><input type="text" id="rq-in" data-draft maxlength="120" autocomplete="off" placeholder="Nuevo recordatorio" enterkeyhint="done" value="' + esc(draft('rq-in', '')) + '"' + (S.readonly ? ' readonly' : '') + '><button type="submit" class="btn sm" id="rq-add"' + (S.readonly ? ' disabled' : '') + '>Agregar</button></form>';
  return '<section class="card" id="card-rlist"><div class="rl-head"><button type="button" class="navbtn sm" id="rem-back" data-act="rem-view" data-v="home" aria-label="Volver a las listas">' + ICON.left + '</button>' +
    '<h2>' + (isList ? '<i class="rdot" style="background:' + esc(l.color) + '"></i>' : '') + esc(title) + '</h2><span class="meta">' + (v === 'done' ? items.length : items.filter(r => !r.done).length) + '</span></div>' +
    quick + body +
    (v === 'done' && items.length ? '<button type="button" class="btn sm ' + (armedClear ? 'danger' : 'quiet') + '" id="rem-clear" data-act="rem-clear">' + (armedClear ? 'Toca otra vez para borrarlos' : 'Borrar completados') + '</button>' : '') +
    (isList && l.id !== 'inbox' ? (S.hab.editList ? rlistFormHTML(l) : '<div class="row rl-acts"><button type="button" class="btn sm quiet" id="rl-edit" data-act="rl-edit">Editar lista</button><button type="button" class="btn sm ' + (armedDel ? 'danger' : 'quiet') + '" id="rl-del" data-act="rl-del">' + (armedDel ? 'Toca otra vez: sus recordatorios pasan a «Recordatorios»' : 'Borrar lista') + '</button></div>') : '') +
    '</section>';
}
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
  if (typeof medsOn === 'function' && medsOn() && typeof dosesFor === 'function') {
    const mday = S.days[tk], mrecs = (mday && mday.meds) || {};
    for (const ds of dosesFor(tk)) {
      if (mrecs[ds.key] && mrecs[ds.key].s === 'taken') continue;
      if (!isHM(ds.hm) || !near(ds.hm)) continue;
      const key = 'm:' + ds.key + ':' + tk;
      if (!seen[key]) { seen[key] = tk; out.push(['Medicamento', ds.med.name + (ds.med.dose ? ' · ' + ds.med.dose : '')]); }
    }
  }
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
    '<button type="button" role="tab" id="ht-rem" data-act="htab" data-v="rem" aria-selected="' + (t === 'rem') + '">Recordatorios</button>' +
    '<button type="button" role="tab" id="ht-boss" data-act="htab" data-v="boss" aria-selected="' + (t === 'boss') + '">Jefes</button></div>';
  swap(root, seg + (t === 'hab' ? habSectionHTML() : t === 'rem' ? remSectionHTML() : bossSectionHTML()));
}
