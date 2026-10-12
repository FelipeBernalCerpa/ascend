'use strict';
/* ---------- alimentos v4 (continúa) ---------- */
FOODS.push(
  /* 11 · comida internacional */
  FD('tacos', 'Tacos de carne', 11, [210, 11, 17, 1.5, 2.5, 11, 4, 400], [['unidad', 100]], 'a', 'mexicana'),
  FD('quesadilla', 'Quesadilla de pollo', 11, [260, 15, 20, 1.5, 1.5, 13.5, 6, 550], [['unidad', 180]], 'a', 'mexicana'),
  FD('nachos_carne', 'Nachos con queso y carne', 11, [300, 9.5, 27, 2, 3, 17.5, 6, 500], [['porción', 250]], 'a', 'mexicana'),
  FD('fajitas', 'Fajitas de pollo', 11, [140, 13, 9, 3, 1.5, 6, 1.3, 400], [['porción', 250]], 'a', 'mexicana'),
  FD('sashimi', 'Sashimi de salmón', 11, [208, 20.4, 0, 0, 0, 13.4, 3.1, 59], [['5 cortes', 75]], '', 'sushi japonesa'),
  FD('ramen_rest', 'Ramen de restaurante', 11, [90, 4.5, 11, 0.8, 0.8, 3, 1, 450], [['plato', 600]], 'a', 'japonesa sopa'),
  FD('pad_thai', 'Pad thai', 11, [180, 8, 23, 6, 1.5, 6.5, 1, 500], [['plato', 350]], 'a', 'tailandesa'),
  FD('lomo_saltado', 'Lomo saltado', 11, [150, 11, 11, 2, 1.2, 7, 2.2, 450], [['plato', 350]], 'a', 'peruana'),
  FD('pollo_naranja', 'Pollo a la naranja', 11, [180, 15, 14, 10, 0.3, 7, 1.8, 400], [['porción', 200]], 'a', 'china'),
  FD('lumpias', 'Lumpias o rollitos primavera', 11, [250, 6, 26, 3, 2, 13.5, 2.5, 500], [['unidad', 60]], 'a', 'china'),
  FD('wantan', 'Wantán frito', 11, [300, 10, 30, 2, 1.2, 15.5, 3, 550], [['unidad', 20]], 'a', 'china wonton'),
  FD('gyozas', 'Gyozas', 11, [190, 8, 22, 1.5, 1, 7.5, 2.5, 450], [['unidad', 25]], 'a', 'japonesa empanaditas'),
  FD('carbonara', 'Pasta carbonara', 11, [190, 8, 21, 1.2, 1, 8.5, 3.8, 380], [['plato', 300]], 'a', 'italiana'),
  FD('alfredo', 'Pasta Alfredo', 11, [180, 6.5, 20, 1.5, 1, 8.5, 4.8, 350], [['plato', 300]], 'a', 'italiana'),
  FD('pasta_pesto', 'Pasta al pesto', 11, [210, 6, 24, 1, 1.5, 10, 2, 250], [['plato', 300]], 'a', 'italiana'),
  FD('ravioles', 'Ravioles en salsa', 11, [170, 7, 22, 3, 1.5, 6, 3, 400], [['plato', 300]], 'a', 'italiana'),
  FD('risotto', 'Risotto', 11, [160, 4.5, 22, 1, 0.5, 6, 3, 350], [['plato', 300]], 'a', 'italiana arroz'),
  FD('mac_queso', 'Macarrones con queso', 11, [164, 6.4, 20, 2.2, 1, 6.7, 2.5, 371], [['taza', 200]], 'a', 'mac and cheese'),
  FD('paella', 'Paella', 11, [158, 9.5, 18, 0.8, 0.8, 5.2, 1.1, 450], [['plato', 350]], 'a', 'espanola arroz'),
  FD('tortilla_esp', 'Tortilla española', 11, [170, 6.5, 13, 1, 1.2, 10.5, 2.1, 350], [['porción', 150]], 'a', 'espanola papa huevo'),
  FD('shawarma', 'Shawarma o kebab de pollo', 11, [220, 15, 18, 2, 1.5, 9.5, 2.5, 500], [['unidad', 300]], 'a', 'arabe'),
  FD('falafel', 'Falafel', 11, [333, 13.3, 31.8, 0, 0, 17.8, 2.4, 294], [['unidad', 17]], '', 'arabe garbanzo'),
  FD('kibbe', 'Kibbe', 11, [260, 13, 18, 1, 3, 15, 4.5, 400], [['unidad', 60]], 'a', 'arabe quibbe'),
  FD('poke', 'Poke bowl de salmón', 11, [150, 9, 17, 3, 1.5, 5, 1, 400], [['bowl', 400]], 'a', 'hawaiana'),
  FD('ensalada_cesar', 'Ensalada César con pollo', 11, [160, 11, 6, 1.5, 1.2, 10.5, 2.5, 380], [['plato', 300]], 'a', 'ensalada'),
  FD('ensalada_griega', 'Ensalada griega', 11, [100, 3.5, 5, 3, 1.5, 7.5, 3, 400], [['plato', 250]], 'a', 'ensalada'),
  FD('huevos_rancheros', 'Huevos rancheros', 11, [150, 7.5, 10, 2, 2, 9, 2.8, 400], [['plato', 250]], 'a', 'mexicana'),
  FD('club_sandwich', 'Club sándwich', 11, [240, 13, 18, 3, 1.5, 13, 3.5, 600], [['unidad', 250]], 'a', 'emparedado'),
  FD('tikka_masala', 'Pollo tikka masala', 11, [140, 12, 6, 3, 1, 7.5, 3, 400], [['porción', 250]], 'a', 'india curry'),
  FD('curry_garbanzo', 'Curry de garbanzos', 11, [130, 5, 15, 3, 4, 5.5, 2.5, 350], [['porción', 250]], 'a', 'india'),
  FD('reina_pepiada', 'Arepa reina pepiada', 11, [240, 10, 25, 1, 2.5, 11, 2.5, 380], [['unidad', 200]], 'a', 'venezolana arepas'),
  FD('empanada_arg', 'Empanada argentina', 11, [280, 10, 27, 2, 1.5, 15, 6, 450], [['unidad', 100]], 'a', 'empanadas'),
  FD('ceviche_pescado', 'Ceviche de pescado', 11, [90, 13, 6, 3, 0.8, 1.5, 0.3, 450], [['porción', 200]], 'a', 'peruana'),

  /* 12 · salsas y condimentos */
  FD('guacamole', 'Guacamole', 12, [160, 2, 8.5, 0.7, 6.5, 14.7, 2.1, 250], [['cda', 15], ['¼ taza', 60]], 'a', 'aguacate'),
  FD('pico_gallo', 'Pico de gallo', 12, [20, 0.8, 4.4, 2.5, 1, 0.2, 0, 230], [['¼ taza', 50]], 'a', 'salsa'),
  FD('tahini', 'Tahini (pasta de ajonjolí)', 12, [595, 17, 21, 0.5, 9.3, 53.8, 7.5, 115], [['cda', 15]], '', 'sesamo'),
  FD('salsa_bbq', 'Salsa BBQ', 12, [172, 0.8, 40.8, 33.2, 0.9, 0.6, 0.1, 1027], [['cda', 17]], '', 'barbacoa'),
  FD('salsa_ajo', 'Salsa de ajo', 12, [400, 1, 6, 3, 0, 42, 6, 600], [['cda', 15]], 'a', ''),
  FD('salsa_tartara', 'Salsa tártara', 12, [211, 1, 13.3, 4, 0.2, 16.7, 2.6, 667], [['cda', 14]], '', ''),
  FD('salsa_pina', 'Salsa de piña', 12, [180, 0.4, 44, 40, 0.5, 0.1, 0, 100], [['cda', 15]], 'a', ''),
  FD('aji', 'Ají casero', 12, [30, 1, 6, 3, 1.5, 0.3, 0, 400], [['cda', 15]], 'a', 'picante'),
  FD('salsa_queso', 'Salsa de queso cheddar', 12, [180, 4.5, 6.5, 1, 0.3, 15, 6.5, 900], [['cda', 16]], 'a', ''),
  FD('pesto', 'Pesto', 12, [480, 5, 6, 1, 1.5, 49, 8, 700], [['cda', 15]], 'a', 'albahaca'),
  FD('salsa_napo', 'Salsa de tomate para pasta', 12, [50, 1.5, 8, 5, 1.8, 1.5, 0.2, 440], [['½ taza', 125]], '', 'napolitana marinara'),
  FD('bechamel', 'Salsa blanca (bechamel)', 12, [130, 4, 9, 4.5, 0.3, 8.5, 4, 300], [['¼ taza', 60]], 'a', ''),
  FD('vinagreta', 'Vinagreta casera de aceite de oliva', 12, [450, 0, 3, 1, 0, 50, 7, 300], [['cda', 15]], 'a', 'aderezo'),
  FD('ranch', 'Aderezo ranch', 12, [430, 1.2, 6, 4.5, 0, 44.5, 6.9, 901], [['cda', 15]], 'a', 'aderezo'),
  FD('aderezo_cesar', 'Aderezo César', 12, [540, 2.2, 3.3, 2.8, 0, 57.8, 8.8, 1100], [['cda', 15]], 'a', 'aderezo'),
  FD('vinagre', 'Vinagre', 12, [18, 0, 0, 0, 0, 0, 0, 2], [['cda', 15]], 'l', ''),
  FD('mayonesa_light', 'Mayonesa light', 12, [238, 0.4, 9.2, 3.4, 0, 22.2, 3.5, 827], [['cda', 15]], '', 'mayonesa'),
  FD('salsa_inglesa', 'Salsa inglesa', 12, [78, 0, 19.5, 10, 0, 0, 0, 980], [['cda', 15]], '', 'worcestershire'),
  FD('salsa_picante', 'Salsa picante', 12, [11, 0.5, 1.8, 1.3, 0.3, 0.4, 0, 2643], [['cdta', 5]], '', 'tabasco'),

  /* 13 · suplementos y deportivos */
  FD('proteina_whey', 'Proteína en polvo (whey)', 13, [380, 75, 9, 4, 0.5, 6, 3, 250], [['scoop', 30]], 'a', 'proteina suplemento batido'),
  FD('proteina_vegetal', 'Proteína vegetal en polvo', 13, [380, 70, 10, 2, 5, 7, 1.5, 900], [['scoop', 30]], 'a', 'proteina suplemento'),
  FD('gainer', 'Ganador de peso (mass gainer)', 13, [380, 15, 75, 12, 1.5, 3.5, 1.5, 200], [['servicio', 150]], 'a', 'suplemento'),
  FD('proteina_liquida', 'Bebida de proteína lista', 13, [60, 10, 3, 1.5, 0.5, 1, 0.5, 60], [['botella', 330]], 'al', 'proteina'),
  FD('gel_energia', 'Gel energético', 13, [260, 0, 65, 30, 0, 0, 0, 200], [['sobre', 32]], 'a', 'gel'),
  FD('suplemento_liquido', 'Suplemento nutricional líquido', 13, [93, 3.8, 13.9, 6.3, 0.4, 2.5, 0.3, 85], [['botella', 237]], 'al', 'ensure pediasure'),
  FD('creatina', 'Creatina', 13, [0, 0, 0, 0, 0, 0, 0, 0], [['cdta', 5]], '', 'suplemento')
);

/* nombres de marcas comunes para encontrar los genéricos al buscar */
const ALIAS_MORE = {
  papas_paq: 'margarita super ricas de todito', snack_queso: 'cheetos chitos boliqueso cheese tris', nachos: 'doritos tostitos tostacos',
  platanitos: 'natuchips', galletas_soda: 'saltin noel crackers', galletas_rellenas: 'festival oreo', galletas_maria: 'maria',
  galletas_chips: 'chips ahoy', ponque_paquete: 'gala ramo', caramelo: 'bon bon bum colombina', chocolatina: 'jet jumbo hersheys',
  gomitas: 'trululu', mani_salado: 'manimoto la especial', barra_cereal: 'tosh', leche_choco: 'chocolatada', jugo_caja: 'hit tutti frutti',
  gaseosa: 'coca cola postobon pepsi colombiana manzana', te_frio: 'mr tea fuze', energetica: 'red bull monster vive 100',
  hidratante: 'gatorade powerade', malta: 'pony', yogur_dulce: 'alpina', avena_inst: 'quaker', cereal_azucar: 'zucaritas',
  cereal: 'corn flakes', leche_milo: 'milo chocolisto', ramen: 'maruchan'
};
for (const id of Object.keys(ALIAS_MORE)) { const f = FOODS.find(x => x.id === id); if (f) f.alias = (f.alias + ' ' + ALIAS_MORE[id]).trim(); }

/* combinaciones listas: se agregan con un toque y muestran cada ingrediente */
const RECIPE_GROUPS = [
  { k: 'des', label: 'Desayunos' }, { k: 'alm', label: 'Almuerzos' }, { k: 'cen', label: 'Cenas y comidas rápidas' },
  { k: 'onc', label: 'Onces y snacks' }, { k: 'dep', label: 'Antes y después de entrenar' }, { k: 'bat', label: 'Batidos' }
];
for (const b of BUILTIN_RECIPES) if (!b.g) b.g = 'bat';
BUILTIN_RECIPES.push(
  { id: 'c_arepa_huevo', g: 'des', name: 'Arepa con huevo, queso y chocolate', items: [['arepa', 70], ['huevo_frito', 46], ['queso_camp', 30], ['chocolate_beb', 240]] },
  { id: 'c_calentado', g: 'des', name: 'Calentado con huevo, arepa y café con leche', items: [['calentado', 250], ['huevo_frito', 46], ['arepa', 70], ['cafe_leche', 200]] },
  { id: 'c_pericos', g: 'des', name: 'Huevos pericos con pan y café con leche', items: [['huevo_rev', 122], ['pan', 50], ['cafe_leche', 200]] },
  { id: 'c_changua', g: 'des', name: 'Changua con almojábana', items: [['changua', 350], ['almojabana', 60]] },
  { id: 'c_tamal', g: 'des', name: 'Tamal con chocolate y pan', items: [['tamal', 350], ['chocolate_beb', 240], ['pan', 25]] },
  { id: 'c_yogur_granola', g: 'des', name: 'Yogur con granola y fruta', items: [['yogur', 200], ['granola', 30], ['fresas', 75], ['banano', 59]] },
  { id: 'c_avena_banano', g: 'des', name: 'Avena cocida con banano y miel', items: [['avena_leche', 240], ['banano', 59], ['miel', 7]] },
  { id: 'c_tostadas_aguacate', g: 'des', name: 'Tostadas con aguacate y huevo', items: [['pan_int', 56], ['aguacate', 50], ['huevo', 100]] },
  { id: 'c_pancakes', g: 'des', name: 'Pancakes con miel y fresas', items: [['pancakes', 150], ['miel', 21], ['fresas', 75]] },
  { id: 'c_cereal', g: 'des', name: 'Cereal con leche y banano', items: [['cereal', 30], ['leche', 240], ['banano', 59]] },
  { id: 'c_pandebono_kumis', g: 'des', name: 'Pandebono con kumis', items: [['pandebono', 50], ['kumis', 200]] },
  { id: 'c_huevos_arepa_tinto', g: 'des', name: 'Huevos revueltos con arepa y queso', items: [['huevo_rev', 122], ['arepa', 70], ['queso_camp', 30]] },
  { id: 'c_pollo_arroz', g: 'alm', name: 'Pechuga con arroz y ensalada', items: [['pechuga', 120], ['arroz_c', 158], ['ensalada', 100], ['aceite_oliva', 5]] },
  { id: 'c_carne_arroz', g: 'alm', name: 'Carne asada con arroz, papa y ensalada', items: [['res', 120], ['arroz_c', 158], ['papa_c', 75], ['ensalada', 100]] },
  { id: 'c_frijoles', g: 'alm', name: 'Fríjoles con arroz, carne molida, maduro y aguacate', items: [['frijol_c', 177], ['arroz_c', 158], ['molida', 60], ['maduro', 90], ['aguacate', 60]] },
  { id: 'c_lentejas', g: 'alm', name: 'Lentejas con arroz y huevo', items: [['lenteja_c', 198], ['arroz_c', 158], ['huevo_frito', 46]] },
  { id: 'c_pescado_coco', g: 'alm', name: 'Pescado frito con patacón y arroz con coco', items: [['mojarra_frita', 150], ['patacon', 80], ['arroz_coco', 160], ['ensalada', 100]] },
  { id: 'c_pasta_pollo', g: 'alm', name: 'Pasta con pollo y verduras', items: [['pasta', 140], ['pechuga', 100], ['verduras_salteadas', 100]] },
  { id: 'c_sancocho', g: 'alm', name: 'Sancocho con arroz y aguacate', items: [['sancocho', 450], ['arroz_c', 79], ['aguacate', 60]] },
  { id: 'c_ajiaco', g: 'alm', name: 'Ajiaco con arroz, aguacate y crema', items: [['ajiaco', 450], ['arroz_c', 79], ['aguacate', 60], ['crema_leche', 15]] },
  { id: 'c_salmon_quinua', g: 'alm', name: 'Salmón con quinua y brócoli', items: [['salmon', 120], ['quinua', 185], ['brocoli', 156]] },
  { id: 'c_chuleta', g: 'alm', name: 'Chuleta valluna con arroz, papa y ensalada', items: [['chuleta', 150], ['arroz_c', 158], ['papa_c', 75], ['ensalada', 100]] },
  { id: 'c_pollo_sudado', g: 'alm', name: 'Pollo sudado con arroz', items: [['sudado_pollo', 300], ['arroz_c', 158]] },
  { id: 'c_bowl_veg', g: 'alm', name: 'Bowl vegetariano de garbanzo, quinua y verduras', items: [['garbanzo', 164], ['quinua', 92], ['verduras_vapor', 150], ['aguacate', 60]] },
  { id: 'c_ensalada_atun', g: 'alm', name: 'Ensalada de atún', items: [['atun', 120], ['lechuga', 40], ['tomate', 60], ['maiz_lata', 40], ['aceite_oliva', 5]] },
  { id: 'c_wrap', g: 'cen', name: 'Wrap de pollo con ensalada', items: [['wrap_pollo', 200], ['ensalada', 100]] },
  { id: 'c_sandwich_jugo', g: 'cen', name: 'Sándwich de jamón y queso con jugo', items: [['sandwich', 150], ['jugo_agua', 250]] },
  { id: 'c_combo_hamb', g: 'cen', name: 'Combo hamburguesa, papas y gaseosa', items: [['hamburguesa', 200], ['papa_fr', 117], ['gaseosa', 355]] },
  { id: 'c_pizza', g: 'cen', name: 'Dos porciones de pizza y gaseosa', items: [['pizza', 220], ['gaseosa', 355]] },
  { id: 'c_broaster', g: 'cen', name: 'Combo de pollo broaster con papas y gaseosa', items: [['pollo_frito', 280], ['papa_fr', 117], ['gaseosa', 355]] },
  { id: 'c_perro', g: 'cen', name: 'Perro caliente con papas de paquete y gaseosa', items: [['perro', 150], ['papas_paq', 30], ['gaseosa', 355]] },
  { id: 'c_salchipapa', g: 'cen', name: 'Salchipapa con gaseosa', items: [['salchipapa', 300], ['gaseosa', 355]] },
  { id: 'c_cafe_pandebono', g: 'onc', name: 'Café con leche y pandebono', items: [['cafe_leche', 200], ['pandebono', 50]] },
  { id: 'c_fruta_yogur', g: 'onc', name: 'Fruta picada con yogur', items: [['ensalada_frutas', 200], ['yogur', 150]] },
  { id: 'c_galletas_leche', g: 'onc', name: 'Galletas con leche', items: [['galletas_maria', 30], ['leche', 240]] },
  { id: 'c_manzana_mani', g: 'onc', name: 'Manzana con mantequilla de maní', items: [['manzana', 180], ['mani_mant', 16]] },
  { id: 'c_queso_bocadillo', g: 'onc', name: 'Queso con bocadillo', items: [['queso_camp', 30], ['bocadillo', 35]] },
  { id: 'c_hummus', g: 'onc', name: 'Hummus con zanahoria y galletas de arroz', items: [['hummus', 60], ['zanahoria', 61], ['galletas_arroz', 18]] },
  { id: 'c_arepa_queso_snack', g: 'onc', name: 'Arepa de maíz con queso', items: [['arepa', 70], ['queso_camp', 30]] },
  { id: 'c_pre', g: 'dep', name: 'Antes de entrenar: banano con avena y miel', items: [['banano', 118], ['avena', 24], ['miel', 7]] },
  { id: 'c_post', g: 'dep', name: 'Después de entrenar: batido de proteína con banano', items: [['proteina_whey', 30], ['leche', 240], ['banano', 118]] },
  { id: 'c_post_natural', g: 'dep', name: 'Después de entrenar: yogur griego con fruta y granola', items: [['griego', 150], ['fresas', 75], ['granola', 30]] }
);

/* ---------- v4b: más pastas, verduras y preparaciones ----------
   Mismo formato que v4_foods: FD(id, nombre, categoría, [kcal, prot, carb, azúcar, fibra, grasa, sat, sodio mg] por 100 g,
   [[porción, gramos], ...], bandera ('a' aprox, 'l' líquido, 'al' aprox líquido), palabras de búsqueda). */
FOODS.push(
  /* 1 · pastas (cocidas) — más formas y opciones sin gluten */
  FD('penne', 'Penne cocido', 1, [157, 5.8, 30.7, 0.6, 1.8, 0.9, 0.2, 1], [['taza', 140]], '', 'pasta plumas'),
  FD('macarrones', 'Macarrones o coditos cocidos', 1, [158, 5.8, 30.9, 0.6, 1.8, 0.9, 0.2, 1], [['taza', 140]], '', 'pasta codito'),
  FD('fusilli', 'Fusilli o espirales cocidos', 1, [158, 5.8, 30.9, 0.6, 1.8, 0.9, 0.2, 1], [['taza', 140]], '', 'pasta tornillo rotini'),
  FD('tallarines', 'Tallarines o fettuccine cocidos', 1, [158, 5.8, 30.9, 0.6, 1.8, 0.9, 0.2, 1], [['taza', 140]], '', 'pasta cinta linguine'),
  FD('lasana_hojas', 'Láminas de lasaña cocidas', 1, [158, 5.8, 30.9, 0.6, 1.8, 0.9, 0.2, 1], [['lámina', 50]], '', 'pasta lasagna'),
  FD('orzo', 'Orzo o pasta de arroz cocida', 1, [158, 5.8, 30.9, 0.6, 1.8, 0.9, 0.2, 1], [['taza', 140]], '', 'pasta risoni'),
  FD('noquis', 'Ñoquis de papa cocidos', 1, [131, 3.1, 27, 0.6, 1.5, 1.2, 0.3, 300], [['porción', 150]], 'a', 'gnocchi pasta'),
  FD('fideos_huevo', 'Fideos de huevo cocidos', 1, [138, 4.5, 25.2, 0.4, 1.2, 2.1, 0.5, 5], [['taza', 160]], '', 'pasta noodles'),
  FD('fideos_ramen', 'Fideos de ramen instantáneo (cocidos)', 1, [95, 2.6, 13.3, 0.3, 0.6, 3.5, 1.7, 450], [['paquete', 230]], 'a', 'maruchan pasta sopa'),
  FD('udon', 'Fideos udon cocidos', 1, [125, 3, 25, 0, 1, 0.3, 0, 120], [['porción', 180]], 'a', 'pasta noodles japones'),
  FD('soba', 'Fideos soba (trigo sarraceno), cocidos', 1, [99, 5, 21, 0, 0, 0.1, 0, 60], [['porción', 180]], '', 'pasta noodles japones'),
  FD('polenta', 'Polenta cocida', 1, [70, 1.6, 15, 0.1, 0.9, 0.3, 0, 250], [['porción', 150]], 'a', 'maiz sin gluten'),
  FD('pasta_lenteja', 'Pasta de lenteja cocida (sin gluten)', 1, [150, 11, 25, 1, 4, 1, 0.1, 5], [['taza', 140]], 'a', 'legumbre proteina gluten free'),
  FD('pasta_garbanzo', 'Pasta de garbanzo cocida (sin gluten)', 1, [150, 9, 24, 1.5, 4.5, 2, 0.2, 10], [['taza', 140]], 'a', 'legumbre proteina gluten free'),
  FD('pasta_maiz', 'Pasta de maíz y arroz cocida (sin gluten)', 1, [155, 3, 33, 0.5, 1.5, 1, 0.2, 2], [['taza', 140]], 'a', 'gluten free espaguetis'),

  /* 3 · verduras */
  FD('habas', 'Habas verdes cocidas', 3, [110, 7.6, 19.6, 1.8, 5.4, 0.4, 0.1, 25], [['½ taza', 85]], '', 'legumbre'),
  FD('puerro', 'Puerro cocido', 3, [31, 0.8, 7.6, 2, 1, 0.2, 0, 10], [['porción', 90]], '', 'poro'),
  FD('cebolla_larga', 'Cebolla larga o cebollín', 3, [32, 1.8, 7.3, 2.3, 2.6, 0.7, 0.1, 16], [['tallo', 15]], '', 'cebollin cebolleta'),
  FD('cilantro', 'Cilantro fresco', 3, [23, 2.1, 3.7, 0.9, 2.8, 0.5, 0, 46], [['puñado', 15]], '', 'culantro hierba'),
  FD('perejil', 'Perejil fresco', 3, [36, 3, 6.3, 0.9, 3.3, 0.8, 0.1, 56], [['puñado', 15]], '', 'hierba'),
  FD('albahaca', 'Albahaca fresca', 3, [23, 3.2, 2.7, 0.3, 1.6, 0.6, 0, 4], [['puñado', 10]], '', 'hierba basil'),
  FD('jengibre', 'Jengibre fresco', 3, [80, 1.8, 18, 1.7, 2, 0.8, 0.2, 13], [['cda rallado', 6]], '', 'raiz'),
  FD('bokchoy', 'Bok choy o pak choi cocido', 3, [12, 1.6, 1.8, 0.8, 1, 0.2, 0, 34], [['taza', 170]], '', 'col china'),
  FD('berros', 'Berros', 3, [11, 2.3, 1.3, 0.2, 0.5, 0.1, 0, 41], [['taza', 34]], '', 'ensalada'),
  FD('brotes_soya', 'Brotes de soya o frijol', 3, [30, 3, 5.9, 4.1, 1.8, 0.2, 0, 6], [['taza', 104]], '', 'germinados'),
  FD('pimenton_asado', 'Pimentón asado', 3, [26, 1, 6, 4, 2, 0.3, 0, 200], [['porción', 80]], 'a', 'pimiento morron'),
  FD('tomate_cherry', 'Tomate cherry', 3, [18, 0.9, 3.9, 2.6, 1.2, 0.2, 0, 5], [['10 unidades', 100]], '', 'cereza'),
  FD('nabo', 'Nabo cocido', 3, [22, 0.7, 5.1, 3, 2, 0.1, 0, 16], [['porción', 100]], '', ''),
  FD('hinojo', 'Hinojo', 3, [31, 1.2, 7.3, 3.9, 3.1, 0.2, 0, 52], [['taza', 87]], '', 'fennel'),
  FD('okra', 'Okra o quimbombó cocida', 3, [22, 1.9, 4.5, 2.4, 3.2, 0.2, 0, 7], [['½ taza', 80]], '', 'molondron'),
  FD('chayote', 'Chayote o guatila cocido', 3, [24, 0.6, 5.1, 1.7, 1.7, 0.4, 0, 2], [['taza', 160]], '', 'cidrayota'),
  FD('verdolaga', 'Verdolaga', 3, [16, 1.3, 3.4, 0, 0.9, 0.1, 0, 45], [['taza', 43]], '', 'hoja verde'),
  FD('col_morada', 'Col morada o lombarda', 3, [31, 1.4, 7.4, 3.8, 2.1, 0.2, 0, 27], [['taza', 89]], '', 'repollo morado'),
  FD('endivia', 'Endivia', 3, [17, 1.3, 3.4, 0.3, 3.1, 0.2, 0, 22], [['taza', 50]], '', 'escarola'),

  /* 3 · verduras: preparaciones */
  FD('pure_papa', 'Puré de papa con leche y mantequilla', 3, [88, 2, 15, 1.5, 1.3, 2.5, 1.3, 300], [['porción', 150]], 'a', 'papa'),
  FD('sopa_verduras', 'Sopa de verduras', 3, [40, 1.8, 7, 3, 1.5, 0.8, 0.2, 300], [['taza', 240]], 'a', 'minestrone caldo'),
  FD('crema_espinaca', 'Crema de espinaca', 3, [60, 2.5, 5, 2, 1.2, 3.5, 1.8, 300], [['taza', 240]], 'a', 'sopa'),
  FD('verduras_asadas', 'Verduras asadas al horno', 3, [80, 2, 9, 4, 2.8, 4, 0.6, 150], [['porción', 150]], 'a', 'horneadas'),
  FD('pisto', 'Pisto o ratatouille', 3, [60, 1.4, 7, 4, 2, 3, 0.4, 200], [['porción', 200]], 'a', 'verduras guisadas'),
  FD('espinaca_ajo', 'Espinaca salteada con ajo', 3, [90, 3, 4, 0.8, 2, 7, 1, 250], [['porción', 120]], 'a', 'saltada'),
  FD('brocoli_gratin', 'Brócoli gratinado con queso', 3, [120, 6, 6, 2, 2, 8, 4, 300], [['porción', 150]], 'a', ''),
  FD('zucchini_plancha', 'Calabacín o zucchini a la plancha', 3, [40, 1.4, 4, 2.5, 1.2, 2, 0.4, 150], [['porción', 120]], 'a', 'calabacin'),
  FD('champinones_salt', 'Champiñones salteados', 3, [70, 3, 4, 1.5, 1.5, 5, 0.8, 200], [['porción', 120]], 'a', 'hongos'),
  FD('ensalada_mixta', 'Ensalada mixta con aguacate', 3, [110, 2, 7, 3, 3.5, 8.5, 1.3, 200], [['plato', 180]], 'a', 'verde')
);
FOODS.push(
  /* 8 · platos: pastas preparadas */
  FD('lasana_carne', 'Lasaña de carne', 8, [155, 9, 14, 3, 1.5, 7.5, 3.5, 380], [['porción', 300]], 'a', 'pasta lasagna italiana'),
  FD('lasana_pollo', 'Lasaña de pollo', 8, [145, 10, 14, 3, 1.4, 6, 2.8, 360], [['porción', 300]], 'a', 'pasta lasagna'),
  FD('lasana_verd', 'Lasaña de verduras', 8, [120, 5, 13, 3, 2, 5.5, 2.8, 350], [['porción', 300]], 'a', 'pasta vegetariana'),
  FD('canelones', 'Canelones de carne', 8, [160, 9, 14, 3, 1.5, 8, 4, 400], [['porción', 250]], 'a', 'pasta rellena'),
  FD('espagueti_albondigas', 'Espagueti con albóndigas', 8, [160, 8, 19, 3, 1.8, 6, 2, 350], [['plato', 350]], 'a', 'pasta italiana'),
  FD('pasta_atun', 'Pasta con atún', 8, [160, 9, 20, 2, 1.5, 5, 1, 350], [['plato', 300]], 'a', 'espagueti'),
  FD('pasta_primavera', 'Pasta primavera con verduras', 8, [140, 5, 22, 3, 2.5, 4, 1, 250], [['plato', 300]], 'a', 'vegetariana'),
  FD('penne_arrabiata', 'Penne arrabiata', 8, [150, 5, 24, 4, 2, 4, 0.6, 350], [['plato', 300]], 'a', 'pasta picante'),
  FD('noquis_salsa', 'Ñoquis en salsa de tomate', 8, [140, 4, 24, 3, 1.5, 3.5, 1.2, 380], [['plato', 300]], 'a', 'gnocchi pasta'),
  FD('aglio_olio', 'Pasta al ajo y aceite de oliva', 8, [200, 6, 26, 1, 1.5, 8.5, 1.3, 200], [['plato', 280]], 'a', 'aglio olio espagueti'),
  FD('pasta_bolonesa', 'Pasta a la boloñesa', 8, [155, 8, 19, 3, 1.6, 5.5, 2, 320], [['plato', 350]], 'a', 'espagueti italiana'),

  /* 11 · comida internacional: fideos salteados */
  FD('tallarin_salt', 'Tallarín saltado o lo mein', 11, [160, 7, 20, 3, 1.5, 6, 1.2, 500], [['plato', 350]], 'a', 'chifa china noodles'),
  FD('yakisoba', 'Yakisoba', 11, [150, 6, 22, 4, 1.8, 5, 1, 550], [['plato', 350]], 'a', 'japonesa noodles'),
  FD('chow_mein', 'Chow mein', 11, [160, 6.5, 21, 3, 1.6, 6, 1.1, 520], [['plato', 350]], 'a', 'china noodles'),

  /* 12 · salsas para pasta */
  FD('salsa_bolonesa', 'Salsa boloñesa', 12, [120, 8, 6, 3.5, 1.3, 7, 2.5, 400], [['½ taza', 125]], 'a', 'carne pasta'),
  FD('salsa_arrabiata', 'Salsa arrabiata (tomate picante)', 12, [55, 1.5, 8, 5, 1.8, 2, 0.3, 450], [['½ taza', 125]], 'a', 'pasta'),
  FD('salsa_champinones', 'Salsa de champiñones', 12, [90, 2.5, 6, 2, 0.8, 6.5, 3, 350], [['¼ taza', 60]], 'a', 'hongos pasta'),
  FD('salsa_alfredo', 'Salsa Alfredo', 12, [200, 4, 5, 2, 0.2, 18, 11, 600], [['¼ taza', 60]], 'a', 'crema pasta')
);
