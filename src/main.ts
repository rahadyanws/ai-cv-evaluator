import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefix semua endpoint (opsional)
  app.setGlobalPrefix('api');

  // Gunakan ValidationPipe global (untuk DTO validation)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // hanya field yang ada di DTO
      forbidNonWhitelisted: true, // reject field asing
      transform: true, // auto-transform payload ke tipe DTO
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Server is running on http://localhost:${port}/api`);
}
bootstrap();
