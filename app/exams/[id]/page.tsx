"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import {
  Clock,
  Award,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Layers,
  ArrowRight,
  RotateCcw,
  Calendar,
  Lock,
} from "lucide-react";

interface ExamInstructionsData {
  exam: {
    id: string;
    titleBn: string;
    titleEn: string;
    descriptionBn?: string | null;
    descriptionEn?: string | null;
    category: string;
    examType: string;
    status: string;
    accessType: string;
    priceBdt?: number | null;
    totalMarks: number;
    passMarks?: number | null;
    durationMinutes: number;
    negativeMarkRate: number;
    marksPerQuestion: number;
    totalQuestions: number;
    startTime?: string | null;
    endTime?: string | null;
    maxAttempts?: number | null;
    releasePolicy: string;
    instructionsBn?: string | null;
    instructionsEn?: string | null;
    sections: {
      id: string;
      titleBn: string;
      titleEn: string;
      totalMarks?: number | null;
      durationMinutes?: number | null;
      orderIndex: number;
    }[];
    academicClass?: { nameBn: string; nameEn: string } | null;
    subject?: { nameBn: string; nameEn: string } | null;
    paper?: { nameBn: string; nameEn: string } | null;
    board?: { nameBn: string; nameEn: string } | null;
  };
  eligibility: {
    eligible: boolean;
    reason?: string;
    attemptsUsed: number;
    maxAttempts: number;
    activeSessionId?: string;
  };
}

export default function ExamInstructionsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { locale, t, formatNumber } = useI18n();

  const [data, setData] = useState<ExamInstructionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/exams/${id}/instructions`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            router.push(`/login?redirect=/exams/${id}`);
            throw new Error("Unauthorized");
          }
          throw new Error("Failed to load exam instructions");
        }
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setLoading(false);
      });
  }, [id, router]);

  const handleStartExam = async () => {
    if (starting) return;
    setStarting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/exams/${id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to start exam");
      }

      const json = await res.json();
      const sessionId = json.session?.id;
      if (sessionId) {
        router.push(`/exams/session/${sessionId}`);
      } else {
        throw new Error("No session ID returned");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500 font-medium">
        পরীক্ষার নির্দেশাবলী লোড হচ্ছে...
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
          <p className="font-semibold">{errorMsg || "পরীক্ষা পাওয়া যায়নি"}</p>
        </div>
        <button
          onClick={() => router.push("/exams")}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold"
        >
          পরীক্ষার তালিকায় ফিরুন
        </button>
      </div>
    );
  }

  const { exam, eligibility } = data;
  const isResuming = Boolean(eligibility.activeSessionId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/exams" className="hover:text-slate-800">
          পরীক্ষাসমূহ (Exams)
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-semibold">{exam.category}</span>
        <span>/</span>
        <span className="text-slate-900 font-bold truncate">{exam.titleBn}</span>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
            {exam.category}
          </span>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">
            {exam.examType.replace(/_/g, " ")}
          </span>
          {exam.subject && (
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
              {exam.subject.nameBn}
            </span>
          )}
          {exam.accessType === "FREE" ? (
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold">
              ফ্রি পরীক্ষা (Free)
            </span>
          ) : (
            <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold">
              প্রিমিয়াম (Subscription)
            </span>
          )}
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            {exam.titleBn}
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1 font-medium">
            {exam.titleEn}
          </p>
        </div>

        {exam.descriptionBn && (
          <p className="text-sm text-slate-600 leading-relaxed border-t pt-3">
            {exam.descriptionBn}
          </p>
        )}
      </div>

      {/* Key Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>সময়সীমা (Duration)</span>
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-800">
            {exam.durationMinutes} <span className="text-xs font-medium text-slate-500">মিনিট</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Award className="w-4 h-4 text-blue-600" />
            <span>মোট নম্বর (Total Marks)</span>
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-800">
            {exam.totalMarks} <span className="text-xs font-medium text-slate-500">নম্বর</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <FileText className="w-4 h-4 text-purple-600" />
            <span>মোট প্রশ্ন (Questions)</span>
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-800">
            {exam.totalQuestions} <span className="text-xs font-medium text-slate-500">টি</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>নেগেটিভ মার্কিং</span>
          </div>
          <div className="text-xl md:text-2xl font-black text-rose-600">
            -{exam.negativeMarkRate} <span className="text-xs font-medium text-slate-500">/ভুল</span>
          </div>
        </div>
      </div>

      {/* Section Summary (if section-based) */}
      {exam.sections && exam.sections.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            পরীক্ষার বিভাগসমূহ (Sections: {exam.sections.length} টি)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {exam.sections.map((sec, idx) => (
              <div key={sec.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-slate-800">
                  {idx + 1}. {sec.titleBn}
                </div>
                <div className="text-slate-500">{sec.titleEn}</div>
                <div className="text-slate-600 pt-1 flex items-center gap-2">
                  {sec.durationMinutes && <span>{sec.durationMinutes} মি.</span>}
                  {sec.totalMarks && <span>• {sec.totalMarks} মার্কস</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules and Guidelines */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          পরীক্ষার নিয়মাবলী ও নির্দেশিকা (Instructions & Guidelines)
        </h3>
        <ul className="space-y-2.5 text-sm text-slate-600 list-disc list-inside">
          <li>
            <strong>সার্ভার-অথরিটেটিভ টাইমার:</strong> পরীক্ষা শুরুর সাথে সাথে সার্ভার থেকে নির্ধারিত সময় গণনা শুরু হবে। ব্রাউজার রিলোড করলেও সময় বৃদ্ধি পাবে না।
          </li>
          <li>
            <strong>স্বয়ংক্রিয় সংরক্ষণ (Autosave):</strong> আপনার প্রতিটি উত্তরের পরিবর্তন স্বয়ংক্রিয়ভাবে সার্ভার ডাটাবেজে সংরক্ষিত হবে।
          </li>
          <li>
            <strong>সর্বোচ্চ সুযোগ (Attempts):</strong> এই পরীক্ষায় সর্বোচ্চ {eligibility.maxAttempts} বার অংশগ্রহণ করা যাবে। আপনি ইতোমধ্যে {eligibility.attemptsUsed} বার অংশ নিয়েছেন।
          </li>
          <li>
            <strong>নেগেটিভ মার্কিং:</strong> প্রতিটি ভুল উত্তরের জন্য প্রাপ্ত মোট নম্বর থেকে {exam.negativeMarkRate} নম্বর কেটে নেওয়া হবে। অনুত্তরিত প্রশ্নের জন্য কোনো নম্বর কাটা হবে না।
          </li>
          <li>
            <strong>ফলাফল ও সমাধান নীতি:</strong>{" "}
            {exam.releasePolicy === "IMMEDIATE"
              ? "পরীক্ষা জমা দেওয়ার পরপরই বিস্তারিত ফলাফল এবং সঠিক উত্তর দেখতে পারবেন।"
              : exam.releasePolicy === "AFTER_EXAM_WINDOW"
              ? "পরীক্ষার নির্ধারিত সময়সীমা সমাপ্তির পর পূর্ণাঙ্গ সমাধান এবং মেরিট লিস্ট প্রকাশ করা হবে।"
              : "কর্তৃপক্ষ কর্তৃক চূড়ান্ত মূল্যায়নের পর ফলাফল প্রকাশ করা হবে।"}
          </li>
        </ul>
      </div>

      {/* Action CTA Box */}
      <div className="bg-slate-900 text-white p-6 md:p-8 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <div className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
            {isResuming ? "অসম্পূর্ণ পরীক্ষা শনাক্ত হয়েছে" : "প্রস্তুতি সম্পন্ন হলে শুরু করুন"}
          </div>
          <div className="text-xl font-bold">
            {isResuming
              ? "আপনার চলমান পরীক্ষাটি চালু রাখুন"
              : eligibility.eligible
              ? "আপনি এই পরীক্ষায় অংশ নেওয়ার জন্য উপযুক্ত"
              : "পরীক্ষায় অংশগ্রহণের সুযোগ নেই"}
          </div>
          {!eligibility.eligible && eligibility.reason && (
            <p className="text-xs text-rose-300 font-medium">{eligibility.reason}</p>
          )}
        </div>

        <div>
          {isResuming ? (
            <Link
              href={`/exams/session/${eligibility.activeSessionId}`}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg transition text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>চলমান পরীক্ষায় ফিরে যান (Resume Exam)</span>
            </Link>
          ) : eligibility.eligible ? (
            <button
              onClick={handleStartExam}
              disabled={starting}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold rounded-xl shadow-lg transition text-sm disabled:opacity-50"
            >
              <span>{starting ? "পরীক্ষা শুরু হচ্ছে..." : "পরীক্ষা শুরু করুন (Start Exam)"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              disabled
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-slate-800 text-slate-500 font-bold rounded-xl text-sm cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              <span>অনুমতি নেই (Not Eligible)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
