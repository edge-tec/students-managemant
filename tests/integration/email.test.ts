import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import prisma from "@/lib/db/prisma";
import { EmailService } from "@/lib/email/emailService";
import { AdminUserService } from "@/lib/admin/userService";
import { QuestionService } from "@/lib/questions/questionService";
import { ReportReason, ReportStatus, ExamCategoryType } from "@prisma/client";

describe("Transactional Email Service & SMTP Integration Tests", () => {
  let adminUserId: string;
  let studentUserId: string;
  const testStudentEmail = "student@edubd.ac";

  beforeAll(async () => {
    const admin = await prisma.user.findFirst({ where: { email: "admin@edubd.ac" } });
    const student = await prisma.user.findFirst({ where: { email: testStudentEmail } });
    if (!admin || !student) throw new Error("Seed users missing");
    adminUserId = admin.id;
    studentUserId = student.id;
  });

  beforeEach(() => {
    EmailService.clearRecentEmails();
  });

  it("should generate and send a password reset email with correct link and branding", async () => {
    const resetUrl = "http://localhost:3000/reset-password?token=test_token_123&email=student%40edubd.ac";
    const result = await EmailService.sendPasswordResetEmail(
      testStudentEmail,
      "Tanvir Ahmed",
      resetUrl,
      "127.0.0.1"
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();

    const recent = EmailService.getRecentEmails();
    expect(recent.length).toBe(1);
    expect(recent[0].to).toBe(testStudentEmail);
    expect(recent[0].subject).toContain("পাসওয়ার্ড রিসেট লিংক");
    expect(recent[0].html).toContain(resetUrl);
    expect(recent[0].html).toContain("EduBD");
  });

  it("should generate and send an account verification email", async () => {
    const verifyUrl = "http://localhost:3000/verify-email?token=verify_token_456";
    const result = await EmailService.sendAccountVerificationEmail(
      "newstudent@edubd.ac",
      "New Student",
      verifyUrl
    );

    expect(result.success).toBe(true);
    const recent = EmailService.getRecentEmails();
    expect(recent[0].to).toBe("newstudent@edubd.ac");
    expect(recent[0].subject).toContain("EduBD অ্যাকাউন্ট নিশ্চিত করুন");
    expect(recent[0].html).toContain(verifyUrl);
  });

  it("should generate and send question report resolved feedback email", async () => {
    const result = await EmailService.sendQuestionReportResolvedEmail(
      testStudentEmail,
      "Tanvir Ahmed",
      "নিউটনের ৩য় সূত্র বিবৃত করো।",
      "ভুল উত্তর (Wrong Answer)",
      "প্রশ্নটির অপশন সংশোধন করা হয়েছে।"
    );

    expect(result.success).toBe(true);
    const recent = EmailService.getRecentEmails();
    expect(recent[0].to).toBe(testStudentEmail);
    expect(recent[0].subject).toContain("রিপোর্টকৃত প্রশ্নটি সমাধান করা হয়েছে");
    expect(recent[0].html).toContain("প্রশ্নটির অপশন সংশোধন করা হয়েছে।");
  });

  it("should automatically dispatch an email when an admin triggers a password reset", async () => {
    const resetResult = await AdminUserService.triggerPasswordReset(
      studentUserId,
      adminUserId,
      "192.168.1.1"
    );

    expect(resetResult.success).toBe(true);

    const recent = EmailService.getRecentEmails();
    expect(recent.length).toBeGreaterThanOrEqual(1);
    const resetEmail = recent.find((e) => e.to === testStudentEmail && e.subject.includes("পাসওয়ার্ড রিসেট"));
    expect(resetEmail).toBeDefined();
    expect(resetEmail?.html).toContain(resetResult.resetToken);
  });

  it("should automatically dispatch an email when self-service forgot password is requested", async () => {
    const selfResult = await AdminUserService.requestSelfPasswordReset(testStudentEmail, "127.0.0.1");
    expect(selfResult.success).toBe(true);

    const recent = EmailService.getRecentEmails();
    const selfResetEmail = recent.find((e) => e.to === testStudentEmail && e.subject.includes("পাসওয়ার্ড রিসেট"));
    expect(selfResetEmail).toBeDefined();
  });

  it("should automatically dispatch resolution email when a question report is resolved", async () => {
    // 1. Create a question
    const q = await prisma.question.findFirst();
    expect(q).toBeDefined();

    // 2. Submit a report
    const report = await QuestionService.reportQuestion(q!.id, studentUserId, {
      reason: ReportReason.TYPO_OR_GRAMMAR,
      description: "ইমেইল নোটিফিকেশন ভেরিফিকেশন টেস্ট রিপোর্ট।",
    });

    // 3. Resolve report
    await QuestionService.resolveQuestionReport(
      report.id,
      ReportStatus.RESOLVED,
      "সংশোধন নিশ্চিত করা হয়েছে এবং ইমেইল পাঠানো হয়েছে।",
      adminUserId
    );

    const recent = EmailService.getRecentEmails();
    const reportEmail = recent.find((e) => e.to === testStudentEmail && e.subject.includes("রিপোর্টকৃত প্রশ্নটি সমাধান"));
    expect(reportEmail).toBeDefined();
    expect(reportEmail?.html).toContain("সংশোধন নিশ্চিত করা হয়েছে এবং ইমেইল পাঠানো হয়েছে।");
  });

  it("should record immutable audit logs for dispatched emails", async () => {
    await EmailService.sendEmail({
      to: "audittest@edubd.ac",
      subject: "Audit Verification Email",
      html: "<p>Audit Test Body</p>",
    });

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        action: "EMAIL_DISPATCHED",
        resource: "Email",
        detailsJson: {
          contains: "audittest@edubd.ac",
        },
      },
      orderBy: { createdAt: "desc" },
    });

    expect(auditLog).toBeDefined();
    expect(auditLog?.detailsJson).toContain("audittest@edubd.ac");
  });
});
