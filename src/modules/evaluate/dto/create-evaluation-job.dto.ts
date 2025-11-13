import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * DTO (Data Transfer Object) untuk memvalidasi body
 * dari request POST /evaluate
 */
export class CreateEvaluationJobDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsUUID()
  @IsNotEmpty()
  cvId: string; // ID dari tabel Document (didapat dari /upload)

  @IsUUID()
  @IsNotEmpty()
  reportId: string; // ID dari tabel Document (didapat dari /upload)
}
