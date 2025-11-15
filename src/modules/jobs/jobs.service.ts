import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException, // <-- PERBAIKAN 1: Impor ditambahkan
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
// --- 👇 PERBAIKAN 2: Impor 'Document' sebagai 'PrismaDocument' untuk menghindari konflik 👇 ---
import {
  Job,
  Result,
  Prisma,
  Document as PrismaDocument, // Ganti nama 'Document'
} from '@prisma/client';
// --- 👆 PERBAIKAN 2 👆 ---

/**
 * Tipe data helper untuk data yang akan disimpan ke tabel Result.
 * Akan digunakan oleh WorkerService.
 */
export type EvaluationResultData = {
  cvMatchRate: number;
  cvFeedback: string;
  projectScore: number;
  projectFeedback: string;
  overallSummary: string;
};

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Membuat entri Job baru di database.
   * Dipanggil oleh EvaluateService.
   */
  async createJob(data: {
    title: string;
    cvId: string;
    reportId: string;
  }): Promise<Job> {
    this.logger.log(`Creating new job for: ${data.title}`);
    try {
      const newJob = await this.prisma.job.create({
        data: {
          title: data.title,
          cvId: data.cvId,
          reportId: data.reportId,
          status: 'queued', // Status awal
        },
      });
      return newJob;
    } catch (error) {
      // Tangani error jika cvId atau reportId unik constraint gagal
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          this.logger.warn(
            `Job creation failed: CV or Report ID already exists in another job.`,
          );
        }
      }
      throw error;
    }
  }

  /**
   * Memperbarui status job (queued -> processing -> completed/failed).
   * Dipanggil oleh EvaluationWorker (processor).
   */
  async updateJobStatus(
    jobId: string,
    status: 'processing' | 'completed' | 'failed',
    errorMessage?: string,
  ): Promise<Job> {
    this.logger.log(`Updating job ${jobId} status to: ${status}`);
    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: status,
        // --- 👇 PERBAIKAN 4: Simpan error di 'overallSummary' (karena 'errorMessage' tidak ada) 👇 ---
        result:
          status === 'failed'
            ? {
                upsert: {
                  // Buat atau update entri Result dengan pesan error
                  create: {
                    overallSummary: errorMessage ?? 'Unknown error', // Gunakan 'overallSummary'
                  },
                  update: {
                    overallSummary: errorMessage ?? 'Unknown error', // Gunakan 'overallSummary'
                  },
                },
              }
            : undefined,
        // --- 👆 PERBAIKAN 4 👆 ---
      },
    });
  }

  /**
   * Mengambil detail job, termasuk path file dari relasi Document.
   * Dipanggil oleh WorkerService.
   */
  // --- 👇 PERBAIKAN 3: Gunakan 'PrismaDocument' sebagai tipe data 👇 ---
  async getJobById(
    jobId: string,
  ): Promise<Job & { cv: PrismaDocument; report: PrismaDocument }> {
    // --- 👆 PERBAIKAN 3 👆 ---
    this.logger.log(`Fetching job details for ID: ${jobId}`);
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        cv: true, // Sertakan data dari tabel Document (relasi JobCV)
        report: true, // Sertakan data dari tabel Document (relasi JobReport)
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }
    if (!job.cv || !job.report) {
      throw new InternalServerErrorException(
        `Job ${jobId} is missing CV or Report document relations.`,
      );
    }
    // --- 👇 PERBAIKAN 3: Gunakan 'PrismaDocument' sebagai tipe data 👇 ---
    return job as Job & { cv: PrismaDocument; report: PrismaDocument };
    // --- 👆 PERBAIKAN 3 👆 ---
  }

  /**
   * Menyimpan hasil evaluasi AI ke tabel Result
   * dan menandai Job sebagai "completed".
   * Dipanggil oleh WorkerService.
   */
  async saveEvaluationResult(
    jobId: string,
    resultData: EvaluationResultData,
  ): Promise<void> {
    this.logger.log(`Saving final AI result for Job ID: ${jobId}`);

    // Gunakan transaksi agar kedua operasi (update Job dan create Result)
    // berhasil atau gagal bersamaan.
    await this.prisma.$transaction(async (tx) => {
      // 1. Buat (atau update) entri Result
      await tx.result.upsert({
        where: { jobId: jobId },
        create: {
          jobId: jobId,
          ...resultData,
        },
        update: {
          ...resultData,
          // --- 👇 PERBAIKAN 4: Hapus 'errorMessage' (karena tidak ada di skema) 👇 ---
          // errorMessage: null, // Hapus pesan error jika ada (dari retry)
          // --- 👆 PERBAIKAN 4 👆 ---
        },
      });

      // 2. Tandai Job sebagai 'completed'
      await tx.job.update({
        where: { id: jobId },
        data: {
          status: 'completed',
        },
      });
    });

    this.logger.log(`Job ${jobId} successfully marked as 'completed'.`);
  }

  /**
   * Mengambil Job DAN Result terkait (jika ada).
   * Dipanggil oleh ResultService.
   */
  async getJobWithResult(
    jobId: string,
  ): Promise<(Job & { result: Result | null }) | null> {
    this.logger.log(`Fetching job and result for ID: ${jobId}`);
    return this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        result: true, // Sertakan data dari tabel Result
      },
    });
  }
}
