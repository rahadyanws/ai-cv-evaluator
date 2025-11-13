import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EvaluateService } from './evaluate.service';
import { CreateEvaluationJobDto } from '@/modules/evaluate/dto';

@Controller('evaluate') // Akan menjadi /api/evaluate (jika ada global prefix)
export class EvaluateController {
  constructor(private readonly evaluateService: EvaluateService) {}

  /**
   * Endpoint POST /evaluate
   * Memicu proses evaluasi AI secara asinkron.
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED) // 202 Accepted, karena prosesnya asinkron
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async triggerEvaluation(@Body() dto: CreateEvaluationJobDto) {
    const job = await this.evaluateService.createEvaluationJob(dto);

    // Kembalikan respons sesuai case study [cite: 31-36]
    return {
      id: job.id,
      status: job.status,
    };
  }
}
