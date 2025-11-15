/**
 * @file evaluate.service.ts
 * @description This service handles the business logic for the
 * POST /api/evaluate endpoint. It acts as the "Producer"
 * for the AI evaluation job queue.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobsService } from '@/modules/jobs/jobs.service';
import { CreateEvaluationJobDto } from './dto'; // Uses the barrel file (index.ts)
import { EVALUATION_QUEUE, EVALUATION_JOB_NAME } from '@/constants';
import { Job } from '@prisma/client';

/**
 * Service responsible for initiating the AI evaluation process.
 * This service is the "Producer" in our queueing system.
 */
@Injectable()
export class EvaluateService {
  private readonly logger = new Logger(EvaluateService.name);

  /**
   * Injects the JobsService (for DB operations) and the BullMQ Queue.
   * @param jobsService The service to interact with the Job database.
   * @param evaluationQueue The BullMQ queue instance for adding jobs.
   */
  constructor(
    // 1. Inject JobsService (from JobsModule) for database interaction
    private readonly jobsService: JobsService,

    // 2. Inject the BullMQ queue named 'evaluation'
    @InjectQueue(EVALUATION_QUEUE)
    private readonly evaluationQueue: Queue,
  ) {}

  /**
   * Main logic for the POST /evaluate endpoint.
   * 1. Creates a new Job entry in the PostgreSQL database.
   * 2. Adds the job to the BullMQ (Redis) queue for background processing.
   * @param dto The validated DTO containing title, cvId, and reportId.
   * @returns The newly created Job object (with 'queued' status).
   */
  async createEvaluationJob(dto: CreateEvaluationJobDto): Promise<Job> {
    const { title, cvId, reportId } = dto;
    this.logger.log(`Received new evaluation request for: ${title}`);

    // Step 1: Create the Job entry in PostgreSQL
    // We delegate this to the centralized JobsService.
    const newJob = await this.jobsService.createJob(title, cvId, reportId);

    // Step 2: Add the job to the Redis queue for the worker to process
    // We use the centralized constant for the job name.
    await this.evaluationQueue.add(
      EVALUATION_JOB_NAME, // The specific name of the job
      {
        jobId: newJob.id, // The payload the worker will receive
      },
    );

    this.logger.log(`Job ${newJob.id} successfully added to the queue.`);
    return newJob;
  }
}
