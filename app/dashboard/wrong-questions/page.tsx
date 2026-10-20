"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { MathText } from "@/components/ui/MathText";
import {
  RotateCcw,
  CheckCircle2,
  BookOpen,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
} from "lucide-react";

interface WrongQuestionEntry {
  id: string;
  mistakeCount: number;
  isMastered: boolean;
  lastMistake: string;
  question: {
    id: string;
    questionTextBn: string;
    options: { id: string; optionKey: string; textBn: string; isCorrect: boolean }[];
    answer?: { correctKey: string; explanationBn: string };
    subject: { nameBn: string; nameEn: string };
    chapter: { nameBn: string; nameEn: string; chapterNum: number };
  };
}

export default function WrongQuestionsNotebookPage() {
  const { locale, t, formatNumber, formatDate } = useI18n();
  const [entries, setEntries] = useState<WrongQuestionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMastered, setShowMastered] = useState(false);
  const [expandedSolutions, setExpandedSolutions] = useState<Record<string, boolean>>({});

  const loadEntries = () => {
    setLoading(true);
    fetch(`/api/v1/students/wrong-questions?mastered=${showMastered}`)
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.wrongQuestions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadEntries();
  }, [showMastered]);

  const toggleMastered = async (questionId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/v1/students/wrong-questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          isMastered: !currentStatus,
        }),
      });

      if (res.ok) {
        // Remove from list or reload
        loadEntries();
      }
    } catch (err) {
      console.error("Mastery update error:", err);
    }
  };

  const toggleSolution = (id: string) => {
    setExpandedSolutions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {t.dashboard.wrongQuestionsNotebook}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {locale === "bn"
              ? "পরীক্ষায় ভুল করা প্রশ্নগুলো বারবার অনুশীলন করে আয়ত্তে আনুন।"
              : "Review your mistaken questions repeatedly until you achieve total mastery."}
          </p>
        </div>

        <Link
          href="/exams/custom"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-2"
        >
          <Layers className="w-4 h-4" />
          <span>{locale === "bn" ? "ভুল প্রশ্নগুলো নিয়ে পরীক্ষা দিন" : "Retest Mistaken Questions"}</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowMastered(false)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            !showMastered
              ? "bg-rose-100 text-rose-800"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {locale === "bn" ? "অসমাধানকৃত ভুলসমূহ (Active Mistakes)" : "Active Mistakes"}
        </button>
        <button
          onClick={() => setShowMastered(true)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            showMastered
              ? "bg-emerald-100 text-emerald-800"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {locale === "bn" ? "আয়ত্ত করা প্রশ্নাবলি (Mastered)" : "Mastered Questions"}
        </button>
      </div>

      {/* Entries List */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">{t.common.loading}</div>
      ) : entries.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {showMastered
              ? (locale === "bn" ? "এখনো কোনো প্রশ্ন আয়ত্ত হিসেবে চিহ্নিত করা হয়নি" : "No mastered questions yet")
              : (locale === "bn" ? "আপনার ভুল খাতা বর্তমানে সম্পূর্ণ পরিষ্কার!" : "Your mistake notebook is completely empty!")}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {showMastered
              ? (locale === "bn" ? "ভুলগুলো বুঝে সমাধান করার পর 'আয়ত্ত করেছি' বাটনে ক্লিক করুন।" : "Mark questions as mastered once you review their explanations.")
              : (locale === "bn" ? "যেকোনো পরীক্ষা বা কুইজে ভুল হলে তা স্বয়ংক্রিয়ভাবে এখানে জমা হবে।" : "When you make mistakes in any exam, they automatically appear here.")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, idx) => {
            const q = entry.question;
            const isExpanded = expandedSolutions[q.id];

            return (
              <div
                key={entry.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4"
              >
                {/* Meta */}
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {q.subject.nameBn}
                    </span>
                    <span className="text-slate-500">{q.chapter.nameBn}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                      {locale === "bn" ? `${formatNumber(entry.mistakeCount)} বার ভুল` : `${entry.mistakeCount} mistakes`}
                    </span>
                    <button
                      onClick={() => toggleMastered(q.id, entry.isMastered)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        entry.isMastered
                          ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{entry.isMastered ? (locale === "bn" ? "পুনরায় চিহ্নিত করুন" : "Unmark") : (locale === "bn" ? "আয়ত্ত করেছি" : "Mark Mastered")}</span>
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <div className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
                  <MathText text={q.questionTextBn} />
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center gap-3 ${
                        opt.isCorrect
                          ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold"
                          : "border-slate-200 bg-slate-50/50 text-slate-700"
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          opt.isCorrect
                            ? "bg-emerald-600 text-white"
                            : "bg-white border border-slate-300 text-slate-700"
                        }`}
                      >
                        {opt.optionKey}
                      </span>
                      <MathText text={opt.textBn} />
                    </div>
                  ))}
                </div>

                {/* Solution Accordion */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => toggleSolution(q.id)}
                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isExpanded ? (locale === "bn" ? "সমাধান লুকান" : "Hide Solution") : t.exam.detailedSolutions}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && q.answer && (
                    <div className="mt-3 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs sm:text-sm space-y-2 text-slate-800">
                      <div className="font-bold text-emerald-900">
                        {locale === "bn" ? `সঠিক উত্তর: (${q.answer.correctKey})` : `Correct Answer: (${q.answer.correctKey})`}
                      </div>
                      <div className="leading-relaxed">
                        <MathText text={q.answer.explanationBn} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
