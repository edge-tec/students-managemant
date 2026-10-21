"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  Archive,
  Layers,
  Clock,
  Award,
  Calendar,
  X,
  ChevronRight,
  Filter,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Link2,
  MessageCircle,
} from "lucide-react";
import { MathText } from "@/components/ui/MathText";

interface ExamListItem {
  id: string;
  titleBn: string;
  titleEn: string;
  category: string;
  examType: string;
  status: string;
  durationMinutes: number;
  totalMarks: number;
  passMarks?: number | null;
  negativeMarks: number;
  questionCount: number;
  version: number;
  startDate?: string | null;
  endDate?: string | null;
  accessType: string;
  releasePolicy: string;
  subject?: { nameBn: string; nameEn: string } | null;
  _count?: {
    examQuestions: number;
    sessions: number;
    sections: number;
  };
}

interface QuestionPickerItem {
  id: string;
  questionTextBn: string;
  questionTextEn?: string | null;
  type: string;
  marks: number;
  difficulty: string;
  subject?: { nameBn: string };
  chapter?: { nameBn: string; chapterNum: number };
}

interface SectionInput {
  titleBn: string;
  titleEn: string;
  durationMinutes?: number;
  totalMarks?: number;
}

export function ExamManager() {
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal / Wizard
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  // Form state
  const [titleBn, setTitleBn] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descriptionBn, setDescriptionBn] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [category, setCategory] = useState("HSC");
  const [examType, setExamType] = useState("MODEL_TEST");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [totalMarks, setTotalMarks] = useState(30);
  const [passMarks, setPassMarks] = useState(12);
  const [negativeMarks, setNegativeMarks] = useState(0.25);
  const [questionCount, setQuestionCount] = useState(30);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeOptions, setRandomizeOptions] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [accessType, setAccessType] = useState("FREE");
  const [priceBdt, setPriceBdt] = useState(0);
  const [releasePolicy, setReleasePolicy] = useState("IMMEDIATE");
  const [instructionsBn, setInstructionsBn] = useState("");
  const [instructionsEn, setInstructionsEn] = useState("");
  const [sections, setSections] = useState<SectionInput[]>([]);

  // Question Picker state
  const [availableQuestions, setAvailableQuestions] = useState<QuestionPickerItem[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [questionSearch, setQuestionSearch] = useState("");
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Preview Modal
  const [previewExam, setPreviewExam] = useState<any | null>(null);

  // Share & Link Modal state
  const [shareExamModal, setShareExamModal] = useState<{
    id: string;
    titleBn: string;
    titleEn?: string | null;
    status: string;
    category?: string;
    totalMarks?: number;
    durationMinutes?: number;
    isNew?: boolean;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getExamFullUrl = (examId: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/exams/${examId}`;
    }
    return `/exams/${examId}`;
  };

  const handleCopyExamLink = (examId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = getExamFullUrl(examId);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
    } else {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedId(examId);
    setTimeout(() => {
      setCopiedId((current) => (current === examId ? null : current));
    }, 2500);
  };

  const loadExams = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (filterCategory !== "ALL") params.append("category", filterCategory);
      if (filterStatus !== "ALL") params.append("status", filterStatus);
      if (searchQuery.trim()) params.append("q", searchQuery.trim());

      const res = await fetch(`/api/v1/admin/exams?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load exams");
      const data = await res.json();
      setExams(data.exams || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStatus, searchQuery]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  // Load questions for picker
  const loadQuestionBank = async () => {
    setLoadingQuestions(true);
    try {
      const res = await fetch(`/api/v1/admin/questions?limit=50&category=${category}`);
      if (!res.ok) throw new Error("Failed to load question bank");
      const data = await res.json();
      setAvailableQuestions(data.questions || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingExamId(null);
    setTitleBn("");
    setTitleEn("");
    setDescriptionBn("");
    setDescriptionEn("");
    setCategory("HSC");
    setExamType("MODEL_TEST");
    setDurationMinutes(30);
    setTotalMarks(30);
    setPassMarks(12);
    setNegativeMarks(0.25);
    setQuestionCount(30);
    setRandomizeQuestions(true);
    setRandomizeOptions(true);
    setStartDate("");
    setEndDate("");
    setMaxAttempts(1);
    setAccessType("FREE");
    setPriceBdt(0);
    setReleasePolicy("IMMEDIATE");
    setInstructionsBn("সব প্রশ্নের উত্তর দেওয়া আবশ্যক। প্রতিটি ভুল উত্তরের জন্য নম্বর কাটা হবে।");
    setInstructionsEn("All questions are compulsory. Negative marking applies for wrong answers.");
    setSections([]);
    setSelectedQuestionIds([]);
    setWizardStep(1);
    setIsModalOpen(true);
    loadQuestionBank();
  };

  const handleAddSection = () => {
    setSections([
      ...sections,
      {
        titleBn: `বিভাগ ${String.fromCharCode(65 + sections.length)}`,
        titleEn: `Section ${String.fromCharCode(65 + sections.length)}`,
        durationMinutes: 15,
        totalMarks: 15,
      },
    ]);
  };

  const handleRemoveSection = (idx: number) => {
    setSections(sections.filter((_, i) => i !== idx));
  };

  const toggleSelectQuestion = (qId: string) => {
    if (selectedQuestionIds.includes(qId)) {
      setSelectedQuestionIds(selectedQuestionIds.filter((id) => id !== qId));
    } else {
      setSelectedQuestionIds([...selectedQuestionIds, qId]);
    }
  };

  const handleSubmitExam = async () => {
    if (!titleBn.trim() || !titleEn.trim()) {
      setErrorMsg("Title in Bengali and English is required");
      return;
    }
    if (durationMinutes <= 0 || totalMarks <= 0) {
      setErrorMsg("Duration and total marks must be greater than zero");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload: any = {
        titleBn,
        titleEn,
        descriptionBn: descriptionBn || undefined,
        descriptionEn: descriptionEn || undefined,
        category,
        examType,
        durationMinutes,
        totalMarks,
        passMarks: passMarks || undefined,
        negativeMarks,
        questionCount: selectedQuestionIds.length > 0 ? selectedQuestionIds.length : questionCount,
        randomizeQuestions,
        randomizeOptions,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        maxAttempts,
        accessType,
        priceBdt: accessType === "PAID" ? priceBdt : undefined,
        releasePolicy,
        instructionsBn: instructionsBn || undefined,
        instructionsEn: instructionsEn || undefined,
        sections: sections.length > 0 ? sections : undefined,
        questionIds: selectedQuestionIds.length > 0 ? selectedQuestionIds : undefined,
      };

      const res = await fetch("/api/v1/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create exam");
      }
      setSuccessMsg("পরীক্ষা সফলভাবে তৈরি হয়েছে! নিচের লিংকটি শিক্ষার্থীদের সাথে শেয়ার করতে পারেন।");
      setIsModalOpen(false);
      loadExams();

      if (data?.exam) {
        setShareExamModal({
          id: data.exam.id,
          titleBn: data.exam.titleBn,
          titleEn: data.exam.titleEn,
          status: data.exam.status || "DRAFT",
          category: data.exam.category,
          totalMarks: data.exam.totalMarks,
          durationMinutes: data.exam.durationMinutes,
          isNew: true,
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishExam = async (examId: string) => {
    if (!confirm("Are you sure you want to publish this examination?")) return;
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to publish exam");
      }
      setSuccessMsg("Exam published successfully!");
      loadExams();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handlePublishFromShareModal = async (examId: string) => {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to publish exam");
      }
      setSuccessMsg("পরীক্ষা সফলভাবে পাবলিশ করা হয়েছে!");
      setShareExamModal((prev) => (prev && prev.id === examId ? { ...prev, status: "PUBLISHED" } : prev));
      loadExams();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleArchiveExam = async (examId: string) => {
    if (!confirm("Are you sure you want to archive this examination?")) return;
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to archive exam");
      }
      setSuccessMsg("Exam archived successfully!");
      loadExams();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handlePreviewExam = async (examId: string) => {
    try {
      const res = await fetch(`/api/v1/admin/exams/${examId}`);
      if (!res.ok) throw new Error("Failed to load exam details");
      const data = await res.json();
      setPreviewExam(data.exam);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            পরীক্ষা ও টেস্ট ম্যানেজমেন্ট (Examination Engine)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            মডেল টেস্ট, চ্যাপ্টার টেস্ট, বোর্ড প্রশ্ন ও ভর্তি পরীক্ষার কনফিগারেশন এবং প্রশ্ন ব্যাংক সংযুক্তিকরণ।
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          নতুন পরীক্ষা তৈরি করুন (New Exam)
        </button>
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

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-slate-300 rounded-lg text-sm px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Categories</option>
            <option value="HSC">HSC</option>
            <option value="SSC">SSC</option>
            <option value="MEDICAL">Medical Admission</option>
            <option value="UNIVERSITY">University Admission</option>
            <option value="MODEL_TEST">Model Test</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-300 rounded-lg text-sm px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="REVIEW">Review</option>
            <option value="PUBLISHED">Published</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <button
          onClick={loadExams}
          className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Exam Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium">পরীক্ষার তালিকা লোড হচ্ছে...</div>
        ) : exams.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            কোনো পরীক্ষা পাওয়া যায়নি। নতুন পরীক্ষা তৈরি করতে &quot;নতুন পরীক্ষা তৈরি করুন&quot; বাটনে চাপুন।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Title / নাম</th>
                  <th className="py-3.5 px-4">Category & Type</th>
                  <th className="py-3.5 px-4">Marks & Time</th>
                  <th className="py-3.5 px-4">Questions</th>
                  <th className="py-3.5 px-4">Attempts</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {exams.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{ex.titleBn}</div>
                      <div className="text-xs text-slate-500">{ex.titleEn}</div>
                      {((ex._count?.sections ?? 0) > 0) && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          <Layers className="w-3 h-3" /> {ex._count?.sections} Sections
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-700">{ex.category}</div>
                      <div className="text-xs text-slate-500">{ex.examType.replace(/_/g, " ")}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">
                        {ex.totalMarks} Marks
                        {ex.passMarks ? ` (Pass: ${ex.passMarks})` : ""}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {ex.durationMinutes} min • Neg: -{ex.negativeMarks}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {ex._count?.examQuestions ?? ex.questionCount ?? 0} Qs
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700">{ex._count?.sessions ?? 0}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          ex.status === "PUBLISHED"
                            ? "bg-emerald-100 text-emerald-800"
                            : ex.status === "SCHEDULED"
                            ? "bg-blue-100 text-blue-800"
                            : ex.status === "REVIEW"
                            ? "bg-amber-100 text-amber-800"
                            : ex.status === "ARCHIVED"
                            ? "bg-slate-200 text-slate-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {ex.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Copy / Share Link Modal */}
                      <button
                        onClick={() =>
                          setShareExamModal({
                            id: ex.id,
                            titleBn: ex.titleBn,
                            titleEn: ex.titleEn,
                            status: ex.status,
                            category: ex.category,
                            totalMarks: ex.totalMarks,
                            durationMinutes: ex.durationMinutes,
                            isNew: false,
                          })
                        }
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          copiedId === ex.id
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                        }`}
                        title="পরীক্ষার লিংক কপি ও শেয়ার করুন"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>লিংক</span>
                      </button>

                      {/* Quick 1-click Copy */}
                      <button
                        onClick={(e) => handleCopyExamLink(ex.id, e)}
                        className={`p-1.5 rounded transition ${
                          copiedId === ex.id
                            ? "bg-emerald-100 text-emerald-800"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                        }`}
                        title={copiedId === ex.id ? "লিংক কপি হয়েছে!" : "সরাসরি লিংক কপি করুন"}
                      >
                        {copiedId === ex.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => handlePreviewExam(ex.id)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {ex.status !== "PUBLISHED" && ex.status !== "ARCHIVED" && (
                        <button
                          onClick={() => handlePublishExam(ex.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium"
                        >
                          Publish
                        </button>
                      )}
                      {ex.status !== "ARCHIVED" && (
                        <button
                          onClick={() => handleArchiveExam(ex.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Wizard Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">
                  {editingExamId ? "পরীক্ষা সম্পাদনা (Edit Exam)" : "নতুন পরীক্ষা তৈরি (Create Examination)"}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 3, 4].map((step) => (
                    <button
                      key={step}
                      onClick={() => setWizardStep(step)}
                      className={`text-xs px-2.5 py-1 rounded font-medium transition ${
                        wizardStep === step
                          ? "bg-emerald-600 text-white"
                          : wizardStep > step
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      Step {step}: {step === 1 ? "মৌলিক তথ্য" : step === 2 ? "মার্কস ও সময়" : step === 3 ? "শিডিউল ও নীতি" : "প্রশ্ন নির্বাচন"}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Title (বাংলা) *
                      </label>
                      <input
                        type="text"
                        value={titleBn}
                        onChange={(e) => setTitleBn(e.target.value)}
                        placeholder="উদাঃ এইচএসসি পদার্থবিজ্ঞান ১ম পত্র মডেল টেস্ট ০১"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Title (English) *
                      </label>
                      <input
                        type="text"
                        value={titleEn}
                        onChange={(e) => setTitleEn(e.target.value)}
                        placeholder="e.g. HSC Physics 1st Paper Model Test 01"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Category (বিভাগ/লেভেল)
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        <option value="HSC">HSC</option>
                        <option value="SSC">SSC</option>
                        <option value="MEDICAL">Medical Admission</option>
                        <option value="DENTAL">Dental Admission</option>
                        <option value="UNIVERSITY">University Admission</option>
                        <option value="MODEL_TEST">Model Test</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Exam Type (পরীক্ষার ধরন)
                      </label>
                      <select
                        value={examType}
                        onChange={(e) => setExamType(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        <option value="MODEL_TEST">Model Test</option>
                        <option value="CHAPTER_TEST">Chapter Test</option>
                        <option value="SUBJECT_TEST">Subject Test</option>
                        <option value="FULL_SYLLABUS">Full Syllabus Test</option>
                        <option value="PRACTICE">Practice Exam</option>
                        <option value="ADMISSION">Admission Test</option>
                        <option value="MEDICAL">Medical Special Test</option>
                        <option value="UNIVERSITY">University Test</option>
                        <option value="CUSTOM">Custom Exam</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Description (বাংলা)
                    </label>
                    <textarea
                      rows={2}
                      value={descriptionBn}
                      onChange={(e) => setDescriptionBn(e.target.value)}
                      placeholder="পরীক্ষার সংক্ষিপ্ত বিবরণ..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Duration (Min) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Total Marks *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={totalMarks}
                        onChange={(e) => setTotalMarks(parseFloat(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Pass Marks
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={passMarks}
                        onChange={(e) => setPassMarks(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Negative Mark
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        value={negativeMarks}
                        onChange={(e) => setNegativeMarks(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={randomizeQuestions}
                        onChange={(e) => setRandomizeQuestions(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      Randomize Question Order
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={randomizeOptions}
                        onChange={(e) => setRandomizeOptions(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      Randomize Option Order
                    </label>
                  </div>

                  {/* Section Builder (Optional) */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Exam Sections (ঐচ্ছিক বিভাগ)
                      </span>
                      <button
                        type="button"
                        onClick={handleAddSection}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> বিভাগ যোগ করুন (Add Section)
                      </button>
                    </div>
                    {sections.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">
                        কোনো পৃথক সেকশন নির্ধারিত নেই। পুরো পরীক্ষাটি একক সেকশন হিসেবে চলবে।
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {sections.map((sec, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3 text-xs"
                          >
                            <input
                              type="text"
                              value={sec.titleBn}
                              onChange={(e) => {
                                const next = [...sections];
                                next[sIdx].titleBn = e.target.value;
                                setSections(next);
                              }}
                              placeholder="বিভাগ নাম (বাংলা)"
                              className="px-2 py-1 border border-slate-300 rounded w-1/3"
                            />
                            <input
                              type="text"
                              value={sec.titleEn}
                              onChange={(e) => {
                                const next = [...sections];
                                next[sIdx].titleEn = e.target.value;
                                setSections(next);
                              }}
                              placeholder="Section Name (En)"
                              className="px-2 py-1 border border-slate-300 rounded w-1/3"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveSection(sIdx)}
                              className="text-rose-500 hover:text-rose-700 ml-auto"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Start Date & Time (পরীক্ষা শুরুর সময়)
                      </label>
                      <input
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        End Date & Time (পরীক্ষা সমাপ্তির সময়)
                      </label>
                      <input
                        type="datetime-local"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Max Attempts (সর্বোচ্চ চেষ্টা)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={maxAttempts}
                        onChange={(e) => setMaxAttempts(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Access Type (অ্যাক্সেস)
                      </label>
                      <select
                        value={accessType}
                        onChange={(e) => setAccessType(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        <option value="FREE">Free</option>
                        <option value="SUBSCRIPTION_ONLY">Subscription Only</option>
                        <option value="PAID">Paid (One-time)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Result Release Policy
                      </label>
                      <select
                        value={releasePolicy}
                        onChange={(e) => setReleasePolicy(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        <option value="IMMEDIATE">Immediate (তাৎক্ষণিক)</option>
                        <option value="AFTER_EXAM_WINDOW">After Exam Window (পরীক্ষার উইন্ডো শেষে)</option>
                        <option value="MANUAL">Manual Admin Release (ম্যানুয়াল প্রকাশ)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Instructions (বাংলা)
                    </label>
                    <textarea
                      rows={2}
                      value={instructionsBn}
                      onChange={(e) => setInstructionsBn(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">
                        Question Bank থেকে প্রশ্ন যুক্ত করুন
                      </h4>
                      <p className="text-xs text-slate-500">
                        নির্বাচিত: {selectedQuestionIds.length} টি প্রশ্ন (অনুমোদিত টার্গেট: {questionCount} টি)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={loadQuestionBank}
                      className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
                    >
                      Reload Questions
                    </button>
                  </div>

                  {loadingQuestions ? (
                    <div className="p-8 text-center text-slate-500 text-sm">প্রশ্ন ব্যাংক লোড হচ্ছে...</div>
                  ) : availableQuestions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      নির্বাচিত ক্যাটাগরির কোনো প্রশ্ন পাওয়া যায়নি।
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-2">
                      {availableQuestions.map((q) => {
                        const isSelected = selectedQuestionIds.includes(q.id);
                        return (
                          <div
                            key={q.id}
                            onClick={() => toggleSelectQuestion(q.id)}
                            className={`p-3 rounded-lg border text-sm cursor-pointer transition flex items-start gap-3 ${
                              isSelected
                                ? "bg-emerald-50 border-emerald-300"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="mt-1 w-4 h-4 text-emerald-600 rounded"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-slate-800">
                                <MathText text={q.questionTextBn} />
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                <span>{q.subject?.nameBn}</span>
                                <span>• {q.type}</span>
                                <span>• Marks: {q.marks}</span>
                                <span>• {q.difficulty}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl flex items-center justify-between">
              <div>
                {wizardStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-white"
                  >
                    Previous
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {wizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep + 1)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitExam}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {submitting ? "সংরক্ষণ হচ্ছে..." : "পরীক্ষা চূড়ান্ত করুন (Save & Finish)"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{previewExam.titleBn}</h3>
                <p className="text-xs text-slate-500">{previewExam.titleEn}</p>
              </div>
              <button onClick={() => setPreviewExam(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
              <div>
                <span className="text-slate-500 block">Category:</span>
                <span className="font-semibold text-slate-800">{previewExam.category}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Duration:</span>
                <span className="font-semibold text-slate-800">{previewExam.durationMinutes} mins</span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Marks:</span>
                <span className="font-semibold text-slate-800">{previewExam.totalMarks}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Negative Mark:</span>
                <span className="font-semibold text-slate-800">-{previewExam.negativeMarks}</span>
              </div>
            </div>

            {/* Share Link Banner */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="truncate flex items-center gap-1.5 font-mono text-emerald-950 min-w-0">
                <Link2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span className="truncate">{getExamFullUrl(previewExam.id)}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyExamLink(previewExam.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition ${
                    copiedId === previewExam.id
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-700 hover:bg-emerald-800 text-white"
                  }`}
                >
                  {copiedId === previewExam.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>লিংক কপি</span>
                    </>
                  )}
                </button>
                <a
                  href={`/exams/${previewExam.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition"
                  title="নতুন ট্যাবে লিংক ওপেন করুন"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                সংযুক্ত প্রশ্ন তালিকা ({previewExam.examQuestions?.length || 0} টি)
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {previewExam.examQuestions?.map((eq: any, idx: number) => (
                  <div key={eq.id} className="p-2.5 bg-slate-50 rounded border text-xs">
                    <span className="font-bold text-slate-600 mr-2">{idx + 1}.</span>
                    <span className="text-slate-800 font-medium">{eq.question?.questionTextBn}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewExam(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share / Copy Exam Link Modal */}
      {shareExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2.5 rounded-xl ${
                    shareExamModal.isNew
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {shareExamModal.isNew
                      ? "পরীক্ষা তৈরি সম্পন্ন! লিংক শেয়ার করুন"
                      : "পরীক্ষার লিংক ও শেয়ার অপশন"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {shareExamModal.isNew
                      ? "পরীক্ষা সফলভাবে তৈরি হয়েছে। নিচের লিংকটি কপি করে শিক্ষার্থীদের সাথে শেয়ার করুন।"
                      : "শিক্ষার্থীরা এই লিংকে প্রবেশ করে পরীক্ষায় সরাসরি অংশ নিতে পারবে।"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShareExamModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Exam info badge */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{shareExamModal.titleBn}</span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    shareExamModal.status === "PUBLISHED"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {shareExamModal.status === "PUBLISHED" ? "পাবলিশড (সক্রিয়)" : "খসড়া (DRAFT)"}
                </span>
              </div>
              {shareExamModal.titleEn && (
                <div className="text-xs text-slate-500">{shareExamModal.titleEn}</div>
              )}
            </div>

            {/* Warning if Draft */}
            {shareExamModal.status !== "PUBLISHED" && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <p className="font-semibold text-amber-900">
                    সতর্কতা: পরীক্ষাটি বর্তমানে খসড়া (DRAFT) অবস্থায় আছে।
                  </p>
                  <p className="text-amber-700 leading-relaxed">
                    শিক্ষার্থীরা যাতে লিংকে প্রবেশ করে পরীক্ষা শুরু করতে পারে, তার জন্য পরীক্ষাটি &quot;Publish&quot; করা প্রয়োজন।
                  </p>
                  <button
                    type="button"
                    onClick={() => handlePublishFromShareModal(shareExamModal.id)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>এখনই পাবলিশ করুন (Publish Now)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Direct Link Box */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                পরীক্ষার সরাসরি শেয়ার লিংক (Direct Exam Link)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getExamFullUrl(shareExamModal.id)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-800 outline-none focus:border-emerald-600 select-all"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={() => handleCopyExamLink(shareExamModal.id)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition flex-shrink-0 shadow-xs ${
                    copiedId === shareExamModal.id
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 hover:bg-black text-white"
                  }`}
                >
                  {copiedId === shareExamModal.id ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>কপি হয়েছে!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>কপি করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Share Shortcuts */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">
                সরাসরি শেয়ার ও লিংক পরীক্ষা
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `🎓 *${shareExamModal.titleBn}*\nঅনলাইন পরীক্ষায় অংশ নিতে নিচের লিংকে প্রবেশ করুন:\n👉 ${getExamFullUrl(shareExamModal.id)}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp-এ শেয়ার</span>
                </a>

                <a
                  href={`/exams/${shareExamModal.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold transition"
                >
                  <ExternalLink className="w-4 h-4 text-slate-600" />
                  <span>লিংক ওপেন করুন</span>
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShareExamModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
