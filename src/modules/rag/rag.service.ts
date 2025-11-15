/**
 * @file rag.service.ts
 * @description This service manages all interactions with the Qdrant vector database.
 * It handles the ingestion of "Ground Truth" documents on startup (OnModuleInit)
 * and provides a query method for context retrieval (RAG).
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { LlmService } from '@/modules/llm/llm.service';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { QDRANT_COLLECTION_NAME } from '@/constants';

/**
 * @typedef PointStruct
 * @description Defines a local type for Qdrant's PointStruct.
 * This is a pragmatic workaround as the Qdrant client libraries
 * do not cleanly export their data types (e.g., PointStruct, ApiPointStruct)
 * or schema objects for direct import.
 * This struct is compatible with what the qdrantClient.upsert() method expects.
 */
type PointStruct = {
  id: string;
  vector: number[];
  payload?: {
    text: string;
    source: string;
    [key: string]: any; // Allows for other metadata
  };
};

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private qdrantClient: QdrantClient;
  private textSplitter: RecursiveCharacterTextSplitter;

  // Use the centralized constant for the collection name
  private readonly COLLECTION_NAME = QDRANT_COLLECTION_NAME;

  // Define the expected vector size for the Gemini embedding model
  private readonly GEMINI_VECTOR_SIZE = 768;

  constructor(private llmService: LlmService) {
    // Initialize the Qdrant client (points to the Docker container)
    this.qdrantClient = new QdrantClient({
      url: 'http://localhost:6333',
    });

    // Initialize the text splitter (used for chunking documents)
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });

    this.logger.log('RagService initialized');
  }

  /**
   * NestJS lifecycle hook.
   * Called once the module is initialized (on application startup).
   * Triggers the ingestion of ground truth documents.
   */
  async onModuleInit() {
    await this.ingestGroundTruthDocuments();
  }

  /**
   * Retrieves relevant context from the Qdrant vector DB based on a query.
   * This is the "Retrieval" part of RAG.
   * @param query The text query (e.g., a prompt) to search for.
   * @param limit The maximum number of context chunks to retrieve.
   * @returns A string of combined context, separated by '---'.
   * @throws {Error} Throws an error if the embedding or Qdrant search fails.
   */
  async queryForContext(query: string, limit: number = 3): Promise<string> {
    this.logger.log(`Querying Qdrant for: "${query}"`);

    // 1. Convert the text query into a vector embedding
    const queryVector = await this.llmService.generateEmbedding(query);
    if (!queryVector) {
      throw new Error('Failed to create query vector');
    }

    // 2. Search the Qdrant collection for similar vectors
    const searchResult = await this.qdrantClient.search(this.COLLECTION_NAME, {
      vector: queryVector,
      limit: limit,
      with_payload: true, // Retrieve the original text payload
    });

    // 3. Combine the text payloads from the results into a single context string
    const context = searchResult
      .map((result) => (result.payload as { text: string }).text)
      .join('\n\n---\n\n'); // Separate contexts for the LLM

    return context;
  }

  /**
   * (Runs once on startup)
   * Reads documents from the /documents folder, splits them into chunks,
   * generates embeddings, and upserts them into the Qdrant collection.
   * This method is idempotent (safe to run multiple times).
   */
  private async ingestGroundTruthDocuments() {
    this.logger.log('Checking if Qdrant collection needs ingestion...');

    try {
      const collections = await this.qdrantClient.getCollections();
      const collectionExists = collections.collections.some(
        (c) => c.name === this.COLLECTION_NAME,
      );

      let pointsCount = 0;
      if (collectionExists) {
        const countResult = await this.qdrantClient.count(
          this.COLLECTION_NAME,
          { exact: true },
        );
        pointsCount = countResult.count;
      }

      // --- ROBUSTNESS FIX ---
      // This block checks if the existing collection is valid.
      // If it exists but has the wrong vector size (e.g., from a
      // previous experiment with a different model), we must recreate it.
      if (collectionExists && pointsCount > 0) {
        this.logger.log(
          `Collection '${this.COLLECTION_NAME}' already exists. Checking vector size...`,
        );
        const collectionInfo = await this.qdrantClient.getCollection(
          this.COLLECTION_NAME,
        );
        const currentSize = collectionInfo.config?.params?.vectors?.size;

        if (currentSize === this.GEMINI_VECTOR_SIZE) {
          // The collection exists, has data, and has the correct size.
          this.logger.log(
            `Vector size is correct (${this.GEMINI_VECTOR_SIZE}). Skipping ingestion.`,
          );
          return; // This is the only "success" exit
        } else {
          // The collection exists but has the wrong size (e.g., 384 from OpenRouter)
          this.logger.warn(
            `Vector size is INCORRECT (${currentSize}). Expected ${this.GEMINI_VECTOR_SIZE}. Recreating collection...`,
          );
          // Fall through to the recreation logic below
        }
      }
      // --- END ROBUSTNESS FIX ---

      // If we are here, it means either:
      // 1. The collection doesn't exist.
      // 2. The collection exists but is empty.
      // 3. The collection exists but has the wrong vector size.
      // In all cases, we must (re)create the collection.

      this.logger.log(`Recreating collection: ${this.COLLECTION_NAME}`);
      await this.qdrantClient.recreateCollection(this.COLLECTION_NAME, {
        vectors: {
          size: this.GEMINI_VECTOR_SIZE, // Vector size for 'text-embedding-004'
          distance: 'Cosine', // Cosine similarity is good for text
        },
      });

      this.logger.log('Starting document ingestion into Qdrant...');

      // Read all .txt files from the /documents directory
      const docDir = path.join(process.cwd(), 'documents');
      const docFiles = fs.readdirSync(docDir).filter((f) => f.endsWith('.txt'));

      // Process each file
      for (const docFile of docFiles) {
        this.logger.log(`Processing document: ${docFile}`);
        const docPath = path.join(docDir, docFile);
        const docContent = fs.readFileSync(docPath, 'utf-8');

        // 1. Split the document into manageable chunks
        const chunks = await this.textSplitter.splitText(docContent);

        // Define an array for the points (using our local PointStruct type)
        const points: PointStruct[] = [];

        // 2. Create an embedding for each chunk
        for (const chunk of chunks) {
          const vector = await this.llmService.generateEmbedding(chunk);
          if (vector) {
            points.push({
              id: uuidv4(), // Unique ID for each chunk
              vector: vector,
              payload: {
                text: chunk, // Store the original text as the payload
                source: docFile,
              },
            });
          }
        }

        // 3. Upsert all points for this document to Qdrant in a batch
        if (points.length > 0) {
          this.logger.log(
            `Ingesting ${points.length} chunks for ${docFile}...`,
          );
          await this.qdrantClient.upsert(this.COLLECTION_NAME, {
            wait: true, // Wait for the operation to complete
            points: points,
          });
        }
      }

      this.logger.log('Document ingestion completed successfully.');
    } catch (error) {
      this.logger.error(
        `Failed to ingest documents: ${error.message}`,
        error.stack,
      );
      // We don't re-throw here; we just log the error.
      // The app can still run, but RAG will return empty context.
    }
  }
}
