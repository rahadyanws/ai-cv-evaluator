/**
 * The root module of the application.
 * This module imports all other feature modules and sets up
 * global providers like ConfigModule and BullModule.
 */
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

// --- Global Configuration ---
import { ConfigModule } from '@/modules/config/config.module';
import { BullConfigService } from '@/modules/config/bull.config';

// --- Foundation Modules ---
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { LlmModule } from '@/modules/llm/llm.module';
import { RagModule } from '@/modules/rag/rag.module';

// --- Feature Modules ---
import { JobsModule } from '@/modules/jobs/jobs.module';
import { UploadModule } from '@/modules/upload/upload.module';
import { EvaluateModule } from '@/modules/evaluate/evaluate.module';
import { WorkerModule } from '@/modules/worker/worker.module';
import { ResultModule } from '@/modules/result/result.module';

@Module({
  imports: [
    // --- Global Config & Services ---
    // Custom .env validation and configuration
    ConfigModule,
    // Asynchronous BullMQ (Redis Queue) setup
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useClass: BullConfigService,
    }),

    // --- Foundation Modules ---
    // Provides services used across multiple features
    PrismaModule, // Provides PrismaService for database access
    LlmModule, // Provides LlmService for AI (Gemini/OpenRouter)
    RagModule, // Provides RagService for Qdrant (Vector DB)

    // --- Feature Modules ---
    // Represents specific application features/endpoints
    JobsModule, // Manages Job/Result DB logic
    UploadModule, // POST /api/upload
    EvaluateModule, // POST /api/evaluate (Queue Producer)
    WorkerModule, // Background Queue Consumer
    ResultModule, // GET /api/result/:id
  ],
  // No controllers or providers at the root level,
  // everything is encapsulated in its own module.
})
export class AppModule {}
