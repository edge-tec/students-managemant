import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canManagePdf, canAccessPdf } from "@/lib/auth/rbac";
import { PdfImportService } from "@/lib/pdf/pdfImportService";
import prisma from "@/lib/db/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !canAccessPdf(user)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id: importId } = await params;
    const imp = await prisma.pdfImport.findUnique({
      where: { id: importId },
      include: {
        pages: {
          orderBy: { pageNumber: "asc" },
        },
      },
    });

    if (!imp) {
      return NextResponse.json({ error: "PDF import not found." }, { status: 404 });
    }

    const isOwner = imp.uploadedById === user.id;
    if (!isOwner && !canManagePdf(user)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to manage this document." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const pageNumber = body.pageNumber ? parseInt(body.pageNumber, 10) : undefined;
    const allBroken = Boolean(body.allBroken);

    if (pageNumber) {
      const res = await PdfImportService.healPageFont(importId, pageNumber, user.id);
      return NextResponse.json({
        success: true,
        healedCount: 1,
        page: res,
      });
    }

    if (allBroken) {
      const pageNumbers = imp.pages.map((p) => p.pageNumber);
      const res = await PdfImportService.healMultiplePages(importId, pageNumbers, user.id);
      return NextResponse.json(res);
    }

    return NextResponse.json(
      { error: "Must specify pageNumber or allBroken: true." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("PDF heal font error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to heal font for PDF page." },
      { status: 500 }
    );
  }
}
