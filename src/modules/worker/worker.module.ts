import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EVALUATION_QUEUE } from '@/constants/queues';
import { JobsModule } from '@/modules/jobs/jobs.module';
import { EvaluationWorker } from '@/modules/worker/worker.processor';
import { WorkerService } from '@/modules/worker/worker.service';

// --- 👇 REVISI: Impor Modul AI 👇 ---
import { LlmModule } from '@/modules/llm/llm.module';
import { RagModule } from '@/modules/rag/rag.module';
// --- 👆 REVISI 👆 ---

@Module({
  imports: [
    // 1. Daftarkan 'evaluation' queue
    BullModule.registerQueue({
      name: EVALUATION_QUEUE,
    }),

    // 2. Impor modul-modul yang layanannya (services)
    //    dibutuhkan oleh provider di modul ini
    JobsModule, // Dibutuhkan oleh WorkerService & EvaluationWorker
    LlmModule, // Dibutuhkan oleh WorkerService
    RagModule, // Dibutuhkan oleh WorkerService
  ],
  providers: [
    EvaluationWorker, // Processor BullMQ
    WorkerService, // Service yang berisi logika AI
  ],
  exports: [WorkerService], // Ekspor jika ada modul lain yang butuh
})
export class WorkerModule {}
