import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobsService } from '@/modules/jobs/jobs.service';
import { CreateEvaluationJobDto } from '@/modules/evaluate/dto';
import { EVALUATION_QUEUE } from '@/constants';
import { Job } from '@prisma/client';

@Injectable()
export class EvaluateService {
  constructor(
    // 1. Inject JobsService (dari JobsModule) untuk interaksi DB
    private readonly jobsService: JobsService,

    // 2. Inject BullMQ Queue dengan nama 'evaluation'
    @InjectQueue(EVALUATION_QUEUE)
    private readonly evaluationQueue: Queue,
  ) {}

  /**
   * Logika utama untuk endpoint POST /evaluate
   * 1. Buat entri Job di database
   * 2. Tambahkan job ke queue BullMQ untuk diproses worker
   */
  async createEvaluationJob(dto: CreateEvaluationJobDto): Promise<Job> {
    const { title, cvId, reportId } = dto;

    // Langkah 1: Buat entri Job di PostgreSQL
    // Kita panggil JobsService (sesuai arsitektur Anda)
    const newJob = await this.jobsService.createJob({
      title,
      cvId,
      reportId,
    });

    // Langkah 2: Kirim job ke Redis (BullMQ) untuk diproses
    // 'evaluate-job' adalah nama tugasnya (bisa apa saja)
    // Datanya adalah jobId, yang akan diambil oleh worker
    await this.evaluationQueue.add('evaluate-job', {
      jobId: newJob.id,
    });

    return newJob;
  }
}
