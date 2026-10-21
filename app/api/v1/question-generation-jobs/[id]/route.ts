import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessPdf } from "@/lib/auth/rbac";
import prisma from "@/lib/db/prisma";

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

    const job = await prisma.questionGenerationJob.findUnique({
      where: { id },
      include: {
        pdfImport: {
          select: {
            id: true,
            fileName: true,
            pageCount: true,
            status: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Generation job not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get generation job error:", err);
    return NextResponse.json({ error: err.message || "Failed to retrieve job" }, { status: 500 });
  }
}
