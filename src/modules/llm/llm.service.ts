// import { Injectable, Logger } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import {
//   GoogleGenerativeAI,
//   GenerativeModel,
//   TaskType,
// } from '@google/generative-ai';

// @Injectable()
// export class LlmService {
//   private readonly logger = new Logger(LlmService.name);
//   private genAI: GoogleGenerativeAI;
//   private embeddingModel: GenerativeModel;
//   private generativeModel: GenerativeModel;

//   constructor(private configService: ConfigService) {
//     const apiKey = this.configService.get<string>('GEMINI_API_KEY');
//     if (!apiKey) {
//       throw new Error('GEMINI_API_KEY is not set in environment variables');
//     }
//     this.genAI = new GoogleGenerativeAI(apiKey);

//     // Model untuk membuat embeddings (vektor)
//     this.embeddingModel = this.genAI.getGenerativeModel({
//       model: 'text-embedding-004', // Model embedding terbaru
//     });

//     // Model untuk generasi teks (evaluasi)
//     this.generativeModel = this.genAI.getGenerativeModel({
//       // --- 👇 REVISI KUNCI DI SINI (Sesuai temuan Anda) 👇 ---
//       model: 'gemini-2.5-pro',
//       // --- 👆 REVISI KUNCI DI SINI 👆 ---
//     });

//     this.logger.log('LlmService initialized with Gemini models');
//   }

//   /**
//    * Membuat vector embedding dari sebuah teks.
//    * Digunakan oleh RagService.
//    */
//   async generateEmbedding(text: string): Promise<number[] | null> {
//     try {
//       const result = await this.embeddingModel.embedContent({
//         content: { parts: [{ text }], role: 'user' },
//         taskType: TaskType.RETRIEVAL_DOCUMENT, // Tipe untuk RAG
//       });
//       return result.embedding.values;
//     } catch (error) {
//       this.logger.error(
//         `Failed to generate embedding: ${error.message}`,
//         error.stack,
//       );
//       return null;
//     }
//   }

//   /**
//    * Menghasilkan teks (evaluasi) berdasarkan prompt.
//    * Digunakan oleh WorkerService.
//    */
//   async generateEvaluation(prompt: string): Promise<string | null> {
//     try {
//       const result = await this.generativeModel.generateContent(prompt);
//       const response = await result.response;
//       return response.text();
//     } catch (error) {
//       this.logger.error(
//         `Failed to generate evaluation: ${error.message}`,
//         error.stack,
//       );
//       // Jangan lempar error, kembalikan null agar pipeline bisa lanjut
//       return null;
//     }
//   }
// }

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  TaskType,
} from '@google/generative-ai';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private genAI: GoogleGenerativeAI;
  private embeddingModel: GenerativeModel;
  private generativeModel: GenerativeModel;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);

    // Model untuk membuat embeddings (vektor)
    this.embeddingModel = this.genAI.getGenerativeModel({
      model: 'text-embedding-004', // Model embedding terbaru gemini-embedding-001
    });

    // Model untuk generasi teks (evaluasi)
    this.generativeModel = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
    });

    this.logger.log('LlmService initialized with Gemini models');
  }

  /**
   * Membuat vector embedding dari sebuah teks.
   * Digunakan oleh RagService.
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const result = await this.embeddingModel.embedContent({
        content: { parts: [{ text }], role: 'user' },
        taskType: TaskType.RETRIEVAL_DOCUMENT, // Tipe untuk RAG
      });
      return result.embedding.values;
    } catch (error) {
      this.logger.error(
        `Failed to generate embedding: ${error.message}`,
        error.stack,
      );
      // --- 👇 REVISI DI SINI 👇 ---
      // Kembalikan null untuk embedding agar RAG bisa gagal dengan anggun
      return null;
      // --- 👆 REVISI DI SINI 👆 ---
    }
  }

  /**
   * Menghasilkan teks (evaluasi) berdasarkan prompt.
   * Digunakan oleh WorkerService.
   */
  async generateEvaluation(prompt: string): Promise<string | null> {
    try {
      const result = await this.generativeModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      this.logger.error(
        `Failed to generate evaluation: ${error.message}`,
        error.stack,
      );
      // --- 👇 REVISI KUNCI DI SINI 👇 ---
      // Jangan kembalikan null. Lempar error-nya.
      // Ini akan memberi tahu WorkerProcessor bahwa job-nya gagal,
      // dan BullMQ akan otomatis mencoba lagi (sesuai attempts: 3).
      // return null;
      // throw error; // Lempar error agar BullMQ bisa menangani retry
      // --- 👆 REVISI KUNCI DI SINI 👆 ---

      // Jangan lempar error, kembalikan null agar pipeline bisa lanjut
      return null;
    }
  }
}
