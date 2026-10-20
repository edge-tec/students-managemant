"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { MathText } from "@/components/ui/MathText";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Flag,
  Share2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock,
  Layers,
  GraduationCap,
} from "lucide-react";

interface QuestionOption {
  id: string;
  optionKey: string;
  textBn: string;
  textEn?: string | null;
  isCorrect: boolean;
}

interface QuestionSubpart {
  id: string;
  partLabel: string;
  questionTextBn: string;
  questionTextEn?: string | null;
  marks: number;
  solutionBn: string;
  solutionEn?: string | null;
  markingGuidance?: string | null;
}

interface QuestionDetail {
  id: string;
  category: string;
  type: "MCQ" | "CQ" | "SHORT";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  marks: number;
  negativeMarks: number;
  questionTextBn: string;
  questionTextEn?: string | null;
  stemBn?: string | null;
  stemEn?: string | null;
  diagramUrl?: string | null;
  textbookRef?: string | null;
  teacherTipsBn?: string | null;
  teacherTipsEn?: string | null;
  isLocked?: boolean;
  isBookmarked?: boolean;
  options: QuestionOption[];
  subparts: QuestionSubpart[];
  answer?: {
    correctKey: string;
    explanationBn: string;
    explanationEn?: string | null;
  } | null;
  subject?: {
    id: string;
    code: string;
    nameBn: string;
    nameEn: string;
  } | null;
  paper?: {
    id: string;
    paperNumber: number;
    nameBn: string;
    nameEn: string;
  } | null;
  chapter?: {
    id: string;
    chapterNum: number;
    nameBn: string;
    nameEn: string;
  } | null;
  topic?: {
    id: string;
    nameBn: string;
    nameEn: string;
  } | null;
  references: {
    examYear: number;
    examSessionName?: string | null;
    board?: { nameBn: string; nameEn: string; code: string } | null;
  }[];
}

interface SimilarQuestion {
  id: string;
  questionTextBn: string;
  type: string;
  difficulty: string;
  subject: { nameBn: string };
  chapter: { nameBn: string; chapterNum: number };
  references: { board?: { nameBn: string } | null }[];
}

export default function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { locale, t, formatNumber } = useI18n();

  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive Practice State
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [expandedSubparts, setExpandedSubparts] = useState<Record<string, boolean>>({});

  // Bookmarking
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  // Reporting Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("WRONG_ANSWER");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Copy Link Alert
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/questions/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("প্রশ্নটি পাওয়া যায়নি বা অপ্রকাশিত।");
        }
        return res.json();
      })
      .then((data) => {
        setQuestion(data.question);
        setSimilarQuestions(data.similarQuestions || []);
        setIsBookmarked(Boolean(data.question.isBookmarked));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const handleToggleBookmark = async () => {
    if (!question) return;
    setBookmarkLoading(true);
    try {
      const res = await fetch(`/api/v1/questions/${question.id}/bookmark`, {
        method: "POST",
      });
      if (res.status === 401) {
        router.push(`/login?redirect=/questions/${question.id}`);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setIsBookmarked(data.bookmarked);
      }
    } catch (err) {
      console.error("Bookmark toggle failed:", err);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleToggleSubpart = (subpartId: string) => {
    setExpandedSubparts((prev) => ({
      ...prev,
      [subpartId]: !prev[subpartId],
    }));
  };

  const handleToggleAllSubparts = (expand: boolean) => {
    if (!question?.subparts) return;
    const newState: Record<string, boolean> = {};
    question.subparts.forEach((sp) => {
      newState[sp.id] = expand;
    });
    setExpandedSubparts(newState);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question) return;
    setReportSubmitting(true);
    try {
      const res = await fetch(`/api/v1/questions/${question.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reportReason,
          description: reportDescription,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReportSuccess(true);
        setTimeout(() => {
          setShowReportModal(false);
          setReportSuccess(false);
          setReportDescription("");
        }, 1800);
      }
    } catch (err) {
      console.error("Report submit failed:", err);
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">প্রশ্ন লোড হচ্ছে...</p>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">
          {error || "প্রশ্নটি লোড করা যায়নি"}
        </h2>
        <p className="text-slate-600">
          প্রশ্নটি অপসারিত হতে পারে অথবা আপনার অ্যাক্সেস অনুমতি নেই।
        </p>
        <Link
          href="/questions"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> প্রশ্ন ব্যাংকে ফিরে যান
        </Link>
      </div>
    );
  }

  const isMCQ = question.type === "MCQ";
  const isCQ = question.type === "CQ";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <Link
          href="/questions"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition"
        >
          <ArrowLeft className="w-4 h-4" /> প্রশ্ন ব্যাংকে ফিরে যান
        </Link>

        {/* Action Buttons: Bookmark, Report, Share */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleBookmark}
            disabled={bookmarkLoading}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium border transition ${
              isBookmarked
                ? "bg-amber-50 text-amber-700 border-amber-300"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
            title={isBookmarked ? "বুকমার্ক সরানো" : "বুকমার্ক করুন"}
          >
            {isBookmarked ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-amber-600" />
                <span>বুকমার্কড</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4" />
                <span>বুকমার্ক</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition"
            title="ভুল রিপোর্ট করুন"
          >
            <Flag className="w-4 h-4" />
            <span>রিপোর্ট</span>
          </button>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="লিংক কপি করুন"
          >
            <Share2 className="w-4 h-4" />
            <span>{copiedLink ? "কপি হয়েছে!" : "শেয়ার"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Question Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Metadata Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-200">
                {question.category}
              </span>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-800 text-xs font-semibold rounded-full border border-indigo-200">
                {question.type === "MCQ" ? "বহুনির্বাচনি (MCQ)" : question.type === "CQ" ? "সৃজনশীল (CQ)" : "সংক্ষিপ্ত উত্তর"}
              </span>
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                  question.difficulty === "EASY"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : question.difficulty === "HARD"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {question.difficulty === "EASY" ? "সহজ" : question.difficulty === "HARD" ? "কঠিন" : "মাঝারি"}
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                নম্বর: {formatNumber(question.marks)}
              </span>
              {question.negativeMarks > 0 && isMCQ && (
                <span className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-medium rounded-full">
                  নেগেটিভ মার্ক: -{formatNumber(question.negativeMarks)}
                </span>
              )}
            </div>

            {/* Subject, Paper, Chapter & Board badges */}
            <div className="flex flex-wrap items-center gap-y-2 text-sm text-slate-600 gap-x-4">
              {question.subject && (
                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>{question.subject.nameBn}</span>
                  {question.paper && <span>({question.paper.nameBn})</span>}
                </div>
              )}
              {question.chapter && (
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-400" />
                  <span>অধ্যায় {formatNumber(question.chapter.chapterNum)}: {question.chapter.nameBn}</span>
                </div>
              )}
              {question.references && question.references.length > 0 && (
                <div className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md text-xs font-medium border border-indigo-100">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>
                    {question.references.map((r) => `${r.board?.nameBn || "বোর্ড"} '${formatNumber(r.examYear)}`).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Question Content Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            {/* Creative Question Stem (উদ্দীপক) if CQ */}
            {isCQ && question.stemBn && (
              <div className="bg-amber-50/60 rounded-xl p-5 border border-amber-200/80 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm tracking-wide">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>উদ্দীপকটি মনোযোগ দিয়ে পড় এবং নিচের প্রশ্নগুলোর উত্তর দাও:</span>
                </div>
                <div className="text-slate-900 text-base leading-relaxed font-normal whitespace-pre-line">
                  <MathText text={question.stemBn} />
                </div>
                {question.stemEn && (
                  <div className="text-slate-600 text-sm leading-relaxed italic border-t border-amber-200/50 pt-2">
                    <MathText text={question.stemEn} />
                  </div>
                )}
              </div>
            )}

            {/* Diagram / Formula Figure */}
            {question.diagramUrl && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center">
                <img
                  src={question.diagramUrl}
                  alt="চিত্র / উদ্দীপকের ডায়াগ্রাম"
                  className="max-h-72 object-contain rounded-lg"
                />
                <span className="text-xs text-slate-500 mt-2">চিত্র / সংকেত ডায়াগ্রাম</span>
              </div>
            )}

            {/* MCQ Question Text */}
            {isMCQ && (
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                  <MathText text={question.questionTextBn} />
                </h1>
                {question.questionTextEn && (
                  <p className="text-base text-slate-600 leading-relaxed italic">
                    <MathText text={question.questionTextEn} />
                  </p>
                )}
              </div>
            )}

            {/* MCQ Options (Interactive practice) */}
            {isMCQ && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  বিকল্পসমূহ নির্বাচন করে স্ব-মূল্যায়ন করুন:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {question.options.map((opt) => {
                    const isSelected = selectedOption === opt.optionKey;
                    const isCorrect = isAnswerRevealed && opt.isCorrect;
                    const isWrong = isAnswerRevealed && isSelected && !opt.isCorrect;

                    let cardClass = "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/20";
                    let badgeClass = "bg-slate-100 text-slate-700 border-slate-300";

                    if (isSelected && !isAnswerRevealed) {
                      cardClass = "border-emerald-500 bg-emerald-50/40 text-emerald-950 font-medium";
                      badgeClass = "bg-emerald-600 text-white border-emerald-600";
                    } else if (isCorrect) {
                      cardClass = "border-emerald-500 bg-emerald-50 text-emerald-900 font-medium ring-2 ring-emerald-500/20";
                      badgeClass = "bg-emerald-600 text-white border-emerald-600";
                    } else if (isWrong) {
                      cardClass = "border-rose-400 bg-rose-50 text-rose-900 ring-2 ring-rose-400/20";
                      badgeClass = "bg-rose-600 text-white border-rose-600";
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          if (!isAnswerRevealed) {
                            setSelectedOption(opt.optionKey);
                          }
                        }}
                        className={`w-full p-4 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${cardClass}`}
                      >
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 border ${badgeClass}`}>
                          {opt.optionKey}
                        </span>
                        <div className="pt-1 text-base leading-snug flex-1">
                          <MathText text={opt.textBn} />
                          {opt.textEn && (
                            <span className="block text-xs text-slate-500 mt-1 italic">
                              <MathText text={opt.textEn} />
                            </span>
                          )}
                        </div>
                        {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 self-center" />}
                        {isWrong && <XCircle className="w-5 h-5 text-rose-600 shrink-0 self-center" />}
                      </button>
                    );
                  })}
                </div>

                {/* Submit / Check Answer Button */}
                <div className="pt-4 flex flex-wrap items-center gap-3">
                  {!isAnswerRevealed ? (
                    <button
                      type="button"
                      disabled={!selectedOption}
                      onClick={() => setIsAnswerRevealed(true)}
                      className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-xs"
                    >
                      উত্তর যাচাই করুন
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAnswerRevealed(false);
                        setSelectedOption(null);
                      }}
                      className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition text-sm"
                    >
                      পুনরায় অনুশীলন করুন
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Creative Question (CQ) Subparts */}
            {isCQ && question.subparts && question.subparts.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h2 className="text-base font-bold text-slate-800">
                    প্রশ্নসমূহ (মোট নম্বর: {formatNumber(question.marks || 10)})
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleAllSubparts(true)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                    >
                      সব উত্তর প্রসারিত করুন
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAllSubparts(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                    >
                      সংকুচিত করুন
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {question.subparts.map((sp) => {
                    const isOpen = expandedSubparts[sp.id];
                    return (
                      <div
                        key={sp.id}
                        className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                      >
                        <div className="p-4 sm:p-5 flex items-start justify-between gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                                {sp.partLabel}
                              </span>
                              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                                [{formatNumber(sp.marks)} নম্বর]
                              </span>
                            </div>
                            <div className="text-base font-semibold text-slate-900 pt-1">
                              <MathText text={sp.questionTextBn} />
                            </div>
                            {sp.questionTextEn && (
                              <div className="text-sm text-slate-500 italic">
                                <MathText text={sp.questionTextEn} />
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleSubpart(sp.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition shrink-0"
                          >
                            <span>{isOpen ? "সমাধান লুকান" : "সমাধান দেখুন"}</span>
                            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Collapsible Solution and Rubric */}
                        {isOpen && (
                          <div className="p-4 sm:p-5 bg-emerald-50/40 border-t border-slate-200 space-y-3">
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-emerald-900 tracking-wider uppercase">
                                আদর্শ সমাধান (Model Answer):
                              </span>
                              <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-line">
                                <MathText text={sp.solutionBn} />
                              </div>
                              {sp.solutionEn && (
                                <div className="text-slate-600 text-xs leading-relaxed italic pt-1">
                                  <MathText text={sp.solutionEn} />
                                </div>
                              )}
                            </div>

                            {sp.markingGuidance && (
                              <div className="pt-2 border-t border-emerald-200/60 text-xs text-slate-700">
                                <span className="font-bold text-emerald-800">মার্কিং গাইডলাইন: </span>
                                <span>{sp.markingGuidance}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MCQ Answer & Explanation Section (Visible when checked or always accessible for authorized learning) */}
            {isMCQ && (isAnswerRevealed || question.isLocked) && (
              <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                {question.isLocked ? (
                  <div className="p-6 bg-amber-50 rounded-xl border border-amber-200 text-center space-y-3">
                    <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-base">
                      পূর্ণাঙ্গ সমাধান প্রিমিয়াম গ্রাহকদের জন্য সংরক্ষিত
                    </h3>
                    <p className="text-sm text-slate-600 max-w-md mx-auto">
                      সকল ব্যাখ্যা, টেক্সটবুক রেফারেন্স ও বিশেষ টিপস আনলক করতে এখনই আমাদের প্রিমিয়াম মেম্বারশিপে আপগ্রেড করুন।
                    </p>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-2 px-5 py-2 bg-amber-600 text-white rounded-lg font-semibold text-sm hover:bg-amber-700 transition"
                    >
                      <Sparkles className="w-4 h-4" /> মেম্বারশিপ প্ল্যান দেখুন
                    </Link>
                  </div>
                ) : (
                  <div className="p-5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-base">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>সঠিক উত্তর: {question.answer?.correctKey}</span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        বিস্তারিত ব্যাখ্যা:
                      </h4>
                      <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-line font-normal">
                        <MathText text={question.answer?.explanationBn} />
                      </div>
                      {question.answer?.explanationEn && (
                        <div className="text-slate-600 text-xs italic pt-1">
                          <MathText text={question.answer?.explanationEn} />
                        </div>
                      )}
                    </div>

                    {question.textbookRef && (
                      <div className="pt-2 border-t border-emerald-200/60 text-xs text-slate-700 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="font-bold text-emerald-900">পাঠ্যবই রেফারেন্স:</span>
                        <span>{question.textbookRef}</span>
                      </div>
                    )}

                    {question.teacherTipsBn && (
                      <div className="p-3 bg-white rounded-lg border border-emerald-200/80 text-xs text-emerald-950 flex items-start gap-2">
                        <Award className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">শিক্ষকের বিশেষ টিপস: </span>
                          <span>{question.teacherTipsBn}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Question Info & Similar Questions */}
        <div className="lg:col-span-4 space-y-6">
          {/* Information Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">
              প্রশ্নের সারসংক্ষেপ
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center text-slate-600">
                <span>ক্যাটাগরি</span>
                <span className="font-semibold text-slate-800">{question.category}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>প্রশ্নের ধরণ</span>
                <span className="font-semibold text-slate-800">
                  {question.type === "MCQ" ? "বহুনির্বাচনি" : question.type === "CQ" ? "সৃজনশীল" : "সংক্ষিপ্ত"}
                </span>
              </div>
              {question.subject && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>বিষয়</span>
                  <span className="font-semibold text-slate-800">{question.subject.nameBn}</span>
                </div>
              )}
              {question.chapter && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>অধ্যায়</span>
                  <span className="font-semibold text-slate-800">অধ্যায় {formatNumber(question.chapter.chapterNum)}</span>
                </div>
              )}
              {question.references && question.references.length > 0 && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>বোর্ড পরীক্ষা</span>
                  <span className="font-semibold text-slate-800">
                    {question.references[0]?.board?.nameBn || "সকল বোর্ড"} ({formatNumber(question.references[0]?.examYear)})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Similar Questions */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>অনুরূপ প্রশ্নসমূহ</span>
              <span className="text-xs font-normal text-slate-500">
                {formatNumber(similarQuestions.length)} টি প্রশ্ন
              </span>
            </h3>

            {similarQuestions.length === 0 ? (
              <p className="text-sm text-slate-500 py-3 text-center">
                এই অধ্যায়ে অন্য কোনো অনুরূপ প্রশ্ন পাওয়া যায়নি।
              </p>
            ) : (
              <div className="space-y-3">
                {similarQuestions.map((sim) => (
                  <Link
                    key={sim.id}
                    href={`/questions/${sim.id}`}
                    className="block p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition group"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded font-medium">
                        {sim.type}
                      </span>
                      {sim.references?.[0]?.board && (
                        <span className="text-xs text-indigo-700 font-medium">
                          {sim.references[0].board.nameBn}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-800 group-hover:text-emerald-700 line-clamp-2">
                      <MathText text={sim.questionTextBn} />
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Issue Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-lg">
                <Flag className="w-5 h-5" />
                <span>ভুল বা অসঙ্গতি রিপোর্ট করুন</span>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {reportSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-bold">রিপোর্ট সফলভাবে জমা হয়েছে!</p>
                <p className="text-xs text-emerald-700">আমাদের একাডেমিক টিম তথ্যটি যাচাই করবে।</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">সমস্যার কারণ নির্বাচন করুন:</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-emerald-600"
                  >
                    <option value="WRONG_ANSWER">ভুল উত্তর চিহ্নিত করা আছে (Wrong Answer)</option>
                    <option value="TYPO_OR_GRAMMAR">বানান বা ব্যাকরণগত ত্রুটি (Typo / Grammar)</option>
                    <option value="INCOMPLETE_QUESTION">অসম্পূর্ণ প্রশ্ন বা উপপ্রশ্ন অনুপস্থিত (Incomplete Question)</option>
                    <option value="IMAGE_OR_FORMULA_BROKEN">চিত্র বা সূত্র ত্রুটিপূর্ণ (Formula / Diagram Broken)</option>
                    <option value="OUT_OF_SYLLABUS">সিলেবাস বহির্ভূত প্রশ্ন (Out of Syllabus)</option>
                    <option value="OTHER">অন্যান্য সমস্যা (Other Issue)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    বিস্তারিত বিবরণ দিন (ঐচ্ছিক):
                  </label>
                  <textarea
                    rows={4}
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="সঠিক উত্তর কি হওয়া উচিত বা কোথায় ভুল তা সংক্ষেপে লিখুন..."
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="px-5 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 transition disabled:opacity-50"
                  >
                    {reportSubmitting ? "জমা হচ্ছে..." : "রিপোর্ট জমা দিন"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
