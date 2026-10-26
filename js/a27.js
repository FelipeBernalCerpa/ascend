'use strict';
/* ---------- v12: avisos de medicamentos en el celular ----------
   Los medicamentos ahora avisan a su hora igual que los hábitos (misma función v4Notify). */
function medNotifHTML() {
  try { if (typeof Notification === 'undefined' || Notification.permission !== 'default') return ''; } catch (e) { return ''; }
  return '<div class="med-notif"><button type="button" class="btn sm quiet" data-act="med-notif">Activar avisos en este dispositivo</button>' +
    '<span class="hint">Te recordamos cada toma a su hora, igual que los hábitos.</span></div>';
}
function v12Click(act, el, id) {
  if (act === 'med-notif') { try { Notification.requestPermission().then(() => renderAjustes()); } catch (e) {} return true; }
  return false;
}

secInstall();
boot();
