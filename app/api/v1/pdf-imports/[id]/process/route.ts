import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canImportPdf } from "@/lib/auth/rbac";
import { PdfImportService } from "@/lib/pdf/pdfImportService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !canImportPdf(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await PdfImportService.processImportPipeline(id);
    const updated = await PdfImportService.getImportById(id);

    return NextResponse.json({
      success: true,
      message: "Processing pipeline executed successfully.",
      import: updated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Retry PDF processing error:", err);
    return NextResponse.json({ error: err.message || "Failed to process PDF" }, { status: 500 });
  }
}
