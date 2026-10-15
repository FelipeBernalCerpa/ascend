'use strict';
function v8Click(act, el, id) {
  switch (act) {
    case 'soc-retry': S.social.ready = true; S.social.loadedMe = false; S.social._lastTry = 0; socialInit(); return true;
    case 'soc-setup': socialSetup(); return true;
    case 'soc-add': socialAddFriend(); return true;
    case 'soc-public': socialSetPublic(!(S.social.profile && S.social.profile.is_public !== false)); return true;
    case 'soc-view': S.social.view = el.dataset.v === 'global' ? 'global' : 'friends'; renderProgreso(); return true;
    case 'soc-copy': {
      const c = S.social.profile && S.social.profile.code;
      if (c && navigator.clipboard) navigator.clipboard.writeText(c).then(() => toast('Código copiado.'), () => {});
      else toast('Tu código es ' + (c || ''));
      return true;
    }
  }
  return false;
}

/* ---------- v10: salud opcional (exámenes y preguntas al doctor), apagada por defecto ----------
   Si ya tienes exámenes o preguntas guardados, sigue visible hasta que la apagues. */
function healthOn() {
  const s = S.settings || {};
  if (s.healthOn === true) return true;
  if (s.healthOn === false) return false;
  return !!((S.labs && S.labs.length) || (S.questions && S.questions.length));
}
function healthRowHTML() {
  const on = healthOn(), dis = S.readonly || !S.loaded.settings ? ' disabled' : '';
  return '<div class="setrow"><div class="setrow-i"><b>Salud y exámenes</b><span>Muestra la pestaña Salud: exámenes médicos y preguntas al doctor.</span></div>' +
    '<button type="button" class="switch' + (on ? ' on' : '') + '" id="set-health" data-act="health-toggle" aria-pressed="' + on + '"' + dis + '><span class="sw"></span>' + (on ? 'Activado' : 'Desactivado') + '</button></div>';
}
function applyAppVis() {
  const t = document.getElementById('tab-salud');
  if (t) t.hidden = !healthOn();
}
function v10Click(act, el, id) {
  if (act === 'health-toggle') {
    if (S.readonly || !S.loaded.settings) return true;
    S.settings.healthOn = !healthOn();
    saveSettings();
    applyAppVis();
    if (!healthOn() && S.tab === 'salud') setTab('hoy'); else renderAjustes();
    toast(S.settings.healthOn ? 'Salud activada.' : 'Salud oculta. Puedes volver a activarla en Ajustes.');
    return true;
  }
  return false;
}

secInstall();
boot();
