import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/db/prisma";
import { PdfSecurityService } from "@/lib/pdf/pdfSecurity";
import { TextCleanerService } from "@/lib/pdf/textCleaner";
import { OcrEngineService } from "@/lib/pdf/ocrEngine";
import { PdfExtractorService } from "@/lib/pdf/pdfExtractor";
import { PdfImportService } from "@/lib/pdf/pdfImportService";
import { AiQuestionGeneratorService } from "@/lib/pdf/aiQuestionGenerator";
import { QuestionDraftService } from "@/lib/pdf/questionDraftService";
import { QuestionService } from "@/lib/questions/questionService";
import {
  UserRoleType,
  ExamCategoryType,
  AiQuestionType,
  DraftQuestionStatus,
  DifficultyLevel,
  QuestionType,
  ContentStatus,
} from "@prisma/client";

function createValidPdfBuffer(textContent: string): Buffer {
  const streamContent = `BT\n/F1 12 Tf\n72 712 Td\n(${textContent.replace(/[()\\]/g, "\\$&")}) Tj\nET`;
  const streamLength = Buffer.byteLength(streamContent);
  const pdfSource = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000323 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
415
%%EOF`;
  return Buffer.from(pdfSource);
}

describe("AI-Powered PDF-to-Text & Automatic Question Generator Integration Tests", () => {
  let adminUser: any;
  let reviewerUser: any;
  let teacherUser: any;
  let studentUser: any;
  let testSubjectId: string;
  let testChapterId: string;

  beforeAll(async () => {
    // 1. Setup roles
    for (const roleName of [UserRoleType.ADMIN, UserRoleType.CONTENT_REVIEWER, UserRoleType.TEACHER, UserRoleType.STUDENT]) {
      await prisma.role.upsert({
        where: { name: roleName },
        create: { name: roleName, description: `${roleName} role` },
        update: {},
      });
    }

    // 2. Setup users
    adminUser = await prisma.user.upsert({
      where: { email: "pdf_admin_test@edubd.ac" },
      create: {
        email: "pdf_admin_test@edubd.ac",
        fullName: "PDF Admin Tester",
        passwordHash: "hash-admin",
        isActive: true,
      },
      update: { isActive: true },
    });
    const adminRole = await prisma.role.findUnique({ where: { name: UserRoleType.ADMIN } });
    if (adminRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
        create: { userId: adminUser.id, roleId: adminRole.id },
        update: {},
      });
    }

    reviewerUser = await prisma.user.upsert({
      where: { email: "pdf_reviewer_test@edubd.ac" },
      create: {
        email: "pdf_reviewer_test@edubd.ac",
        fullName: "Independent Reviewer Tester",
        passwordHash: "hash-reviewer",
        isActive: true,
      },
      update: { isActive: true },
    });
    const reviewerRole = await prisma.role.findUnique({ where: { name: UserRoleType.CONTENT_REVIEWER } });
    if (reviewerRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: reviewerUser.id, roleId: reviewerRole.id } },
        create: { userId: reviewerUser.id, roleId: reviewerRole.id },
        update: {},
      });
    }

    teacherUser = await prisma.user.upsert({
      where: { email: "pdf_teacher_test@edubd.ac" },
      create: {
        email: "pdf_teacher_test@edubd.ac",
        fullName: "Senior Teacher Tester",
        passwordHash: "hash-teacher",
        isActive: true,
      },
      update: { isActive: true },
    });
    const teacherRole = await prisma.role.findUnique({ where: { name: UserRoleType.TEACHER } });
    if (teacherRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: teacherUser.id, roleId: teacherRole.id } },
        create: { userId: teacherUser.id, roleId: teacherRole.id },
        update: {},
      });
    }

    studentUser = await prisma.user.upsert({
      where: { email: "pdf_student_test@edubd.ac" },
      create: {
        email: "pdf_student_test@edubd.ac",
        fullName: "Enrolled Student Tester",
        passwordHash: "hash-student",
        isActive: true,
      },
      update: { isActive: true },
    });

    // 3. Setup test curriculum
    const subject = await prisma.subject.upsert({
      where: { code: "PHY_AI_TEST" },
      create: {
        code: "PHY_AI_TEST",
        nameBn: "পদার্থবিজ্ঞান এআই মডিউল",
        nameEn: "Physics AI Module",
        category: ExamCategoryType.HSC,
      },
      update: {},
    });
    testSubjectId = subject.id;

    const chapter = await prisma.chapter.upsert({
      where: { id: "test-chap-pdf-ai-1" },
      create: {
        id: "test-chap-pdf-ai-1",
        subjectId: subject.id,
        chapterNum: 1,
        nameBn: "গতিবিদ্যা ও বলবিদ্যা",
        nameEn: "Kinematics and Dynamics",
      },
      update: {},
    });
    testChapterId = chapter.id;
  });

  afterAll(async () => {
    // Cleanup test records
    await prisma.pdfImport.deleteMany({
      where: { uploadedById: { in: [adminUser.id, teacherUser.id] } },
    });
  });

  describe("1. Security, File Validation & Path Sandboxing", () => {
    it("should accept valid PDF buffers with %PDF- header and %%EOF marker", () => {
      const validPdf = createValidPdfBuffer("Newton First Law of Motion: An object remains at rest unless acted upon by an external force.");
      const result = PdfSecurityService.validatePdfBuffer(validPdf, "physics_chapter1.pdf");
      expect(result.isValid).toBe(true);
      expect(result.fileHash).toBeDefined();
      expect(result.fileSize).toBeGreaterThan(64);
      expect(result.mimeType).toBe("application/pdf");
      expect(result.sanitizedFileName).toBe("physics_chapter1.pdf");
    });

    it("should reject non-PDF files that lack the %PDF- magic bytes", () => {
      const textBuffer = Buffer.from("Hello world, this is just a plain text document.");
      const result = PdfSecurityService.validatePdfBuffer(textBuffer, "fake_doc.pdf");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("does not match standard PDF specifications");
    });

    it("should reject empty or undersized buffers", () => {
      const emptyBuffer = Buffer.from("");
      const result = PdfSecurityService.validatePdfBuffer(emptyBuffer, "empty.pdf");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Empty file provided");
    });

    it("should reject corrupted buffers missing the %%EOF trailer marker", () => {
      const brokenBuffer = Buffer.from("%PDF-1.4\nSome random corrupted content that has no valid trailer or eof marker anywhere in the body");
      const result = PdfSecurityService.validatePdfBuffer(brokenBuffer, "corrupted.pdf");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Missing end-of-file (%%EOF) marker");
    });

    it("should sanitize malicious filenames and prevent directory traversal", () => {
      const malicious = "../../../etc/passwd.pdf";
      const sanitized = PdfSecurityService.sanitizeFileName(malicious);
      expect(sanitized).toBe("passwd.pdf");
      expect(sanitized).not.toContain("..");
      expect(sanitized).not.toContain("/");
    });
  });

  describe("2. Text Cleaning, Bengali Unicode Integrity & Language Detection", () => {
    it("should preserve Bengali Unicode matras and conjuncts while cleaning whitespace", () => {
      const rawBengali = "পদার্থবিজ্ঞান   ১ম   পত্রঃ  নিউটনের  গতিসূত্র।\r\n\r\n\r\nবল  F = ma ।";
      const cleaned = TextCleanerService.cleanPageText(rawBengali);
      expect(cleaned).toContain("পদার্থবিজ্ঞান ১ম পত্রঃ নিউটনের গতিসূত্র।");
      expect(cleaned).toContain("বল F = ma ।");
      expect(cleaned).not.toContain("   ");
    });

    it("should accurately detect Bengali, English, and mixed language documents", () => {
      const bengaliText = "নিউটনের প্রথম গতিসূত্র অনুসারে বাহ্যিক বল প্রয়োগ না করলে স্থির বস্তু চিরকাল স্থির থাকে।";
      const englishText = "An object at rest stays at rest and an object in motion stays in motion unless acted upon.";
      const mixedText = "HSC Physics: বল (Force) এবং ত্বরণ (Acceleration) এর মধ্যে সম্পর্ক F = ma।";

      expect(TextCleanerService.detectLanguage(bengaliText)).toBe("bn");
      expect(TextCleanerService.detectLanguage(englishText)).toBe("en");
      expect(TextCleanerService.detectLanguage(mixedText)).toBe("mixed");
    });

    it("should detect and remove repeating headers and footers across multi-page documents", () => {
      const pages = [
        { pageNumber: 1, text: "EduBD Official Model Test 2026\nপ্রথম অধ্যায়ের বিষয়বস্তু শুরু।\nপৃষ্ঠা ১" },
        { pageNumber: 2, text: "EduBD Official Model Test 2026\nদ্বিতীয় অধ্যায়ের গুরুত্বপূর্ণ সূত্রাবলী।\nপৃষ্ঠা ২" },
        { pageNumber: 3, text: "EduBD Official Model Test 2026\nতৃতীয় পরিচ্ছেদের গাণিতিক উদাহরণ।\nপৃষ্ঠা ৩" },
      ];

      const cleanedPages = TextCleanerService.removeRepeatingHeadersAndFooters(pages);
      expect(cleanedPages[0].text).not.toContain("EduBD Official Model Test 2026");
      expect(cleanedPages[0].text).toContain("প্রথম অধ্যায়ের বিষয়বস্তু শুরু।");
      expect(cleanedPages[1].text).toContain("দ্বিতীয় অধ্যায়ের গুরুত্বপূর্ণ সূত্রাবলী।");
    });
  });

  describe("3. OCR Engine & Scanned Page Detection", () => {
    it("should detect pages with insufficient text as requiring OCR", () => {
      const blankPageText = "   \n\n  ";
      const shortTitleOnly = "Physics Slide";
      const richPageText = "The acceleration of an object is directly proportional to the net force acting upon it and inversely proportional to its mass.";

      expect(OcrEngineService.requiresOcr(blankPageText)).toBe(true);
      expect(OcrEngineService.requiresOcr(shortTitleOnly)).toBe(true);
      expect(OcrEngineService.requiresOcr(richPageText)).toBe(false);
    });
  });

  describe("4. End-to-End PDF Import & Text Extraction Pipeline", () => {
    let importId: string;

    it("should successfully upload a real PDF, extract text, and create page records", async () => {
      const pdfText = "Newtonian Mechanics Chapter 1: The rate of change of momentum of a body is directly proportional to the applied force. F = dp/dt = m*a where m is mass and a is acceleration.";
      const pdfBuffer = createValidPdfBuffer(pdfText);

      const { importRecord, isDuplicate } = await PdfImportService.createImport({
        fileBuffer: pdfBuffer,
        originalFilename: "newtonian_mechanics.pdf",
        uploadedById: teacherUser.id,
        category: ExamCategoryType.HSC,
        subjectId: testSubjectId,
        chapterId: testChapterId,
      });

      expect(isDuplicate).toBe(false);
      expect(importRecord.id).toBeDefined();
      expect(importRecord.status).toBe("READY");
      expect(importRecord.pageCount).toBe(1);

      importId = importRecord.id;

      // Verify extracted page was persisted
      const pages = await prisma.extractedDocumentPage.findMany({
        where: { pdfImportId: importId },
      });
      expect(pages.length).toBe(1);
      expect(pages[0].cleanedText).toContain("Newtonian Mechanics");
      expect(pages[0].pageNumber).toBe(1);
    });

    it("should allow editing extracted text while creating a version history and preserving original PDF", async () => {
      const updatedText = "Newtonian Mechanics Chapter 1: Revised with Bengali annotations: বল F = ma এবং ভরবেগের পরিবর্তনের হার প্রযুক্ত বলের সমানুপাতিক।";
      const result = await PdfImportService.updateExtractedText({
        importId,
        pageNumber: 1,
        content: updatedText,
        editedById: teacherUser.id,
        diffSummary: "Added Bengali formulas and annotations.",
      });

      expect(result.success).toBe(true);
      expect(result.versionNumber).toBe(2);

      // Verify the page text was updated in database
      const page = await prisma.extractedDocumentPage.findUnique({
        where: { pdfImportId_pageNumber: { pdfImportId: importId, pageNumber: 1 } },
      });
      expect(page?.cleanedText).toContain("বল F = ma");

      // Verify version record exists
      const version = await prisma.documentTextVersion.findFirst({
        where: { pdfImportId: importId, versionNumber: 2 },
      });
      expect(version).toBeDefined();
      expect(version?.diffSummary).toContain("Added Bengali formulas");
    });
  });

  describe("5. AI Question Generation & Quality Control Validation", () => {
    it("should generate grounded questions with exact source citations from extracted text", async () => {
      const samplePages = [
        {
          pageNumber: 1,
          text: "কাজ ও শক্তি অধ্যায়: বল প্রয়োগের ফলে যদি বস্তুর সরণ ঘটে, তবে প্রযুক্ত বল ও বলের অভিমুখে সরণের গুণফলকে কাজ বলে। কাজের একক জুল (Joule)। ১ জুল = ১ নিউটন * ১ মিটার। কাজ একটি স্কেলার রাশি।",
        },
      ];

      const questions = AiQuestionGeneratorService.generateGroundedQuestionsFromText(
        samplePages,
        {
          requestedCount: 4,
          questionTypes: [AiQuestionType.MCQ, AiQuestionType.TRUE_FALSE, AiQuestionType.SHORT_ANSWER, AiQuestionType.DESCRIPTIVE],
          language: "bn",
          defaultMarks: 1.0,
          negativeMarks: 0.25,
        },
        4,
        [AiQuestionType.MCQ, AiQuestionType.TRUE_FALSE, AiQuestionType.SHORT_ANSWER, AiQuestionType.DESCRIPTIVE],
        "bn"
      );

      expect(questions.length).toBe(4);

      // Verify MCQ
      const mcq = questions.find((q) => q.questionType === AiQuestionType.MCQ);
      expect(mcq).toBeDefined();
      expect(mcq?.options?.length).toBe(4);
      expect(mcq?.correctKey).toBe("A");
      expect(mcq?.sourcePage).toBe(1);
      expect(mcq?.sourcePassage).toContain("কাজ ও শক্তি");

      // Verify True/False
      const tf = questions.find((q) => q.questionType === AiQuestionType.TRUE_FALSE);
      expect(tf).toBeDefined();
      expect(tf?.options?.length).toBe(2);

      // Verify Descriptive Question with Marking Rubric
      const desc = questions.find((q) => q.questionType === AiQuestionType.DESCRIPTIVE);
      expect(desc).toBeDefined();
      expect(desc?.markingRubric).toBeDefined();
      expect(desc?.markingRubric).toContain("নম্বর");
      expect(desc?.sourcePage).toBe(1);
    });

    it("should validate and clean malformed AI outputs through the quality control pipeline", () => {
      const malformedPayloads: any[] = [
        // Valid MCQ
        {
          questionType: AiQuestionType.MCQ,
          questionTextBn: "কাজের একক কী?",
          options: [
            { optionKey: "A", textBn: "জুল", isCorrect: true },
            { optionKey: "B", textBn: "ওয়াট", isCorrect: false },
            { optionKey: "C", textBn: "নিউটন", isCorrect: false },
            { optionKey: "D", textBn: "প্যাসকেল", isCorrect: false },
          ],
          sourcePage: 1,
          sourcePassage: "কাজের একক জুল।",
        },
        // Duplicate question
        {
          questionType: AiQuestionType.MCQ,
          questionTextBn: "কাজের একক কী?",
          options: [
            { optionKey: "A", textBn: "জুল", isCorrect: true },
            { optionKey: "B", textBn: "ওয়াট", isCorrect: false },
          ],
          sourcePage: 1,
        },
        // Invalid MCQ without correct answer
        {
          questionType: AiQuestionType.MCQ,
          questionTextBn: "ক্ষমতার সমীকরণ কোনটি?",
          options: [
            { optionKey: "A", textBn: "P = W/t", isCorrect: false },
            { optionKey: "B", textBn: "P = F*v", isCorrect: false },
          ],
          sourcePage: 1,
        },
      ];

      const validation = AiQuestionGeneratorService.validateQuestions(malformedPayloads, [
        { pageNumber: 1, text: "কাজের একক জুল।" },
      ]);

      expect(validation.cleanedQuestions.length).toBe(1);
      expect(validation.cleanedQuestions[0].questionTextBn).toBe("কাজের একক কী?");
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe("6. Editorial Review, Separation of Duties & Question Bank Import", () => {
    let generatedImportId: string;
    let draftId: string;

    beforeAll(async () => {
      const validPdf = createValidPdfBuffer("Electromagnetism: Moving charges produce magnetic fields. Faraday's law of induction states that induced EMF is equal to negative time rate of change of magnetic flux.");
      const { importRecord } = await PdfImportService.createImport({
        fileBuffer: validPdf,
        originalFilename: "electromagnetism.pdf",
        uploadedById: teacherUser.id,
        category: ExamCategoryType.HSC,
        subjectId: testSubjectId,
        chapterId: testChapterId,
      });
      generatedImportId = importRecord.id;

      // Generate question drafts
      const genResult = await QuestionDraftService.startGeneration(
        generatedImportId,
        {
          requestedCount: 3,
          questionTypes: [AiQuestionType.MCQ, AiQuestionType.SHORT_ANSWER],
          difficulty: DifficultyLevel.MEDIUM,
        },
        {
          id: teacherUser.id,
          email: teacherUser.email,
          fullName: teacherUser.fullName,
          roles: ["TEACHER"],
          preferredLang: "bn",
        }
      );

      expect(genResult.count).toBeGreaterThan(0);

      const drafts = await prisma.generatedQuestionDraft.findMany({
        where: { pdfImportId: generatedImportId },
      });
      expect(drafts.length).toBeGreaterThan(0);
      draftId = drafts[0].id;
    });

    it("should allow editing a question draft and recording an audit review event", async () => {
      const updated = await QuestionDraftService.updateDraft(
        draftId,
        {
          questionTextBn: "তড়িৎচৌম্বকীয় আবেশের ফ্যারাডের সূত্রানুসারে আবিষ্ট তড়িচ্চালক শক্তি কিসের সমানুপাতিক?",
          marks: 1.5,
          difficulty: DifficultyLevel.HARD,
          notes: "Clarified terminology for HSC students.",
        },
        {
          id: reviewerUser.id,
          email: reviewerUser.email,
          fullName: reviewerUser.fullName,
          roles: ["CONTENT_REVIEWER"],
          preferredLang: "bn",
        }
      );

      expect(updated.questionTextBn).toContain("তড়িৎচৌম্বকীয় আবেশের ফ্যারাডের সূত্রানুসারে");
      expect(updated.marks).toBe(1.5);
      expect(updated.difficulty).toBe(DifficultyLevel.HARD);

      // Verify review event was created
      const event = await prisma.questionReviewEvent.findFirst({
        where: { draftId, action: "EDIT" },
      });
      expect(event).toBeDefined();
      expect(event?.reviewerId).toBe(reviewerUser.id);
    });

    it("should enforce strict separation of duties: author cannot approve own questions", async () => {
      // Teacher who uploaded the PDF attempts to approve own generated question
      await expect(
        QuestionDraftService.approveDraft(
          draftId,
          {
            id: teacherUser.id,
            email: teacherUser.email,
            fullName: teacherUser.fullName,
            roles: ["TEACHER"],
            preferredLang: "bn",
          },
          "Self approval attempt"
        )
      ).rejects.toThrow(/Academic Quality Violation/i);
    });

    it("should allow an independent content reviewer to approve the question draft", async () => {
      const approved = await QuestionDraftService.approveDraft(
        draftId,
        {
          id: reviewerUser.id,
          email: reviewerUser.email,
          fullName: reviewerUser.fullName,
          roles: ["CONTENT_REVIEWER"],
          preferredLang: "bn",
        },
        "Verified against syllabus standards."
      );

      expect(approved.status).toBe(DraftQuestionStatus.APPROVED);

      const event = await prisma.questionReviewEvent.findFirst({
        where: { draftId, action: "APPROVE" },
      });
      expect(event).toBeDefined();
    });

    it("should allow an admin to batch approve all questions for a document", async () => {
      const res = await QuestionDraftService.approveAllForImport(generatedImportId, {
        id: adminUser.id,
        email: adminUser.email,
        fullName: adminUser.fullName,
        roles: ["ADMIN"],
        preferredLang: "bn",
      });
      expect(res.success).toBe(true);
    });

    it("should import approved question drafts into the official Question Bank and examination engine", async () => {
      const importResult = await QuestionDraftService.importToQuestionBank(
        [draftId],
        {
          id: adminUser.id,
          email: adminUser.email,
          fullName: adminUser.fullName,
          roles: ["ADMIN"],
          preferredLang: "bn",
        },
        { publishImmediately: true }
      );

      expect(importResult.success).toBe(true);
      expect(importResult.importedCount).toBe(1);
      const questionId = importResult.questionIds[0];

      // Verify the Question exists in the official Question Bank
      const bankQuestion = await QuestionService.getQuestionById(questionId, adminUser.id, true);
      expect(bankQuestion).toBeDefined();
      expect(bankQuestion?.questionTextBn).toContain("তড়িৎচৌম্বকীয় আবেশের");
      expect(bankQuestion?.status).toBe(ContentStatus.PUBLISHED);
      expect(bankQuestion?.textbookRef).toContain("উৎস পিডিএফ");
      expect(bankQuestion?.pdfImportId).toBe(generatedImportId);

      // Verify draft status transitioned to IMPORTED
      const updatedDraft = await prisma.generatedQuestionDraft.findUnique({
        where: { id: draftId },
      });
      expect(updatedDraft?.status).toBe(DraftQuestionStatus.IMPORTED);
      expect(updatedDraft?.importedQuestionId).toBe(questionId);
    });

    it("should prevent duplicate imports of already imported question drafts", async () => {
      // Attempting to re-import the already imported draft should find 0 approved drafts
      await expect(
        QuestionDraftService.importToQuestionBank(
          [draftId],
          {
            id: adminUser.id,
            email: adminUser.email,
            fullName: adminUser.fullName,
            roles: ["ADMIN"],
            preferredLang: "bn",
          }
        )
      ).rejects.toThrow(/No approved question drafts found/i);
    });

    it("should import approved drafts with custom Category, Class, Subject, Chapter, Topic, and Premium options", async () => {
      const job = await prisma.questionGenerationJob.findFirst({
        where: { pdfImportId: generatedImportId },
      });

      const draft = await prisma.generatedQuestionDraft.create({
        data: {
          jobId: job!.id,
          pdfImportId: generatedImportId,
          questionType: AiQuestionType.MCQ,
          difficulty: DifficultyLevel.MEDIUM,
          status: DraftQuestionStatus.APPROVED,
          questionTextBn: "কুরআন ও হাদিসের আলোকে তাওহীদের মূল ভিত্তি কোনটি?",
          optionsJson: JSON.stringify([
            { optionKey: "A", textBn: "আল্লাহর একত্ববাদ", isCorrect: true },
            { optionKey: "B", textBn: "শিরক", isCorrect: false },
          ]),
          correctKey: "A",
          explanationBn: "তাওহীদ অর্থ আল্লাহর একত্ববাদ বিশ্বাস করা।",
          marks: 1.0,
          negativeMarks: 0.25,
          category: ExamCategoryType.HSC,
          subjectId: testSubjectId,
          chapterId: testChapterId,
        },
      });

      const academicClass = await prisma.academicClass.findFirst();

      const importResult = await QuestionDraftService.importToQuestionBank(
        [draft.id],
        {
          id: adminUser.id,
          email: adminUser.email,
          fullName: adminUser.fullName,
          roles: ["ADMIN"],
          preferredLang: "bn",
        },
        {
          category: ExamCategoryType.SSC,
          classId: academicClass?.id,
          customSubjectName: "ইসলাম ও নৈতিক শিক্ষা (এসএসসি)",
          customChapterName: "আকাইদ ও নৈতিক জীবন",
          topicName: "তাওহীদের গুরুত্ব ও তাৎপর্য",
          isPremium: true,
          publishImmediately: true,
        }
      );

      expect(importResult.success).toBe(true);
      expect(importResult.importedCount).toBe(1);

      const q = await prisma.question.findUnique({
        where: { id: importResult.questionIds[0] },
        include: { subject: true, chapter: true, topic: true },
      });

      expect(q).toBeDefined();
      expect(q?.category).toBe(ExamCategoryType.SSC);
      expect(q?.isPremium).toBe(true);
      expect(q?.status).toBe(ContentStatus.PUBLISHED);
      expect(q?.subject.nameBn).toBe("ইসলাম ও নৈতিক শিক্ষা (এসএসসি)");
      expect(q?.chapter.nameBn).toBe("আকাইদ ও নৈতিক জীবন");
      expect(q?.topic?.nameBn).toBe("তাওহীদের গুরুত্ব ও তাৎপর্য");

      // Verify parent pdfImport is also updated with curriculum info
      const imp = await prisma.pdfImport.findUnique({
        where: { id: generatedImportId },
      });
      expect(imp?.category).toBe(ExamCategoryType.SSC);
      expect(imp?.subjectId).toBe(q?.subjectId);
      expect(imp?.chapterId).toBe(q?.chapterId);
    });
  });
});
