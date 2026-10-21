"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  HelpCircle,
  X,
  Filter,
} from "lucide-react";
import { MathText } from "@/components/ui/MathText";

interface GradingQueueItem {
  id: string; // studentAnswer id
  questionId: string;
  selectedOption?: string | null;
  writtenAnswer?: string | null;
  marksObtained?: number | null;
  timeSpentSec: number;
  question: {
    id: string;
    questionTextBn: string;
    questionTextEn?: string | null;
    type: string;
    marks: number;
    answer?: {
      correctKey: string;
      explanationBn: string;
    } | null;
  };
  session: {
    id: string;
    studentId: string;
    examId?: string | null;
    submittedAt?: string | null;
    student: {
      id: string;
      fullNameBn?: string | null;
      fullNameEn?: string | null;
      email: string;
    };
    exam?: {
      id: string;
      titleBn: string;
      titleEn: string;
    } | null;
  };
  manualGrade?: {
    id: string;
    marksAwarded: number;
    feedback?: string | null;
    gradedAt: string;
    grader: {
      fullNameEn?: string | null;
      email: string;
    };
  } | null;
}

export function ManualGradingManager() {
  const [items, setItems] = useState<GradingQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "GRADED">("PENDING");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active grading modal
  const [activeItem, setActiveItem] = useState<GradingQueueItem | null>(null);
  const [marksInput, setMarksInput] = useState<number>(0);
  const [feedbackInput, setFeedbackInput] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/grading?status=${statusFilter}`);
      if (!res.ok) throw new Error("Failed to load grading queue");
      const data = await res.json();
      setItems(data.items || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleOpenGradeModal = (item: GradingQueueItem) => {
    setActiveItem(item);
    setMarksInput(item.manualGrade ? item.manualGrade.marksAwarded : 0);
    setFeedbackInput(item.manualGrade?.feedback || "");
  };

  const handleSubmitGrade = async () => {
    if (!activeItem) return;

    if (marksInput < 0 || marksInput > activeItem.question.marks) {
      setErrorMsg(`Marks awarded must be between 0 and ${activeItem.question.marks}`);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/admin/grading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentAnswerId: activeItem.id,
          marksAwarded: marksInput,
          feedback: feedbackInput || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit grade");
      }

      setSuccessMsg("Marks saved and total score recalculated successfully!");
      setActiveItem(null);
      loadQueue();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-600" />
            ম্যানুয়াল গ্রেডিং কিউ (Subjective Evaluation Queue)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            সৃজনশীল ও বর্ণনামূলক লিখিত উত্তরের মূল্যায়ন, নম্বর প্রদান ও মার্কশিট পুনঃগণনা।
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
              statusFilter === "PENDING"
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            মূল্যায়ন অপেক্ষমান (Pending)
          </button>
          <button
            onClick={() => setStatusFilter("GRADED")}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
              statusFilter === "GRADED"
                ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            মূল্যায়িত (Graded)
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Queue List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium">গ্রেডিং কিউ লোড হচ্ছে...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            {statusFilter === "PENDING"
              ? "বর্তমানে কোনো মূল্যায়ন অপেক্ষমান নেই। সব লিখিত উত্তর পরীক্ষিত।"
              : "কোনো মূল্যায়িত উত্তর পাওয়া যায়নি।"}
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {items.map((item) => (
              <div key={item.id} className="p-5 hover:bg-slate-50/70 transition space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 text-sm">
                      {item.session.exam?.titleBn || "পরীক্ষা"}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.question.type}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                      সর্বোচ্চ নম্বর: {item.question.marks}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <User className="w-3.5 h-3.5" />
                    <span>{item.session.student.fullNameBn || item.session.student.fullNameEn || item.session.student.email}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                  <div className="font-semibold text-slate-700 text-xs uppercase mb-1">প্রশ্ন (Question):</div>
                  <div className="text-slate-800">
                    <MathText text={item.question.questionTextBn} />
                  </div>
                </div>

                <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200/80 text-sm">
                  <div className="font-semibold text-amber-900 text-xs uppercase mb-1">
                    শিক্ষার্থীর লিখিত উত্তর (Student Response):
                  </div>
                  <div className="text-slate-800 whitespace-pre-wrap">
                    {item.writtenAnswer || <span className="italic text-slate-400">কোনো লিখিত উত্তর প্রদান করা হয়নি</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    {item.manualGrade ? (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                        প্রাপ্ত নম্বর: {item.manualGrade.marksAwarded} / {item.question.marks}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded font-medium">
                        নম্বর প্রদান বাকি (Ungraded)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleOpenGradeModal(item)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                  >
                    {item.manualGrade ? "পুনঃমূল্যায়ন করুন (Regrade)" : "নম্বর দিন (Grade Answer)"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grading Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-base">
                লিখিত উত্তর মূল্যায়ন (Evaluate Written Answer)
              </h3>
              <button onClick={() => setActiveItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-600 block mb-0.5">প্রশ্ন:</span>
                <div className="p-2.5 bg-slate-50 rounded border text-slate-800">
                  <MathText text={activeItem.question.questionTextBn} />
                </div>
              </div>

              <div>
                <span className="font-bold text-amber-800 block mb-0.5">শিক্ষার্থীর উত্তর:</span>
                <div className="p-2.5 bg-amber-50/50 rounded border border-amber-200 text-slate-800 max-h-36 overflow-y-auto">
                  {activeItem.writtenAnswer || "উত্তর দেওয়া হয়নি"}
                </div>
              </div>

              {activeItem.question.answer?.explanationBn && (
                <div>
                  <span className="font-bold text-slate-600 block mb-0.5">মডেল উত্তর / রুব্রিক:</span>
                  <div className="p-2 bg-slate-100 rounded text-slate-700 italic">
                    {activeItem.question.answer.explanationBn}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <label className="block font-bold text-slate-700 mb-1">
                  প্রদত্ত নম্বর (Marks Awarded, সর্বোচ্চ {activeItem.question.marks}) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={activeItem.question.marks}
                  value={marksInput}
                  onChange={(e) => setMarksInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">শিক্ষকের ফিডব্যাক / মন্তব্য (ঐচ্ছিক)</label>
                <textarea
                  rows={2}
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="উত্তরের ত্রুটি বা উন্নতির দিক নির্দেশনা..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 font-medium"
              >
                বাতিল (Cancel)
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitGrade}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? "সংরক্ষণ হচ্ছে..." : "নম্বর সংরক্ষণ করুন (Save Grade)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
