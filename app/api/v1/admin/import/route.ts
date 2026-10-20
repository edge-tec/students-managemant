import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isContentStaff } from "@/lib/auth/rbac";
import { QuestionImportEngine, QuestionImportRow } from "@/lib/imports/importEngine";

export async function GET() {
  const csv = QuestionImportEngine.getCsvTemplate();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="question_import_template_bengali.csv"',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Content staff only" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";
    let rows: QuestionImportRow[] = [];
    let commit = false;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      rows = body.rows || [];
      commit = Boolean(body.commit);
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      commit = formData.get("commit") === "true";

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
      rows = QuestionImportEngine.parseRawFile(buffer, isExcel);
    } else {
      return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
    }

    const validation = QuestionImportEngine.validateRows(rows);

    if (!commit) {
      // Preview Mode
      return NextResponse.json({
        preview: true,
        totalRows: validation.totalRows,
        validCount: validation.validRows.length,
        errorCount: validation.errors.length,
        errors: validation.errors,
        sampleValidRows: validation.validRows.slice(0, 5),
      });
    }

    // Execution Mode
    const job = await prisma.importJob.create({
      data: {
        fileName: "bulk_import_upload.csv",
        uploadedById: user.id,
        totalRows: validation.totalRows,
        failedRows: validation.errors.length,
        status: "PROCESSING",
      },
    });

    // Record row-level validation errors
    if (validation.errors.length > 0) {
      await prisma.importError.createMany({
        data: validation.errors.map((e) => ({
          jobId: job.id,
          rowNumber: e.rowNumber,
          columnName: e.column,
          errorMessage: e.message,
          rowDataJson: JSON.stringify(e.raw),
        })),
      });
    }

    const { successfulCount } = await QuestionImportEngine.executeImport(
      job.id,
      validation.validRows,
      user.id
    );

    return NextResponse.json({
      success: true,
      jobId: job.id,
      totalRows: validation.totalRows,
      successfulCount,
      failedCount: validation.errors.length,
      errors: validation.errors,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Bulk import error:", err);
    return NextResponse.json({ error: err.message || "Bulk import failed" }, { status: 500 });
  }
}
