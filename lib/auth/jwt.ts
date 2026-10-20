import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "edubd_fallback_secret_for_development_2026";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  preferredLang: string;
}

export function signSessionToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}
