import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
// --- 👇 REVISI: Impor objek 'schemas' utuh 👇 ---
// '@qdrant/openapi-typescript-fetch' does not export 'schemas', define a local PointStruct type instead
type PointStruct = {
  id: string;
  vector: number[];
  payload?: {
    text: string;
    source: string;
    [key: string]: any;
  };
};
// --- 👆 REVISI 👆 ---
import { LlmService } from '@/modules/llm/llm.service';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { QDRANT_COLLECTION_NAME } from '@/constants';

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private qdrantClient: QdrantClient;
  private textSplitter: RecursiveCharacterTextSplitter;
  private readonly COLLECTION_NAME = QDRANT_COLLECTION_NAME;

  constructor(private llmService: LlmService) {
    this.qdrantClient = new QdrantClient({
      url: 'http://localhost:6333',
    });

    // Inisialisasi text splitter dari Langchain
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });

    this.logger.log('RagService initialized');
  }

  /**
   * Saat modul siap, kita lakukan 'ingestion' (memasukkan) dokumen.
   */
  async onModuleInit() {
    await this.ingestGroundTruthDocuments();
  }

  /**
   * Mencari konteks yang relevan di Vector DB (Qdrant)
   * berdasarkan sebuah kueri (misal: "Pengalaman teknis kandidat")
   */
  async queryForContext(query: string, limit: number = 3): Promise<string> {
    this.logger.log(`Querying Qdrant for: "${query}"`);

    // 1. Ubah kueri menjadi vector
    const queryVector = await this.llmService.generateEmbedding(query);
    if (!queryVector) {
      throw new Error('Failed to create query vector');
    }

    // 2. Cari di Qdrant
    const searchResult = await this.qdrantClient.search(this.COLLECTION_NAME, {
      vector: queryVector,
      limit: limit,
      with_payload: true, // Ambil metadata (teks aslinya)
    });

    // 3. Gabungkan hasil menjadi satu string konteks
    const context = searchResult
      .map((result) => (result.payload as { text: string }).text)
      .join('\n\n---\n\n');

    return context;
  }

  /**
   * (Hanya sekali jalan saat startup)
   * Membaca dokumen dari /documents, membaginya, membuat vector,
   * dan menyimpannya ke Qdrant.
   */
  private async ingestGroundTruthDocuments() {
    this.logger.log('Checking if Qdrant collection needs ingestion...');

    try {
      // Cek apakah koleksi sudah ada
      const collections = await this.qdrantClient.getCollections();
      const collectionExists = collections.collections.some(
        (c) => c.name === this.COLLECTION_NAME,
      );

      // Dapatkan jumlah poin di koleksi
      let pointsCount = 0;
      if (collectionExists) {
        const countResult = await this.qdrantClient.count(
          this.COLLECTION_NAME,
          {
            exact: true,
          },
        );
        pointsCount = countResult.count;
      }

      // Jika sudah ada dan tidak kosong, lewati ingestion
      if (collectionExists && pointsCount > 0) {
        this.logger.log(
          `Collection '${this.COLLECTION_NAME}' already exists and is populated. Skipping ingestion.`,
        );
        return;
      }

      // Jika koleksi belum ada, buat koleksi
      if (!collectionExists) {
        this.logger.log(`Creating collection: ${this.COLLECTION_NAME}`);
        await this.qdrantClient.recreateCollection(this.COLLECTION_NAME, {
          vectors: {
            size: 768, // Ukuran vector dari 'text-embedding-004'
            distance: 'Cosine',
          },
        });
      }

      this.logger.log('Starting document ingestion into Qdrant...');

      // Baca dokumen dari folder /documents
      const docDir = path.join(process.cwd(), 'documents');
      const docFiles = fs.readdirSync(docDir).filter((f) => f.endsWith('.txt'));

      // Proses setiap file dokumen satu per satu
      for (const docFile of docFiles) {
        const docPath = path.join(docDir, docFile);
        const docContent = fs.readFileSync(docPath, 'utf-8');

        // 1. Split dokumen menjadi potongan (chunks)
        const chunks = await this.textSplitter.splitText(docContent);

        // Buat array points sekali per dokumen (hindari redeclare)
        const points: PointStruct[] = [];

        for (const chunk of chunks) {
          const vector = await this.llmService.generateEmbedding(chunk);
          if (vector) {
            points.push({
              id: uuidv4(),
              vector: vector,
              payload: {
                text: chunk, // Simpan teks asli sebagai payload
                source: docFile,
              },
            });
          }
        }

        // 3. Upsert (masukkan) poin ke Qdrant
        if (points.length > 0) {
          this.logger.log(
            `Ingesting ${points.length} chunks for ${docFile}...`,
          );
          await this.qdrantClient.upsert(this.COLLECTION_NAME, {
            wait: true, // Tunggu sampai proses selesai
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
    }
  }
}
