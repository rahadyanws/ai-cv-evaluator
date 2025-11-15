/**
 * @file index.ts
 * @description Barrel file for exporting all Data Transfer Objects (DTOs)
 * from the Upload module. This simplifies import paths for other modules.
 *
 * @example
 * // Before: import { UploadResponseDto } from '@/modules/upload/dto/upload-response.dto';
 * // After:  import { UploadResponseDto } from '@/modules/upload/dto';
 */
export * from './upload-response.dto';
