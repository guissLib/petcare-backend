import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  const swaggerConfig = new DocumentBuilder()
    .setTitle('PetCare Home Services API')
    .setDescription('API para perfiles de mascotas, reservas, proveedores, promociones y pagos mock.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/openapi.json',
    customSiteTitle: 'PetCare API Docs',
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
