'use strict';
function v11Click(act, el, id) {
  switch (act) {
    case 'club-create': clubCreate(); return true;
    case 'club-join': clubJoin(); return true;
    case 'club-open': S.club.open = S.club.open === el.dataset.id ? null : el.dataset.id; S.club.editing = null; if (S.club.open) clubLoadBoard(S.club.open); renderClub(); return true;
    case 'club-leave': confirmOrDo('club:' + el.dataset.id, () => clubLeave(el.dataset.id), renderClub); return true;
    case 'club-edit': S.club.editing = el.dataset.id; renderClub(); return true;
    case 'club-editx': S.club.editing = null; renderClub(); return true;
    case 'club-save': clubSaveEdit(el.dataset.id); return true;
    case 'club-admin': clubSetAdmin(el.dataset.id, el.dataset.u, el.dataset.on === '1'); return true;
    case 'club-kick': confirmOrDo('kick:' + el.dataset.u, () => clubRemove(el.dataset.id, el.dataset.u), renderClub); return true;
    case 'club-copy': {
      const c = el.dataset.code || '';
      if (c && navigator.clipboard) navigator.clipboard.writeText(c).then(() => toast('Código copiado.'), () => {});
      else toast('El código es ' + c);
      return true;
    }
  }
  return false;
}

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
