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

secInstall();
boot();
