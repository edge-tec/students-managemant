"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { Building2, Layers, ChevronRight, School } from "lucide-react";

interface UniversityItem {
  id: string;
  nameBn: string;
  nameEn: string;
  shortName: string;
  admissionUnits: { id: string; code: string; nameBn: string; nameEn: string }[];
}

export default function UniversityCornerPage() {
  const { locale, t } = useI18n();
  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/curriculum?category=UNIVERSITY")
      .then((res) => res.json())
      .then((data) => {
        setUniversities(data.universities || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xs">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            <span>Public University Admission (বিশ্ববিদ্যালয় ভর্তি)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {t.categories.uniTitle}
          </h1>
          <p className="text-sm text-slate-600 max-w-xl">
            {t.categories.uniDesc}
          </p>
        </div>
        <Link
          href="/exams/custom?category=UNIVERSITY"
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-xs transition inline-flex items-center gap-2"
        >
          <Layers className="w-4 h-4" />
          <span>{locale === "bn" ? "ভার্সিটি মডেল টেস্ট দিন" : "Take Varsity Mock Test"}</span>
        </Link>
      </div>

      {/* Universities and Units Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          {locale === "bn" ? "বিশ্ববিদ্যালয় ও ভর্তি ইউনিটসমূহ" : "Universities & Admission Units"}
        </h2>

        {loading ? (
          <div className="text-center py-12 text-slate-500">{t.common.loading}</div>
        ) : universities.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            {t.common.empty}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {universities.map((uni) => (
              <div
                key={uni.id}
                className="bg-white p-6 rounded-xl border border-slate-200 hover:border-purple-400 transition shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                      {uni.shortName}
                    </span>
                    <School className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {locale === "bn" ? uni.nameBn : uni.nameEn}
                  </h3>

                  {uni.admissionUnits && uni.admissionUnits.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {uni.admissionUnits.map((unit) => (
                        <span
                          key={unit.id}
                          className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium"
                        >
                          {locale === "bn" ? unit.nameBn : unit.nameEn}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 mt-6 flex justify-between items-center text-xs">
                  <Link
                    href={`/questions?category=UNIVERSITY`}
                    className="font-semibold text-purple-600 hover:underline flex items-center gap-1"
                  >
                    <span>{locale === "bn" ? "প্রশ্নব্যাংক" : "Questions"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/exams/custom?category=UNIVERSITY`}
                    className="font-medium text-slate-600 hover:text-purple-700"
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
