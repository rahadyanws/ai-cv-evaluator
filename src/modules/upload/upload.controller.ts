/**
 * @file upload.controller.ts
 * @description Controller for handling file uploads.
 * Defines the POST /api/upload endpoint.
 */
import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  // Import HttpException and HttpStatus if you need them for custom errors
  // (though most logic is now in the service)
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { UploadResponseDto } from './dto';
// Import the centralized Multer configuration
import { multerOptions } from './multer.config';

/**
 * Controller responsible for the /api/upload route.
 * Its only job is to receive the request and delegate logic to the UploadService.
 */
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Handles the POST /api/upload endpoint.
   * [Corresponds to Case Study: POST /upload]
   *
   * Accepts 'cv' and 'report' files in a single multipart/form-data request
   * using the defined multerOptions interceptor.
   */
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cv', maxCount: 1 }, // Field name for CV
        { name: 'report', maxCount: 1 }, // Field name for Project Report
      ],
      multerOptions, // Apply our external storage and validation rules
    ),
  )
  async uploadFiles(
    @UploadedFiles()
    files: {
      cv?: Express.Multer.File[];
      report?: Express.Multer.File[];
    },
  ): Promise<UploadResponseDto> {
    // All validation logic (e.g., checking if files exist)
    // is now handled in the UploadService to keep the controller clean.
    return this.uploadService.saveFilesToDb(files);
  }
}
