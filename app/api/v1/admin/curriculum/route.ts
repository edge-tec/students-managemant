import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isContentStaff } from "@/lib/auth/rbac";
import { CurriculumService } from "@/lib/curriculum/curriculumService";
import { ExamCategoryType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Content staff only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity") || "all";
    const category = searchParams.get("category") as ExamCategoryType | null;
    const classId = searchParams.get("classId");
    const groupId = searchParams.get("groupId");
    const subjectId = searchParams.get("subjectId");
    const chapterId = searchParams.get("chapterId");
    const onlyActive = searchParams.get("onlyActive") !== "false";

    if (entity === "classes") {
      const classes = await CurriculumService.listClasses(onlyActive);
      return NextResponse.json({ classes });
    }

    if (entity === "groups") {
      const groups = await CurriculumService.listGroups(onlyActive);
      return NextResponse.json({ groups });
    }

    if (entity === "subjects") {
      const subjects = await CurriculumService.listSubjects({
        category: category || undefined,
        classId: classId || undefined,
        groupId: groupId || undefined,
        onlyActive,
      });
      return NextResponse.json({ subjects });
    }

    if (entity === "chapters" && subjectId) {
      const chapters = await CurriculumService.listChapters({ subjectId, onlyActive });
      return NextResponse.json({ chapters });
    }

    if (entity === "topics" && chapterId) {
      const topics = await CurriculumService.listTopics(chapterId, onlyActive);
      return NextResponse.json({ topics });
    }

    if (entity === "boards") {
      const boards = await CurriculumService.listBoards(onlyActive);
      return NextResponse.json({ boards });
    }

    // Default: Return overview of classes, groups, subjects, and boards
    const [classes, groups, subjects, boards] = await Promise.all([
      CurriculumService.listClasses(onlyActive),
      CurriculumService.listGroups(onlyActive),
      CurriculumService.listSubjects({ category: category || undefined, onlyActive }),
      CurriculumService.listBoards(onlyActive),
    ]);

    return NextResponse.json({ classes, groups, subjects, boards });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin curriculum GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch curriculum" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Content staff only" }, { status: 403 });
    }

    const body = await req.json();
    const { entity, ...payload } = body;

    switch (entity) {
      case "class": {
        const result = await CurriculumService.createClass(payload);
        return NextResponse.json({ success: true, item: result }, { status: 201 });
      }
      case "group": {
        const result = await CurriculumService.createGroup(payload);
        return NextResponse.json({ success: true, item: result }, { status: 201 });
      }
      case "subject": {
        const result = await CurriculumService.createSubject(payload);
        return NextResponse.json({ success: true, item: result }, { status: 201 });
      }
      case "paper": {
        const result = await CurriculumService.createPaper(payload);
        return NextResponse.json({ success: true, item: result }, { status: 201 });
      }
      case "chapter": {
        const result = await CurriculumService.createChapter(payload);
        return NextResponse.json({ success: true, item: result }, { status: 201 });
      }
      case "topic": {
        const result = await CurriculumService.createTopic(payload);
        return NextResponse.json({ success: true, item: result }, { status: 201 });
      }
      case "board": {
        const result = await CurriculumService.createBoard(payload);
        return NextResponse.json({ success: true, item: result }, { status: 201 });
      }
      default:
        return NextResponse.json({ error: `Unknown curriculum entity: ${entity}` }, { status: 400 });
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin curriculum POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to create curriculum item" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Content staff only" }, { status: 403 });
    }

    const body = await req.json();
    const { entity, id, ...payload } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing entity id" }, { status: 400 });
    }

    if (payload.action === "archive") {
      payload.isActive = false;
    } else if (payload.action === "restore") {
      payload.isActive = true;
    }

    switch (entity) {
      case "class": {
        const result = await CurriculumService.updateClass(id, payload);
        return NextResponse.json({ success: true, item: result });
      }
      case "group": {
        const result = await CurriculumService.updateGroup(id, payload);
        return NextResponse.json({ success: true, item: result });
      }
      case "subject": {
        const result = await CurriculumService.updateSubject(id, payload);
        return NextResponse.json({ success: true, item: result });
      }
      case "paper": {
        const result = await CurriculumService.updatePaper(id, payload);
        return NextResponse.json({ success: true, item: result });
      }
      case "chapter": {
        const result = await CurriculumService.updateChapter(id, payload);
        return NextResponse.json({ success: true, item: result });
      }
      case "topic": {
        const result = await CurriculumService.updateTopic(id, payload);
        return NextResponse.json({ success: true, item: result });
      }
      case "board": {
        const result = await CurriculumService.updateBoard(id, payload);
        return NextResponse.json({ success: true, item: result });
      }
      default:
        return NextResponse.json({ error: `Unknown curriculum entity: ${entity}` }, { status: 400 });
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin curriculum PUT error:", err);
    return NextResponse.json({ error: err.message || "Failed to update curriculum item" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Content staff only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity");
    const id = searchParams.get("id");

    if (!entity || !id) {
      return NextResponse.json({ error: "entity and id query parameters are required" }, { status: 400 });
    }

    switch (entity) {
      case "class":
        await CurriculumService.deleteClass(id);
        break;
      case "group":
        await CurriculumService.deleteGroup(id);
        break;
      case "subject":
        await CurriculumService.deleteSubject(id);
        break;
      case "paper":
        await CurriculumService.deletePaper(id);
        break;
      case "chapter":
        await CurriculumService.deleteChapter(id);
        break;
      case "topic":
        await CurriculumService.deleteTopic(id);
        break;
      case "board":
        await CurriculumService.deleteBoard(id);
        break;
      default:
        return NextResponse.json({ error: `Unknown curriculum entity: ${entity}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `${entity} deleted successfully` });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin curriculum DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete curriculum item" }, { status: 400 });
  }
}
