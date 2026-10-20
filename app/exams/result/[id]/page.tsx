"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { MathText } from "@/components/ui/MathText";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ExamResultPayload {
  session: {
    id: string;
    category: string;
    mode: string;
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

export default function ExamResultPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { locale, t, formatNumber } = useI18n();

  const [data, setData] = useState<ExamResultPayload | null>(null);
  const [loading, setLoading] = useState(true);

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
          href="/exams/custom"
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold inline-block"
        >
          {locale === "bn" ? "নতুন পরীক্ষা দিন" : "Take New Exam"}
        </Link>
      </div>
    );
  }

  const { result, session, questions, studentAnswers } = data;
  const answersMap = new Map(studentAnswers.map((a) => [a.questionId, a]));
  const negativeMarkDeducted = (result.incorrectCount * session.negativeMark).toFixed(2);

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
            <Link
              href="/exams/custom"
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
            <div className="text-[11px] text-blue-600">+{formatNumber(result.correctCount * session.correctMark)} {locale === "bn" ? "মার্ক" : "Marks"}</div>
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
    </div>
  );
}
