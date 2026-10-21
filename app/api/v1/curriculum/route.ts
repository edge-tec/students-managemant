import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { ExamCategoryType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryParam = searchParams.get("category");
    const classIdParam = searchParams.get("classId");
    const groupIdParam = searchParams.get("groupId");

    const whereSubject: Record<string, unknown> = {
      isActive: true,
    };

    if (categoryParam && Object.values(ExamCategoryType).includes(categoryParam as ExamCategoryType)) {
      whereSubject.category = categoryParam as ExamCategoryType;
    }

    if (classIdParam) {
      whereSubject.classId = classIdParam;
    }

    if (groupIdParam) {
      whereSubject.groupId = groupIdParam;
    }

    const [classes, groups, subjects, boards, universities] = await Promise.all([
      prisma.academicClass.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: "asc" },
      }),
      prisma.academicGroup.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: "asc" },
      }),
      prisma.subject.findMany({
        where: whereSubject,
        include: {
          academicClass: true,
          academicGroup: true,
          papers: {
            where: { isActive: true },
            orderBy: { paperNumber: "asc" },
          },
          chapters: {
            where: { isActive: true },
            orderBy: { chapterNum: "asc" },
            include: {
              topics: {
                where: { isActive: true },
                orderBy: { orderIndex: "asc" },
              },
            },
          },
        },
        orderBy: { orderIndex: "asc" },
      }),
      prisma.examinationBoard.findMany({
        where: { isActive: true },
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
      classes,
      groups,
      subjects,
      boards,
      universities,
    });
  } catch (error) {
    console.error("Curriculum API error:", error);
    return NextResponse.json({ error: "Failed to load curriculum" }, { status: 500 });
  }
}
