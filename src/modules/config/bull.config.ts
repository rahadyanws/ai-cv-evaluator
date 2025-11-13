import { Injectable, Inject } from '@nestjs/common';
import {
  SharedBullConfigurationFactory, // <-- DIUBAH DARI BullModuleOptionsFactory
  BullRootModuleOptions, // <-- DIUBAH DARI BullModuleOptions
} from '@nestjs/bullmq';
import { ConfigType } from '@nestjs/config';
import { redisConfig } from './configuration';

/**
 * Factory service untuk konfigurasi root BullMQ.
 * Ini akan mengambil konfigurasi 'redis' yang sudah divalidasi.
 */
@Injectable()
export class BullConfigService implements SharedBullConfigurationFactory {
  // <-- DIUBAH
  constructor(
    @Inject(redisConfig.KEY)
    private readonly config: ConfigType<typeof redisConfig>,
  ) {}

  /**
   * Metode ini dipanggil oleh BullModule.forRootAsync
   */
  createSharedConfiguration(): BullRootModuleOptions {
    // <-- DIUBAH
    return {
      // Opsi default untuk semua queue
      defaultJobOptions: {
        attempts: 3, // Coba lagi 3 kali jika gagal
        backoff: {
          type: 'exponential',
          delay: 5000, // Tunggu 5 detik sebelum coba lagi
        },
        removeOnComplete: true, // Hapus job dari redis setelah selesai
        removeOnFail: false, // Simpan job jika gagal untuk debugging
      },
      // Koneksi ke Redis
      connection: {
        host: this.config.host,
        port: this.config.port,
      },
    };
  }
}
