import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationError } from 'class-validator';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { flattenValidationErrors } from './common/filters/validation-errors';
import { AppConfig } from './config/configuration';
import { setupSwagger } from './swagger';
import cookieParser from 'cookie-parser';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService<AppConfig, true>);
  app.use(cookieParser());

  mkdirSync('./uploads/products', { recursive: true });

  app.enableCors({
    origin: config.get('corsOrigins', { infer: true }),
    credentials: true,
  });

  app.setGlobalPrefix('api');

  if (config.get('swaggerEnabled', { infer: true })) {
    setupSwagger(app);
  }

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        return new BadRequestException({
          error: 'validation_failed',
          fields: flattenValidationErrors(errors),
        });
      },
    }),
  );

  const port = config.get('port', { infer: true });
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
