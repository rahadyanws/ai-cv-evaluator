import { Injectable, Logger } from '@nestjs/common';
// ... (impor lain tidak berubah)
import { JobsService, EvaluationResultData } from '@/modules/jobs/jobs.service';
import { LlmService } from '@/modules/llm/llm.service';
import { RagService } from '@/modules/rag/rag.service';
import { Job, Document } from '@prisma/client';
import * as fs from 'fs';

// ... (interface LLMEvaluationOutput tidak berubah)
interface LLMEvaluationOutput {
  score: number;
  feedback: string;
}

@Injectable()
export class WorkerService {
  // ... (constructor dan logger tidak berubah)
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly llmService: LlmService,
    private readonly ragService: RagService,
  ) {}

  /**
   * Orkestrator utama untuk pipeline AI.
   * (Fungsi ini tidak berubah)
   */
  async runAIPipeline(jobId: string) {
    this.logger.log(`[AI Pipeline] Starting for Job ID: ${jobId}`);

    try {
      // 1. Ambil data job (termasuk path file)
      const job = await this.jobsService.getJobById(jobId);
      this.logger.log(`[AI Pipeline] Fetched job data for: ${job.title}`);

      // 2. Ekstrak teks dari PDF
      const { cvText, reportText } = await this.extractTextFromPdfs(job);
      this.logger.log(`[AI Pipeline] Extracted text from PDFs.`);

      // 3. Evaluasi CV
      this.logger.log(`[AI Pipeline] Starting CV evaluation...`);
      const cvContext = await this.ragService.queryForContext(
        `Rubrik penilaian dan deskripsi pekerjaan untuk mengevaluasi CV kandidat: ${job.title}`,
        4,
      );
      const cvPrompt = this.buildCvEvaluationPrompt(cvText, cvContext);
      const cvEvalJson = await this.llmService.generateEvaluation(cvPrompt);
      const cvResult = this.parseEvaluation(cvEvalJson, {
        score: 0.0,
        feedback: 'Gagal mem-parsing respons LLM untuk CV.',
      });
      this.logger.log(
        `[AI Pipeline] CV evaluation completed. Score: ${cvResult.score}`,
      );

      // 4. Evaluasi Laporan Proyek
      this.logger.log(`[AI Pipeline] Starting Project Report evaluation...`);
      const reportContext = await this.ragService.queryForContext(
        `Rubrik penilaian untuk mengevaluasi laporan proyek (case study) backend`,
        4,
      );
      const reportPrompt = this.buildReportEvaluationPrompt(
        reportText,
        reportContext,
      );
      const reportEvalJson =
        await this.llmService.generateEvaluation(reportPrompt);
      const reportResult = this.parseEvaluation(reportEvalJson, {
        score: 0.0,
        feedback: 'Gagal mem-parsing respons LLM untuk Laporan Proyek.',
      });
      this.logger.log(
        `[AI Pipeline] Project Report evaluation completed. Score: ${reportResult.score}`,
      );

      // 5. Buat Ringkasan (Overall Summary)
      this.logger.log(`[AI Pipeline] Generating overall summary...`);
      const summaryPrompt = this.buildSummaryPrompt(
        cvResult,
        reportResult,
        job.title,
      );
      const overallSummary =
        (await this.llmService.generateEvaluation(summaryPrompt)) ||
        'Gagal menghasilkan ringkasan akhir.';
      this.logger.log(`[AI Pipeline] Overall summary generated.`);

      // 6. Susun hasil akhir
      const finalResult: EvaluationResultData = {
        cvMatchRate: cvResult.score,
        projectScore: reportResult.score,
        cvFeedback: cvResult.feedback,
        projectFeedback: reportResult.feedback,
        overallSummary: overallSummary,
      };

      // 7. Simpan hasil ke database dan tandai job 'completed'
      await this.jobsService.saveEvaluationResult(jobId, finalResult);
      this.logger.log(
        `[AI Pipeline] Successfully saved results for Job ID: ${jobId}`,
      );
    } catch (error) {
      this.logger.error(
        `[AI Pipeline] FAILED for Job ID: ${jobId}: ${error.message}`,
        error.stack,
      );
      // Lempar error agar processor bisa menangkapnya dan menandai job 'failed'
      throw error;
    }
  }

  // --- 👇 REVISI KUNCI ADA DI FUNGSI INI 👇 ---

  /**
   * Membaca file PDF dari disk dan mem-parsing teksnya menggunakan 'pdfjs-dist'.
   */
  private async extractTextFromPdfs(
    job: Job & { cv: Document; report: Document },
  ): Promise<{ cvText: string; reportText: string }> {
    this.logger.log(`Reading files: ${job.cv.path} and ${job.report.path}`);

    /**
     * Helper internal untuk mem-parsing satu buffer PDF menggunakan pdfjs-dist
     */
    const parsePdfBuffer = async (buffer: Buffer): Promise<string> => {
      // 1. Gunakan dynamic import() dan tunjuk ke build 'legacy' CJS
      // Sesuai dengan warning di log Anda.
      // ⛔️ JANGAN GUNAKAN: const pdfjsLib = await import('pdfjs-dist');
      // ✅ GUNAKAN INI:
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');

      // 2. Set worker ke 'legacy' worker CJS
      // ⛔️ JANGAN GUNAKAN: pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.cjs';
      // ✅ GUNAKAN INI:
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'pdfjs-dist/legacy/build/pdf.worker.js';

      // 3. Load dokumen dari buffer (ArrayBuffer)
      // Perlu konversi Buffer -> ArrayBuffer
      const arrayBuffer = Uint8Array.from(buffer).buffer;
      const loadingTask = pdfjsLib.getDocument(arrayBuffer);
      const doc = await loadingTask.promise;

      // 4. Loop setiap halaman dan ekstrak teks
      let fullText = '';
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();

        // Gabungkan semua potongan teks di halaman
        const pageText = textContent.items
          .map((item) => (item as any).str) // (item as any) untuk akses .str
          .join(' ');

        fullText += pageText + '\n'; // Tambahkan newline antar halaman
      }
      return fullText;
    };

    try {
      // 5. Baca file buffer dari path
      const cvBuffer = fs.readFileSync(job.cv.path);
      const reportBuffer = fs.readFileSync(job.report.path);

      // 6. Parse kedua PDF secara paralel
      const [cvText, reportText] = await Promise.all([
        parsePdfBuffer(cvBuffer),
        parsePdfBuffer(reportBuffer),
      ]);

      return {
        cvText: cvText || '',
        reportText: reportText || '',
      };
    } catch (error) {
      this.logger.error(
        `Failed to parse PDF files with pdfjs-dist: ${error.message}`,
      );
      throw new Error(`Failed to parse PDF files: ${error.message}`);
    }
  }

  // --- 👆 REVISI SELESAI DI SINI 👆 ---

  /**
   * Helper untuk mem-parsing respons JSON dari LLM dengan aman.
   * (Fungsi ini tidak berubah)
   */
  private parseEvaluation(
    jsonString: string | null,
    fallback: LLMEvaluationOutput,
  ): LLMEvaluationOutput {
    // ... (kode parseEvaluation tidak berubah)
    if (!jsonString) return fallback;
    try {
      const cleanJson = jsonString
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(cleanJson) as LLMEvaluationOutput;
    } catch (error) {
      this.logger.warn(
        `Failed to parse LLM JSON response. String was: ${jsonString}`,
      );
      return fallback;
    }
  }

  // --- PROMPT ENGINEERING HELPERS ---
  // (Fungsi-fungsi ini tidak berubah)
  private buildCvEvaluationPrompt(cvText: string, context: string): string {
    // ... (kode buildCvEvaluationPrompt tidak berubah)
    return `
      Anda adalah seorang Perekrut Teknis senior. Tugas Anda adalah mengevaluasi CV kandidat.
      Anda HARUS membalas HANYA dengan format JSON yang valid.

      KONTEKS (Deskripsi Pekerjaan & Rubrik Penilaian):
      ---
      ${context}
      ---

      CV KANDIDAT:
      ---
      ${cvText}
      ---

      Instruksi:
      1. Bandingkan CV KANDIDAT dengan KONTEKS.
      2. Berikan "score" (Float antara 0.0 hingga 1.0) yang merepresentasikan seberapa cocok CV tersebut dengan KONTEKS. 1.0 berarti sangat cocok.
      3. Berikan "feedback" (String) yang merangkum kekuatan dan kelemahan kandidat berdasarkan KONTEKS.

      Balas HANYA dengan format JSON berikut:
      {
        "score": <float_score>,
        "feedback": "<string_feedback>"
      }
    `;
  }

  private buildReportEvaluationPrompt(
    reportText: string,
    context: string,
  ): string {
    // ... (kode buildReportEvaluationPrompt tidak berubah)
    return `
      Anda adalah seorang Principal Backend Engineer. Tugas Anda adalah mengevaluasi Laporan Proyek (Case Study) kandidat.
      Anda HARUS membalas HANYA dengan format JSON yang valid.

      KONTEKS (Rubrik Penilaian Case Study):
      ---
      ${context}
      ---

      LAPORAN PROYEK KANDIDAT:
      ---
      ${reportText}
      ---

      Instruksi:
      1. Bandingkan LAPORAN PROYEK KANDIDAT dengan KONTEKS (Rubrik).
      2. Berikan "score" (Float antara 1.0 hingga 5.0) yang merepresentasikan seberapa baik laporan proyek tersebut memenuhi rubrik. 5.0 berarti sempurna.
      3. Berikan "feedback" (String) yang merangkum kekuatan dan kelemahan laporan proyek tersebut.

      Balas HANYA dengan format JSON berikut:
      {
        "score": <float_score>,
        "feedback": "<string_feedback>"
      }
    `;
  }

  private buildSummaryPrompt(
    cvResult: LLMEvaluationOutput,
    reportResult: LLMEvaluationOutput,
    jobTitle: string,
  ): string {
    // ... (kode buildSummaryPrompt tidak berubah)
    return `
      Anda adalah seorang Engineering Manager.
      Tugas Anda adalah menulis ringkasan perekrutan (overallSummary) untuk kandidat ${jobTitle}.
      Anda HARUS membalas HANYA dengan satu paragraf (sebagai string).

      Data Evaluasi CV (Skor: ${cvResult.score}/1.0):
      ${cvResult.feedback}

      Data Evaluasi Proyek (Skor: ${reportResult.score}/5.0):
      ${reportResult.feedback}

      Instruksi:
      Tulis ringkasan 3-5 kalimat yang menyimpulkan kelayakan kandidat.
      Sebutkan kekuatan utama, kelemahan utama, dan rekomendasi (lolos/tidak) untuk wawancara teknis.
      Balas HANYA dengan string paragraf ringkasan.
    `;
  }
}
