/**
 * @file queues.ts
 * @description Centralizes the names of all BullMQ queues used in the application.
 */

/**
 * The name of the primary queue responsible for processing AI evaluations.
 *
 * This constant is used by:
 * 1. `EvaluateModule` (to register the queue)
 * 2. `EvaluateService` (to inject and add jobs to the queue)
 * 3. `WorkerModule` (to register the processor for this queue)
 */
export const EVALUATION_QUEUE = 'evaluation';
