/**
 * @file worker.module.ts
 * @description This module is responsible for the background AI processing.
 * It registers the BullMQ 'EVALUATION_QUEUE' processor
 * and provides the WorkerService that orchestrates the AI pipeline.
 */
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EVALUATION_QUEUE } from '@/constants';

// --- Foundation Modules ---
// Import modules whose services are required by this module's providers
import { JobsModule } from '@/modules/jobs/jobs.module';
import { LlmModule } from '@/modules/llm/llm.module';
import { RagModule } from '@/modules/rag/rag.module';

// --- Local Module Files ---
// Use relative paths for local files within the same module.
// Using global path aliases (e.g., '@/modules/worker/...') for
// sibling files can cause circular dependency issues at runtime.
import { EvaluationWorker } from './worker.processor';
import { WorkerService } from './worker.service';

/**
 * Encapsulates all background processing logic.
 * This module imports all necessary services (Jobs, LLM, RAG)
 * and provides them to the WorkerService and EvaluationWorker.
 */
@Module({
  imports: [
    // Register the 'evaluation' queue, making it available
    // for the @Processor() decorator in EvaluationWorker.
    BullModule.registerQueue({
      name: EVALUATION_QUEUE,
    }),

    // Import foundation modules needed by the WorkerService
    JobsModule, // Needed by WorkerService & EvaluationWorker
    LlmModule, // Needed by WorkerService
    RagModule, // Needed by WorkerService
  ],
  providers: [
    EvaluationWorker, // The BullMQ processor (consumer)
    WorkerService, // The service containing the core pipeline logic
  ],
  exports: [WorkerService], // Exported in case other modules need it
})
export class WorkerModule {}
