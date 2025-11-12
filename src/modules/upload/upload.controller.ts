import {
  Controller,
  FileTypeValidator,
  HttpException,
  HttpStatus,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { UploadService } from '@/modules/upload/upload.service';
import { UploadResponseDto } from '@/modules/upload/dto';

// Konfigurasi penyimpanan disk lokal
const UPLOAD_DIR = './uploads';

// Fungsi helper untuk memastikan direktori ada
const ensureDirExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

export const multerOptions = {
  // 1. Validasi Ukuran & Tipe File
  limits: {
    fileSize: 1024 * 1024 * 10, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(
        new HttpException(
          'File type not supported. Only PDF files are allowed.',
          HttpStatus.BAD_REQUEST,
        ),
        false,
      );
    }
  },
  // 2. Konfigurasi Penyimpanan
  storage: diskStorage({
    destination: (req, file, cb) => {
      ensureDirExists(UPLOAD_DIR); // Pastikan folder /uploads ada
      cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
      // Buat nama file unik: uuid-nam-asli.pdf
      const uniqueSuffix = uuidv4();
      const extension = extname(file.originalname);
      const filename = `${uniqueSuffix}-${file.originalname
        .replace(/\s/g, '_') // Ganti spasi dengan _
        .replace(extension, '')}${extension}`;
      cb(null, filename);
    },
  }),
};

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Endpoint untuk mengunggah CV dan Laporan Proyek
   * Menerima 'cv' dan 'report' dalam satu request multipart/form-data.
   * [Sesuai Case Study: POST /upload]
   */
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cv', maxCount: 1 },
        { name: 'report', maxCount: 1 },
      ],
      multerOptions,
    ),
  )
  async uploadFiles(
    @UploadedFiles()
    files: {
      cv?: Express.Multer.File[];
      report?: Express.Multer.File[];
    },
  ): Promise<UploadResponseDto> {
    // Pastikan kedua file ada
    if (!files.cv || !files.report) {
      throw new HttpException(
        'Both "cv" and "report" files are required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const cvFile = files.cv[0];
    const reportFile = files.report[0];

    // Panggil service untuk menyimpan metadata ke DB
    return this.uploadService.saveFilesToDb(cvFile, reportFile);
  }
}
