import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    // Impor PrismaModule agar PrismaService tersedia
    PrismaModule,
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
