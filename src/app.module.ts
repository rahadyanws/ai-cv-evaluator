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
import { LlmModule } from '@/modules/llm/llm.module';
import { RagModule } from '@/modules/rag/rag.module';
import { ResultModule } from '@/modules/result/result.module'; // Modul terakhir

/**
 * Modul root (utama) dari aplikasi.
 * Bertanggung jawab untuk mengimpor semua modul fitur
 * dan mengkonfigurasi layanan global (Config, BullMQ).
 */
@Module({
  imports: [
    // --- Konfigurasi Global ---
    ConfigModule, // Modul .env kustom Anda (sudah global)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useClass: BullConfigService, // Menggunakan factory untuk koneksi Redis
    }),

    // --- Modul Fondasi ---
    // Modul-modul ini menyediakan layanan yang digunakan di banyak tempat
    PrismaModule, // Menyediakan PrismaService
    LlmModule, // Menyediakan LlmService (dibutuhkan oleh RAG & Worker)
    RagModule, // Menyediakan RagService (dibutuhkan oleh Worker)

    // --- Modul Fitur ---
    // Modul-modul ini mewakili fitur/endpoint spesifik
    UploadModule, // Endpoint POST /upload
    JobsModule, // Service untuk mengelola DB (dibutuhkan oleh Evaluate, Worker, Result)
    EvaluateModule, // Endpoint POST /evaluate
    WorkerModule, // Prosesor queue BullMQ di latar belakang
    ResultModule, // Endpoint GET /result/:id
  ],
  // Tidak perlu controller atau provider di sini
  // karena semua sudah ditangani di dalam modul masing-masing.
})
export class AppModule {}
