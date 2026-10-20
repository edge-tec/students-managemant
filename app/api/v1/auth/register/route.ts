import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { RegisterSchema } from "@/lib/validation/schemas";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { UserRoleType, ExamCategoryType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { fullName, email, phoneNumber, password, examCategory } = parsed.data;

    // Check existing email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const studentRole = await prisma.role.findUnique({
      where: { name: UserRoleType.STUDENT },
    });

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        phoneNumber: phoneNumber || null,
        passwordHash,
        isVerified: true,
        userRoles: {
          create: studentRole ? [{ roleId: studentRole.id }] : [],
        },
        preferences: {
          create: {
            examCategory: examCategory as ExamCategoryType,
          },
        },
        profile: {
          create: {
            targetCategory: examCategory as ExamCategoryType,
          },
        },
        studyStreaks: {
          create: {
            currentStreak: 1,
            longestStreak: 1,
          },
        },
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    const roles = user.userRoles.map((ur) => ur.role.name);
    const token = signSessionToken({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles,
      preferredLang: user.preferredLang,
    });

    const response = NextResponse.json(
      {
        message: "Registration successful",
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          roles,
        },
      },
      { status: 201 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
