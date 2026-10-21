import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { isAnyStaff } from "@/lib/auth/rbac";
import { getUserPermissions } from "@/lib/auth/permissions";
import { AuditService } from "@/lib/audit/auditService";
import { checkRateLimit, resetRateLimit } from "@/lib/security/rateLimit";
import { z } from "zod";

const AdminLoginSchema = z.object({
  email: z.string().trim().email("Valid administrative email required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  try {
    const body = await req.json();
    const parsed = AdminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email or password format." },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Rate Limiting Check (5 attempts in 15 minutes per IP & email combination)
    const rateLimitKey = `admin_login_${ipAddress}_${normalizedEmail}`;
    const rateLimit = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);

    if (!rateLimit.allowed) {
      await AuditService.log({
        action: "ADMIN_LOGIN_LOCKED_OUT",
        resource: "User",
        details: {
          email: normalizedEmail,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        ipAddress,
      });

      return NextResponse.json(
        {
          error: "Too many failed administrative login attempts. Please try again later.",
          retryAfter: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimit.retryAfterSeconds.toString(),
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // 2. Query user with roles
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    // 3. Generic error if user does not exist or is inactive/suspended
    if (!user || !user.isActive) {
      await AuditService.log({
        action: "ADMIN_LOGIN_FAILED",
        resource: "User",
        details: {
          email: normalizedEmail,
          reason: !user ? "Account not found" : "Account suspended",
        },
        ipAddress,
      });

      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // 4. Verify user has administrative / staff privileges
    const roles = user.userRoles.map((ur) => ur.role.name);
    const sessionCandidate = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles,
      preferredLang: user.preferredLang,
    };

    if (!isAnyStaff(sessionCandidate)) {
      // Ordinary student attempting to authenticate through admin portal
      await AuditService.log({
        userId: user.id,
        action: "ADMIN_LOGIN_DENIED_STUDENT_ACCOUNT",
        resource: "User",
        details: {
          email: normalizedEmail,
          reason: "Student accounts are not authorized for administrative access",
        },
        ipAddress,
      });

      // Generic authentication error to avoid leaking role information
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // 5. Verify password hash
    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      await AuditService.log({
        userId: user.id,
        action: "ADMIN_LOGIN_FAILED",
        resource: "User",
        details: {
          email: normalizedEmail,
          reason: "Password mismatch",
        },
        ipAddress,
      });

      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // 6. Reset rate limit counter on successful authentication
    resetRateLimit(rateLimitKey);

    // 7. Generate session token and permissions
    const permissions = getUserPermissions(sessionCandidate);
    const token = signSessionToken(sessionCandidate);

    // 8. Log successful administrative login
    await AuditService.log({
      userId: user.id,
      action: "ADMIN_LOGIN_SUCCESS",
      resource: "User",
      resourceId: user.id,
      details: {
        email: user.email,
        roles,
      },
      ipAddress,
    });

    // 9. Issue secure cookie (8-hour administrative session)
    const response = NextResponse.json({
      success: true,
      message: "Administrative authentication successful",
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        fullNameBn: user.fullNameBn,
        roles,
        permissions,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60, // 8 hours for admin sessions
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Admin login API error:", error);
    return NextResponse.json(
      { error: "An unexpected authentication error occurred." },
      { status: 500 }
    );
  }
}
