import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { ExamCategoryType, ResourceType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const subjectId = searchParams.get("subjectId");
    const type = searchParams.get("type");
    const q = searchParams.get("q");

    const where: Record<string, unknown> = {};

    if (category && Object.values(ExamCategoryType).includes(category as ExamCategoryType)) {
      where.category = category as ExamCategoryType;
    }

    if (subjectId) where.subjectId = subjectId;
    if (type && Object.values(ResourceType).includes(type as ResourceType)) {
      where.type = type as ResourceType;
    }

    if (q && q.trim()) {
      where.OR = [
        { titleBn: { contains: q.trim(), mode: "insensitive" } },
        { titleEn: { contains: q.trim(), mode: "insensitive" } },
        { description: { contains: q.trim(), mode: "insensitive" } },
      ];
    }

    const resources = await prisma.libraryResource.findMany({
      where,
      include: {
        subject: { select: { nameBn: true, nameEn: true } },
        chapter: { select: { nameBn: true, nameEn: true, chapterNum: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ resources });
  } catch (error) {
    console.error("Library API error:", error);
    return NextResponse.json({ error: "Failed to fetch library resources" }, { status: 500 });
  }
}
