'use strict';
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
