/**
 * @file index.ts
 * @description Barrel file for exporting all Data Transfer Objects (DTOs)
 * from the Evaluate module. This simplifies import paths for other modules.
 *
 * @example
 * // Before: import { CreateEvaluationJobDto } from '@/modules/evaluate/dto/create-evaluation-job.dto';
 * // After:  import { CreateEvaluationJobDto } from '@/modules/evaluate/dto';
 */
export * from './create-evaluation-job.dto';
