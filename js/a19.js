'use strict';
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
function shGymPickHTML(st) {
  const q = norm(st.q || ''), qt = q ? q.split(' ') : [];
  const btn = n => '<button type="button" class="fres" data-act="gym-pick" data-n="' + esc(n) + '"><span class="fres-n">' + esc(n) + '</span></button>';
  let h = '';
  if (q) {
    const found = [];
    for (const [g, names] of GYM_LIB) for (const n of names) if (matchScore(n + ' ' + g, q, qt) >= 0) found.push(n);
    h = (found.length ? '<div class="fres-list">' + found.map(btn).join('') + '</div>' : '') +
      '<div class="fres-list"><button type="button" class="fres" id="gym-custom" data-act="gym-pick" data-n="' + esc(String(st.q).trim().slice(0, 50)) + '"><span class="fres-n">Agregar «' + esc(String(st.q).trim().slice(0, 50)) + '»</span><span class="fres-m">Ejercicio con el nombre que escribiste</span></button></div>';
  } else h = GYM_LIB.map(([g, names]) => '<details class="cat"><summary>' + esc(g) + ' <small>' + names.length + '</small></summary><div class="fres-list">' + names.map(btn).join('') + '</div></details>').join('');
  return sheetTop('Agregar ejercicio', true) +
    '<form data-form="gym-search" role="search" novalidate><label class="lbl sr" for="gym-q">Buscar ejercicio</label><input type="search" id="gym-q" data-gq="1" placeholder="Busca o escribe: sentadilla, press, curl…" value="' + esc(st.q || '') + '" autocomplete="off" enterkeyhint="search"></form>' +
    '<div id="gym-res">' + h + '</div>';
}
function gymSync() {
  const st = S.sheet;
  if (!st || st.kind !== 'gym' || st.step !== 'gym') return;
  const n = $('#gy-name'), m = $('#gy-min');
  if (n) st.name = n.value;
  if (m) st.min = m.value;
  for (const el of $$('[data-gs]', $('#sheet-card'))) {
    const [i, j, f] = el.dataset.gs.split(':');
    if (st.ex[i] && st.ex[i].sets[j]) st.ex[i].sets[j][f] = el.value;
  }
}
function gymSave() {
  const st = S.sheet;
  if (!st || st.kind !== 'gym' || S.readonly) return;
  gymSync();
  const ms = String(st.min || '').trim(), min = /^\d{1,3}$/.test(ms) ? parseInt(ms, 10) : NaN;
  const lv = GYM_LEVELS.find(l => l.k === st.lv) || GYM_LEVELS[1];
  let err = '';
  if (!(min > 0 && min <= 600)) err = 'Escribe la duración en minutos (de 1 a 600).';
  const ex = [];
  if (!err) for (const x of st.ex.slice(0, 25)) {
    const sets = [];
    for (const s of x.sets.slice(0, 15)) {
      const rs = String(s.r || '').trim(), ks = String(s.kg || '').trim();
      if (!rs && !ks) continue;
      const r = rs ? (/^\d{1,3}$/.test(rs) ? parseInt(rs, 10) : NaN) : 0, kg = ks ? parseNum(ks) : null;
      if (rs && !(r >= 0 && r <= 500)) { err = x.n + ': las repeticiones son un número entero de 0 a 500.'; break; }
      if (ks && !(isFinite(kg) && kg >= 0 && kg <= 1000)) { err = x.n + ': los kilos van de 0 a 1000.'; break; }
      sets.push(kg == null ? { r } : { r, kg: r1(kg) });
    }
    if (err) break;
    ex.push({ n: String(x.n).slice(0, 50), sets });
  }
  if (err) { sheetErr(st, err); return; }
  const title = String(st.name || '').trim().slice(0, 50);
  const item = { id: st.editId || uid(), k: 'gym', name: 'Gimnasio' + (title ? ': ' + title : ''), title, met: lv.met, lv: lv.k, min, hi: false, ex, at: Date.now() };
  let full = false;
  const ok = mutDay(S.viewKey, d => {
    const l = Array.isArray(d.acts) ? d.acts.slice() : [];
    const i = st.editId ? l.findIndex(a => a.id === st.editId) : -1;
    if (i >= 0) { item.at = l[i].at || item.at; l[i] = item; }
    else if (l.length >= MAX_ACTS) { full = true; return; }
    else l.push(item);
    d.acts = l;
  });
  if (!ok) return;
  if (full) { sheetErr(st, 'Llegaste al máximo de ejercicios para un día.'); return; }
  let rtMsg = '';
  if (st.saveRt && !st.editId) {
    if (!title) rtMsg = ' Para guardarlo como rutina, ponle nombre.';
    else if (S.routines.length >= MAX_ROUTINES) rtMsg = ' No guardé la rutina: ya tienes ' + MAX_ROUTINES + '.';
    else if (S.loaded.routines) {
      const id = uid(), data = { name: title, min, lv: lv.k, ex: ex.map(x => ({ n: x.n, sets: x.sets })), createdAt: Date.now() };
      S.routines.push(Object.assign({ id }, data));
      putDoc('routines/' + id, data);
      rtMsg = ' Rutina guardada.';
    }
  }
  closeSheet();
  renderHoy(['act', 'meters']);
  toast((st.editId ? 'Entrenamiento actualizado.' : 'Entrenamiento guardado: ' + min + ' min.') + rtMsg);
}

/* ---------- comida: combinaciones agrupadas ---------- */

/* ---------- análisis con IA ---------- */
const ANA_P = [{ k: 'day', label: 'Día', n: 1, msg: 'mi día de hoy' }, { k: 'week', label: 'Semana', n: 7, msg: 'mi última semana' }, { k: 'month', label: 'Mes', n: 30, msg: 'mi último mes' }];
const anaP = k => ANA_P.find(p => p.k === k) || ANA_P[1];
function anaDays(period) { const n = anaP(period).n, tk = todayKey(), out = []; for (let i = n - 1; i >= 0; i--) out.push(addDays(tk, -i)); return out; }
function guideBrief(max) {
  const parts = [];
  for (const sec of ['avoid', 'rules', 'meals']) {
    const L = guideList(sec);
    if (!L.length) continue;
    const lbl = (GUIDE_SECTIONS.find(x => x.k === sec) || {}).label || sec;
    parts.push(lbl.toUpperCase() + ': ' + L.map(it => it.t + (it.d ? ' (' + it.d + ')' : '')).join('; '));
  }
  return parts.join(' || ').slice(0, max);
}
function anaContext(period, kind) {
  const p = prof(), tk = todayKey(), days = anaDays(period), L = [];
  const tca = hasCond('tca'); /* trastorno de la conducta alimentaria: sin calorías, nutrientes, peso ni pasos en el análisis */
  const age = ageOn(p.birth, tk), w = latestOn('weight', tk), h = latestOn('height', tk);
  L.push('Periodo: ' + (period === 'day' ? 'hoy, ' + fmtDay(tk) + ' (el día aún no termina)' : 'del ' + fmtShort(days[0]) + ' al ' + fmtShort(tk) + ' (' + days.length + ' días; hoy aún no termina)') + '.');
  L.push('Persona: ' + (age != null ? age + ' años' : 'edad sin dato') + ', ' + (p.sex === 'm' ? 'hombre' : p.sex === 'f' ? 'mujer' : 'sexo sin dato') + ', ' + (h ? fmtNum(h, 1) + ' cm' : 'estatura sin dato') + ', ' + (w ? fmtNum(w, 1) + ' kg' : 'peso sin dato') + '. Objetivo: ' + (goalLabel(p.goal) || 'sin definir') + '. Actividad: ' + ((labelsOf(ACTIVITY, [p.activity])[0] || 'sin dato').toLowerCase()) + '. Alimentación: ' + (labelsOf(DIETS, p.diet).join(', ').toLowerCase() || 'sin restricciones') + '. Condiciones: ' + (labelsOf(CONDITIONS, p.cond).join(', ').toLowerCase() || 'ninguna registrada') + '.');
  const s = S.settings, g = s.nutri || {};
  const gl = NUTRIENTS.filter(n => g[n.k] != null).map(n => n.label.toLowerCase() + ' ' + ({ meta: 'meta', max: 'máximo', min: 'mínimo' })[goalKind(n.k)] + ' ' + fmtNut(n.k, g[n.k]) + ' ' + n.unit);
  if (tca) L.push('Metas: agua ' + fmtInt(s.waterGoal) + ' ml; sueño ' + fmtNum(s.sleepGoal, 1) + ' h. (Tiene un trastorno de la conducta alimentaria: no hables de calorías, nutrientes, porciones, peso ni pasos.)');
  else L.push('Metas: ' + (gl.length ? gl.join('; ') : 'sin metas de nutrientes') + '; agua ' + fmtInt(s.waterGoal) + ' ml; sueño ' + fmtNum(s.sleepGoal, 1) + ' h' + (s.stepGoal ? '; pasos ' + fmtInt(s.stepGoal) : '') + '.');
  const meds = S.meds.filter(m => m.active).map(m => m.name).filter(Boolean);
  if (meds.length) L.push('Medicamentos activos: ' + meds.join(', ').slice(0, 300) + '.');
  const gb = guideBrief(kind === 'hab' ? 900 : 2200);
  if (gb) L.push('Indicaciones de sus médicos (mandan sobre cualquier recomendación general): ' + gb);
  const hl = habs();
  if (kind !== 'hab') {
    L.push('Registro día por día:');
    const foods = new Map();
    let fDays = 0, kSum = 0, outSum = 0, outN = 0, pSum = 0, wSum = 0, wN = 0, sSum = 0, sN = 0, stSum = 0, stN = 0, exMin = 0, exN = 0;
    const hit = { kcal: 0, p: 0, water: 0, sleep: 0, steps: 0 };
    for (const k of days) {
      const d = S.days[k];
      const label = '- ' + fmtDay(k) + ': ';
      if (!d) { L.push(label + 'sin registros'); continue; }
      const nu = dayNutri(d), en = energyFor(k, d), bits = [];
      if (nu.count && tca) {
        fDays++;
        const ms = []; for (const e of d.food) if (e.m && ms.indexOf(e.m) < 0) ms.push(e.m);
        bits.push('registró comidas (' + ms.join(', ') + ')');
        for (const e of d.food) { const key = String(e.name || '').slice(0, 50); const f = foods.get(key) || { n: 0, g: 0, kcal: 0 }; f.n++; foods.set(key, f); }
      } else if (nu.count) {
        fDays++; kSum += nu.kcal; pSum += nu.p;
        bits.push('comió ' + fmtInt(nu.kcal) + ' kcal (proteína ' + fmtNut('p', nu.p) + ' g, carbohidratos ' + fmtNut('c', nu.c) + ' g, grasas ' + fmtNut('f', nu.f) + ' g, saturadas ' + fmtNut('sf', nu.sf) + ' g, azúcar ' + fmtNut('s', nu.s) + ' g, fibra ' + fmtNut('fi', nu.fi) + ' g, sodio ' + fmtInt(nu.na) + ' mg)');
        for (const e of d.food) { const key = String(e.name || '').slice(0, 50); const f = foods.get(key) || { n: 0, g: 0, kcal: 0 }; f.n++; f.g += Number(e.g) || 0; f.kcal += Number(e.n && e.n.kcal) || 0; foods.set(key, f); }
        if (g.kcal) { const r = nu.kcal / g.kcal; if (goalKind('kcal') === 'max' ? r <= 1.02 : (r >= 0.9 && r <= 1.1)) hit.kcal++; }
        if (g.p) { if (goalKind('p') === 'max' ? nu.p <= g.p : nu.p >= g.p) hit.p++; }
      } else bits.push('sin comida registrada');
      if (en.total != null && !tca) { bits.push('gasto estimado ' + fmtInt(r10(en.total)) + ' kcal' + (nu.count ? ' (balance ' + (nu.kcal - en.total >= 0 ? '+' : '−') + fmtInt(Math.abs(r10(nu.kcal - en.total))) + ')' : '')); outSum += en.total; outN++; }
      const wa = sum(d.water); if (wa) { bits.push('agua ' + fmtInt(wa) + ' ml'); wSum += wa; wN++; if (wa >= (Number(s.waterGoal) || 2000)) hit.water++; }
      const sl = sleepHours(d.sleep); if (sl != null) { bits.push('sueño ' + fmtNum(sl, 1) + ' h'); sSum += sl; sN++; if (sl >= (Number(s.sleepGoal) || 8)) hit.sleep++; }
      if (d.steps && !tca) { bits.push('pasos ' + fmtInt(d.steps)); stSum += d.steps; stN++; if (s.stepGoal && d.steps >= s.stepGoal) hit.steps++; }
      const acts = Array.isArray(d.acts) ? d.acts : [];
      if (acts.length) {
        bits.push('ejercicio: ' + acts.map(a => String(a.name || '').slice(0, 40) + ' ' + a.min + ' min' + (a.k === 'gym' && a.ex && a.ex.length ? ' [' + a.ex.map(x => x.n + ' ' + setsText(x.sets)).join('; ').slice(0, 260) + ']' : '')).join(', '));
        exN++; exMin += acts.reduce((t, a) => t + (Number(a.min) || 0), 0);
      }
      const hs = habDayStats(k); if (hs.due) bits.push('hábitos ' + hs.done + '/' + hs.due);
      const ds = dosesFor(k); if (ds.length) bits.push('medicamentos ' + ds.filter(x => d.meds && d.meds[x.key] && d.meds[x.key].s === 'taken').length + '/' + ds.length);
      if (d.energy || d.mood) bits.push('energía ' + (d.energy || '–') + '/5, ánimo ' + (d.mood || '–') + '/5');
      L.push(label + bits.join(' · '));
    }
    if (fDays && !tca) L.push('Promedio en ' + plural(fDays, 'día', 'días') + ' con comida registrada: ' + fmtInt(kSum / fDays) + ' kcal y ' + fmtNut('p', pSum / fDays) + ' g de proteína.' + (outN ? ' Gasto promedio estimado: ' + fmtInt(r10(outSum / outN)) + ' kcal.' : ''));
    const hits = [];
    if (tca && fDays) hits.push('comidas registradas ' + fDays + ' de ' + days.length + ' días');
    if (g.kcal && fDays && !tca) hits.push('calorías en meta ' + hit.kcal + ' de ' + fDays + ' días');
    if (g.p && fDays && !tca) hits.push('proteína en meta ' + hit.p + ' de ' + fDays);
    if (wN) hits.push('agua en meta ' + hit.water + ' de ' + wN + ' (promedio ' + fmtInt(wSum / wN) + ' ml)');
    if (sN) hits.push('sueño en meta ' + hit.sleep + ' de ' + sN + ' noches (promedio ' + fmtNum(sSum / sN, 1) + ' h)');
    if (stN) hits.push('pasos ' + (s.stepGoal ? 'en meta ' + hit.steps + ' de ' + stN + ', ' : '') + 'promedio ' + fmtInt(stSum / stN));
    if (exN) hits.push('ejercicio ' + plural(exN, 'día', 'días') + ', ' + fmtInt(exMin) + ' min en total');
    if (hits.length) L.push('Cumplimiento: ' + hits.join('; ') + '.');
    const top = Array.from(foods.entries()).sort((a, b) => b[1].n - a[1].n).slice(0, 15);
    if (top.length) L.push('Alimentos más frecuentes: ' + top.map(([n, f]) => n + ' (' + f.n + (f.n === 1 ? ' vez' : ' veces') + (tca ? '' : ', ' + fmtInt(f.kcal) + ' kcal en total') + ')').join('; ') + '.');
    const ws = S.measures.filter(m => hasNum(m.weight)).sort(byDate);
    const inP = ws.filter(m => m.date >= days[0]);
    if (ws.length && !tca) L.push('Peso: ' + (inP.length > 1 ? fmtNum(inP[0].weight, 1) + ' kg (' + fmtShort(inP[0].date) + ') → ' + fmtNum(inP[inP.length - 1].weight, 1) + ' kg (' + fmtShort(inP[inP.length - 1].date) + ')' : 'último ' + fmtNum(ws[ws.length - 1].weight, 1) + ' kg (' + fmtShort(ws[ws.length - 1].date) + ')') + '.');
  }
  if (hl.length) {
    L.push('Hábitos:');
    for (const hb of hl) {
      let cnt;
      if (habFlex(hb)) {
        let done = 0; for (const k of days) if (habDone(hb, k)) done++;
        const cl = habClosed(hb, days[0], tk);
        cnt = habProgText(hb, tk) + '; hecho ' + plural(done, 'vez', 'veces') + ' en el periodo' + (cl.total ? '; ' + (hb.freq === 'weekly' ? 'semanas' : 'meses') + ' completas cumplidas ' + cl.met + ' de ' + cl.total : '');
      } else {
        let due = 0, done = 0;
        for (const k of days) if (habDueOn(hb, k)) { due++; if (habDone(hb, k)) done++; }
        cnt = 'cumplido ' + done + ' de ' + due + ' días que tocaban';
      }
      L.push('- ' + hb.label + ' (' + habFreqText(hb).toLowerCase() + '): ' + cnt + '; ' + (habStreakText(hb, habStreak(hb, tk)) || 'sin racha') + (habRate(hb, tk) != null ? '; cumplimiento reciente ' + habRate(hb, tk) + ' %' : '') + (hb.end ? '; termina el ' + fmtShort(hb.end) : ''));
    }
  } else L.push('Hábitos: no tiene hábitos registrados.');
  const doneR = S.reminders.filter(r => r.done && r.doneAt && keyOf(new Date(r.doneAt)) >= days[0]).length;
  const overR = S.reminders.filter(r => !r.done && r.due && r.due < tk).length;
  if (doneR || overR) L.push('Recordatorios: ' + doneR + ' completados en el periodo; ' + overR + ' vencidos sin hacer.');
  return L.join('\n').slice(0, 14000);
}
