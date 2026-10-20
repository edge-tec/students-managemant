import { Locale } from "./types";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function formatNumber(val: number | string, locale: Locale): string {
  const str = String(val);
  if (locale !== "bn") return str;
  return str.replace(/\d/g, (d) => BN_DIGITS[parseInt(d, 10)] || d);
}

export function formatCurrency(amount: number, locale: Locale): string {
  const formattedVal = formatNumber(amount.toLocaleString(), locale);
  return `৳ ${formattedVal}`;
}

export function formatDate(date: Date | string, locale: Locale): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  if (locale === "bn") {
    // Bengali date format
    const day = formatNumber(d.getDate(), "bn");
    const year = formatNumber(d.getFullYear(), "bn");
    const months = [
      "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
      "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
    ];
    return `${day} ${months[d.getMonth()]}, ${year}`;
  }

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(seconds: number, locale: Locale): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const timeStr = `${pad(mins)}:${pad(secs)}`;
  return formatNumber(timeStr, locale);
}
