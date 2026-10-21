import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
import { PDFParse } from "pdf-parse";
import { TextCleanerService, DocumentLanguage } from "./textCleaner";
import { BijoyConverterService } from "./bijoyConverter";
import { OcrEngineService } from "./ocrEngine";

let isWorkerConfigured = false;

function ensureWorkerConfigured() {
  if (isWorkerConfigured) return;
  try {
    const candidatePaths = [
      path.resolve(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
      path.resolve(process.cwd(), "node_modules/pdfjs-dist/build/pdf.worker.mjs"),
      path.resolve(process.cwd(), "node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs"),
      path.resolve(process.cwd(), "node_modules/pdf-parse/dist/worker/pdf.worker.mjs"),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
        const fileUrl = pathToFileURL(p).href;
        PDFParse.setWorker(fileUrl);
        isWorkerConfigured = true;
        break;
      }
    }
  } catch (err) {
    console.warn("Could not set PDF worker URL:", err);
  }
}

export interface ExtractedPageData {
  pageNumber: number;
  rawText: string;
  cleanedText: string;
  hasOcr: boolean;
  ocrConfidence?: number;
  wordCount: number;
  detectedLanguage: DocumentLanguage;
}

export interface DocumentExtractionResult {
  totalPages: number;
  overallLanguage: DocumentLanguage;
  pages: ExtractedPageData[];
  metadata: {
    formatVersion?: string;
    isEncrypted?: boolean;
    title?: string;
    author?: string;
  };
}

export interface ExtractionProgressCallback {
  (currentPage: number, totalPages: number, stage: string): void | Promise<void>;
}

export class PdfExtractorService {
  /**
   * Extracts text, structure, and metadata from a PDF buffer with OCR fallback for scanned pages.
   */
  static async extractDocument(
    pdfBuffer: Buffer,
    onProgress?: ExtractionProgressCallback
  ): Promise<DocumentExtractionResult> {
    ensureWorkerConfigured();
    const parser = new PDFParse({ data: pdfBuffer });
    let ocrWorker: any = null;
    try {
      if (onProgress) {
        await onProgress(0, 0, "EXTRACTING");
      }

      // 1. Retrieve document metadata and page text
      const info = await parser.getInfo().catch(() => null);
      const textResult = await parser.getText();
      const rawPages = textResult.pages || [];
      const totalPages = Math.max(rawPages.length, textResult.total || 0, 1);

      const extractedPages: ExtractedPageData[] = [];
      let totalBengaliChars = 0;
      let totalLatinChars = 0;

      // 2. Process page by page
      for (let i = 0; i < totalPages; i++) {
        const pageNum = i + 1;
        const pageEntry = rawPages[i];
        let rawText = pageEntry ? pageEntry.text || "" : "";

        let hasOcr = false;
        let ocrConfidence: number | undefined;

        // 1. If raw text is Bijoy ANSI legacy encoded, convert directly to Unicode first
        if (BijoyConverterService.isBijoyEncoded(rawText)) {
          const converted = BijoyConverterService.convertBijoyToUnicode(rawText);
          if (!TextCleanerService.isBrokenBengaliFont(converted)) {
            rawText = converted;
          }
        }

        // 2. Check if page has missing text (scanned page) OR broken CMap font encoding requiring visual OCR
        const isBroken = TextCleanerService.isBrokenBengaliFont(rawText);
        const needsOcr = OcrEngineService.requiresOcr(rawText) || isBroken;

        if (needsOcr) {
          if (onProgress) {
            await onProgress(pageNum, totalPages, "RUNNING_OCR");
          }

          try {
            if (!ocrWorker) {
              ocrWorker = await OcrEngineService.createReusableWorker("ben+eng").catch(() => null);
            }

            // Priority 1: High-resolution full page screenshot (captures exact visual rendering of all Bengali fonts)
            const screenshotResult = await parser
              .getScreenshot({ partial: [pageNum], imageBuffer: true, scale: 2 })
              .catch(() => null);

            let ocrSuccessful = false;
            if (screenshotResult?.pages?.[0]?.data) {
              const shotData = Buffer.from(screenshotResult.pages[0].data);
              const ocrRes = await OcrEngineService.recognizeImageBuffer(shotData, "ben+eng", ocrWorker);
              if (ocrRes.text && ocrRes.text.trim().length > 20) {
                rawText = ocrRes.text;
                hasOcr = true;
                ocrConfidence = ocrRes.confidence;
                ocrSuccessful = true;
              }
            }

            // Fallback: embedded page images if screenshot was not available
            if (!ocrSuccessful) {
              const imageResult = await parser.getImage({ partial: [pageNum], imageBuffer: true }).catch(() => null);
              const pageImages = imageResult?.pages?.[0]?.images || [];

              if (pageImages.length > 0 && pageImages[0].data) {
                const imgData = Buffer.from(pageImages[0].data);
                const ocrRes = await OcrEngineService.recognizeImageBuffer(imgData, "ben+eng", ocrWorker);
                if (ocrRes.text && ocrRes.text.length > rawText.length) {
                  rawText = ocrRes.text;
                  hasOcr = true;
                  ocrConfidence = ocrRes.confidence;
                }
              }
            }
          } catch (ocrErr) {
            console.warn(`OCR fallback skipped for page ${pageNum}:`, ocrErr);
          }
        }

        // 3. Clean and normalize page text
        const cleanedText = TextCleanerService.cleanPageText(rawText);
        const wordCount = TextCleanerService.countWords(cleanedText);
        const pageLang = TextCleanerService.detectLanguage(cleanedText);

        // Language tracking
        const bnMatches = cleanedText.match(/[\u0980-\u09FF]/g);
        const enMatches = cleanedText.match(/[A-Za-z]/g);
        if (bnMatches) totalBengaliChars += bnMatches.length;
        if (enMatches) totalLatinChars += enMatches.length;

        extractedPages.push({
          pageNumber: pageNum,
          rawText,
          cleanedText,
          hasOcr,
          ocrConfidence,
          wordCount,
          detectedLanguage: pageLang,
        });

        if (onProgress) {
          await onProgress(pageNum, totalPages, "EXTRACTING");
        }
      }

      // 4. Multi-page artifact removal: Strip repeated headers and footers
      const pagesForArtifactRemoval = extractedPages.map((p) => ({
        pageNumber: p.pageNumber,
        text: p.cleanedText,
      }));

      const deArtifactedPages = TextCleanerService.removeRepeatingHeadersAndFooters(pagesForArtifactRemoval);

      // Re-assign de-artifacted text and re-calculate word counts
      for (let i = 0; i < extractedPages.length; i++) {
        const clean = deArtifactedPages[i]?.text || extractedPages[i].cleanedText;
        extractedPages[i].cleanedText = clean;
        extractedPages[i].wordCount = TextCleanerService.countWords(clean);
      }

      // 5. Determine overall document language
      const totalAlpha = totalBengaliChars + totalLatinChars;
      let overallLanguage: DocumentLanguage = "bn";
      if (totalAlpha > 0) {
        const bnRatio = totalBengaliChars / totalAlpha;
        const enRatio = totalLatinChars / totalAlpha;
        if (bnRatio >= 0.65) overallLanguage = "bn";
        else if (enRatio >= 0.65) overallLanguage = "en";
        else overallLanguage = "mixed";
      }

      const metadata = {
        formatVersion: info?.info?.PDFFormatVersion || "1.4",
        isEncrypted: Boolean(info?.info?.EncryptFilterName),
        title: (info?.metadata as any)?.title || undefined,
        author: (info?.metadata as any)?.author || undefined,
      };

      return {
        totalPages,
        overallLanguage,
        pages: extractedPages,
        metadata,
      };
    } finally {
      if (ocrWorker) {
        await ocrWorker.terminate().catch(() => {});
      }
      await parser.destroy().catch(() => {});
    }
  }

  /**
   * Re-extracts and heals a single page from a PDF buffer using high-resolution screenshot OCR.
   */
  static async ocrSinglePage(
    pdfBuffer: Buffer,
    pageNumber: number
  ): Promise<{ text: string; confidence?: number }> {
    ensureWorkerConfigured();
    const parser = new PDFParse({ data: pdfBuffer });
    try {
      const screenshot = await parser.getScreenshot({
        partial: [pageNumber],
        imageBuffer: true,
        scale: 2,
      });

      if (!screenshot.pages?.[0]?.data) {
        throw new Error(`Could not render screenshot for page ${pageNumber}`);
      }

      const imgBuffer = Buffer.from(screenshot.pages[0].data);
      const ocrRes = await OcrEngineService.recognizeImageBuffer(imgBuffer, "ben+eng");
      const clean = TextCleanerService.cleanPageText(ocrRes.text);
      return {
        text: clean,
        confidence: ocrRes.confidence,
      };
    } finally {
      await parser.destroy().catch(() => {});
    }
  }

  /**
   * Re-extracts and heals multiple pages using a shared PDFParse instance and single reusable OCR worker.
   */
  static async ocrMultiplePages(
    pdfBuffer: Buffer,
    pageNumbers: number[],
    onProgress?: (current: number, total: number) => Promise<void> | void
  ): Promise<Map<number, { text: string; confidence?: number }>> {
    ensureWorkerConfigured();
    const results = new Map<number, { text: string; confidence?: number }>();
    const parser = new PDFParse({ data: pdfBuffer });
    let worker: any = null;
    try {
      worker = await OcrEngineService.createReusableWorker("ben+eng");
      for (let i = 0; i < pageNumbers.length; i++) {
        const pageNum = pageNumbers[i];
        if (onProgress) {
          await onProgress(i + 1, pageNumbers.length);
        }
        try {
          const screenshot = await parser.getScreenshot({
            partial: [pageNum],
            imageBuffer: true,
            scale: 2,
          });
          if (screenshot?.pages?.[0]?.data) {
            const imgBuffer = Buffer.from(screenshot.pages[0].data);
            const ocrRes = await OcrEngineService.recognizeImageBuffer(imgBuffer, "ben+eng", worker);
            const clean = TextCleanerService.cleanPageText(ocrRes.text);
            results.set(pageNum, { text: clean, confidence: ocrRes.confidence });
          }
        } catch (pageErr) {
          console.warn(`Failed OCR on page ${pageNum}:`, pageErr);
        }
      }
    } finally {
      if (worker) await worker.terminate().catch(() => {});
      await parser.destroy().catch(() => {});
    }
    return results;
  }
}

