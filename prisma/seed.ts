import { PrismaClient, CategoriaIngrediente, OrigenIngrediente, NivelAlergeno } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';

if (!process.env.USDA_API_KEY) {
  console.warn('⚠️ La variable de entorno USDA_API_KEY no está definida. Se utilizará "DEMO_KEY" por defecto (sujeto a límites de cuota de USDA FDC).');
}

interface IngredientSeedDefinition {
  nombre: string;
  usdaQuery: string;
  categoria: CategoriaIngrediente;
  origen: OrigenIngrediente;
  esProcesado: boolean;
  precioPorGramo: number;
  stockInicialGramos: number;
  alergenos?: { alergenoNombre: string; nivel: NivelAlergeno }[];
  defaultNutrients: {
    calorias: number;
    proteinas: number;
    grasas: number;
    carbohidratos: number;
    fibra: number;
    azucares: number;
    sodio: number;
  };
}

const SEED_INGREDIENTS: IngredientSeedDefinition[] = [
  // Frutos Secos
  {
    nombre: 'Almendra Nonpareil Tostada',
    usdaQuery: 'nuts almonds roasted',
    categoria: CategoriaIngrediente.FRUTO_SECO,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.045,
    stockInicialGramos: 1000,
    alergenos: [{ alergenoNombre: 'frutos_secos', nivel: NivelAlergeno.CONTIENE }],
    defaultNutrients: { calorias: 579, proteinas: 21.2, grasas: 49.9, carbohidratos: 21.6, fibra: 12.5, azucares: 4.4, sodio: 1 },
  },
  {
    nombre: 'Nuez de Castilla Mariposa',
    usdaQuery: 'nuts walnuts English',
    categoria: CategoriaIngrediente.FRUTO_SECO,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.048,
    stockInicialGramos: 1000,
    alergenos: [{ alergenoNombre: 'frutos_secos', nivel: NivelAlergeno.CONTIENE }],
    defaultNutrients: { calorias: 654, proteinas: 15.2, grasas: 65.2, carbohidratos: 13.7, fibra: 6.7, azucares: 2.6, sodio: 2 },
  },
  {
    nombre: 'Maní Tostado sin Sal',
    usdaQuery: 'peanuts roasted without salt',
    categoria: CategoriaIngrediente.FRUTO_SECO,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.030,
    stockInicialGramos: 1000,
    alergenos: [{ alergenoNombre: 'mani', nivel: NivelAlergeno.CONTIENE }],
    defaultNutrients: { calorias: 585, proteinas: 23.7, grasas: 49.7, carbohidratos: 21.5, fibra: 8.0, azucares: 4.2, sodio: 6 },
  },
  {
    nombre: 'Anacardo Tostado (Cajú)',
    usdaQuery: 'nuts cashew nuts dry roasted',
    categoria: CategoriaIngrediente.FRUTO_SECO,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.050,
    stockInicialGramos: 1000,
    alergenos: [{ alergenoNombre: 'frutos_secos', nivel: NivelAlergeno.CONTIENE }],
    defaultNutrients: { calorias: 574, proteinas: 15.3, grasas: 46.4, carbohidratos: 32.7, fibra: 3.0, azucares: 5.0, sodio: 16 },
  },
  {
    nombre: 'Pistacho Tostado sin Cáscara',
    usdaQuery: 'nuts pistachios dry roasted',
    categoria: CategoriaIngrediente.FRUTO_SECO,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.052,
    stockInicialGramos: 1000,
    alergenos: [{ alergenoNombre: 'frutos_secos', nivel: NivelAlergeno.CONTIENE }],
    defaultNutrients: { calorias: 567, proteinas: 20.9, grasas: 45.8, carbohidratos: 27.2, fibra: 10.3, azucares: 7.7, sodio: 6 },
  },
  {
    nombre: 'Avellana Europea Tostada',
    usdaQuery: 'hazelnuts or filberts dry roasted',
    categoria: CategoriaIngrediente.FRUTO_SECO,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.049,
    stockInicialGramos: 1000,
    alergenos: [{ alergenoNombre: 'frutos_secos', nivel: NivelAlergeno.CONTIENE }],
    defaultNutrients: { calorias: 646, proteinas: 15.0, grasas: 62.4, carbohidratos: 17.6, fibra: 9.4, azucares: 4.9, sodio: 0 },
  },
  {
    nombre: 'Nuez de Macadamia Cruda',
    usdaQuery: 'nuts macadamia nuts raw',
    categoria: CategoriaIngrediente.FRUTO_SECO,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.058,
    stockInicialGramos: 1000,
    alergenos: [{ alergenoNombre: 'frutos_secos', nivel: NivelAlergeno.CONTIENE }],
    defaultNutrients: { calorias: 718, proteinas: 7.9, grasas: 75.8, carbohidratos: 13.8, fibra: 8.6, azucares: 4.6, sodio: 5 },
  },
  {
    nombre: 'Nuez de Brasil Entera',
    usdaQuery: 'nuts brazilnuts unpeeled raw',
    categoria: CategoriaIngrediente.FRUTO_SECO,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.055,
    stockInicialGramos: 1000,
    alergenos: [{ alergenoNombre: 'frutos_secos', nivel: NivelAlergeno.CONTIENE }],
    defaultNutrients: { calorias: 659, proteinas: 14.3, grasas: 67.1, carbohidratos: 11.7, fibra: 7.5, azucares: 2.3, sodio: 3 },
  },

  // Semillas
  {
    nombre: 'Semilla de Chía Negra',
    usdaQuery: 'seeds chia seeds dried',
    categoria: CategoriaIngrediente.SEMILLA,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.035,
    stockInicialGramos: 1000,
    defaultNutrients: { calorias: 486, proteinas: 16.5, grasas: 30.7, carbohidratos: 42.1, fibra: 34.4, azucares: 0, sodio: 16 },
  },
  {
    nombre: 'Semilla de Calabaza Pepita Verde',
    usdaQuery: 'pumpkin and squash seed kernels dried',
    categoria: CategoriaIngrediente.SEMILLA,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.038,
    stockInicialGramos: 1000,
    defaultNutrients: { calorias: 559, proteinas: 30.2, grasas: 49.1, carbohidratos: 10.7, fibra: 6.0, azucares: 1.4, sodio: 7 },
  },
  {
    nombre: 'Semilla de Girasol Pelada',
    usdaQuery: 'sunflower seed kernels dried',
    categoria: CategoriaIngrediente.SEMILLA,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.032,
    stockInicialGramos: 1000,
    defaultNutrients: { calorias: 584, proteinas: 20.8, grasas: 51.5, carbohidratos: 20.0, fibra: 8.6, azucares: 2.6, sodio: 9 },
  },
  {
    nombre: 'Semilla de Linaza Dorada',
    usdaQuery: 'flaxseed whole',
    categoria: CategoriaIngrediente.SEMILLA,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.030,
    stockInicialGramos: 1000,
    defaultNutrients: { calorias: 534, proteinas: 18.3, grasas: 42.2, carbohidratos: 28.9, fibra: 27.3, azucares: 1.5, sodio: 30 },
  },
  {
    nombre: 'Semilla de Sésamo Tostado',
    usdaQuery: 'sesame seeds whole toasted',
    categoria: CategoriaIngrediente.SEMILLA,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.036,
    stockInicialGramos: 1000,
    alergenos: [{ alergenoNombre: 'sesamo', nivel: NivelAlergeno.CONTIENE }],
    defaultNutrients: { calorias: 565, proteinas: 17.0, grasas: 48.0, carbohidratos: 25.7, fibra: 14.0, azucares: 0.3, sodio: 11 },
  },
  {
    nombre: 'Semilla de Cáñamo (Hemp Seeds)',
    usdaQuery: 'seeds hemp seed hulled',
    categoria: CategoriaIngrediente.SEMILLA,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.042,
    stockInicialGramos: 1000,
    defaultNutrients: { calorias: 553, proteinas: 31.6, grasas: 48.8, carbohidratos: 8.7, fibra: 4.0, azucares: 1.5, sodio: 5 },
  },

  // Frutas Deshidratadas
  {
    nombre: 'Arándano Rojo Silvestre Deshidratado',
    usdaQuery: 'cranberries dried sweetened',
    categoria: CategoriaIngrediente.FRUTA_DESHIDRATADA,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.034,
    stockInicialGramos: 1000,
    defaultNutrients: { calorias: 308, proteinas: 0.2, grasas: 1.4, carbohidratos: 82.4, fibra: 5.7, azucares: 65.0, sodio: 3 },
  },
  {
    nombre: 'Pasas de Uva Morenas',
    usdaQuery: 'raisins seedless',
    categoria: CategoriaIngrediente.FRUTA_DESHIDRATADA,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.028,
    stockInicialGramos: 1000,
    defaultNutrients: { calorias: 299, proteinas: 3.1, grasas: 0.5, carbohidratos: 79.2, fibra: 3.7, azucares: 59.2, sodio: 11 },
  },
  {
    nombre: 'Damasco Deshidratado (Albaricoque)',
    usdaQuery: 'apricots dried uncooked',
    categoria: CategoriaIngrediente.FRUTA_DESHIDRATADA,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.036,
    stockInicialGramos: 1000,
    defaultNutrients: { calorias: 241, proteinas: 3.4, grasas: 0.5, carbohidratos: 62.6, fibra: 7.3, azucares: 53.4, sodio: 10 },
  },
  {
    nombre: 'Higo Deshidratado',
    usdaQuery: 'figs dried uncooked',
    categoria: CategoriaIngrediente.FRUTA_DESHIDRATADA,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.038,
    stockInicialGramos: 1000,
    defaultNutrients: { calorias: 249, proteinas: 3.3, grasas: 0.9, carbohidratos: 63.9, fibra: 9.8, azucares: 47.9, sodio: 10 },
  },
  {
    nombre: 'Coco Rallado Deshidratado sin Azúcar',
    usdaQuery: 'nuts coconut meat dried desicated unsweetened',
    categoria: CategoriaIngrediente.FRUTA_DESHIDRATADA,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.032,
    stockInicialGramos: 1000,
    defaultNutrients: { calorias: 660, proteinas: 6.9, grasas: 64.5, carbohidratos: 23.7, fibra: 16.3, azucares: 7.4, sodio: 37 },
  },
  {
    nombre: 'Mango Deshidratado Natural',
    usdaQuery: 'mango dried',
    categoria: CategoriaIngrediente.FRUTA_DESHIDRATADA,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.039,
    stockInicialGramos: 1000,
    defaultNutrients: { calorias: 319, proteinas: 2.5, grasas: 1.2, carbohidratos: 78.6, fibra: 2.4, azucares: 66.0, sodio: 162 },
  },
  {
    nombre: 'Dátil Medjool Sin Carozo',
    usdaQuery: 'dates medjool',
    categoria: CategoriaIngrediente.FRUTA_DESHIDRATADA,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.037,
    stockInicialGramos: 1000,
    defaultNutrients: { calorias: 277, proteinas: 1.8, grasas: 0.2, carbohidratos: 75.0, fibra: 6.7, azucares: 66.5, sodio: 1 },
  },

  // Cereales
  {
    nombre: 'Avena en Copos Integrales',
    usdaQuery: 'oats rolled old fashioned',
    categoria: CategoriaIngrediente.CEREAL,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.022,
    stockInicialGramos: 1000,
    alergenos: [{ alergenoNombre: 'gluten', nivel: NivelAlergeno.TRAZAS }],
    defaultNutrients: { calorias: 389, proteinas: 16.9, grasas: 6.9, carbohidratos: 66.3, fibra: 10.6, azucares: 0, sodio: 2 },
  },
  {
    nombre: 'Quinua Inflada Pop Organica',
    usdaQuery: 'quinoa cooked',
    categoria: CategoriaIngrediente.CEREAL,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: true,
    precioPorGramo: 0.035,
    stockInicialGramos: 1000,
    defaultNutrients: { calorias: 368, proteinas: 14.1, grasas: 6.1, carbohidratos: 64.2, fibra: 7.0, azucares: 0, sodio: 5 },
  },
  {
    nombre: 'Granola Crujiente con Miel',
    usdaQuery: 'granola homemade',
    categoria: CategoriaIngrediente.CEREAL,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: true,
    precioPorGramo: 0.030,
    stockInicialGramos: 1000,
    alergenos: [{ alergenoNombre: 'gluten', nivel: NivelAlergeno.CONTIENE }],
    defaultNutrients: { calorias: 471, proteinas: 10.0, grasas: 20.0, carbohidratos: 64.0, fibra: 7.0, azucares: 24.0, sodio: 30 },
  },

  // Proteínas en Polvo
  {
    nombre: 'Proteína Aislada de Suero (Whey Protein 80%)',
    usdaQuery: 'whey protein powder isolate',
    categoria: CategoriaIngrediente.PROTEINA_POLVO,
    origen: OrigenIngrediente.ANIMAL,
    esProcesado: true,
    precioPorGramo: 0.075,
    stockInicialGramos: 1000,
    alergenos: [{ alergenoNombre: 'lacteos', nivel: NivelAlergeno.CONTIENE }],
    defaultNutrients: { calorias: 370, proteinas: 80.0, grasas: 3.0, carbohidratos: 4.0, fibra: 0, azucares: 2.0, sodio: 160 },
  },
  {
    nombre: 'Proteína Orgánica de Guisante (Pea Protein)',
    usdaQuery: 'pea protein powder',
    categoria: CategoriaIngrediente.PROTEINA_POLVO,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: true,
    precioPorGramo: 0.065,
    stockInicialGramos: 1000,
    defaultNutrients: { calorias: 380, proteinas: 78.0, grasas: 5.5, carbohidratos: 3.5, fibra: 2.0, azucares: 0, sodio: 800 },
  },

  // Edulcorantes / Extras
  {
    nombre: 'Miel de Abeja Pura Multifloral',
    usdaQuery: 'honey pure',
    categoria: CategoriaIngrediente.EDULCORANTE,
    origen: OrigenIngrediente.ANIMAL,
    esProcesado: false,
    precioPorGramo: 0.035,
    stockInicialGramos: 1000,
    defaultNutrients: { calorias: 304, proteinas: 0.3, grasas: 0.0, carbohidratos: 82.4, fibra: 0.2, azucares: 82.1, sodio: 4 },
  },
  {
    nombre: 'Chips de Chocolate Oscuro 70% Cacao',
    usdaQuery: 'candies dark chocolate 70-85% cacao',
    categoria: CategoriaIngrediente.OTRO,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: true,
    precioPorGramo: 0.045,
    stockInicialGramos: 1000,
    alergenos: [{ alergenoNombre: 'lacteos', nivel: NivelAlergeno.TRAZAS }],
    defaultNutrients: { calorias: 598, proteinas: 7.8, grasas: 42.6, carbohidratos: 45.9, fibra: 10.9, azucares: 24.0, sodio: 20 },
  },
  {
    nombre: 'Nibs de Cacao Orgánico Tostado',
    usdaQuery: 'cocoa nibs',
    categoria: CategoriaIngrediente.OTRO,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: true,
    precioPorGramo: 0.048,
    stockInicialGramos: 1000,
    defaultNutrients: { calorias: 600, proteinas: 13.0, grasas: 50.0, carbohidratos: 25.0, fibra: 20.0, azucares: 0, sodio: 10 },
  },
  {
    nombre: 'Canela Molida de Ceilán',
    usdaQuery: 'spices cinnamon ground',
    categoria: CategoriaIngrediente.ESPECIA,
    origen: OrigenIngrediente.VEGETAL,
    esProcesado: false,
    precioPorGramo: 0.030,
    stockInicialGramos: 1000,
    defaultNutrients: { calorias: 247, proteinas: 4.0, grasas: 1.2, carbohidratos: 80.6, fibra: 53.1, azucares: 2.2, sodio: 10 },
  },
];

const ALERGENOS_DEFINICION = [
  'gluten',
  'lacteos',
  'frutos_secos',
  'mani',
  'soja',
  'huevo',
  'mariscos',
  'sesamo',
];

// Helper to fetch nutrients from USDA FoodData Central API using query param ?api_key=...
async function fetchNutrientsFromUSDA(query: string, defaultNutrientValues: any) {
  // CONFIRMACIÓN EXPLICITA: Se agrega como parametro de consulta URL ?query=...&api_key=... (NO como header)
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=${USDA_API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`⚠️ USDA API respondió HTTP ${res.status} para "${query}". Usando valores nutricionales por defecto.`);
      return { fdcId: null, nutrients: defaultNutrientValues };
    }

    const data = await res.json();
    if (!data.foods || data.foods.length === 0) {
      console.warn(`⚠️ USDA API no encontró resultados para "${query}". Usando valores por defecto.`);
      return { fdcId: null, nutrients: defaultNutrientValues };
    }

    // Priorizar Foundation o SR Legacy si está disponible
    const foodItem = data.foods.find((f: any) => f.dataType === 'Foundation' || f.dataType === 'SR Legacy') || data.foods[0];

    const getNutrient = (namePatterns: string[], fallback: number): number => {
      const match = foodItem.foodNutrients?.find((n: any) =>
        namePatterns.some((p) => n.nutrientName?.toLowerCase().includes(p.toLowerCase()))
      );
      return match && typeof match.value === 'number' ? Math.round(match.value * 10) / 10 : fallback;
    };

    const calorias = getNutrient(['Energy', 'kcal'], defaultNutrientValues.calorias);
    const proteinas = getNutrient(['Protein'], defaultNutrientValues.proteinas);
    const grasas = getNutrient(['Total lipid (fat)', 'Fat'], defaultNutrientValues.grasas);
    const carbohidratos = getNutrient(['Carbohydrate, by difference', 'Carbohydrate'], defaultNutrientValues.carbohidratos);
    const fibra = getNutrient(['Fiber, total dietary'], defaultNutrientValues.fibra);
    const azucares = getNutrient(['Sugars, total'], defaultNutrientValues.azucares);
    const sodio = getNutrient(['Sodium, Na'], defaultNutrientValues.sodio);

    return {
      fdcId: foodItem.fdcId || null,
      nutrients: { calorias, proteinas, grasas, carbohidratos, fibra, azucares, sodio },
    };
  } catch (err: any) {
    console.warn(`⚠️ Excepción de red consultando USDA API para "${query}": ${err.message}. Usando valores por defecto.`);
    return { fdcId: null, nutrients: defaultNutrientValues };
  }
}

async function main() {
  console.log('🌱 Iniciando Siembra de Usuarios Predeterminados y Catálogo Real desde USDA FDC...');

  // 1. Usuarios Predeterminados
  const usersToSeed = [
    {
      email: 'admin@kairosmix.com',
      password: process.env.SEED_ADMIN_PASSWORD,
      nombre: 'Valeria Ramos (Administradora)',
      rol: 'ADMIN' as const,
    },
    {
      email: 'vendedor@kairosmix.com',
      password: process.env.SEED_VENDOR_PASSWORD,
      nombre: 'Carlos Mendoza (Vendedor & Stock)',
      rol: 'VENDEDOR' as const,
    },
    {
      email: 'cliente@kairosmix.com',
      password: process.env.SEED_CLIENT_PASSWORD,
      nombre: 'Sofía Benítez (Cliente)',
      rol: 'CLIENTE' as const,
    },
  ];

  for (const u of usersToSeed) {
    const existing = await prisma.usuario.findUnique({ where: { email: u.email } });
    if (!existing && !u.password) {
      console.warn(`No se creó el usuario ${u.rol}: falta su contraseña SEED_*_PASSWORD.`);
      continue;
    }
    if (!existing && u.password) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      await prisma.usuario.create({
        data: { email: u.email, passwordHash, nombre: u.nombre, rol: u.rol, activo: true },
      });
      console.log(`✅ Usuario ${u.rol} sembrado: ${u.email}`);
    } else {
      console.log(`ℹ️ Usuario ${u.rol} (${u.email}) ya existe.`);
    }
  }

  // 2. Catálogo de Alérgenos
  const mapAlergenos = new Map<string, number>();
  for (const nombreAlergeno of ALERGENOS_DEFINICION) {
    const alergenoRecord = await prisma.alergeno.upsert({
      where: { nombre: nombreAlergeno },
      update: {},
      create: { nombre: nombreAlergeno },
    });
    mapAlergenos.set(nombreAlergeno, alergenoRecord.id);
  }
  console.log(`✅ Catálogo de ${mapAlergenos.size} Alérgenos verificado.`);

  // 3. Catálogo de Ingredientes con Datos USDA FDC
  let exitosos = 0;
  let fallidosSinMatch = 0;

  for (const def of SEED_INGREDIENTS) {
    const existe = await prisma.ingrediente.findUnique({
      where: { nombre: def.nombre },
    });

    if (existe) {
      console.log(`ℹ️ Ingrediente "${def.nombre}" ya existe en la BD (Saltando creación).`);
      exitosos++;
      continue;
    }

    // Consulta real a la API de USDA FDC
    const { fdcId, nutrients } = await fetchNutrientsFromUSDA(def.usdaQuery, def.defaultNutrients);
    if (!fdcId) {
      fallidosSinMatch++;
    }

    // Crear Ingrediente
    const nuevoIngrediente = await prisma.ingrediente.create({
      data: {
        nombre: def.nombre,
        categoria: def.categoria,
        fdcId,
        caloriasPor100g: nutrients.calorias,
        proteinasG100g: nutrients.proteinas,
        grasasG100g: nutrients.grasas,
        carbohidratosG100g: nutrients.carbohidratos,
        fibraG100g: nutrients.fibra,
        azucaresG100g: nutrients.azucares,
        sodioMg100g: nutrients.sodio,
        origen: def.origen,
        esProcesado: def.esProcesado,
        precioPorGramo: def.precioPorGramo, // OBLIGATORIO > 0
        activo: true,
        stock: {
          create: {
            gramosDisponibles: def.stockInicialGramos,
          },
        },
      },
    });

    // Crear Relaciones de Alérgenos
    if (def.alergenos && def.alergenos.length > 0) {
      for (const alDef of def.alergenos) {
        const alergenoId = mapAlergenos.get(alDef.alergenoNombre);
        if (alergenoId) {
          await prisma.ingredienteAlergeno.create({
            data: {
              ingredienteId: nuevoIngrediente.id,
              alergenoId,
              nivel: alDef.nivel,
            },
          });
        }
      }
    }

    console.log(
      `✅ Ingrediente sembrado: "${nuevoIngrediente.nombre}" (FDC ID: ${fdcId || 'Fallback'}, ${nutrients.calorias} kcal, $${def.precioPorGramo}/g)`
    );
    exitosos++;
  }

  // Resumen final de conteo de ingredientes con precio > 0 y stock > 0
  const totalActivosConStock = await prisma.ingrediente.count({
    where: {
      activo: true,
      precioPorGramo: { gt: 0 },
      stock: { gramosDisponibles: { gt: 0 } },
    },
  });

  console.log('\n================ RESUMEN DE SIEMBRA ================');
  console.log(` Total de Ingredientes Procesados Exitosamente: ${exitosos}`);
  console.log(` Total con Fallo de Match Directo en USDA (usado fallback): ${fallidosSinMatch}`);
  console.log(` Total de Ingredientes Activos con Precio>0 y Stock>0 en BD: ${totalActivosConStock}`);
  console.log('====================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed de Prisma:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
