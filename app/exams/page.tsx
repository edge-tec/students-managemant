"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import {
  Trophy,
  Clock,
  FileText,
  ChevronRight,
  Award,
  Zap,
  RotateCcw,
  ShieldCheck,
  Layers,
  ArrowRight,
  BarChart3,
  AlertCircle,
  X,
  Play,
  Sparkles,
} from "lucide-react";

interface ExamTemplateItem {
  id: string;
  titleBn: string;
  titleEn: string;
  category: string;
  subjectId?: string | null;
  durationMinutes: number;
  totalMarks: number;
  negativeMarks: number;
  questionCount: number;
  isPremium: boolean;
  mode: string;
  instructionsBn?: string | null;
  instructionsEn?: string | null;
  totalAttempts: number;
  studentBestScore: number | null;
  isAttempted: boolean;
  lastAttemptSessionId: string | null;
}

interface ExamHistoryItem {
  id: string;
  category: string;
  mode: string;
  durationMinutes: number;
  totalQuestions: number;
  submittedAt: string;
  templateTitle: string | null;
  result: {
    totalScore: number;
    maxMarks: number;
    accuracyPct: number;
    rankInCohort: number | null;
    cohortSize: number | null;
    percentile: number | null;
  } | null;
}

interface LeaderboardEntry {
  rank: number;
  studentName: string;
  avatarUrl?: string | null;
  score: number;
  maxMarks: number;
  accuracyPct: number;
  timeSpentSec: number;
  examTitle: string;
  evaluatedAt: string;
}

export default function ExamHubPage() {
  const router = useRouter();
  const { locale, t, formatNumber } = useI18n();

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [templates, setTemplates] = useState<ExamTemplateItem[]>([]);
  const [history, setHistory] = useState<ExamHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingTemplateId, setStartingTemplateId] = useState<string | null>(null);
  const [startingAdaptive, setStartingAdaptive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Leaderboard modal state
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardCategory, setLeaderboardCategory] = useState<string>("HSC");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Load templates & history
  useEffect(() => {
    setLoading(true);
    const categoryParam = selectedCategory !== "ALL" ? `?category=${selectedCategory}` : "";
    fetch(`/api/v1/exams${categoryParam}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load exams");
        return res.json();
      })
      .then((data) => {
        setTemplates(data.templates || []);
        setHistory(data.history || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedCategory]);

  // Load leaderboard when modal opens or category changes
  useEffect(() => {
    if (!showLeaderboard) return;
    setLeaderboardLoading(true);
    fetch(`/api/v1/exams/leaderboard?category=${leaderboardCategory}&limit=10`)
      .then((res) => res.json())
      .then((data) => {
        setLeaderboardData(data.leaderboard || []);
        setLeaderboardLoading(false);
      })
      .catch((err) => {
        console.error("Leaderboard load err:", err);
        setLeaderboardLoading(false);
      });
  }, [showLeaderboard, leaderboardCategory]);

  // Start exam from template
  const handleStartTemplateExam = async (templateId: string) => {
    setStartingTemplateId(templateId);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/exams/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?redirect=${encodeURIComponent("/exams")}`);
          return;
        }
        throw new Error(data.error || "Failed to start exam");
      }

      router.push(`/exams/session/${data.sessionId}`);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message);
      setStartingTemplateId(null);
    }
  };

  // Quick-start Adaptive Exam targeting student's wrong questions
  const handleStartAdaptiveExam = async () => {
    setStartingAdaptive(true);
    setErrorMsg(null);

    try {
      // Fetch available subject for the chosen category or default to HSC Physics
      const cat = selectedCategory !== "ALL" ? selectedCategory : "HSC";
      const curRes = await fetch(`/api/v1/curriculum?category=${cat}`);
      const curData = await curRes.json();
      const firstSubject = curData?.subjects?.[0];

      if (!firstSubject) {
        throw new Error("No subject available for adaptive exam");
      }

      const res = await fetch("/api/v1/exams/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: cat,
          subjectId: firstSubject.id,
          chapterIds: [],
          questionCount: 15,
          durationMinutes: 15,
          difficulty: "MIXED",
          mode: "REAL_EXAM",
          adaptive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?redirect=${encodeURIComponent("/exams")}`);
          return;
        }
        throw new Error(data.error || "Failed to create adaptive exam session");
      }

      router.push(`/exams/session/${data.sessionId}`);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message);
      setStartingAdaptive(false);
    }
  };

  const categories = [
    { key: "ALL", labelBn: "সকল পরীক্ষা", labelEn: "All Exams" },
    { key: "HSC", labelBn: "এইচএসসি (HSC)", labelEn: "HSC" },
    { key: "SSC", labelBn: "এসএসসি (SSC)", labelEn: "SSC" },
    { key: "MEDICAL", labelBn: "মেডিকেল ভর্তি", labelEn: "Medical" },
    { key: "UNIVERSITY", labelBn: "বিশ্ববিদ্যালয় ভর্তি", labelEn: "University" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-8 sm:p-12 shadow-xl border border-emerald-800/40">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{locale === "bn" ? "পরীক্ষা ও মডেল টেস্ট হাব" : "Live Exam & Model Test Hub"}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            {locale === "bn" ? "পরীক্ষা ও লাইভ মডেল টেস্ট" : "Examination & Model Test Hub"}
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {locale === "bn"
              ? "লাইভ মডেল টেস্ট, বিগত বোর্ড প্রশ্নপত্র এবং ব্যক্তিগতকৃত কাস্টম পরীক্ষার মাধ্যমে আপনার প্রস্তুতি যাচাই করুন। সার্ভার-সিঙ্কড টাইমার, নেগেটিভ মার্কিং ও তাৎক্ষণিক মেধা তালিকা।"
              : "Verify your preparation with live model tests, past board papers, and adaptive practice tests. Features server-authoritative countdowns, negative marking, and real-time cohort percentiles."}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/exams/custom"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-950/20"
            >
              <Layers className="w-4 h-4" />
              <span>{locale === "bn" ? "কাস্টম এক্সাম তৈরি করুন" : "Custom Exam Builder"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => setShowLeaderboard(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition border border-white/15"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{locale === "bn" ? "লাইভ মেধা তালিকা" : "Live Leaderboard"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Custom Builder */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition">
              <Layers className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {locale === "bn" ? "কাস্টম এক্সাম তৈরি" : "Custom Exam Generator"}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {locale === "bn"
                ? "পছন্দমতো বিষয়, নির্দিষ্ট অধ্যায়, প্রশ্নসংখ্যা ও সময়সীমা নির্ধারণ করে নিজের মতো টেস্ট দিন।"
                : "Select specific subjects, chapters, duration, and question count to create a targeted test."}
            </p>
          </div>
          <div className="pt-5">
            <Link
              href="/exams/custom"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
            >
              <span>{locale === "bn" ? "কাস্টমাইজ করুন" : "Configure Custom Exam"}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Card 2: Adaptive Weakness Drill */}
        <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-xs hover:shadow-md transition flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition">
              <Zap className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {locale === "bn" ? "ভুল উত্তরের স্মার্ট পরীক্ষা" : "Adaptive Mistake Drill"}
              </h2>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase">
                AI / Gap
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {locale === "bn"
                ? "আপনার পূর্বে ভুল করা প্রশ্নগুলো স্বয়ংক্রিয়ভাবে অগ্রাধিকার দিয়ে ১৫টি প্রশ্নের একটি নিবিড় ড্রিল।"
                : "Automatically prioritizes questions you previously answered incorrectly to close knowledge gaps."}
            </p>
          </div>
          <div className="pt-5">
            <button
              onClick={handleStartAdaptiveExam}
              disabled={startingAdaptive}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-50"
            >
              {startingAdaptive ? (
                <span>{locale === "bn" ? "প্রস্তুত হচ্ছে..." : "Preparing..."}</span>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>{locale === "bn" ? "স্মার্ট ড্রিল শুরু করুন" : "Start Adaptive Drill"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 3: Live Merit List */}
        <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-xs hover:shadow-md transition flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition">
              <Trophy className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {locale === "bn" ? "রিয়েল-টাইম মেধা তালিকা" : "Real-Time Merit List"}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {locale === "bn"
                ? "দেশব্যাপী শিক্ষার্থীদের সাথে নিজের অবস্থান যাচাই করুন। সর্বোচ্চ নম্বর ও দ্রুততম সময়ে শীর্ষস্থান অধিকারীদের তালিকা।"
                : "Compare your performance nationwide. View top performers ranked by score and speed."}
            </p>
          </div>
          <div className="pt-5">
            <button
              onClick={() => setShowLeaderboard(true)}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition"
            >
              <Trophy className="w-4 h-4" />
              <span>{locale === "bn" ? "মেধা তালিকা দেখুন" : "View Leaderboard"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
        {categories.map((cat) => {
          const active = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                active
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {locale === "bn" ? cat.labelBn : cat.labelEn}
            </button>
          );
        })}
      </div>

      {/* Section 1: Live Model Tests & Board Papers */}
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {locale === "bn" ? "লাইভ মডেল টেস্ট ও বোর্ড প্রশ্নপত্র" : "Live Model Tests & Board Papers"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {locale === "bn"
                ? "মানসম্মত প্রশ্ন ও নেগেটিভ মার্কিং সহ পূর্ণাঙ্গ পরীক্ষা।"
                : "Standard questions with negative marking and real-time cohort evaluation."}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {formatNumber(templates.length)} {locale === "bn" ? "টি টেস্ট উপলব্ধ" : "Tests Available"}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 font-medium">
            {t.common.loading}
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <FileText className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              {locale === "bn" ? "এই ক্যাটাগরিতে কোনো মডেল টেস্ট পাওয়া যায়নি।" : "No model tests found for this category."}
            </p>
            <Link
              href="/exams/custom"
              className="inline-block px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
            >
              {locale === "bn" ? "কাস্টম পরীক্ষা দিন" : "Take Custom Exam"}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-slate-100 text-slate-800 uppercase tracking-wide">
                      {tmpl.category}
                    </span>
                    {tmpl.isPremium ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>PREMIUM</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        FREE
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                      {locale === "bn" ? tmpl.titleBn : tmpl.titleEn}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {tmpl.instructionsBn || tmpl.instructionsEn}
                    </p>
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatNumber(tmpl.durationMinutes)} {locale === "bn" ? "মিনিট" : "Mins"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatNumber(tmpl.questionCount)} {locale === "bn" ? "টি প্রশ্ন" : "Questions"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg">
                      <Award className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatNumber(tmpl.totalMarks)} {locale === "bn" ? "পূর্ণমান" : "Marks"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg">
                      <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                      <span>-{formatNumber(tmpl.negativeMarks)} {locale === "bn" ? "নেগেটিভ" : "Negative"}</span>
                    </div>
                  </div>

                  {/* Previous Attempt Status */}
                  {tmpl.isAttempted && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs">
                      <span className="text-emerald-800 font-semibold">
                        {locale === "bn" ? "সর্বোচ্চ প্রাপ্ত নম্বর:" : "Best Score:"}
                      </span>
                      <span className="font-extrabold text-emerald-700">
                        {formatNumber(tmpl.studentBestScore || 0)} / {formatNumber(tmpl.totalMarks)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-2 flex items-center gap-2">
                  {tmpl.isAttempted && tmpl.lastAttemptSessionId ? (
                    <>
                      <Link
                        href={`/exams/result/${tmpl.lastAttemptSessionId}`}
                        className="flex-1 py-2 px-3 text-center border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition"
                      >
                        {locale === "bn" ? "ফলাফল দেখুন" : "View Result"}
                      </Link>
                      <button
                        onClick={() => handleStartTemplateExam(tmpl.id)}
                        disabled={startingTemplateId === tmpl.id}
                        className="flex-1 py-2 px-3 text-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{locale === "bn" ? "পুনরায় দিন" : "Retake"}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleStartTemplateExam(tmpl.id)}
                      disabled={startingTemplateId === tmpl.id}
                      className="w-full py-2.5 px-4 text-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                    >
                      {startingTemplateId === tmpl.id ? (
                        <span>{locale === "bn" ? "প্রস্তুত হচ্ছে..." : "Starting..."}</span>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{locale === "bn" ? "পরীক্ষা শুরু করুন" : "Start Test"}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Recent Student Exam Attempts */}
      {history.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {locale === "bn" ? "আপনার বিগত পরীক্ষার হিস্ট্রি" : "Your Recent Exam Attempts"}
              </h2>
              <p className="text-xs text-slate-500">
                {locale === "bn" ? "পূর্বে সম্পন্ন করা সকল পরীক্ষার ফলাফল ও বিস্তারিত অ্যানালিটিক্স।" : "Review past attempts, score breakdown, and percentile ranks."}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">{locale === "bn" ? "পরীক্ষার নাম" : "Exam Title"}</th>
                    <th className="py-3 px-4">{locale === "bn" ? "ক্যাটাগরি" : "Category"}</th>
                    <th className="py-3 px-4 text-center">{locale === "bn" ? "প্রাপ্ত নম্বর" : "Score"}</th>
                    <th className="py-3 px-4 text-center">{locale === "bn" ? "সঠিকতা" : "Accuracy"}</th>
                    <th className="py-3 px-4 text-center">{locale === "bn" ? "মেধা স্থান (র‍্যাংক)" : "Cohort Rank"}</th>
                    <th className="py-3 px-4 text-right">{locale === "bn" ? "অ্যাকশন" : "Action"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {history.map((h) => {
                    const res = h.result;
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {h.templateTitle || `${h.category} কাস্টম এক্সাম`}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[11px]">
                            {h.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-extrabold text-emerald-700">
                          {res ? `${formatNumber(res.totalScore)} / ${formatNumber(res.maxMarks)}` : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {res ? `${formatNumber(res.accuracyPct)}%` : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {res?.rankInCohort && res?.cohortSize ? (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs">
                              <Trophy className="w-3 h-3" />
                              <span>{formatNumber(res.rankInCohort)} / {formatNumber(res.cohortSize)}</span>
                              {res.percentile !== null && (
                                <span className="text-[10px] text-amber-600">({formatNumber(res.percentile)}%)</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/exams/result/${h.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition"
                          >
                            <span>{locale === "bn" ? "বিশ্লেষণ" : "Analysis"}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Real-Time Merit List / Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">
                    {locale === "bn" ? "লাইভ মেধা তালিকা (টপ ১০)" : "Live Merit List (Top 10)"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {locale === "bn" ? "সর্বোচ্চ নম্বর ও দ্রুততম সময়ে সমাধানকারী শিক্ষার্থী" : "Top performing students ranked by score and time"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter by Category */}
            <div className="flex gap-2">
              {["HSC", "SSC", "MEDICAL", "UNIVERSITY"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setLeaderboardCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    leaderboardCategory === cat
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Leaderboard Table */}
            {leaderboardLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm font-medium">
                {t.common.loading}
              </div>
            ) : leaderboardData.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                {locale === "bn" ? "এই ক্যাটাগরিতে এখনও কোনো ফলাফল সংরক্ষিত নেই।" : "No evaluated results found for this category yet."}
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboardData.map((entry) => {
                  const medal =
                    entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`;
                  return (
                    <div
                      key={entry.rank}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                        entry.rank <= 3
                          ? "bg-amber-50/50 border-amber-200"
                          : "bg-slate-50/50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 text-center font-bold text-sm text-slate-700">
                          {medal}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {entry.studentName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {entry.examTitle}
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-0.5">
                        <div className="font-extrabold text-emerald-700 text-sm">
                          {formatNumber(entry.score)} / {formatNumber(entry.maxMarks)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatNumber(entry.accuracyPct)}% • {Math.round(entry.timeSpentSec / 60)} {locale === "bn" ? "মিনিট" : "min"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-center pt-2">
              <button
                onClick={() => setShowLeaderboard(false)}
                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                {locale === "bn" ? "বন্ধ করুন" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
