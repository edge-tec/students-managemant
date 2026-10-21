import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/rbac";
import { CurriculumService } from "@/lib/curriculum/curriculumService";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageUsers(user)) {
      return NextResponse.json({ error: "Unauthorized: Administrators only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId") || undefined;
    const subjectId = searchParams.get("subjectId") || undefined;
    const classId = searchParams.get("classId") || undefined;
    const onlyActive = searchParams.get("onlyActive") !== "false";

    const assignments = await CurriculumService.listTeacherAssignments({
      teacherId,
      subjectId,
      classId,
      onlyActive,
    });

    return NextResponse.json({ assignments });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin list teacher assignments error:", err);
    return NextResponse.json({ error: err.message || "Failed to list teacher assignments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageUsers(user)) {
      return NextResponse.json({ error: "Unauthorized: Administrators only" }, { status: 403 });
    }

    const body = await req.json();
    const { teacherId, subjectId, classId, notes } = body;
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;

    if (!teacherId || !subjectId) {
      return NextResponse.json({ error: "teacherId and subjectId are required" }, { status: 400 });
    }

    const assignment = await CurriculumService.assignTeacher(
      { teacherId, subjectId, classId, notes },
      user.id,
      ipAddress
    );

    return NextResponse.json(
      {
        success: true,
        message: "Teacher assigned to subject successfully",
        assignment,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin assign teacher error:", err);
    return NextResponse.json({ error: err.message || "Failed to assign teacher" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageUsers(user)) {
      return NextResponse.json({ error: "Unauthorized: Administrators only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;

    if (!id) {
      return NextResponse.json({ error: "Assignment ID query parameter is required" }, { status: 400 });
    }

    const revoked = await CurriculumService.revokeTeacherAssignment(id, user.id, ipAddress);

    return NextResponse.json({
      success: true,
      message: "Teacher assignment revoked successfully",
      assignment: revoked,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin revoke teacher assignment error:", err);
    return NextResponse.json({ error: err.message || "Failed to revoke teacher assignment" }, { status: 400 });
  }
}
