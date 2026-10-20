"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";

function PaymentAlertBanner() {
  const searchParams = useSearchParams();
  const { locale } = useI18n();
  const payment = searchParams.get("payment");
  const order = searchParams.get("order");

  if (payment !== "success") return null;

  return (
    <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <h3 className="font-bold text-sm">
            {locale === "bn" ? "পেমেন্ট ও মেম্বারশিপ সফল হয়েছে!" : "Payment Successful!"}
          </h3>
          <p className="text-xs text-emerald-700">
            {locale === "bn"
              ? `আপনার প্রিমিয়াম সাবস্ক্রিপশন সফলভাবে সক্রিয় করা হয়েছে (অর্ডার: ${order || "যাচাইকৃত"})। শুভকামনা!`
              : `Your subscription has been activated successfully (Order: ${order || "Verified"}). Happy studying!`}
          </p>
        </div>
      </div>
    </div>
  );
}
import {
  Flame,
  Target,
  CheckCircle2,
  FileQuestion,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Layers,
  Crown,
  Clock,
  Sparkles,
} from "lucide-react";

interface DashboardData {
  student: {
    id: string;
    fullName: string;
    email: string;
    profile?: {
      targetCategory?: string;
      institutionName?: string;
      hscYear?: number;
    };
  };
  streak: { currentStreak: number; longestStreak: number };
  todayTarget: { targetQuestions: number; completedQuestions: number; isCompleted: boolean };
  recentResults: {
    id: string;
    sessionId: string;
    totalScore: number;
    maxMarks: number;
    accuracyPct: number;
    evaluatedAt: string;
    session: { category: string; mode: string; totalQuestions: number };
  }[];
  stats: {
    totalQuestionsSolved: number;
    wrongQuestionsCount: number;
    bookmarksCount: number;
  };
  activeSubscription?: {
    id: string;
    status: string;
    endDate: string;
    plan: { nameBn: string; nameEn: string; code: string };
  } | null;
}

export default function StudentDashboardPage() {
  const { locale, t, formatNumber, formatDate } = useI18n();
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/students/dashboard")
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            router.push(`/login?redirect=${encodeURIComponent("/dashboard")}`);
          }
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500 font-medium">
        {t.common.loading}
      </div>
    );
  }

  if (!data) return null;

  const { student, streak, todayTarget, recentResults, stats, activeSubscription } = data;
  const targetPct = todayTarget.targetQuestions > 0
    ? Math.min(100, Math.round((todayTarget.completedQuestions / todayTarget.targetQuestions) * 100))
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Payment Success Alert */}
      <Suspense fallback={null}>
        <PaymentAlertBanner />
      </Suspense>

      {/* Welcome Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {t.dashboard.welcome}, {student.fullName}
            </h1>
            {activeSubscription && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <Crown className="w-3.5 h-3.5 text-emerald-600" />
                <span>{locale === "bn" ? activeSubscription.plan.nameBn : activeSubscription.plan.nameEn}</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            {student.profile?.institutionName || "Bangladesh Academic Learner"} •{" "}
            {student.profile?.targetCategory || "HSC"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/exams/custom"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition flex items-center gap-2"
          >
            <Layers className="w-4 h-4" />
            <span>{t.exam.customBuilderTitle}</span>
          </Link>
          <Link
            href="/pricing"
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white font-semibold text-xs sm:text-sm text-slate-700 transition"
          >
            {t.dashboard.upgradePlan}
          </Link>
        </div>
      </div>

      {/* Engagement & Target Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Study Streak Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Flame className="w-8 h-8 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.dashboard.studyStreak}
            </div>
            <div className="text-3xl font-extrabold text-slate-900">
              {formatNumber(streak.currentStreak)} {t.dashboard.days}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {locale === "bn" ? `সর্বোচ্চ স্ট্রিক: ${formatNumber(streak.longestStreak)} দিন` : `Best: ${streak.longestStreak} days`}
            </div>
          </div>
        </div>

        {/* Daily Target Progress */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-600" />
              <span>{t.dashboard.todayTarget}</span>
            </span>
            <span className="font-extrabold text-emerald-700">{targetPct}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all"
              style={{ width: `${targetPct}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 flex justify-between">
            <span>
              {formatNumber(todayTarget.completedQuestions)} / {formatNumber(todayTarget.targetQuestions)} {t.dashboard.questionsSolved}
            </span>
          </div>
        </div>

        {/* Mistake Notebook Quick Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.dashboard.wrongQuestionsNotebook}
            </div>
            <div className="text-3xl font-extrabold text-rose-600">
              {formatNumber(stats.wrongQuestionsCount)}
            </div>
            <p className="text-xs text-slate-400">
              {locale === "bn" ? "ভুল উত্তরের স্বয়ংক্রিয় খাতা" : "Auto-tracked incorrect answers"}
            </p>
          </div>
          <Link
            href="/dashboard/wrong-questions"
            className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition flex items-center gap-1"
          >
            <span>{locale === "bn" ? "অনুশীলন" : "Practice"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Recent Exam Attempts Section */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span>{t.dashboard.recentExams}</span>
          </h2>
          <Link
            href="/exams/custom"
            className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
          >
            <span>{locale === "bn" ? "নতুন টেস্ট দিন" : "Take New Test"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentResults.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-slate-500">
              {locale === "bn" ? "আপনি এখনো কোনো পরীক্ষা সম্পন্ন করেননি।" : "You haven't completed any exam sessions yet."}
            </p>
            <Link
              href="/exams/custom"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold inline-block transition"
            >
              {locale === "bn" ? "প্রথম পরীক্ষা শুরু করুন" : "Start First Exam"}
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentResults.map((r) => (
              <div
                key={r.id}
                className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {r.session.category} • {r.session.mode}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({r.session.totalQuestions} {locale === "bn" ? "টি প্রশ্ন" : "Questions"})
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDate(r.evaluatedAt)}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-emerald-700">
                      {formatNumber(r.totalScore)} / {formatNumber(r.maxMarks)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {formatNumber(r.accuracyPct)}% {t.exam.accuracy}
                    </div>
                  </div>

                  <Link
                    href={`/exams/result/${r.sessionId}`}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 text-xs font-semibold text-slate-700 hover:text-emerald-700 transition"
                  >
                    {locale === "bn" ? "বিশ্লেষণ দেখুন" : "View Result"}
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
