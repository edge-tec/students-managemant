import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { AiStudyAssistantService } from "@/lib/ai/aiAssistant";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in to use the AI Study Assistant" }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, subject, chapter } = body;

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Question prompt cannot be empty" }, { status: 400 });
    }

    const result = await AiStudyAssistantService.generateExplanation({
      prompt: prompt.trim(),
      subject,
      chapter,
      studentId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI assistant API error:", error);
    return NextResponse.json({ error: "Failed to generate AI response" }, { status: 500 });
  }
}
