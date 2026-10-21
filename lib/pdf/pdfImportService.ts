import prisma from "@/lib/db/prisma";
import { PdfSecurityService } from "./pdfSecurity";
import { PdfExtractorService } from "./pdfExtractor";
import { QuestionDraftService } from "./questionDraftService";
import { AuditService } from "@/lib/audit/auditService";
import {
  ExamCategoryType,
  PdfImportStatus,
} from "@prisma/client";

export interface CreateImportParams {
  fileBuffer: Buffer;
  originalFilename: string;
  uploadedById: string;
  category?: ExamCategoryType;
  classId?: string;
  subjectId?: string;
  chapterId?: string;
  ipAddress?: string;
}

export interface ListImportsFilters {
  page?: number;
  limit?: number;
  category?: ExamCategoryType;
  subjectId?: string;
  status?: PdfImportStatus;
  search?: string;
}

export class PdfImportService {
  /**
   * Validates uploaded PDF, creates database import record and processing job,
   * stores the physical file safely, and initiates extraction.
   */
  static async createImport(params: CreateImportParams) {
    const { fileBuffer, originalFilename, uploadedById, category, classId, subjectId, chapterId, ipAddress } = params;

    // 1. Security & File Format Validation
    const validation = PdfSecurityService.validatePdfBuffer(fileBuffer, originalFilename);
    if (!validation.isValid) {
      throw new Error(validation.error || "Invalid PDF file.");
    }

    const fileHash = validation.fileHash!;
    const sanitizedFileName = validation.sanitizedFileName!;

    // 2. Check for duplicate upload
    const existing = await prisma.pdfImport.findFirst({
      where: { fileHash, uploadedById },
    });
    if (existing && existing.status !== PdfImportStatus.FAILED) {
      // Return existing import if already uploaded
      return {
        importRecord: existing,
        isDuplicate: true,
      };
    }

    // 3. Secure disk storage
    const storagePath = await PdfSecurityService.savePdfFile(fileBuffer, fileHash);

    // 4. Create database records in a transaction
    const importRecord = await prisma.$transaction(async (tx) => {
      const imp = await tx.pdfImport.create({
        data: {
          fileName: sanitizedFileName,
          fileSize: validation.fileSize!,
          mimeType: validation.mimeType || "application/pdf",
          storagePath,
          fileHash,
          status: PdfImportStatus.QUEUED,
          category,
          classId: classId || null,
          subjectId: subjectId || null,
          chapterId: chapterId || null,
          uploadedById,
        },
      });

      await tx.pdfProcessingJob.create({
        data: {
          pdfImportId: imp.id,
          stage: "QUEUED",
          progressPercent: 5,
          status: "PROCESSING",
          logsJson: JSON.stringify([{ timestamp: new Date().toISOString(), message: "File uploaded and queued for processing." }]),
        },
      });

      return imp;
    });

    // 5. Audit log
    await AuditService.log({
      userId: uploadedById,
      action: "PDF_UPLOADED",
      resource: "pdf_import",
      resourceId: importRecord.id,
      details: {
        fileName: sanitizedFileName,
        fileSize: validation.fileSize,
        category,
        subjectId,
      },
      ipAddress,
    });

    // 6. Execute text extraction pipeline
    // Run synchronously or trigger processing
    await this.processImportPipeline(importRecord.id, fileBuffer);

    // Fetch the updated import record
    const updated = await prisma.pdfImport.findUnique({
      where: { id: importRecord.id },
      include: {
        pages: { orderBy: { pageNumber: "asc" } },
        processingJobs: { orderBy: { startedAt: "desc" }, take: 1 },
      },
    });

    return {
      importRecord: updated || importRecord,
      isDuplicate: false,
    };
  }

  /**
   * Executes PDF text extraction and OCR pipeline, updating processing job and page records.
   */
  static async processImportPipeline(importId: string, directBuffer?: Buffer) {
    const job = await prisma.pdfProcessingJob.findFirst({
      where: { pdfImportId: importId },
      orderBy: { startedAt: "desc" },
    });

    try {
      await prisma.pdfImport.update({
        where: { id: importId },
        data: { status: PdfImportStatus.EXTRACTING },
      });

      if (job) {
        await prisma.pdfProcessingJob.update({
          where: { id: job.id },
          data: {
            stage: "EXTRACTING",
            progressPercent: 15,
            logsJson: JSON.stringify([
              { timestamp: new Date().toISOString(), message: "Beginning document text and structure extraction." },
            ]),
          },
        });
      }

      // Read buffer from storage if not provided directly
      let buffer = directBuffer;
      if (!buffer) {
        const imp = await prisma.pdfImport.findUnique({ where: { id: importId } });
        if (!imp) throw new Error("PDF Import record not found.");
        const fs = await import("fs/promises");
        buffer = await fs.readFile(imp.storagePath);
      }

      // Progress logger
      const logs: { timestamp: string; message: string }[] = [];
      const onProgress = async (current: number, total: number, stage: string) => {
        const percent = total > 0 ? Math.min(95, Math.round((current / total) * 80) + 15) : 25;
        logs.push({
          timestamp: new Date().toISOString(),
          message: `Processing page ${current} of ${total} (Stage: ${stage})`,
        });

        if (job) {
          await prisma.pdfProcessingJob.update({
            where: { id: job.id },
            data: {
              stage,
              currentPage: current,
              totalPages: total,
              progressPercent: percent,
              logsJson: JSON.stringify(logs.slice(-20)),
            },
          }).catch(() => {});
        }
      };

      // Extract document
      const extraction = await PdfExtractorService.extractDocument(buffer, onProgress);

      // Save extracted pages inside a transaction
      await prisma.$transaction(async (tx) => {
        // Clear previous pages if retrying
        await tx.extractedDocumentPage.deleteMany({
          where: { pdfImportId: importId },
        });

        // Insert extracted pages
        for (const p of extraction.pages) {
          await tx.extractedDocumentPage.create({
            data: {
              pdfImportId: importId,
              pageNumber: p.pageNumber,
              rawText: p.rawText,
              cleanedText: p.cleanedText,
              hasOcr: p.hasOcr,
              ocrConfidence: p.ocrConfidence,
              wordCount: p.wordCount,
              detectedLanguage: p.detectedLanguage,
            },
          });
        }

        // Store initial full text version (v1)
        const fullCleanedText = extraction.pages.map((p) => `--- PAGE ${p.pageNumber} ---\n${p.cleanedText}`).join("\n\n");
        await tx.documentTextVersion.create({
          data: {
            pdfImportId: importId,
            versionNumber: 1,
            content: fullCleanedText,
            diffSummary: "Initial automated extraction and normalization.",
          },
        });

        // Mark import as READY
        await tx.pdfImport.update({
          where: { id: importId },
          data: {
            status: PdfImportStatus.READY,
            pageCount: extraction.totalPages,
            detectedLanguage: extraction.overallLanguage,
          },
        });

        if (job) {
          await tx.pdfProcessingJob.update({
            where: { id: job.id },
            data: {
              stage: "COMPLETED",
              progressPercent: 100,
              currentPage: extraction.totalPages,
              totalPages: extraction.totalPages,
              status: "COMPLETED",
              completedAt: new Date(),
              logsJson: JSON.stringify([
                ...logs.slice(-10),
                { timestamp: new Date().toISOString(), message: `Extraction completed. ${extraction.totalPages} pages processed successfully.` },
              ]),
            },
          });
        }
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`PDF extraction pipeline error for import ${importId}:`, err);

      await prisma.pdfImport.update({
        where: { id: importId },
        data: {
          status: PdfImportStatus.FAILED,
          errorMessage: errorMsg,
        },
      });

      if (job) {
        await prisma.pdfProcessingJob.update({
          where: { id: job.id },
          data: {
            stage: "FAILED",
            status: "FAILED",
            errorMessage: errorMsg,
            completedAt: new Date(),
          },
        });
      }
      throw err;
    }
  }

  /**
   * Retrieves an import with pages, processing jobs, and generated questions summary.
   */
  static async getImportById(importId: string) {
    return prisma.pdfImport.findUnique({
      where: { id: importId },
      include: {
        academicClass: { select: { id: true, nameBn: true, nameEn: true, code: true } },
        subject: { select: { id: true, nameBn: true, nameEn: true, code: true } },
        chapter: { select: { id: true, nameBn: true, nameEn: true, chapterNum: true } },
        uploadedBy: { select: { id: true, fullName: true, email: true } },
        processingJobs: { orderBy: { startedAt: "desc" }, take: 1 },
        pages: { orderBy: { pageNumber: "asc" } },
        textVersions: { orderBy: { versionNumber: "desc" }, take: 5 },
        _count: {
          select: {
            pages: true,
            generatedDrafts: true,
            importedQuestions: true,
          },
        },
      },
    });
  }

  /**
   * Lists PDF imports with filtering and pagination.
   */
  static async listImports(filters: ListImportsFilters) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.category) where.category = filters.category;
    if (filters.subjectId) where.subjectId = filters.subjectId;
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { fileName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.pdfImport.count({ where }),
      prisma.pdfImport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          academicClass: { select: { id: true, nameBn: true, nameEn: true, code: true } },
          subject: { select: { id: true, nameBn: true, nameEn: true, code: true } },
          chapter: { select: { id: true, nameBn: true, chapterNum: true } },
          uploadedBy: { select: { fullName: true, email: true } },
          processingJobs: { orderBy: { startedAt: "desc" }, take: 1 },
          _count: {
            select: {
              pages: true,
              generatedDrafts: true,
              importedQuestions: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Updates extracted page text, creating a new DocumentTextVersion and keeping the original PDF intact.
   */
  static async updateExtractedText(params: {
    importId: string;
    pageNumber?: number;
    content: string;
    editedById: string;
    diffSummary?: string;
  }) {
    const { importId, pageNumber, content, editedById, diffSummary } = params;

    const imp = await prisma.pdfImport.findUnique({
      where: { id: importId },
      include: { textVersions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });
    if (!imp) throw new Error("PDF Import record not found.");

    const latestVersion = imp.textVersions[0]?.versionNumber || 1;
    const nextVersion = latestVersion + 1;

    await prisma.$transaction(async (tx) => {
      // 1. If pageNumber is provided, update that specific page
      if (typeof pageNumber === "number") {
        await tx.extractedDocumentPage.updateMany({
          where: { pdfImportId: importId, pageNumber },
          data: {
            cleanedText: content,
            wordCount: content.trim().split(/\s+/).filter(Boolean).length,
          },
        });
      }

      // 2. Create version history record
      await tx.documentTextVersion.create({
        data: {
          pdfImportId: importId,
          versionNumber: nextVersion,
          pageNumber: pageNumber || null,
          editedById,
          content,
          diffSummary: diffSummary || `User edited ${pageNumber ? `page ${pageNumber}` : "full document"} text.`,
        },
      });
    });

    await AuditService.log({
      userId: editedById,
      action: "PDF_TEXT_EDITED",
      resource: "pdf_import",
      resourceId: importId,
      details: {
        pageNumber,
        version: nextVersion,
        summary: diffSummary,
      },
    });

    // Invalidate/refresh any stale drafts generated from old text version
    if (typeof pageNumber === "number") {
      await QuestionDraftService.refreshDraftsForPages(importId, [pageNumber], editedById).catch(() => {});
    }

    return {
      success: true,
      versionNumber: nextVersion,
    };
  }

  /**
   * Safely deletes a PDF import, including disk storage and child records.
   */
  static async deleteImport(importId: string, userId: string) {
    const imp = await prisma.pdfImport.findUnique({
      where: { id: importId },
    });
    if (!imp) throw new Error("PDF Import record not found.");

    // Delete physical file from disk
    await PdfSecurityService.deletePdfFile(imp.storagePath);

    // Delete database records (cascades to pages, jobs, drafts)
    await prisma.pdfImport.delete({
      where: { id: importId },
    });

    await AuditService.log({
      userId,
      action: "PDF_IMPORT_DELETED",
      resource: "pdf_import",
      resourceId: importId,
      details: { fileName: imp.fileName },
    });

    return { success: true };
  }

  /**
   * Re-extracts and heals a page from an uploaded PDF using high-res visual OCR.
   */
  static async healPageFont(importId: string, pageNumber: number, userId: string) {
    const imp = await prisma.pdfImport.findUnique({
      where: { id: importId },
      include: { pages: { where: { pageNumber } } },
    });
    if (!imp) throw new Error("PDF Import record not found.");

    const pdfBuffer = await PdfSecurityService.readPdfFile(imp.storagePath);
    const ocrResult = await PdfExtractorService.ocrSinglePage(pdfBuffer, pageNumber);

    // Update page record
    await prisma.extractedDocumentPage.updateMany({
      where: { pdfImportId: importId, pageNumber },
      data: {
        cleanedText: ocrResult.text,
        hasOcr: true,
        ocrConfidence: ocrResult.confidence,
        wordCount: ocrResult.text.trim().split(/\s+/).filter(Boolean).length,
      },
    });

    // Save a new version history entry
    const lastVersion = await prisma.documentTextVersion.findFirst({
      where: { pdfImportId: importId },
      orderBy: { versionNumber: "desc" },
    });
    const nextVersion = (lastVersion?.versionNumber || 0) + 1;

    await prisma.documentTextVersion.create({
      data: {
        pdfImportId: importId,
        versionNumber: nextVersion,
        pageNumber,
        editedById: userId,
        content: ocrResult.text,
        diffSummary: `Bangla Font OCR Auto-Heal for page ${pageNumber}.`,
      },
    });

    await AuditService.log({
      userId,
      action: "PDF_FONT_HEALED",
      resource: "pdf_import",
      resourceId: importId,
      details: { pageNumber, version: nextVersion, confidence: ocrResult.confidence },
    });

    // Refresh and heal any stale drafts associated with this page
    await QuestionDraftService.refreshDraftsForPages(importId, [pageNumber], userId).catch(() => {});

    return {
      success: true,
      pageNumber,
      cleanedText: ocrResult.text,
      confidence: ocrResult.confidence,
    };
  }

  /**
   * Re-extracts and heals multiple pages in batch using a single reusable OCR worker.
   */
  static async healMultiplePages(importId: string, pageNumbers: number[], userId: string) {
    const imp = await prisma.pdfImport.findUnique({
      where: { id: importId },
    });
    if (!imp) throw new Error("PDF Import record not found.");

    const pdfBuffer = await PdfSecurityService.readPdfFile(imp.storagePath);
    const pageMap = await PdfExtractorService.ocrMultiplePages(pdfBuffer, pageNumbers);

    const healedPages: Array<{ pageNumber: number; cleanedText: string; confidence?: number }> = [];

    for (const [pNum, res] of pageMap.entries()) {
      await prisma.extractedDocumentPage.updateMany({
        where: { pdfImportId: importId, pageNumber: pNum },
        data: {
          cleanedText: res.text,
          hasOcr: true,
          ocrConfidence: res.confidence,
          wordCount: res.text.trim().split(/\s+/).filter(Boolean).length,
        },
      });
      healedPages.push({ pageNumber: pNum, cleanedText: res.text, confidence: res.confidence });
    }

    // Save full document text version
    const allPages = await prisma.extractedDocumentPage.findMany({
      where: { pdfImportId: importId },
      orderBy: { pageNumber: "asc" },
    });
    const fullCleanedText = allPages.map((p) => `--- PAGE ${p.pageNumber} ---\n${p.cleanedText}`).join("\n\n");

    const lastVersion = await prisma.documentTextVersion.findFirst({
      where: { pdfImportId: importId },
      orderBy: { versionNumber: "desc" },
    });
    const nextVersion = (lastVersion?.versionNumber || 0) + 1;

    await prisma.documentTextVersion.create({
      data: {
        pdfImportId: importId,
        versionNumber: nextVersion,
        editedById: userId,
        content: fullCleanedText,
        diffSummary: `Batch Bangla Font OCR Auto-Heal for ${healedPages.length} pages.`,
      },
    });

    await AuditService.log({
      userId,
      action: "PDF_BATCH_FONT_HEALED",
      resource: "pdf_import",
      resourceId: importId,
      details: { healedCount: healedPages.length, version: nextVersion },
    });

    // Refresh and heal any stale drafts associated with these healed pages
    await QuestionDraftService.refreshDraftsForPages(importId, pageNumbers, userId).catch(() => {});

    return {
      success: true,
      healedCount: healedPages.length,
      pages: healedPages,
    };
  }
}

