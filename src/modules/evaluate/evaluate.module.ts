import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EvaluateController } from './evaluate.controller';
import { EvaluateService } from './evaluate.service';
import { EVALUATION_QUEUE } from '@/constants';
import { JobsModule } from '@/modules/jobs/jobs.module';

@Module({
  imports: [
    // 1. Impor JobsModule agar bisa meng-inject JobsService
    JobsModule,

    // 2. Daftarkan 'evaluation' queue
    BullModule.registerQueue({
      name: EVALUATION_QUEUE,
    }),
  ],
  controllers: [EvaluateController],
  providers: [EvaluateService],
})
export class EvaluateModule {}
