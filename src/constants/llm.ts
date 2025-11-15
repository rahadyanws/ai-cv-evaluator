/**
 * @file llm.ts
 * @description Centralizes the model names for the LLM provider (Gemini).
 * This makes it easy to swap models without changing service logic.
 */

/**
 * The model used for generating vector embeddings (for RAG).
 */
export const GEMINI_EMBEDDING_MODEL = 'text-embedding-004';

/**
 * The model used for text generation (evaluation, summaries).
 * Note: 'gemini-2.5-pro' can be unstable (503 errors) on the free tier.
 * If issues persist, a stable alternative is 'gemini-1.5-pro-latest'.
 */
export const GEMINI_GENERATIVE_MODEL = 'gemini-2.5-pro';
