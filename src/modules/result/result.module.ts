import { Module } from '@nestjs/common';
import { ResultService } from './result.service';
import { ResultController } from './result.controller';
import { JobsModule } from '@/modules/jobs/jobs.module';

/**
 * Modul untuk endpoint GET /result/:id
 * Sesuai arsitektur Anda: /src/modules/result
 */
@Module({
  imports: [
    // Impor JobsModule agar kita bisa meng-inject
    // JobsService ke dalam ResultService
    JobsModule,
  ],
  controllers: [ResultController],
  providers: [ResultService],
})
export class ResultModule {}
