import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { LlmModule } from '@/modules/llm/llm.module'; // RagService butuh LlmService

@Module({
  imports: [LlmModule], // Impor LlmModule di sini
  providers: [RagService],
  exports: [RagService], // Ekspor service agar bisa dipakai WorkerService
})
export class RagModule {}
