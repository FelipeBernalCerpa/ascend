'use strict';
/* ---------- v4c: más bebidas y snacks (nombres propios y comunes) ----------
   Valores por 100 ml (bebidas) o 100 g (sólidos): [kcal, prot, carb, azúcar, fibra, grasa, sat, sodio mg]. */
FOODS.push(
  /* 6 · bebidas */
  FD('limonada_sa', 'Limonada natural sin azúcar', 6, [6, 0.1, 1.8, 0.5, 0.1, 0, 0, 1], [['vaso', 250]], 'l', 'limon sin azucar'),
  FD('limonada_hierba', 'Limonada de hierbabuena', 6, [38, 0.2, 9.8, 9, 0.3, 0, 0, 2], [['vaso', 250]], 'al', 'menta'),
  FD('monster', 'Monster Energy', 6, [47, 0, 11, 11, 0, 0, 0, 40], [['lata (473 ml)', 473], ['media lata', 237]], 'l', 'energetica energizante bebida'),
  FD('red_bull', 'Red Bull', 6, [45, 0.4, 11, 11, 0, 0, 0, 40], [['lata (250 ml)', 250]], 'l', 'energetica energizante'),
  FD('vive100', 'Vive 100', 6, [40, 0, 10, 10, 0, 0, 0, 30], [['botella (400 ml)', 400]], 'l', 'energetica energizante'),
  FD('monster_zero', 'Monster o energética sin azúcar', 6, [3, 0, 0.6, 0, 0, 0, 0, 40], [['lata (473 ml)', 473]], 'l', 'energetica cero zero ultra'),
  FD('pony_malta', 'Pony Malta', 6, [65, 0.8, 15, 13, 0, 0, 0, 15], [['botella (330 ml)', 330], ['lata (330 ml)', 330]], 'l', 'malta bavaria'),
  FD('colombiana', 'Gaseosa Colombiana (kola)', 6, [46, 0, 11.5, 11.5, 0, 0, 0, 10], [['lata (355 ml)', 355], ['botella (400 ml)', 400]], 'l', 'kola postobon roman'),
  FD('gaseosa_sabor', 'Gaseosa de naranja, uva o manzana', 6, [48, 0, 12, 12, 0, 0, 0, 15], [['lata (355 ml)', 355], ['vaso', 250]], 'l', 'manzana uva naranja postobon fanta'),
  FD('sprite', 'Gaseosa lima-limón', 6, [40, 0, 10, 10, 0, 0, 0, 15], [['lata (355 ml)', 355]], 'l', 'sprite 7up seven up quatro lima limon'),
  FD('agua_tonica', 'Agua tónica', 6, [34, 0, 8.8, 8.8, 0, 0, 0, 4], [['lata (330 ml)', 330]], 'l', 'tonica schweppes'),
  FD('soda_gas', 'Agua con gas o soda (sin azúcar)', 6, [0, 0, 0, 0, 0, 0, 0, 5], [['botella (500 ml)', 500], ['vaso', 250]], 'l', 'club soda agua mineral con gas seltzer'),
  FD('te_frio_sa', 'Té frío sin azúcar', 6, [1, 0, 0.3, 0, 0, 0, 0, 5], [['botella (500 ml)', 500]], 'l', 'fuze tea lipton sin azucar verde negro'),
  FD('avena_bebida', 'Avena en bebida fría', 6, [62, 1.6, 11.5, 9, 0.5, 0.9, 0.4, 45], [['vaso', 250]], 'al', 'avena fria alpina'),
  FD('cola_cereza', 'Gaseosa de cola sabor (cereza, vainilla)', 6, [44, 0, 11, 11, 0, 0, 0, 12], [['lata (355 ml)', 355]], 'l', 'cola cherry'),
  FD('jugo_hit', 'Néctar o jugo de caja de fruta', 6, [50, 0.2, 12.3, 11, 0.2, 0, 0, 10], [['caja (200 ml)', 200], ['vaso', 250]], 'l', 'hit tutti frutti california del valle'),
  FD('agua_saborizada_sa', 'Agua saborizada sin azúcar', 6, [1, 0, 0.3, 0, 0, 0, 0, 10], [['botella (500 ml)', 500]], 'l', 'cristal brisa sin azucar zero'),
  FD('jugo_verde_sa', 'Jugo verde sin azúcar', 6, [30, 1.2, 6, 3.5, 1.2, 0.2, 0, 20], [['vaso', 250]], 'al', 'detox apio pepino'),
  FD('gatorade', 'Bebida deportiva (Gatorade/Powerade)', 6, [24, 0, 6.1, 5.8, 0, 0, 0, 46], [['botella (500 ml)', 500]], 'l', 'gatorade powerade suerox hidratante'),
  FD('cafe_frio', 'Café frío endulzado (frappé de lata)', 6, [60, 1.8, 10, 9, 0, 1.2, 0.8, 40], [['botella (250 ml)', 250]], 'al', 'iced coffee juan valdez starbucks'),
  FD('soda_dieta', 'Gaseosa dietética o sin azúcar', 6, [1, 0, 0.2, 0, 0, 0, 0, 12], [['lata (355 ml)', 355]], 'l', 'coca cola zero light pepsi black sin azucar'),

  /* 2 · frutas */
  FD('mango_biche_solo', 'Mango biche en trozos', 2, [60, 0.8, 15, 9, 1.8, 0.4, 0.1, 2], [['porción', 150]], 'a', 'mango verde'),
  FD('salpicon', 'Salpicón de frutas', 2, [60, 0.6, 15, 12, 1.5, 0.2, 0, 10], [['vaso', 250]], 'a', 'frutas picadas'),

  /* 7 · dulces y otros */
  FD('bombombum', 'Bon Bon Bum o chupeta', 7, [390, 0, 97, 70, 0, 0, 0, 10], [['unidad', 18]], '', 'colombina chupeta caramelo'),

  /* 9 · paquetes y snacks */
  FD('palomitas', 'Palomitas de maíz (crispetas)', 9, [387, 12, 78, 0.9, 14, 4.5, 0.6, 500], [['taza', 12], ['porción', 30]], 'a', 'crispetas popcorn maiz pira')
);

/* ---------- v4: más actividades (MET del Compendio de Actividades Físicas) y biblioteca de gimnasio ---------- */
EX_CATS[0] = 'Gimnasio y fuerza';
EX_CATS[3] = 'Flexibilidad y mente-cuerpo';
EX_CATS.push('Baile', 'Agua y aire libre', 'Vida diaria');
for (const [k, cat, name] of [['baile', 4, 'Baile recreativo'], ['baile_i', 4, 'Zumba, rumba o aeróbicos de baile'], ['nadar', 5], ['nadar_i', 5], ['caminata', 5], ['patinar', 5]]) {
  const x = EXERCISES.find(e => e.k === k);
  if (x) { x.cat = cat; if (name) x.name = name; }
}
EXERCISES.push(
  /* 0 · gimnasio y fuerza */
  EXR('pesas_v', 'Pesas pesadas (powerlifting o halterofilia)', 0, 6, 0, 'gimnasio gym fuerza'),
  EXR('circuito', 'Circuito de pesas con poco descanso', 0, 8, 1, 'gimnasio gym'),
  EXR('kettlebell', 'Kettlebells', 0, 9.8, 1, 'pesa rusa'),
  EXR('trx', 'TRX o entrenamiento en suspensión', 0, 5, 0, 'funcional'),
  EXR('bandas', 'Bandas elásticas o tonificación', 0, 3.5, 0, 'ligas'),
  EXR('bodypump', 'Clase grupal de pesas (body pump)', 0, 5, 0, 'clase gimnasio'),
  /* 1 · cardio */
  EXR('caminar_l', 'Caminar despacio (3 km/h)', 1, 2.8, 0, ''),
  EXR('caminar_6', 'Caminar muy rápido (6,5 km/h)', 1, 5, 0, 'marcha'),
  EXR('correr14', 'Correr a 14 km/h', 1, 12.8, 1, ''),
  EXR('correr16', 'Correr a 16 km/h', 1, 14.8, 1, ''),
  EXR('bici_l', 'Bicicleta tranquila (menos de 16 km/h)', 1, 4, 0, 'cicla paseo'),
  EXR('bici_ruta', 'Ciclismo de ruta (22–25 km/h)', 1, 10, 1, 'cicla'),
  EXR('eliptica_i', 'Elíptica intensa', 1, 7, 1, ''),
  EXR('step', 'Step aeróbico', 1, 7.5, 1, 'aerobicos'),
  EXR('aerobicos_b', 'Aeróbicos de bajo impacto', 1, 5, 0, 'aerobicos'),
  EXR('escaleras_l', 'Subir escaleras despacio', 1, 4, 0, ''),
  EXR('trampolin', 'Trampolín', 1, 4.5, 0, 'brincar'),
  /* 2 · deportes */
  EXR('beisbol', 'Béisbol o sóftbol', 2, 5, 0, ''),
  EXR('balonmano', 'Balonmano', 2, 8, 1, 'handball'),
  EXR('rugby', 'Rugby', 2, 8.3, 1, ''),
  EXR('americano', 'Fútbol americano o flag football', 2, 8, 1, ''),
  EXR('tenis_dobles', 'Tenis en dobles', 2, 6, 0, ''),
  EXR('padel', 'Pádel', 2, 6, 0, 'padel'),
  EXR('squash', 'Squash', 2, 7.3, 1, ''),
  EXR('badminton', 'Bádminton', 2, 5.5, 0, ''),
  EXR('golf', 'Golf caminando', 2, 4.8, 0, ''),
  EXR('bolos', 'Bolos', 2, 3.8, 0, 'boliche'),
  EXR('billar', 'Billar', 2, 2.5, 0, 'pool'),
  EXR('tejo', 'Tejo o rana', 2, 3, 0, 'minitejo'),
  EXR('ultimate', 'Ultimate frisbee', 2, 8, 1, 'frisbee'),
  EXR('atletismo', 'Atletismo (velocidad y saltos)', 2, 8, 1, 'pista'),
  EXR('gimnasia', 'Gimnasia artística', 2, 3.8, 0, ''),
  EXR('porrismo', 'Porrismo', 2, 6, 0, 'cheerleading porras'),
  EXR('esgrima', 'Esgrima', 2, 6, 0, ''),
  EXR('lucha', 'Lucha o jiu-jitsu', 2, 7, 1, 'grappling bjj'),
  EXR('equitacion', 'Equitación', 2, 5.5, 0, 'caballo'),
  EXR('voley_playa', 'Voleibol de playa', 2, 8, 1, 'voley'),
  /* 3 · flexibilidad y mente-cuerpo */
  EXR('yoga_power', 'Yoga vinyasa o power yoga', 3, 4, 0, ''),
  EXR('tai_chi', 'Tai chi', 3, 3, 0, ''),
  EXR('barre', 'Barre', 3, 3.8, 0, 'ballet fitness'),
  EXR('movilidad', 'Movilidad o rodillo de espuma', 3, 2.5, 0, 'foam roller'),
  /* 4 · baile */
  EXR('salsa', 'Salsa, merengue o bachata', 4, 4.5, 0, 'bailar'),
  EXR('champeta', 'Champeta, cumbia o vallenato', 4, 4.5, 0, 'bailar'),
  EXR('regueton', 'Reguetón, hip hop o dancehall', 4, 6.5, 0, 'bailar urbano'),
  EXR('ballet', 'Ballet, danza contemporánea o jazz', 4, 5, 0, 'danza'),
  EXR('folclor', 'Danza folclórica (joropo, mapalé, cumbia)', 4, 4.5, 0, 'danza'),
  EXR('baile_lento', 'Baile lento (vals, tango, bolero)', 4, 3, 0, 'bailar'),
  EXR('baile_salon', 'Baile de salón rápido', 4, 5.5, 0, 'bailar'),
  EXR('coreografia', 'Coreografía o k-pop', 4, 7, 0, 'bailar ensayo'),
  EXR('baile_comp', 'Baile competitivo o ensayo intenso', 4, 11.3, 1, 'bailar competencia'),
  /* 5 · agua y aire libre */
  EXR('nadar_pecho', 'Natación estilo pecho', 5, 5.3, 0, 'nadar piscina'),
  EXR('nadar_espalda', 'Natación estilo espalda', 5, 4.8, 0, 'nadar piscina'),
  EXR('nadar_mariposa', 'Natación estilo mariposa', 5, 13.8, 1, 'nadar piscina'),
  EXR('aquaerobicos', 'Aeróbicos en el agua', 5, 5.3, 0, 'piscina'),
  EXR('surf', 'Surf', 5, 3, 0, ''),
  EXR('kayak', 'Kayak o canotaje', 5, 5, 0, 'remar'),
  EXR('paddle', 'Paddle surf', 5, 6, 0, 'sup'),
  EXR('snorkel', 'Snorkel o buceo', 5, 5, 0, ''),
  EXR('montanismo', 'Montañismo o subida fuerte', 5, 8, 1, 'senderismo trekking'),
  EXR('trail', 'Trail running', 5, 9, 1, 'correr montaña'),
  /* 6 · vida diaria */
  EXR('oficio', 'Oficio de la casa (barrer, trapear)', 6, 3.3, 0, 'aseo limpiar'),
  EXR('limpieza_p', 'Limpieza pesada o mover muebles', 6, 4, 0, 'aseo trasteo'),
  EXR('cocinar', 'Cocinar o lavar platos', 6, 2, 0, ''),
  EXR('jardin', 'Jardinería', 6, 3.8, 0, ''),
  EXR('pasear_perro', 'Pasear al perro', 6, 3, 0, 'mascota'),
  EXR('ninos', 'Jugar activo con niños', 6, 4, 0, ''),
  EXR('cargar', 'Cargar el mercado o cosas', 6, 3.5, 0, ''),
  EXR('videojuego', 'Videojuego activo (Just Dance)', 6, 4, 0, 'wii consola'),
  EXR('trabajo_fisico', 'Trabajo físico (construcción, cargar bultos)', 6, 5.5, 0, 'obra')
);

/* buscar «baile», «bailar» o «danza» trae todos los bailes; «gym» o «gimnasio», todo lo de fuerza */
for (const x of EXERCISES) {
  if (x.cat === 4) x.alias = (x.alias + ' baile bailar danza').trim();
  if (x.cat === 0 && !/gimnasio/.test(x.alias)) x.alias = (x.alias + ' gimnasio gym').trim();
}

/* gimnasio: biblioteca de ejercicios por grupo muscular e intensidad del entrenamiento */
const GYM_LEVELS = [
  { k: 'suave', label: 'Suave', sub: 'descansos largos', met: 3.5 },
  { k: 'moderada', label: 'Moderada', sub: 'ritmo normal', met: 5 },
  { k: 'fuerte', label: 'Fuerte', sub: 'pesado o sin pausa', met: 6 }
];
const GYM_LIB = [
  ['Pecho', ['Press de banca con barra', 'Press de banca con mancuernas', 'Press inclinado', 'Press declinado', 'Aperturas con mancuernas', 'Cruces en polea', 'Máquina de pecho (peck deck)', 'Fondos en paralelas', 'Flexiones de pecho']],
  ['Espalda', ['Dominadas', 'Jalón al pecho', 'Remo con barra', 'Remo con mancuerna', 'Remo en polea baja', 'Remo en máquina', 'Peso muerto', 'Pullover', 'Hiperextensiones']],
  ['Piernas y glúteos', ['Sentadilla con barra', 'Sentadilla goblet', 'Prensa de piernas', 'Zancadas', 'Sentadilla búlgara', 'Extensión de cuádriceps', 'Curl femoral', 'Peso muerto rumano', 'Hip thrust', 'Elevación de pantorrillas', 'Abductores en máquina', 'Aductores en máquina', 'Patada de glúteo en polea']],
  ['Hombros', ['Press militar', 'Press de hombro con mancuernas', 'Elevaciones laterales', 'Elevaciones frontales', 'Pájaros (deltoide posterior)', 'Face pull', 'Encogimientos de trapecio', 'Remo al mentón']],
  ['Brazos', ['Curl de bíceps con barra', 'Curl con mancuernas', 'Curl martillo', 'Curl en polea', 'Curl predicador', 'Extensión de tríceps en polea', 'Press francés', 'Fondos en banco', 'Patada de tríceps', 'Extensión sobre la cabeza']],
  ['Abdomen y core', ['Plancha', 'Plancha lateral', 'Crunch', 'Elevación de piernas', 'Rueda abdominal', 'Giros rusos', 'Escaladores', 'Crunch en polea']],
  ['Funcional y cardio', ['Burpees', 'Kettlebell swing', 'Saltos al cajón', 'Cuerdas de batalla', 'Thrusters', 'Cargada', 'Arranque', 'Caminata del granjero', 'Remo en máquina', 'Bicicleta estática', 'Caminadora', 'Elíptica']]
];

/* ---------- utilidades ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad2 = n => String(n).padStart(2, '0');
const keyOf = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const parseKey = k => { const p = String(k).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const todayKey = () => keyOf(new Date());
const diffDays = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);
const hm2min = hm => { if (!hm || String(hm).indexOf(':') < 0) return 0; const p = String(hm).split(':').map(Number); return (p[0] || 0) * 60 + (p[1] || 0); };
const atMin = (k, min) => { const d = parseKey(k); d.setHours(Math.floor(min / 60), min % 60, 0, 0); return d; };
const clone = o => (o == null ? o : JSON.parse(JSON.stringify(o)));
const sum = a => (Array.isArray(a) ? a : []).reduce((s, x) => s + (Number(x) || 0), 0);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const wait = ms => new Promise(r => setTimeout(r, ms));
const strip = o => { const c = clone(o); delete c.id; return c; };
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
const fmtNum = (v, max, min) => Number(v).toLocaleString('es-CO', { minimumFractionDigits: min || 0, maximumFractionDigits: max == null ? 2 : max });
const fmtInt = v => Math.round(Number(v) || 0).toLocaleString('es-CO');
function fmtClock(d) { let h = d.getHours(); const m = d.getMinutes(); const ap = h < 12 ? 'a. m.' : 'p. m.'; h = h % 12 || 12; return h + ':' + pad2(m) + ' ' + ap; }
const fmtHM = hm => fmtClock(atMin('2000-01-01', hm2min(hm)));
const fmtDay = k => { const d = parseKey(k); return WD[d.getDay()] + ' ' + d.getDate() + ' ' + MO[d.getMonth()]; };
const fmtDate = k => { const d = parseKey(k); return d.getDate() + ' ' + MO[d.getMonth()] + ' ' + d.getFullYear(); };
const fmtShort = k => { const d = parseKey(k); return d.getDate() + ' ' + MO[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2); };
const fmtMonYr = ms => { const d = new Date(ms); return MO[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2); };
const parseNum = s => { const t = String(s == null ? '' : s).trim().replace(/\s/g, '').replace(',', '.'); return t === '' ? NaN : Number(t); };
const MEASURE_FIELDS = ['weight', 'height', 'fat', 'muscle'];
const sign = d => (d > 0 ? '+' : d < 0 ? '−' : '±');
const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt || 0) - (b.createdAt || 0));
const byCreated = (a, b) => (a.createdAt || 0) - (b.createdAt || 0);
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

/* ---------- estado ---------- */
const S = {
  tab: 'hoy',
  viewKey: todayKey(),
  lastToday: todayKey(),
  settings: clone(DEFAULT_SETTINGS),
  meds: [], medsLoaded: false,
  days: {}, daysLoaded: false, daysCount: 0, oldestLoaded: '0000-00-00',
  fetched: new Set(), fetching: new Set(),
  measures: [], labs: [], questions: [], shopping: {}, shopCustom: [],
  loaded: { settings: false, measures: false, labs: false, questions: false, shopping: false, profile: false, foods: false, recipes: false },
  readonly: false, canWrite: null, offline: false, statusHard: null, inflight: 0,
  drafts: {}, formErr: {}, confirmDel: null, cdT: 0,
  openMed: null, openLab: null, openHist: null,
  summary: '', copied: false,
  charts: {},
  medDraft: null, userEmail: '', started: false, dataReady: false, refreshing: false, recovering: false, dataMsg: '',
  profile: {}, foods: [], recipes: [], sheet: null, sheetFrom: null
};
const dirty = new Set();
const deleting = new Set();
let storeReadyResolve;
const storeReady = new Promise(r => { storeReadyResolve = r; });
const draft = (id, fb) => (Object.prototype.hasOwnProperty.call(S.drafts, id) ? S.drafts[id] : fb);

/* ---------- almacenamiento en la nube (Supabase, una fila por documento) ---------- */
const store = {
  kind: null,
  userId: null,
  docs: {},
  watchers: [],
  lastLoad: 0,
  wv: 0,
  async load(accept) {
    const rows = [];
    for (let from = 0; from < 100000; from += 1000) {
      const res = await sb.from('docs').select('path,data').order('path', { ascending: true }).range(from, from + 999);
      if (res.error) throw normErr(res.error, res.status);
      const batch = res.data || [];
      for (const r of batch) rows.push(r);
      if (batch.length < 1000) break;
    }
    const next = {};
    for (const r of rows) if (r && r.path) next[r.path] = r.data;
    if (accept && !accept()) return false;
    this.docs = next;
    this.lastLoad = Date.now();
    return true;
  },
  col(col) {
    const pre = col + '/', out = [];
    for (const p of Object.keys(this.docs)) {
      if (p.indexOf(pre) !== 0) continue;
      const rest = p.slice(pre.length);
      if (rest && rest.indexOf('/') < 0) out.push({ id: rest, data: clone(this.docs[p]) });
    }
    return out;
  },
  deliver(w) { w.cb(w.doc ? clone(this.docs[w.path] == null ? null : this.docs[w.path]) : this.col(w.path)); },
  emit() { for (const w of this.watchers) this.deliver(w); },
  watchDoc(path, cb) { const w = { doc: true, path, cb }; this.watchers.push(w); this.deliver(w); return () => {}; },
  watchCol(col, cb) { const w = { doc: false, path: col, cb }; this.watchers.push(w); this.deliver(w); return () => {}; },
  async retry(fn) {
    try { return await fn(); }
    catch (e) {
      if (e && e.code === 'unavailable') { await wait(700 + Math.random() * 900); return await fn(); }
      throw e;
    }
  },
  async set(path, data) {
    this.wv++;
    return this.retry(async () => {
      const res = await sb.from('docs').upsert({ user_id: this.userId, path, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id,path' });
      if (res.error) throw normErr(res.error, res.status);
      this.docs[path] = clone(data);
      this.wv++;
    });
  },
  async del(path) {
    this.wv++;
    return this.retry(async () => {
      const res = await sb.from('docs').delete().eq('user_id', this.userId).eq('path', path);
      if (res.error) throw normErr(res.error, res.status);
      delete this.docs[path];
      this.wv++;
    });
  },
  newId() { return uid(); }
};
function normErr(error, status) {
  const msg = String((error && error.message) || error || '');
  if (status === 401) { try { sb.auth.refreshSession(); } catch (e) {} return { code: 'unavailable', message: msg, status, raw: error }; }
  const net = !status || status >= 500 || status === 408 || status === 429 || /fetch|network|timeout|load failed/i.test(msg);
  return { code: net ? 'unavailable' : 'invalid_argument', message: msg, status: status || 0, raw: error };
}

function snapErr(e, resub) {
  const c = e && e.code;
  if (c === 'unavailable') { S.offline = true; refreshStatus(); setTimeout(resub, 2500 + Math.random() * 2500); return; }
  if (c === 'resource_exhausted') { setTimeout(resub, 10000); return; }
  if (c === 'revoked' || c === 'not_granted' || c === 'capability_disabled' || c === 'capability_removed') { S.statusHard = 'noaccess'; refreshStatus(); return; }
  console.error('Ascend: error al leer datos', e);
}

/* guardado: una escritura a la vez por documento, agrupando cambios seguidos */
const saver = {
  pend: new Map(), timers: new Map(), busy: new Set(),
  queue(path, data, delay) {
    if (S.readonly) return;
    this.pend.set(path, data);
    dirty.add(path);
    clearTimeout(this.timers.get(path));
    this.timers.set(path, setTimeout(() => this.flush(path), delay == null ? 500 : delay));
    refreshStatus();
  },
  cancel(path) {
    clearTimeout(this.timers.get(path)); this.timers.delete(path); this.pend.delete(path);
    if (!this.busy.has(path)) dirty.delete(path);
  },
  async flush(path) {
    this.timers.delete(path);
    await storeReady;
    if (this.busy.has(path)) return;
    if (!this.pend.has(path)) { dirty.delete(path); refreshStatus(); return; }
    const data = this.pend.get(path);
    this.pend.delete(path);
    this.busy.add(path);
    let ok = true;
    try { await store.set(path, data); S.offline = false; }
    catch (e) { ok = false; onWriteErr(e, path, data); }
    this.busy.delete(path);
    if (this.pend.has(path)) { if (!this.timers.has(path)) this.flush(path); }
    else if (ok) dirty.delete(path);
    refreshStatus();
  },
  flushAll() {
    for (const p of Array.from(this.pend.keys())) { clearTimeout(this.timers.get(p)); this.timers.delete(p); this.flush(p); }
  }
};
