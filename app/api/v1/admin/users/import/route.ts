import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/rbac";
import { AdminUserService } from "@/lib/admin/userService";

function parseCsvText(text: string): Array<{
  email: string;
  fullName: string;
  fullNameBn?: string;
  phoneNumber?: string;
  role?: string;
  institution?: string;
  targetCategory?: string;
}> {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const emailIdx = header.findIndex((h) => h.includes("email"));
  const nameIdx = header.findIndex((h) => h.includes("name") && !h.includes("bn"));
  const nameBnIdx = header.findIndex((h) => h.includes("bn") || h.includes("bangla"));
  const phoneIdx = header.findIndex((h) => h.includes("phone") || h.includes("mobile"));
  const roleIdx = header.findIndex((h) => h.includes("role"));
  const instIdx = header.findIndex((h) => h.includes("institution") || h.includes("school") || h.includes("college"));
  const catIdx = header.findIndex((h) => h.includes("category") || h.includes("target"));

  const results: Array<{
    email: string;
    fullName: string;
    fullNameBn?: string;
    phoneNumber?: string;
    role?: string;
    institution?: string;
    targetCategory?: string;
  }> = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Split on comma ignoring inside quotes
    const cells = rawLine.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const email = emailIdx >= 0 && cells[emailIdx] ? cells[emailIdx] : cells[0] || "";
    const fullName = nameIdx >= 0 && cells[nameIdx] ? cells[nameIdx] : cells[1] || "";
    const fullNameBn = nameBnIdx >= 0 && cells[nameBnIdx] ? cells[nameBnIdx] : undefined;
    const phoneNumber = phoneIdx >= 0 && cells[phoneIdx] ? cells[phoneIdx] : undefined;
    const role = roleIdx >= 0 && cells[roleIdx] ? cells[roleIdx] : undefined;
    const institution = instIdx >= 0 && cells[instIdx] ? cells[instIdx] : undefined;
    const targetCategory = catIdx >= 0 && cells[catIdx] ? cells[catIdx] : undefined;

    results.push({
      email,
      fullName,
      fullNameBn,
      phoneNumber,
      role,
      institution,
      targetCategory,
    });
  }

  return results;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageUsers(user)) {
      return NextResponse.json({ error: "Unauthorized: Administrators only" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;

    let rows: Array<{
      email: string;
      fullName: string;
      fullNameBn?: string;
      phoneNumber?: string;
      role?: string;
      institution?: string;
      targetCategory?: string;
    }> = [];

    if (contentType.includes("text/csv")) {
      const text = await req.text();
      rows = parseCsvText(text);
    } else {
      const body = await req.json();
      if (Array.isArray(body.rows)) {
        rows = body.rows;
      } else if (typeof body.csvContent === "string") {
        rows = parseCsvText(body.csvContent);
      } else {
        return NextResponse.json({ error: "Invalid payload: provide rows array or csvContent string" }, { status: 400 });
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid data rows found in import payload" }, { status: 400 });
    }

    const result = await AdminUserService.importUsersFromCsv(rows, user.id, ipAddress);

    return NextResponse.json({
      success: true,
      message: `Processed ${result.totalRows} rows: ${result.successfulRows} created, ${result.failedRows} failed.`,
      ...result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin CSV user import error:", err);
    return NextResponse.json({ error: err.message || "Failed to import users from CSV" }, { status: 400 });
  }
}
