import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { ExamCategoryType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryParam = searchParams.get("category");

    const whereSubject: Record<string, unknown> = {};
    if (categoryParam && Object.values(ExamCategoryType).includes(categoryParam as ExamCategoryType)) {
      whereSubject.category = categoryParam as ExamCategoryType;
    }

    const [subjects, boards, universities] = await Promise.all([
      prisma.subject.findMany({
        where: whereSubject,
        include: {
          papers: true,
          chapters: {
            orderBy: { chapterNum: "asc" },
          },
        },
        orderBy: { orderIndex: "asc" },
      }),
      prisma.examinationBoard.findMany({
        orderBy: { code: "asc" },
      }),
      prisma.university.findMany({
        include: {
          admissionUnits: true,
        },
        orderBy: { shortName: "asc" },
      }),
    ]);

    return NextResponse.json({
      subjects,
      boards,
      universities,
    });
  } catch (error) {
    console.error("Curriculum API error:", error);
    return NextResponse.json({ error: "Failed to load curriculum" }, { status: 500 });
  }
}
