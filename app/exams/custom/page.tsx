"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import {
  Layers,
  BookOpen,
  Clock,
  HelpCircle,
  Check,
  AlertCircle,
  Play,
} from "lucide-react";

interface Subject {
  id: string;
  nameBn: string;
  nameEn: string;
  code: string;
  category: string;
  chapters: { id: string; chapterNum: number; nameBn: string; nameEn: string }[];
}

function CustomExamBuilderContent() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [category, setCategory] = useState(searchParams.get("category") || "HSC");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(20);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [difficulty, setDifficulty] = useState("MIXED");
  const [mode, setMode] = useState<"REAL_EXAM" | "PRACTICE">("REAL_EXAM");
  const [adaptive, setAdaptive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load subjects when category changes
  useEffect(() => {
    setLoading(true);
    setErrorMessage("");
    fetch(`/api/v1/curriculum?category=${category}`)
      .then((res) => res.json())
      .then((data) => {
        const subs: Subject[] = data.subjects || [];
        setSubjects(subs);
        if (subs.length > 0) {
          setSelectedSubjectId(subs[0].id);
          setSelectedChapters([]);
        } else {
          setSelectedSubjectId("");
          setSelectedChapters([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [category]);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);

  const toggleChapter = (chapterId: string) => {
    setSelectedChapters((prev) =>
      prev.includes(chapterId)
        ? prev.filter((id) => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  const selectAllChapters = () => {
    if (!activeSubject) return;
    if (selectedChapters.length === activeSubject.chapters.length) {
      setSelectedChapters([]);
    } else {
      setSelectedChapters(activeSubject.chapters.map((c) => c.id));
    }
  };

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    if (!selectedSubjectId) {
      setErrorMessage(locale === "bn" ? "অনুগ্রহ করে একটি বিষয় নির্বাচন করুন।" : "Please select a subject.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/exams/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subjectId: selectedSubjectId,
          chapterIds: selectedChapters,
          questionCount: Number(questionCount),
          durationMinutes: Number(durationMinutes),
          difficulty,
          mode,
          adaptive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?redirect=${encodeURIComponent("/exams/custom")}`);
          return;
        }
        throw new Error(data.error || "Failed to create exam session");
      }

      router.push(`/exams/session/${data.sessionId}`);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
          <Layers className="w-3.5 h-3.5" />
          <span>{locale === "bn" ? "স্বয়ংক্রিয় টেস্ট জেনারেটর" : "Automated Test Generator"}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          {t.exam.customBuilderTitle}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
          {locale === "bn"
            ? "আপনার সিলেবাস অনুযায়ী পছন্দমতো বিষয় ও অধ্যায় নির্বাচন করে রিয়েল টাইম মডেল টেস্ট শুরু করুন।"
            : "Customize chapters, time limits, question count, and marking rules according to your study goals."}
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleStartExam} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        {/* Step 1: Select Category */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            1. {t.exam.selectCategory}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: "SSC", label: "SSC (এসএসসি)" },
              { id: "HSC", label: "HSC (এইচএসসি)" },
              { id: "MEDICAL", label: "Medical (মেডিকেল)" },
              { id: "DENTAL", label: "Dental (ডেন্টাল)" },
              { id: "UNIVERSITY", label: "University (ভার্সিটি)" },
            ].map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition text-center cursor-pointer ${
                  category === cat.id
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Select Subject */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            2. {t.exam.selectSubject}
          </label>
          {loading ? (
            <div className="py-4 text-xs text-slate-400">{t.common.loading}</div>
          ) : subjects.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
              {locale === "bn" ? "এই ক্যাটাগরিতে এখনো কোনো বিষয় যুক্ত করা হয়নি।" : "No subjects available in this category."}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {subjects.map((sub) => (
                <button
                  type="button"
                  key={sub.id}
                  onClick={() => {
                    setSelectedSubjectId(sub.id);
                    setSelectedChapters([]);
                  }}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                    selectedSubjectId === sub.id
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold"
                      : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm">{locale === "bn" ? sub.nameBn : sub.nameEn}</span>
                  </div>
                  {selectedSubjectId === sub.id && (
                    <Check className="w-4 h-4 text-emerald-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 3: Select Chapters */}
        {activeSubject && activeSubject.chapters.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                3. {t.exam.selectChapters} ({selectedChapters.length === 0 ? t.exam.allChapters : `${selectedChapters.length} Selected`})
              </label>
              <button
                type="button"
                onClick={selectAllChapters}
                className="text-xs text-emerald-600 hover:underline font-semibold cursor-pointer"
              >
                {selectedChapters.length === activeSubject.chapters.length
                  ? (locale === "bn" ? "সব আনচেক করুন" : "Deselect All")
                  : (locale === "bn" ? "সকল অধ্যায় নির্বাচন" : "Select All")}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-xl">
              {activeSubject.chapters.map((ch) => {
                const isSelected = selectedChapters.includes(ch.id);
                return (
                  <button
                    type="button"
                    key={ch.id}
                    onClick={() => toggleChapter(ch.id)}
                    className={`p-2.5 rounded-lg border text-xs text-left flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{locale === "bn" ? ch.nameBn : ch.nameEn}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Exam Configuration Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Question Count */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              {t.exam.questionCount}
            </label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none bg-white"
            >
              <option value="5">৫ টি প্রশ্ন (5 Questions)</option>
              <option value="10">১০ টি প্রশ্ন (10 Questions)</option>
              <option value="20">২০ টি প্রশ্ন (20 Questions)</option>
              <option value="50">৫০ টি প্রশ্ন (50 Questions)</option>
              <option value="100">১০০ টি প্রশ্ন (100 Questions)</option>
            </select>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              {t.exam.duration}
            </label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none bg-white"
            >
              <option value="5">৫ মিনিট (5 mins)</option>
              <option value="10">১০ মিনিট (10 mins)</option>
              <option value="20">২০ মিনিট (20 mins)</option>
              <option value="30">৩০ মিনিট (30 mins)</option>
              <option value="60">৬০ মিনিট (60 mins)</option>
            </select>
          </div>

          {/* Difficulty */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              {t.exam.difficulty}
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none bg-white"
            >
              <option value="MIXED">{t.exam.mixed}</option>
              <option value="EASY">{t.exam.easy}</option>
              <option value="MEDIUM">{t.exam.medium}</option>
              <option value="HARD">{t.exam.hard}</option>
            </select>
          </div>
        </div>

        {/* Step 5: Mode Selection */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            {locale === "bn" ? "পরীক্ষার মোড নির্বাচন করুন" : "Select Exam Mode"}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("REAL_EXAM")}
              className={`p-4 rounded-xl border text-left space-y-1 transition cursor-pointer ${
                mode === "REAL_EXAM"
                  ? "border-emerald-600 bg-emerald-50/70"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">{t.exam.realExamMode}</span>
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-500">
                {locale === "bn"
                  ? "কঠোর সার্ভার টাইমার, ০.২৫ নেগেটিভ মার্কিং এবং পরীক্ষা শেষে সামগ্রিক র‍্যাংক রিপোর্ট।"
                  : "Strict timer, -0.25 negative marks, detailed ranking and percentile."}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode("PRACTICE")}
              className={`p-4 rounded-xl border text-left space-y-1 transition cursor-pointer ${
                mode === "PRACTICE"
                  ? "border-emerald-600 bg-emerald-50/70"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">{t.exam.practiceMode}</span>
                <HelpCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-500">
                {locale === "bn"
                  ? "টাইমারের কোনো বাধ্যবাধকতা নেই, প্রতি উত্তরের পর অবিলম্বে সমাধান দেখা যাবে।"
                  : "No time pressure, review step-by-step solutions as you solve questions."}
              </p>
            </button>
          </div>
        </div>

        {/* Step 6: Adaptive Mistakes Targeting */}
        <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-indigo-950">
                {locale === "bn" ? "অ্যাডাপ্টিভ মোড (পূর্বের ভুল প্রশ্নসমূহ অগ্রাধিকার পাবে)" : "Adaptive Mode (Target Mistakes)"}
              </span>
              <span className="text-[10px] bg-indigo-200 text-indigo-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                GAP-TARGETING
              </span>
            </div>
            <p className="text-xs text-indigo-800/80">
              {locale === "bn"
                ? "সক্রিয় থাকলে আপনার ভুলের খাতা থেকে পূর্বে ভুল করা প্রশ্নগুলো সর্বোচ্চ ৫০% পর্যন্ত স্থান পাবে।"
                : "When enabled, prioritizes up to 50% of questions from your unmastered mistakes notebook."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAdaptive(!adaptive)}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
              adaptive ? "bg-indigo-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                adaptive ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={submitting || subjects.length === 0}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <span>{t.common.loading}</span>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>{t.exam.createExamBtn}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CustomExamBuilderPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-slate-500">Loading exam builder...</div>}>
      <CustomExamBuilderContent />
    </Suspense>
  );
}
