// Endpoint propio para que Jordan (el orquestador de Felipe) lea y escriba
// datos de Ascend sin tener nunca la service-role key de Supabase.
//
// Autenticación: cabecera x-jordan-key, comparada en tiempo constante contra
// el secreto ASCEND_JORDAN_KEY guardado en Vercel. Mismo patrón que ya se
// usa para Midas y Synaris — Jordan nunca recibe una llave maestra de base
// de datos, solo una clave compartida hecha para esta sola cosa.
//
// Ascend guarda todo en una sola tabla genérica `docs` (user_id, path, data
// jsonb) — por eso este endpoint es genérico: listar paths disponibles y
// leer uno por su path. No escribe nada todavía (de momento Jordan solo
// necesita leer para poder darte resúmenes y contexto).
'use strict';

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jsncipfjrsuvvrctugax.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JORDAN_KEY = process.env.ASCEND_JORDAN_KEY;
const USER_ID = process.env.ASCEND_USER_ID;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.end(JSON.stringify(body));
}

function timingSafeEqual(a, b) {
  const ah = crypto.createHash('sha256').update(String(a || '')).digest();
  const bh = crypto.createHash('sha256').update(String(b || '')).digest();
  return crypto.timingSafeEqual(ah, bh);
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  return null;
}

async function db(path, init) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: 'Bearer ' + SERVICE_KEY,
      'Content-Type': 'application/json',
      ...(init && init.headers),
    },
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error('supabase ' + r.status + ' ' + text.slice(0, 200));
  }
  return r.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'method' }); }
  if (!SERVICE_KEY || !JORDAN_KEY || !USER_ID) return send(res, 503, { error: 'not_configured' });

  const got = String(req.headers['x-jordan-key'] || '');
  if (!got || !timingSafeEqual(got, JORDAN_KEY)) return send(res, 401, { error: 'Unauthorized' });

  const body = readBody(req) || {};
  const action = body.action;

  try {
    if (action === 'listar_documentos') {
      const data = await db(
        `docs?select=path,updated_at&user_id=eq.${encodeURIComponent(USER_ID)}&order=path`
      );
      return send(res, 200, { data });
    }

    if (action === 'leer_documento') {
      const path = typeof body.path === 'string' ? body.path : '';
      if (!path) return send(res, 400, { error: 'bad_request' });
      const data = await db(
        `docs?select=data,updated_at&user_id=eq.${encodeURIComponent(USER_ID)}&path=eq.${encodeURIComponent(path)}`
      );
      if (!data || !data.length) return send(res, 200, { data: { error: `No existe el documento "${path}". Usa listar_documentos para ver cuáles hay.` } });
      return send(res, 200, { data: data[0] });
    }

    return send(res, 400, { error: 'unknown_action' });
  } catch (e) {
    console.error('jordan-endpoint', e && e.message);
    return send(res, 502, { error: 'db_unavailable' });
  }
};
