import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";

export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      fullNameBn: true,
      preferredLang: true,
      profile: true,
      userRoles: {
        include: { role: true },
      },
      subscriptions: {
        where: { status: "ACTIVE" },
        include: { plan: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ user: null });
  }

  const roles = user.userRoles.map((ur) => ur.role.name);
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      fullNameBn: user.fullNameBn,
      preferredLang: user.preferredLang,
      roles,
      profile: user.profile,
      activeSubscription: user.subscriptions[0] || null,
    },
  });
}
