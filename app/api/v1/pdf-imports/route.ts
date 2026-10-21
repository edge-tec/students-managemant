import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canImportPdf, canAccessPdf } from "@/lib/auth/rbac";
import { PdfImportService } from "@/lib/pdf/pdfImportService";
import { ExamCategoryType, PdfImportStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canAccessPdf(user)) {
      return NextResponse.json({ error: "Unauthorized access to PDF imports" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || searchParams.get("q") || undefined;
    const category = searchParams.get("category") as ExamCategoryType | undefined;
    const subjectId = searchParams.get("subjectId") || undefined;
    const status = searchParams.get("status") as PdfImportStatus | undefined;

    const result = await PdfImportService.listImports({
      page,
      limit,
      search,
      category,
      subjectId,
      status,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("List PDF imports error:", err);
    return NextResponse.json({ error: err.message || "Failed to list PDF imports" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canImportPdf(user)) {
      return NextResponse.json({ error: "Unauthorized to upload and process PDF documents" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No PDF file provided in upload request." }, { status: 400 });
    }

    const category = (formData.get("category") as ExamCategoryType) || undefined;
    const classId = (formData.get("classId") as string) || undefined;
    const subjectId = (formData.get("subjectId") as string) || undefined;
    const chapterId = (formData.get("chapterId") as string) || undefined;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    const { importRecord, isDuplicate } = await PdfImportService.createImport({
      fileBuffer,
      originalFilename: file.name,
      uploadedById: user.id,
      category,
      classId,
      subjectId,
      chapterId,
      ipAddress: clientIp,
    });

    return NextResponse.json(
      {
        success: true,
        isDuplicate,
        import: importRecord,
      },
      { status: isDuplicate ? 200 : 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error("PDF upload error:", err);
    return NextResponse.json({ error: err.message || "PDF upload and processing failed." }, { status: 400 });
  }
}
