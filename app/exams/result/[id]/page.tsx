"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { MathText } from "@/components/ui/MathText";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Trophy,
  Zap,
  AlertTriangle,
  X,
} from "lucide-react";

interface ExamResultPayload {
  session: {
    id: string;
    category: string;
    mode: string;
    templateId?: string | null;
    durationMinutes: number;
    correctMark: number;
    negativeMark: number;
    serverStartTime: string;
    submittedAt: string;
  };
  result: {
    totalScore: number;
    maxMarks: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    accuracyPct: number;
    timeSpentSec: number;
    rankInCohort?: number | null;
    cohortSize?: number | null;
    percentile?: number | null;
    subjectBreakdown: Record<string, { total: number; correct: number; incorrect: number }>;
    chapterBreakdown: Record<string, { total: number; correct: number; incorrect: number }>;
  };
  studentAnswers: { questionId: string; selectedOption: string | null; isCorrect: boolean }[];
  questions: {
    id: string;
    questionTextBn: string;
    options: { id: string; optionKey: string; textBn: string; isCorrect: boolean }[];
    answer?: { correctKey: string; explanationBn: string };
    subject: { nameBn: string };
    chapter: { nameBn: string };
    textbookRef?: string | null;
  }[];
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
}

export default function ExamResultPage() {
  const { id } = useParams() as { id: string };
  const { locale, t, formatNumber } = useI18n();

  const [data, setData] = useState<ExamResultPayload | null>(null);
  const [loading, setLoading] = useState(true);

  // Leaderboard modal
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/exams/${id}/result`)
      .then((res) => {
        if (!res.ok) throw new Error("Result not found");
        return res.json();
      })
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const loadLeaderboard = () => {
    if (!data) return;
    setShowLeaderboard(true);
    setLeaderboardLoading(true);

    const param = data.session.templateId
      ? `templateId=${data.session.templateId}`
      : `category=${data.session.category}`;

    fetch(`/api/v1/exams/leaderboard?${param}&limit=10`)
      .then((res) => res.json())
      .then((resData) => {
        setLeaderboard(resData.leaderboard || []);
        setLeaderboardLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLeaderboardLoading(false);
      });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500 font-medium">
        {t.common.loading}
      </div>
    );
  }

  if (!data || !data.result) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <p className="text-slate-700 font-semibold">{t.common.empty}</p>
        <Link
          href="/exams"
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold inline-block"
        >
          {locale === "bn" ? "পরীক্ষা হাবে ফিরে যান" : "Go to Exam Hub"}
        </Link>
      </div>
    );
  }

  const { result, session, questions, studentAnswers } = data;
  const answersMap = new Map(studentAnswers.map((a) => [a.questionId, a]));
  const negativeMarkDeducted = (result.incorrectCount * session.negativeMark).toFixed(2);

  // Identify weak chapters (< 75% accuracy)
  const weakChapters: { name: string; accuracy: number; total: number; incorrect: number }[] = [];
  if (result.chapterBreakdown) {
    Object.entries(result.chapterBreakdown).forEach(([chName, stats]) => {
      const acc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      if (acc < 75) {
        weakChapters.push({ name: chName, accuracy: acc, total: stats.total, incorrect: stats.incorrect });
      }
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Top Banner / Congratulation Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {session.category} • {session.mode}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {t.exam.examCompleted}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadLeaderboard}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs sm:text-sm font-bold text-amber-800 transition flex items-center gap-1.5"
            >
              <Trophy className="w-4 h-4 text-amber-600" />
              <span>{locale === "bn" ? "মেধা তালিকা" : "Leaderboard"}</span>
            </button>
            <Link
              href="/exams"
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4 text-emerald-600" />
              <span>{t.exam.retakeExam}</span>
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition"
            >
              {t.nav.dashboard}
            </Link>
          </div>
        </div>

        {/* Cohort Rank & Percentile Banner */}
        {result.rankInCohort && (
          <div className="p-4 rounded-xl bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  {locale === "bn" ? "জাতীয় মেধা অবস্থান ও পারসেন্টাইল" : "National Cohort Rank & Percentile"}
                </div>
                <div className="text-lg font-extrabold text-slate-900">
                  {locale === "bn" ? "মেধা স্থান:" : "Rank:"}{" "}
                  <span className="text-amber-700 font-black">#{formatNumber(result.rankInCohort)}</span>{" "}
                  <span className="text-xs font-semibold text-slate-500">
                    ({locale === "bn" ? "অংশগ্রহণকারী:" : "Cohort Size:"} {formatNumber(result.cohortSize || 1)})
                  </span>
                </div>
              </div>
            </div>

            {result.percentile !== null && result.percentile !== undefined && (
              <div className="bg-white/90 px-4 py-2 rounded-xl border border-amber-200 text-center shadow-xs">
                <div className="text-[11px] text-amber-800 font-bold uppercase">{locale === "bn" ? "পারসেন্টাইল স্কোর" : "Percentile"}</div>
                <div className="text-2xl font-black text-amber-600">{formatNumber(result.percentile)}%</div>
              </div>
            )}
          </div>
        )}

        {/* Score Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center space-y-1">
            <div className="text-xs font-semibold text-emerald-800">{t.exam.score}</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
              {formatNumber(result.totalScore)} / {formatNumber(result.maxMarks)}
            </div>
            <div className="text-[11px] text-emerald-600">
              {formatNumber(result.accuracyPct)}% {t.exam.accuracy}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-center space-y-1">
            <div className="text-xs font-semibold text-blue-800">{t.exam.correct}</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-700">
              {formatNumber(result.correctCount)}
            </div>
            <div className="text-[11px] text-blue-600">
              +{formatNumber(result.correctCount * session.correctMark)} {locale === "bn" ? "মার্ক" : "Marks"}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 text-center space-y-1">
            <div className="text-xs font-semibold text-rose-800">{t.exam.wrong}</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-700">
              {formatNumber(result.incorrectCount)}
            </div>
            <div className="text-[11px] text-rose-600">
              -{formatNumber(negativeMarkDeducted)} {t.exam.negativeMarkDeducted}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
            <div className="text-xs font-semibold text-slate-700">{t.exam.unanswered}</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-700">
              {formatNumber(result.unansweredCount)}
            </div>
            <div className="text-[11px] text-slate-500">{locale === "bn" ? "০ মার্ক" : "0 Mark"}</div>
          </div>
        </div>

        {/* Subject Breakdown Card */}
        {result.subjectBreakdown && Object.keys(result.subjectBreakdown).length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {locale === "bn" ? "বিষয়ভিত্তিক ফলাফল বিশ্লেষণ" : "Subject Performance Breakdown"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(result.subjectBreakdown).map(([subName, stats]) => {
                const subAccuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                return (
                  <div key={subName} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                      <span>{subName}</span>
                      <span className="text-emerald-700">{subAccuracy}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all"
                        style={{ width: `${subAccuracy}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{t.exam.correct}: {stats.correct}</span>
                      <span>{t.exam.wrong}: {stats.incorrect}</span>
                      <span>{locale === "bn" ? "মোট" : "Total"}: {stats.total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Chapter Mastery Breakdown Gauges */}
        {result.chapterBreakdown && Object.keys(result.chapterBreakdown).length > 0 && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {locale === "bn" ? "অধ্যায়ভিত্তিক পারদর্শিতা ও জ্ঞান-ঘাটতি বিশ্লেষণ" : "Chapter Mastery Gauges"}
              </h3>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>{locale === "bn" ? "সবল (≥৭৫%)" : "Strong"}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>{locale === "bn" ? "মধ্যম (৫০-৭৪%)" : "Moderate"}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>{locale === "bn" ? "দুর্বল (<৫০%)" : "Needs Work"}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(result.chapterBreakdown).map(([chName, stats]) => {
                const chAccuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                const status =
                  chAccuracy >= 75
                    ? { label: locale === "bn" ? "সবল" : "Strong", color: "text-emerald-700 bg-emerald-50 border-emerald-200", bar: "bg-emerald-600" }
                    : chAccuracy >= 50
                    ? { label: locale === "bn" ? "মধ্যম" : "Moderate", color: "text-amber-700 bg-amber-50 border-amber-200", bar: "bg-amber-500" }
                    : { label: locale === "bn" ? "দুর্বল" : "Needs Work", color: "text-rose-700 bg-rose-50 border-rose-200", bar: "bg-rose-500" };

                return (
                  <div key={chName} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                      <span className="truncate pr-2">{chName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${status.color}`}>
                        {status.label} • {chAccuracy}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${status.bar}`} style={{ width: `${chAccuracy}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{t.exam.correct}: {stats.correct}</span>
                      <span>{t.exam.wrong}: {stats.incorrect}</span>
                      <span>{locale === "bn" ? "মোট" : "Total"}: {stats.total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Practice Weak Chapters CTA Card */}
        {weakChapters.length > 0 && (
          <div className="p-5 rounded-2xl bg-linear-to-r from-rose-50 via-amber-50 to-orange-50 border border-rose-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>{locale === "bn" ? "জ্ঞান-ঘাটতি পূরণের জন্য সুপারিশ" : "Knowledge Gap Recommendation"}</span>
              </div>
              <p className="text-xs text-slate-700">
                {locale === "bn"
                  ? `আপনি ${weakChapters.map((w) => w.name).join(", ")} অধ্যায়ে তুলনামূলকভাবে কম নম্বর পেয়েছেন। এই দুর্বল অধ্যায়গুলোর জন্য অবিলম্বে একটি বিশেষ ড্রিল পরীক্ষা দিন।`
                  : `You scored below 75% in ${weakChapters.map((w) => w.name).join(", ")}. Take a targeted practice test now.`}
              </p>
            </div>
            <Link
              href={`/exams/custom?category=${session.category}`}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              <Zap className="w-4 h-4" />
              <span>{locale === "bn" ? "দুর্বল অধ্যায় ড্রিল শুরু করুন" : "Practice Weak Chapters"}</span>
            </Link>
          </div>
        )}
      </div>

      {/* Solutions and Explanations Accordion */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">
            {t.exam.detailedSolutions}
          </h2>
          <Link
            href="/dashboard/wrong-questions"
            className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1"
          >
            <span>{t.exam.wrongAnswerPractice}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-4">
          {questions.map((q, idx) => {
            const studentAns = answersMap.get(q.id);
            const selectedOpt = studentAns?.selectedOption;
            const isCorrect = studentAns?.isCorrect;
            const isSkipped = !selectedOpt;

            return (
              <div
                key={q.id}
                className={`p-6 rounded-2xl bg-white border transition shadow-xs space-y-4 ${
                  isCorrect
                    ? "border-emerald-300"
                    : isSkipped
                    ? "border-slate-300"
                    : "border-rose-300"
                }`}
              >
                {/* Status Bar */}
                <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <span className="text-slate-600">{q.subject.nameBn}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">{q.chapter.nameBn}</span>
                  </div>

                  <div>
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{t.exam.correct} (+{session.correctMark})</span>
                      </span>
                    ) : isSkipped ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.exam.unanswered} (0)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>{t.exam.wrong} (-{session.negativeMark})</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Question */}
                <div className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
                  <MathText text={q.questionTextBn} />
                </div>

                {/* Options Review */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {q.options.map((opt) => {
                    const isTheCorrectKey = opt.isCorrect;
                    const isTheSelectedKey = selectedOpt === opt.optionKey;

                    let optStyle = "border-slate-200 bg-slate-50/50 text-slate-700";
                    if (isTheCorrectKey) {
                      optStyle = "border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold";
                    } else if (isTheSelectedKey && !isTheCorrectKey) {
                      optStyle = "border-rose-400 bg-rose-50 text-rose-950 font-semibold";
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-3 ${optStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isTheCorrectKey
                                ? "bg-emerald-600 text-white"
                                : isTheSelectedKey
                                ? "bg-rose-600 text-white"
                                : "bg-white border border-slate-300 text-slate-700"
                            }`}
                          >
                            {opt.optionKey}
                          </span>
                          <div>
                            <MathText text={opt.textBn} />
                          </div>
                        </div>

                        {isTheSelectedKey && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80">
                            {locale === "bn" ? "আপনার উত্তর" : "Your Choice"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Step-by-Step Explanation */}
                {q.answer && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm space-y-2 text-slate-800">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{t.exam.explanation}:</span>
                    </div>
                    <div className="leading-relaxed">
                      <MathText text={q.answer.explanationBn} />
                    </div>
                    {q.textbookRef && (
                      <div className="text-slate-500 text-xs pt-1 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.exam.textbookReference}: {q.textbookRef}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">
                    {locale === "bn" ? "মেধা তালিকা (শীর্ষ ১০)" : "Cohort Merit List"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {locale === "bn" ? "সর্বোচ্চ নম্বর ও দ্রুততম সময়ে সমাধানকারী শিক্ষার্থী" : "Top performing students for this cohort"}
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

            {leaderboardLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm font-medium">
                {t.common.loading}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                {locale === "bn" ? "এখনও কোনো মেধা তালিকা তৈরি হয়নি।" : "No leaderboard records yet."}
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry) => {
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
