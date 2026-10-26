'use strict';
function openHabitEdit(k) {
  if (S.readonly || !S.loaded.habits) return;
  const h = k ? habs().find(x => x.k === k) : null;
  const tk = todayKey();
  const f = h ? { label: h.label, freq: h.freq, days: h.days.slice(), times: String(h.times), start: h.start || '', endMode: h.end ? 'date' : 'none', end: h.end || '', remind: h.remind, note: h.note }
    : { label: '', freq: 'daily', days: [1, 2, 3, 4, 5], times: '3', start: tk, endMode: 'none', end: '', remind: '', note: '' };
  const st = { kind: 'habit', step: 'edit', k: k || null, f, err: '' };
  if (S.sheet) { S.sheet = st; renderSheet(); const c = $('#sheet-card'); if (c) c.scrollTop = 0; } else openSheet(st);
  if (!k) focusEl('hf-label');
}
function shHabitHTML(st) {
  const f = st.f, armed = S.confirmDel === 'hdel:' + st.k;
  const tg = (act, v, on, label, extra, cls) => '<button type="button" class="tgl' + (cls ? ' ' + cls : '') + '" id="' + act + '-' + v + '" data-act="' + act + '" data-v="' + v + '" aria-pressed="' + !!on + '"' + (extra || '') + '>' + label + '</button>';
  const durs = [[21, '21 días'], [30, '30 días'], [66, '66 días'], [90, '90 días']];
  return sheetTop(st.k ? 'Editar hábito' : 'Nuevo hábito') +
    '<form class="sh-form" data-form="sh-habit" novalidate>' +
      '<div class="field"><label class="lbl" for="hf-label">Hábito</label><input type="text" id="hf-label" data-hf="label" maxlength="60" autocomplete="off" placeholder="Leer 10 minutos" value="' + esc(f.label) + '"></div>' +
      '<div class="field"><span class="lbl">Frecuencia</span><div class="toggles">' + HFREQ.map(x => tg('hf-freq', x.k, f.freq === x.k, x.label)).join('') + '</div></div>' +
      (f.freq === 'days' ? '<div class="field"><span class="lbl">Qué días</span><div class="toggles days">' + WD_ORDER.map(n => tg('hf-day', n, f.days.indexOf(n) >= 0, WD1[n], ' aria-label="' + WD[n] + '"')).join('') + '</div></div>' : '') +
      (f.freq === 'weekly' ? '<div class="field"><span class="lbl">Cuántas veces por semana</span><div class="toggles">' + [1, 2, 3, 4, 5, 6, 7].map(n => tg('hf-times', n, String(n) === String(f.times), String(n))).join('') + '</div></div>' : '') +
      (f.freq === 'monthly' ? '<div class="field"><label class="lbl" for="hf-times">Cuántas veces al mes</label><div class="amt-row"><input type="text" inputmode="numeric" id="hf-times" data-hf="times" autocomplete="off" value="' + esc(f.times) + '">' +
        [1, 2, 4, 8, 12].map(n => tg('hf-times', n, String(n) === String(f.times), String(n), '', 'q')).join('') + '</div></div>' : '') +
      '<div class="grid2"><div class="field"><label class="lbl" for="hf-start">Empieza</label><input type="date" id="hf-start" data-hf="start" value="' + esc(f.start) + '"></div>' +
      '<div class="field"><label class="lbl" for="hf-remind">Aviso (opcional)</label><input type="time" id="hf-remind" data-hf="remind" value="' + esc(f.remind) + '"></div></div>' +
      '<div class="field"><span class="lbl">Durante cuánto tiempo</span><div class="toggles">' + tg('hf-end', 'none', f.endMode === 'none', 'Sin fin') + tg('hf-end', 'date', f.endMode === 'date', 'Hasta una fecha') + '</div></div>' +
      (f.endMode === 'date' ? '<div class="field"><label class="lbl" for="hf-endd">Termina el</label><input type="date" id="hf-endd" data-hf="end" value="' + esc(f.end) + '"></div>' +
        '<div class="toggles">' + durs.map(x => tg('hf-dur', x[0], false, x[1])).join('') + '</div>' : '') +
      '<div class="field"><label class="lbl" for="hf-note">Nota (opcional)</label><input type="text" id="hf-note" data-hf="note" maxlength="200" autocomplete="off" value="' + esc(f.note) + '"></div>' +
      '<p class="form-err" id="sh-err">' + esc(st.err || '') + '</p>' +
      '<button type="submit" class="btn" id="hf-save">' + (st.k ? 'Guardar cambios' : 'Crear hábito') + '</button>' +
      (st.k ? '<button type="button" class="btn sm ' + (armed ? 'danger' : 'quiet') + '" id="hf-del" data-act="hab-del" data-k="' + esc(st.k) + '">' + (armed ? 'Toca otra vez para borrarlo' : 'Borrar hábito') + '</button>' : '') +
    '</form>' +
    '<p class="hint">Lo que ya marcaste se conserva aunque cambies la frecuencia. Los avisos salen mientras Ascend está abierta.</p>';
}
function habFormSync() {
  const st = S.sheet;
  if (!st || st.kind !== 'habit') return;
  for (const [id, f] of [['hf-label', 'label'], ['hf-start', 'start'], ['hf-remind', 'remind'], ['hf-endd', 'end'], ['hf-note', 'note'], ['hf-times', 'times']]) { const el = document.getElementById(id); if (el) st.f[f] = el.value; }
}
function habSave() {
  const st = S.sheet;
  if (!st || st.kind !== 'habit' || S.readonly) return;
  habFormSync();
  const f = st.f, label = String(f.label || '').trim().slice(0, 60);
  const list = habitsList().map(x => Object.assign({}, x));
  const tk = todayKey();
  let err = '';
  const times = f.freq === 'monthly' ? parseInt(f.times, 10) : f.freq === 'weekly' ? parseInt(f.times, 10) : 0;
  if (!label) err = 'Escribe el hábito.';
  else if (list.some(x => x.k !== st.k && norm(x.label) === norm(label))) err = 'Ya tienes un hábito con ese nombre.';
  else if (!st.k && list.length >= MAX_HABITS) err = 'Puedes tener hasta ' + MAX_HABITS + ' hábitos.';
  else if (f.freq === 'days' && !f.days.length) err = 'Elige al menos un día.';
  else if (f.freq === 'weekly' && !(times >= 1 && times <= 7)) err = 'Elige de 1 a 7 veces por semana.';
  else if (f.freq === 'monthly' && !(times >= 1 && times <= 31)) err = 'Escribe de 1 a 31 veces al mes.';
  else if (f.start && !isKey(f.start)) err = 'Revisa la fecha de inicio.';
  else if (f.endMode === 'date' && !isKey(f.end)) err = 'Elige la fecha en que termina.';
  else if (f.endMode === 'date' && f.end < (f.start || tk)) err = 'La fecha final debe ser después del inicio.';
  if (err) { sheetErr(st, err); return; }
  const h = { k: st.k || 'h-' + uid(), label, freq: f.freq, days: f.freq === 'days' ? WD_ORDER.filter(d => f.days.indexOf(d) >= 0) : [], times: times || 0, start: f.start || '', end: f.endMode === 'date' ? f.end : '', remind: isHM(f.remind) ? f.remind : '', note: String(f.note || '').trim().slice(0, 200) };
  const i = list.findIndex(x => x.k === h.k);
  if (i >= 0) { h.createdAt = list[i].createdAt; list[i] = h; } else { h.createdAt = Date.now(); list.push(h); }
  saveHabits(list);
  closeSheet();
  renderActive();
  toast(i >= 0 ? 'Hábito actualizado.' : 'Hábito creado: ' + label + '.');
}
function habDelete(k) {
  confirmOrDo('hdel:' + k, () => {
    saveHabits(habitsList().filter(x => x.k !== k));
    closeSheet();
    toast('Hábito borrado. Los días que marcaste se conservan en tu historial.');
  }, () => { if (S.sheet && S.sheet.kind === 'habit') { habFormSync(); renderSheet(); } else renderActive(); });
}
/* agrega hábitos propuestos por la IA */
function habFromProposal(p) {
  const freq = { diario: 'daily', dias: 'days', semanal: 'weekly', mensual: 'monthly' }[p.frecuencia] || 'daily';
  const tk = todayKey(), dur = clampInt(p.duracion_dias, 0, 365, 0);
  return { k: 'h-' + uid(), label: String(p.nombre || '').trim().slice(0, 60), freq, days: freq === 'days' ? (Array.isArray(p.dias) ? p.dias.filter(n => n >= 0 && n <= 6) : [1, 2, 3, 4, 5]) : [], times: freq === 'weekly' ? clampInt(p.veces, 1, 7, 3) : freq === 'monthly' ? clampInt(p.veces, 1, 31, 4) : 0, start: tk, end: dur ? addDays(tk, dur - 1) : '', remind: '', note: String(p.motivo || '').trim().slice(0, 200), createdAt: Date.now() };
}
/* la IA no puede colar hábitos riesgosos: filtros por condición y edad (sin edad se aplican los de menores) */
const HB_TCA = /calor|kcal|peso|pesar|bascula|cintura|medida|imc|macro|dieta|ayun|restring|porcion|comer menos|no comer|saltar|omitir|quitar|eliminar|solo (verdura|fruta|liquido|agua)|quemar|compens|laxant|purg|vomit|diuretic|ejercicio extra|aunque (este|estes|estoy) cansad|correr \d|\d+ ?km|abdominales diari/;
const HB_MINOR = /ayun|deficit|saltar(se|me)? (el |la |las |los )?(desayuno|almuerzo|cena|comida|onces|merienda)|omitir|no (desayunar|almorzar|cenar|comer)|contar (calorias|macros)|quemador|quemar \d|suplement|creatina|proteina en polvo|whey|keto|cetogenic|detox|pesarse|pesarme|bascula|comer menos|restring|laxant|diuretic|bebida energetica|energizante/;
const HB_RENAL = /\b(agua|liquidos?|litros?|vasos?|hidrat\w*|proteinas?|sal|sodio|potasio|fosforo|creatina|suplement\w*|whey|electrolito\w*|bebida deportiva)\b/;
function habPropBlocked(p) {
  const t = norm((p.nombre || '') + ' ' + (p.motivo || ''));
  if (hasCond('tca') && HB_TCA.test(t)) return true;
  const age = userAge();
  if ((age == null || age < 18) && HB_MINOR.test(t)) return true;
  if (hasCond('renal') && HB_RENAL.test(t)) return true;
  return false;
}
function habPropList(list) { return (Array.isArray(list) ? list : []).filter(p => p && p.nombre && !habPropBlocked(p)).slice(0, 6); }
function habPropHTML(list, src, id) {
  const ok = habPropList(list);
  if (!ok.length) return '';
  const have = new Set(habitsList().map(x => norm(x.label)));
  const rows = ok.map((p, i) => {
    const h = habFromProposal(p), added = have.has(norm(h.label));
    const sub = [habFreqText(habNorm(h)), p.duracion_dias ? 'durante ' + plural(clampInt(p.duracion_dias, 1, 365, 1), 'día', 'días') : ''].filter(Boolean).join(' · ');
    return '<div class="hprop"><div class="hprop-x"><b>' + esc(h.label) + '</b><small>' + esc(sub) + '</small>' + (p.motivo ? '<span>' + esc(p.motivo) + '</span>' : '') + '</div>' +
      (added ? '<span class="pill ok">Agregado</span>' : '<button type="button" class="btn sm" id="hp-' + src + '-' + esc(id) + '-' + i + '" data-act="hp-add" data-src="' + src + '" data-id="' + esc(id) + '" data-i="' + i + '"' + (S.readonly ? ' disabled' : '') + '>Agregar</button>') + '</div>';
  }).join('');
  const pending = ok.filter(p => !have.has(norm(String(p.nombre).trim().slice(0, 60)))).length;
  return '<div class="prop hprops"><p class="sh-sec">Hábitos propuestos</p>' + rows +
    (pending > 1 ? '<button type="button" class="btn sm ghost" id="hpa-' + src + '-' + esc(id) + '" data-act="hp-all" data-src="' + src + '" data-id="' + esc(id) + '"' + (S.readonly ? ' disabled' : '') + '>Agregar todos</button>' : '') + '</div>';
}
function habPropSource(src, id) {
  if (src === 'chat') { const it = S.chat.items[Number(id)]; return it ? it.habits : null; }
  const it = S.ana.items.find(x => x.id === id);
  return it ? it.habits : null;
}
function habAddProposals(src, id, idx) {
  if (S.readonly || !S.loaded.habits) return;
  const ok = habPropList(habPropSource(src, id));
  const pick = idx == null ? ok : [ok[idx]].filter(Boolean);
  const list = habitsList().map(x => Object.assign({}, x));
  const have = new Set(list.map(x => norm(x.label)));
  let n = 0;
  for (const p of pick) {
    const h = habFromProposal(p);
    if (!h.label || have.has(norm(h.label)) || list.length >= MAX_HABITS) continue;
    list.push(h); have.add(norm(h.label)); n++;
  }
  if (!n) { toast(list.length >= MAX_HABITS ? 'Llegaste al máximo de ' + MAX_HABITS + ' hábitos.' : 'Ya tienes ese hábito.'); return; }
  saveHabits(list);
  renderActive();
  toast(n === 1 ? 'Hábito agregado.' : 'Agregué ' + n + ' hábitos.');
}

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
