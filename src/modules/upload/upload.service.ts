/**
 * @file upload.service.ts
 * @description Service for the upload module.
 * Handles the business logic of saving file metadata to the database.
 */
import {
  Injectable,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { UploadResponseDto } from './dto';
// Import Prisma types, including the error type
import { Prisma } from '@prisma/client';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates files and saves their metadata to the database in a transaction.
   * This logic was moved from the controller to keep it "thin".
   *
   * @param files The file objects from the @UploadedFiles() decorator.
   * @returns A DTO containing the new document IDs.
   */
  async saveFilesToDb(files: {
    cv?: Express.Multer.File[];
    report?: Express.Multer.File[];
  }): Promise<UploadResponseDto> {
    // Validation logic now lives in the service layer.
    if (!files.cv || !files.report) {
      this.logger.warn('Upload attempt failed: Missing "cv" or "report" file.');
      throw new HttpException(
        'Both "cv" and "report" files are required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get the first file (as maxCount is 1)
    const cvFile = files.cv[0];
    const reportFile = files.report[0];

    try {
      // Use a $transaction to ensure both files are saved or none are (atomicity).
      const [cvDocument, reportDocument] = await this.prisma.$transaction([
        // 1. Create record for the CV
        this.prisma.document.create({
          data: {
            filename: cvFile.originalname,
            path: cvFile.path, // Path where Multer stored the file
            type: 'cv',
          },
        }),
        // 2. Create record for the Project Report
        this.prisma.document.create({
          data: {
            filename: reportFile.originalname,
            path: reportFile.path,
            type: 'report',
          },
        }),
      ]);

      // Return the new IDs as per the DTO
      return {
        cvDocumentId: cvDocument.id,
        reportDocumentId: reportDocument.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to save document metadata: ${error.message}`,
        error.stack,
      );
      // Handle potential Prisma transaction errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // e.g., unique constraint violation, foreign key, etc.
        throw new InternalServerErrorException(`Database error: ${error.code}`);
      }
      throw new InternalServerErrorException('Failed to process files.');
    }
  }
}
