import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/rbac";
import { CurriculumService } from "@/lib/curriculum/curriculumService";
import { EnrollmentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageUsers(user)) {
      return NextResponse.json({ error: "Unauthorized: Administrators only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId") || undefined;
    const studentId = searchParams.get("studentId") || undefined;
    const statusParam = searchParams.get("status") as EnrollmentStatus | null;
    const status = statusParam && Object.values(EnrollmentStatus).includes(statusParam) ? statusParam : undefined;
    const academicYear = searchParams.get("academicYear") || undefined;

    const enrollments = await CurriculumService.listClassEnrollments({
      classId,
      studentId,
      status,
      academicYear,
    });

    return NextResponse.json({ enrollments });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin list class enrollments error:", err);
    return NextResponse.json({ error: err.message || "Failed to list class enrollments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageUsers(user)) {
      return NextResponse.json({ error: "Unauthorized: Administrators only" }, { status: 403 });
    }

    const body = await req.json();
    const { action, studentId, studentIds, classId, academicYear, rollNumber, notes } = body;
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;

    if (!classId) {
      return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    // Bulk enrollment
    if (action === "bulk" || Array.isArray(studentIds)) {
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return NextResponse.json({ error: "studentIds array is required for bulk enrollment" }, { status: 400 });
      }

      const result = await CurriculumService.bulkEnrollStudents(
        { studentIds, classId, academicYear },
        user.id,
        ipAddress
      );

      return NextResponse.json({
        success: true,
        message: `Bulk enrollment completed: ${result.enrolledCount} enrolled, ${result.skippedCount} skipped.`,
        ...result,
      });
    }

    // Single student enrollment
    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const enrollment = await CurriculumService.enrollStudent(
      { studentId, classId, academicYear, rollNumber, notes },
      user.id,
      ipAddress
    );

    return NextResponse.json(
      {
        success: true,
        message: "Student enrolled in academic class successfully",
        enrollment,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin enroll student error:", err);
    return NextResponse.json({ error: err.message || "Failed to enroll student" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageUsers(user)) {
      return NextResponse.json({ error: "Unauthorized: Administrators only" }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, fromClassId, toClassId, reason, academicYear } = body;
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;

    if (!studentId || !fromClassId || !toClassId) {
      return NextResponse.json(
        { error: "studentId, fromClassId, and toClassId are required for class transfer" },
        { status: 400 }
      );
    }

    const transferResult = await CurriculumService.transferStudent(
      { studentId, fromClassId, toClassId, reason, academicYear },
      user.id,
      ipAddress
    );

    return NextResponse.json({
      success: true,
      message: "Student transferred to new academic class successfully",
      enrollment: transferResult,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin transfer student error:", err);
    return NextResponse.json({ error: err.message || "Failed to transfer student" }, { status: 400 });
  }
}
