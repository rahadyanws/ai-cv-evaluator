import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Job, Document } from '@prisma/client';

/**
 * Tipe data untuk hasil evaluasi yang akan disimpan.
 * Ini harus cocok dengan apa yang dikembalikan oleh LlmService.
 * Kita ekspor agar WorkerService bisa menggunakannya.
 */
export interface EvaluationResultData {
  cvMatchRate: number;
  projectScore: number;
  cvFeedback: string;
  projectFeedback: string;
  overallSummary: string;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * (Dari EvaluateModule)
   * Membuat job baru di database
   */
  async createJob(data: {
    title: string;
    cvId: string;
    reportId: string;
  }): Promise<Job> {
    this.logger.log(`Creating new job for: ${data.title}`);
    return this.prisma.job.create({
      data: {
        title: data.title,
        cvId: data.cvId,
        reportId: data.reportId,
        status: 'queued', // Status awal
      },
    });
  }

  /**
   * (BARU - Dipakai oleh WorkerService)
   * Mengambil data job, termasuk relasi ke Dokumen (untuk mendapatkan file path)
   */
  async getJobById(
    jobId: string,
  ): Promise<Job & { cv: Document; report: Document }> {
    this.logger.log(`Fetching job details for ID: ${jobId}`);
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        cv: true, // Sertakan data Dokumen CV
        report: true, // Sertakan data Dokumen Laporan
      },
    });

    if (!job) {
      this.logger.warn(`Job not found with ID: ${jobId}`);
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }
    return job;
  }

  /**
   * (DIREVISI - Dipakai oleh WorkerProcessor)
   * Memperbarui status job (queued -> processing -> failed)
   */
  async updateJobStatus(jobId: string, status: string, errorMessage?: string) {
    this.logger.log(`Updating job ${jobId} status to: ${status}`);

    // Jika status 'failed', kita simpan pesan error ke tabel Result
    // dan update status Job dalam satu transaksi
    if (status === 'failed' && errorMessage) {
      return this.prisma.$transaction(async (tx) => {
        // 1. Buat/Update entri Result dengan pesan error
        await tx.result.upsert({
          where: { jobId: jobId },
          create: {
            jobId: jobId,
            overallSummary: errorMessage, // Simpan pesan error di sini
          },
          update: {
            overallSummary: errorMessage,
          },
        });

        // 2. Update status Job
        return tx.job.update({
          where: { id: jobId },
          data: { status: 'failed' },
        });
      });
    }

    // Jika status lain (misal: 'processing'), update Job saja
    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: status,
      },
    });
  }

  /**
   * (BARU - Dipakai oleh WorkerService)
   * Menyimpan hasil evaluasi AI ke tabel Result
   * dan menandai job sebagai 'completed'.
   * Dilakukan dalam satu transaksi atomik.
   */
  async saveEvaluationResult(jobId: string, resultData: EvaluationResultData) {
    this.logger.log(`Saving final AI result for Job ID: ${jobId}`);

    return this.prisma.$transaction(async (tx) => {
      // 1. Buat (atau update jika sudah ada) entri di tabel Result
      const result = await tx.result.upsert({
        where: { jobId: jobId },
        create: {
          jobId: jobId,
          cvMatchRate: resultData.cvMatchRate,
          projectScore: resultData.projectScore,
          cvFeedback: resultData.cvFeedback,
          projectFeedback: resultData.projectFeedback,
          overallSummary: resultData.overallSummary,
        },
        update: {
          cvMatchRate: resultData.cvMatchRate,
          projectScore: resultData.projectScore,
          cvFeedback: resultData.cvFeedback,
          projectFeedback: resultData.projectFeedback,
          overallSummary: resultData.overallSummary,
        },
      });

      // 2. Update status Job menjadi 'completed'
      const updatedJob = await tx.job.update({
        where: { id: jobId },
        data: {
          status: 'completed',
        },
      });

      this.logger.log(`Job ${jobId} successfully marked as 'completed'.`);
      return { job: updatedJob, result: result };
    });
  }
}
