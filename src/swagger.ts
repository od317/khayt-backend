import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { enrichOpenApiDocument } from './common/swagger/enrich-document';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('خيط API')
    .setDescription(
      'Warehouse and marketplace API for the Syrian clothing industry.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token from POST /api/auth/verify',
      },
      'access-token',
    )
    .addSecurityRequirements('access-token')
    .build();

  const document = enrichOpenApiDocument(
    SwaggerModule.createDocument(app, config),
  );
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
