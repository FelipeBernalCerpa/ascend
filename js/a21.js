'use strict';
/* ---------- utilidades de cifrado (WebCrypto) ---------- */
const secTE = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null, secTD = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;
function secB64e(buf) {
  const a = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
  return btoa(s);
}
function secB64d(s) { const b = atob(String(s || '')); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
const secRnd = n => crypto.getRandomValues(new Uint8Array(n));
function secCryptoOK() { try { return !!(secTE && secTD && window.crypto && crypto.subtle && crypto.getRandomValues); } catch (e) { return false; } }
const secAad = s => secTE.encode('ascend:' + store.userId + ':' + s);
const secNormPass = p => String(p || '').normalize('NFKC');
const secNormCode = c => String(c || '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[^0-9A-Z]/g, '');
async function secKek(secret, salt, it) {
  const base = await crypto.subtle.importKey('raw', secTE.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: it, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function secSeal(key, bytes, aad) {
  const iv = secRnd(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, bytes);
  return { iv: secB64e(iv), ct: secB64e(ct) };
}
async function secOpen(key, box, aad) {
  if (!box || typeof box.iv !== 'string' || typeof box.ct !== 'string') throw new Error('caja inválida');
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: secB64d(box.iv), additionalData: aad }, key, secB64d(box.ct)));
}
const secImportKey = raw => crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
const secIt = (v, fb) => Math.min(5000000, Math.max(100000, Number(v) || fb));
function secNewCode() { const r = secRnd(32); let s = ''; for (let i = 0; i < 32; i++) s += SEC_B32[r[i] & 31]; return s.match(/.{4}/g).join('-'); }
/* cambia la frase y/o el código de recuperación que envuelven la llave de datos */
async function secRewrap(meta, raw, o) {
  const m = Object.assign({}, meta);
  if (o.pass != null) { const s = secRnd(16); m.s = secB64e(s); m.it = SEC_PBKDF_IT; m.w = await secSeal(await secKek(secNormPass(o.pass), s, SEC_PBKDF_IT), raw, secAad('vault-pass')); }
  if (o.code != null) { const rs = secRnd(16); m.rs = secB64e(rs); m.rit = SEC_REC_IT; m.rw = await secSeal(await secKek(secNormCode(o.code), rs, SEC_REC_IT), raw, secAad('vault-rec')); }
  m.at = Date.now();
  return m;
}
async function secMakeMeta(raw, key, pass, code) {
  const base = { v: 1, alg: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', chk: await secSeal(key, secTE.encode('ascend-ok'), secAad('vault-check')) };
  return secRewrap(base, raw, { pass, code });
}
/* abre la llave de datos con la frase (o con el código de recuperación); falla si no es correcta */
async function secRawFrom(meta, secret, rec) {
  const k = await secKek(rec ? secNormCode(secret) : secNormPass(secret), secB64d(rec ? meta.rs : meta.s), secIt(rec ? meta.rit : meta.it, rec ? SEC_REC_IT : SEC_PBKDF_IT));
  return secOpen(k, rec ? meta.rw : meta.w, secAad(rec ? 'vault-rec' : 'vault-pass'));
}
async function secCheck(key, meta) {
  try { return secTD.decode(await secOpen(key, meta.chk, secAad('vault-check'))) === 'ascend-ok'; } catch (e) { return false; }
}
const secIsEnc = d => !!(d && typeof d === 'object' && d.__e === 1 && typeof d.iv === 'string' && typeof d.ct === 'string');
async function secEncDoc(path, data, key) {
  const box = await secSeal(key, secTE.encode(JSON.stringify(data)), secAad('doc:' + path));
  return { __e: 1, iv: box.iv, ct: box.ct };
}
async function secDecDoc(path, d, key) { return JSON.parse(secTD.decode(await secOpen(key, d, secAad('doc:' + path)))); }

/* llave recordada en este dispositivo: IndexedDB guarda la CryptoKey sin poder exportarla */
function secIdb() {
  return new Promise((res, rej) => {
    try {
      const r = indexedDB.open('ascend-sec', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('keys');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
}
async function secIdbOp(mode, fn) {
  const db = await secIdb();
  return new Promise((res, rej) => {
    const tx = db.transaction('keys', mode);
    const req = fn(tx.objectStore('keys'));
    tx.oncomplete = () => { db.close(); res(req ? req.result : undefined); };
    tx.onerror = tx.onabort = () => { db.close(); rej(tx.error); };
  });
}
const secKeyGet = uid => (uid ? secIdbOp('readonly', s => s.get(uid)).catch(() => null) : Promise.resolve(null));
const secKeyPut = (uid, key) => (uid ? secIdbOp('readwrite', s => s.put(key, uid)).catch(() => {}) : Promise.resolve());
const secKeyDel = uid => secIdbOp('readwrite', s => (uid ? s.delete(uid) : s.clear())).catch(() => {});

/* ---------- almacenamiento: descifra al leer, cifra al guardar ---------- */
async function secFetchRows() {
  const rows = [];
  for (let from = 0; from < 100000; from += 1000) {
    const res = await sb.from('docs').select('path,data').order('path', { ascending: true }).range(from, from + 999);
    if (res.error) throw normErr(res.error, res.status);
    const batch = res.data || [];
    for (const r of batch) rows.push(r);
    if (batch.length < 1000) break;
  }
  return rows;
}
async function secLoad(accept) {
  const rows = await secFetchRows();
  let meta = null;
  const next = {}, enc = [], plain = [];
  for (const r of rows) {
    if (!r || !r.path) continue;
    if (r.path === SEC.VAULT) { meta = r.data && r.data.v === 1 ? r.data : null; continue; }
    if (r.path.indexOf('sec/') === 0) continue;
    if (secIsEnc(r.data)) enc.push(r); else { next[r.path] = r.data; plain.push(r.path); }
  }
  const v = SEC.vault, bad = [];
  if (!meta) {
    if (v.key) { v.key = null; v.meta = null; secKeyDel(store.userId); } /* se desactivó en otro dispositivo */
    for (const r of enc) bad.push(r.path); /* cifrados sin bóveda: no se pueden abrir, se ignoran */
  } else {
    if (!v.key || !(await secCheck(v.key, meta))) {
      v.key = null;
      if (S.dataReady) { secKeyDel(store.userId); setTimeout(() => location.reload(), 300); }
      throw { code: 'locked', message: 'Tus datos están cifrados con otra llave.' };
    }
    v.meta = meta;
    const key = v.key;
    await Promise.all(enc.map(async r => { try { next[r.path] = await secDecDoc(r.path, r.data, key); } catch (e) { bad.push(r.path); } }));
  }
  if (accept && !accept()) return false;
  v.bad = bad;
  if (bad.length) console.warn('Ascend: registros cifrados que no se pudieron abrir', bad.length);
  this.docs = next;
  this.lastLoad = Date.now();
  if (v.key && plain.length) setTimeout(() => secHeal(plain), 60);
  return true;
}
async function secSet(path, data) {
  this.wv++;
  while (secGateP) await secGateP;
  SEC.inflight++;
  try {
    const key = SEC.vault.key;
    return await this.retry(async () => {
      const put = key && path.indexOf('sec/') !== 0 ? await secEncDoc(path, data, key) : data;
      const res = await sb.from('docs').upsert({ user_id: this.userId, path, data: put, updated_at: new Date().toISOString() }, { onConflict: 'user_id,path' });
      if (res.error) throw normErr(res.error, res.status);
      this.docs[path] = clone(data);
      this.wv++;
    });
  } finally { SEC.inflight--; }
}
async function secUpsertRows(rows) {
  for (let i = 0; i < rows.length; i += 100) {
    const res = await store.retry(async () => {
      const r = await sb.from('docs').upsert(rows.slice(i, i + 100), { onConflict: 'user_id,path' });
      if (r.error) throw normErr(r.error, r.status);
      return r;
    });
    void res;
  }
}
async function secPutRaw(path, data) { await secUpsertRows([{ user_id: store.userId, path, data, updated_at: new Date().toISOString() }]); }
/* espera a que no haya nada guardándose y bloquea guardados nuevos mientras corre fn */
async function secQuiet() {
  saver.flushAll();
  for (let i = 0; i < 200; i++) {
    if (!saver.pend.size && !saver.busy.size && !deleting.size && !SEC.inflight) return;
    await wait(100);
  }
  throw new Error('Todavía se están guardando cambios. Espera unos segundos e intenta de nuevo.');
}
async function secWithGate(fn) {
  while (secGateP) await secGateP;
  let done;
  secGateP = new Promise(r => { done = r; });
  try {
    for (let i = 0; i < 150 && SEC.inflight > 0; i++) await wait(100);
    return await fn();
  } finally { secGateP = null; done(); }
}
async function secEncryptPaths(paths, key) {
  const now = new Date().toISOString(), rows = [];
  for (const p of paths) {
    if (p.indexOf('sec/') === 0 || !Object.prototype.hasOwnProperty.call(store.docs, p)) continue;
    rows.push({ user_id: store.userId, path: p, data: await secEncDoc(p, store.docs[p], key), updated_at: now });
  }
  await secUpsertRows(rows);
  return rows.length;
}
/* registros que quedaron sin cifrar (por ejemplo, guardados desde otro dispositivo sin la bóveda abierta) */
async function secHeal(paths) {
  const key = SEC.vault.key;
  if (!key || S.readonly) return;
  try { await secWithGate(() => secEncryptPaths(paths.filter(p => !dirty.has(p)), key)); } catch (e) { /* se reintenta en la próxima carga */ }
}

/* ---------- bóveda: activar, cambiar, desactivar ---------- */
async function secVaultEnable(pass, code, remember) {
  await secQuiet();
  await secWithGate(async () => {
    const raw = secRnd(32);
    const key = await secImportKey(raw);
    const meta = await secMakeMeta(raw, key, pass, code);
    raw.fill(0);
    await secPutRaw(SEC.VAULT, meta); /* primero la llave envuelta: así nunca hay datos cifrados sin forma de abrirlos */
    SEC.vault.meta = meta;
    SEC.vault.key = key;
    await secEncryptPaths(Object.keys(store.docs), key);
    SEC.vault.remembered = !!remember;
    if (remember) await secKeyPut(store.userId, key); else await secKeyDel(store.userId);
  });
}
async function secVaultDisable(pass) {
  const raw = await secRawFrom(SEC.vault.meta, pass);
  raw.fill(0);
  await secQuiet();
  await secWithGate(async () => {
    const now = new Date().toISOString();
    const rows = Object.keys(store.docs).filter(p => p.indexOf('sec/') !== 0).map(p => ({ user_id: store.userId, path: p, data: store.docs[p], updated_at: now }));
    await secUpsertRows(rows);
    const left = (await secFetchRows()).filter(r => r.path !== SEC.VAULT && secIsEnc(r.data) && !Object.prototype.hasOwnProperty.call(store.docs, r.path));
    for (const r of left) { const res = await sb.from('docs').delete().eq('user_id', store.userId).eq('path', r.path); if (res.error) throw normErr(res.error, res.status); }
    const res = await sb.from('docs').delete().eq('user_id', store.userId).eq('path', SEC.VAULT);
    if (res.error) throw normErr(res.error, res.status);
    SEC.vault.key = null; SEC.vault.meta = null; SEC.vault.bad = [];
  });
  await secKeyDel(store.userId);
  SEC.vault.remembered = false;
}
async function secVaultRewrap(pass, o) {
  const raw = await secRawFrom(SEC.vault.meta, pass);
  const meta = await secRewrap(SEC.vault.meta, raw, o);
  raw.fill(0);
  await secPutRaw(SEC.VAULT, meta);
  SEC.vault.meta = meta;
}

/* ---------- pantallas de bloqueo (antes de abrir la app) ---------- */
function secGateEl() {
  let g = $('#sec-gate');
  if (!g) {
    g = document.createElement('div');
    g.id = 'sec-gate';
    g.className = 'auth';
    const b = $('#splash .auth-brand');
    g.innerHTML = '<div class="auth-card">' + (b ? b.outerHTML : '') + '<div class="auth-box" id="sec-gate-box"></div></div>';
    document.body.appendChild(g);
  }
  for (const s of ['#splash', '#auth', '#app']) { const n = $(s); if (n) n.hidden = true; }
  g.hidden = false;
  return g;
}
function secGateClose() { const g = $('#sec-gate'); if (g) { g.hidden = true; g.onsubmit = null; g.onclick = null; const b = $('#sec-gate-box'); if (b) b.innerHTML = ''; } }
function secCodeBoxHTML(code, pre) {
  return '<div class="sec-code" id="' + pre + '-code" aria-label="Código de recuperación">' + esc(code) + '</div>' +
    '<div class="row"><button type="button" class="btn sm quiet" id="' + pre + '-copy" data-act="sec-copy">Copiar</button><button type="button" class="btn sm quiet" id="' + pre + '-dl" data-act="sec-dl">Descargar como archivo</button></div>';
}
function secCopy(code) {
  try { navigator.clipboard.writeText(code).then(() => toast('Código copiado.'), () => toast('No se pudo copiar: escríbelo a mano.')); } catch (e) { toast('No se pudo copiar: escríbelo a mano.'); }
}
function secDownload(code) {
  const txt = 'Ascend · código de recuperación del cifrado\n\n' + code + '\n\nGuárdalo en un lugar seguro y privado. Con este código puedes abrir tus datos si olvidas tu frase secreta.\nCreado: ' + new Date().toLocaleString('es-CO') + '\n';
  const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'ascend-codigo-de-recuperacion.txt';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
}
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
