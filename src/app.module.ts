import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@/modules/config/config.module'; // Modul Config Kustom Anda
import { BullConfigService } from '@/modules/config/bull.config';

// Modul-modul Fondasi
import { PrismaModule } from '@/modules/prisma/prisma.module';

// Modul-modul Fitur
import { UploadModule } from '@/modules/upload/upload.module';
import { EvaluateModule } from '@/modules/evaluate/evaluate.module';
import { JobsModule } from '@/modules/jobs/jobs.module';
import { WorkerModule } from '@/modules/worker/worker.module';
import { LlmModule } from '@/modules/llm/llm.module'; // <-- Daftarkan ini
import { RagModule } from '@/modules/rag/rag.module'; // <-- Daftarkan ini

@Module({
  imports: [
    // --- Konfigurasi Global ---
    ConfigModule, // Modul .env kustom Anda (sudah global)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useClass: BullConfigService,
    }),

    // --- Modul Fondasi ---
    PrismaModule,
    LlmModule, // Daftarkan LLM (dibutuhkan oleh RAG)
    RagModule, // Daftarkan RAG (dibutuhkan oleh Worker)

    // --- Modul Fitur ---
    UploadModule,
    JobsModule, // Daftarkan Jobs (dibutuhkan oleh Evaluate & Worker)
    EvaluateModule,
    WorkerModule,
  ],
})
export class AppModule {}
