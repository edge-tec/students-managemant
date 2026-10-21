import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessPdf, canManagePdf } from "@/lib/auth/rbac";
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

    const item = await PdfImportService.getImportById(id);
    if (!item) {
      return NextResponse.json({ error: "PDF Import not found" }, { status: 404 });
    }

    return NextResponse.json({ import: item });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get PDF import error:", err);
    return NextResponse.json({ error: err.message || "Failed to retrieve import" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !canManagePdf(user)) {
      return NextResponse.json({ error: "Unauthorized to delete PDF imports" }, { status: 403 });
    }

    await PdfImportService.deleteImport(id, user.id);
    return NextResponse.json({ success: true, message: "PDF Import and associated records deleted." });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Delete PDF import error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete PDF import" }, { status: 500 });
  }
}
