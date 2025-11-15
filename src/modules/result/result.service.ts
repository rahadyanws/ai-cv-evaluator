/**
 * @file result.service.ts
 * @description This service handles the business logic for the
 * GET /api/result/:id endpoint. It retrieves the job status
 * and formats the final result.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JobsService } from '@/modules/jobs/jobs.service';
// Import Prisma types from the generated client
import { Job, Result } from '@prisma/client';

/**
 * Defines the API response shape for the GET /api/result/:id endpoint.
 * This matches the structure requested in the case study.
 */
export type JobResultResponse = {
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

/**
 * Service responsible for fetching and formatting evaluation job results.
 */
@Injectable()
export class ResultService {
  private readonly logger = new Logger(ResultService.name);

  constructor(private readonly jobsService: JobsService) {}

  /**
   * Retrieves and formats a job's status and result by its ID.
   * This is the main logic for the GET /api/result/:id endpoint.
   * @param jobId The UUID of the job to fetch.
   * @returns A formatted job result object.
   * @throws {NotFoundException} If no job is found with the given ID.
   */
  async getJobResult(jobId: string): Promise<JobResultResponse> {
    this.logger.log(`Fetching result for Job ID: ${jobId}`);
    // Delegate the database call to the centralized JobsService
    const job = await this.jobsService.getJobWithResult(jobId);

    if (!job) {
      this.logger.warn(`Job not found with ID: ${jobId}`);
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // Pass the job to the private formatter helper
    return this.formatResult(job);
  }

  /**
   * A private helper to format the raw database object
   * into the standardized API response.
   * @param job The job object retrieved from the database.
   */
  private formatResult(
    job: Job & { result: Result | null },
  ): JobResultResponse {
    // Case 1: Job is not 'completed' (e.g., 'queued', 'processing', 'failed')
    // or the result data somehow doesn't exist.
    // Return the simple status response as per the case study.
    if (job.status !== 'completed' || !job.result) {
      return {
        id: job.id,
        status: job.status,
      };
    }

    // Case 2: Job is 'completed' and has a result.
    // Return the full, detailed response.
    return {
      id: job.id,
      status: job.status,
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
