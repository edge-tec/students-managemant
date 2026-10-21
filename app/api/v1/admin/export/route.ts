import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isAnyStaff, isAdmin, isContentStaff, isFinanceStaff } from "@/lib/auth/rbac";
import { AuditService } from "@/lib/audit/auditService";

/**
 * Sanitizes values to prevent CSV / Excel formula injection (CWE-1236).
 * Any field starting with =, +, -, @, \t, or \r is prefixed with a single quote.
 */
function sanitizeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function generateCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const headerLine = headers.map(sanitizeCsvValue).join(",");
  const dataLines = rows.map((row) => row.map(sanitizeCsvValue).join(","));
  return [headerLine, ...dataLines].join("\r\n");
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAnyStaff(user)) {
      return NextResponse.json({ error: "Unauthorized access to data export" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "questions";

    let csvContent = "";
    const filename = `edubd-export-${type}-${Date.now()}.csv`;
    let recordCount = 0;

    if (type === "questions") {
      if (!isContentStaff(user)) {
        return NextResponse.json({ error: "Permission denied for question export" }, { status: 403 });
      }

      const questions = await prisma.question.findMany({
        take: 1000,
        orderBy: { createdAt: "desc" },
        include: {
          subject: { select: { nameEn: true, nameBn: true } },
          chapter: { select: { nameEn: true, nameBn: true } },
          author: { select: { fullName: true, email: true } },
          answer: { select: { explanationBn: true, explanationEn: true } },
        },
      });

      recordCount = questions.length;
      const headers = [
        "Question ID",
        "Type",
        "Status",
        "Subject",
        "Chapter",
        "Difficulty",
        "Marks",
        "Negative Marks",
        "Question (English)",
        "Question (Bengali)",
        "Explanation",
        "Author",
        "Created At",
      ];

      const rows = questions.map((q) => [
        q.id,
        q.type,
        q.status,
        q.subject?.nameBn || q.subject?.nameEn || "N/A",
        q.chapter?.nameBn || q.chapter?.nameEn || "N/A",
        q.difficulty,
        q.marks,
        q.negativeMarks,
        q.questionTextEn || "",
        q.questionTextBn,
        q.answer?.explanationBn || q.answer?.explanationEn || "",
        q.author?.fullName || q.author?.email || "System",
        q.createdAt.toISOString(),
      ]);

      csvContent = generateCsv(headers, rows);
    } else if (type === "payments") {
      if (!isFinanceStaff(user)) {
        return NextResponse.json({ error: "Permission denied for financial export" }, { status: 403 });
      }

      const orders = await prisma.paymentOrder.findMany({
        take: 1000,
        orderBy: { createdAt: "desc" },
        include: {
          student: { select: { fullName: true, email: true, phoneNumber: true } },
        },
      });

      recordCount = orders.length;
      const headers = [
        "Order ID",
        "Order Number",
        "User Name",
        "User Email",
        "Phone",
        "Amount (BDT)",
        "Status",
        "Method",
        "Provider Ref",
        "Created At",
      ];

      const rows = orders.map((o) => [
        o.id,
        o.orderNumber,
        o.student.fullName,
        o.student.email,
        o.student.phoneNumber || "",
        o.amountBdt,
        o.status,
        o.paymentMethod,
        o.providerTxId || "",
        o.createdAt.toISOString(),
      ]);

      csvContent = generateCsv(headers, rows);
    } else if (type === "users") {
      if (!isAdmin(user)) {
        return NextResponse.json({ error: "Permission denied for user export" }, { status: 403 });
      }

      const users = await prisma.user.findMany({
        take: 1000,
        orderBy: { createdAt: "desc" },
        include: {
          userRoles: { include: { role: true } },
        },
      });

      recordCount = users.length;
      const headers = [
        "User ID",
        "Full Name",
        "Email",
        "Phone",
        "Roles",
        "Status",
        "Registered At",
      ];

      const rows = users.map((u) => [
        u.id,
        u.fullName,
        u.email,
        u.phoneNumber || "",
        u.userRoles.map((r) => r.role.name).join("; "),
        u.isActive ? "ACTIVE" : "SUSPENDED",
        u.createdAt.toISOString(),
      ]);

      csvContent = generateCsv(headers, rows);
    } else {
      return NextResponse.json({ error: "Unsupported export type" }, { status: 400 });
    }

    await AuditService.log({
      userId: user.id,
      action: "DATA_EXPORTED",
      resource: type,
      details: {
        recordCount,
        format: "CSV",
      },
    });

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
