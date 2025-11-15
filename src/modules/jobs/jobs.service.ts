/**
 * @file jobs.service.ts
 * @description This service centralizes all database interactions
 * for the `Job` and `Result` models.
 * It is injected into other services (Evaluate, Worker, Result)
 * to keep database logic separate and clean.
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
// Use a type alias ('PrismaDocument') to avoid a name collision
// with the global DOM 'Document' type.
import {
  Job,
  Result,
  Prisma,
  Document as PrismaDocument,
} from '@prisma/client';

/**
 * A type helper defining the data structure for the AI evaluation results.
 * This is used by WorkerService when saving data.
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
   * Creates a new Job entry in the database with 'queued' status.
   * Called by EvaluateService.
   * @param title The job title from the evaluate request.
   * @param cvId The ID of the uploaded CV document.
   * @param reportId The ID of the uploaded Report document.
   */
  async createJob(
    // --- CRITICAL FIX ---
    // Changed signature from (data: { ... }) to match how EvaluateService calls it.
    title: string,
    cvId: string,
    reportId: string,
    // --- END FIX ---
  ): Promise<Job> {
    this.logger.log(`Creating new job for: ${title}`);
    try {
      const newJob = await this.prisma.job.create({
        data: {
          title: title,
          cvId: cvId,
          reportId: reportId,
          status: 'queued', // Set initial status
        },
      });
      return newJob;
    } catch (error) {
      // Handle known Prisma errors (e.g., unique constraint violation on cvId/reportId)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          this.logger.warn(
            `Job creation failed: CV or Report ID already exists in another job.`,
          );
        }
      }
      throw error; // Re-throw for the caller to handle
    }
  }

  /**
   * Updates the status of a job (e.g., 'processing', 'completed', 'failed').
   * Called by EvaluationWorker.
   * If the status is 'failed', it also upserts the error message to the
   * 'overallSummary' field in the related Result table for debugging.
   * @param jobId The ID of the job to update.
   * @param status The new status.
   * @param errorMessage An optional error message to save if status is 'failed'.
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
        // If status is 'failed', create/update the result entry
        // with the error message in the 'overallSummary' field.
        // We use 'overallSummary' as our schema doesn't have 'errorMessage'.
        result:
          status === 'failed'
            ? {
                upsert: {
                  create: {
                    overallSummary: errorMessage ?? 'Unknown error',
                  },
                  update: {
                    overallSummary: errorMessage ?? 'Unknown error',
                  },
                },
              }
            : undefined,
      },
    });
  }

  /**
   * Retrieves a job and its related document paths.
   * Called by WorkerService.
   * @param jobId The ID of the job to fetch.
   * @throws {NotFoundException} if the job doesn't exist.
   * @throws {InternalServerErrorException} if the job is missing document relations.
   */
  async getJobById(
    jobId: string,
  ): Promise<Job & { cv: PrismaDocument; report: PrismaDocument }> {
    this.logger.log(`Fetching job details for ID: ${jobId}`);
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        cv: true, // Include the related Document for the CV
        report: true, // Include the related Document for the Report
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }
    // This is a critical data integrity check
    if (!job.cv || !job.report) {
      throw new InternalServerErrorException(
        `Job ${jobId} is missing CV or Report document relations.`,
      );
    }
    return job as Job & { cv: PrismaDocument; report: PrismaDocument };
  }

  /**
   * Saves the final AI evaluation data to the Result table
   * and marks the Job as 'completed'.
   * This is executed in a transaction to ensure atomicity.
   * Called by WorkerService.
   * @param jobId The ID of the job to update.
   * @param resultData The structured AI evaluation data.
   */
  async saveEvaluationResult(
    jobId: string,
    resultData: EvaluationResultData,
  ): Promise<void> {
    this.logger.log(`Saving final AI result for Job ID: ${jobId}`);

    // Use a transaction to ensure both updates succeed or fail together.
    await this.prisma.$transaction(async (tx) => {
      // 1. Create or update the Result entry
      await tx.result.upsert({
        where: { jobId: jobId },
        create: {
          jobId: jobId,
          ...resultData,
        },
        update: {
          ...resultData,
        },
      });

      // 2. Mark the parent Job as 'completed'
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
   * Retrieves a job and its related result (if it exists).
   * Called by ResultService.
   * @param jobId The ID of the job to fetch.
   */
  async getJobWithResult(
    jobId: string,
  ): Promise<(Job & { result: Result | null }) | null> {
    this.logger.log(`Fetching job and result for ID: ${jobId}`);
    return this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        result: true, // Include the related Result
      },
    });
  }
}
