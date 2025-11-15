/**
 * @file app.module.ts
 * @description The root module of the application.
 * This module imports all other feature modules and sets up
 * global providers like ConfigModule, BullModule, and the global APP_GUARD.
 */
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';

// --- Global Configuration ---
import { ConfigModule } from '@/modules/config/config.module';
import { BullConfigService } from '@/modules/config/bull.config';

// --- Foundation Modules ---
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { LlmModule } from '@/modules/llm/llm.module';
import { RagModule } from '@/modules/rag/rag.module';
import { AuthModule } from '@/modules/auth/auth.module';

// --- Feature Modules ---
import { JobsModule } from '@/modules/jobs/jobs.module';
import { UploadModule } from '@/modules/upload/upload.module';
import { EvaluateModule } from '@/modules/evaluate/evaluate.module';
import { WorkerModule } from '@/modules/worker/worker.module';
import { ResultModule } from '@/modules/result/result.module';
import { ApiKeyAuthGuard } from '@/modules/auth/api-key.guard';

/**
 * The root module that bootstraps the entire application.
 * It assembles all other modules and registers global providers.
 */
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
    PrismaModule, // Provides PrismaService (Global)
    LlmModule, // Provides LlmService
    RagModule, // Provides RagService
    AuthModule, // Provides ApiKeyAuthGuard

    // --- Feature Modules ---
    // Represents specific application features/endpoints
    JobsModule, // Manages Job/Result DB logic
    UploadModule, // POST /api/upload
    EvaluateModule, // POST /api/evaluate (Queue Producer)
    WorkerModule, // Background Queue Consumer
    ResultModule, // GET /api/result/:id
  ],
  providers: [
    // Register the ApiKeyAuthGuard as a global guard.
    // This provider tells NestJS to use this guard
    // on EVERY single endpoint in the entire application.
    // NestJS can find ApiKeyAuthGuard because we imported AuthModule.
    {
      provide: APP_GUARD,
      useClass: ApiKeyAuthGuard,
    },
  ],
  // No controllers at the root level;
  // everything is encapsulated in its own module.
})
export class AppModule {}
