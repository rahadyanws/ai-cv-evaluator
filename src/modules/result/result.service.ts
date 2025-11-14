import { Injectable, NotFoundException } from '@nestjs/common';
import { JobsService } from '@/modules/jobs/jobs.service';
// ⛔️ JANGAN GUNAKAN: import { Job, Result } from '@db';
// ✅ GUNAKAN INI (Sesuai tsconfig.json Anda):
import { Job, Result } from '@prisma/client';

// Tipe data yang akan kita kembalikan, gabungan dari Job dan Result
export type FormattedResult = {
  id: string;
  status: string;
  result?: {
    cv_match_rate: number | null;
    cv_feedback: string | null;
    project_score: number | null;
    project_feedback: string | null;
    overall_summary: string | null;
  };
};

@Injectable()
export class ResultService {
  constructor(private readonly jobsService: JobsService) {}

  /**
   * Mengambil hasil job berdasarkan ID.
   * Ini akan memformat data agar sesuai dengan Case Study.
   */
  async getJobResult(jobId: string): Promise<FormattedResult> {
    const job = await this.jobsService.getJobWithResult(jobId);

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // Format respons sesuai dengan Case Study [cite: 37-53]
    return this.formatResult(job);
  }

  /**
   * Helper privat untuk memformat data dari DB
   * agar sesuai dengan respons API yang diminta.
   */
  private formatResult(job: Job & { result: Result | null }): FormattedResult {
    // Kasus 1: Job masih 'queued' or 'processing', 'result' belum ada
    if (!job.result || job.status !== 'completed') {
      return {
        id: job.id,
        status: job.status, // "queued" or "processing" or "failed"
      };
    }

    // Kasus 2: Job sudah 'completed', 'result' ada
    return {
      id: job.id,
      status: job.status, // "completed"
      result: {
        cv_match_rate: job.result.cvMatchRate,
        cv_feedback: job.result.cvFeedback,
        project_score: job.result.projectScore,
        project_feedback: job.result.projectFeedback,
        overall_summary: job.result.overallSummary,
      },
    };
  }
}
