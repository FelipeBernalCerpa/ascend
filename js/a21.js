'use strict';
function v4Change(t) { return !!(t.dataset && (t.dataset.rf || t.dataset.hf) && v4Input(t)); }
HOY.rems = remsTodayHTML;
HOY.aiday = aiDayHTML;
HOY_ORDER.splice(HOY_ORDER.indexOf('meds') + 1, 0, 'rems');
HOY_ORDER.push('aiday');

/* ---------- arranque ---------- */
async function refreshData() {
  if (!store.userId || S.refreshing || !S.dataReady) return;
  if (saver.pend.size || saver.busy.size || S.inflight > 0 || deleting.size) return;
  S.refreshing = true;
  const wv = store.wv;
  /* si algo se guardó o se borró mientras leía, esa lectura ya es vieja: se descarta */
  const quiet = () => store.wv === wv && !saver.pend.size && !saver.busy.size && S.inflight <= 0 && !deleting.size;
  try { if (await store.load(quiet)) store.emit(); S.offline = false; }
  catch (e) { if (e && e.code === 'unavailable') S.offline = true; }
  S.refreshing = false;
  refreshStatus();
}
function showLoadError(msg) {
  S.offline = true;
  refreshStatus();
  const v = $('#view-hoy');
  for (const x of $$('.view')) x.hidden = x !== v;
  v.innerHTML = '<section class="card"><div class="card-h"><h2>Sin datos por ahora</h2></div><p class="prose">' + esc(msg) + '</p>' +
    '<button type="button" class="btn" data-act="reload">Intentar de nuevo</button></section>';
}
let appBound = false;
function bindApp() {
  if (appBound) return;
  appBound = true;
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('keydown', onKey);
  document.addEventListener('toggle', e => {
    const d = e.target;
    if (d && d.dataset && d.dataset.hist) {
      if (d.open) S.openHist = d.dataset.hist;
      else if (S.openHist === d.dataset.hist) S.openHist = null;
    }
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { saver.flushAll(); if (S.sheet && S.sheet.step === 'scan') { stopScan(); setScanMsg('La cámara se pausó. Toca volver y abre el escáner otra vez, o escribe el código.'); } return; }
    if (S.tab === 'hoy') renderHoy(['meds', 'meters']);
    if (Date.now() - store.lastLoad > 60000) refreshData();
  });
  window.addEventListener('pagehide', () => saver.flushAll());
  window.addEventListener('online', () => { S.offline = false; refreshStatus(); refreshData(); });
  setInterval(() => {
    const tk = todayKey();
    if (S.lastToday !== tk) {
      const wasToday = S.viewKey === S.lastToday;
      S.lastToday = tk;
      if (wasToday) S.viewKey = tk;
      renderActive();
      return;
    }
    if (S.tab === 'hoy' && S.viewKey === tk && S.dataReady) renderHoy(['meds']);
  }, 30000);
  try {
    let lastW = 0, rt = 0;
    const obs = new ResizeObserver(entries => {
      const w = Math.round(entries[0].contentRect.width);
      if (w === lastW) return;
      lastW = w;
      clearTimeout(rt);
      rt = setTimeout(() => drawCharts($('#view-' + S.tab)), 120);
    });
    obs.observe($('#main'));
  } catch (e) {}
}
async function startApp(user) {
  if (S.started || !user || S.recovering) return;
  S.started = true;
  store.kind = 'cloud';
  store.userId = user.id;
  S.userEmail = user.email || '';
  S.canWrite = true;
  $('#splash').hidden = true;
  $('#auth').hidden = true;
  $('#app').hidden = false;
  bindApp();
  setTab(lsGet(LS_TAB) || 'hoy');
  setStatus('loading');
  try {
    await store.load();
  } catch (e) {
    const raw = (e && e.raw) || {};
    const missing = /PGRST205|42P01|does not exist|Could not find the table/i.test(String(raw.code || '') + ' ' + String(raw.message || e.message || ''));
    showLoadError(missing
      ? 'La base de datos de Ascend todavía no está lista: falta crear la tabla de registros.'
      : 'No se pudieron cargar tus datos. Revisa tu conexión e intenta de nuevo.');
    return;
  }
  S.dataReady = true;
  storeReadyResolve();
  subscribeAll();
  v4Subscribe();
  refreshStatus();
  renderActive();
  if (!Object.keys(store.docs).length && !S.readonly) { setTab('guia'); openPlan(); }
}
async function boot() {
  bindAuth();
  if (!sb) {
    showAuth(CONFIGURED
      ? 'No se pudo cargar la conexión. Revisa tu internet y recarga la página.'
      : 'Esta copia de Ascend todavía no está conectada a su base de datos: falta poner la URL y la clave de Supabase en index.html.');
    return;
  }
  if (/type=recovery/.test(location.hash)) S.recovering = true;
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') { S.recovering = true; setTimeout(() => showAuth('', 'recovery'), 0); return; }
    if (event === 'SIGNED_OUT') { if (S.started) setTimeout(() => location.reload(), 0); return; }
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && session.user && !S.recovering) {
      const u = session.user;
      setTimeout(() => startApp(u), 0);
    }
  });
  try {
    const res = await sb.auth.getSession();
    const session = res && res.data ? res.data.session : null;
    if (S.recovering) { showAuth('', 'recovery'); return; }
    if (session && session.user) startApp(session.user);
    else if (!S.started) showAuth();
  } catch (e) {
    showAuth('No se pudo conectar. Revisa tu internet y recarga la página.');
  }
}
/* =====================================================================
   Ascend v5: seguridad y privacidad
   - cifrado de extremo a extremo opcional (bóveda con frase secreta y código de recuperación)
   - verificación en dos pasos (TOTP) opcional
   - cierre de sesión por inactividad, cerrar sesión en todos los dispositivos
   - permiso explícito antes de enviar datos a la IA
   - eliminar la cuenta, contraseñas más fuertes
   ===================================================================== */
const SEC = {
  VAULT: 'sec/vault', CONSENT: 'config/consent', POLICY_V: '2026-10-05',
  vault: { meta: null, key: null, remembered: false, bad: [] },
  mfa: { on: null },
  consent: null,
  inflight: 0, last: 0, lastW: 0, pendingAi: null, started: null,
  /* la sesión de esta carga quedó cerrada: nada puede volver a abrir la app hasta que la página recargue */
  dead: false
};
let secGateP = null;
const SEC_PBKDF_IT = 600000, SEC_REC_IT = 100000;
const SEC_B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SEC_IDLE = [[0, 'Nunca'], [15, '15 minutos'], [60, '1 hora'], [480, '8 horas']];
const SEC_COMMON = ['password', 'contrasena', 'contraseña', '123456', '12345678', '123456789', '1234567890', 'qwerty', 'qwertyuiop', 'asdfgh', 'zxcvbn', 'abc123', '111111', 'iloveyou', 'teamo', 'admin', 'ascend', 'colombia', 'futbol', 'football', 'millonarios', 'nacional', 'america', 'welcome', 'bienvenido'];

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
