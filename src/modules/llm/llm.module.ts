/**
 * @file llm.module.ts
 * @description This module encapsulates the LlmService, making it available
 * for dependency injection throughout the application.
 */
import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';

/**
 * Provides and exports the LlmService.
 * This module is imported by other modules (like RagModule and WorkerModule)
 * that need to perform AI operations.
 */
@Module({
  providers: [LlmService],
  exports: [LlmService], // Exported for injection in other modules
})
export class LlmModule {}
