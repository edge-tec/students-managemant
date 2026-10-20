"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/context";

export default function RefundPage() {
  const { locale } = useI18n();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <h1 className="text-3xl font-extrabold text-slate-900">
        {locale === "bn" ? "রিফান্ড নীতিমালা (Refund Policy)" : "Refund Policy"}
      </h1>
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>
          {locale === "bn"
            ? "যদি কোনো প্রযুক্তিগত ত্রুটির কারণে সাবস্ক্রিপশন সক্রিয় না হয় অথচ আপনার বিকাশ বা ব্যাংক অ্যাকাউন্ট থেকে টাকা কাটা যায়, তবে তা ২৪ ঘণ্টার মধ্যে রিফান্ড বা সক্রিয় করা হবে।"
            : "In case of duplicate charge or technical failure in activating your subscription, your funds will be promptly investigated and refunded within 24-48 hours."}
        </p>
        <h2 className="text-base font-bold text-slate-900 pt-2">যোগাযোগ</h2>
        <p>রিফান্ড সংক্রান্ত যেকোনো প্রশ্নের জন্য ইমেইল করুন: support@edubd.ac</p>
      </div>
    </div>
  );
}
