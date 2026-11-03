'use strict';
(function () {
  var R = window.__REC || { uid: '', items: [] };
  var elS = document.getElementById('estado');
  var elD = document.getElementById('detalle');
  var elB = document.getElementById('acciones');
  function set(html, cls) { elS.className = 'box ' + (cls || ''); elS.innerHTML = html; }
  function b64d(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function idbGet(uid) {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('ascend-sec', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('keys'); };
      r.onsuccess = function () {
        try {
          var tx = r.result.transaction('keys', 'readonly');
          var rq = tx.objectStore('keys').get(uid);
          rq.onsuccess = function () { res(rq.result); };
          rq.onerror = function () { rej(rq.error); };
        } catch (e) { rej(e); }
      };
      r.onerror = function () { rej(r.error); };
    });
  }
  function dec(key, p, iv, ct) {
    var aad = new TextEncoder().encode('ascend:' + R.uid + ':doc:' + p);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(iv), additionalData: aad }, key, b64d(ct));
  }
  async function run() {
    if (!R.uid || !R.items.length) { set('No hay datos para recuperar en esta página.', 'err'); return; }
    set('Buscando la llave guardada en este navegador…');
    var key;
    try { key = await idbGet(R.uid); } catch (e) { set('No se pudo leer el almacenamiento: ' + e.message, 'err'); return; }
    if (!key) {
      set('❌ <b>No hay ninguna llave en este navegador.</b>', 'err');
      elD.textContent = 'Esta es la cuenta/navegador equivocado para recuperar. Prueba abriendo este mismo enlace en el navegador donde usabas Ascend con tus datos visibles (por ejemplo Safari del iPhone, si alguna vez entraste por ahí).';
      return;
    }
    // Probar con un registro
    set('Llave encontrada. Probando si es la correcta…');
    var ok = 0, fail = 0, out = [];
    for (var i = 0; i < R.items.length; i++) {
      var it = R.items[i];
      try {
        var pt = await dec(key, it.p, it.iv, it.ct);
        out.push({ path: it.p, data: JSON.parse(new TextDecoder().decode(pt)) });
        ok++;
      } catch (e) { fail++; }
    }
    if (ok === 0) {
      set('⚠️ <b>Hay una llave, pero no es la que cifró tus datos.</b>', 'err');
      elD.textContent = 'Este navegador tiene una llave distinta (de la reactivación nueva). Prueba abrir este enlace en otro navegador donde tus datos sí se vieran — la esperanza es Safari del iPhone.';
      return;
    }
    set('✅ <b>¡LLAVE CORRECTA! Se recuperaron ' + ok + ' de ' + R.items.length + ' registros.</b>', 'ok');
    var cats = {};
    out.forEach(function (r) { var k = r.path.split('/')[0]; cats[k] = (cats[k] || 0) + 1; });
    var resumen = Object.keys(cats).map(function (k) { return cats[k] + ' ' + k; }).join(' · ');
    elD.textContent = resumen + (fail ? ' · (' + fail + ' no se pudieron abrir)' : '');
    var blob = new Blob([JSON.stringify({ uid: R.uid, recoveredAt: new Date().toISOString(), docs: out }, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'ascend-datos-recuperados.json';
    a.className = 'btn'; a.textContent = 'Descargar mis datos recuperados';
    elB.appendChild(a);
    var note = document.createElement('p');
    note.className = 'hint';
    note.textContent = 'Descarga este archivo y guárdalo YA en un lugar seguro (es tu respaldo sin cifrar). Con él, Felipe (tu asistente) vuelve a meter todo a tu cuenta.';
    elB.appendChild(note);
  }
  run();
})();
