import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    const port = configService.get<number>('PORT', 3003);

    app.enableCors({
      origin: configService.get<string>('CORS_ORIGIN', '*'),
    });

    app.setGlobalPrefix(configService.get<string>('API_PREFIX', 'api'));

    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    // Set up Swagger
    const config = new DocumentBuilder()
      .setTitle('TradeX API')
      .setDescription('Comprehensive stock management system API for MCD TradeX platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    await app.listen(port);
    Logger.log(`Application is running on: http://localhost:${port}`, 'Bootstrap');
    Logger.log(`Swagger UI is available at http://localhost:${port}/api/docs`, 'SwaggerUI');
  } catch (error) {
    Logger.error(`Failed to start the application: ${error.message}`, error.stack);
  }
}

bootstrap();
