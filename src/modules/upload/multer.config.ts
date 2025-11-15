/**
 * @file multer.config.ts
 * @description Configures the Multer middleware for file uploads.
 * This includes storage destination, filename generation, and file filtering.
 * This config is kept separate from the controller for better Single Responsibility.
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import * as fs from 'fs';
// Import the centralized UPLOAD_DIR constant
import { UPLOAD_DIR } from '@/constants';

/**
 * Helper function to ensure the upload directory exists before saving a file.
 * @param dir The directory path to check.
 */
const ensureDirExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    // Create the directory recursively if it doesn't exist
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * Helper function to safely escape regex special characters from a string.
 * This prevents errors when creating a new RegExp from a file extension.
 * @param str The string to escape.
 */
const escapeRegExp = (str: string) => {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

/**
 * Exportable Multer configuration object.
 * This is imported by the UploadController.
 */
export const multerOptions = {
  /**
   * File validation (size and type).
   */
  limits: {
    fileSize: 1024 * 1024 * 10, // 10MB limit
  },

  /**
   * File filter to allow only PDFs.
   * This is a server-side validation.
   */
  fileFilter: (
    req: any,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (file.mimetype === 'application/pdf') {
      // Accept PDF files
      cb(null, true);
    } else {
      // Reject other file types
      cb(
        new HttpException(
          'File type not supported. Only PDF files are allowed.',
          HttpStatus.BAD_REQUEST,
        ),
        false,
      );
    }
  },

  /**
   * Storage configuration (destination and filename).
   */
  storage: diskStorage({
    /**
     * Sets the destination directory for uploaded files.
     */
    destination: (
      req: any,
      file: Express.Multer.File,
      cb: (error: Error | null, destination: string) => void,
    ) => {
      // Use the centralized UPLOAD_DIR constant
      ensureDirExists(UPLOAD_DIR);
      cb(null, UPLOAD_DIR);
    },
    /**
     * Generates a unique filename for the uploaded file to prevent conflicts.
     */
    filename: (
      req: any,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void,
    ) => {
      // Create a unique filename: uuid-safe-original-name.pdf
      const uniqueSuffix = uuidv4();
      const extension = extname(file.originalname);
      // Clean the original filename
      const safeOriginalName = file.originalname
        .replace(/\s/g, '_') // Replace spaces with underscores
        .replace(new RegExp(escapeRegExp(extension) + '$', 'i'), ''); // Safely remove extension

      const filename = `${uniqueSuffix}-${safeOriginalName}${extension}`;
      cb(null, filename);
    },
  }),
};
