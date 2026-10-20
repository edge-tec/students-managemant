import { cookies } from "next/headers";
import { verifySessionToken, SessionUser } from "./jwt";
import prisma from "@/lib/db/prisma";

export const SESSION_COOKIE_NAME = "edubd_session";

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = verifySessionToken(token);
    if (!decoded) return null;

    // Optional verification against database to ensure account wasn't deactivated
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, isActive: true },
    });

    if (!dbUser || !dbUser.isActive) return null;

    return decoded;
  } catch {
    return null;
  }
}
