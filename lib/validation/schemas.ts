import { z } from "zod";

export const RegisterSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  examCategory: z.enum(["SSC", "HSC", "MEDICAL", "DENTAL", "UNIVERSITY"]).default("SSC"),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const CustomExamCreateSchema = z.object({
  category: z.enum(["SSC", "HSC", "MEDICAL", "DENTAL", "UNIVERSITY"]),
  subjectId: z.string().min(1, "Subject is required"),
  paperId: z.string().optional(),
  chapterIds: z.array(z.string()).default([]),
  questionCount: z.number().int().min(5).max(100).default(20),
  durationMinutes: z.number().int().min(5).max(120).default(20),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "MIXED"]).default("MIXED"),
  mode: z.enum(["PRACTICE", "REAL_EXAM"]).default("REAL_EXAM"),
  source: z.enum(["ALL", "BOARD", "ADMISSION"]).default("ALL"),
  adaptive: z.boolean().optional(),
});

export const AnswerSaveSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  selectedOption: z.string().nullable().optional(),
  writtenAnswer: z.string().nullable().optional(),
  timeSpentSec: z.number().int().default(0),
  isMarkedForReview: z.boolean().optional(),
});

export const ExamSubmitSchema = z.object({
  sessionId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOption: z.string().nullable().optional(),
      writtenAnswer: z.string().nullable().optional(),
      timeSpentSec: z.number().int().default(0),
    })
  ),
});

export const AdminExamCreateSchema = z.object({
  titleBn: z.string().min(3, "Bangla title is required"),
  titleEn: z.string().min(3, "English title is required"),
  descriptionBn: z.string().optional(),
  descriptionEn: z.string().optional(),
  category: z.enum(["SSC", "HSC", "MEDICAL", "DENTAL", "UNIVERSITY"]),
  examType: z.enum([
    "PRACTICE",
    "CHAPTER_TEST",
    "SUBJECT_TEST",
    "MODEL_TEST",
    "FULL_SYLLABUS",
    "ADMISSION_TEST",
    "MEDICAL_ADMISSION",
    "UNIVERSITY_ADMISSION",
    "CUSTOM",
  ]).default("MODEL_TEST"),
  academicClassId: z.string().optional(),
  subjectId: z.string().optional(),
  paperId: z.string().optional(),
  chapterId: z.string().optional(),
  boardId: z.string().optional(),
  examYear: z.number().int().optional(),
  durationMinutes: z.number().int().min(5).max(300),
  totalMarks: z.number().min(1),
  passMarks: z.number().optional(),
  negativeMarks: z.number().min(0).max(2).default(0.25),
  questionCount: z.number().int().min(1),
  randomizeQuestions: z.boolean().default(true),
  randomizeOptions: z.boolean().default(true),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  maxAttempts: z.number().int().min(1).optional().nullable(),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "SCHEDULED", "ARCHIVED"]).default("DRAFT"),
  accessType: z.enum(["FREE", "SUBSCRIPTION_ONLY", "PAID"]).default("FREE"),
  priceBdt: z.number().min(0).optional().nullable(),
  releasePolicy: z.enum(["IMMEDIATE", "AFTER_EXAM_WINDOW", "MANUAL"]).default("IMMEDIATE"),
  instructionsBn: z.string().optional(),
  instructionsEn: z.string().optional(),
  allowedResources: z.string().optional(),
  questionIds: z.array(z.string()).default([]),
  sections: z.array(
    z.object({
      titleBn: z.string().min(1),
      titleEn: z.string().min(1),
      descriptionBn: z.string().optional(),
      descriptionEn: z.string().optional(),
      durationMinutes: z.number().int().optional(),
      totalMarks: z.number().optional(),
      orderIndex: z.number().int().default(1),
      questionIds: z.array(z.string()).default([]),
    })
  ).default([]),
});

export const AdminExamUpdateSchema = AdminExamCreateSchema.partial();

export const ManualGradeInputSchema = z.object({
  answerId: z.string().uuid(),
  marksAwarded: z.number().min(0),
  rubricFeedback: z.string().optional(),
  reviewNotes: z.string().optional(),
});

export const RegradeExamInputSchema = z.object({
  sessionId: z.string().uuid(),
  reason: z.string().min(3, "Reason is required for regrading"),
});

export const WrongPracticeCreateSchema = z.object({
  category: z.enum(["SSC", "HSC", "MEDICAL", "DENTAL", "UNIVERSITY"]),
  subjectId: z.string().optional(),
  chapterId: z.string().optional(),
  limit: z.number().int().min(5).max(50).default(15),
});

export const CreateQuestionSchema = z.object({
  category: z.enum(["SSC", "HSC", "MEDICAL", "DENTAL", "UNIVERSITY"]),
  subjectId: z.string().min(1),
  paperId: z.string().optional(),
  chapterId: z.string().min(1),
  topicId: z.string().optional(),
  type: z.enum(["MCQ", "CQ"]).default("MCQ"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  questionTextBn: z.string().min(5, "Bengali question text is required"),
  questionTextEn: z.string().optional(),
  marks: z.number().default(1.0),
  negativeMarks: z.number().default(0.25),
  estimatedSeconds: z.number().default(60),
  textbookRef: z.string().optional(),
  teacherTipsBn: z.string().optional(),
  options: z.array(
    z.object({
      optionKey: z.string(),
      textBn: z.string(),
      textEn: z.string().optional(),
      isCorrect: z.boolean(),
    })
  ).min(2),
  correctKey: z.string(),
  explanationBn: z.string().min(3),
  explanationEn: z.string().optional(),
  boardId: z.string().optional(),
  examYear: z.number().int().optional(),
  universityId: z.string().optional(),
  admissionUnitId: z.string().optional(),
  isPremium: z.boolean().default(false),
});

export const CreatePaymentOrderSchema = z.object({
  planId: z.string().min(1, "Subscription plan is required"),
  paymentMethod: z.enum(["BKASH", "NAGAD", "BANK_TRANSFER", "CARD"]),
});

export const CreateDoubtTicketSchema = z.object({
  subjectId: z.string().min(1, "Subject is required"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  questionBn: z.string().min(10, "Please describe your question clearly"),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
});

export const ResetPasswordSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
  token: z.string().min(1, "Password reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const ResolveQuestionReportSchema = z.object({
  reportId: z.string().min(1, "Report ID is required"),
  status: z.enum(["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"]),
  adminNotes: z.string().max(1000).optional().nullable(),
});



