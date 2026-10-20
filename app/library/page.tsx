"use client";

import React, { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import {
  Library,
  Search,
  FileText,
  Download,
  Lock,
  BookOpen,
  Filter,
  CheckCircle2,
} from "lucide-react";

interface ResourceItem {
  id: string;
  titleBn: string;
  titleEn: string;
  description?: string | null;
  type: string;
  category: string;
  fileUrl: string;
  fileSizeMb: number;
  isPremium: boolean;
  subject?: { nameBn: string; nameEn: string } | null;
  chapter?: { nameBn: string; chapterNum: number } | null;
}

export default function DigitalLibraryPage() {
  const { locale, t } = useI18n();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadResources = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (type) params.set("type", type);
    if (searchQuery) params.set("q", searchQuery);

    fetch(`/api/v1/library?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setResources(data.resources || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadResources();
  }, [category, type, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <Library className="w-3.5 h-3.5" />
            <span>{locale === "bn" ? "ডিজিটাল লাইব্রেরি ও স্টাডি মেটেরিয়ালস" : "Digital Library & Study Materials"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {t.nav.library}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
            {locale === "bn"
              ? "পদার্থ, রসায়ন, গণিত ও জীববিজ্ঞানের সকল অধ্যায়ের হ্যান্ডনোট, ফর্মুলা শিট ও বিগত বছরের প্রশ্নপত্র।"
              : "Formula sheets, lecture slides, chapter notes and verified question solutions."}
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={locale === "bn" ? "নোটস বা শিট খুঁজুন..." : "Search resources..."}
            className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-600 bg-white"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {[
          { label: t.common.all, val: "" },
          { label: "SSC", val: "SSC" },
          { label: "HSC", val: "HSC" },
          { label: "Medical", val: "MEDICAL" },
          { label: "University", val: "UNIVERSITY" },
        ].map((item) => (
          <button
            key={item.val}
            onClick={() => setCategory(item.val)}
            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer ${
              category === item.val
                ? "bg-emerald-600 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Resources Cards Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-500">{t.common.loading}</div>
      ) : resources.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
          <p className="text-slate-700 font-semibold">{t.common.empty}</p>
          <p className="text-xs text-slate-500">{t.common.emptyStateSub}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res) => (
            <div
              key={res.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-500 transition space-y-4"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                    {res.type}
                  </span>
                  {res.isPremium ? (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
                      <Lock className="w-3 h-3 text-amber-600" />
                      <span>{t.common.premiumBadge}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {t.common.free}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {locale === "bn" ? res.titleBn : res.titleEn}
                </h3>

                {res.description && (
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {res.description}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">{res.fileSizeMb} MB PDF</span>
                <a
                  href={res.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.common.download}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
