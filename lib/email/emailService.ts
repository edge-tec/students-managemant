import nodemailer from "nodemailer";
import prisma from "@/lib/db/prisma";
import { AuditService } from "@/lib/audit/auditService";
import {
  getPasswordResetTemplate,
  getAccountVerificationTemplate,
  getQuestionReportResolvedTemplate,
  getTestEmailTemplate,
} from "./templates";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailConfig {
  provider: "SMTP" | "RESEND" | "MOCK";
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  resendApiKey: string;
}

export interface SentEmailRecord {
  to: string;
  subject: string;
  html: string;
  text?: string;
  provider: string;
  sentAt: Date;
  messageId?: string;
}

// In-memory record of recent emails for testing and verification
const recentEmails: SentEmailRecord[] = [];

export class EmailService {
  /**
   * Retrieves active email configuration from database site settings with env fallbacks.
   */
  static async getConfig(overrides?: Partial<EmailConfig>): Promise<EmailConfig> {
    const keys = [
      "smtp_host",
      "smtp_port",
      "smtp_user",
      "smtp_pass",
      "smtp_from",
      "smtp_secure",
      "resend_api_key",
      "email_provider",
    ];

    let dbSettings: Record<string, string> = {};
    try {
      const records = await prisma.siteSetting.findMany({
        where: { key: { in: keys } },
      });
      for (const r of records) {
        dbSettings[r.key] = r.value;
      }
    } catch {
      // Non-blocking fallback to env vars if db table lookup fails
    }

    const host = overrides?.host ?? (dbSettings["smtp_host"] || process.env.SMTP_HOST || "localhost");
    const port = overrides?.port ?? parseInt(dbSettings["smtp_port"] || process.env.SMTP_PORT || "587", 10);
    const user = overrides?.user ?? (dbSettings["smtp_user"] || process.env.SMTP_USER || "");
    const pass = overrides?.pass ?? (dbSettings["smtp_pass"] || process.env.SMTP_PASS || "");
    const from = overrides?.from ?? (dbSettings["smtp_from"] || process.env.SMTP_FROM || "EduBD <noreply@edubd.ac>");
    const resendApiKey = overrides?.resendApiKey ?? (dbSettings["resend_api_key"] || process.env.RESEND_API_KEY || "");
    const secure = overrides?.secure ?? (dbSettings["smtp_secure"] === "true" || port === 465);

    let provider: "SMTP" | "RESEND" | "MOCK" = overrides?.provider || "SMTP";
    const configuredProvider = (dbSettings["email_provider"] || process.env.EMAIL_PROVIDER || "").toUpperCase();

    if (configuredProvider === "RESEND" || (resendApiKey && !user && !overrides?.provider)) {
      provider = "RESEND";
    } else if (configuredProvider === "MOCK") {
      provider = "MOCK";
    } else {
      provider = "SMTP";
    }

    return {
      provider,
      host,
      port,
      secure,
      user,
      pass,
      from,
      resendApiKey,
    };
  }

  /**
   * Core dispatcher that transmits email via Resend API, SMTP, or logs in test/dev mode.
   */
  static async sendEmail(
    options: SendEmailOptions,
    overrides?: Partial<EmailConfig>
  ): Promise<{ success: boolean; messageId?: string; provider: string; error?: string }> {
    const config = await this.getConfig(overrides);
    const fromAddress = options.from || config.from;

    try {
      // 1. Send via Resend REST API if configured
      if (config.provider === "RESEND" && config.resendApiKey) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [options.to],
            subject: options.subject,
            html: options.html,
            text: options.text,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || `Resend API rejected dispatch with status ${res.status}`);
        }

        const messageId = data.id || `resend_${Date.now()}`;
        this.recordSentEmail({
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          provider: "RESEND",
          sentAt: new Date(),
          messageId,
        });

        await AuditService.log({
          action: "EMAIL_DISPATCHED",
          resource: "Email",
          details: { to: options.to, subject: options.subject, provider: "RESEND", messageId },
        });

        return { success: true, messageId, provider: "RESEND" };
      }

      // 2. Send via SMTP if host and credentials configured
      const hasRealSmtp =
        config.host &&
        config.host !== "localhost" &&
        config.host !== "127.0.0.1" &&
        config.user;

      if (hasRealSmtp) {
        const transporter = nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: {
            user: config.user,
            pass: config.pass,
          },
        });

        const info = await transporter.sendMail({
          from: fromAddress,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });

        const messageId = info.messageId || `smtp_${Date.now()}`;
        this.recordSentEmail({
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          provider: "SMTP",
          sentAt: new Date(),
          messageId,
        });

        await AuditService.log({
          action: "EMAIL_DISPATCHED",
          resource: "Email",
          details: { to: options.to, subject: options.subject, provider: "SMTP", messageId },
        });

        return { success: true, messageId, provider: "SMTP" };
      }

      // 3. Fallback to Local/Mock Logging (Safe for CI, Vitest tests, and local dev without external SMTP)
      const mockId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      this.recordSentEmail({
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        provider: "MOCK_CONSOLE",
        sentAt: new Date(),
        messageId: mockId,
      });

      console.log(`[EmailService:MOCK] To: ${options.to} | Subject: "${options.subject}" | MessageId: ${mockId}`);

      await AuditService.log({
        action: "EMAIL_DISPATCHED",
        resource: "Email",
        details: { to: options.to, subject: options.subject, provider: "MOCK", messageId: mockId },
      });

      return { success: true, messageId: mockId, provider: "MOCK" };
    } catch (err: any) {
      console.error("[EmailService Error] Failed to send email:", err);
      return {
        success: false,
        provider: config.provider,
        error: err.message || "Failed to dispatch email",
      };
    }
  }

  /**
   * Dispatches a Password Reset Email
   */
  static async sendPasswordResetEmail(
    to: string,
    name: string,
    resetUrl: string,
    ipAddress?: string
  ) {
    const template = getPasswordResetTemplate({ name, resetUrl, ipAddress });
    return await this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Dispatches an Account Verification Email
   */
  static async sendAccountVerificationEmail(to: string, name: string, verifyUrl: string) {
    const template = getAccountVerificationTemplate({ name, verifyUrl });
    return await this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Dispatches Question Report Resolved Feedback Email
   */
  static async sendQuestionReportResolvedEmail(
    to: string,
    name: string,
    questionText: string,
    reasonText: string,
    adminNotes?: string | null
  ) {
    const template = getQuestionReportResolvedTemplate({
      name,
      questionText,
      reasonText,
      adminNotes,
    });
    return await this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Dispatches an Admin Test Email
   */
  static async sendTestEmail(to: string, overrides?: Partial<EmailConfig>) {
    const config = await this.getConfig(overrides);
    const template = getTestEmailTemplate({
      recipientEmail: to,
      provider: config.provider,
      configuredHost: config.host,
    });

    return await this.sendEmail(
      {
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      },
      overrides
    );
  }

  /**
   * Verifies SMTP connectivity
   */
  static async verifyConnection(overrides?: Partial<EmailConfig>): Promise<{ ok: boolean; message: string }> {
    const config = await this.getConfig(overrides);

    if (config.provider === "RESEND") {
      if (!config.resendApiKey) {
        return { ok: false, message: "Resend API key is not configured." };
      }
      return { ok: true, message: "Resend API key is configured and ready." };
    }

    if (!config.host || config.host === "localhost" || config.host === "127.0.0.1") {
      return {
        ok: true,
        message: "Development mode active: local logging will record all outgoing emails.",
      };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });

      await transporter.verify();
      return { ok: true, message: `Successfully connected to SMTP server ${config.host}:${config.port}` };
    } catch (err: any) {
      return { ok: false, message: err.message || "Failed to verify SMTP connection" };
    }
  }

  private static recordSentEmail(record: SentEmailRecord) {
    recentEmails.unshift(record);
    if (recentEmails.length > 50) {
      recentEmails.pop();
    }
  }

  /**
   * Testing helper to inspect recently dispatched emails
   */
  static getRecentEmails(): SentEmailRecord[] {
    return [...recentEmails];
  }

  /**
   * Testing helper to clear recorded emails
   */
  static clearRecentEmails(): void {
    recentEmails.length = 0;
  }
}
