import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export interface UsuarioEntity {
  id: string;
  email: string;
  passwordHash: string;
  nombre: string;
  rol: 'ADMIN' | 'VENDEDOR' | 'CLIENTE';
  activo: boolean;
  creadoEn: string;
}

export interface RefreshTokenEntity {
  id: string;
  usuarioId: string;
  tokenHash: string;
  expiraEn: string;
  creadoEn: string;
}

export interface AlergenoEntity {
  id: number;
  nombre: string;
}

export interface IngredienteAlergenoEntity {
  ingredienteId: number;
  alergenoId: number;
  nivel: 'CONTIENE' | 'TRAZAS';
}

export interface StockEntity {
  ingredienteId: number;
  gramosDisponibles: number;
  actualizadoEn: string;
}

export interface IngredienteEntity {
  id: number;
  nombre: string;
  categoria:
    | 'FRUTO_SECO'
    | 'SEMILLA'
    | 'FRUTA_DESHIDRATADA'
    | 'CEREAL'
    | 'PROTEINA_POLVO'
    | 'EDULCORANTE'
    | 'ESPECIA'
    | 'OTRO';
  fdcId?: number;
  caloriasPor100g: number;
  proteinasG100g: number;
  grasasG100g: number;
  carbohidratosG100g: number;
  fibraG100g: number;
  azucaresG100g: number;
  sodioMg100g: number;
  origen: 'ANIMAL' | 'VEGETAL';
  esProcesado: boolean;
  precioPorGramo: number;
  activo: boolean;
}

export interface ProveedorEntity {
  id: number;
  nombre: string;
  ruc: string;
  contacto?: string;
  activo: boolean;
}

export interface PedidoItemEntity {
  id: string;
  pedidoId: string;
  ingredienteId: number;
  gramos: number;
  precioUnitario: number;
}

export interface FacturaEntity {
  id: string;
  pedidoId: string;
  monto: number;
  metodoPago: string;
  estadoPago: 'PENDIENTE' | 'PAGADO' | 'FALLIDO' | 'REEMBOLSADO';
  emitidaEn: string;
}

export interface PedidoEntity {
  id: string;
  clienteId: string;
  estado: 'PENDIENTE' | 'STOCK_RESERVADO' | 'PAGADO' | 'CONFIRMADO' | 'FALLIDO' | 'CANCELADO';
  total: number;
  creadoEn: string;
  items?: PedidoItemEntity[];
  factura?: FacturaEntity;
}

export interface NotificacionLogEntity {
  id: string;
  tipo: 'pedido_confirmado' | 'pedido_fallido';
  destinatario: string;
  enviadaEn: string;
  exito: boolean;
}

export interface EventoAuditoriaEntity {
  id: string;
  timestamp: string;
  usuarioId?: string;
  accion: string;
  entidad: string;
  entidadId: string;
  payload: any;
  resultado: 'EXITO' | 'FALLO';
}

// In-Memory Database Singleton State
class KairosDatabase {
  public usuarios: UsuarioEntity[] = [];
  public refreshTokens: RefreshTokenEntity[] = [];
  public alergenos: AlergenoEntity[] = [];
  public ingredienteAlergenos: IngredienteAlergenoEntity[] = [];
  public ingredientes: IngredienteEntity[] = [];
  public stocks: Map<number, StockEntity> = new Map();
  public proveedores: ProveedorEntity[] = [];
  public pedidos: PedidoEntity[] = [];
  public pedidoItems: PedidoItemEntity[] = [];
  public facturas: FacturaEntity[] = [];
  public notificaciones: NotificacionLogEntity[] = [];
  public auditorias: EventoAuditoriaEntity[] = [];

  private initialized = false;

  constructor() {
    this.init();
  }

  public init() {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Usuarios Semilla
    const adminPass = bcrypt.hashSync(randomBytes(24).toString('hex'), 8);
    const vendedorPass = bcrypt.hashSync(randomBytes(24).toString('hex'), 8);
    const clientePass = bcrypt.hashSync(randomBytes(24).toString('hex'), 8);

    this.usuarios = [
      {
        id: 'usr-admin-001',
        email: 'admin@kairosmix.com',
        passwordHash: adminPass,
        nombre: 'Valeria Ramos (Administradora)',
        rol: 'ADMIN',
        activo: true,
        creadoEn: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
      },
      {
        id: 'usr-vend-002',
        email: 'vendedor@kairosmix.com',
        passwordHash: vendedorPass,
        nombre: 'Carlos Mendoza (Ventas & Stock)',
        rol: 'VENDEDOR',
        activo: true,
        creadoEn: new Date(Date.now() - 20 * 24 * 3600000).toISOString(),
      },
      {
        id: 'usr-cli-003',
        email: 'cliente@kairosmix.com',
        passwordHash: clientePass,
        nombre: 'Sofía Benítez (Cliente Frecuente)',
        rol: 'CLIENTE',
        activo: true,
        creadoEn: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
      },
    ];

    // 2. Alérgenos
    this.alergenos = [
      { id: 1, nombre: 'Frutos de Cáscara (Nueces/Almendras)' },
      { id: 2, nombre: 'Maní / Cacahuetes' },
      { id: 3, nombre: 'Sésamo / Ajonjolí' },
      { id: 4, nombre: 'Gluten / Trigo' },
      { id: 5, nombre: 'Lácteos / Suero de Leche' },
      { id: 6, nombre: 'Sulfitos' },
      { id: 7, nombre: 'Soya' },
    ];

    // 3. Ingredientes del Catálogo con USDA FDC ID y datos nutricionales reales
    this.ingredientes = [
      {
        id: 1,
        nombre: 'Almendra Nonpareil Tostada',
        categoria: 'FRUTO_SECO',
        fdcId: 170567,
        caloriasPor100g: 579,
        proteinasG100g: 21.2,
        grasasG100g: 49.9,
        carbohidratosG100g: 21.6,
        fibraG100g: 12.5,
        azucaresG100g: 4.4,
        sodioMg100g: 1,
        origen: 'VEGETAL',
        esProcesado: false,
        precioPorGramo: 0.045,
        activo: true,
      },
      {
        id: 2,
        nombre: 'Nuez Pecana Premium',
        categoria: 'FRUTO_SECO',
        fdcId: 170182,
        caloriasPor100g: 691,
        proteinasG100g: 9.2,
        grasasG100g: 72.0,
        carbohidratosG100g: 13.9,
        fibraG100g: 9.6,
        azucaresG100g: 4.0,
        sodioMg100g: 0,
        origen: 'VEGETAL',
        esProcesado: false,
        precioPorGramo: 0.062,
        activo: true,
      },
      {
        id: 3,
        nombre: 'Pistacho Tostado con Sal Marina',
        categoria: 'FRUTO_SECO',
        fdcId: 170184,
        caloriasPor100g: 560,
        proteinasG100g: 20.2,
        grasasG100g: 45.3,
        carbohidratosG100g: 27.2,
        fibraG100g: 10.6,
        azucaresG100g: 7.7,
        sodioMg100g: 412,
        origen: 'VEGETAL',
        esProcesado: true,
        precioPorGramo: 0.058,
        activo: true,
      },
      {
        id: 4,
        nombre: 'Semilla de Chía Negra Orgánica',
        categoria: 'SEMILLA',
        fdcId: 170554,
        caloriasPor100g: 486,
        proteinasG100g: 16.5,
        grasasG100g: 30.7,
        carbohidratosG100g: 42.1,
        fibraG100g: 34.4,
        azucaresG100g: 0.0,
        sodioMg100g: 16,
        origen: 'VEGETAL',
        esProcesado: false,
        precioPorGramo: 0.025,
        activo: true,
      },
      {
        id: 5,
        nombre: 'Semilla de Calabaza Pepita Verde',
        categoria: 'SEMILLA',
        fdcId: 170556,
        caloriasPor100g: 559,
        proteinasG100g: 30.2,
        grasasG100g: 49.1,
        carbohidratosG100g: 10.7,
        fibraG100g: 6.0,
        azucaresG100g: 1.4,
        sodioMg100g: 7,
        origen: 'VEGETAL',
        esProcesado: false,
        precioPorGramo: 0.038,
        activo: true,
      },
      {
        id: 6,
        nombre: 'Arándano Rojo Silvestre Deshidratado',
        categoria: 'FRUTA_DESHIDRATADA',
        fdcId: 171723,
        caloriasPor100g: 308,
        proteinasG100g: 0.2,
        grasasG100g: 1.4,
        carbohidratosG100g: 82.4,
        fibraG100g: 5.7,
        azucaresG100g: 65.0,
        sodioMg100g: 3,
        origen: 'VEGETAL',
        esProcesado: true,
        precioPorGramo: 0.032,
        activo: true,
      },
      {
        id: 7,
        nombre: 'Chips de Coco Tostado sin Azúcar',
        categoria: 'FRUTA_DESHIDRATADA',
        fdcId: 170169,
        caloriasPor100g: 660,
        proteinasG100g: 6.9,
        grasasG100g: 64.5,
        carbohidratosG100g: 23.7,
        fibraG100g: 16.3,
        azucaresG100g: 7.4,
        sodioMg100g: 37,
        origen: 'VEGETAL',
        esProcesado: false,
        precioPorGramo: 0.040,
        activo: true,
      },
      {
        id: 8,
        nombre: 'Avena Integral en Hojuelas Crocantes',
        categoria: 'CEREAL',
        fdcId: 173904,
        caloriasPor100g: 389,
        proteinasG100g: 16.9,
        grasasG100g: 6.9,
        carbohidratosG100g: 66.3,
        fibraG100g: 10.6,
        azucaresG100g: 0.9,
        sodioMg100g: 2,
        origen: 'VEGETAL',
        esProcesado: false,
        precioPorGramo: 0.015,
        activo: true,
      },
      {
        id: 9,
        nombre: 'Proteína Whey Isolate Vainilla 90%',
        categoria: 'PROTEINA_POLVO',
        fdcId: 173177,
        caloriasPor100g: 370,
        proteinasG100g: 88.0,
        grasasG100g: 1.0,
        carbohidratosG100g: 2.0,
        fibraG100g: 0.0,
        azucaresG100g: 1.0,
        sodioMg100g: 180,
        origen: 'ANIMAL',
        esProcesado: true,
        precioPorGramo: 0.075,
        activo: true,
      },
      {
        id: 10,
        nombre: 'Canela de Ceilán en Polvo Grado A',
        categoria: 'ESPECIA',
        fdcId: 171320,
        caloriasPor100g: 247,
        proteinasG100g: 4.0,
        grasasG100g: 1.2,
        carbohidratosG100g: 80.6,
        fibraG100g: 53.1,
        azucaresG100g: 2.2,
        sodioMg100g: 10,
        origen: 'VEGETAL',
        esProcesado: false,
        precioPorGramo: 0.030,
        activo: true,
      },
      {
        id: 11,
        nombre: 'Nibs de Cacao 100% Puro Orgánico',
        categoria: 'OTRO',
        fdcId: 170273,
        caloriasPor100g: 598,
        proteinasG100g: 14.3,
        grasasG100g: 50.0,
        carbohidratosG100g: 28.6,
        fibraG100g: 18.0,
        azucaresG100g: 1.0,
        sodioMg100g: 20,
        origen: 'VEGETAL',
        esProcesado: false,
        precioPorGramo: 0.055,
        activo: true,
      },
    ];

    // 4. Ingrediente-Alérgeno Relaciones
    this.ingredienteAlergenos = [
      { ingredienteId: 1, alergenoId: 1, nivel: 'CONTIENE' }, // Almendra -> Frutos de cáscara
      { ingredienteId: 2, alergenoId: 1, nivel: 'CONTIENE' }, // Pecana -> Frutos de cáscara
      { ingredienteId: 3, alergenoId: 1, nivel: 'CONTIENE' }, // Pistacho -> Frutos de cáscara
      { ingredienteId: 6, alergenoId: 6, nivel: 'TRAZAS' },   // Arándano -> Sulfitos
      { ingredienteId: 8, alergenoId: 4, nivel: 'TRAZAS' },   // Avena -> Gluten (Trazas)
      { ingredienteId: 9, alergenoId: 5, nivel: 'CONTIENE' }, // Whey -> Lácteos
    ];

    // 5. Stock Inicial (en gramos)
    this.ingredientes.forEach((ing) => {
      this.stocks.set(ing.id, {
        ingredienteId: ing.id,
        gramosDisponibles: ing.id === 2 ? 800 : 3500, // Pecana 800g, others 3500g
        actualizadoEn: new Date().toISOString(),
      });
    });

    // 6. Proveedores Iniciales
    this.proveedores = [
      {
        id: 1,
        nombre: 'AgroAndina Frutos & Semillas S.A.S.',
        ruc: '1792485930001',
        contacto: 'pedidos@agroandina.com | +593 99 876 5432',
        activo: true,
      },
      {
        id: 2,
        nombre: 'NutraPro Supply Global',
        ruc: '0993847291001',
        contacto: 'importaciones@nutrapro.com | +593 98 123 4567',
        activo: true,
      },
      {
        id: 3,
        nombre: 'Cacao & Especias del Austro Cía. Ltda.',
        ruc: '0190283746001',
        contacto: 'ventas@austroespecias.ec',
        activo: true,
      },
    ];

    // 7. Pedido Inicial de Demostración
    const initialPedidoId = 'KM-PED-2026-001';
    this.pedidos = [
      {
        id: initialPedidoId,
        clienteId: 'usr-cli-003',
        estado: 'CONFIRMADO',
        total: 14.85,
        creadoEn: new Date(Date.now() - 2 * 3600000).toISOString(),
        items: [
          {
            id: 'item-demo-1',
            pedidoId: initialPedidoId,
            ingredienteId: 1,
            gramos: 150,
            precioUnitario: 0.045,
          },
          {
            id: 'item-demo-2',
            pedidoId: initialPedidoId,
            ingredienteId: 6,
            gramos: 100,
            precioUnitario: 0.032,
          },
          {
            id: 'item-demo-3',
            pedidoId: initialPedidoId,
            ingredienteId: 5,
            gramos: 130,
            precioUnitario: 0.038,
          },
        ],
        factura: {
          id: 'FAC-KM-2026-001',
          pedidoId: initialPedidoId,
          monto: 14.85,
          metodoPago: 'TARJETA_CREDITO',
          estadoPago: 'PAGADO',
          emitidaEn: new Date(Date.now() - 2 * 3600000).toISOString(),
        },
      },
    ];

    this.facturas = [this.pedidos[0].factura!];

    this.notificaciones = [
      {
        id: 'notif-001',
        tipo: 'pedido_confirmado',
        destinatario: 'cliente@kairosmix.com',
        enviadaEn: new Date(Date.now() - 2 * 3600000).toISOString(),
        exito: true,
      },
    ];

    this.auditorias = [
      {
        id: 'aud-001',
        timestamp: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
        usuarioId: 'usr-admin-001',
        accion: 'SEED_ADMIN_BOOTSTRAP',
        entidad: 'Usuario',
        entidadId: 'usr-admin-001',
        payload: { email: 'admin@kairosmix.com', rol: 'ADMIN' },
        resultado: 'EXITO',
      },
      {
        id: 'aud-002',
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
        usuarioId: 'usr-cli-003',
        accion: 'ORDER_CHECKOUT_COMPLETED',
        entidad: 'Pedido',
        entidadId: initialPedidoId,
        payload: { total: 14.85, metodoPago: 'TARJETA_CREDITO' },
        resultado: 'EXITO',
      },
    ];
  }
}

// Global singleton instance
declare global {
  var __kairosDb: KairosDatabase | undefined;
}

export const db: KairosDatabase = globalThis.__kairosDb || new KairosDatabase();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__kairosDb = db;
}
