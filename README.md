# KairosMix — E-Commerce de Mezclas Personalizadas de Snacks & Frutos Secos

KairosMix es una plataforma de comercio electrónico de **tienda única** (no marketplace) especializada en la venta y personalización de mezclas de frutos secos, semillas y snacks saludables por gramaje exacto.

---

## 🏛️ Arquitectura del Sistema

El backend real en producción está implementado en **Next.js 15 App Router** a través de las API Routes en `app/api/v1/`, conectadas a **PostgreSQL** mediante **Prisma Client** y validadas con **Zod**:

```
app/
  api/
    v1/
      auth/          # Autenticación JWT, Refresh Tokens con rotación y RBAC
      catalog/       # Ingredientes, Alérgenos, Proveedores (RUC) y Stock
      orders/        # Checkout Transaccional con Reserva de Stock y Rollback Compensatorio
      billing/       # Facturación e interfaz PaymentProvider (Stub)
      notifications/ # Notificaciones y NotificacionLog
      audit/         # Eventos de auditoría del sistema
apps/
  core-nestjs-reference/  # Referencia de código NestJS (módulos aislados)
```

> **Integración con IA:**
> El motor de IA consulta los ingredientes disponibles mediante Prisma, aplica filtros y validaciones en el servidor, y después envía el catálogo elegible a Gemini.

---

## 🚀 Puesta en Marcha (Instrucciones de Ejecución)

### 1. Requisitos Previos
- Node.js 20+
- Docker y Docker Compose

### 2. Levantar Infraestructura (PostgreSQL + Redis)
Configura primero las variables privadas en `.env` a partir de `.env.example`. Usa secretos distintos y una contraseña de PostgreSQL que coincida con `DATABASE_URL`.
```bash
docker compose -f infra/docker-compose.yml up -d
```

### 3. Ejecutar Migraciones de Base de Datos y Seed Inicial
```bash
# Generar cliente de Prisma y correr migraciones
npx prisma migrate deploy

# Ejecutar el seed de usuarios (si se definieron SEED_*_PASSWORD) y catálogo
npx prisma db seed
```

### 4. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

---

## 📋 Módulos y Reglas de Negocio

### 1. Módulo `Identity` (RBAC)
- **Roles:** `ADMIN`, `VENDEDOR`, `CLIENTE`.
- **Registro Público Cerrado:** Los usuarios son creados exclusivamente por el Administrador.
- **Autenticación:** JWT Access Token (15m) + Refresh Token (7d) con rotación automática e invalidación del token previo.
- **Seed Admin:** El comando `npx prisma db seed` crea la cuenta inicial de forma idempotente si se configuró `SEED_ADMIN_PASSWORD`.

### 2. Módulo `Catalog`
- **Valores Nutricionales:** Cada ingrediente registra calorías, proteínas, grasas, carbohidratos, fibra y sodio por cada 100g (homologados con IDs de USDA FoodData Central).
- **Soft-Delete Estricto:** Los ingredientes desactivados mantienen su registro (`activo = false`) para salvaguardar la integridad de los pedidos históricos.
- **Proveedores:** Validación obligatoria de unicidad de RUC y datos de contacto.
- **Alérgenos:** Etiquetado de `CONTIENE` o `TRAZAS` para frutos secos, gluten, lácteos, sulfitos, etc.

### 3. Módulo `Orders` (Checkout Transaccional y Compensación)
El flujo de checkout implementa una secuencia transaccional robusta:

```
[Cliente envía Pedido]
         │
         ▼
1. Validar Stock disponible de todos los ingredientes
         │
         ▼
2. Transacción Atómica:
   - Crear Pedido (estado: STOCK_RESERVADO)
   - Crear PedidoItems
   - Decrementar gramos de Stock en inventario
         │
         ▼
3. Invocar PaymentProvider (Stub)
         │
    ┌────┴────────────────────────┐
    │ [Pago Aprobado]             │ [Pago Rechazado / Fallido]
    ▼                             ▼
4. Flujo de Éxito:            5. Transacción de Compensación:
   - Crear Factura (PAGADO)      - Revertir Stock (+gramos reservados)
   - Pedido -> CONFIRMADO        - Pedido -> FALLIDO
   - NotificacionLog (Éxito)     - NotificacionLog (Fallo)
```

### 4. Módulo `Billing`
- Interfaz `PaymentProvider` con implementación desacoplada `StubPaymentProvider`.
- Emisión de facturas vinculadas al pedido con desglose de impuestos y método de pago.

### 5. Módulo `Notifications`
- Registro síncrono en la tabla `NotificacionLog` con destinatario, tipo de evento y timestamp.

---

## 📖 Documentación de la API (Swagger / OpenAPI)

La documentación interactiva Swagger con especificación OpenAPI 3.0 se encuentra disponible en:
- **Swagger JSON:** `/api/docs`
- **Explorador Interactivo:** Pestaña **API /docs** en la aplicación web.

---

## 🧪 Pruebas y verificación

La compilación y el análisis estático disponibles en este proyecto son:
```bash
npm run build
npm run lint
```

Los archivos de `apps/core/test/` pertenecen al backend NestJS de referencia y no forman parte de un comando de pruebas configurado en este paquete. La pantalla de pruebas de la interfaz es una simulación, no una ejecución de Jest.

La suite de referencia documenta:
1. `IdentityService`: Creación de admin por seed, login, rotación de tokens, guards de roles.
2. `CatalogService`: Creación de ingredientes con macros, soft delete y validación de RUC.
3. `OrdersService`: Validación previa de stock, reserva atómica y **transacción de compensación ante fallo de pago**.
4. `BillingService`: Emisión de comprobantes y pagos simulados.
5. `NotificationsService`: Registro de logs de notificación.

---

## Publicación en GitHub

Este directorio se prepara como repositorio local. Antes de publicar, revisa `git status --short` y `git ls-files` para confirmar la lista final. No subas `.env`, claves, respaldos, registros de prompts, capturas de pruebas ni PDF: están excluidos en `.gitignore`.

Si una clave o contraseña se compartió o se utilizó con las cuentas de demostración anteriores, cámbiala en el proveedor y en la base de datos antes de exponer cualquier despliegue. El seed ya no incorpora contraseñas públicas y solo crea usuarios si defines sus `SEED_*_PASSWORD` privados. Los usuarios existentes no se modifican al repetir el seed.

El archivo Docker Compose solo levanta PostgreSQL y Redis. La aplicación Next.js se ejecuta con `npm run dev` o `npm run build` y `npm run start`; no hay Dockerfile de aplicación configurado.

Para publicar por primera vez, crea un repositorio vacío en GitHub y ejecuta, desde esta carpeta:

```bash
git add .
git diff --cached --name-only
git commit -m "Preparar KairosMix para GitHub"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

Sustituye la URL por la del repositorio que crees. Comprueba los nombres antes de confirmar el commit; nunca uses `git add -f` para añadir archivos excluidos.
