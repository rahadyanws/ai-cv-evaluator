/**
 * @file upload-response.dto.ts
 * @description Defines the data structure for the response of the POST /api/upload endpoint.
 * It uses class-validator decorators to ensure type safety (at runtime via ValidationPipe).
 */
import { IsUUID } from 'class-validator';

/**
 * Data Transfer Object (DTO) for the successful response of the POST /api/upload endpoint.
 * It returns the unique IDs of the newly created database entries for the uploaded files.
 */
export class UploadResponseDto {
  /**
   * The unique UUID (v4) of the saved CV document record in the database.
   * This ID is used to reference the CV in the POST /api/evaluate request.
   * @example "a1b2c3d4-xxxx-xxxx-xxxx-e5f6g7h8"
   */
  @IsUUID()
  cvDocumentId: string;

  /**
   * The unique UUID (v4) of the saved Project Report document record in the database.
   * This ID is used to reference the report in the POST /api/evaluate request.
   * @example "z9y8x7w6-xxxx-xxxx-xxxx-v5u4t3s2"
   */
  @IsUUID()
  reportDocumentId: string;
}
