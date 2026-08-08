import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './modules/shared-kernel/presentation/http/filters/domain-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalFilters(new DomainExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('PetCare Home Services API')
    .setDescription(
      'API de dominio para usuarios por rol, mascotas, proveedores, reservas, promociones y pagos.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document, {
    jsonDocumentUrl: 'api-docs/openapi.json',
    customSiteTitle: 'PetCare API Docs',
  });

  await app.listen(Number(process.env.PORT ?? 3005));
}

void bootstrap();
