import { IsUUID } from 'class-validator';

/**
 * Data Transfer Object (DTO) untuk response dari POST /upload.
 * [Sesuai Case Study: "return each with it's own ID"]
 */
export class UploadResponseDto {
  @IsUUID()
  cvDocumentId: string;

  @IsUUID()
  reportDocumentId: string;
}
