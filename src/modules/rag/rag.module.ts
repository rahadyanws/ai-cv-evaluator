/**
 * @file rag.module.ts
 * @description This module encapsulates the RagService, which handles
 * all Retrieval-Augmented Generation (RAG) logic, including
 * document ingestion and context retrieval from the Qdrant vector DB.
 */
import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { LlmModule } from '@/modules/llm/llm.module';

/**
 * Provides and exports the RagService.
 *
 * It imports `LlmModule` because the `RagService` has a dependency
 * on the `LlmService` (to generate embeddings for ingestion and queries).
 */
@Module({
  imports: [LlmModule], // Required for LlmService injection
  providers: [RagService],
  exports: [RagService], // Exported for injection in WorkerModule
})
export class RagModule {}
