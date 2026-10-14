'use strict';
/* ---------- recordatorios ---------- */
const REP = [
  { k: '', label: 'Nunca' }, { k: 'd', label: 'Diario' }, { k: 'wd', label: 'Entre semana' },
  { k: 'w', label: 'Semanal' }, { k: 'm', label: 'Mensual' }, { k: 'y', label: 'Anual' }
];
const RCOLORS = ['#2F7D5B', '#2A6FB0', '#B0702A', '#B5432F', '#5B5FB0', '#8A4FA8', '#2C8C8C', '#77808A'];
function rlists() {
  const items = S.rlists && Array.isArray(S.rlists.items) ? S.rlists.items.filter(x => x && typeof x.id === 'string' && x.id && x.id !== 'inbox' && x.name)
    .map(x => ({ id: x.id, name: String(x.name).slice(0, 40), color: RCOLORS.indexOf(x.color) >= 0 ? x.color : RCOLORS[1] })) : [];
  return [{ id: 'inbox', name: 'Recordatorios', color: RCOLORS[0] }].concat(items);
}
/* la lista de un recordatorio; si su lista ya no existe (se borró en otro aparato) vive en «Recordatorios» */
function remLid(r, ids) { return r.l && r.l !== 'inbox' && (ids || new Set(rlists().map(l => l.id))).has(r.l) ? r.l : 'inbox'; }
/* datos de la nube o de una copia importada: se ordenan para que nada raro rompa la pantalla */
function remFix(r) {
  r.t = String(r.t == null ? '' : r.t).slice(0, 120);
  r.n = typeof r.n === 'string' ? r.n.slice(0, 500) : '';
  r.l = typeof r.l === 'string' && r.l ? r.l : 'inbox';
  if (!isKey(r.due)) r.due = null;
  if (!r.due || !isHM(r.time)) r.time = null;
  r.pri = clampInt(r.pri, 0, 3, 0);
  r.flag = !!r.flag; r.done = !!r.done;
  const rp = r.rep;
  if (!rp || typeof rp !== 'object' || ['d', 'wd', 'w', 'm', 'y'].indexOf(rp.f) < 0) r.rep = null;
  else {
    rp.i = clampInt(rp.i, 1, 99, 1);
    rp.days = Array.isArray(rp.days) ? rp.days.filter(n => Number.isInteger(n) && n >= 0 && n <= 6) : [];
    if (!rp.end || typeof rp.end !== 'object' || ['never', 'date', 'count'].indexOf(rp.end.t) < 0) rp.end = { t: 'never' };
    rp.count = clampInt(rp.count, 0, 9999, 0);
  }
  return r;
}
const rlistOf = id => rlists().find(x => x.id === id) || rlists()[0];
function remSort(a, b) {
  const da = a.due || '9999-99-99', db = b.due || '9999-99-99';
  if (da !== db) return da < db ? -1 : 1;
  const ta = a.time || '99:99', tb = b.time || '99:99';
  if (ta !== tb) return ta < tb ? -1 : 1;
  return ((b.pri || 0) - (a.pri || 0)) || ((a.createdAt || 0) - (b.createdAt || 0));
}
function remFlash(id) { const f = S.hab.flash[id]; return !!(f && f.until > Date.now()); }
function remInView(r, v, tk) {
  if (v === 'done') return !!r.done;
  if (r.done) return remFlash(r.id) && v !== 'done';
  if (v === 'today') return !!(r.due && r.due <= tk) || remFlash(r.id);
  if (v === 'scheduled') return !!r.due;
  if (v === 'flagged') return !!r.flag;
  if (v === 'all') return true;
  return remLid(r) === v;
}
function remCounts(tk) {
  const c = { today: 0, scheduled: 0, all: 0, flagged: 0, done: 0, lists: {} };
  const ids = new Set(rlists().map(l => l.id));
  for (const r of S.reminders) {
    if (r.done) { c.done++; continue; }
    c.all++;
    if (r.due) c.scheduled++;
    if (r.due && r.due <= tk) c.today++;
    if (r.flag) c.flagged++;
    const l = remLid(r, ids);
    c.lists[l] = (c.lists[l] || 0) + 1;
  }
  return c;
}
function repText(rp) {
  if (!rp || !rp.f) return '';
  const i = clampInt(rp.i, 1, 99, 1);
  let t;
  if (rp.f === 'd') t = i === 1 ? 'cada día' : 'cada ' + i + ' días';
  else if (rp.f === 'wd') t = 'entre semana';
  else if (rp.f === 'w') t = (i === 1 ? 'cada semana' : 'cada ' + i + ' semanas') + (rp.days && rp.days.length ? ' (' + WD_ORDER.filter(d => rp.days.indexOf(d) >= 0).map(d => WD[d].slice(0, 3).toLowerCase()).join(', ') + ')' : '');
  else if (rp.f === 'm') t = i === 1 ? 'cada mes' : 'cada ' + i + ' meses';
  else t = i === 1 ? 'cada año' : 'cada ' + i + ' años';
  const e = rp.end || {};
  if (e.t === 'date' && e.d) t += ', hasta el ' + fmtShort(e.d);
  if (e.t === 'count' && e.n) t += ', quedan ' + Math.max(1, e.n - (rp.count || 0));
  return t;
}
/* siguiente fecha de un recordatorio que se repite; null si ya no se repite más */
function remNext(r) {
  const rp = r.rep;
  if (!rp || !rp.f || !isKey(r.due)) return null;
  const i = clampInt(rp.i, 1, 99, 1);
  let k = r.due;
  if (rp.f === 'd') k = addDays(k, i);
  else if (rp.f === 'wd') { do { k = addDays(k, 1); } while ([0, 6].indexOf(parseKey(k).getDay()) >= 0); }
  else if (rp.f === 'w') {
    const days = Array.isArray(rp.days) && rp.days.length ? rp.days : null;
    if (!days) k = addDays(k, 7 * i);
    else {
      const ws = weekStart(r.due);
      let found = null;
      for (let x = addDays(r.due, 1); x <= addDays(ws, 6); x = addDays(x, 1)) if (days.indexOf(parseKey(x).getDay()) >= 0) { found = x; break; }
      if (!found) { const nws = addDays(ws, 7 * i); for (let j = 0; j < 7 && !found; j++) { const x = addDays(nws, j); if (days.indexOf(parseKey(x).getDay()) >= 0) found = x; } }
      k = found || addDays(k, 7 * i);
    }
  } else if (rp.f === 'm' || rp.f === 'y') {
    const d = parseKey(r.due), anchor = clampInt(rp.anchor, 1, 31, d.getDate());
    let m = d.getMonth() + (rp.f === 'm' ? i : 12 * i);
    const y = d.getFullYear() + Math.floor(m / 12);
    m = ((m % 12) + 12) % 12;
    k = keyOf(new Date(y, m, Math.min(anchor, new Date(y, m + 1, 0).getDate())));
  } else return null;
  const e = rp.end || {};
  if (e.t === 'date' && isKey(e.d) && k > e.d) return null;
  if (e.t === 'count' && e.n && (rp.count || 0) + 1 >= e.n) return null;
  return k;
}
function remCheck(id) {
  const r = S.reminders.find(x => x.id === id);
  if (!r || S.readonly || !S.loaded.reminders) return;
  const fl = S.hab.flash[id];
  if (fl && fl.until > Date.now() && fl.prev) {
    /* tocarlo otra vez mientras se ve tachado lo deshace (también si se repite: vuelve a su fecha) */
    r.due = fl.prev.due; r.rep = fl.prev.rep; r.done = fl.prev.done;
    if (fl.prev.doneAt) r.doneAt = fl.prev.doneAt; else delete r.doneAt;
    delete S.hab.flash[id];
    toast('Listo, quedó como estaba.');
  } else if (r.done) { r.done = false; delete r.doneAt; toast('Recordatorio pendiente otra vez.'); }
  else {
    const prev = { due: r.due, rep: r.rep ? clone(r.rep) : null, done: false, doneAt: r.doneAt || null };
    const nx = remNext(r);
    if (nx) { r.rep = Object.assign({}, r.rep, { count: (r.rep.count || 0) + 1 }); r.due = nx; toast('Hecho. Se repite ' + dayWord(nx).toLowerCase() + (r.time ? ' a las ' + fmtHM(r.time) : '') + '.'); }
    else { r.done = true; r.doneAt = Date.now(); }
    const tok = { until: Date.now() + 1300, prev };
    S.hab.flash[id] = tok;
    setTimeout(() => { if (S.hab.flash[id] === tok) delete S.hab.flash[id]; remRerender(); }, 1350);
  }
  putDoc('reminders/' + id, strip(r));
  remRerender();
}
function remRerender() {
  if (S.tab === 'habitos') renderHabitos();
  else if (S.tab === 'hoy') renderHoy(['rems']);
}
function remDateText(r) {
  if (!r.due) return '';
  return dayWord(r.due) + (r.time ? ', ' + fmtHM(r.time) : '');
}
const FLAG_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M5 3h2v18H5zM8 4h10l-2.5 4L18 12H8z"/></svg>';
function remRowHTML(r, showList, pre) {
  pre = pre || ''; /* Hoy usa otro prefijo: las dos vistas viven a la vez en la página y los id no se pueden repetir */
  const tk = todayKey(), fl = remFlash(r.id), checked = !!r.done || fl;
  const over = !r.done && r.due && r.due < tk;
  const meta = [];
  if (r.due) meta.push('<span class="' + (over ? 'over' : '') + '">' + esc(remDateText(r)) + '</span>');
  if (r.rep && r.rep.f) meta.push('<span>↻ ' + esc(repText(r.rep)) + '</span>');
  if (showList) { const l = rlistOf(r.l); meta.push('<span class="rl-tag"><i class="rdot" style="background:' + esc(l.color) + '"></i>' + esc(l.name) + '</span>'); }
  if (r.done && r.doneAt) meta.push('<span>hecho el ' + fmtShort(keyOf(new Date(r.doneAt))) + '</span>');
  return '<div class="rem' + (fl ? ' fading' : '') + (r.done ? ' isdone' : '') + '">' +
    '<button type="button" class="rchk" id="' + pre + 'rc-' + esc(r.id) + '" data-act="rem-check" data-id="' + esc(r.id) + '" aria-pressed="' + checked + '" aria-label="' + esc((checked ? 'Desmarcar ' : 'Completar ') + r.t) + '"' + (S.readonly ? ' disabled' : '') + '></button>' +
    '<button type="button" class="rem-main" id="' + pre + 're-' + esc(r.id) + '" data-act="rem-edit" data-id="' + esc(r.id) + '"><span class="rem-t">' + (r.pri ? '<b class="rpri">' + '!'.repeat(r.pri) + '</b> ' : '') + esc(r.t) + '</span>' +
      (r.n ? '<span class="rem-n">' + esc(r.n) + '</span>' : '') + (meta.length ? '<span class="rem-m">' + meta.join('<i class="sep">·</i>') + '</span>' : '') + '</button>' +
    (r.flag ? '<span class="rflag" title="Marcado">' + FLAG_SVG + '</span>' : '') + '</div>';
}
function remsTodayHTML(c) {
  if (!c.isToday || !S.loaded.reminders) return '<div id="card-rems" hidden></div>';
  const list = S.reminders.filter(r => (!r.done && r.due && r.due <= c.k) || (remFlash(r.id) && r.due && r.due <= addDays(c.k, 400))).sort(remSort);
  const shown = list.filter(r => (!r.done && r.due <= c.k) || remFlash(r.id)).slice(0, 8);
  if (!shown.length) return '<div id="card-rems" hidden></div>';
  const n = list.filter(r => !r.done && r.due <= c.k).length;
  return '<section id="card-rems" class="card"><div class="card-h"><h2>Recordatorios</h2><span class="meta">' + plural(n, 'pendiente', 'pendientes') + '</span></div><div class="rems">' + shown.map(r => remRowHTML(r, true, 'h')).join('') + '</div>' +
    '<button type="button" class="link" id="rems-go" data-act="rem-goto">Ver todos</button></section>';
}
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
