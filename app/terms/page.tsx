"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/context";

export default function TermsPage() {
  const { locale } = useI18n();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <h1 className="text-3xl font-extrabold text-slate-900">
        {locale === "bn" ? "ব্যবহারের শর্তাবলি (Terms of Service)" : "Terms of Service"}
      </h1>
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>
          {locale === "bn"
            ? "শিক্ষা বিডি (EduBD) প্ল্যাটফর্ম ব্যবহারের জন্য আপনাকে ধন্যবাদ। এই সেবাসমূহ গ্রহণের মাধ্যমে আপনি আমাদের শর্তাবলিতে সম্মতি জ্ঞাপন করছেন।"
            : "Welcome to EduBD. By accessing or using our services, you agree to be bound by these terms."}
        </p>
        <h2 className="text-base font-bold text-slate-900 pt-2">১. শিক্ষার্থী অ্যাকাউন্টের নিরাপত্তা</h2>
        <p>
          আপনার অ্যাকাউন্টের লগইন তথ্য ও পাসওয়ার্ডের গোপনীয়তা রক্ষা করার দায়িত্ব আপনার। অন্য কারো সাথে অ্যাকাউন্ট শেয়ার করা নীতিমালার পরিপন্থী।
        </p>
        <h2 className="text-base font-bold text-slate-900 pt-2">২. বৌদ্ধিক সম্পত্তি ও কপিরাইট</h2>
        <p>
          প্ল্যাটফর্মে সংরক্ষিত পরীক্ষার প্রশ্নাবলি, ব্যাখ্যা ও বিশ্লেষণ সম্পূর্ণ যাচাইকৃত তথ্যের ভিত্তিতে তৈরি এবং শিক্ষামূলক ব্যবহারের জন্য সংরক্ষিত।
        </p>
      </div>
    </div>
  );
}
