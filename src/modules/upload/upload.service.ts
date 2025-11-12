import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { UploadResponseDto } from '@/modules/upload/dto/upload-response.dto';

@Injectable()
export class UploadService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Menyimpan metadata file ke database dalam satu transaksi.
   * @param cvFile File CV dari Multer
   * @param reportFile File Laporan Proyek dari Multer
   * @returns DTO berisi ID kedua dokumen yang baru dibuat
   */
  async saveFilesToDb(
    cvFile: Express.Multer.File,
    reportFile: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    try {
      // Gunakan $transaction untuk memastikan kedua file berhasil
      // dicatat ke DB atau tidak sama sekali (atomicity).
      const [cvDocument, reportDocument] = await this.prisma.$transaction([
        // 1. Buat record untuk CV
        this.prisma.document.create({
          data: {
            filename: cvFile.originalname,
            path: cvFile.path, // Path tempat file disimpan (misal: 'uploads/uuid-cv.pdf')
            type: 'cv',
          },
        }),
        // 2. Buat record untuk Laporan Proyek
        this.prisma.document.create({
          data: {
            filename: reportFile.originalname,
            path: reportFile.path,
            type: 'report',
          },
        }),
      ]);

      // Kembalikan ID sesuai DTO
      return {
        cvDocumentId: cvDocument.id,
        reportDocumentId: reportDocument.id,
      };
    } catch (error) {
      // Jika transaksi gagal, lempar error
      console.error('Failed to save document metadata:', error);
      throw new InternalServerErrorException('Failed to process files.');
    }
  }
}
