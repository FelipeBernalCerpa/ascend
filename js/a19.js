'use strict';
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
