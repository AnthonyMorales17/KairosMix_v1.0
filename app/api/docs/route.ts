import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/server-auth';

export async function GET(req: NextRequest) {
  const authUser = verifyAuthToken(req);
  if (!authUser) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  if (authUser.rol !== 'ADMIN') {
    return NextResponse.json({ message: 'Acceso restringido: Se requiere rol ADMIN' }, { status: 403 });
  }

  const swaggerSpec = {
    openapi: '3.0.0',
    info: {
      title: 'KairosMix API - Modular Monolith',
      version: '1.0.0',
      description:
        'Documentación OpenAPI/Swagger oficial de KairosMix: E-commerce de tienda única para mezclas personalizadas de frutos secos y snacks saludables. Arquitectura modular: Identity (RBAC), Catalog (Ingredientes, Alérgenos, Proveedores), Orders (Checkout transaccional con rollback de compensación), Billing (Facturas & Stub de pagos), y Notifications.',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Servidor API v1 Monolito',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token de acceso JWT obtenido en /auth/login',
        },
      },
      schemas: {
        LoginDto: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'admin@kairosmix.com' },
            password: { type: 'string', example: 'Su contraseña privada' },
          },
        },
        CreateUserDto: {
          type: 'object',
          required: ['email', 'password', 'nombre', 'rol'],
          properties: {
            email: { type: 'string', example: 'nuevo_vendedor@kairosmix.com' },
            password: { type: 'string', example: 'Password123!' },
            nombre: { type: 'string', example: 'Juan Pérez' },
            rol: { type: 'string', enum: ['ADMIN', 'VENDEDOR', 'CLIENTE'] },
          },
        },
        CheckoutDto: {
          type: 'object',
          required: ['items', 'metodoPago'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  ingredienteId: { type: 'number', example: 1 },
                  gramos: { type: 'number', example: 150 },
                },
              },
            },
            metodoPago: { type: 'string', example: 'TARJETA_CREDITO' },
            simulateFailure: { type: 'boolean', example: false, description: 'Simula fallo en pago para activar compensación de stock' },
          },
        },
      },
    },
    paths: {
      '/auth/login': {
        post: {
          tags: ['Identity'],
          summary: 'Iniciar sesión (Retorna Access Token 15m + Refresh Token 7d)',
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginDto' } } } },
          responses: { '200': { description: 'Tokens emitidos exitosamente' } },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['Identity'],
          summary: 'Rotación de tokens de refresco',
          responses: { '200': { description: 'Nuevos tokens generados' } },
        },
      },
      '/auth/users': {
        get: {
          tags: ['Identity'],
          security: [{ bearerAuth: [] }],
          summary: 'Listar usuarios (Solo ADMIN)',
          responses: { '200': { description: 'Lista de usuarios' } },
        },
        post: {
          tags: ['Identity'],
          security: [{ bearerAuth: [] }],
          summary: 'Crear nuevo vendedor o cliente (Solo ADMIN)',
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUserDto' } } } },
          responses: { '201': { description: 'Usuario creado' } },
        },
      },
      '/catalog/ingredientes': {
        get: {
          tags: ['Catalog'],
          summary: 'Listar catálogo de ingredientes con filtros (Público/Cualquier rol)',
          parameters: [
            { name: 'categoria', in: 'query', schema: { type: 'string' } },
            { name: 'excluirAlergenoId', in: 'query', schema: { type: 'number' } },
            { name: 'busqueda', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Catálogo de ingredientes' } },
        },
        post: {
          tags: ['Catalog'],
          security: [{ bearerAuth: [] }],
          summary: 'Crear ingrediente con valores nutricionales USDA (ADMIN / VENDEDOR)',
          responses: { '201': { description: 'Ingrediente creado' } },
        },
      },
      '/catalog/ingredientes/{id}': {
        delete: {
          tags: ['Catalog'],
          security: [{ bearerAuth: [] }],
          summary: 'Soft-delete de ingrediente (activo = false, nunca borrado físico)',
          responses: { '200': { description: 'Desactivado' } },
        },
      },
      '/catalog/stock': {
        post: {
          tags: ['Catalog'],
          security: [{ bearerAuth: [] }],
          summary: 'Actualizar gramos de stock disponible (ADMIN / VENDEDOR)',
          responses: { '200': { description: 'Stock actualizado' } },
        },
      },
      '/catalog/proveedores': {
        get: {
          tags: ['Catalog'],
          security: [{ bearerAuth: [] }],
          summary: 'Listar proveedores (ADMIN / VENDEDOR)',
          responses: { '200': { description: 'Proveedores' } },
        },
        post: {
          tags: ['Catalog'],
          security: [{ bearerAuth: [] }],
          summary: 'Registrar proveedor con RUC único (ADMIN / VENDEDOR)',
          responses: { '201': { description: 'Proveedor registrado' } },
        },
      },
      '/orders/checkout': {
        post: {
          tags: ['Orders'],
          security: [{ bearerAuth: [] }],
          summary: 'Checkout transaccional con validación de stock, reserva atómica, stub de pago y compensación ante fallo',
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckoutDto' } } } },
          responses: {
            '200': { description: 'Pedido confirmado y factura emitida' },
            '400': { description: 'Stock insuficiente o error de validación' },
            '402': { description: 'Pago rechazado, compensación ejecutada y stock revertido' },
          },
        },
      },
      '/orders': {
        get: {
          tags: ['Orders'],
          security: [{ bearerAuth: [] }],
          summary: 'Listar pedidos (Cliente ve los suyos, Admin/Vendedor ven todos)',
          responses: { '200': { description: 'Lista de pedidos' } },
        },
      },
      '/billing/facturas': {
        get: {
          tags: ['Billing'],
          security: [{ bearerAuth: [] }],
          summary: 'Listar facturas emitidas',
          responses: { '200': { description: 'Lista de facturas' } },
        },
      },
      '/notifications/logs': {
        get: {
          tags: ['Notifications'],
          security: [{ bearerAuth: [] }],
          summary: 'Ver logs de notificaciones síncronas (ADMIN / VENDEDOR)',
          responses: { '200': { description: 'Logs de notificación' } },
        },
      },
    },
  };

  return NextResponse.json(swaggerSpec);
}
