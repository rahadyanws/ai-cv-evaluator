/**
 * @file worker.service.ts
 * @description This service contains the core business logic for the AI evaluation pipeline.
 * It is called by the WorkerProcessor and orchestrates all other services (Jobs, RAG, LLM).
 */
import { Injectable, Logger } from '@nestjs/common';
import { JobsService, EvaluationResultData } from '@/modules/jobs/jobs.service';
import * as fs from 'fs';
// Use a type alias ('PrismaDocument') to avoid a name collision
// with the global DOM 'Document' type.
import { Job, Document as PrismaDocument } from '@prisma/client';
import { RagService } from '@/modules/rag/rag.service';
import { LlmService } from '@/modules/llm/llm.service';

/**
 * Defines the structured JSON output we expect from the LLM
 * for CV and Project evaluations.
 */
interface LLMEvaluationOutput {
  score: number;
  feedback: string;
}

@Injectable()
export class WorkerService {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly ragService: RagService,
    private readonly llmService: LlmService,
  ) {}

  /**
   * Main orchestrator method for the AI evaluation pipeline.
   * This is triggered by the EvaluationWorker (BullMQ processor).
   * @param jobId The ID of the job to process.
   * @throws {Error} Throws an error if any step in the pipeline fails,
   * which signals BullMQ to retry the job.
   */
  async runAIPipeline(jobId: string) {
    this.logger.log(`[AI Pipeline] Starting for Job ID: ${jobId}`);

    try {
      // 1. Get Job & Document Paths
      const job = await this.jobsService.getJobById(jobId);
      this.logger.log(`[AI Pipeline] Fetched job data for: ${job.title}`);

      // 2. Extract Text from PDFs
      const { cvText, reportText } = await this.extractTextFromPdfs(job);
      this.logger.log(`[AI Pipeline] Extracted text from PDFs.`);

      // 3. Evaluate CV
      this.logger.log('[AI Pipeline] Starting CV evaluation...');
      const cvContext = await this.ragService.queryForContext(
        `Rubrik penilaian dan deskripsi pekerjaan untuk mengevaluasi CV kandidat: ${job.title}`,
        4, // Retrieve 4 relevant chunks
      );
      const cvPrompt = this.buildCvEvaluationPrompt(cvText, cvContext);
      const cvEvaluationJson =
        await this.llmService.generateEvaluation(cvPrompt);
      const cvEvaluation = this.parseEvaluation(
        cvEvaluationJson,
        'CV Evaluation', // Pass context for logging
      );
      this.logger.log(
        `[AI Pipeline] CV evaluation completed. Score: ${cvEvaluation.score}`,
      );

      // 4. Evaluate Project Report
      this.logger.log('[AI Pipeline] Starting Project Report evaluation...');
      const reportContext = await this.ragService.queryForContext(
        `Rubrik penilaian untuk mengevaluasi laporan proyek (case study) backend`,
        4, // Retrieve 4 relevant chunks
      );
      const reportPrompt = this.buildProjectEvaluationPrompt(
        reportText,
        reportContext,
      );
      const reportEvaluationJson =
        await this.llmService.generateEvaluation(reportPrompt);
      const reportEvaluation = this.parseEvaluation(
        reportEvaluationJson,
        'Project Report Evaluation', // Pass context for logging
      );
      this.logger.log(
        `[AI Pipeline] Project Report evaluation completed. Score: ${reportEvaluation.score}`,
      );

      // 5. Generate Final Summary
      this.logger.log('[AI Pipeline] Generating overall summary...');
      const summaryPrompt = this.buildSummaryPrompt(
        job.title,
        cvEvaluation,
        reportEvaluation,
      );
      // Note: We expect the summary prompt to return raw text, not JSON.
      const summary =
        (await this.llmService.generateEvaluation(summaryPrompt)) ??
        'Failed to generate summary.';
      this.logger.log('[AI Pipeline] Overall summary generated.');

      // 6. Prepare final result data
      const finalResult: EvaluationResultData = {
        cvMatchRate: cvEvaluation.score,
        cvFeedback: cvEvaluation.feedback,
        projectScore: reportEvaluation.score,
        projectFeedback: reportEvaluation.feedback,
        overallSummary: summary,
      };

      // 7. Save results to DB and mark job as 'completed'
      await this.jobsService.saveEvaluationResult(jobId, finalResult);
      this.logger.log(
        `[AI Pipeline] Successfully saved results for Job ID: ${jobId}`,
      );
    } catch (error) {
      this.logger.error(
        `[AI Pipeline] FAILED for Job ID: ${jobId}: ${error.message}`,
        error.stack,
      );
      // Re-throw the error. This is critical.
      // It signals to the WorkerProcessor that the job failed,
      // which in turn signals BullMQ to retry the job.
      throw error;
    }
  }

  // ===================================================================
  // PDF PARSING (using pdfjs-dist)
  // ===================================================================

  /**
   * Reads the PDF files from disk and extracts their text content.
   * @param job The job object containing related CV and Report documents.
   */
  private async extractTextFromPdfs(
    job: Job & { cv: PrismaDocument; report: PrismaDocument },
  ): Promise<{ cvText: string; reportText: string }> {
    try {
      this.logger.log(`Reading files: ${job.cv.path} and ${job.report.path}`);

      // 1. Read file buffers from the paths stored in the database
      const cvBuffer = fs.readFileSync(job.cv.path);
      const reportBuffer = fs.readFileSync(job.report.path);

      // 2. Parse both PDF buffers in parallel
      const [cvText, reportText] = await Promise.all([
        this.parsePdfBuffer(cvBuffer),
        this.parsePdfBuffer(reportBuffer),
      ]);

      return {
        cvText: cvText,
        reportText: reportText,
      };
    } catch (error) {
      this.logger.error(
        `Failed to parse PDF files with pdfjs-dist: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to parse PDF files: ${error.message}`);
    }
  }

  /**
   * Helper function to parse a single PDF buffer using pdfjs-dist (legacy build).
   * This uses the 'legacy' build to ensure Node.js (CJS) compatibility.
   * @param buffer The PDF file buffer.
   */
  private async parsePdfBuffer(buffer: Buffer): Promise<string> {
    // Dynamically import the CJS-friendly 'legacy' build of pdfjs-dist.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');
    const pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.js');

    // We MUST set the 'workerSrc'. This WILL produce harmless warnings
    // in the log about 'canvas', 'DOMMatrix', etc.
    // This is NORMAL and SAFE to ignore, as we only need text extraction,
    // not PDF rendering (which requires those browser APIs).
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

    // Convert Node.js Buffer to ArrayBuffer
    const data = new Uint8Array(buffer);
    const doc = await pdfjs.getDocument({ data }).promise;
    let fullText = '';

    // Loop through all pages and extract text content
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n'; // Add newline between pages
    }
    return fullText;
  }

  // ===================================================================
  // PROMPT ENGINEERING & PARSING
  // ===================================================================

  /**
   * Safely parses the JSON string returned by the LLM.
   * @param jsonString The raw string response from the LLM.
   * @param type A description for logging (e.g., "CV Evaluation").
   */
  private parseEvaluation(
    jsonString: string | null,
    type: string,
  ): LLMEvaluationOutput {
    // Define a fallback object for error cases
    const fallback: LLMEvaluationOutput = {
      score: 0,
      feedback: `Failed to get valid response from LLM for ${type}.`,
    };

    if (!jsonString) {
      this.logger.warn(`Failed to get response from LLM for ${type}.`);
      return fallback;
    }

    try {
      // Clean up markdown code fences (e.g., ```json ... ```)
      // that models sometimes add to their JSON responses.
      const cleanedJsonString = jsonString
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const result = JSON.parse(cleanedJsonString);

      // Type-check the parsed result
      return {
        score: typeof result.score === 'number' ? result.score : 0,
        feedback:
          typeof result.feedback === 'string'
            ? result.feedback
            : 'No feedback provided.',
      };
    } catch (error) {
      this.logger.error(
        `Failed to parse JSON response for ${type}: ${error.message}`,
        jsonString,
      );
      // Return a fallback with a more specific error message
      return {
        ...fallback,
        feedback: `Failed to parse JSON response from LLM: ${jsonString}`,
      };
    }
  }

  /**
   * Builds the prompt for evaluating the candidate's CV.
   * (Prompts remain in Indonesian as they are application content)
   */
  private buildCvEvaluationPrompt(cvText: string, context: string): string {
    return `
      You are a senior Technical Recruiter. Your task is to evaluate a candidate's CV.
      You MUST respond ONLY with a valid JSON format.

      CONTEXT (Job Description & Scoring Rubric):
      ---
      ${context}
      ---

      CANDIDATE'S CV:
      ---
      ${cvText}
      ---

      Instructions:
      1. Compare the CANDIDATE'S CV against the CONTEXT.
      2. Provide a "score" (Float between 0.0 and 1.0) representing how well the CV matches the CONTEXT. 1.0 is a perfect match.
      3. Provide "feedback" (String) summarizing the candidate's strengths and weaknesses based on the CONTEXT.

      Respond ONLY with the following JSON format:
      {
        "score": <float_score_0.0_to_1.0>,
        "feedback": "<string_feedback>"
      }
    `;
  }

  /**
   * Builds the prompt for evaluating the candidate's Project Report.
   */
  private buildProjectEvaluationPrompt(
    reportText: string,
    context: string,
  ): string {
    return `
      You are a Principal Backend Engineer. Your task is to evaluate a candidate's Project Report (Case Study).
      You MUST respond ONLY with a valid JSON format.

      CONTEXT (Case Study Scoring Rubric):
      ---
      ${context}
      ---

      CANDIDATE'S PROJECT REPORT:
      ---
      ${reportText}
      ---

      Instructions:
      1. Compare the CANDIDATE'S PROJECT REPORT against the CONTEXT (Rubric).
      2. Provide a "score" (Float between 1.0 and 5.0) representing how well the project report meets the rubric. 5.0 is a perfect score.
      3. Provide "feedback" (String) summarizing the project report's strengths and weaknesses.

      Respond ONLY with the following JSON format:
      {
        "score": <float_score_1.0_to_5.0>,
        "feedback": "<string_feedback>"
      }
    `;
  }

  /**
   * Builds the prompt for generating the final summary.
   */
  private buildSummaryPrompt(
    jobTitle: string,
    cvEval: LLMEvaluationOutput,
    projectEval: LLMEvaluationOutput,
  ): string {
    return `
      You are a Hiring Manager.
      Your task is to write a hiring summary (overall_summary) for a candidate applying for "${jobTitle}".
      You MUST respond ONLY with a single paragraph (as a string).

      CV Evaluation Data (Score: ${cvEval.score.toFixed(2)}/1.0):
      ${cvEval.feedback}

      Project Evaluation Data (Score: ${projectEval.score.toFixed(1)}/5.0):
      ${projectEval.feedback}

      Instructions:
      Write a concise 2-3 sentence summary concluding the candidate's viability.
      Mention key strengths, weaknesses, and a recommendation (e.g., "Strong candidate", "Not a good fit", "Recommend for technical interview").
      Respond ONLY with the summary string. DO NOT return JSON.
    `;
  }
}
