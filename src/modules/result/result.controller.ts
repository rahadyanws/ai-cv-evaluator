import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ResultService, FormattedResult } from './result.service';

/**
 * Controller untuk mengambil hasil evaluasi.
 * Sesuai arsitektur Anda: /src/modules/result
 */
@Controller('result') // Akan menjadi /api/result (jika ada global prefix)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ResultController {
  constructor(private readonly resultService: ResultService) {}

  /**
   * Endpoint GET /result/:id
   * Mengambil status dan hasil dari job evaluasi.
   * [Sesuai Case Study: GET /result/{id}]
   */
  @Get(':id')
  async getResult(
    @Param('id', ParseUUIDPipe) id: string, // Otomatis validasi bahwa 'id' adalah UUID
  ): Promise<FormattedResult> {
    // Panggil service untuk mengambil dan memformat hasil
    return this.resultService.getJobResult(id);
  }
}
