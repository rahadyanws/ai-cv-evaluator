/**
 * @file upload.module.ts
 * @description The feature module for handling file uploads (POST /api/upload).
 * It bundles the controller and service responsible for this feature.
 */
import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

/**
 * Encapsulates the file upload feature.
 * It provides the UploadService and UploadController.
 * It does not need to import PrismaModule because PrismaModule is global.
 */
@Module({
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
