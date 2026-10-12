'use strict';

/* ---------- constantes ---------- */
const LS_TAB = 'ascend-tab';

/* ---------- conexión ---------- */
const CFG = window.ASCEND_CONFIG || {};
const CONFIGURED = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(CFG.url || '')) && !!CFG.key && String(CFG.key).indexOf('TU_') !== 0;
let sb = null;
try {
  if (CONFIGURED && window.supabase && typeof window.supabase.createClient === 'function') {
    sb = window.supabase.createClient(String(CFG.url).replace(/\/$/, ''), String(CFG.key), {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }
} catch (e) { sb = null; }

const DEFAULT_SETTINGS = {
  waterGoal: 2000,
  bedTarget: '22:30',
  wakeTarget: '06:30',
  sleepGoal: 8,
  nutri: {},
  stepGoal: null,
  slots: {
    manana: { name: 'Al despertar', time: '06:30' },
    desayuno: { name: 'Desayuno', time: '07:00' },
    almuerzo: { name: 'Almuerzo', time: '12:30' },
    noche: { name: 'Noche', time: '21:30' }
  }
};
const SLOT_KEYS = ['manana', 'desayuno', 'almuerzo', 'noche'];

/* ---------- plan personal: objetivos, hábitos y guía de cada cuenta ---------- */
const GOALS = [
  { k: 'bajar', label: 'Bajar de peso' },
  { k: 'mantener', label: 'Mantener mi peso' },
  { k: 'subir', label: 'Subir de peso' },
  { k: 'musculo', label: 'Ganar músculo' }
];
const ACTIVITY = [
  { k: 'poca', label: 'Poca', sub: 'Sentado casi todo el día' },
  { k: 'ligera', label: 'Ligera', sub: 'Camino o entreno 1 a 3 días' },
  { k: 'moderada', label: 'Moderada', sub: 'Entreno 3 a 5 días' },
  { k: 'alta', label: 'Alta', sub: 'Entreno fuerte casi a diario' }
];
const PACES = [
  { k: 'suave', label: 'Suave' },
  { k: 'moderado', label: 'Moderado' }
];
const DIETS = [
  { k: 'sin_gluten', label: 'Sin gluten' },
  { k: 'vegetariana', label: 'Vegetariana' },
  { k: 'sin_lactosa', label: 'Sin lactosa' }
];
const CONDITIONS = [
  { k: 'renal', label: 'Enfermedad renal' },
  { k: 'diabetes', label: 'Diabetes' },
  { k: 'hta', label: 'Presión alta' },
  { k: 'embarazo', label: 'Embarazo o lactancia' },
  { k: 'tca', label: 'Trastorno de la conducta alimentaria' }
];
/* hábitos del día que trae cada objetivo; cada cuenta puede cambiarlos en Ajustes */
const HABITS_BY_GOAL = {
  subir: [
    { k: 'aceite', label: 'Aceite de oliva en una comida' },
    { k: 'aguacate', label: 'Aguacate' },
    { k: 'frutos', label: 'Frutos secos o chía' },
    { k: 'lacteos', label: '2 o 3 lácteos' },
    { k: 'batido', label: 'Batido' },
    { k: 'carbo', label: 'Arroz o papa doble' },
    { k: 'noche', label: 'Snack antes de dormir' }
  ],
  bajar: [
    { k: 'h-verdura', label: 'Verdura en almuerzo y cena' },
    { k: 'h-proteina', label: 'Proteína en cada comida' },
    { k: 'h-sinazucar', label: 'Sin bebidas azucaradas' },
    { k: 'h-fruta', label: 'Fruta entera, no en jugo' },
    { k: 'h-paquete', label: 'Nada de paquetes entre comidas' },
    { k: 'h-caminar', label: '30 minutos caminando' }
  ],
  mantener: [
    { k: 'h-verdura', label: 'Verdura en almuerzo y cena' },
    { k: 'h-fruta2', label: '2 frutas enteras' },
    { k: 'h-agua', label: 'Agua en vez de gaseosa o jugo' },
    { k: 'h-legumbre', label: 'Legumbres, pescado o huevo' },
    { k: 'h-integral', label: 'Un cereal integral' },
    { k: 'h-casero', label: 'Comida casera, poco paquete' }
  ],
  musculo: [
    { k: 'h-proteina', label: 'Proteína en cada comida' },
    { k: 'h-fuerza', label: 'Entrenamiento de fuerza' },
    { k: 'h-carbo', label: 'Carbohidrato antes y después de entrenar' },
    { k: 'lacteos', label: '2 o 3 lácteos' },
    { k: 'h-verdura', label: 'Verdura en almuerzo y cena' },
    { k: 'h-snack', label: 'Refrigerio con proteína' }
  ]
};
const GUIDE_SECTIONS = [
  { k: 'rules', label: 'Indicaciones' },
  { k: 'meals', label: 'Por comida' },
  { k: 'avoid', label: 'Evitar' }
];
const MAX_HABITS = 30, MAX_GUIDE = 40, MAX_CHAT = 40, MAX_SHOP = 60;
const MEALS = [
  { k: 'desayuno', label: 'Desayuno' },
  { k: 'onces', label: 'Onces' },
  { k: 'almuerzo1', label: 'Almuerzo en el colegio' },
  { k: 'almuerzo2', label: 'Almuerzo en casa' },
  { k: 'noche', label: 'Antes de dormir' }
];
const EX_TYPES = [
  { k: 'fuerza', label: 'Fuerza' },
  { k: 'lazo', label: 'Lazo' },
  { k: 'suave', label: 'Cardio suave' },
  { k: 'intenso', label: 'Cardio intenso' },
  { k: 'caminar', label: 'Caminar' },
  { k: 'descanso', label: 'Descanso' }
];
const LAB_TYPES = [
  { k: 'glucosa', name: 'Glucosa en ayunas', unit: 'mg/dL' },
  { k: 'hba1c', name: 'Hemoglobina glicosilada', unit: '%' },
  { k: 'colesterol', name: 'Colesterol total', unit: 'mg/dL' },
  { k: 'hdl', name: 'Colesterol HDL', unit: 'mg/dL' },
  { k: 'ldl', name: 'Colesterol LDL', unit: 'mg/dL' },
  { k: 'trigliceridos', name: 'Triglicéridos', unit: 'mg/dL' },
  { k: 'creatinina', name: 'Creatinina', unit: 'mg/dL' },
  { k: 'hemoglobina', name: 'Hemoglobina', unit: 'g/dL' },
  { k: 'ferritina', name: 'Ferritina', unit: 'ng/mL' },
  { k: 'vitd', name: 'Vitamina D (25-OH)', unit: 'ng/mL' },
  { k: 'b12', name: 'Vitamina B12', unit: 'pg/mL' },
  { k: 'tsh', name: 'TSH', unit: 'µUI/mL' },
  { k: 't4l', name: 'T4 libre', unit: 'ng/dL' },
  { k: 'potasio', name: 'Potasio', unit: 'mmol/L' },
  { k: 'proteinuria', name: 'Proteinuria', unit: '' },
  { k: 'igf1', name: 'IGF-1 (Somatomedina C)', unit: 'ng/mL' },
  { k: 'otro', name: 'Otro examen', unit: '' }
];
const LAB_BY = Object.fromEntries(LAB_TYPES.map(t => [t.k, t]));
const DOCTORS = [
  { k: 'general', label: 'Medicina general' },
  { k: 'nutri', label: 'Nutrición' },
  { k: 'pedia', label: 'Pediatría' },
  { k: 'nefro', label: 'Nefrología' },
  { k: 'endo', label: 'Endocrinología' },
  { k: 'cardio', label: 'Cardiología' },
  { k: 'otro', label: 'Otros' }
];

const WD = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const WD1 = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const WD_ORDER = [1, 2, 3, 4, 5, 6, 0];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const MO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const STATUS_TXT = {
  loading: 'Cargando…', saving: 'Guardando…', saved: 'Guardado', local: 'Sin conexión',
  offline: 'Sin conexión, reintentando', readonly: 'Solo lectura', noaccess: 'Sin acceso a los datos',
  quota: 'Espacio lleno', error: 'No se pudo guardar'
};
const ICON = {
  left: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'
};

/* ---------- nutrición y actividad: datos ---------- */
const NUTRIENTS = [
  { k: 'kcal', label: 'Calorías', unit: 'kcal' },
  { k: 'p', label: 'Proteína', unit: 'g' },
  { k: 'c', label: 'Carbohidratos', unit: 'g' },
  { k: 's', label: 'Azúcar', unit: 'g' },
  { k: 'fi', label: 'Fibra', unit: 'g' },
  { k: 'f', label: 'Grasas', unit: 'g' },
  { k: 'sf', label: 'Grasas saturadas', unit: 'g' },
  { k: 'na', label: 'Sodio', unit: 'mg' }
];
const NK = NUTRIENTS.map(n => n.k);
/* cómo se lee cada meta: llegar a ella, no pasarla o como mínimo */
const GOAL_KIND = { kcal: 'meta', p: 'max', c: 'meta', s: 'max', fi: 'min', f: 'meta', sf: 'max', na: 'max' };
const FOOD_MEALS = [
  { k: 'desayuno', label: 'Desayuno' },
  { k: 'media', label: 'Media mañana' },
  { k: 'almuerzo', label: 'Almuerzo' },
  { k: 'onces', label: 'Onces' },
  { k: 'cena', label: 'Cena' },
  { k: 'noche', label: 'Antes de dormir' }
];
const FOOD_CATS = ['Proteínas y leguminosas', 'Cereales, tubérculos y harinas', 'Frutas', 'Verduras', 'Lácteos', 'Grasas, nueces y semillas', 'Bebidas', 'Dulces y otros', 'Platos y comidas rápidas', 'Paquetes y snacks'];

/* Valores por 100 g (o 100 ml si es líquido): [kcal, proteína g, carbohidratos g, azúcar g, fibra g, grasas g, saturadas g, sodio mg].
   Fuente principal: USDA FoodData Central. Opciones: 'a' = aproximado (receta casera o producto variable), 'l' = líquido. */
function FD(id, name, cat, v, units, flags, alias) {
  const fl = flags || '';
  return { src: 'db', id, name, cat, v, units: (units || []).map(u => ({ u: u[0], g: u[1] })), approx: fl.indexOf('a') >= 0, liquid: fl.indexOf('l') >= 0, alias: alias || '' };
}
const FOODS = [
  /* 0 · proteínas y leguminosas */
  FD('huevo', 'Huevo entero cocido', 0, [143, 12.6, 0.7, 0.4, 0, 9.5, 3.1, 142], [['unidad', 50]], '', 'huevos tibio duro'),
  FD('huevo_frito', 'Huevo frito', 0, [196, 13.6, 0.8, 0.4, 0, 14.8, 4.3, 207], [['unidad', 46]], '', 'huevos'),
  FD('huevo_rev', 'Huevos revueltos o pericos', 0, [149, 10, 1.6, 1.4, 0, 11, 3.3, 145], [['huevo', 61]], '', 'huevos perico'),
  FD('clara', 'Clara de huevo', 0, [52, 10.9, 0.7, 0.7, 0, 0.2, 0, 166], [['clara', 33]], '', 'huevo claras'),
  FD('pechuga', 'Pechuga de pollo sin piel, cocida', 0, [165, 31, 0, 0, 0, 3.6, 1, 74], [['filete mediano', 120], ['porción pequeña', 80]], '', 'pollo asado desmechado'),
  FD('muslo', 'Muslo de pollo sin piel, cocido', 0, [209, 26, 0, 0, 0, 10.9, 3, 95], [['unidad', 80]], '', 'pollo pierna contramuslo'),
  FD('pollo_frito', 'Pollo apanado o frito', 0, [260, 24.8, 9, 0.5, 0.3, 13.2, 3.5, 275], [['presa', 140]], '', 'pollo broaster'),
  FD('res', 'Carne de res magra, asada', 0, [190, 29, 0, 0, 0, 7.5, 2.9, 60], [['porción', 100], ['bistec mediano', 120]], '', 'carne bistec lomo sobrebarriga'),
  FD('molida', 'Carne molida (90/10), cocida', 0, [217, 26.1, 0, 0, 0, 11.8, 4.6, 76], [['½ taza', 60], ['porción', 100]], '', 'carne'),
  FD('cerdo', 'Lomo de cerdo, asado', 0, [143, 26, 0, 0, 0, 3.5, 1.2, 57], [['porción', 100]], '', 'cerdo chuleta'),
  FD('tilapia', 'Tilapia o mojarra, cocida', 0, [128, 26.2, 0, 0, 0, 2.7, 0.9, 56], [['filete', 120]], '', 'pescado'),
  FD('salmon', 'Salmón, cocido', 0, [206, 22.1, 0, 0, 0, 12.4, 2.5, 61], [['filete', 120]], '', 'pescado'),
  FD('trucha', 'Trucha, cocida', 0, [168, 23.8, 0, 0, 0, 7.4, 2.2, 61], [['filete', 120]], '', 'pescado'),
  FD('atun', 'Atún en agua, escurrido', 0, [116, 25.5, 0, 0, 0, 0.8, 0.2, 338], [['lata', 120], ['½ lata', 60]], '', 'enlatado'),
  FD('sardinas', 'Sardinas en aceite, escurridas', 0, [208, 24.6, 0, 0, 0, 11.5, 1.5, 307], [['lata', 90]], '', 'pescado enlatado'),
  FD('camaron', 'Camarones, cocidos', 0, [99, 24, 0.2, 0, 0, 0.3, 0.1, 111], [['porción', 85]], '', 'mariscos'),
  FD('frijol_c', 'Fríjoles caseros (con sal)', 0, [136, 8.2, 22, 1, 6, 1.5, 0.2, 250], [['½ taza', 90], ['taza', 177]], 'a', 'frijoles frisoles'),
  FD('frijol', 'Fríjoles cocidos sin sal', 0, [127, 8.7, 22.8, 0.3, 6.4, 0.5, 0.1, 2], [['½ taza', 90], ['taza', 177]], '', 'frijoles frisoles'),
  FD('lenteja_c', 'Lentejas caseras (con sal)', 0, [125, 8.5, 19.5, 2, 7.5, 1.4, 0.2, 250], [['½ taza', 99], ['taza', 198]], 'a', 'lentejas'),
  FD('lenteja', 'Lentejas cocidas sin sal', 0, [116, 9, 20.1, 1.8, 7.9, 0.4, 0.1, 2], [['½ taza', 99], ['taza', 198]], '', 'lentejas'),
  FD('garbanzo', 'Garbanzos cocidos', 0, [164, 8.9, 27.4, 4.8, 7.6, 2.6, 0.3, 7], [['½ taza', 82], ['taza', 164]], '', 'garbanzos'),

  /* 1 · cereales, tubérculos y harinas */
  FD('arroz_c', 'Arroz blanco casero (con sal y aceite)', 1, [141, 2.7, 28.2, 0.1, 0.4, 1.5, 0.3, 200], [['½ taza', 79], ['taza', 158], ['plato', 250]], 'a', 'arroz'),
  FD('arroz', 'Arroz blanco sin sal', 1, [130, 2.7, 28.2, 0.1, 0.4, 0.3, 0.1, 1], [['½ taza', 79], ['taza', 158]], '', 'arroz'),
  FD('arroz_int', 'Arroz integral', 1, [123, 2.7, 25.6, 0.2, 1.6, 1, 0.3, 4], [['taza', 195]], '', 'arroz'),
  FD('arepa', 'Arepa de maíz blanca', 1, [210, 4.8, 44, 1, 3.5, 1.5, 0.2, 250], [['mediana', 70], ['pequeña', 45]], 'a', 'arepas'),
  FD('arepa_queso', 'Arepa con queso y mantequilla', 1, [250, 8.5, 30, 1.5, 2.4, 10.5, 6, 420], [['unidad', 110]], 'a', 'arepas'),
  FD('papa_c', 'Papa cocida con sal (pastusa, sabanera o criolla)', 1, [87, 1.9, 20.1, 0.9, 1.8, 0.1, 0, 241], [['mediana', 150], ['pequeña', 75], ['papa criolla', 30]], '', 'papas'),
  FD('papa', 'Papa cocida sin sal', 1, [87, 1.9, 20.1, 0.9, 1.8, 0.1, 0, 4], [['mediana', 150], ['pequeña', 75], ['papa criolla', 30]], '', 'papas'),
  FD('papa_fr', 'Papas a la francesa', 1, [312, 3.4, 41.4, 0.3, 3.8, 14.7, 2.3, 210], [['porción mediana', 117], ['porción pequeña', 71]], '', 'papas fritas'),
  FD('papas_paq', 'Papas fritas de paquete', 1, [536, 7, 53, 0.3, 4.4, 34.6, 4, 525], [['paquete pequeño', 30]], 'a', 'papitas chips paquete'),
  FD('maduro', 'Plátano maduro cocido o asado', 1, [116, 0.8, 31.2, 14, 2.3, 0.2, 0.1, 5], [['½ plátano', 90], ['plátano', 180]], '', 'platano'),
  FD('maduro_fr', 'Tajadas de maduro fritas', 1, [285, 1.5, 45, 20, 3, 11, 1.5, 5], [['porción (4 tajadas)', 80]], 'a', 'platano'),
  FD('patacon', 'Patacón', 1, [309, 1.5, 49, 1.2, 3.5, 11.8, 2, 250], [['unidad', 40]], 'a', 'platano verde toston'),
  FD('yuca', 'Yuca cocida', 1, [125, 1.1, 30, 1.3, 1.5, 0.2, 0.1, 10], [['trozo', 100]], 'a', ''),
  FD('mazorca', 'Mazorca (maíz tierno) cocida', 1, [96, 3.4, 21, 4.5, 2.4, 1.5, 0.2, 1], [['mazorca desgranada', 100]], '', 'choclo maiz'),
  FD('pasta_sg', 'Pasta sin gluten, cocida', 1, [155, 3, 33, 0.5, 1.5, 1, 0.2, 2], [['taza', 140]], 'a', 'espaguetis macarrones'),
  FD('pasta', 'Pasta de trigo, cocida', 1, [158, 5.8, 30.9, 0.6, 1.8, 0.9, 0.2, 1], [['taza', 140]], '', 'espaguetis macarrones'),
  FD('quinua', 'Quinua cocida', 1, [120, 4.4, 21.3, 0.9, 2.8, 1.9, 0.2, 7], [['½ taza', 92], ['taza', 185]], '', 'quinoa'),
  FD('avena', 'Avena en hojuelas', 1, [379, 13.2, 67.7, 1, 10.1, 6.5, 1.1, 6], [['cda', 8], ['½ taza', 40]], '', ''),
  FD('avena_beb', 'Avena en leche (bebida)', 1, [105, 3.4, 16, 11, 0.6, 3.2, 1.9, 45], [['vaso', 250]], 'al', 'avena colombiana'),
  FD('granola', 'Granola', 1, [489, 13.7, 53.9, 20.4, 8.9, 24.3, 4.1, 26], [['¼ taza', 30], ['½ taza', 60]], '', ''),
  FD('cereal', 'Cereal de hojuelas de maíz', 1, [357, 7.5, 84, 9.5, 3.3, 0.4, 0.1, 729], [['taza', 28]], 'a', 'corn flakes'),
  FD('pan_sg', 'Pan sin gluten', 1, [265, 4, 47, 4, 4.5, 6, 1, 480], [['tajada', 30]], 'a', ''),
  FD('pan', 'Pan blanco', 1, [266, 7.6, 50.6, 5.3, 2.4, 3.3, 0.7, 490], [['tajada', 25], ['pan pequeño', 40]], '', 'pan tajado'),
  FD('pan_int', 'Pan integral', 1, [252, 12.4, 42.7, 4.4, 6, 3.5, 0.7, 450], [['tajada', 28]], '', ''),
  FD('tortilla', 'Tortilla de maíz', 1, [218, 5.7, 44.6, 0.9, 6.3, 2.9, 0.4, 45], [['unidad', 26]], '', ''),
  FD('pandebono', 'Pandebono', 1, [330, 8, 40, 3, 0.5, 15, 7, 500], [['unidad', 50]], 'a', ''),
  FD('almojabana', 'Almojábana', 1, [320, 9, 42, 5, 0.5, 13, 6, 450], [['unidad', 60]], 'a', ''),
  FD('bunuelo', 'Buñuelo', 1, [380, 9, 38, 3, 0.5, 22, 7, 400], [['unidad', 40]], 'a', ''),
  FD('empanada', 'Empanada frita', 1, [270, 7, 28, 1, 2, 14, 3, 350], [['unidad', 80]], 'a', 'empanadas'),

  /* 2 · frutas */
  FD('banano', 'Banano', 2, [89, 1.1, 22.8, 12.2, 2.6, 0.3, 0.1, 1], [['mediano', 118], ['pequeño', 80]], '', 'banana guineo'),
  FD('papaya', 'Papaya', 2, [43, 0.5, 10.8, 7.8, 1.7, 0.3, 0.1, 8], [['taza en trozos', 145]], '', ''),
  FD('manzana', 'Manzana', 2, [52, 0.3, 13.8, 10.4, 2.4, 0.2, 0, 1], [['mediana', 180]], '', ''),
  FD('mandarina', 'Mandarina', 2, [53, 0.8, 13.3, 10.6, 1.8, 0.3, 0, 2], [['unidad', 90]], '', ''),
  FD('naranja', 'Naranja', 2, [47, 0.9, 11.8, 9.4, 2.4, 0.1, 0, 0], [['unidad', 130]], '', ''),
  FD('durazno', 'Durazno', 2, [39, 0.9, 9.5, 8.4, 1.5, 0.3, 0, 0], [['unidad', 150]], '', 'melocoton'),
  FD('pera', 'Pera', 2, [57, 0.4, 15.2, 9.8, 3.1, 0.1, 0, 1], [['unidad', 180]], '', ''),
  FD('fresas', 'Fresas', 2, [32, 0.7, 7.7, 4.9, 2, 0.3, 0, 1], [['taza', 150]], '', 'fresa'),
  FD('arandanos', 'Arándanos', 2, [57, 0.7, 14.5, 10, 2.4, 0.3, 0, 1], [['½ taza', 75]], '', ''),
  FD('mora', 'Mora', 2, [43, 1.4, 9.6, 4.9, 5.3, 0.5, 0, 1], [['taza', 145]], '', 'moras'),
  FD('pina', 'Piña', 2, [50, 0.5, 13.1, 9.9, 1.4, 0.1, 0, 1], [['taza en trozos', 165]], '', ''),
  FD('mango', 'Mango', 2, [60, 0.8, 15, 13.7, 1.6, 0.4, 0.1, 1], [['taza en trozos', 165]], '', ''),
  FD('uvas', 'Uvas', 2, [69, 0.7, 18.1, 15.5, 0.9, 0.2, 0.1, 2], [['taza', 150]], '', 'uva'),
  FD('guayaba', 'Guayaba', 2, [68, 2.6, 14.3, 8.9, 5.4, 1, 0.3, 2], [['unidad', 90]], '', ''),
  FD('sandia', 'Sandía o patilla', 2, [30, 0.6, 7.6, 6.2, 0.4, 0.2, 0, 1], [['taza en trozos', 150]], '', 'patilla'),
  FD('melon', 'Melón', 2, [34, 0.8, 8.2, 7.9, 0.9, 0.2, 0.1, 16], [['taza en trozos', 160]], '', ''),
  FD('kiwi', 'Kiwi', 2, [61, 1.1, 14.7, 9, 3, 0.5, 0, 3], [['unidad', 75]], '', ''),
  FD('maracuya', 'Maracuyá (pulpa)', 2, [97, 2.2, 23.4, 11.2, 10.4, 0.7, 0.1, 28], [['unidad', 50]], '', ''),
  FD('pasas', 'Uvas pasas', 2, [299, 3.1, 79.2, 59.2, 3.7, 0.5, 0.1, 11], [['cda', 10], ['¼ taza', 40]], '', ''),

  /* 3 · verduras */
  FD('brocoli', 'Brócoli cocido', 3, [35, 2.4, 7.2, 1.4, 3.3, 0.4, 0.1, 41], [['½ taza', 78], ['taza', 156]], '', ''),
  FD('zanahoria_c', 'Zanahoria cocida', 3, [35, 0.8, 8.2, 3.5, 3, 0.2, 0, 58], [['½ taza', 78]], '', ''),
  FD('zanahoria', 'Zanahoria cruda', 3, [41, 0.9, 9.6, 4.7, 2.8, 0.2, 0, 69], [['unidad mediana', 61], ['½ taza rallada', 55]], '', ''),
  FD('lechuga', 'Lechuga', 3, [15, 1.4, 2.9, 0.8, 1.3, 0.2, 0, 28], [['taza', 40]], '', 'ensalada'),
  FD('tomate', 'Tomate', 3, [18, 0.9, 3.9, 2.6, 1.2, 0.2, 0, 5], [['unidad mediana', 120]], '', ''),
  FD('pepino', 'Pepino cohombro', 3, [15, 0.7, 3.6, 1.7, 0.5, 0.1, 0, 2], [['½ unidad', 100]], '', ''),
  FD('espinaca', 'Espinaca cocida', 3, [23, 3, 3.8, 0.4, 2.4, 0.3, 0, 70], [['½ taza', 90]], '', ''),
  FD('ahuyama', 'Ahuyama cocida', 3, [20, 0.7, 4.9, 2.1, 1.1, 0.1, 0, 1], [['porción', 120]], '', 'zapallo calabaza'),
  FD('habichuela', 'Habichuela cocida', 3, [35, 1.9, 7.9, 3.6, 3.2, 0.3, 0.1, 1], [['½ taza', 60]], '', 'habichuelas'),
  FD('arveja', 'Arveja verde cocida', 3, [84, 5.4, 15.6, 5.9, 5.5, 0.2, 0, 3], [['½ taza', 80]], '', 'arvejas'),
  FD('ensalada', 'Ensalada verde, sin aderezo', 3, [16, 0.9, 3.4, 1.8, 1.1, 0.2, 0, 10], [['porción', 100]], 'a', 'lechuga tomate pepino'),

  /* 4 · lácteos */
  FD('leche', 'Leche entera', 4, [61, 3.2, 4.8, 5.1, 0, 3.3, 1.9, 43], [['vaso', 240], ['½ vaso', 120]], 'l', ''),
  FD('leche_des', 'Leche deslactosada entera', 4, [61, 3.2, 4.8, 5.1, 0, 3.3, 1.9, 43], [['vaso', 240], ['½ vaso', 120]], 'l', 'leche sin lactosa'),
  FD('leche_desc', 'Leche descremada', 4, [34, 3.4, 5, 5, 0, 0.1, 0.1, 42], [['vaso', 240]], 'l', 'leche light'),
  FD('yogur', 'Yogur natural entero', 4, [61, 3.5, 4.7, 4.7, 0, 3.3, 2.1, 46], [['vaso', 200], ['pote', 150]], '', 'yogurt'),
  FD('yogur_dulce', 'Yogur con dulce (bebible)', 4, [85, 2.8, 14, 13, 0, 2, 1.3, 45], [['vaso', 200]], 'a', 'yogurt'),
  FD('griego', 'Yogur griego natural entero', 4, [97, 9, 4, 4, 0, 5, 2.4, 35], [['pote', 150]], '', 'yogurt'),
  FD('kumis', 'Kumis', 4, [90, 3, 13, 12, 0, 2.6, 1.7, 45], [['vaso', 200]], 'a', ''),
  FD('queso_camp', 'Queso campesino', 4, [270, 18, 2.5, 2.5, 0, 21, 13, 550], [['tajada', 30]], 'a', 'queso fresco'),
  FD('mozzarella', 'Queso mozzarella', 4, [254, 24.3, 2.8, 1.1, 0, 15.9, 10.1, 619], [['tajada', 25]], '', 'queso'),

  /* 5 · grasas, nueces y semillas */
  FD('aceite_oliva', 'Aceite de oliva', 5, [884, 0, 0, 0, 0, 100, 13.8, 2], [['cda', 13.5], ['cdta', 4.5]], '', 'aceite'),
  FD('aceite', 'Aceite vegetal (girasol, canola o soya)', 5, [884, 0, 0, 0, 0, 100, 9, 0], [['cda', 13.6], ['cdta', 4.5]], '', 'aceite'),
  FD('aceite_coco', 'Aceite de coco', 5, [892, 0, 0, 0, 0, 99, 82.5, 0], [['cda', 13.6]], '', 'aceite'),
  FD('mantequilla', 'Mantequilla', 5, [717, 0.9, 0.1, 0.1, 0, 81, 51, 643], [['cdta', 5], ['cda', 14]], '', ''),
  FD('mayonesa', 'Mayonesa', 5, [680, 1, 0.6, 0.6, 0, 74.9, 11.7, 635], [['cda', 14]], '', 'salsa'),
  FD('aguacate', 'Aguacate', 5, [160, 2, 8.5, 0.7, 6.7, 14.7, 2.1, 7], [['½ aguacate Hass', 70], ['¼ de aguacate grande', 60]], '', 'palta'),
  FD('mani_mant', 'Mantequilla de maní', 5, [588, 25, 20, 9.2, 6, 50, 10.3, 17], [['cda', 16]], '', 'mani cacahuate'),
  FD('almendra_mant', 'Mantequilla de almendras', 5, [614, 21, 18.8, 4.4, 10.3, 55.5, 4.2, 7], [['cda', 16]], '', ''),
  FD('almendras', 'Almendras', 5, [579, 21.2, 21.6, 4.4, 12.5, 49.9, 3.8, 1], [['puñado', 28]], '', 'frutos secos'),
  FD('nueces', 'Nueces', 5, [654, 15.2, 13.7, 2.6, 6.7, 65.2, 6.1, 2], [['puñado', 28]], '', 'frutos secos nuez'),
  FD('maranones', 'Marañones', 5, [553, 18.2, 30.2, 5.9, 3.3, 43.9, 7.8, 12], [['puñado', 28]], '', 'frutos secos anacardos'),
  FD('mani', 'Maní', 5, [567, 25.8, 16.1, 4.7, 8.5, 49.2, 6.3, 18], [['puñado', 28]], '', 'frutos secos cacahuate'),
  FD('chia', 'Semillas de chía', 5, [486, 16.5, 42.1, 0, 34.4, 30.7, 3.3, 16], [['cda', 12]], '', ''),
  FD('linaza', 'Linaza', 5, [534, 18.3, 28.9, 1.6, 27.3, 42.2, 3.7, 30], [['cda', 10]], '', 'semillas'),

  /* 6 · bebidas */
  FD('cafe', 'Café negro (tinto)', 6, [1, 0.1, 0, 0, 0, 0, 0, 2], [['taza', 240], ['pocillo', 150]], 'l', 'tinto'),
  FD('cafe_leche', 'Café con leche, sin azúcar', 6, [35, 1.7, 2.6, 2.6, 0, 1.8, 1, 24], [['pocillo', 200]], 'al', 'perico'),
  FD('aromatica', 'Aromática o té, sin azúcar', 6, [1, 0, 0.2, 0, 0, 0, 0, 1], [['taza', 240]], 'l', 'te infusion'),
  FD('chocolate_beb', 'Chocolate caliente en leche', 6, [95, 3.2, 10, 8.5, 0.4, 4.8, 2.8, 42], [['pocillo', 240]], 'al', ''),
  FD('aguapanela', 'Aguapanela', 6, [38, 0, 9.4, 9, 0, 0, 0, 3], [['vaso', 250]], 'al', 'agua de panela'),
  FD('jugo_naranja', 'Jugo de naranja natural', 6, [45, 0.7, 10.4, 8.4, 0.2, 0.2, 0, 1], [['vaso', 240]], 'l', ''),
  FD('jugo_agua', 'Jugo de fruta en agua, con azúcar', 6, [40, 0.2, 10, 9.5, 0.4, 0.1, 0, 2], [['vaso', 250]], 'al', 'mora lulo maracuya'),
  FD('jugo_leche', 'Jugo de fruta en leche, con azúcar', 6, [75, 2.2, 11.5, 10.5, 0.4, 2.2, 1.3, 30], [['vaso', 250]], 'al', 'batido'),
  FD('gaseosa', 'Gaseosa', 6, [42, 0, 10.6, 10.6, 0, 0, 0, 4], [['lata (355 ml)', 355], ['vaso', 250]], 'l', 'refresco cola soda'),
  FD('hidratante', 'Bebida hidratante', 6, [24, 0, 6.1, 5.8, 0, 0, 0, 46], [['botella (500 ml)', 500]], 'al', 'suero deportiva'),

  /* 7 · dulces y otros */
  FD('miel', 'Miel', 7, [304, 0.3, 82.4, 82.1, 0.2, 0, 0, 4], [['cda', 21], ['cdta', 7]], '', ''),
  FD('azucar', 'Azúcar', 7, [387, 0, 100, 99.8, 0, 0, 0, 1], [['cdta', 4], ['cda', 12]], '', ''),
  FD('panela', 'Panela', 7, [380, 0.4, 94, 90, 0, 0.1, 0, 30], [['trozo', 20]], 'a', ''),
  FD('arequipe', 'Arequipe', 7, [315, 6.8, 55.4, 49.7, 0, 7.4, 4.5, 129], [['cda', 19]], '', 'dulce de leche'),
  FD('mermelada', 'Mermelada', 7, [278, 0.4, 68.9, 48.5, 1.1, 0.1, 0, 32], [['cda', 20]], '', ''),
  FD('bocadillo', 'Bocadillo de guayaba', 7, [300, 0.5, 75, 65, 3, 0, 0, 10], [['unidad', 35]], 'a', 'dulce'),
  FD('compota', 'Compota de fruta', 7, [55, 0.3, 13, 11, 1.5, 0.1, 0, 5], [['frasco', 113]], 'a', ''),
  FD('chocolatina', 'Chocolate con leche (chocolatina)', 7, [535, 7.7, 59.4, 51.5, 3.4, 29.7, 18.5, 79], [['barra pequeña', 40]], '', 'chocolate'),
  FD('helado', 'Helado de crema', 7, [207, 3.5, 23.6, 21.2, 0.7, 11, 6.8, 80], [['bola', 66]], '', ''),
  FD('ponque', 'Torta o ponqué', 7, [370, 5, 52, 30, 1, 16, 5, 300], [['tajada', 60]], 'a', 'pastel bizcocho'),
  FD('cacao', 'Cacao en polvo sin azúcar', 7, [228, 19.6, 57.9, 1.8, 37, 13.7, 8.1, 21], [['cda', 5]], '', 'cocoa'),
  FD('salsa_tomate', 'Salsa de tomate', 7, [101, 1, 27.4, 21.3, 0.3, 0.1, 0, 907], [['cda', 17]], '', 'ketchup'),
  FD('sal', 'Sal', 7, [0, 0, 0, 0, 0, 0, 0, 38758], [['pizca', 0.4], ['¼ cdta', 1.5], ['cdta', 6]], '', ''),

  /* 8 · platos y comidas rápidas */
  FD('sopa', 'Sopa de verduras casera', 8, [35, 1.5, 5, 1.5, 1, 1, 0.2, 250], [['plato', 300]], 'a', 'crema'),
  FD('sancocho', 'Sancocho de pollo', 8, [60, 4.5, 7, 1, 1, 1.8, 0.5, 250], [['plato', 450]], 'a', 'sopa'),
  FD('ajiaco', 'Ajiaco', 8, [75, 5, 9, 1, 1, 2, 0.8, 230], [['plato', 450]], 'a', 'sopa'),
  FD('arroz_pollo', 'Arroz con pollo', 8, [165, 9, 20, 1, 1, 5, 1.3, 350], [['plato', 350]], 'a', ''),
  FD('tamal', 'Tamal', 8, [180, 7, 17, 1, 2, 9, 3, 400], [['unidad', 350]], 'a', 'tamales'),
  FD('pizza', 'Pizza de queso', 8, [266, 11.4, 33.3, 3.6, 2.3, 9.7, 4.5, 598], [['porción', 110]], '', ''),
  FD('hamburguesa', 'Hamburguesa sencilla', 8, [250, 13, 25, 5, 1.5, 11, 4, 500], [['unidad', 200]], 'a', 'hamburguesas'),
  FD('perro', 'Perro caliente', 8, [270, 10, 25, 4, 1, 15, 5.5, 750], [['unidad', 150]], 'a', 'hot dog salchicha')
];
/* comidas frecuentes que ya vienen con la app */
const BUILTIN_RECIPES = [
  { id: 'batido', name: 'Batido Ascend', items: [['leche', 240], ['banano', 118], ['avena', 24], ['mani_mant', 16]] },
  { id: 'batido_manzana', name: 'Batido de manzana y canela', items: [['leche', 240], ['manzana', 180], ['avena', 24], ['almendra_mant', 16]] },
  { id: 'batido_pera', name: 'Batido de pera y nueces', items: [['leche', 240], ['pera', 180], ['avena', 24], ['nueces', 14], ['miel', 7]] },
  { id: 'batido_fresa', name: 'Batido de fresa y chía', items: [['leche', 240], ['fresas', 150], ['avena', 24], ['chia', 12], ['miel', 7]] },
  { id: 'batido_mango', name: 'Batido de mango y maní', items: [['leche', 240], ['mango', 82], ['avena', 24], ['mani_mant', 16]] },
  { id: 'batido_mixto', name: 'Batido de banano y manzana', items: [['leche', 240], ['banano', 59], ['manzana', 90], ['avena', 24], ['mani_mant', 16]] }
];

/* Ejercicios con su MET (Compendio de Actividades Físicas). hi = cuenta como cardio intenso */
const EX_CATS = ['Gimnasio', 'Cardio', 'Deportes', 'Flexibilidad'];
