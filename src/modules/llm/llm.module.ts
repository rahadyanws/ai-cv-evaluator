import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { ConfigModule } from '@nestjs/config'; // Pastikan ConfigModule di-impor

@Module({
  imports: [ConfigModule], // LlmService membutuhkan ConfigService
  providers: [LlmService],
  exports: [LlmService], // Ekspor service agar bisa dipakai modul lain
})
export class LlmModule {}
