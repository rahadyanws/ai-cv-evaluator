/**
 * @file worker.processor.ts
 * @description This is the BullMQ Queue Consumer (Processor).
 * It listens for jobs on the EVALUATION_QUEUE and delegates
 * the heavy AI processing to the WorkerService.
 * This file also handles the core resilience logic (retries).
 */
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EVALUATION_QUEUE, EVALUATION_JOB_NAME } from '@/constants';
import { Logger } from '@nestjs/common';
import { JobsService } from '@/modules/jobs/jobs.service';
import { WorkerService } from './worker.service';

/**
 * A BullMQ processor class that consumes jobs from the EVALUATION_QUEUE.
 *
 * @Processor decorator registers this class as a listener for the queue.
 * @concurrency: 1 ensures that only one heavy AI job runs at a time,
 * preventing resource exhaustion and potential API rate limiting.
 */
@Processor(EVALUATION_QUEUE, {
  concurrency: 1, // Process one job at a time
})
export class EvaluationWorker extends WorkerHost {
  private readonly logger = new Logger(EvaluationWorker.name);

  constructor(
    private readonly jobsService: JobsService,
    // Inject the service that contains the core AI pipeline logic
    private readonly workerService: WorkerService,
  ) {
    super();
  }

  /**
   * This is the main method that processes jobs.
   * It's called by BullMQ (v5+ pattern) for each job in the queue.
   * @param job The job object from the queue.
   */
  async process(job: Job<{ jobId: string }>): Promise<any> {
    // Data validation for the job payload
    if (!job.data || !job.data.jobId) {
      this.logger.error(`Job ${job.id} has invalid data.`, job.data);
      throw new Error(`Invalid job data for job ${job.id}`);
    }

    const { jobId } = job.data;
    this.logger.log(`Processing job ${job.id} (Job ID: ${jobId})...`);

    // Ensure we only process jobs with the correct name
    if (job.name === EVALUATION_JOB_NAME) {
      try {
        // 1. Update status to 'processing' in PostgreSQL
        await this.jobsService.updateJobStatus(jobId, 'processing');

        // 2. Delegate all heavy lifting (PDF, RAG, LLM) to the WorkerService
        await this.workerService.runAIPipeline(jobId);

        // 3. WorkerService handles saving results and marking 'completed'
        this.logger.log(`Job ${job.id} (Job ID: ${jobId}) completed.`);
        return 'completed'; // Optional: return a result
      } catch (error) {
        // This block is the core of our resilience strategy
        this.logger.error(
          `Job ${job.id} (Job ID: ${jobId}) failed: ${error.message}`,
          error.stack,
        );

        // 4. Mark the job as 'failed' in PostgreSQL
        await this.jobsService.updateJobStatus(jobId, 'failed', error.message);

        // 5. Re-throw the error. This is CRITICAL.
        // This signals to BullMQ that the job failed,
        // which triggers the retry/backoff mechanism (attempts: 3).
        throw error;
      }
    } else {
      this.logger.warn(`Unknown job name: ${job.name}`);
      throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  // --- BullMQ Event Listeners (for enhanced logging) ---

  /**
   * Called when a job enters the 'active' state (starts processing).
   * @param job The job that just became active.
   */
  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(
      `Job ${job.id} (Job ID: ${job.data?.jobId || 'N/A'}) has started.`,
    );
  }

  /**
   * Called when a job successfully completes.
   * @param job The job that completed.
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(
      `Job ${job.id} (Job ID: ${job.data?.jobId || 'N/A'}) has completed!`,
    );
  }

  /**
   * Called when a job fails after all retry attempts.
   * @param job The job that failed.
   * @param err The error that caused the failure.
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job, err: any) {
    this.logger.error(
      `Job ${job.id} (Job ID: ${job.data?.jobId || 'N/A'}) has failed with error: ${err.message}`,
    );
  }
}
