'use strict';
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
