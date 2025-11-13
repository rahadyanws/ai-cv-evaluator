import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EVALUATION_QUEUE } from '@/constants/queues';
import { Logger } from '@nestjs/common';
import { JobsService } from '@/modules/jobs/jobs.service';
import { WorkerService } from './worker.service'; // Service untuk logika AI

@Processor(EVALUATION_QUEUE, {
  // Kita bisa atur konkurensi, misal hanya 1 job AI berat dalam satu waktu
  concurrency: 1,
})
export class EvaluationWorker extends WorkerHost {
  private readonly logger = new Logger(EvaluationWorker.name);

  constructor(
    private readonly jobsService: JobsService,
    // Inject service utama untuk pipeline AI
    private readonly workerService: WorkerService,
  ) {
    super();
  }

  /**
   * Ini adalah metode utama yang memproses job.
   * Dipanggil oleh BullMQ v5.
   */
  async process(job: Job<{ jobId: string }>): Promise<any> {
    // Cek tipe data job.data (terkadang bisa undefined)
    if (!job.data || !job.data.jobId) {
      this.logger.error(`Job ${job.id} has invalid data.`, job.data);
      throw new Error(`Invalid job data for job ${job.id}`);
    }

    const { jobId } = job.data;
    this.logger.log(`Processing job ${job.id} (Job ID: ${jobId})...`);

    // Pastikan kita hanya memproses job dengan nama yang benar
    if (job.name === 'evaluate-job') {
      try {
        // 1. Tandai job sebagai "processing"
        await this.jobsService.updateJobStatus(jobId, 'processing');

        // 2. Delegasikan semua pekerjaan berat ke WorkerService
        // Ini akan menjalankan: PDF -> RAG -> LLM -> Save Result
        await this.workerService.runAIPipeline(jobId);

        // 3. runAIPipeline akan menyimpan hasil dan menandai 'completed'
        this.logger.log(`Job ${job.id} (Job ID: ${jobId}) completed.`);
        return 'completed'; // Kembalikan hasil (opsional)
      } catch (error) {
        this.logger.error(
          `Job ${job.id} (Job ID: ${jobId}) failed: ${error.message}`,
          error.stack,
        );
        // 4. Tandai job sebagai "failed" jika terjadi error
        // updateJobStatus akan menangani penyimpanan pesan error
        await this.jobsService.updateJobStatus(jobId, 'failed', error.message);
        throw error; // Lempar error agar BullMQ tahu job ini gagal
      }
    } else {
      this.logger.warn(`Unknown job name: ${job.name}`);
      throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  // --- Event Listeners (untuk Logging) ---

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(
      `Job ${job.id} (Job ID: ${job.data?.jobId || 'N/A'}) has started.`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any) {
    this.logger.log(
      `Job ${job.id} (Job ID: ${job.data?.jobId || 'N/A'}) has completed!`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: any) {
    this.logger.error(
      `Job ${job.id} (Job ID: ${job.data?.jobId || 'N/A'}) has failed with error: ${err.message}`,
    );
  }
}
