import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger Documentation Setup at /api/docs
  const config = new DocumentBuilder()
    .setTitle('KairosMix API - Core Monolith')
    .setDescription(
      'Documentación OpenAPI/Swagger para el e-commerce KairosMix: Identity (RBAC), Catalog (Ingredientes, Alérgenos, Proveedores), Orders (Checkout transaccional), Billing (Facturación & Pagos Stub), y Notifications.'
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT Authorization',
        description: 'Ingresa tu JWT Access Token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addTag('Identity', 'Autenticación, Seed Admin, Refresh Tokens y Gestión de Usuarios')
    .addTag('Catalog', 'CRUD de Ingredientes, Alérgenos, Filtros y Proveedores')
    .addTag('Orders', 'Checkout Transaccional con Reserva de Stock y Compensación')
    .addTag('Billing', 'Facturas e Interfaz PaymentProvider')
    .addTag('Notifications', 'Logs de notificaciones síncronas en proceso')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 KairosMix Core Backend corriendo en el puerto ${port}`);
  logger.log(`📚 Swagger Docs disponible en http://localhost:${port}/api/docs`);
}

bootstrap();
