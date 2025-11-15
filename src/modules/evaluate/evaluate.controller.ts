/**
 * @file evaluate.controller.ts
 * @description Controller for the POST /api/evaluate endpoint.
 * This controller is responsible for starting the async AI evaluation.
 *
 * Note: This module uses relative paths (e.g., './dto') for its internal
 * imports to prevent circular dependency issues.
 */
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { EvaluateService } from './evaluate.service';
import { CreateEvaluationJobDto } from './dto'; // Local DTO import

/**
 * Controller for the /api/evaluate route.
 * Follows the "thin controller" principle:
 * - Validates input (via the global pipe set in main.ts)
 * - Delegates business logic to the EvaluateService
 * - Formats the immediate response
 */
@Controller('evaluate')
export class EvaluateController {
  constructor(private readonly evaluateService: EvaluateService) {}

  /**
   * Handles the POST /api/evaluate request.
   *
   * This endpoint is asynchronous. It validates the DTO (via global pipe),
   * passes it to the EvaluateService (which queues the job),
   * and immediately returns a 202 Accepted status with the new job's ID.
   */
  @Post()
  // Use 202 Accepted to signal that the request is accepted
  // for processing, but is not yet complete. This is an async best practice.
  @HttpCode(HttpStatus.ACCEPTED)
  // Note: @UsePipes(new ValidationPipe(...)) is intentionally omitted
  // because a global ValidationPipe is already applied in main.ts.
  async triggerEvaluation(
    @Body() dto: CreateEvaluationJobDto,
  ): Promise<{ id: string; status: string }> {
    const job = await this.evaluateService.createEvaluationJob(dto);

    // Immediately return the job ID and 'queued' status
    // as per the case study requirement.
    return {
      id: job.id,
      status: job.status,
    };
  }
}
