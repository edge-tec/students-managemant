import { NextRequest, NextResponse } from "next/server";
import { ForgotPasswordSchema } from "@/lib/validation/schemas";
import { AdminUserService } from "@/lib/admin/userService";
import { checkRateLimit } from "@/lib/security/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    // Rate Limiting (5 requests per 15 minutes)
    const rateLimit = checkRateLimit(`forgot_pw_${ipAddress}`, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many password reset requests. Please try again later.",
          retryAfter: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimit.retryAfterSeconds.toString(),
          },
        }
      );
    }

    const body = await req.json();
    const parsed = ForgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const result = await AdminUserService.requestSelfPasswordReset(parsed.data.email, ipAddress);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Forgot password API error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
