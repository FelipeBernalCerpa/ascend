'use strict';
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
