import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { UploadModule } from '@/modules/upload/upload.module';

@Module({
  imports: [
    // Load .env globally for all modules
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Prisma ORM integration
    PrismaModule,

    // File upload module
    UploadModule,
  ],
})
export class AppModule {}
