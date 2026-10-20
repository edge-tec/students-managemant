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
});

export const AnswerSaveSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  selectedOption: z.string().nullable(),
  timeSpentSec: z.number().int().default(0),
});

export const ExamSubmitSchema = z.object({
  sessionId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOption: z.string().nullable(),
      timeSpentSec: z.number().int().default(0),
    })
  ),
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
