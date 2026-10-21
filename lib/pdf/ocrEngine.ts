import path from "path";
import fs from "fs";
import { createWorker } from "tesseract.js";

export interface OcrResult {
  text: string;
  confidence: number;
  hasOcr: boolean;
  detectedLanguage?: string;
  error?: string;
}

export class OcrEngineService {
  /**
   * Evaluates if a page has insufficient text and requires OCR analysis.
   */
  static requiresOcr(rawText: string): boolean {
    if (!rawText) return true;
    const trimmed = rawText.trim();
    // Fewer than 35 characters or fewer than 6 words usually indicates a scanned page, diagram, or title-only slide
    if (trimmed.length < 35) return true;
    const words = trimmed.split(/\s+/).filter(Boolean);
    return words.length < 6;
  }

  static getWorkerPath(): string | undefined {
    const possibleWorkerPaths = [
      path.resolve(process.cwd(), "node_modules/tesseract.js/src/worker-script/node/index.js"),
      path.resolve(__dirname, "../../node_modules/tesseract.js/src/worker-script/node/index.js"),
    ];
    return possibleWorkerPaths.find((p) => fs.existsSync(/*turbopackIgnore: true*/ p));
  }

  /**
   * Spawns a reusable Tesseract worker for high-performance multi-page recognition.
   */
  static async createReusableWorker(lang: "ben" | "eng" | "ben+eng" = "ben+eng") {
    const workerPath = this.getWorkerPath();
    const workerOptions = workerPath ? { workerPath } : {};
    return await createWorker(lang, 1, workerOptions);
  }

  /**
   * Executes OCR on an image buffer (JPEG, PNG, WebP, or raw buffer).
   * Supports bilingual recognition for Bengali and English.
   * Can accept an existing reusable worker to avoid re-initialization overhead.
   */
  static async recognizeImageBuffer(
    imageBuffer: Buffer,
    lang: "ben" | "eng" | "ben+eng" = "ben+eng",
    reusableWorker?: any
  ): Promise<OcrResult> {
    try {
      if (!imageBuffer || imageBuffer.length === 0) {
        return {
          text: "",
          confidence: 0,
          hasOcr: false,
          error: "Empty image buffer provided for OCR.",
        };
      }

      if (reusableWorker) {
        const ret = await reusableWorker.recognize(imageBuffer);
        const text = ret.data.text ? ret.data.text.trim() : "";
        const confidence = typeof ret.data.confidence === "number" ? ret.data.confidence : 0;
        return {
          text,
          confidence,
          hasOcr: true,
          detectedLanguage: lang.includes("ben") ? "bn" : "en",
        };
      }

      const workerPath = this.getWorkerPath();
      const workerOptions = workerPath ? { workerPath } : {};
      const worker = await createWorker(lang, 1, workerOptions);
      try {
        const ret = await worker.recognize(imageBuffer);
        const text = ret.data.text ? ret.data.text.trim() : "";
        const confidence = typeof ret.data.confidence === "number" ? ret.data.confidence : 0;

        return {
          text,
          confidence,
          hasOcr: true,
          detectedLanguage: lang.includes("ben") ? "bn" : "en",
        };
      } finally {
        await worker.terminate().catch(() => {});
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn("OCR engine execution error:", errorMsg);
      return {
        text: "",
        confidence: 0,
        hasOcr: true,
        error: `OCR processing failed: ${errorMsg}`,
      };
    }
  }
}
