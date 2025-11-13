import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validationSchema } from './validation';
import { appConfig, redisConfig } from './configuration';
import { BullConfigService } from './bull.config';

/**
 * Modul utama untuk Konfigurasi.
 * Bertanggung jawab untuk:
 * 1. Memuat dan memvalidasi .env
 * 2. Menyediakan (provide) BullConfigService
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true, // Membuat ConfigService tersedia di semua modul
      cache: true,
      load: [appConfig, redisConfig], // Memuat konfigurasi namespaced
      validationSchema: validationSchema, // Menerapkan validasi Joi
    }),
  ],
  providers: [BullConfigService],
  exports: [BullConfigService], // Ekspor agar bisa dipakai di AppModule
})
export class ConfigModule {}
