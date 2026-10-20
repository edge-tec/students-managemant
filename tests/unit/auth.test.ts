import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signSessionToken, verifySessionToken } from "@/lib/auth/jwt";

describe("Authentication & Cryptography Unit Tests", () => {
  it("should securely hash password and verify matching password", async () => {
    const rawPassword = "SecurePassword@123";
    const hashed = await hashPassword(rawPassword);

    expect(hashed).not.toBe(rawPassword);
    expect(hashed.startsWith("$2")).toBe(true);

    const isMatch = await verifyPassword(rawPassword, hashed);
    expect(isMatch).toBe(true);

    const wrongMatch = await verifyPassword("WrongPassword@999", hashed);
    expect(wrongMatch).toBe(false);
  });

  it("should correctly sign and verify JWT session token", () => {
    const payload = {
      id: "usr_test_123",
      email: "student@edubd.ac",
      fullName: "Tanvir Ahmed",
      roles: ["STUDENT"],
      preferredLang: "bn",
    };

    const token = signSessionToken(payload);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);

    const verified = verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe(payload.id);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.roles).toContain("STUDENT");
  });

  it("should reject corrupted or invalid JWT tokens", () => {
    const corruptedToken = "invalid.jwt.token.string";
    const verified = verifySessionToken(corruptedToken);
    expect(verified).toBeNull();
  });
});
