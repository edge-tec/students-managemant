import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { AuditService } from "@/lib/audit/auditService";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (user) {
      await AuditService.log({
        userId: user.id,
        action: "ADMIN_LOGOUT",
        resource: "User",
        resourceId: user.id,
        details: {
          email: user.email,
        },
        ipAddress,
      });
    }

    const response = NextResponse.json({
      success: true,
      message: "Administrative session terminated successfully",
    });

    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Admin logout error:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
