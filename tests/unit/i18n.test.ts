import { describe, it, expect } from "vitest";
import { formatNumber, formatCurrency, formatTime } from "@/lib/i18n/formatters";

describe("Internationalization & Formatting Unit Tests", () => {
  it("should format English digits to Bengali numerals in 'bn' locale", () => {
    expect(formatNumber(12345, "bn")).toBe("১২৩৪৫");
    expect(formatNumber(0, "bn")).toBe("০");
    expect(formatNumber("2026", "bn")).toBe("২০২৬");
  });

  it("should preserve standard digits in 'en' locale", () => {
    expect(formatNumber(12345, "en")).toBe("12345");
    expect(formatNumber("2026", "en")).toBe("2026");
  });

  it("should format currency with Bangladeshi Taka (৳) symbol and localized numbers", () => {
    const formattedBn = formatCurrency(499, "bn");
    expect(formattedBn).toContain("৳");
    expect(formattedBn).toContain("৪৯৯");

    const formattedEn = formatCurrency(499, "en");
    expect(formattedEn).toContain("৳");
    expect(formattedEn).toContain("499");
  });

  it("should format time in MM:SS with localized numerals", () => {
    expect(formatTime(65, "en")).toBe("01:05");
    expect(formatTime(65, "bn")).toBe("০১:০৫");
    expect(formatTime(1200, "bn")).toBe("২০:০০");
  });
});
