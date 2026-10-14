'use strict';
function socialCardHTML() {
  socialMaybeInit();
  const dis = S.social.busy ? ' disabled' : '';
  let inner;
  if (!S.social.has) {
    inner = '<p class="prose">Compite con tus amigos y en el mundo. Se comparte <b>solo</b> tu alias, nivel, racha y logros — nunca tu salud.</p>' +
      '<div class="field"><label class="lbl" for="soc-name">Tu alias</label><input type="text" id="soc-name" data-draft maxlength="20" autocomplete="off" placeholder="Ej: felipe_fit" value="' + esc(draft('soc-name', '')) + '"></div>' +
      '<label class="consent sm"><input type="checkbox" id="soc-public" checked><span>Aparecer también en el ranking global (puedes apagarlo luego).</span></label>' +
      (S.social.err ? '<p class="form-err">' + esc(S.social.err) + '</p>' : '') +
      '<button type="button" class="btn" id="soc-go" data-act="soc-setup"' + dis + '>' + (S.social.busy ? 'Activando…' : 'Activar ranking') + '</button>';
  } else {
    const p = S.social.profile;
    inner = '<div class="soc-me"><span class="soc-u">@' + esc(p.username) + '</span></div>' +
      '<div class="soc-code"><span class="soc-code-l">Tu código para que te agreguen</span><div class="soc-code-v"><code id="soc-mycode">' + esc(p.code || '······') + '</code><button type="button" class="btn sm quiet" data-act="soc-copy">Copiar</button></div></div>' +
      '<button type="button" class="switch' + (p.is_public !== false ? ' on' : '') + '" data-act="soc-public" aria-pressed="' + (p.is_public !== false) + '"><span class="sw"></span>' + (p.is_public !== false ? 'En el ranking global' : 'Solo con amigos') + '</button>' +
      '<div class="field soc-add"><label class="lbl" for="soc-code">Agregar amigo por código</label><div class="amt-row"><input type="text" id="soc-code" data-draft maxlength="6" autocomplete="off" placeholder="ABC123" value="' + esc(draft('soc-code', '')) + '"><button type="button" class="btn sm" data-act="soc-add"' + dis + '>Agregar</button></div></div>' +
      (S.social.err ? '<p class="form-err">' + esc(S.social.err) + '</p>' : '') +
      '<p class="hint">El ranking está en la pestaña Progreso. Se comparte solo tu alias, nivel, racha y logros.</p>';
  }
  return '<section class="card" id="card-social"><div class="card-h"><h2>Amigos y ranking</h2></div>' + inner + '</section>';
}

function v8Click(act, el, id) {
  switch (act) {
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
