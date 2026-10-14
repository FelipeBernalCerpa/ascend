'use strict';
function secUnlockGate(meta) {
  return new Promise(resolve => {
    const g = secGateEl(), box = $('#sec-gate-box');
    let mode = 'pass', fails = 0, newCode = '', pending = null, busy = false;
    const draw = err => {
      let h;
      if (mode === 'pass') {
        h = '<h2 class="auth-h">Tus datos están cifrados</h2><p class="prose">Escribe tu frase secreta para abrirlos en este dispositivo.</p>' +
          '<form id="sg-form" class="sec-form" novalidate><div class="field"><label class="lbl" for="sg-pass">Frase secreta</label><input type="password" id="sg-pass" autocomplete="current-password" maxlength="256"></div>' +
          '<label class="consent"><input type="checkbox" id="sg-rem" checked><span>Recordar en este dispositivo (no la pide otra vez hasta que cierres sesión)</span></label>' +
          '<p class="form-err" id="sg-err">' + esc(err || '') + '</p><button type="submit" class="btn" id="sg-go">Abrir mis datos</button></form>' +
          '<div class="row between"><button type="button" class="link" id="sg-rec">Olvidé mi frase</button><button type="button" class="link" id="sg-out">Cerrar sesión</button></div>';
      } else if (mode === 'rec') {
        h = '<h2 class="auth-h">Usar el código de recuperación</h2><p class="prose">Escribe el código que guardaste al activar el cifrado y crea una frase secreta nueva.</p>' +
          '<form id="sg-form" class="sec-form" novalidate><div class="field"><label class="lbl" for="sg-code">Código de recuperación</label><input type="text" id="sg-code" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="64"></div>' +
          '<div class="field"><label class="lbl" for="sg-n1">Frase secreta nueva (mínimo 10 caracteres)</label><input type="password" id="sg-n1" autocomplete="new-password" maxlength="256"></div>' +
          '<div class="field"><label class="lbl" for="sg-n2">Repite la frase nueva</label><input type="password" id="sg-n2" autocomplete="new-password" maxlength="256"></div>' +
          '<label class="consent"><input type="checkbox" id="sg-rem" checked><span>Recordar en este dispositivo</span></label>' +
          '<p class="form-err" id="sg-err">' + esc(err || '') + '</p><button type="submit" class="btn" id="sg-go">Recuperar mis datos</button></form>' +
          '<button type="button" class="link" id="sg-back">Volver</button>';
      } else {
        h = '<h2 class="auth-h">Tu código de recuperación nuevo</h2><p class="prose">El código anterior ya no sirve. Guarda este en un lugar seguro: es la única forma de abrir tus datos si olvidas tu frase.</p>' +
          secCodeBoxHTML(newCode, 'sg') +
          '<label class="consent"><input type="checkbox" id="sg-saved"><span>Ya guardé mi código nuevo</span></label>' +
          '<p class="form-err" id="sg-err">' + esc(err || '') + '</p><button type="button" class="btn" id="sg-done">Continuar</button>';
      }
      box.innerHTML = h;
      const f = $('#sg-pass') || $('#sg-code');
      if (f) { try { f.focus(); } catch (e) {} }
    };
    g.onsubmit = async e => {
      e.preventDefault();
      if (busy) return;
      const go = $('#sg-go');
      const remember = !!($('#sg-rem') && $('#sg-rem').checked);
      busy = true;
      if (go) { go.disabled = true; go.textContent = 'Abriendo…'; }
      try {
        if (mode === 'pass') {
          let raw;
          try { raw = await secRawFrom(meta, $('#sg-pass').value); }
          catch (err) {
            fails++;
            if (fails >= 5) await wait(Math.min(30000, 1000 * Math.pow(2, fails - 5)));
            busy = false; draw('Frase incorrecta. Revisa mayúsculas, tildes y espacios.'); return;
          }
          const key = await secImportKey(raw); raw.fill(0);
          SEC.vault.remembered = remember;
          if (remember) await secKeyPut(store.userId, key);
          resolve(key);
          return;
        }
        if (mode === 'rec') {
          const n1 = $('#sg-n1').value, n2 = $('#sg-n2').value;
          const pe = secPassErr(n1, S.userEmail, true);
          if (pe || n1 !== n2) { busy = false; draw(pe || 'Las dos frases no coinciden.'); return; }
          let raw;
          try { raw = await secRawFrom(meta, $('#sg-code').value, true); }
          catch (err) { fails++; if (fails >= 5) await wait(Math.min(30000, 1000 * Math.pow(2, fails - 5))); busy = false; draw('Ese código no es correcto.'); return; }
          newCode = secNewCode();
          const nm = await secRewrap(meta, raw, { pass: n1, code: newCode });
          await secPutRaw(SEC.VAULT, nm);
          meta = nm;
          pending = await secImportKey(raw); raw.fill(0);
          SEC.vault.remembered = remember;
          if (remember) await secKeyPut(store.userId, pending);
          mode = 'code'; busy = false; draw(); return;
        }
      } catch (err) {
        busy = false; draw('No se pudo completar. Revisa tu conexión e intenta de nuevo.');
      }
    };
    g.onclick = e => {
      const t = e.target.closest('button');
      if (!t || busy) return;
      if (t.id === 'sg-rec') { mode = 'rec'; draw(); }
      else if (t.id === 'sg-back') { mode = 'pass'; draw(); }
      else if (t.id === 'sg-out') { busy = true; secLogout(false); }
      else if (t.id === 'sg-copy') secCopy(newCode);
      else if (t.id === 'sg-dl') secDownload(newCode);
      else if (t.id === 'sg-done') { if (!$('#sg-saved').checked) { draw('Marca la casilla cuando hayas guardado el código.'); return; } resolve(pending); }
    };
    draw();
  });
}
async function secNeedsMfa() {
  try {
    if (!sb.auth.mfa) return false;
    const r = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    const d = r && r.data;
    return !!(d && d.nextLevel === 'aal2' && d.currentLevel !== 'aal2');
  } catch (e) { return false; }
}
function secMfaGate() {
  return new Promise(resolve => {
    const g = secGateEl(), box = $('#sec-gate-box');
    let busy = false;
    const draw = err => {
      box.innerHTML = '<h2 class="auth-h">Verificación en dos pasos</h2><p class="prose">Escribe el código de 6 dígitos que muestra tu app de autenticación.</p>' +
        '<form id="sg-form" class="sec-form" novalidate><div class="field"><label class="lbl" for="sg-otp">Código</label><input type="text" id="sg-otp" inputmode="numeric" autocomplete="one-time-code" maxlength="8" spellcheck="false"></div>' +
        '<p class="form-err" id="sg-err">' + esc(err || '') + '</p><button type="submit" class="btn" id="sg-go">Verificar</button></form>' +
        '<button type="button" class="link" id="sg-out">Cerrar sesión</button>';
      try { $('#sg-otp').focus(); } catch (e) {}
    };
    g.onsubmit = async e => {
      e.preventDefault();
      if (busy) return;
      const code = String($('#sg-otp').value || '').replace(/\D/g, '');
      if (code.length !== 6) { draw('El código tiene 6 dígitos.'); return; }
      busy = true;
      $('#sg-go').disabled = true;
      try {
        const l = await sb.auth.mfa.listFactors();
        const f = ((l && l.data && l.data.totp) || []).find(x => x.status === 'verified');
        if (!f) { resolve(true); return; }
        const r = await sb.auth.mfa.challengeAndVerify({ factorId: f.id, code });
        if (r && r.error) { busy = false; draw('Código incorrecto o vencido. Espera el siguiente e intenta de nuevo.'); return; }
        resolve(true);
      } catch (err) { busy = false; draw('No se pudo verificar. Revisa tu conexión.'); }
    };
    g.onclick = e => { const t = e.target.closest('button'); if (t && t.id === 'sg-out' && !busy) { busy = true; secLogout(false); } };
    draw();
  });
}
async function secFetchMeta() {
  const res = await sb.from('docs').select('path,data').eq('path', SEC.VAULT);
  if (res.error) throw normErr(res.error, res.status);
  const r = (res.data || []).find(x => x && x.path === SEC.VAULT);
  return r && r.data && r.data.v === 1 ? r.data : null;
}
async function secRemembered(meta) {
  const key = await secKeyGet(store.userId);
  if (key && await secCheck(key, meta)) { SEC.vault.remembered = true; return key; }
  if (key) await secKeyDel(store.userId);
  return null;
}

/* ---------- sesión: inactividad y salida ---------- */
function secIdleMin() { const n = parseInt(lsGet('ascend-idle') || '0', 10); return SEC_IDLE.some(o => o[0] === n) ? n : 0; }
function secTouch() {
  const now = Date.now();
  SEC.last = now;
  if (now - SEC.lastW > 15000) { SEC.lastW = now; lsSet('ascend-last', String(now)); }
}
function secIdleExpired() {
  const m = secIdleMin();
  if (!m) return false;
  const last = Math.max(SEC.last || 0, parseInt(lsGet('ascend-last') || '0', 10) || 0);
  return last > 0 && Date.now() - last > m * 60000;
}
function secIdleCheck() {
  if (!S.started || !S.dataReady) return;
  if (secIdleExpired()) { try { sessionStorage.setItem('ascend-out', 'idle'); } catch (e) {} secLogout(false); }
}
function secClearLocal() {
  for (const k of ['ascend-avisos', 'ascend-last']) { try { localStorage.removeItem(k); } catch (e) {} }
}
/* deja la pantalla en blanco mientras la página recarga: ningún dato queda a la vista */
function secHideAll() {
  for (const id of ['app', 'auth', 'splash']) { const el = $('#' + id); if (el) el.hidden = true; }
  secGateClose();
}
async function secLogout(global) {
  SEC.dead = true;
  saver.flushAll();
  for (let i = 0; i < 25 && (saver.pend.size || saver.busy.size); i++) await wait(150);
  await secKeyDel(store.userId);
  SEC.vault.key = null;
  secClearLocal();
  secHideAll();
  try { await sb.auth.signOut(global ? { scope: 'global' } : undefined); } catch (e) {}
  location.reload();
}

/* ---------- contraseñas ---------- */
function secPassErr(p, email, phrase) {
  p = String(p || '');
  const what = phrase ? 'la frase' : 'la contraseña';
  if (p.length < 10) return 'Usa al menos 10 caracteres. Una frase de varias palabras es fácil de recordar y difícil de adivinar.';
  if (p.length > 128 && !phrase) return 'Usa como máximo 128 caracteres.';
  const low = p.toLowerCase();
  const user = String(email || '').split('@')[0].toLowerCase();
  if (user.length >= 4 && low.indexOf(user) >= 0) return 'No uses tu correo dentro de ' + what + '.';
  if (new Set(p).size < 5) return 'Esa es muy repetitiva: mezcla más letras o palabras.';
  if (/^\d+$/.test(p)) return 'No uses solo números.';
  if (SEC_COMMON.some(c => low.indexOf(c) >= 0 && low.split(c).join('').replace(/[^a-záéíóúñü]/g, '').length < 4)) return 'Esa es muy común: elige otra.';
  return '';
}

/* ---------- permiso para la IA ---------- */
function secAiOK() { return !!(SEC.consent && SEC.consent.ai === true); }
function secAskAi(then) {
  SEC.pendingAi = then || null;
  openSheet({ kind: 'sec', step: 'aiconsent', err: '' });
}
function secSaveConsent(patch) {
  SEC.consent = Object.assign({}, SEC.consent, patch, { v: SEC.POLICY_V });
  saver.queue(SEC.CONSENT, clone(SEC.consent), 50);
}

/* ---------- verificación en dos pasos (ajustes) ---------- */
async function secMfaRefresh() {
  try {
    if (!sb.auth.mfa) { SEC.mfa.on = false; return; }
    const l = await sb.auth.mfa.listFactors();
    SEC.mfa.on = !!((l && l.data && l.data.totp) || []).some(f => f.status === 'verified');
  } catch (e) { SEC.mfa.on = false; }
  if (S.tab === 'ajustes') renderAjustes();
}
function secQrSrc(qr) {
  const s = String(qr || '');
  const m = /^data:image\/svg\+xml;utf-8,(.*)$/s.exec(s);
  if (m) return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(m[1]);
  return /^data:image\//.test(s) ? s : '';
}
async function secMfaStart(st) {
  st.busy = 'Preparando…'; st.err = ''; renderSheet();
  try {
    const l = await sb.auth.mfa.listFactors();
    for (const f of ((l && l.data && l.data.all) || [])) if (f.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: f.id });
    const r = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Ascend ' + new Date().toISOString().slice(0, 16) });
    if (r.error) throw r.error;
    st.fid = r.data.id; st.qr = secQrSrc(r.data.totp && r.data.totp.qr_code); st.secret = (r.data.totp && r.data.totp.secret) || '';
  } catch (e) { st.err = 'No se pudo iniciar: ' + String((e && e.message) || e); }
  st.busy = '';
  if (S.sheet === st) renderSheet();
}
async function secMfaVerify(st) {
  const code = String(($('#smf-code') || {}).value || '').replace(/\D/g, '');
  if (code.length !== 6) { sheetErr(st, 'El código tiene 6 dígitos.'); return; }
  st.busy = 'Verificando…'; renderSheet();
  try {
    const r = await sb.auth.mfa.challengeAndVerify({ factorId: st.fid, code });
    if (r.error) throw r.error;
    SEC.mfa.on = true;
    closeSheet();
    toast('Verificación en dos pasos activada.');
    renderAjustes();
  } catch (e) { st.busy = ''; st.err = 'Código incorrecto o vencido. Escribe el que se ve ahora en tu app.'; if (S.sheet === st) renderSheet(); }
}
async function secMfaOff() {
  try {
    const l = await sb.auth.mfa.listFactors();
    for (const f of ((l && l.data && l.data.all) || [])) {
      const r = await sb.auth.mfa.unenroll({ factorId: f.id });
      if (r && r.error) throw r.error;
    }
    SEC.mfa.on = false;
    try { await sb.auth.refreshSession(); } catch (e) {}
    toast('Verificación en dos pasos desactivada.');
  } catch (e) {
    toast(/aal2|AAL2|assurance/i.test(String((e && e.message) || e)) ? 'Para desactivarla, cierra sesión y entra con tu código.' : 'No se pudo desactivar. Intenta de nuevo.');
  }
  renderAjustes();
}

/* ---------- Ajustes: tarjeta de seguridad ---------- */
function secRow(id, title, status, btns) {
  return '<div class="sec-row" id="' + id + '"><div class="sec-info"><span class="sec-t">' + title + '</span><span class="sec-s">' + status + '</span></div><div class="sec-b">' + btns + '</div></div>';
}
function secCardHTML() {
  const v = SEC.vault, ro = S.readonly ? ' disabled' : '';
  const vOn = !!v.key;
  const mfaArmed = S.confirmDel === 'sec-mfaoff', gArmed = S.confirmDel === 'sec-global';
  const ai = secAiOK() ? 'Permitido' + (SEC.consent.aiAt ? ' desde el ' + fmtDate(keyOf(new Date(SEC.consent.aiAt))) : '') + '. Solo se envía lo necesario cuando la usas.' : 'Sin permiso: te lo pedimos antes de usarla.';
  const idle = secIdleMin();
  return '<section class="card" id="card-sec"><div class="card-h"><h2>Seguridad y privacidad</h2></div><div class="sec-rows">' +
    secRow('sec-r-vault', 'Cifrado de extremo a extremo',
      vOn ? 'Activado. Solo tú, con tu frase secreta, puedes leer tus registros.' + (v.remembered ? ' Recordado en este dispositivo.' : '') : secCryptoOK() ? 'Desactivado. Tus datos se cifran en tránsito y en el servidor.' : 'Este navegador no permite cifrar en el dispositivo.',
      '<button type="button" class="btn sm' + (vOn ? ' quiet' : '') + '" id="sec-vault" data-act="sec-vault"' + (secCryptoOK() ? ro : ' disabled') + '>' + (vOn ? 'Administrar' : 'Activar') + '</button>') +
    (v.bad && v.bad.length ? '<p class="banner">' + plural(v.bad.length, 'registro cifrado no se pudo', 'registros cifrados no se pudieron') + ' abrir con tu llave y no se muestran.</p>' : '') +
    secRow('sec-r-mfa', 'Verificación en dos pasos',
      SEC.mfa.on == null ? 'Revisando…' : SEC.mfa.on ? 'Activada. Al entrar te pedimos el código de tu app de autenticación.' : 'Desactivada. Actívala para que tu contraseña sola no baste para entrar.',
      SEC.mfa.on == null ? '' : '<button type="button" class="btn sm' + (SEC.mfa.on ? ' ' + (mfaArmed ? 'danger' : 'quiet') : '') + '" id="sec-mfa" data-act="' + (SEC.mfa.on ? 'sec-mfaoff' : 'sec-mfa') + '"' + ro + '>' + (SEC.mfa.on ? (mfaArmed ? '¿Desactivar?' : 'Desactivar') : 'Activar') + '</button>') +
    secRow('sec-r-idle', 'Cerrar sesión por inactividad', 'En este dispositivo, si no usas Ascend durante:',
      '<label class="lbl sr" for="sec-idle">Cerrar sesión tras</label><select id="sec-idle" class="sec-sel">' + SEC_IDLE.map(o => '<option value="' + o[0] + '"' + (o[0] === idle ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>') +
    secRow('sec-r-ai', 'Asistente con IA', ai,
      '<button type="button" class="btn sm quiet" id="sec-ai" data-act="sec-ai"' + (S.loaded.consent ? ro : ' disabled') + '>' + (secAiOK() ? 'Retirar permiso' : 'Permitir') + '</button>') +
    secRow('sec-r-pass', 'Contraseña', 'Mínimo 10 caracteres. Mejor una frase de varias palabras.',
      '<button type="button" class="btn sm quiet" id="sec-pass" data-act="sec-pass">Cambiar</button>') +
    secRow('sec-r-sess', 'Sesiones abiertas', 'Cierra la sesión en todos tus dispositivos (por ejemplo, si perdiste uno).',
      '<button type="button" class="btn sm ' + (gArmed ? 'danger' : 'quiet') + '" id="sec-global" data-act="sec-global">' + (gArmed ? '¿Cerrar todas?' : 'Cerrar todas') + '</button>') +
    '</div>' +
    '<p class="hint">Siempre activo: conexión cifrada (HTTPS), datos cifrados en el servidor (AES-256), reglas para que cada cuenta solo vea lo suyo y bloqueo de páginas que intenten suplantar o incrustar Ascend. El archivo de «Descargar mis datos» no va cifrado: guárdalo en un lugar privado.</p>' +
    '<div class="row acct-end"><a class="link" href="/privacidad" target="_blank" rel="noopener" id="sec-policy">Política de privacidad</a>' +
    '<button type="button" class="btn sm quiet" id="sec-del" data-act="sec-del"' + ro + '>Eliminar mi cuenta</button></div></section>';
}

/* ---------- hojas de seguridad ---------- */
function secBusyHTML(st) { return st.busy ? '<p class="hint sec-busy" role="status">' + esc(st.busy) + '</p>' : ''; }
function secPassField(id, label, ac) { return '<div class="field"><label class="lbl" for="' + id + '">' + label + '</label><input type="password" id="' + id + '" autocomplete="' + (ac || 'new-password') + '" maxlength="256"></div>'; }
function secSheetHTML(st) {
  const err = '<p class="form-err" id="sh-err">' + esc(st.err || '') + '</p>';
  const dis = st.busy ? ' disabled' : '';
  switch (st.step) {
    case 'aiconsent':
      return sheetTop('Antes de usar la IA') +
        '<p class="prose">Para responderte, Ascend envía tu mensaje y un resumen de tus registros (metas, comidas, actividad, sueño, hábitos y condiciones de salud que anotaste) a <b>Anthropic</b>, la empresa que hace Claude, en <b>Estados Unidos</b>.</p>' +
        '<ul class="sec-list"><li>Se usa solo para responderte. Anthropic no usa estos datos para entrenar sus modelos y los guarda por un tiempo limitado.</li><li>No se envía tu correo ni tu nombre.</li><li>Si tienes el cifrado de extremo a extremo activado, la IA solo recibe lo que se envía al usarla.</li><li>Puedes retirar este permiso cuando quieras en Ajustes → Seguridad y privacidad.</li></ul>' +
        err + '<div class="row"><button type="button" class="btn" id="sec-aiyes" data-act="sec-aiyes">Acepto</button><button type="button" class="btn quiet" id="sec-aino" data-act="sheet-close">Ahora no</button></div>';
    case 'von':
      return sheetTop('Cifrado de extremo a extremo') +
        '<p class="prose">Tus registros se cifran en este dispositivo antes de guardarse, con una llave que se abre con tu frase secreta. Ni Ascend ni los servidores pueden leerlos.</p>' +
        '<ul class="sec-list"><li><b>Si olvidas la frase y pierdes el código de recuperación, nadie puede recuperar tus datos</b>, ni siquiera Ascend.</li><li>En cada dispositivo nuevo te pediremos la frase.</li><li>El servidor sigue viendo las fechas de tus registros (no su contenido) para poder ordenarlos.</li></ul>' +
        '<form class="sh-form" data-form="sec-von" novalidate>' + secPassField('sv-p1', 'Frase secreta (mínimo 10 caracteres)') + secPassField('sv-p2', 'Repite la frase') +
        '<label class="consent"><input type="checkbox" id="sv-rem" checked><span>Recordar en este dispositivo</span></label>' + err +
        '<button type="submit" class="btn" id="sv-next"' + dis + '>Continuar</button></form>' +
        '<p class="hint">Consejo: usa una frase de 4 o más palabras que no aparezca en internet, distinta de tu contraseña.</p>';
    case 'vcode':
      return sheetTop(st.purpose === 'newrec' ? 'Código de recuperación nuevo' : 'Tu código de recuperación') +
        '<p class="prose">' + (st.purpose === 'newrec' ? 'Cuando confirmes, el código anterior deja de servir.' : 'Si olvidas tu frase secreta, este código es la única forma de abrir tus datos.') + ' Guárdalo fuera de Ascend: en papel o en un gestor de contraseñas.</p>' +
        secCodeBoxHTML(st.code, 'sv') +
        '<label class="consent"><input type="checkbox" id="sv-saved"><span>Ya guardé mi código en un lugar seguro</span></label>' + err + secBusyHTML(st) +
        '<button type="button" class="btn" id="sv-go" data-act="sec-vgo"' + dis + '>' + (st.purpose === 'newrec' ? 'Usar este código' : 'Activar cifrado') + '</button>';
    case 'vman': {
      const v = SEC.vault;
      return sheetTop('Cifrado de extremo a extremo') +
        '<p class="prose">Activado' + (v.meta && v.meta.at ? ' · última configuración: ' + fmtDate(keyOf(new Date(v.meta.at))) : '') + '. Tus registros se guardan cifrados con AES-256-GCM.</p>' +
        '<div class="sec-rows">' +
        secRow('sv-r-rem', 'Recordar en este dispositivo', v.remembered ? 'Sí: no pide la frase hasta que cierres sesión.' : 'No: pide la frase cada vez que abres Ascend.', '<button type="button" class="btn sm quiet" id="sv-rem-t" data-act="sec-vrem">' + (v.remembered ? 'Olvidar' : 'Recordar') + '</button>') +
        secRow('sv-r-pass', 'Frase secreta', 'Cámbiala si crees que alguien la conoce.', '<button type="button" class="btn sm quiet" id="sv-pass" data-act="sec-vstep" data-step="vpass">Cambiar</button>') +
        secRow('sv-r-rec', 'Código de recuperación', 'Genera uno nuevo si perdiste el anterior.', '<button type="button" class="btn sm quiet" id="sv-rec" data-act="sec-vstep" data-step="vrec">Nuevo código</button>') +
        secRow('sv-r-off', 'Desactivar cifrado', 'Tus registros vuelven a guardarse solo con el cifrado del servidor.', '<button type="button" class="btn sm quiet" id="sv-off" data-act="sec-vstep" data-step="voff">Desactivar</button>') +
        '</div>';
    }
    case 'vpass':
      return sheetTop('Cambiar frase secreta', true) +
        '<form class="sh-form" data-form="sec-vpass" novalidate>' + secPassField('sv-cur', 'Frase actual', 'current-password') + secPassField('sv-p1', 'Frase nueva (mínimo 10 caracteres)') + secPassField('sv-p2', 'Repite la frase nueva') +
        err + secBusyHTML(st) + '<button type="submit" class="btn" id="sv-save"' + dis + '>Cambiar frase</button></form>';
    case 'vrec':
      return sheetTop('Nuevo código de recuperación', true) +
        '<form class="sh-form" data-form="sec-vrec" novalidate>' + secPassField('sv-cur', 'Frase secreta actual', 'current-password') +
        err + secBusyHTML(st) + '<button type="submit" class="btn" id="sv-save"' + dis + '>Generar código</button></form>';
    case 'voff':
      return sheetTop('Desactivar cifrado', true) +
        '<p class="prose">Tus registros se descifran en este dispositivo y se guardan otra vez solo con el cifrado del servidor.</p>' +
        '<form class="sh-form" data-form="sec-voff" novalidate>' + secPassField('sv-cur', 'Frase secreta', 'current-password') +
        err + secBusyHTML(st) + '<button type="submit" class="btn danger" id="sv-save"' + dis + '>Desactivar cifrado</button></form>';
    case 'mfa':
      return sheetTop('Verificación en dos pasos') +
        '<ol class="sec-list"><li>Instala una app de autenticación (Google Authenticator, Microsoft Authenticator, Authy, 1Password…).</li><li>Escanea este código QR con la app, o escribe la clave a mano.</li><li>Escribe el código de 6 dígitos que aparece.</li></ol>' +
        (st.qr ? '<img class="sec-qr" id="smf-qr" src="' + esc(st.qr) + '" alt="Código QR para tu app de autenticación" width="180" height="180">' : '') +
        (st.secret ? '<p class="hint">Clave para escribir a mano: <code class="sec-secret" id="smf-secret">' + esc(st.secret) + '</code></p>' : '') +
        '<form class="sh-form" data-form="sec-mfa" novalidate><div class="field"><label class="lbl" for="smf-code">Código de 6 dígitos</label><input type="text" id="smf-code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" spellcheck="false"></div>' +
        err + secBusyHTML(st) + '<button type="submit" class="btn" id="smf-go"' + (st.fid && !st.busy ? '' : ' disabled') + '>Activar</button></form>' +
        '<p class="hint">Guarda bien tu app de autenticación: si la pierdes, necesitarás ayuda para volver a entrar.</p>';
    case 'pass':
      return sheetTop('Cambiar contraseña') +
        '<form class="sh-form" data-form="sec-pass" novalidate>' + secPassField('sp-p1', 'Contraseña nueva (mínimo 10 caracteres)') + secPassField('sp-p2', 'Repite la contraseña nueva') +
        err + secBusyHTML(st) + '<button type="submit" class="btn" id="sp-save"' + dis + '>Cambiar contraseña</button></form>';
    case 'del':
      return sheetTop('Eliminar mi cuenta') +
        '<p class="prose">Se borran para siempre tu cuenta y todos tus registros: comidas, medicamentos, medidas, exámenes, hábitos, recordatorios y conversaciones con la IA. No se puede deshacer.</p>' +
        '<p class="hint">Si quieres conservar una copia, primero usa «Descargar mis datos».</p>' +
        '<form class="sh-form" data-form="sec-del" novalidate><div class="field"><label class="lbl" for="sd-confirm">Escribe ELIMINAR para confirmar</label><input type="text" id="sd-confirm" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="20"></div>' +
        err + secBusyHTML(st) + '<button type="submit" class="btn danger" id="sd-go"' + dis + '>Eliminar mi cuenta para siempre</button></form>';
    default:
      return sheetTop('Seguridad');
  }
}
const secVal = id => { const el = document.getElementById(id); return el ? el.value : ''; };
