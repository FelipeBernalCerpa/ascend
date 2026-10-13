'use strict';
function secClick(act, el) {
  const st = S.sheet;
  switch (act) {
    case 'sec-vault': if (!S.readonly && secCryptoOK()) openSheet({ kind: 'sec', step: SEC.vault.key ? 'vman' : 'von', err: '' }); return true;
    case 'sec-vstep': if (st && st.kind === 'sec') goStep(el.dataset.step); return true;
    case 'sec-vrem': {
      const v = SEC.vault;
      if (!v.key) return true;
      v.remembered = !v.remembered;
      (v.remembered ? secKeyPut(store.userId, v.key) : secKeyDel(store.userId)).then(() => { if (S.sheet && S.sheet.kind === 'sec') renderSheet(); });
      renderSheet();
      return true;
    }
    case 'sec-copy': if (st && st.code) secCopy(st.code); return true;
    case 'sec-dl': if (st && st.code) secDownload(st.code); return true;
    case 'sec-vgo': {
      if (!st || st.kind !== 'sec' || st.busy) return true;
      if (!$('#sv-saved') || !$('#sv-saved').checked) { sheetErr(st, 'Marca la casilla cuando hayas guardado el código.'); return true; }
      if (st.purpose === 'newrec') {
        secRun(st, 'Guardando…', async () => { await secVaultRewrap(st.pass, { code: st.code }); st.pass = ''; goStep('vman'); toast('Código de recuperación nuevo listo.'); });
      } else {
        secRun(st, 'Cifrando tus registros… no cierres Ascend.', async () => {
          await secVaultEnable(st.pass, st.code, st.remember);
          st.pass = '';
          closeSheet(); toast('Cifrado de extremo a extremo activado.'); renderAjustes();
        });
      }
      return true;
    }
    case 'sec-mfa': {
      if (S.readonly) return true;
      const ns = { kind: 'sec', step: 'mfa', err: '', busy: '' };
      openSheet(ns);
      secMfaStart(ns);
      return true;
    }
    case 'sec-mfaoff': confirmOrDo('sec-mfaoff', () => { secMfaOff(); }, renderAjustes); return true;
    case 'sec-ai':
      if (!S.loaded.consent) return true;
      if (secAiOK()) { secSaveConsent({ ai: false, aiOffAt: Date.now() }); toast('Permiso retirado: la IA no recibirá tus datos.'); renderAjustes(); }
      else secAskAi(null);
      return true;
    case 'sec-aiyes': {
      if (!S.loaded.consent || S.readonly) return true;
      secSaveConsent({ ai: true, aiAt: Date.now() });
      const then = SEC.pendingAi;
      SEC.pendingAi = null;
      closeSheet();
      if (S.tab === 'ajustes') renderAjustes();
      if (then) then(); else toast('Listo: ya puedes usar la IA.');
      return true;
    }
    case 'sec-pass': openSheet({ kind: 'sec', step: 'pass', err: '' }); return true;
    case 'sec-global': confirmOrDo('sec-global', () => { secLogout(true); }, renderAjustes); return true;
    case 'sec-del': if (!S.readonly) openSheet({ kind: 'sec', step: 'del', err: '' }); return true;
    default: return false;
  }
}

/* ---------- arranque: instala todo antes de boot() ---------- */
function secPrivacyHTML() {
  return '<p>Tus registros (comida, medicamentos, medidas, exámenes, hábitos y notas) se guardan en tu cuenta en servidores de Supabase. Viajan cifrados (HTTPS) y se guardan cifrados en el servidor (AES-256). Las reglas de la base de datos hacen que solo tu cuenta pueda leerlos o cambiarlos.</p>' +
    '<p>Puedes activar el cifrado de extremo a extremo: tus registros se cifran en tu dispositivo con una frase que solo tú conoces, y ni Ascend ni los servidores pueden leerlos.</p>' +
    '<p>Puedes descargar, corregir o borrar tus datos y eliminar tu cuenta en Ajustes cuando quieras.</p>' +
    '<p>La IA es opcional: solo si das permiso, tu mensaje y un resumen de tus registros se envían a Anthropic (Claude), en Estados Unidos, únicamente para responderte.</p>' +
    '<p>Ascend no vende tus datos, no muestra publicidad y no usa cookies de seguimiento.</p>' +
    '<p>Ascend es una herramienta de registro y educación: no reemplaza a tu médico, a tu nutricionista ni ningún tratamiento.</p>' +
    '<p>Ascend ajusta tus metas y sus recomendaciones según tu edad y tu sexo.</p>' +
    '<p><a href="/privacidad" target="_blank" rel="noopener">Lee la política de privacidad completa</a>.</p>';
}
function secInstall() {
  store.load = secLoad;
  store.set = secSet;
  privacyInner = secPrivacyHTML;

  const _startApp = startApp;
  startApp = function (user) {
    if (S.started || !user || S.recovering) return;
    /* recargar no es instantáneo: sin esto, una llamada ya encolada abriría la app con los datos a la vista */
    if (SEC.dead) return;
    if (SEC.started) return SEC.started;
    SEC.started = (async () => {
      try {
        if (secIdleExpired()) {
          SEC.dead = true;
          try { sessionStorage.setItem('ascend-out', 'idle'); } catch (e) {}
          secHideAll();
          await secKeyDel(user.id); secClearLocal();
          try { await sb.auth.signOut(); } catch (e) {}
          location.reload();
          return;
        }
        store.userId = user.id;
        S.userEmail = user.email || '';
        if (await secNeedsMfa()) { if (!(await secMfaGate())) return; }
        let meta = null;
        try { meta = await secFetchMeta(); } catch (e) { meta = null; }
        if (meta && secCryptoOK()) {
          const key = (await secRemembered(meta)) || (await secUnlockGate(meta));
          if (!key) return;
          SEC.vault.key = key;
          SEC.vault.meta = meta;
        }
        secGateClose();
        secTouch();
        await _startApp(user);
        if (S.dataReady) secAfterStart();
      } finally { SEC.started = null; }
    })();
    return SEC.started;
  };

  const _refresh = refreshData;
  refreshData = async function () { if (secGateP || SEC.inflight) return; return _refresh(); };
  logout = function () { return secLogout(false); };
  const _wipe = wipeData;
  wipeData = async function () { await secKeyDel(store.userId); SEC.vault.key = null; SEC.vault.meta = null; return _wipe(); };

  importData = async function (input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file || S.readonly) return;
    let parsed = null;
    try { parsed = JSON.parse(await file.text()); } catch (e) { parsed = null; }
    const docs = parsed && parsed.docs && typeof parsed.docs === 'object' ? parsed.docs : null;
    if (!docs) { S.dataMsg = 'Ese archivo no es un respaldo de Ascend.'; renderAjustes(); return; }
    const rows = [];
    const now = new Date().toISOString();
    for (const path of Object.keys(docs)) {
      const seg = path.split('/');
      const data = docs[path];
      if (seg.length !== 2 || IMPORT_COLS.indexOf(seg[0]) < 0 || !/^[A-Za-z0-9_\-.~:@+]{1,200}$/.test(seg[1])) continue;
      if (!data || typeof data !== 'object' || Array.isArray(data) || secIsEnc(data)) continue;
      rows.push({ user_id: store.userId, path, data, updated_at: now });
    }
    if (!rows.length) { S.dataMsg = 'El archivo no trae registros para importar.'; renderAjustes(); return; }
    S.dataMsg = 'Importando ' + rows.length + ' registros…';
    renderAjustes();
    try {
      await secWithGate(async () => {
        const key = SEC.vault.key;
        const out = key ? await Promise.all(rows.map(async r => Object.assign({}, r, { data: await secEncDoc(r.path, r.data, key) }))) : rows;
        await secUpsertRows(out);
      });
      await store.load();
      store.emit();
      S.dataMsg = 'Listo: se importaron ' + rows.length + ' registros' + (SEC.vault.key ? ' y quedaron cifrados.' : '.');
    } catch (e) {
      S.dataMsg = 'No se pudo importar. Revisa tu conexión e intenta de nuevo.';
    }
    renderAjustes();
  };

  const _onAuthSubmit = onAuthSubmit;
  onAuthSubmit = function (e) {
    if ((authMode === 'up' || authMode === 'recovery') && sb) {
      const pe = secPassErr($('#auth-pass').value, $('#auth-email').value);
      if (pe) { e.preventDefault(); authMsg(pe); return; }
    }
    return _onAuthSubmit(e);
  };
  const _setAuthMode = setAuthMode;
  setAuthMode = function (m) {
    _setAuthMode(m);
    if (m === 'up' || m === 'recovery') $('#auth-pass-lbl').textContent = m === 'up' ? 'Contraseña (mínimo 10 caracteres)' : 'Contraseña nueva (mínimo 10 caracteres)';
    const pass = $('#auth-pass');
    if (pass) { pass.setAttribute('maxlength', '128'); if (m === 'up' || m === 'recovery') pass.setAttribute('minlength', '10'); else pass.removeAttribute('minlength'); }
  };
  const _showAuth = showAuth;
  showAuth = function (msg, mode) {
    secGateClose();
    _showAuth(msg, mode);
    let why = null;
    try { why = sessionStorage.getItem('ascend-out'); sessionStorage.removeItem('ascend-out'); } catch (e) {}
    if (why === 'idle' && !msg) authMsg('', 'Cerramos tu sesión por inactividad para proteger tus datos.');
    if (why === 'deleted' && !msg) authMsg('', 'Tu cuenta y tus datos se eliminaron.');
  };

  const _renderAjustes = renderAjustes;
  renderAjustes = function () {
    const a = document.activeElement, fid = a && a.id && a.closest && a.closest('#card-sec') ? a.id : null;
    _renderAjustes();
    const acct = $('#card-account');
    if (acct && !$('#card-sec')) acct.insertAdjacentHTML('beforebegin', secCardHTML());
    if (fid) { const f = document.getElementById(fid); if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} } }
  };
  const _renderSheet = renderSheet;
  renderSheet = function () {
    const st = S.sheet, card = $('#sheet-card');
    if (st && st.kind === 'sec' && card) { swap(card, secSheetHTML(st)); return; }
    _renderSheet();
  };
  const _extClick = extClick;
  extClick = function (act, el, id) {
    if (act && act.indexOf('sec-') === 0 && secClick(act, el)) return;
    if (act === 'sh-back' && S.sheet && S.sheet.kind === 'sec') { goStep('vman'); return; }
    return _extClick(act, el, id);
  };
  const _extSubmit = extSubmit;
  extSubmit = function (kind) { if (kind && kind.indexOf('sec-') === 0) return secSubmit(kind); return _extSubmit(kind); };
  const _extChange = extChange;
  extChange = function (t) {
    if (t && t.id === 'sec-idle') {
      const n = parseInt(t.value, 10);
      lsSet('ascend-idle', String(SEC_IDLE.some(o => o[0] === n) ? n : 0));
      secTouch();
      toast(n ? 'Se cerrará la sesión tras ' + SEC_IDLE.find(o => o[0] === n)[1] + ' sin uso.' : 'La sesión no se cerrará por inactividad.');
      return true;
    }
    return _extChange(t);
  };

  const _chatSend = chatSend;
  chatSend = async function (text) {
    if (!secAiOK()) { if (String(text || '').trim()) S.drafts['chat-in'] = String(text); secAskAi(() => _chatSend(text)); return; }
    return _chatSend(text);
  };
  const _anaRun = anaRun;
  anaRun = async function (kind, msg) {
    if (!secAiOK()) { secAskAi(() => _anaRun(kind, msg)); return; }
    return _anaRun(kind, msg);
  };

  for (const ev of ['pointerdown', 'keydown', 'touchstart', 'wheel']) document.addEventListener(ev, secTouch, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') secIdleCheck(); });
  setInterval(secIdleCheck, 30000);
}
function secAfterStart() {
  store.watchDoc(SEC.CONSENT, data => {
    S.loaded.consent = true;
    if (dirty.has(SEC.CONSENT)) return;
    SEC.consent = data && typeof data === 'object' ? data : {};
    if (S.tab === 'ajustes') renderAjustes();
  });
  secMfaRefresh();
}

/* ---------- v5b: frase del día (éxito, disciplina, mentalidad) ----------
   Citas reales y conocidas, traducidas al español. Una distinta cada día, en rotación.
   No se inventan citas ni se atribuyen frases falsas a personas reales. */
const QUOTES = [
  { t: 'No te detengas cuando estés cansado. Detente cuando hayas terminado.', a: 'David Goggins' },
  { t: 'Sé incomún entre los incomunes.', a: 'David Goggins' },
  { t: 'Las conversaciones más importantes que tendrás en la vida son las que tienes contigo mismo.', a: 'David Goggins' },
  { t: 'La única forma de ganar temple mental es haciendo cosas que no te gusta hacer.', a: 'David Goggins' },
  { t: 'Cuando algo es suficientemente importante, lo haces aunque las probabilidades no estén a tu favor.', a: 'Elon Musk' },
  { t: 'El fracaso es una opción. Si las cosas no fallan, no estás innovando lo suficiente.', a: 'Elon Musk' },
  { t: 'La persistencia es muy importante. No deberías rendirte a menos que te veas obligado a hacerlo.', a: 'Elon Musk' },
  { t: 'El talento sin trabajo duro no es nada.', a: 'Cristiano Ronaldo' },
  { t: 'Tu dedicación de hoy es tu ventaja de mañana.', a: 'Cristiano Ronaldo' },
  { t: 'No hay talento aquí, esto es trabajo duro. Esto es una obsesión.', a: 'Conor McGregor' },
  { t: 'No estamos aquí para participar, estamos aquí para apoderarnos de todo.', a: 'Conor McGregor' },
  { t: 'La duda solo se elimina con la acción. Si no estás trabajando, ahí es donde entra la duda.', a: 'Conor McGregor' },
  { t: 'La precisión vence a la potencia, y el tiempo vence a la velocidad.', a: 'Conor McGregor' },
  { t: 'Lo único que se interpone entre tú y tu meta es la historia que te sigues contando sobre por qué no puedes lograrlo.', a: 'Jordan Belfort' },
  { t: 'Las personas exitosas están 100% convencidas de que son dueñas de su propio destino.', a: 'Jordan Belfort' },
  { t: 'He fallado una y otra vez en mi vida, y por eso tengo éxito.', a: 'Michael Jordan' },
  { t: 'Puedo aceptar el fracaso, todos fallan en algo. Pero no puedo aceptar no intentarlo.', a: 'Michael Jordan' },
  { t: 'Algunos quieren que pase, otros desean que pase, y otros hacen que pase.', a: 'Michael Jordan' },
  { t: 'Los límites, como los miedos, muchas veces son solo una ilusión.', a: 'Michael Jordan' },
  { t: 'El trabajo duro supera al talento cuando el talento no trabaja duro.', a: 'Kobe Bryant' },
  { t: 'La mentalidad Mamba es una búsqueda constante por ser la mejor versión de ti mismo.', a: 'Kobe Bryant' },
  { t: 'No cuentes los días, haz que los días cuenten.', a: 'Muhammad Ali' },
  { t: 'Imposible es solo una palabra grande que usan los hombres débiles.', a: 'Muhammad Ali' },
  { t: 'La fuerza no viene de ganar. Tus luchas desarrollan tus fortalezas.', a: 'Arnold Schwarzenegger' },
  { t: 'Tanto si crees que puedes como si crees que no puedes, tienes razón.', a: 'Henry Ford' },
  { t: 'Lo que la mente puede concebir y creer, lo puede lograr.', a: 'Napoleon Hill' },
  { t: 'Tu tiempo es limitado, no lo malgastes viviendo la vida de otra persona.', a: 'Steve Jobs' },
  { t: 'La única forma de hacer un gran trabajo es amar lo que haces.', a: 'Steve Jobs' },
  { t: 'Ser realista es el camino más transitado hacia la mediocridad.', a: 'Will Smith' },
  { t: 'El talento lo tienes de forma natural; la habilidad se desarrolla con horas y horas de trabajo.', a: 'Will Smith' },
  { t: 'Cuando quieras tener éxito tanto como quieres respirar, entonces lo tendrás.', a: 'Eric Thomas' },
  { t: 'Apunta a la luna. Si fallas, puedes dar en una estrella.', a: 'Les Brown' },
  { t: 'Siempre parece imposible hasta que se hace.', a: 'Nelson Mandela' },
  { t: 'Nunca pierdo. O gano o aprendo.', a: 'Nelson Mandela' },
  { t: 'No importa lo fuerte que pegues, sino lo fuerte que puedan golpearte y sigas avanzando.', a: 'Rocky Balboa' },
  { t: 'La disciplina es el puente entre las metas y los logros.', a: 'Jim Rohn' },
  { t: 'No desees que fuera más fácil, desea ser mejor.', a: 'Jim Rohn' },
  { t: 'El éxito no es definitivo, el fracaso no es fatal: lo que cuenta es el valor para continuar.', a: 'Winston Churchill' },
  { t: 'La felicidad de tu vida depende de la calidad de tus pensamientos.', a: 'Marco Aurelio' },
  { t: 'El hombre que mueve una montaña empieza cargando pequeñas piedras.', a: 'Confucio' },
  { t: 'No importa lo despacio que vayas mientras no te detengas.', a: 'Confucio' },
  { t: 'Primero te ignoran, luego se ríen de ti, luego te atacan y entonces ganas.', a: 'Mahatma Gandhi' },
  { t: 'La mejor manera de predecir el futuro es crearlo.', a: 'Peter Drucker' },
  { t: 'Un objetivo sin un plan es solo un deseo.', a: 'Antoine de Saint-Exupéry' },
  { t: 'El único lugar donde el éxito viene antes que el trabajo es en el diccionario.', a: 'Vince Lombardi' },
  { t: 'No se trata de ser el mejor. Se trata de ser mejor de lo que fuiste ayer.', a: 'Anónimo' },
  { t: 'Cae siete veces, levántate ocho.', a: 'Proverbio japonés' },
  { t: 'La suerte es lo que pasa cuando la preparación se encuentra con la oportunidad.', a: 'Séneca' },
  { t: 'No es que tengamos poco tiempo, sino que perdemos mucho.', a: 'Séneca' },
  { t: 'Quien tiene un porqué para vivir puede soportar casi cualquier cómo.', a: 'Friedrich Nietzsche' },
  { t: 'El que tiene un porqué lo suficientemente fuerte puede soportar casi cualquier cómo.', a: 'Viktor Frankl' },
  { t: 'Nuestra mayor gloria no está en no caer nunca, sino en levantarnos cada vez que caemos.', a: 'Ralph Waldo Emerson' },
  { t: 'El que quiere hacer algo encuentra un medio; el que no, encuentra una excusa.', a: 'Proverbio árabe' },
  { t: 'La motivación te pone en marcha, el hábito te mantiene en movimiento.', a: 'Jim Ryun' },
  { t: 'Hazlo con miedo, pero hazlo.', a: 'Anónimo' },
  { t: 'Si quieres resultados distintos, no hagas siempre lo mismo.', a: 'Albert Einstein' },
  { t: 'Nadie que haya dado lo mejor de sí mismo lo ha lamentado.', a: 'George Halas' },
  { t: 'La única persona a la que debes superar es a la que fuiste ayer.', a: 'Anónimo' }
];
function quoteOfDay() {
  if (!QUOTES.length) return null;
  const k = (typeof todayKey === 'function') ? todayKey() : new Date().toISOString().slice(0, 10);
  const d = (typeof parseKey === 'function') ? parseKey(k) : new Date(k);
  const n = Math.floor(d.getTime() / 86400000);
  return QUOTES[((n % QUOTES.length) + QUOTES.length) % QUOTES.length];
}
function quoteHTML() {
  const q = quoteOfDay();
  if (!q) return '';
  return '<div class="quote-hoy" role="note"><p class="q-t">' + esc(q.t) + '</p><p class="q-a">' + esc(q.a) + '</p></div>';
}

secInstall();
boot();
