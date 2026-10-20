"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { Stethoscope, Layers, ChevronRight, AlertCircle } from "lucide-react";

interface SubjectItem {
  id: string;
  nameBn: string;
  nameEn: string;
  code: string;
  chapters: { id: string; chapterNum: number; nameBn: string; nameEn: string }[];
}

export default function MedicalCornerPage() {
  const { locale, t } = useI18n();
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/curriculum?category=MEDICAL")
      .then((res) => res.json())
      .then((data) => {
        setSubjects(data.subjects || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xs">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-semibold">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>MBBS & BDS Admission (মেডিকেল ও ডেন্টাল ভর্তি)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {t.categories.medTitle}
          </h1>
          <p className="text-sm text-slate-600 max-w-xl">
            {t.categories.medDesc}
          </p>
        </div>
        <Link
          href="/exams/custom?category=MEDICAL"
          className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-xs transition inline-flex items-center gap-2"
        >
          <Layers className="w-4 h-4" />
          <span>{locale === "bn" ? "মেডিকেল স্পেশাল কাস্টম টেস্ট" : "Medical Mock Exam"}</span>
        </Link>
      </div>

      {/* Rules Notice */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-amber-800 text-xs sm:text-sm">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
        <span>
          {locale === "bn"
            ? "মেডিকেল পরীক্ষায় প্রতিটি ভুল উত্তরের জন্য ০.২৫ নম্বর কাটা হয়। আমাদের এক্সাম ইঞ্জিন স্বয়ংক্রিয়ভাবে এই নেগেটিভ মার্ক গণনা করে।"
            : "Medical admission enforces a 0.25 negative mark deduction per incorrect answer, calculated automatically."}
        </span>
      </div>

      {/* Subject Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          {locale === "bn" ? "মেডিকেল ভর্তি বিষয়সমূহ" : "Medical Admission Subjects"}
        </h2>

        {loading ? (
          <div className="text-center py-12 text-slate-500">{t.common.loading}</div>
        ) : subjects.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            {t.common.empty}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                className="bg-white p-6 rounded-xl border border-slate-200 hover:border-rose-400 transition shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                      {sub.code}
                    </span>
                    <span className="text-xs text-slate-400">
                      {sub.chapters.length} {locale === "bn" ? "টি অধ্যায়" : "Chapters"}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {locale === "bn" ? sub.nameBn : sub.nameEn}
                  </h3>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-6 flex justify-between items-center text-xs">
                  <Link
                    href={`/questions?category=MEDICAL&subjectId=${sub.id}`}
                    className="font-semibold text-rose-600 hover:underline flex items-center gap-1"
                  >
                    <span>{locale === "bn" ? "প্রশ্ন দেখুন" : "View Questions"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/exams/custom?category=MEDICAL&subjectId=${sub.id}`}
                    className="font-medium text-slate-600 hover:text-rose-700"
                  >
                    {locale === "bn" ? "মডেল টেস্ট" : "Mock Test"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
