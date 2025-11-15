/**
 * @file result.controller.ts
 * @description Controller for the GET /api/result/:id endpoint.
 * This controller is responsible for retrieving the status and
 * final result of an evaluation job.
 */
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ResultService, JobResultResponse } from './result.service';

/**
 * Controller for the /api/result route.
 * Follows the "thin controller" principle:
 * - Delegates all business logic to the ResultService.
 * - Validates URL parameters.
 */
@Controller('result')
// Note: @UsePipes(new ValidationPipe(...)) is intentionally omitted
// because a global ValidationPipe is already applied in main.ts.
export class ResultController {
  constructor(private readonly resultService: ResultService) {}

  /**
   * Handles the GET /api/result/:id request.
   *
   * Fetches the status and result of a specific evaluation job.
   * @param id The UUID of the job, extracted from the URL path.
   */
  @Get(':id')
  async getResult(
    // ParseUUIDPipe automatically validates that the 'id' param is a UUID,
    // throwing a 400 Bad Request if the format is incorrect.
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JobResultResponse> {
    // Delegate all logic to the service
    return this.resultService.getJobResult(id);
  }
}
