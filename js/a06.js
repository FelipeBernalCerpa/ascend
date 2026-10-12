'use strict';
function medSlotMins(m) {
  return (m.slots || []).filter(s => S.settings.slots[s]).map(s => hm2min(S.settings.slots[s].time)).sort((a, b) => a - b);
}
function nextDoseDate(m, k, sl) {
  const cur = hm2min(S.settings.slots[sl].time);
  const mins = medSlotMins(m);
  if (!mins.length) return null;
  const later = mins.filter(t => t > cur);
  if (later.length && medOnDay(m, k)) return atMin(k, later[0]);
  for (let i = 1; i <= 8; i++) { const kk = addDays(k, i); if (medOnDay(m, kk)) return atMin(kk, mins[0]); }
  return null;
}
function lastTakenAt(medId, k, excludeKey) {
  let best = null;
  for (const kk of [k, addDays(k, -1)]) {
    const d = S.days[kk];
    if (!d || !d.meds) continue;
    for (const key of Object.keys(d.meds)) {
      const r = d.meds[key];
      if (kk === k && key === excludeKey) continue;
      if (key.indexOf(medId + '__') !== 0 || !r || r.s !== 'taken' || !r.at) continue;
      if (best == null || r.at > best) best = r.at;
    }
  }
  return best;
}
function doseState(k, x, rec) {
  if (rec && rec.s === 'taken') return { state: 'taken', at: rec.at };
  if (rec && rec.s === 'skipped') return { state: 'skipped' };
  const tk = todayKey();
  if (k < tk) return { state: 'unlogged' };
  const now = Date.now();
  const sched = atMin(k, hm2min(x.hm)).getTime();
  if (now < sched - 30 * 60e3) return { state: 'upcoming' };
  const last = lastTakenAt(x.med.id, k, x.key);
  if (last && last <= now && now - last < 6 * 3600e3) return { state: 'recent', at: last };
  const next = nextDoseDate(x.med, k, x.slot);
  if (next && now >= next.getTime() - 4 * 3600e3) return { state: 'near', next };
  if (now >= sched + 2 * 3600e3) return { state: 'late' };
  return { state: 'due' };
}
function sleepHours(s) {
  if (!s || !s.bed || !s.wake) return null;
  let m = hm2min(s.wake) - hm2min(s.bed);
  if (m <= 0) m += 1440;
  return Math.round(m / 6) / 10;
}
function bedDelay(bed) {
  if (!bed) return 0;
  let b = hm2min(bed), t = hm2min(S.settings.bedTarget);
  if (b < 720) b += 1440;
  if (t < 720) t += 1440;
  return b - t;
}
const fmtDelay = m => (m >= 60 ? (Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '')) : m + ' min');
function dayStats(k, day) {
  const ds = dosesFor(k), meds = day.meds || {};
  return {
    doses: ds.length,
    taken: ds.filter(x => meds[x.key] && meds[x.key].s === 'taken').length,
    water: sum(day.water),
    goal: Number(S.settings.waterGoal) || 2000,
    boosts: habitsList().filter(b => day.boost && day.boost[b.k]).length,
    hrs: sleepHours(day.sleep)
  };
}
function countIntense(k) {
  let n = 0;
  for (let i = 0; i < 7; i++) if (dayIntense(S.days[addDays(k, -i)])) n++;
  return n;
}
function medSchedText(m) {
  const slots = (m.slots || []).filter(s => S.settings.slots[s])
    .sort((a, b) => hm2min(S.settings.slots[a].time) - hm2min(S.settings.slots[b].time))
    .map(s => S.settings.slots[s].name.toLowerCase() + ' (' + fmtHM(S.settings.slots[s].time) + ')');
  const days = Array.isArray(m.days) ? m.days : ALL_DAYS;
  const dtxt = days.length === 7 ? 'todos los días' : !days.length ? 'ningún día' : WD_ORDER.filter(d => days.indexOf(d) >= 0).map(d => WD[d].toLowerCase()).join(', ');
  return (slots.join(' y ') || 'sin horario') + ', ' + dtxt;
}
function labGroupKey(l) { return l.key === 'otro' ? 'otro:' + String(l.name || '').trim().toLowerCase() : l.key; }
function labName(l) { return l.key === 'otro' ? (l.name || 'Otro examen') : (LAB_BY[l.key] ? LAB_BY[l.key].name : (l.name || 'Examen')); }
const hasNum = v => v != null && v !== '' && isFinite(Number(v));
function labStatus(l) {
  const v = Number(l.value);
  if (!isFinite(v)) return null;
  if (hasNum(l.low) && v < Number(l.low)) return ['warn', 'Bajo'];
  if (hasNum(l.high) && v > Number(l.high)) return ['warn', 'Alto'];
  if (hasNum(l.low) || hasNum(l.high)) return ['ok', 'En rango'];
  return null;
}
function rangeShort(l) {
  const u = l.unit ? ' ' + l.unit : '';
  if (hasNum(l.low) && hasNum(l.high)) return fmtNum(l.low) + '–' + fmtNum(l.high) + u;
  if (hasNum(l.high)) return 'hasta ' + fmtNum(l.high) + u;
  if (hasNum(l.low)) return 'desde ' + fmtNum(l.low) + u;
  return '';
}
function labDefaults(type, name) {
  const nm = String(name || '').trim().toLowerCase();
  const prev = S.labs.filter(l => l.key === type && (type !== 'otro' || String(l.name || '').trim().toLowerCase() === nm)).sort(byDate).pop();
  if (prev) return { unit: prev.unit || '', low: hasNum(prev.low) ? String(prev.low) : '', high: hasNum(prev.high) ? String(prev.high) : '' };
  return { unit: LAB_BY[type] ? LAB_BY[type].unit : '', low: '', high: '' };
}

/* ---------- render: utilidades ---------- */
function swap(root, html) {
  const a = document.activeElement;
  let fid = null, s0 = null, s1 = null;
  if (a && a.id && root.contains(a)) { fid = a.id; try { s0 = a.selectionStart; s1 = a.selectionEnd; } catch (e) {} }
  root.innerHTML = html;
  restoreFocus(fid, s0, s1);
}
function replaceEl(el, html) {
  const a = document.activeElement;
  let fid = null, s0 = null, s1 = null;
  if (a && a.id && el.contains(a)) { fid = a.id; try { s0 = a.selectionStart; s1 = a.selectionEnd; } catch (e) {} }
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  const n = t.content.firstElementChild;
  if (n) el.replaceWith(n);
  restoreFocus(fid, s0, s1);
}
function restoreFocus(fid, s0, s1) {
  if (!fid) return;
  const f = document.getElementById(fid);
  if (!f) return;
  try { f.focus({ preventScroll: true }); } catch (e) {}
  try { if (s0 != null && typeof f.setSelectionRange === 'function') f.setSelectionRange(s0, s1); } catch (e) {}
}
const ro = () => (S.readonly ? ' disabled' : '');
const roText = () => (S.readonly ? ' readonly' : '');

/* ---------- gráficas ---------- */
function niceTicks(min, max, count) {
  if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
  if (min === max) { const d = Math.abs(min) * 0.05 || 1; min -= d; max += d; }
  const raw = (max - min) / (count || 3);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const step = (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let i = 0; lo + i * step <= hi + step / 2 && i < 12; i++) ticks.push(lo + i * step);
  return { lo, hi, step, ticks };
}
function lineChartSVG(spec, W) {
  const pts = spec.points.slice().sort((a, b) => a.x - b.x);
  if (!pts.length) return '';
  const H = 168, m = { l: 42, r: 18, t: 20, b: 26 };
  let lo = Math.min.apply(null, pts.map(p => p.y)), hi = Math.max.apply(null, pts.map(p => p.y));
  const band = spec.band;
  if (band) { if (hasNum(band.low)) lo = Math.min(lo, band.low); if (hasNum(band.high)) hi = Math.max(hi, band.high); }
  const t = niceTicks(lo, hi, 3);
  let x0 = pts[0].x, x1 = pts[pts.length - 1].x;
  if (x0 === x1) { x0 -= 15 * 864e5; x1 += 15 * 864e5; }
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const X = x => m.l + (x - x0) / (x1 - x0) * iw;
  const Y = y => m.t + (1 - (y - t.lo) / (t.hi - t.lo)) * ih;
  const dec = t.step >= 1 ? 0 : t.step >= 0.1 ? 1 : 2;
  let g = '';
  if (band && (hasNum(band.low) || hasNum(band.high))) {
    const bl = hasNum(band.low) ? band.low : t.lo, bh = hasNum(band.high) ? band.high : t.hi;
    g += '<rect class="ch-band" x="' + m.l + '" y="' + Y(bh).toFixed(1) + '" width="' + iw + '" height="' + Math.max(0, Y(bl) - Y(bh)).toFixed(1) + '"/>';
  }
  for (const v of t.ticks) {
    const y = Y(v).toFixed(1);
    g += '<line class="ch-grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y + '" y2="' + y + '"/>';
    g += '<text class="ch-lbl" x="' + (m.l - 7) + '" y="' + (Number(y) + 3.5) + '" text-anchor="end">' + fmtNum(v, dec, dec) + '</text>';
  }
  const path = pts.map((p, i) => (i ? 'L' : 'M') + X(p.x).toFixed(1) + ',' + Y(p.y).toFixed(1)).join('');
  if (pts.length > 1) {
    g += '<path class="ch-area" d="' + path + 'L' + X(pts[pts.length - 1].x).toFixed(1) + ',' + (m.t + ih) + 'L' + X(pts[0].x).toFixed(1) + ',' + (m.t + ih) + 'Z"/>';
    g += '<path class="ch-line" d="' + path + '"/>';
  }
  pts.forEach((p, i) => {
    const last = i === pts.length - 1;
    g += '<circle class="' + (last ? 'ch-last' : 'ch-dot') + '" cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="' + (last ? 5 : 3.2) + '"/>';
  });
  const lp = pts[pts.length - 1], lx = X(lp.x), ly = Y(lp.y);
  const end = lx > W - m.r - 70;
  g += '<text class="ch-val" x="' + (end ? lx - 9 : lx + 9).toFixed(1) + '" y="' + Math.max(12, ly - 10).toFixed(1) + '" text-anchor="' + (end ? 'end' : 'start') + '">' + esc(fmtNum(lp.y, spec.dec == null ? 1 : spec.dec)) + (spec.unit ? ' ' + esc(spec.unit) : '') + '</text>';
  g += '<text class="ch-lbl" x="' + m.l + '" y="' + (H - 6) + '" text-anchor="start">' + fmtMonYr(pts[0].x) + '</text>';
  if (pts.length > 1) g += '<text class="ch-lbl" x="' + (W - m.r) + '" y="' + (H - 6) + '" text-anchor="end">' + fmtMonYr(lp.x) + '</text>';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="' + esc(spec.label || 'Gráfica') + '">' + g + '</svg>';
}
function drawCharts(root) {
  if (!root) return;
  for (const el of $$('.chart[data-chart]', root)) {
    const spec = S.charts[el.dataset.chart];
    if (!spec) continue;
    const W = Math.max(240, Math.round(el.clientWidth || 320));
    el.innerHTML = lineChartSVG(spec, W);
  }
}

/* ---------- HOY ---------- */
function daynavHTML(c) {
  const tk = todayKey(), isY = c.k === addDays(tk, -1);
  const title = c.isToday ? 'Hoy' : isY ? 'Ayer' : fmtDay(c.k);
  const sub = (c.isToday || isY) ? fmtDay(c.k) : 'Registro de un día anterior';
  return '<div id="card-daynav" class="daynav-wrap">' +
    '<div class="daynav">' +
      '<button type="button" class="navbtn" id="day-prev" data-act="day" data-d="-1" aria-label="Día anterior">' + ICON.left + '</button>' +
      '<div class="daynav-t"><h1>' + esc(title) + '</h1><span class="sub">' + esc(sub) + '</span></div>' +
      '<button type="button" class="navbtn" id="day-next" data-act="day" data-d="1" aria-label="Día siguiente"' + (c.isToday ? ' disabled' : '') + '>' + ICON.right + '</button>' +
    '</div>' +
    (!c.isToday ? '<button type="button" class="link back" id="day-today" data-act="day-today">Volver a hoy</button>' : '') +
    (S.readonly ? '<p class="banner">Estás viendo esta app en modo lectura. Los cambios no se guardan.</p>' : '') +
    (S.fetching.has(c.k) ? '<p class="hint">Cargando este día…</p>' : '') +
  '</div>';
}
const meter = (lbl, val, pct, cls) => '<div class="meter' + (cls ? ' ' + cls : '') + '"><span class="m-lbl">' + lbl + '</span><span class="m-val">' + val + '</span>' +
  (pct == null ? '' : '<span class="m-bar"><i style="width:' + Math.round(Math.max(0, Math.min(1, pct)) * 100) + '%"></i></span>') + '</div>';
function metersHTML(c) {
  const st = dayStats(c.k, c.day);
  const sg = Number(S.settings.sleepGoal) || 8.5;
  const nu = dayNutri(c.day), goals = S.settings.nutri || {};
  const kg = Number(goals.kcal) || 0, pg = Number(goals.p) || 0, sgoal = Number(S.settings.stepGoal) || 0;
  const steps = Number(c.day.steps) || 0;
  const none = '<small>Sin registro</small>';
  return '<div id="card-meters" class="meters" role="group" aria-label="Resumen del día">' +
    meter('Medicinas', st.doses ? st.taken + '<small>/' + st.doses + '</small>' : '<small>Sin tomas</small>', st.doses ? st.taken / st.doses : 0, '') +
    meter('Agua', fmtNum(st.water / 1000, 2) + '<small> / ' + fmtNum(st.goal / 1000, 2) + ' L</small>', st.water / st.goal, 'water') +
    meter('Calorías', nu.count ? fmtInt(nu.kcal) + '<small> ' + (kg ? '/ ' + fmtInt(kg) : 'kcal') + '</small>' : none, kg ? nu.kcal / kg : null, kg && goalKind('kcal') === 'max' && nu.kcal > kg ? 'camel over' : 'camel') +
    meter('Proteína', nu.count ? fmtNut('p', nu.p) + '<small> ' + (pg ? '/ ' + fmtNut('p', pg) + ' g' : 'g') + '</small>' : none, pg ? nu.p / pg : null, pg && goalKind('p') === 'max' && nu.p > pg ? 'over' : '') +
    meter('Sueño', st.hrs == null ? none : fmtNum(st.hrs, 1) + '<small> h</small>', st.hrs == null ? 0 : st.hrs / sg, 'sleep') +
    meter('Pasos', steps ? fmtInt(steps) + (sgoal ? '<small> / ' + fmtK(sgoal) + '</small>' : '') : none, sgoal ? steps / sgoal : null, 'steps') +
  '</div>';
}
function medsHTML(c) {
  const head = meta => '<div class="card-h"><h2>Medicamentos</h2><span class="meta">' + (meta ? meta + ' · ' : '') + '<button type="button" class="link inline" id="meds-edit" data-act="meds-edit">Editar</button></span></div>';
  const wrap = inner => '<section id="card-meds" class="card">' + inner + '</section>';
  if (!S.medsLoaded || !S.daysLoaded) return wrap(head('') + '<p class="empty">Cargando tus medicamentos…</p>');
  if (!S.meds.length) return wrap(head('') + '<p class="empty">Aún no tienes medicamentos.</p><button type="button" class="btn add" id="meds-first" data-act="med-new-go">Agregar medicamento</button>');
  const doses = dosesFor(c.k);
  if (!doses.length) return wrap(head('') + '<p class="empty">Este día no hay tomas programadas.</p>');
  const recs = c.day.meds || {};
  const taken = doses.filter(x => recs[x.key] && recs[x.key].s === 'taken').length;
  const groups = [];
  for (const x of doses) {
    let g = groups[groups.length - 1];
    if (!g || g.slot !== x.slot) { g = { slot: x.slot, hm: x.hm, items: [] }; groups.push(g); }
    g.items.push(x);
  }
  const body = groups.map(g =>
    '<div class="slot"><div class="slot-h"><span class="slot-name">' + esc(S.settings.slots[g.slot].name) + '</span><span class="slot-time">' + fmtHM(g.hm) + '</span></div>' +
    g.items.map(x => doseHTML(c, x, recs[x.key])).join('') + '</div>'
  ).join('');
  return wrap(head(taken + ' de ' + doses.length) + body + '<p class="hint">Si se te olvida una toma y ya casi toca la siguiente, sáltala. Nunca dobles.</p>');
}
function doseHTML(c, x, rec) {
  const st = doseState(c.k, x, rec);
  const base = 'd-' + x.med.id + '-' + x.slot;
  const btn = (op, label, cls) => '<button type="button" class="btn sm ' + (cls || '') + '" id="' + base + '-' + op + '" data-act="dose" data-op="' + op + '" data-key="' + esc(x.key) + '" data-hm="' + esc(x.hm) + '"' + ro() + '>' + label + '</button>';
  let acts = '', note = '', tag = '';
  switch (st.state) {
    case 'taken':
      tag = '<span class="pill ok">Tomada' + (st.at ? ' · ' + fmtClock(new Date(st.at)) : '') + '</span>';
      acts = btn('undo', 'Deshacer', 'quiet'); break;
    case 'skipped':
      tag = '<span class="pill muted">Saltada</span>';
      acts = btn('undo', 'Deshacer', 'quiet'); break;
    case 'near':
      note = '<p class="dnote crit">Ya casi toca la siguiente dosis (' + fmtClock(st.next) + '). Sáltala y sigue normal. Nunca dobles.</p>';
      acts = btn('skip', 'Saltar esta toma') + btn('had', 'Ya me la había tomado', 'ghost'); break;
    case 'recent':
      note = '<p class="dnote crit">Ya registraste una dosis de este medicamento a las ' + fmtClock(new Date(st.at)) + '. No tomes otra sin consultar.</p>';
      acts = btn('skip', 'Saltar esta toma') + btn('take', 'Registrar tomada', 'ghost'); break;
    case 'late':
      note = '<p class="dnote warn">Atrasada. Si te acuerdas ahora, tómala. Si ya casi toca la siguiente, sáltala.</p>';
      acts = btn('take', 'Tomada') + btn('skip', 'Saltar', 'ghost'); break;
    case 'due':
      tag = '<span class="pill accent">Toca ahora</span>';
      acts = btn('take', 'Tomada') + btn('skip', 'Saltar', 'ghost'); break;
    case 'upcoming':
      acts = btn('take', 'Tomada', 'ghost') + btn('skip', 'Saltar', 'quiet'); break;
    default:
      tag = '<span class="pill muted">Sin registrar</span>';
      acts = btn('take', 'Tomada', 'ghost') + btn('skip', 'Saltada', 'quiet');
  }
  const sub = [x.med.dose, x.med.note].filter(Boolean).map(esc).join(' · ');
  return '<div class="dose" data-state="' + st.state + '"><div class="dose-main"><div class="dose-name">' + esc(x.med.name || 'Sin nombre') + '</div>' +
    (sub ? '<div class="dose-sub">' + sub + '</div>' : '') + (tag ? '<div class="dose-tag">' + tag + '</div>' : '') +
    '</div><div class="dose-act">' + acts + '</div>' + note + '</div>';
}
function waterHTML(c) {
  const ml = sum(c.day.water), goal = Number(S.settings.waterGoal) || 2000;
  const n = Math.min(12, Math.max(4, Math.ceil(goal / 250))), filled = Math.min(n, Math.floor(ml / 250));
  let glasses = '';
  for (let i = 0; i < n; i++) glasses += '<span class="glass' + (i < filled ? ' on' : '') + '"></span>';
  const dis = S.readonly || !S.daysLoaded ? ' disabled' : '';
  return '<section id="card-water" class="card"><div class="card-h"><h2>Agua</h2><span class="meta">Meta ' + fmtInt(goal) + ' ml</span></div>' +
    '<div class="water-top"><span class="big">' + fmtInt(ml) + '</span><span class="unit">ml</span></div>' +
    '<div class="glasses" aria-hidden="true">' + glasses + '</div>' +
    '<div class="row">' +
      '<button type="button" class="btn water" id="w-250" data-act="water" data-ml="250"' + dis + '>+250 ml</button>' +
      '<button type="button" class="btn water" id="w-500" data-act="water" data-ml="500"' + dis + '>+500 ml</button>' +
      '<button type="button" class="btn quiet" id="w-undo" data-act="water-undo"' + (ml ? dis : ' disabled') + '>Deshacer</button>' +
    '</div></section>';
}
function boostHTML(c) {
  const b = c.day.boost || {};
  const list = habs().filter(h => habDueOn(h, c.k) || b[h.k]);
  const n = list.filter(x => b[x.k]).length;
  return '<section id="card-boost" class="card"><div class="card-h"><h2>Hábitos del día</h2>' + (list.length ? '<span class="meta">' + n + ' de ' + list.length + '</span>' : '') + '</div>' +
    (list.length ? '<div class="chips">' + list.map(x => '<button type="button" class="chip" id="b-' + esc(x.k) + '" data-act="boost" data-k="' + esc(x.k) + '" aria-pressed="' + !!b[x.k] + '"' + ro() + '><span class="tick"></span><span>' + esc(x.label) +
        (habFlex(x) ? '<small class="chip-s">' + esc(habProgText(x, c.k)) + '</small>' : '') + '</span></button>').join('') + '</div>' +
      '<p class="hint">Marca lo que cumpliste. <button type="button" class="link inline" id="boost-go" data-go="habitos">Editar mis hábitos</button></p>'
      : '<p class="empty">Hoy no tienes hábitos pendientes. <button type="button" class="link inline" id="boost-go" data-go="habitos">Ir a Hábitos</button></p>') + '</section>';
}
function sleepHTML(c) {
  const s = c.day.sleep || {}, h = sleepHours(s), goal = Number(S.settings.sleepGoal) || 8.5;
  let out = '<p class="hint">Anota a qué hora te dormiste anoche y a qué hora te levantaste.</p>';
  if (h != null) {
    const tone = h >= goal ? 'ok' : h >= goal - 1 ? 'warn' : 'crit';
    const txt = h >= goal ? 'Meta cumplida' : h >= goal - 1 ? 'Cerca de la meta' : 'Por debajo de la meta';
    const late = bedDelay(s.bed);
    out = '<div class="sleep-out"><span class="big">' + fmtNum(h, 1) + '</span><span class="unit">horas</span><span class="pill ' + tone + '">' + txt + '</span></div>' +
      (late > 30 ? '<p class="hint">Te dormiste ' + fmtDelay(late) + ' después de la meta de las ' + fmtHM(S.settings.bedTarget) + '.</p>' : '');
  }
  const dis = S.readonly || !S.daysLoaded ? ' disabled' : '';
  return '<section id="card-sleep" class="card"><div class="card-h"><h2>Sueño de anoche</h2><span class="meta">Meta ' + fmtNum(goal, 1) + ' h</span></div>' +
    '<div class="grid2">' +
      '<div class="field"><label class="lbl" for="sleep-bed">Me dormí</label><input type="time" id="sleep-bed" data-sleep="bed" value="' + esc(s.bed || '') + '"' + dis + '></div>' +
      '<div class="field"><label class="lbl" for="sleep-wake">Me levanté</label><input type="time" id="sleep-wake" data-sleep="wake" value="' + esc(s.wake || '') + '"' + dis + '></div>' +
    '</div>' + out +
    (!s.bed && !s.wake ? '<button type="button" class="btn sm ghost" id="sleep-fill" data-act="sleep-fill"' + dis + '>Usar la meta: ' + fmtHM(S.settings.bedTarget) + ' a ' + fmtHM(S.settings.wakeTarget) + '</button>' : '') +
  '</section>';
}
