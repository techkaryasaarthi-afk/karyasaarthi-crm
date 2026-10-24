import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for external frontends & surfaces
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['/', 'health'],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Filters & Interceptors
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger / OpenAPI Documentation Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Karya Saarthi CRM Core API')
    .setDescription(
      'Unified Backend API for karyasaarthi.com, karyasaarthi.in, career.karyasaarthi.com and Mobile Apps',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT Access Token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('System & Health', 'Core health and system info')
    .addTag('Auth', 'Staff authentication & token management')
    .addTag('Persons', 'Unified identity & person deduplication')
    .addTag('Public API', 'Public ingestion endpoints (enquiries, chat, career)')
    .addTag('Leads & Inbox', 'Leads pipeline & multi-channel interactions')
    .addTag('Projects & Vendors', 'Client projects and vendor tracking')
    .addTag('Careers', 'Job postings and ATS applications')
    .addTag('Analytics', 'Cross-surface performance & CRM metrics')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Enable shutdown hooks
  app.enableShutdownHooks();

  const port = process.env.PORT || 8000;
  await app.listen(port);
  logger.log(`🚀 Karya Saarthi CRM API is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
