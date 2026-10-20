"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileQuestion,
  Plus,
  Search,
  CheckCircle2,
  Eye,
  Archive,
  History,
  AlertCircle,
} from "lucide-react";
import { MathText } from "@/components/ui/MathText";

interface OptionInput {
  optionKey: string;
  textBn: string;
  textEn: string;
  isCorrect: boolean;
}

interface SubpartInput {
  partLabel: string;
  questionTextBn: string;
  questionTextEn: string;
  marks: number;
  solutionBn: string;
  markingGuidance: string;
}

interface QuestionAdminItem {
  id: string;
  category: string;
  type: "MCQ" | "CQ" | "SHORT";
  difficulty: string;
  status: "DRAFT" | "REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";
  isPremium: boolean;
  marks: number;
  negativeMarks: number;
  questionTextBn: string;
  questionTextEn?: string | null;
  stemBn?: string | null;
  textbookRef?: string | null;
  subject: { nameBn: string; code: string };
  chapter: { nameBn: string; chapterNum: number };
  options: { optionKey: string; textBn: string; isCorrect: boolean }[];
  subparts: { partLabel: string; questionTextBn: string; marks: number; solutionBn: string }[];
  answer?: { correctKey: string; explanationBn: string } | null;
  references: { examYear: number; board?: { nameBn: string } | null }[];
  revisions?: { id: string; changedBy: string; reason: string; createdAt: string }[];
  reviews?: { id: string; status: string; comments?: string; reviewedAt: string; reviewer?: { fullName: string } }[];
  _count?: { bookmarks: number; reports: number };
}

export function QuestionManager() {
  const [questions, setQuestions] = useState<QuestionAdminItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");

  // Curriculum dropdown data
  const [subjects, setSubjects] = useState<any[]>([]);
  const [boards, setBoards] = useState<any[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<QuestionAdminItem | null>(null);
  const [auditQuestion, setAuditQuestion] = useState<QuestionAdminItem | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Create Form State
  const [createType, setCreateType] = useState<"MCQ" | "CQ">("MCQ");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [createCategory, setCreateCategory] = useState("HSC");
  const [createDifficulty, setCreateDifficulty] = useState("MEDIUM");
  const [createStatus, setCreateStatus] = useState("DRAFT");
  const [createIsPremium, setCreateIsPremium] = useState(false);
  const [questionTextBn, setQuestionTextBn] = useState("");
  const [questionTextEn, setQuestionTextEn] = useState("");
  const [stemBn, setStemBn] = useState("");
  const [stemEn, setStemEn] = useState("");
  const [textbookRef, setTextbookRef] = useState("");
  const [teacherTipsBn, setTeacherTipsBn] = useState("");
  const [boardId, setBoardId] = useState("");
  const [examYear, setExamYear] = useState<number>(2023);

  // MCQ Options
  const [options, setOptions] = useState<OptionInput[]>([
    { optionKey: "A", textBn: "", textEn: "", isCorrect: true },
    { optionKey: "B", textBn: "", textEn: "", isCorrect: false },
    { optionKey: "C", textBn: "", textEn: "", isCorrect: false },
    { optionKey: "D", textBn: "", textEn: "", isCorrect: false },
  ]);
  const [explanationBn, setExplanationBn] = useState("");

  // CQ Subparts
  const [subparts, setSubparts] = useState<SubpartInput[]>([
    { partLabel: "ক", questionTextBn: "", questionTextEn: "", marks: 1, solutionBn: "", markingGuidance: "জ্ঞানমূলক (১ নম্বর)" },
    { partLabel: "খ", questionTextBn: "", questionTextEn: "", marks: 2, solutionBn: "", markingGuidance: "অনুধাবনমূলক (২ নম্বর)" },
    { partLabel: "গ", questionTextBn: "", questionTextEn: "", marks: 3, solutionBn: "", markingGuidance: "প্রয়োগমূলক (৩ নম্বর)" },
    { partLabel: "ঘ", questionTextBn: "", questionTextEn: "", marks: 4, solutionBn: "", markingGuidance: "উচ্চতর দক্ষতামূলক (৪ নম্বর)" },
  ]);

  const [submitting, setSubmitting] = useState(false);

  // Fetch Curriculum Metadata
  useEffect(() => {
    fetch("/api/v1/curriculum")
      .then((res) => res.json())
      .then((data) => {
        setSubjects(data.subjects || []);
        setBoards(data.boards || []);
        if (data.subjects?.length > 0) {
          setSelectedSubjectId(data.subjects[0].id);
          if (data.subjects[0].chapters?.length > 0) {
            setSelectedChapterId(data.subjects[0].chapters[0].id);
          }
        }
      });
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (search.trim()) params.set("search", search.trim());
    params.set("page", String(page));
    params.set("limit", "15");

    try {
      const res = await fetch(`/api/v1/admin/questions?${params.toString()}`);
      const data = await res.json();
      setQuestions(data.questions || []);
      setTotalCount(data.pagination?.totalCount || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [category, status, type, search, page]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleStatusChange = async (questionId: string, newStatus: string, comments?: string) => {
    try {
      const res = await fetch(`/api/v1/admin/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, comments: comments || `Status changed to ${newStatus}` }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg({ type: "error", text: data.error || "স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।" });
      } else {
        setAlertMsg({ type: "success", text: `স্ট্যাটাস সফলভাবে '${newStatus}' এ পরিবর্তন করা হয়েছে।` });
        loadQuestions();
      }
    } catch (err: any) {
      setAlertMsg({ type: "error", text: err.message });
    }
  };

  const handleArchive = async (questionId: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই প্রশ্নটি আর্কাইভ করতে চান?")) return;
    try {
      const res = await fetch(`/api/v1/admin/questions/${questionId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg({ type: "error", text: data.error || "আর্কাইভ ব্যর্থ হয়েছে।" });
      } else {
        setAlertMsg({ type: "success", text: "প্রশ্নটি আর্কাইভ করা হয়েছে।" });
        loadQuestions();
      }
    } catch (err: any) {
      setAlertMsg({ type: "error", text: err.message });
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAlertMsg(null);

    const correctOption = options.find((o) => o.isCorrect)?.optionKey || "A";

    const payload: any = {
      category: createCategory,
      subjectId: selectedSubjectId,
      chapterId: selectedChapterId,
      type: createType,
      difficulty: createDifficulty,
      status: createStatus,
      isPremium: createIsPremium,
      questionTextBn: questionTextBn.trim(),
      questionTextEn: questionTextEn.trim() || null,
      textbookRef: textbookRef.trim() || null,
      teacherTipsBn: teacherTipsBn.trim() || null,
      references: boardId
        ? [{ boardId, examYear: Number(examYear), examSessionName: `বোর্ড পরীক্ষা ${examYear}` }]
        : [],
    };

    if (createType === "MCQ") {
      payload.marks = 1.0;
      payload.negativeMarks = 0.25;
      payload.options = options.map((opt) => ({
        optionKey: opt.optionKey,
        textBn: opt.textBn.trim(),
        textEn: opt.textEn.trim() || null,
        isCorrect: opt.isCorrect,
      }));
      payload.answer = {
        correctKey: correctOption,
        explanationBn: explanationBn.trim() || "সঠিক উত্তর ব্যাখ্যা অন্তর্ভুক্ত রয়েছে।",
      };
    } else if (createType === "CQ") {
      payload.marks = 10.0;
      payload.stemBn = stemBn.trim();
      payload.stemEn = stemEn.trim() || null;
      payload.subparts = subparts.map((sp) => ({
        partLabel: sp.partLabel,
        questionTextBn: sp.questionTextBn.trim(),
        questionTextEn: sp.questionTextEn.trim() || null,
        marks: sp.marks,
        solutionBn: sp.solutionBn.trim(),
        markingGuidance: sp.markingGuidance || null,
      }));
    }

    try {
      const res = await fetch("/api/v1/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg({ type: "error", text: data.error || "প্রশ্ন তৈরি ব্যর্থ হয়েছে।" });
      } else {
        setAlertMsg({ type: "success", text: "নতুন প্রশ্ন সফলভাবে তৈরি হয়েছে।" });
        setShowCreateModal(false);
        setQuestionTextBn("");
        setQuestionTextEn("");
        setStemBn("");
        loadQuestions();
      }
    } catch (err: any) {
      setAlertMsg({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const currentSubjectObj = subjects.find((s) => s.id === selectedSubjectId);
  const currentChapters = currentSubjectObj?.chapters || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-emerald-600" />
            <span>প্রশ্ন ব্যবস্থাপনা ও প্রকাশনা (Question Operations)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            MCQ এবং CQ প্রশ্ন তৈরি, রিভিউর জন্য সাবমিট, অনুমোদন, প্রকাশনা এবং অডিট রিভিশন রেকর্ড পরিচালনা করুন।
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন প্রশ্ন তৈরি করুন</span>
        </button>
      </div>

      {/* Alert Notification */}
      {alertMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${
            alertMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {alertMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{alertMsg.text}</span>
          </div>
          <button onClick={() => setAlertMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-2">
            &times;
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="বাংলা/ইংরেজি টেক্সট অনুসন্ধান..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
          />
        </div>

        {/* Category Filter */}
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="p-2 border border-slate-300 rounded-lg bg-white text-slate-700 outline-none focus:border-emerald-600"
        >
          <option value="">সকল ক্যাটাগরি</option>
          <option value="SSC">SSC</option>
          <option value="HSC">HSC</option>
          <option value="MEDICAL">Medical</option>
          <option value="UNIVERSITY">University</option>
        </select>

        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="p-2 border border-slate-300 rounded-lg bg-white text-slate-700 outline-none focus:border-emerald-600"
        >
          <option value="">সকল স্ট্যাটাস</option>
          <option value="DRAFT">খসড়া (DRAFT)</option>
          <option value="REVIEW">পর্যালোচনাধীন (REVIEW)</option>
          <option value="APPROVED">অনুমোদিত (APPROVED)</option>
          <option value="PUBLISHED">প্রকাশিত (PUBLISHED)</option>
          <option value="ARCHIVED">আর্কাইভড (ARCHIVED)</option>
        </select>

        {/* Question Type Filter */}
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="p-2 border border-slate-300 rounded-lg bg-white text-slate-700 outline-none focus:border-emerald-600"
        >
          <option value="">সকল ধরণ</option>
          <option value="MCQ">বহুনির্বাচনি (MCQ)</option>
          <option value="CQ">সৃজনশীল (CQ)</option>
        </select>
      </div>

      {/* Questions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-3">প্রশ্ন টেক্সট / উদ্দীপক</th>
              <th className="p-3">বিষয় ও অধ্যায়</th>
              <th className="p-3">ধরণ</th>
              <th className="p-3">বোর্ড ও সাল</th>
              <th className="p-3">স্ট্যাটাস</th>
              <th className="p-3 text-right">পদক্ষেপ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  প্রশ্নমালা লোড হচ্ছে...
                </td>
              </tr>
            ) : questions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  কোনো প্রশ্ন পাওয়া যায়নি।
                </td>
              </tr>
            ) : (
              questions.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50/60">
                  <td className="p-3 max-w-xs">
                    <p className="font-medium text-slate-900 line-clamp-2">
                      <MathText text={q.type === "CQ" ? q.stemBn || q.questionTextBn : q.questionTextBn} />
                    </p>
                    {q.isPremium && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                        PREMIUM
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-emerald-800 block">{q.subject?.nameBn}</span>
                    <span className="text-slate-500 text-[11px]">অধ্যায় {q.chapter?.chapterNum}</span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        q.type === "CQ"
                          ? "bg-purple-50 text-purple-800 border border-purple-200"
                          : "bg-blue-50 text-blue-800 border border-blue-200"
                      }`}
                    >
                      {q.type}
                    </span>
                  </td>
                  <td className="p-3">
                    {q.references && q.references.length > 0 ? (
                      <span className="text-slate-600 font-medium">
                        {`${q.references[0].board?.nameBn || "বোর্ড"} '${q.references[0].examYear}`}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        q.status === "PUBLISHED"
                          ? "bg-emerald-100 text-emerald-800"
                          : q.status === "APPROVED"
                          ? "bg-blue-100 text-blue-800"
                          : q.status === "REVIEW"
                          ? "bg-amber-100 text-amber-800"
                          : q.status === "ARCHIVED"
                          ? "bg-slate-200 text-slate-600"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {q.status}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1.5 shrink-0">
                    <button
                      onClick={() => setPreviewQuestion(q)}
                      className="p-1 rounded text-slate-500 hover:text-emerald-700 hover:bg-slate-100"
                      title="প্রিভিউ"
                    >
                      <Eye className="w-4 h-4 inline" />
                    </button>

                    {/* Review Actions */}
                    {q.status === "DRAFT" && (
                      <button
                        onClick={() => handleStatusChange(q.id, "REVIEW", "Submitted for review")}
                        className="px-2 py-1 rounded bg-amber-50 text-amber-800 hover:bg-amber-100 text-[11px] font-semibold"
                        title="রিভিউতে জমা দিন"
                      >
                        সাবমিট
                      </button>
                    )}
                    {q.status === "REVIEW" && (
                      <button
                        onClick={() => handleStatusChange(q.id, "APPROVED", "Approved by staff")}
                        className="px-2 py-1 rounded bg-blue-50 text-blue-800 hover:bg-blue-100 text-[11px] font-semibold"
                        title="অনুমোদন করুন"
                      >
                        অনুমোদন
                      </button>
                    )}
                    {q.status === "APPROVED" && (
                      <button
                        onClick={() => handleStatusChange(q.id, "PUBLISHED", "Published")}
                        className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-semibold"
                        title="প্রকাশ করুন"
                      >
                        প্রকাশ
                      </button>
                    )}
                    {q.status === "PUBLISHED" && (
                      <button
                        onClick={() => handleStatusChange(q.id, "DRAFT", "Unpublished to draft")}
                        className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-semibold"
                        title="অপ্রকাশিত করুন"
                      >
                        ড্রাফট
                      </button>
                    )}

                    <button
                      onClick={() => setAuditQuestion(q)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      title="অডিট হিস্ট্রি দেখুন"
                    >
                      <History className="w-4 h-4 inline" />
                    </button>

                    <button
                      onClick={() => handleArchive(q.id)}
                      className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      title="আর্কাইভ"
                    >
                      <Archive className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-xs text-slate-600 pt-2">
          <span>
            মোট {totalCount} টি প্রশ্ন (পৃষ্ঠা {page} / {totalPages})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-slate-300 rounded-lg disabled:opacity-40"
            >
              পূর্ববর্তী
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-slate-300 rounded-lg disabled:opacity-40"
            >
              পরবর্তী
            </button>
          </div>
        </div>
      )}

      {/* CREATE QUESTION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">নতুন প্রশ্ন তৈরি করুন</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Type Toggle: MCQ vs CQ */}
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-700">প্রশ্নের ধরণ:</span>
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="createType"
                    checked={createType === "MCQ"}
                    onChange={() => setCreateType("MCQ")}
                  />
                  <span>বহুনির্বাচনি (MCQ - ১ নম্বর)</span>
                </label>
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="createType"
                    checked={createType === "CQ"}
                    onChange={() => setCreateType("CQ")}
                  />
                  <span>সৃজনশীল (CQ - ১০ নম্বর [ক, খ, গ, ঘ])</span>
                </label>
              </div>

              {/* Category, Subject, Chapter, Board, Year */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ক্যাটাগরি</label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="SSC">SSC (৯ম-১০ম)</option>
                    <option value="HSC">HSC (১১শ-১২শ)</option>
                    <option value="MEDICAL">Medical Admission</option>
                    <option value="UNIVERSITY">University Admission</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">বিষয়</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => {
                      setSelectedSubjectId(e.target.value);
                      const sub = subjects.find((s) => s.id === e.target.value);
                      if (sub?.chapters?.length > 0) setSelectedChapterId(sub.chapters[0].id);
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameBn} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">অধ্যায়</label>
                  <select
                    value={selectedChapterId}
                    onChange={(e) => setSelectedChapterId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    {currentChapters.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        অধ্যায় {c.chapterNum}: {c.nameBn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Board and Year Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">বোর্ড পরীক্ষা (ঐচ্ছিক)</label>
                  <select
                    value={boardId}
                    onChange={(e) => setBoardId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="">কোনো বোর্ড নয়</option>
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameBn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">পরীক্ষার সাল</label>
                  <input
                    type="number"
                    value={examYear}
                    onChange={(e) => setExamYear(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">কাঠিন্য (Difficulty)</label>
                  <select
                    value={createDifficulty}
                    onChange={(e) => setCreateDifficulty(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="EASY">সহজ (EASY)</option>
                    <option value="MEDIUM">মাঝারি (MEDIUM)</option>
                    <option value="HARD">কঠিন (HARD)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">প্রিমিয়াম স্ট্যাটাস</label>
                  <select
                    value={createIsPremium ? "true" : "false"}
                    onChange={(e) => setCreateIsPremium(e.target.value === "true")}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="false">সবার জন্য উন্মুক্ত (FREE)</option>
                    <option value="true">প্রিমিয়াম মেম্বারশিপ প্রয়োজন</option>
                  </select>
                </div>
              </div>

              {/* CQ Stem (উদ্দীপক) if CQ */}
              {createType === "CQ" && (
                <div className="space-y-2 p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                  <label className="block font-bold text-amber-900">
                    উদ্দীপক (বাংলায়) - KaTeX গণিত সংকেত সমর্থিত:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={stemBn}
                    onChange={(e) => setStemBn(e.target.value)}
                    placeholder="উদ্দীপকের বিবরণ লিখুন (যেমন: $F = 10\text{ N}$ বল প্রয়োগে...)"
                    className="w-full p-2.5 border border-amber-300 rounded-lg outline-none bg-white"
                  />
                </div>
              )}

              {/* MCQ Question Text */}
              {createType === "MCQ" && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    প্রশ্ন টেক্সট (বাংলায়) - KaTeX সমর্থিত:
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={questionTextBn}
                    onChange={(e) => setQuestionTextBn(e.target.value)}
                    placeholder="প্রশ্ন লিখুন..."
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              )}

              {/* MCQ Options A, B, C, D */}
              {createType === "MCQ" && (
                <div className="space-y-2">
                  <label className="block font-bold text-slate-800">
                    অপশনসমূহ (সঠিক অপশনটিতে রেডিও টিক দিন):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {options.map((opt, idx) => (
                      <div
                        key={opt.optionKey}
                        className={`p-2 rounded-lg border flex items-center gap-2 ${
                          opt.isCorrect ? "border-emerald-500 bg-emerald-50/30" : "border-slate-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="correctOption"
                          checked={opt.isCorrect}
                          onChange={() => {
                            setOptions((prev) =>
                              prev.map((o) => ({ ...o, isCorrect: o.optionKey === opt.optionKey }))
                            );
                          }}
                        />
                        <span className="font-bold text-slate-700 w-4">{opt.optionKey}.</span>
                        <input
                          type="text"
                          required
                          value={opt.textBn}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOptions((prev) =>
                              prev.map((o) => (o.optionKey === opt.optionKey ? { ...o, textBn: val } : o))
                            );
                          }}
                          placeholder={`অপশন ${opt.optionKey} এর টেক্সট`}
                          className="flex-1 p-1.5 border border-slate-300 rounded text-xs outline-none bg-white"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <label className="block font-semibold text-slate-700 mb-1">বিস্তারিত ব্যাখ্যা (Explanation):</label>
                    <textarea
                      rows={2}
                      value={explanationBn}
                      onChange={(e) => setExplanationBn(e.target.value)}
                      placeholder="সঠিক উত্তরের যুক্তি ও সূত্র..."
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                    />
                  </div>
                </div>
              )}

              {/* CQ Subparts: ক, খ, গ, ঘ */}
              {createType === "CQ" && (
                <div className="space-y-3 pt-2">
                  <label className="block font-bold text-slate-800">
                    সৃজনশীল উপপ্রশ্নসমূহ (ক: ১, খ: ২, গ: ৩, ঘ: ৪ = ১০ নম্বর):
                  </label>
                  {subparts.map((sp, idx) => (
                    <div key={sp.partLabel} className="p-3 border border-slate-200 rounded-xl bg-slate-50/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-800">
                          উপপ্রশ্ন ({sp.partLabel}) - {sp.marks} নম্বর [{sp.markingGuidance}]
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        value={sp.questionTextBn}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSubparts((prev) =>
                            prev.map((p) => (p.partLabel === sp.partLabel ? { ...p, questionTextBn: val } : p))
                          );
                        }}
                        placeholder={`(${sp.partLabel}) এর প্রশ্ন টেক্সট...`}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none"
                      />
                      <textarea
                        rows={2}
                        required
                        value={sp.solutionBn}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSubparts((prev) =>
                            prev.map((p) => (p.partLabel === sp.partLabel ? { ...p, solutionBn: val } : p))
                          );
                        }}
                        placeholder={`(${sp.partLabel}) এর আদর্শ সমাধান ও উত্তর...`}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* References */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">পাঠ্যবই রেফারেন্স (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={textbookRef}
                    onChange={(e) => setTextbookRef(e.target.value)}
                    placeholder="যেমন: NCTB পদার্থবিজ্ঞান ১ম পত্র পৃষ্ঠা ৪২"
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">শিক্ষকের টিপস (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={teacherTipsBn}
                    onChange={(e) => setTeacherTipsBn(e.target.value)}
                    placeholder="যেমন: একক পরিবর্তনে সতর্ক থাকুন"
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {submitting ? "সংরক্ষণ হচ্ছে..." : "প্রশ্ন সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-sm">প্রশ্ন প্রিভিউ (প্রশাসনিক মোড)</span>
              <button onClick={() => setPreviewQuestion(null)} className="text-slate-400 font-bold text-xl">
                &times;
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded">
                  {previewQuestion.category}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded">
                  {previewQuestion.type}
                </span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-semibold rounded">
                  {previewQuestion.difficulty}
                </span>
              </div>

              {previewQuestion.type === "CQ" && previewQuestion.stemBn && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-slate-900 font-medium whitespace-pre-line">
                  <span className="font-bold block text-amber-900 text-xs mb-1">উদ্দীপক:</span>
                  <MathText text={previewQuestion.stemBn} />
                </div>
              )}

              <div className="text-base font-semibold text-slate-900">
                <MathText text={previewQuestion.questionTextBn} />
              </div>

              {previewQuestion.type === "MCQ" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {previewQuestion.options.map((opt) => (
                    <div
                      key={opt.optionKey}
                      className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                        opt.isCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold" : "border-slate-200"
                      }`}
                    >
                      <span>{opt.optionKey}.</span>
                      <MathText text={opt.textBn} />
                    </div>
                  ))}
                </div>
              )}

              {previewQuestion.type === "CQ" && previewQuestion.subparts && (
                <div className="space-y-2 text-xs">
                  {previewQuestion.subparts.map((sp) => (
                    <div key={sp.partLabel} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                      <div className="font-bold text-emerald-900">
                        ({sp.partLabel}) [{sp.marks} নম্বর]: <MathText text={sp.questionTextBn} />
                      </div>
                      <div className="text-slate-700">
                        <strong>সমাধান: </strong>
                        <MathText text={sp.solutionBn} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {previewQuestion.answer && (
                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                  <span className="font-bold text-emerald-800">সঠিক উত্তর: {previewQuestion.answer.correctKey}</span>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                    <MathText text={previewQuestion.answer.explanationBn} />
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AUDIT HISTORY MODAL */}
      {auditQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-600" />
                <span>রিভিশন ও অডিট ইতিহাস</span>
              </span>
              <button onClick={() => setAuditQuestion(null)} className="text-slate-400 font-bold text-xl">
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p className="font-semibold text-slate-800">প্রশ্ন আইডি: {auditQuestion.id}</p>
                <p className="text-slate-500">বর্তমান স্ট্যাটাস: {auditQuestion.status}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-700">পর্যালোচনা ও স্ট্যাটাস লগ:</h4>
                {auditQuestion.reviews && auditQuestion.reviews.length > 0 ? (
                  auditQuestion.reviews.map((r) => (
                    <div key={r.id} className="p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                      <div className="flex justify-between items-center text-slate-700 font-medium">
                        <span>স্ট্যাটাস: {r.status}</span>
                        <span className="text-[10px] text-slate-400">{new Date(r.reviewedAt).toLocaleString()}</span>
                      </div>
                      {r.comments && <p className="text-slate-600 italic">মন্তব্য: {r.comments}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400">কোনো রিভিউ হিস্ট্রি নেই।</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
