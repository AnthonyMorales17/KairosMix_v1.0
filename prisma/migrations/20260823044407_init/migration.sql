-- CreateEnum
CREATE TYPE "public"."Rol" AS ENUM ('ADMIN', 'VENDEDOR', 'CLIENTE');

-- CreateEnum
CREATE TYPE "public"."CategoriaIngrediente" AS ENUM ('FRUTO_SECO', 'SEMILLA', 'FRUTA_DESHIDRATADA', 'CEREAL', 'PROTEINA_POLVO', 'EDULCORANTE', 'ESPECIA', 'OTRO');

-- CreateEnum
CREATE TYPE "public"."OrigenIngrediente" AS ENUM ('ANIMAL', 'VEGETAL');

-- CreateEnum
CREATE TYPE "public"."NivelAlergeno" AS ENUM ('CONTIENE', 'TRAZAS');

-- CreateEnum
CREATE TYPE "public"."ResultadoEvento" AS ENUM ('EXITO', 'FALLO');

-- CreateEnum
CREATE TYPE "public"."EstadoPedido" AS ENUM ('PENDIENTE', 'STOCK_RESERVADO', 'PAGADO', 'CONFIRMADO', 'FALLIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "public"."EstadoPago" AS ENUM ('PENDIENTE', 'PAGADO', 'FALLIDO', 'REEMBOLSADO');

-- CreateTable
CREATE TABLE "public"."Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "public"."Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RefreshToken" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ingrediente" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "public"."CategoriaIngrediente" NOT NULL,
    "fdcId" INTEGER,
    "caloriasPor100g" DOUBLE PRECISION NOT NULL,
    "proteinasG100g" DOUBLE PRECISION NOT NULL,
    "grasasG100g" DOUBLE PRECISION NOT NULL,
    "carbohidratosG100g" DOUBLE PRECISION NOT NULL,
    "fibraG100g" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "azucaresG100g" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sodioMg100g" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "origen" "public"."OrigenIngrediente" NOT NULL,
    "esProcesado" BOOLEAN NOT NULL DEFAULT false,
    "precioPorGramo" DOUBLE PRECISION,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Ingrediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Alergeno" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Alergeno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IngredienteAlergeno" (
    "ingredienteId" INTEGER NOT NULL,
    "alergenoId" INTEGER NOT NULL,
    "nivel" "public"."NivelAlergeno" NOT NULL DEFAULT 'CONTIENE',

    CONSTRAINT "IngredienteAlergeno_pkey" PRIMARY KEY ("ingredienteId","alergenoId")
);

-- CreateTable
CREATE TABLE "public"."Proveedor" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "contacto" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Stock" (
    "ingredienteId" INTEGER NOT NULL,
    "gramosDisponibles" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("ingredienteId")
);

-- CreateTable
CREATE TABLE "public"."EventoAuditoria" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "resultado" "public"."ResultadoEvento" NOT NULL,

    CONSTRAINT "EventoAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Pedido" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "estado" "public"."EstadoPedido" NOT NULL DEFAULT 'PENDIENTE',
    "total" DOUBLE PRECISION NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PedidoItem" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "ingredienteId" INTEGER NOT NULL,
    "gramos" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PedidoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Factura" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "estadoPago" "public"."EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "emitidaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificacionLog" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "enviadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exito" BOOLEAN NOT NULL,

    CONSTRAINT "NotificacionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "public"."Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Ingrediente_nombre_key" ON "public"."Ingrediente"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Alergeno_nombre_key" ON "public"."Alergeno"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_ruc_key" ON "public"."Proveedor"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "Factura_pedidoId_key" ON "public"."Factura"("pedidoId");

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IngredienteAlergeno" ADD CONSTRAINT "IngredienteAlergeno_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "public"."Ingrediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IngredienteAlergeno" ADD CONSTRAINT "IngredienteAlergeno_alergenoId_fkey" FOREIGN KEY ("alergenoId") REFERENCES "public"."Alergeno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Stock" ADD CONSTRAINT "Stock_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "public"."Ingrediente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PedidoItem" ADD CONSTRAINT "PedidoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "public"."Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Factura" ADD CONSTRAINT "Factura_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "public"."Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
