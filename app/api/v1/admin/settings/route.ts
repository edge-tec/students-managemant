import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin, canManageSettings } from "@/lib/auth/rbac";
import { AuditService } from "@/lib/audit/auditService";

const DEFAULT_SETTINGS: Record<string, { value: string; description: string }> = {
  site_name: {
    value: "EduBD Platform",
    description: "Platform formal title displayed across header and emails",
  },
  site_tagline: {
    value: "Learn • Practice • Test • Succeed",
    description: "Official educational motto and brand promise",
  },
  registration_enabled: {
    value: "true",
    description: "Allow new students to sign up publicly",
  },
  review_separation_of_duties: {
    value: "true",
    description: "Enforce that question authors cannot approve their own questions",
  },
  default_exam_duration_minutes: {
    value: "60",
    description: "Default standard duration in minutes for newly created exams",
  },
  negative_marking_default: {
    value: "0.25",
    description: "Standard negative mark penalty per wrong MCQ answer",
  },
  maintenance_mode: {
    value: "false",
    description: "Temporarily restrict student portal for scheduled maintenance",
  },
  support_email: {
    value: "support@edubd.ac",
    description: "Central student support desk email address",
  },
  bkash_enabled: {
    value: "true",
    description: "Enable bKash payment gateway and manual merchant verification",
  },
  nagad_enabled: {
    value: "true",
    description: "Enable Nagad payment gateway and merchant settlement",
  },
  smtp_host: {
    value: "smtp.resend.com",
    description: "SMTP mail server host (e.g. smtp.resend.com or smtp.gmail.com)",
  },
  smtp_port: {
    value: "587",
    description: "SMTP connection port (e.g. 587 for STARTTLS, 465 for SSL)",
  },
  smtp_user: {
    value: "resend",
    description: "SMTP authentication username or api key identifier",
  },
  smtp_pass: {
    value: "",
    description: "SMTP authentication password or secret token",
  },
  smtp_from: {
    value: "EduBD <noreply@edubd.ac>",
    description: "Default sender email and display name for transactional emails",
  },
  smtp_secure: {
    value: "false",
    description: "Use direct SSL/TLS socket (true for port 465, false for 587)",
  },
  resend_api_key: {
    value: "",
    description: "Resend.com REST API Key for direct HTTP transactional email delivery",
  },
  email_provider: {
    value: "SMTP",
    description: "Active delivery provider mode: SMTP, RESEND, or MOCK",
  },
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized administrative access" }, { status: 403 });
    }

    const dbSettings = await prisma.siteSetting.findMany({
      orderBy: { key: "asc" },
    });

    const settingsMap: Record<string, { value: string; description: string; updatedAt?: Date }> = {};

    // Initialize with defaults
    for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
      settingsMap[key] = { value: def.value, description: def.description };
    }

    // Overlay persisted settings
    for (const item of dbSettings) {
      settingsMap[item.key] = {
        value: item.value,
        description: item.description || DEFAULT_SETTINGS[item.key]?.description || "",
        updatedAt: item.updatedAt,
      };
    }

    return NextResponse.json({
      settings: Object.entries(settingsMap).map(([key, val]) => ({
        key,
        value: val.value,
        description: val.description,
        updatedAt: val.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Admin settings GET error:", error);
    return NextResponse.json({ error: "Failed to load platform settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageSettings(user)) {
      return NextResponse.json({ error: "Insufficient permissions to update settings" }, { status: 403 });
    }

    const body = await req.json();
    const { settings } = body;

    if (!Array.isArray(settings) && typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings format" }, { status: 400 });
    }

    const itemsToUpdate: Array<{ key: string; value: string; description?: string }> = Array.isArray(settings)
      ? settings
      : Object.entries(settings).map(([key, value]) => ({
          key,
          value: String(value),
        }));

    const updatedSettings = [];

    for (const item of itemsToUpdate) {
      if (!item.key || typeof item.key !== "string") continue;
      const safeKey = item.key.trim().toLowerCase();
      const safeVal = String(item.value ?? "").trim();
      const description = item.description || DEFAULT_SETTINGS[safeKey]?.description || null;

      const record = await prisma.siteSetting.upsert({
        where: { key: safeKey },
        create: {
          key: safeKey,
          value: safeVal,
          description,
        },
        update: {
          value: safeVal,
          description: description ?? undefined,
        },
      });
      updatedSettings.push(record);
    }

    await AuditService.log({
      userId: user.id,
      action: "SETTINGS_UPDATED",
      resource: "SiteSetting",
      details: {
        updatedKeys: itemsToUpdate.map((i) => i.key),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Platform settings updated successfully",
      settings: updatedSettings,
    });
  } catch (error) {
    console.error("Admin settings PUT error:", error);
    return NextResponse.json({ error: "Failed to update platform settings" }, { status: 500 });
  }
}
