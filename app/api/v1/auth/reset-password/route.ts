import { NextRequest, NextResponse } from "next/server";
import { ResetPasswordSchema } from "@/lib/validation/schemas";
import { AdminUserService } from "@/lib/admin/userService";
import { checkRateLimit } from "@/lib/security/rateLimit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    if (!email || !token) {
      return NextResponse.json(
        { valid: false, error: "Missing email or reset token in link." },
        { status: 400 }
      );
    }

    const verification = await AdminUserService.verifyPasswordResetToken(email, token);

    if (!verification.valid) {
      return NextResponse.json(
        { valid: false, error: verification.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Verify reset token error:", err);
    return NextResponse.json(
      { valid: false, error: "Failed to verify reset token." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    // Rate Limiting (10 redemption attempts per 15 minutes)
    const rateLimit = checkRateLimit(`reset_pw_${ipAddress}`, 10, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many password reset attempts. Please try again later.",
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
    const parsed = ResetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { email, token, password } = parsed.data;

    const result = await AdminUserService.resetPasswordWithToken(
      email,
      token,
      password,
      ipAddress
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Reset password POST error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to reset password." },
      { status: 400 }
    );
  }
}
