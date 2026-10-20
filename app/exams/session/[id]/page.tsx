"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { MathText } from "@/components/ui/MathText";
import {
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  RotateCcw,
  CheckCircle2,
  Bookmark,
} from "lucide-react";

interface QuestionOption {
  id: string;
  optionKey: string;
  textBn: string;
  textEn?: string | null;
}

interface Question {
  id: string;
  questionTextBn: string;
  questionTextEn?: string | null;
  marks: number;
  options: QuestionOption[];
  subject: { nameBn: string; nameEn: string };
  chapter: { nameBn: string; nameEn: string; chapterNum: number };
}

interface SessionData {
  id: string;
  category: string;
  mode: string;
  status: string;
  durationMinutes: number;
  serverDeadline: string;
  correctMark: number;
  negativeMark: number;
  totalQuestions: number;
  sessionQuestions: { orderIndex: number; question: Question }[];
  studentAnswers: { questionId: string; selectedOption: string | null; timeSpentSec: number }[];
}

export default function ExamSessionPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { locale, t, formatTime } = useI18n();

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | null>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [timeLeftSec, setTimeLeftSec] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [autoSavedNotice, setAutoSavedNotice] = useState(false);

  // Load session from server
  useEffect(() => {
    fetch(`/api/v1/exams/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Exam not found or unauthorized");
        return res.json();
      })
      .then((data) => {
        const s: SessionData = data.session;
        setSession(s);

        // If already submitted or evaluated, jump to result
        if (s.status === "SUBMITTED" || s.status === "EVALUATED") {
          router.replace(`/exams/result/${s.id}`);
          return;
        }

        // Restore previously autosaved answers
        const ansMap: Record<string, string | null> = {};
        if (s.studentAnswers) {
          s.studentAnswers.forEach((a) => {
            ansMap[a.questionId] = a.selectedOption;
          });
        }
        setSelectedAnswers(ansMap);

        // Calculate initial remaining seconds to server deadline
        const deadline = new Date(s.serverDeadline).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((deadline - now) / 1000));
        setTimeLeftSec(diff);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id, router]);

  // Submit exam handler
  const handleSubmitExam = useCallback(
    async () => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setShowConfirmModal(false);

      if (!session) return;

      const answersPayload = session.sessionQuestions.map((sq) => ({
        questionId: sq.question.id,
        selectedOption: selectedAnswers[sq.question.id] ?? null,
        timeSpentSec: 10,
      }));

      try {
        const res = await fetch(`/api/v1/exams/${id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: answersPayload }),
        });

        if (!res.ok) throw new Error("Failed to submit exam");

        router.replace(`/exams/result/${id}`);
      } catch (err) {
        console.error("Submit error:", err);
        setIsSubmitting(false);
      }
    },
    [id, session, selectedAnswers, isSubmitting, router]
  );

  // Synchronized countdown timer
  useEffect(() => {
    if (!session || session.mode === "PRACTICE" || timeLeftSec <= 0) return;

    const timer = setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Trigger auto-submit when server deadline is reached
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, timeLeftSec, handleSubmitExam]);

  // Autosave answer handler
  const handleSelectOption = async (questionId: string, optionKey: string) => {
    const nextOption = selectedAnswers[questionId] === optionKey ? null : optionKey;

    // Optimistic UI update
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: nextOption,
    }));

    setAutoSavedNotice(true);
    setTimeout(() => setAutoSavedNotice(false), 1500);

    // Persist to server
    try {
      await fetch(`/api/v1/exams/${id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          selectedOption: nextOption,
          timeSpentSec: 5,
        }),
      });
    } catch (err) {
      console.error("Autosave network error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500 font-medium">
        {t.common.loading}
      </div>
    );
  }

  if (!session || !session.sessionQuestions || session.sessionQuestions.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <p className="text-slate-700 font-semibold">{t.common.empty}</p>
        <button
          onClick={() => router.push("/exams/custom")}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold"
        >
          {locale === "bn" ? "নতুন পরীক্ষা শুরু করুন" : "Start New Exam"}
        </button>
      </div>
    );
  }

  const currentSq = session.sessionQuestions[currentIndex];
  const currentQuestion = currentSq.question;
  const answeredCount = Object.values(selectedAnswers).filter(Boolean).length;
  const markedCount = Object.values(markedForReview).filter(Boolean).length;
  const totalQuestions = session.sessionQuestions.length;
  const isCurrentMarked = Boolean(markedForReview[currentQuestion.id]);

  const toggleMarkForReview = (questionId: string) => {
    setMarkedForReview((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Persistent Bar: Timer & Progress */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-3">
        {/* Progress Info */}
        <div className="flex items-center gap-3 text-xs sm:text-sm">
          <span className="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-md">
            {t.exam.questionNumber} {currentIndex + 1} {t.exam.of} {totalQuestions}
          </span>
          <span className="text-emerald-700 font-semibold hidden sm:inline">
            {answeredCount} {t.exam.answered}
          </span>
          {markedCount > 0 && (
            <span className="text-purple-700 font-semibold hidden sm:inline">
              • {markedCount} {locale === "bn" ? "রিভিউ" : "Review"}
            </span>
          )}
          {autoSavedNotice && (
            <span className="text-emerald-600 text-xs flex items-center gap-1 animate-pulse">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{locale === "bn" ? "সংরক্ষিত" : "Autosaved"}</span>
            </span>
          )}
        </div>

        {/* Server Authoritative Timer with Warning Color Transitions */}
        {session.mode !== "PRACTICE" && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-sm sm:text-base border transition-all ${
              timeLeftSec <= 120
                ? "bg-rose-50 text-rose-700 border-rose-300 animate-pulse"
                : timeLeftSec <= 300
                ? "bg-amber-50 text-amber-800 border-amber-300"
                : "bg-slate-50 text-slate-800 border-slate-200"
            }`}
          >
            <Clock className={`w-4 h-4 ${timeLeftSec <= 120 ? "text-rose-600" : timeLeftSec <= 300 ? "text-amber-600" : "text-emerald-600"}`} />
            <span>{formatTime(timeLeftSec)}</span>
          </div>
        )}

        {/* Submit Button Trigger */}
        <button
          onClick={() => setShowConfirmModal(true)}
          disabled={isSubmitting}
          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{t.exam.submitExam}</span>
        </button>
      </div>

      {/* Main Examination Layout: Question Card & Palette */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Area (3 Cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            {/* Meta & Mark for Review */}
            <div className="flex flex-wrap justify-between items-center text-xs text-slate-500 border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {currentQuestion.subject.nameBn}
                </span>
                <span>{currentQuestion.chapter.nameBn}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleMarkForReview(currentQuestion.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                    isCurrentMarked
                      ? "bg-purple-100 text-purple-800 border-purple-300"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isCurrentMarked ? "fill-purple-600 text-purple-600" : ""}`} />
                  <span>{t.exam.markedForReview}</span>
                </button>
                <span className="text-slate-400">
                  +{session.correctMark} / -{session.negativeMark} {locale === "bn" ? "মার্ক" : "Marks"}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <div className="text-lg sm:text-xl font-medium text-slate-900 leading-relaxed">
              <MathText text={currentQuestion.questionTextBn} />
            </div>

            {/* Options */}
            <div className="space-y-3 pt-2">
              {currentQuestion.options.map((opt) => {
                const isSelected = selectedAnswers[currentQuestion.id] === opt.optionKey;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(currentQuestion.id, opt.optionKey)}
                    className={`w-full p-4 rounded-xl border text-left flex items-center gap-4 transition cursor-pointer ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 border border-slate-300 text-slate-700"
                      }`}
                    >
                      {opt.optionKey}
                    </span>
                    <div className="text-sm sm:text-base leading-relaxed">
                      <MathText text={opt.textBn} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Question Controls */}
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <button
                onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
                disabled={currentIndex === 0}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{t.exam.prev}</span>
              </button>

              {selectedAnswers[currentQuestion.id] && (
                <button
                  onClick={() => handleSelectOption(currentQuestion.id, selectedAnswers[currentQuestion.id]!)}
                  className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.exam.clearAnswer}</span>
                </button>
              )}

              <button
                onClick={() => setCurrentIndex((idx) => Math.min(totalQuestions - 1, idx + 1))}
                disabled={currentIndex === totalQuestions - 1}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <span>{t.exam.next}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Question Navigation Palette (1 Col) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {locale === "bn" ? "প্রশ্ন প্যালেট (Jump to)" : "Question Palette"}
            </h3>

            <div className="grid grid-cols-5 gap-1.5">
              {session.sessionQuestions.map((sq, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = Boolean(selectedAnswers[sq.question.id]);
                const isMarked = Boolean(markedForReview[sq.question.id]);

                let btnStyle = "bg-slate-100 text-slate-600 hover:bg-slate-200";
                if (isCurrent) {
                  btnStyle = "ring-2 ring-emerald-600 font-extrabold bg-emerald-600 text-white";
                } else if (isMarked) {
                  btnStyle = "bg-purple-100 text-purple-800 border border-purple-300 font-bold";
                } else if (isAnswered) {
                  btnStyle = "bg-emerald-100 text-emerald-800 font-bold";
                }

                return (
                  <button
                    key={sq.question.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center relative ${btnStyle}`}
                  >
                    {idx + 1}
                    {isMarked && !isCurrent && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-purple-600 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
                <span>{t.exam.answered} ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-600 shrink-0" />
                <span>{t.exam.markedForReview} ({markedCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-200 shrink-0" />
                <span>{t.exam.unanswered} ({totalQuestions - answeredCount})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">{t.exam.submitConfirmTitle}</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t.exam.submitConfirmMsg}
            </p>
            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 text-slate-700">
              <div>
                <strong>{t.exam.answered}:</strong> {answeredCount} {t.exam.of} {totalQuestions}
              </div>
              {markedCount > 0 && (
                <div className="text-purple-700">
                  <strong>{t.exam.markedForReview}:</strong> {markedCount}
                </div>
              )}
              <div>
                <strong>{t.exam.unanswered}:</strong> {totalQuestions - answeredCount}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => handleSubmitExam()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                {t.exam.submitExam}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
