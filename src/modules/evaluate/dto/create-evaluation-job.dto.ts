/**
 * @file create-evaluation-job.dto.ts
 * @description Defines the Data Transfer Object (DTO) for the POST /api/evaluate endpoint.
 * This class uses class-validator decorators to validate the incoming request body.
 */
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * Defines the expected JSON body for a POST /api/evaluate request.
 * The ValidationPipe in main.ts will automatically validate this DTO.
 */
export class CreateEvaluationJobDto {
  /**
   * The job title the candidate is applying for (e.g., "Product Engineer (Backend)").
   * This is used by the RAG service to query for the correct job description.
   * @example "Product Engineer (Backend)"
   */
  @IsString()
  @IsNotEmpty()
  title: string;

  /**
   * The unique UUID of the CV document.
   * This ID must be obtained from a successful POST /api/upload request.
   * @example "a1b2c3d4-xxxx-xxxx-xxxx-e5f6g7h8"
   */
  @IsUUID()
  @IsNotEmpty()
  cvId: string;

  /**
   * The unique UUID of the Project Report document.
   * This ID must be obtained from a successful POST /api/upload request.
   * @example "z9y8x7w6-xxxx-xxxx-xxxx-v5u4t3s2"
   */
  @IsUUID()
  @IsNotEmpty()
  reportId: string;
}
