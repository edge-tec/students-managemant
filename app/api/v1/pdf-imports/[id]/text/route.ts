import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessPdf, canImportPdf } from "@/lib/auth/rbac";
import prisma from "@/lib/db/prisma";
import { PdfImportService } from "@/lib/pdf/pdfImportService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !canAccessPdf(user)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const pageNumParam = searchParams.get("pageNumber");
    const pageNumber = pageNumParam ? parseInt(pageNumParam, 10) : undefined;

    const [pages, latestVersion] = await Promise.all([
      prisma.extractedDocumentPage.findMany({
        where: {
          pdfImportId: id,
          ...(pageNumber ? { pageNumber } : {}),
        },
        orderBy: { pageNumber: "asc" },
      }),
      prisma.documentTextVersion.findFirst({
        where: { pdfImportId: id },
        orderBy: { versionNumber: "desc" },
      }),
    ]);

    const fullText = pages.map((p) => `--- PAGE ${p.pageNumber} ---\n${p.cleanedText}`).join("\n\n");

    return NextResponse.json({
      pages,
      fullText,
      latestVersion: latestVersion?.versionNumber || 1,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get extracted text error:", err);
    return NextResponse.json({ error: err.message || "Failed to retrieve text" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !canImportPdf(user)) {
      return NextResponse.json({ error: "Unauthorized to edit extracted text" }, { status: 403 });
    }

    const body = await req.json();
    const { pageNumber, content, diffSummary } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Content string is required" }, { status: 400 });
    }

    const result = await PdfImportService.updateExtractedText({
      importId: id,
      pageNumber: typeof pageNumber === "number" ? pageNumber : undefined,
      content,
      editedById: user.id,
      diffSummary,
    });

    return NextResponse.json({
      success: true,
      message: "Text correction saved successfully.",
      versionNumber: result.versionNumber,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Update extracted text error:", err);
    return NextResponse.json({ error: err.message || "Failed to update text" }, { status: 500 });
  }
}
