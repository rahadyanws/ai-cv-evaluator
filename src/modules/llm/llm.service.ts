/**
 * @file llm.service.ts
 * @description This service acts as a central adapter for all interactions
 * with the Large Language Model (LLM) provider (Google Gemini).
 * It handles API key initialization, embedding generation, and text generation.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  TaskType,
  GenerateContentRequest,
} from '@google/generative-ai';
import { GEMINI_EMBEDDING_MODEL, GEMINI_GENERATIVE_MODEL } from '@/constants';

/**
 * A service (adapter) that encapsulates all logic for interacting
 * with the Google Gemini API.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private genAI: GoogleGenerativeAI;
  private embeddingModel: GenerativeModel;
  private generativeModel: GenerativeModel;

  /**
   * Initializes the LlmService by:
   * 1. Reading the GEMINI_API_KEY from the ConfigService.
   * 2. Initializing the GoogleGenerativeAI client.
   * 3. Getting instances of the embedding and generative models.
   * @param configService Injected ConfigService to access .env variables.
   */
  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      // Fail fast on startup if the key is missing
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);

    // Model for creating vector embeddings (for RAG)
    this.embeddingModel = this.genAI.getGenerativeModel({
      model: GEMINI_EMBEDDING_MODEL,
    });

    // Model for text generation (for evaluation and summaries)
    this.generativeModel = this.genAI.getGenerativeModel({
      model: GEMINI_GENERATIVE_MODEL,
    });

    this.logger.log('LlmService initialized with Gemini models');
  }

  /**
   * Creates a vector embedding from a given text string.
   * Used by RagService for ingestion and querying.
   * @param text The text content to embed.
   * @returns A Promise resolving to an array of numbers (vector).
   * @throws {Error} Throws the original API error if embedding fails.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.embeddingModel.embedContent({
        content: { parts: [{ text }], role: 'user' }, // 'role' is correct here
        taskType: TaskType.RETRIEVAL_DOCUMENT, // Optimized for RAG
      });
      return result.embedding.values;
    } catch (error) {
      this.logger.error(
        `Failed to generate embedding: ${error.message}`,
        error.stack,
      );
      // We re-throw the error here, consistent with generateEvaluation.
      // This allows BullMQ to catch the failure and retry the job.
      throw error;
    }
  }

  /**
   * Generates a text response (e.g., an evaluation) based on a prompt.
   * Used by WorkerService.
   * @param prompt The full prompt to send to the LLM.
   * @returns A Promise resolving to the LLM's text response.
   * @throws {Error} Throws the original API error if generation fails.
   */
  async generateEvaluation(prompt: string): Promise<string> {
    try {
      // Specify JSON output format for models that support it.
      const request: GenerateContentRequest = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      };
      const result = await this.generativeModel.generateContent(request);

      const response = await result.response;
      return response.text();
    } catch (error) {
      this.logger.error(
        `Failed to generate evaluation: ${error.message}`,
        error.stack,
      );
      // This is correct. We re-throw the error.
      // This signals to WorkerProcessor that the job failed,
      // and BullMQ will automatically retry it (based on bull.config.ts).
      throw error;
    }
  }
}
