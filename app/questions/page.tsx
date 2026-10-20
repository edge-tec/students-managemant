"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { MathText } from "@/components/ui/MathText";
import {
  Search,
  Filter,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Tag,
  BookOpen,
  ArrowRight,
  Layers,
} from "lucide-react";

interface QuestionOption {
  id: string;
  optionKey: string;
  textBn: string;
  textEn?: string | null;
  isCorrect: boolean;
}

interface QuestionItem {
  id: string;
  category: string;
  difficulty: string;
  questionTextBn: string;
  questionTextEn?: string | null;
  marks: number;
  negativeMarks: number;
  textbookRef?: string | null;
  teacherTipsBn?: string | null;
  options: QuestionOption[];
  answer?: { correctKey: string; explanationBn: string; explanationEn?: string | null } | null;
  subject: { nameBn: string; nameEn: string; code: string };
  chapter: { nameBn: string; nameEn: string; chapterNum: number };
  references: { examYear: number; examSessionName?: string | null; board?: { nameBn: string } | null }[];
}

function QuestionBankContent() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedSolutions, setExpandedSolutions] = useState<Record<string, boolean>>({});

  // Filters
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [difficulty, setDifficulty] = useState(searchParams.get("difficulty") || "");

  const loadQuestions = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (searchQuery) params.set("q", searchQuery);
    if (difficulty) params.set("difficulty", difficulty);
    params.set("page", String(page));
    params.set("limit", "10");

    fetch(`/api/v1/questions?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data.questions || []);
        setTotalCount(data.pagination?.totalCount || 0);
        setTotalPages(data.pagination?.totalPages || 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [category, searchQuery, difficulty, page]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const toggleSolution = (id: string) => {
    setExpandedSolutions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const categories = [
    { label: t.common.all, value: "" },
    { label: "SSC", value: "SSC" },
    { label: "HSC", value: "HSC" },
    { label: "Medical", value: "MEDICAL" },
    { label: "Dental", value: "DENTAL" },
    { label: "University", value: "UNIVERSITY" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {t.nav.questionBank}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {locale === "bn"
              ? "বিগত বছরের বোর্ড প্রশ্ন, ভর্তি পরীক্ষা এবং অধ্যায়ভিত্তিক স্পেশাল প্রশ্নব্যাংক"
              : "Explore verified past board papers, university questions and detailed solutions."}
          </p>
        </div>

        <button
          onClick={() => router.push("/exams/custom")}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <Layers className="w-4 h-4" />
          <span>{t.exam.customBuilderTitle}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={t.common.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-emerald-600 outline-none"
            />
          </div>

          {/* Difficulty Select */}
          <select
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-emerald-600 outline-none bg-white text-slate-700"
          >
            <option value="">{locale === "bn" ? "সকল কাঠিন্য (Difficulty)" : "All Difficulties"}</option>
            <option value="EASY">{t.exam.easy}</option>
            <option value="MEDIUM">{t.exam.medium}</option>
            <option value="HARD">{t.exam.hard}</option>
          </select>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="font-semibold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>{t.common.filter}:</span>
          </span>
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                setCategory(c.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full font-medium transition shrink-0 cursor-pointer ${
                category === c.value
                  ? "bg-emerald-600 text-white font-semibold"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex justify-between items-center text-xs text-slate-500 px-1">
        <span>
          {locale === "bn" ? `মোট ${totalCount} টি প্রশ্ন সংরক্ষিত রয়েছে` : `Total ${totalCount} questions found`}
        </span>
        <span>
          {locale === "bn" ? `পৃষ্ঠা ${page} এর ${totalPages}` : `Page ${page} of ${totalPages}`}
        </span>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">{t.common.loading}</div>
      ) : questions.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-2">
          <p className="text-slate-700 font-semibold text-base">{t.common.empty}</p>
          <p className="text-xs text-slate-500">{t.common.emptyStateSub}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const isExpanded = expandedSolutions[q.id];
            const qNum = (page - 1) * 10 + idx + 1;

            return (
              <div
                key={q.id}
                className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4"
              >
                {/* Meta Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      #{qNum}
                    </span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      {q.subject.nameBn}
                    </span>
                    <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
                      {q.chapter.nameBn}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md font-medium ${
                      q.difficulty === "HARD"
                        ? "bg-rose-50 text-rose-700"
                        : q.difficulty === "MEDIUM"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {q.difficulty}
                    </span>
                  </div>

                  {/* Board / Year References */}
                  {q.references && q.references.length > 0 && (
                    <div className="flex items-center gap-1 text-slate-500 font-medium">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      <span>{q.references[0].examSessionName || `${q.references[0].examYear}`}</span>
                    </div>
                  )}
                </div>

                {/* Question Text */}
                <div className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
                  <MathText text={q.questionTextBn} />
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-lg border text-sm flex items-center gap-3 ${
                        isExpanded && opt.isCorrect
                          ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 font-semibold"
                          : "border-slate-200 bg-slate-50/50 text-slate-800"
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isExpanded && opt.isCorrect
                          ? "bg-emerald-600 text-white"
                          : "bg-white border border-slate-300 text-slate-700"
                      }`}>
                        {opt.optionKey}
                      </span>
                      <div>
                        <MathText text={opt.textBn} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Solution Toggle Accordion */}
                <div className="pt-2">
                  <button
                    onClick={() => toggleSolution(q.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
                  >
                    <span>{isExpanded ? (locale === "bn" ? "সমাধান লুকান" : "Hide Explanation") : t.exam.detailedSolutions}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isExpanded && q.answer && (
                    <div className="mt-3 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs sm:text-sm space-y-2 text-slate-800 animate-fadeIn">
                      <div className="flex items-center gap-2 font-bold text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>
                          {locale === "bn" ? `সঠিক উত্তর: (${q.answer.correctKey})` : `Correct Answer: (${q.answer.correctKey})`}
                        </span>
                      </div>
                      <div className="leading-relaxed">
                        <strong>{t.exam.explanation}:</strong> <MathText text={q.answer.explanationBn} />
                      </div>
                      {q.textbookRef && (
                        <div className="text-slate-500 text-xs pt-1 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.exam.textbookReference}: {q.textbookRef}</span>
                        </div>
                      )}
                      {q.teacherTipsBn && (
                        <div className="text-amber-800 bg-amber-50/70 p-2 rounded-md text-xs mt-1 border border-amber-200">
                          <strong>{t.exam.teacherTips}:</strong> {q.teacherTipsBn}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed bg-white"
          >
            {t.exam.prev}
          </button>
          <span className="text-xs font-semibold text-slate-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed bg-white"
          >
            {t.exam.next}
          </button>
        </div>
      )}
    </div>
  );
}

export default function QuestionBankPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-slate-500">Loading questions...</div>}>
      <QuestionBankContent />
    </Suspense>
  );
}
