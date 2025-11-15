/**
 * @file qdrant.ts
 * @description Centralizes constants related to the Qdrant vector database.
 */

/**
 * The specific collection name used in Qdrant
 * to store the "Ground Truth" document embeddings (vectors).
 *
 * This constant is used by RagService to ensure consistency
 * during ingestion and retrieval.
 */
export const QDRANT_COLLECTION_NAME = 'ground_truth_docs';
