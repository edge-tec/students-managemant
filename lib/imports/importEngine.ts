import prisma from "@/lib/db/prisma";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { ExamCategoryType, QuestionType, DifficultyLevel, ContentStatus } from "@prisma/client";

export interface QuestionImportRow {
  category: string;
  subjectCode: string;
  chapterNumber: number | string;
  questionTextBn: string;
  questionTextEn?: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctKey: string; // "A", "B", "C", "D"
  explanationBn: string;
  explanationEn?: string;
  boardCode?: string;
  examYear?: number | string;
  universityCode?: string;
  admissionUnitCode?: string;
  difficulty?: string;
  marks?: number | string;
  negativeMarks?: number | string;
}

export interface ImportValidationResult {
  totalRows: number;
  validRows: QuestionImportRow[];
  errors: { rowNumber: number; column: string; message: string; raw: unknown }[];
}

export class QuestionImportEngine {
  /**
   * Generates a standard CSV template for administrative bulk uploads.
   */
  static getCsvTemplate(): string {
    const headers = [
      "category",
      "subjectCode",
      "chapterNumber",
      "questionTextBn",
      "questionTextEn",
      "optionA",
      "optionB",
      "optionC",
      "optionD",
      "correctKey",
      "explanationBn",
      "explanationEn",
      "boardCode",
      "examYear",
      "universityCode",
      "admissionUnitCode",
      "difficulty",
      "marks",
      "negativeMarks",
    ];

    const sampleRow = [
      "HSC",
      "PHY_1",
      "2",
      "একটি বস্তুর উপর ৫ নিউটন বল প্রয়োগ করায় বলের দিকে ৪ মিটার সরলে কৃতকাজ কত জুল?",
      "How much work is done if a force of 5N displaces an object 4m in the direction of force?",
      "১০ জুল (10 J)",
      "১৫ জুল (15 J)",
      "২০ জুল (20 J)",
      "২৫ জুল (25 J)",
      "C",
      "কাজ W = F * s = 5 N * 4 m = 20 J",
      "Work W = F * s = 5 * 4 = 20 J",
      "DHA",
      "2023",
      "",
      "",
      "EASY",
      "1.0",
      "0.25",
    ];

    return [headers.join(","), sampleRow.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")].join("\n");
  }

  /**
   * Parses CSV or Excel buffer with full Bengali Unicode support.
   */
  static parseRawFile(fileBuffer: Buffer, isExcel: boolean): QuestionImportRow[] {
    if (isExcel) {
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      return XLSX.utils.sheet_to_json<QuestionImportRow>(sheet);
    } else {
      const csvString = fileBuffer.toString("utf-8");
      const parsed = Papa.parse<QuestionImportRow>(csvString, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      });
      return parsed.data;
    }
  }

  /**
   * Validates parsed rows row-by-row before performing database insertion.
   */
  static validateRows(rows: QuestionImportRow[]): ImportValidationResult {
    const validRows: QuestionImportRow[] = [];
    const errors: { rowNumber: number; column: string; message: string; raw: unknown }[] = [];

    const validCategories = ["SSC", "HSC", "MEDICAL", "DENTAL", "UNIVERSITY"];
    const validKeys = ["A", "B", "C", "D"];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // +1 for 1-based, +1 for header row
      const category = (row.category || "").trim().toUpperCase();
      const subjectCode = (row.subjectCode || "").trim().toUpperCase();
      const questionTextBn = (row.questionTextBn || "").trim();
      const correctKey = (row.correctKey || "").trim().toUpperCase();
      const explanationBn = (row.explanationBn || "").trim();

      if (!validCategories.includes(category)) {
        errors.push({
          rowNumber: rowNum,
          column: "category",
          message: `Invalid category '${category}'. Must be one of: ${validCategories.join(", ")}`,
          raw: row,
        });
        return;
      }

      if (!subjectCode) {
        errors.push({
          rowNumber: rowNum,
          column: "subjectCode",
          message: "Subject code is required",
          raw: row,
        });
        return;
      }

      if (!questionTextBn || questionTextBn.length < 5) {
        errors.push({
          rowNumber: rowNum,
          column: "questionTextBn",
          message: "Bengali question text must have at least 5 characters",
          raw: row,
        });
        return;
      }

      if (!row.optionA || !row.optionB || !row.optionC || !row.optionD) {
        errors.push({
          rowNumber: rowNum,
          column: "options",
          message: "All four options (optionA, optionB, optionC, optionD) must be provided",
          raw: row,
        });
        return;
      }

      if (!validKeys.includes(correctKey)) {
        errors.push({
          rowNumber: rowNum,
          column: "correctKey",
          message: `Invalid correct key '${correctKey}'. Must be A, B, C, or D`,
          raw: row,
        });
        return;
      }

      if (!explanationBn) {
        errors.push({
          rowNumber: rowNum,
          column: "explanationBn",
          message: "Bengali explanation is required for learning transparency",
          raw: row,
        });
        return;
      }

      validRows.push(row);
    });

    return {
      totalRows: rows.length,
      validRows,
      errors,
    };
  }

  /**
   * Bounded batch insertion inside a transaction with rollback protection and duplicate detection.
   */
  static async executeImport(jobId: string, validRows: QuestionImportRow[], authorId: string) {
    let successfulCount = 0;
    const batchSize = 50;

    for (let i = 0; i < validRows.length; i += batchSize) {
      const chunk = validRows.slice(i, i + batchSize);

      await prisma.$transaction(async (tx) => {
        for (const row of chunk) {
          const category = row.category.trim().toUpperCase() as ExamCategoryType;
          const subjectCode = row.subjectCode.trim().toUpperCase();
          const chapterNum = parseInt(String(row.chapterNumber || "1"), 10);

          // Find or create subject
          const subject = await tx.subject.findFirst({
            where: { code: subjectCode },
          });

          if (!subject) {
            continue; // Skip if subject not found in curriculum
          }

          // Find or create chapter
          let chapter = await tx.chapter.findFirst({
            where: { subjectId: subject.id, chapterNum },
          });

          if (!chapter) {
            chapter = await tx.chapter.create({
              data: {
                subjectId: subject.id,
                chapterNum,
                nameBn: `অধ্যায় ${chapterNum}`,
                nameEn: `Chapter ${chapterNum}`,
              },
            });
          }

          // Duplicate detection based on Bengali text and chapter
          const existing = await tx.question.findFirst({
            where: {
              chapterId: chapter.id,
              questionTextBn: row.questionTextBn.trim(),
            },
          });

          if (existing) {
            continue; // Avoid duplicate questions
          }

          const marks = parseFloat(String(row.marks || "1.0"));
          const negativeMarks = parseFloat(String(row.negativeMarks || "0.25"));
          const diff = (row.difficulty?.toUpperCase() || "MEDIUM") as DifficultyLevel;

          const question = await tx.question.create({
            data: {
              category,
              subjectId: subject.id,
              chapterId: chapter.id,
              type: QuestionType.MCQ,
              difficulty: diff,
              status: ContentStatus.PUBLISHED,
              questionTextBn: row.questionTextBn.trim(),
              questionTextEn: row.questionTextEn?.trim() || null,
              marks,
              negativeMarks,
              authorId,
              options: {
                create: [
                  { optionKey: "A", textBn: String(row.optionA).trim(), isCorrect: row.correctKey === "A", orderIndex: 1 },
                  { optionKey: "B", textBn: String(row.optionB).trim(), isCorrect: row.correctKey === "B", orderIndex: 2 },
                  { optionKey: "C", textBn: String(row.optionC).trim(), isCorrect: row.correctKey === "C", orderIndex: 3 },
                  { optionKey: "D", textBn: String(row.optionD).trim(), isCorrect: row.correctKey === "D", orderIndex: 4 },
                ],
              },
              answer: {
                create: {
                  correctKey: row.correctKey.trim().toUpperCase(),
                  explanationBn: row.explanationBn.trim(),
                  explanationEn: row.explanationEn?.trim() || null,
                },
              },
            },
          });

          // Link board reference if provided
          if (row.boardCode && row.examYear) {
            const board = await tx.examinationBoard.findUnique({
              where: { code: row.boardCode.trim().toUpperCase() },
            });
            if (board) {
              await tx.questionReference.create({
                data: {
                  questionId: question.id,
                  boardId: board.id,
                  examYear: parseInt(String(row.examYear), 10),
                  examSessionName: `${board.nameBn} ${row.examYear}`,
                },
              });
            }
          }

          successfulCount++;
        }
      });
    }

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        successfulRows: successfulCount,
        status: "COMPLETED",
      },
    });

    return { successfulCount };
  }
}
