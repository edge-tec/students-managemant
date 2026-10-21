import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/rbac";
import { EmailService } from "@/lib/email/emailService";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json(
        { error: "Unauthorized: Administrator privileges required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const targetEmail = body.email || body.recipientEmail;
    const { provider, host, port, user: smtpUser, pass, from, resendApiKey } = body;

    if (!targetEmail || typeof targetEmail !== "string" || !targetEmail.includes("@")) {
      return NextResponse.json(
        { error: "Please provide a valid recipient email address for testing." },
        { status: 400 }
      );
    }

    const overrides: any = {};
    if (provider) overrides.provider = provider;
    if (host) overrides.host = host;
    if (port) overrides.port = parseInt(String(port), 10);
    if (smtpUser) overrides.user = smtpUser;
    if (pass) overrides.pass = pass;
    if (from) overrides.from = from;
    if (resendApiKey) overrides.resendApiKey = resendApiKey;

    const result = await EmailService.sendTestEmail(targetEmail.trim(), overrides);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to dispatch test email" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      provider: result.provider,
      message: `Test email successfully dispatched to ${targetEmail} via ${result.provider}.`,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Test email API error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred while sending test email" },
      { status: 500 }
    );
  }
}
