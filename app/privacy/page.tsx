"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/context";

export default function PrivacyPage() {
  const { locale } = useI18n();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <h1 className="text-3xl font-extrabold text-slate-900">
        {locale === "bn" ? "গোপনীয়তা নীতিমালা (Privacy Policy)" : "Privacy Policy"}
      </h1>
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>
          {locale === "bn"
            ? "আমরা শিক্ষার্থীদের ব্যক্তিগত তথ্যের সর্বোচ্চ নিরাপত্তা এবং গোপনীয়তা রক্ষা করতে প্রতিশ্রুতিবদ্ধ।"
            : "We are committed to protecting the privacy and personal data of our students."}
        </p>
        <h2 className="text-base font-bold text-slate-900 pt-2">১. সংগৃহীত তথ্য</h2>
        <p>
          অ্যাকাউন্ট খোলার সময় নাম, ইমেইল, মোবাইল নম্বর এবং কাঙ্ক্ষিত পরীক্ষার তথ্য সংগ্রহ করা হয় শুধুমাত্র আপনার অভিজ্ঞতা ব্যক্তিগতকরণ করার জন্য।
        </p>
        <h2 className="text-base font-bold text-slate-900 pt-2">২. পেমেন্ট ও লেনদেনের নিরাপত্তা</h2>
        <p>
          বিকাশ বা ব্যাংকের কোনো পিন বা গোপন কোড আমাদের সার্ভারে সংরক্ষিত হয় না। সমস্ত লেনদেন সরাসরি সিকিউর গেটওয়ের মাধ্যমে পরিচালিত হয়।
        </p>
      </div>
    </div>
  );
}
