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
  Flag,
  Check,
  X,
  RefreshCw,
  Clock,
  User,
  MessageSquare,
  Pencil,
  Trash2,
  Edit2,
  Layers,
  FolderPlus,
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

interface QuestionReportItem {
  id: string;
  questionId: string;
  reason: "WRONG_ANSWER" | "TYPO_OR_GRAMMAR" | "INCOMPLETE_QUESTION" | "IMAGE_OR_FORMULA_BROKEN" | "OUT_OF_SYLLABUS" | "OTHER";
  description: string | null;
  status: "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED";
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string | null;
  } | null;
  question: {
    id: string;
    category: string;
    type: "MCQ" | "CQ" | "SHORT";
    difficulty: string;
    status: string;
    isPremium: boolean;
    marks: number;
    negativeMarks: number;
    questionTextBn: string;
    questionTextEn?: string | null;
    stemBn?: string | null;
    subject: { id: string; nameBn: string; nameEn?: string; code: string };
    chapter: { id: string; nameBn: string; chapterNum: number };
    options?: { optionKey: string; textBn: string; textEn?: string | null; isCorrect: boolean }[];
    answer?: { correctKey: string; explanationBn: string; explanationEn?: string | null } | null;
    subparts?: { partLabel: string; questionTextBn: string; marks: number; solutionBn: string }[];
  };
}

const REPORT_REASONS: Record<
  string,
  { bn: string; en: string; badgeClass: string }
> = {
  WRONG_ANSWER: {
    bn: "ভুল উত্তর",
    en: "Wrong Answer",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
  TYPO_OR_GRAMMAR: {
    bn: "টাইপো / ব্যাকরণগত ভুল",
    en: "Typo or Grammar",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  INCOMPLETE_QUESTION: {
    bn: "অসম্পূর্ণ প্রশ্ন",
    en: "Incomplete Question",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
  },
  IMAGE_OR_FORMULA_BROKEN: {
    bn: "চিত্র বা সূত্র অস্পষ্ট / নষ্ট",
    en: "Broken Image or Formula",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  OUT_OF_SYLLABUS: {
    bn: "সিলেবাস বহির্ভূত",
    en: "Out of Syllabus",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  OTHER: {
    bn: "অন্যান্য সমস্যা",
    en: "Other Issue",
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
  },
};

const REPORT_STATUS_BADGES: Record<
  string,
  { bn: string; en: string; className: string }
> = {
  PENDING: {
    bn: "অমীমাংসিত",
    en: "PENDING",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  REVIEWED: {
    bn: "পর্যালোচিত",
    en: "REVIEWED",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  RESOLVED: {
    bn: "সমাধানকৃত",
    en: "RESOLVED",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  DISMISSED: {
    bn: "বাতিলকৃত",
    en: "DISMISSED",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export function QuestionManager() {
  const [questions, setQuestions] = useState<QuestionAdminItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Sub-Tab State
  const [activeSubTab, setActiveSubTab] = useState<"questions" | "reports">("questions");

  // Reports State
  const [reports, setReports] = useState<QuestionReportItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportTotalCount, setReportTotalCount] = useState(0);
  const [reportTotalPages, setReportTotalPages] = useState(1);
  const [reportPage, setReportPage] = useState(1);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);

  // Report Filters
  const [reportStatusFilter, setReportStatusFilter] = useState("");
  const [reportReasonFilter, setReportReasonFilter] = useState("");
  const [reportSearch, setReportSearch] = useState("");

  // Report Resolution Modal State
  const [selectedReport, setSelectedReport] = useState<QuestionReportItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolvingReport, setResolvingReport] = useState(false);

  // Question Filters
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");

  // Curriculum dropdown data
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [boards, setBoards] = useState<any[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionAdminItem | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<QuestionAdminItem | null>(null);
  const [auditQuestion, setAuditQuestion] = useState<QuestionAdminItem | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Quick Inline Add / Edit states for Curriculum
  const [showQuickAddClass, setShowQuickAddClass] = useState(false);
  const [quickClassCode, setQuickClassCode] = useState("");
  const [quickClassNameBn, setQuickClassNameBn] = useState("");
  const [quickClassNameEn, setQuickClassNameEn] = useState("");
  const [quickClassOrder, setQuickClassOrder] = useState<number>(1);

  const [showQuickAddSubject, setShowQuickAddSubject] = useState(false);
  const [showQuickEditSubject, setShowQuickEditSubject] = useState(false);
  const [quickSubjectCode, setQuickSubjectCode] = useState("");
  const [quickSubjectNameBn, setQuickSubjectNameBn] = useState("");
  const [quickSubjectNameEn, setQuickSubjectNameEn] = useState("");
  const [quickSubjectCategory, setQuickSubjectCategory] = useState("HSC");
  const [quickSubjectClassId, setQuickSubjectClassId] = useState("");

  const [showQuickAddChapter, setShowQuickAddChapter] = useState(false);
  const [showQuickEditChapter, setShowQuickEditChapter] = useState(false);
  const [quickChapterNum, setQuickChapterNum] = useState<number>(1);
  const [quickChapterNameBn, setQuickChapterNameBn] = useState("");
  const [quickChapterNameEn, setQuickChapterNameEn] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);

  // Create / Edit Form State
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
  const fetchCurriculumMetadata = useCallback(async (selectSubId?: string, selectChapId?: string) => {
    try {
      const res = await fetch("/api/v1/curriculum");
      const data = await res.json();
      setClasses(data.classes || []);
      setSubjects(data.subjects || []);
      setBoards(data.boards || []);
      if (selectSubId) {
        setSelectedSubjectId(selectSubId);
        const sub = (data.subjects || []).find((s: any) => s.id === selectSubId);
        if (selectChapId) {
          setSelectedChapterId(selectChapId);
        } else if (sub?.chapters?.length > 0) {
          setSelectedChapterId(sub.chapters[0].id);
        }
      } else if (data.subjects?.length > 0) {
        setSelectedSubjectId((prev) => prev || data.subjects[0].id);
        if (data.subjects[0].chapters?.length > 0) {
          setSelectedChapterId((prev) => prev || data.subjects[0].chapters[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch curriculum metadata:", err);
    }
  }, []);

  useEffect(() => {
    fetchCurriculumMetadata();
  }, [fetchCurriculumMetadata]);

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

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    const params = new URLSearchParams();
    if (reportStatusFilter) params.set("status", reportStatusFilter);
    if (reportReasonFilter) params.set("reason", reportReasonFilter);
    if (reportSearch.trim()) params.set("search", reportSearch.trim());
    params.set("page", String(reportPage));
    params.set("limit", "15");

    try {
      const res = await fetch(`/api/v1/admin/questions/reports?${params.toString()}`);
      const data = await res.json();
      setReports(data.reports || []);
      setReportTotalCount(data.pagination?.totalCount || 0);
      setReportTotalPages(data.pagination?.totalPages || 1);
      setPendingReportsCount(data.pagination?.pendingCount || 0);
    } catch (err) {
      console.error("Failed to load question reports:", err);
    } finally {
      setReportsLoading(false);
    }
  }, [reportStatusFilter, reportReasonFilter, reportSearch, reportPage]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleResolveReport = async (reportId: string, newStatus: string, notes?: string) => {
    setResolvingReport(true);
    try {
      const res = await fetch("/api/v1/admin/questions/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          status: newStatus,
          adminNotes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg({ type: "error", text: data.error || "রিপোর্ট আপডেট ব্যর্থ হয়েছে।" });
      } else {
        setAlertMsg({
          type: "success",
          text: `রিপোর্ট স্ট্যাটাস সফলভাবে '${newStatus}' এ পরিবর্তন করা হয়েছে।`,
        });
        setSelectedReport(null);
        loadReports();
      }
    } catch (err: any) {
      setAlertMsg({ type: "error", text: err.message });
    } finally {
      setResolvingReport(false);
    }
  };

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

  // Quick Actions: Create Class
  const handleQuickCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClassCode.trim() || !quickClassNameBn.trim()) {
      setAlertMsg({ type: "error", text: "শ্রেণির কোড ও বাংলা নাম আবশ্যক।" });
      return;
    }
    setQuickLoading(true);
    try {
      const res = await fetch("/api/v1/admin/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "class",
          code: quickClassCode.trim().toUpperCase(),
          nameBn: quickClassNameBn.trim(),
          nameEn: quickClassNameEn.trim() || quickClassNameBn.trim(),
          orderIndex: Number(quickClassOrder) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg({ type: "error", text: data.error || "শ্রেণি তৈরি ব্যর্থ হয়েছে।" });
      } else {
        setAlertMsg({ type: "success", text: "নতুন শ্রেণি সফলভাবে তৈরি হয়েছে।" });
        setShowQuickAddClass(false);
        setQuickClassCode("");
        setQuickClassNameBn("");
        setQuickClassNameEn("");
        await fetchCurriculumMetadata();
      }
    } catch (err: any) {
      setAlertMsg({ type: "error", text: err.message });
    } finally {
      setQuickLoading(false);
    }
  };

  // Quick Actions: Create Subject
  const handleQuickCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSubjectCode.trim() || !quickSubjectNameBn.trim()) {
      setAlertMsg({ type: "error", text: "বিষয়ের কোড ও বাংলা নাম আবশ্যক।" });
      return;
    }
    setQuickLoading(true);
    try {
      const res = await fetch("/api/v1/admin/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "subject",
          code: quickSubjectCode.trim().toUpperCase(),
          nameBn: quickSubjectNameBn.trim(),
          nameEn: quickSubjectNameEn.trim() || quickSubjectNameBn.trim(),
          category: quickSubjectCategory || createCategory || "HSC",
          classId: quickSubjectClassId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg({ type: "error", text: data.error || "বিষয় তৈরি ব্যর্থ হয়েছে।" });
      } else {
        setAlertMsg({ type: "success", text: "নতুন বিষয় সফলভাবে তৈরি হয়েছে।" });
        setShowQuickAddSubject(false);
        setQuickSubjectCode("");
        setQuickSubjectNameBn("");
        setQuickSubjectNameEn("");
        const newSubId = data.item?.id;
        await fetchCurriculumMetadata(newSubId);
      }
    } catch (err: any) {
      setAlertMsg({ type: "error", text: err.message });
    } finally {
      setQuickLoading(false);
    }
  };

  // Quick Actions: Edit Selected Subject
  const handleQuickEditSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !quickSubjectNameBn.trim()) return;
    setQuickLoading(true);
    try {
      const res = await fetch("/api/v1/admin/curriculum", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "subject",
          id: selectedSubjectId,
          code: quickSubjectCode.trim().toUpperCase(),
          nameBn: quickSubjectNameBn.trim(),
          nameEn: quickSubjectNameEn.trim() || quickSubjectNameBn.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg({ type: "error", text: data.error || "বিষয় আপডেট ব্যর্থ হয়েছে।" });
      } else {
        setAlertMsg({ type: "success", text: "বিষয় সফলভাবে আপডেট হয়েছে।" });
        setShowQuickEditSubject(false);
        await fetchCurriculumMetadata(selectedSubjectId, selectedChapterId);
      }
    } catch (err: any) {
      setAlertMsg({ type: "error", text: err.message });
    } finally {
      setQuickLoading(false);
    }
  };

  // Quick Actions: Create Chapter
  const handleQuickCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !quickChapterNameBn.trim()) {
      setAlertMsg({ type: "error", text: "অধ্যায়ের নাম আবশ্যক।" });
      return;
    }
    setQuickLoading(true);
    try {
      const res = await fetch("/api/v1/admin/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "chapter",
          subjectId: selectedSubjectId,
          chapterNum: Number(quickChapterNum) || 1,
          nameBn: quickChapterNameBn.trim(),
          nameEn: quickChapterNameEn.trim() || quickChapterNameBn.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg({ type: "error", text: data.error || "অধ্যায় তৈরি ব্যর্থ হয়েছে।" });
      } else {
        setAlertMsg({ type: "success", text: "নতুন অধ্যায় সফলভাবে তৈরি হয়েছে।" });
        setShowQuickAddChapter(false);
        setQuickChapterNameBn("");
        setQuickChapterNameEn("");
        const newChapId = data.item?.id;
        await fetchCurriculumMetadata(selectedSubjectId, newChapId);
      }
    } catch (err: any) {
      setAlertMsg({ type: "error", text: err.message });
    } finally {
      setQuickLoading(false);
    }
  };

  // Quick Actions: Edit Selected Chapter
  const handleQuickEditChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapterId || !quickChapterNameBn.trim()) return;
    setQuickLoading(true);
    try {
      const res = await fetch("/api/v1/admin/curriculum", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "chapter",
          id: selectedChapterId,
          chapterNum: Number(quickChapterNum) || 1,
          nameBn: quickChapterNameBn.trim(),
          nameEn: quickChapterNameEn.trim() || quickChapterNameBn.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg({ type: "error", text: data.error || "অধ্যায় আপডেট ব্যর্থ হয়েছে।" });
      } else {
        setAlertMsg({ type: "success", text: "অধ্যায় সফলভাবে আপডেট হয়েছে।" });
        setShowQuickEditChapter(false);
        await fetchCurriculumMetadata(selectedSubjectId, selectedChapterId);
      }
    } catch (err: any) {
      setAlertMsg({ type: "error", text: err.message });
    } finally {
      setQuickLoading(false);
    }
  };

  // Option Handlers: Add and Remove Options
  const handleAddOption = () => {
    const keys = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const nextKey = keys[options.length] || `OPT_${options.length + 1}`;
    setOptions((prev) => [
      ...prev,
      { optionKey: nextKey, textBn: "", textEn: "", isCorrect: false },
    ]);
  };

  const handleRemoveOption = (keyToRemove: string) => {
    if (options.length <= 2) {
      setAlertMsg({ type: "error", text: "কমপক্ষে ২টি অপশন থাকতে হবে।" });
      return;
    }
    setOptions((prev) => {
      const filtered = prev.filter((o) => o.optionKey !== keyToRemove);
      const hasCorrect = filtered.some((o) => o.isCorrect);
      if (!hasCorrect && filtered.length > 0) {
        filtered[0].isCorrect = true;
      }
      return filtered;
    });
  };

  // Open Create Question Modal
  const handleOpenCreateQuestion = () => {
    setEditingQuestion(null);
    setQuestionTextBn("");
    setQuestionTextEn("");
    setStemBn("");
    setStemEn("");
    setTextbookRef("");
    setTeacherTipsBn("");
    setExplanationBn("");
    setOptions([
      { optionKey: "A", textBn: "", textEn: "", isCorrect: true },
      { optionKey: "B", textBn: "", textEn: "", isCorrect: false },
      { optionKey: "C", textBn: "", textEn: "", isCorrect: false },
      { optionKey: "D", textBn: "", textEn: "", isCorrect: false },
    ]);
    setShowCreateModal(true);
  };

  // Open Edit Question Modal
  const handleOpenEditQuestion = (q: QuestionAdminItem) => {
    setEditingQuestion(q);
    setCreateType(q.type === "CQ" ? "CQ" : "MCQ");
    setCreateCategory(q.category);
    const matchedSub = subjects.find(
      (s) => s.id === (q as any).subjectId || s.code === q.subject?.code
    );
    if (matchedSub) {
      setSelectedSubjectId(matchedSub.id);
      const matchedChap = matchedSub.chapters?.find(
        (c: any) => c.id === (q as any).chapterId || c.chapterNum === q.chapter?.chapterNum
      );
      if (matchedChap) {
        setSelectedChapterId(matchedChap.id);
      } else if (matchedSub.chapters?.length > 0) {
        setSelectedChapterId(matchedSub.chapters[0].id);
      }
    }
    setCreateDifficulty(q.difficulty);
    setCreateStatus(q.status);
    setCreateIsPremium(q.isPremium);
    setQuestionTextBn(q.questionTextBn || "");
    setQuestionTextEn(q.questionTextEn || "");
    setStemBn(q.stemBn || "");
    setTextbookRef(q.textbookRef || "");
    setTeacherTipsBn((q as any).teacherTipsBn || "");
    setExplanationBn(q.answer?.explanationBn || "");

    if (q.references && q.references.length > 0) {
      setExamYear(q.references[0].examYear || 2023);
      setBoardId((q.references[0] as any).boardId || "");
    }

    if (q.options && q.options.length > 0) {
      setOptions(
        q.options.map((opt) => ({
          optionKey: opt.optionKey,
          textBn: opt.textBn,
          textEn: (opt as any).textEn || "",
          isCorrect: q.answer?.correctKey === opt.optionKey || opt.isCorrect,
        }))
      );
    } else {
      setOptions([
        { optionKey: "A", textBn: "", textEn: "", isCorrect: true },
        { optionKey: "B", textBn: "", textEn: "", isCorrect: false },
        { optionKey: "C", textBn: "", textEn: "", isCorrect: false },
        { optionKey: "D", textBn: "", textEn: "", isCorrect: false },
      ]);
    }

    if (q.subparts && q.subparts.length > 0) {
      setSubparts(
        q.subparts.map((sp) => ({
          partLabel: sp.partLabel,
          questionTextBn: sp.questionTextBn,
          questionTextEn: (sp as any).questionTextEn || "",
          marks: sp.marks,
          solutionBn: sp.solutionBn,
          markingGuidance: (sp as any).markingGuidance || "",
        }))
      );
    }

    setShowCreateModal(true);
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
      const url = editingQuestion
        ? `/api/v1/admin/questions/${editingQuestion.id}`
        : "/api/v1/admin/questions";
      const method = editingQuestion ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg({
          type: "error",
          text: data.error || (editingQuestion ? "প্রশ্ন আপডেট ব্যর্থ হয়েছে।" : "প্রশ্ন তৈরি ব্যর্থ হয়েছে।"),
        });
      } else {
        setAlertMsg({
          type: "success",
          text: editingQuestion
            ? "প্রশ্ন ও অপশনসমূহ সফলভাবে আপডেট করা হয়েছে।"
            : "নতুন প্রশ্ন সফলভাবে তৈরি হয়েছে।",
        });
        setShowCreateModal(false);
        setEditingQuestion(null);
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
          onClick={handleOpenCreateQuestion}
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

      {/* Sub-Tabs: Question Bank vs Reported Questions */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab("questions")}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeSubTab === "questions"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileQuestion className="w-4 h-4" />
          <span>প্রশ্ন ব্যাংক তালিকা (Question Bank)</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 font-medium">
            {totalCount}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab("reports");
            loadReports();
          }}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeSubTab === "reports"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>রিপোর্টকৃত প্রশ্নাবলি (Reported Questions)</span>
          {pendingReportsCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white animate-pulse">
              {pendingReportsCount} অমীমাংসিত
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600 font-medium">
              {reportTotalCount}
            </span>
          )}
        </button>
      </div>

      {/* SUB-TAB 1: QUESTION BANK LISTING */}
      {activeSubTab === "questions" && (
        <>
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

                    <button
                      onClick={() => handleOpenEditQuestion(q)}
                      className="p-1 rounded text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition"
                      title="প্রশ্ন ও অপশনসমূহ সম্পাদনা করুন"
                    >
                      <Pencil className="w-4 h-4 inline" />
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
    </>
  )}

  {/* SUB-TAB 2: REPORTED QUESTIONS LISTING */}
  {activeSubTab === "reports" && (
    <div className="space-y-4">
      {/* Reported Questions Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={reportSearch}
            onChange={(e) => {
              setReportSearch(e.target.value);
              setReportPage(1);
            }}
            placeholder="প্রশ্ন, বিবরণ, বা শিক্ষার্থীর ইমেইল অনুসন্ধান..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 text-xs"
          />
        </div>

        {/* Reason Filter */}
        <select
          value={reportReasonFilter}
          onChange={(e) => {
            setReportReasonFilter(e.target.value);
            setReportPage(1);
          }}
          className="p-2 border border-slate-300 rounded-lg bg-white text-slate-700 outline-none focus:border-emerald-600 text-xs"
        >
          <option value="">সকল কারণ (All Reasons)</option>
          <option value="WRONG_ANSWER">ভুল উত্তর (Wrong Answer)</option>
          <option value="TYPO_OR_GRAMMAR">টাইপো / বানান ভুল (Typo)</option>
          <option value="INCOMPLETE_QUESTION">অসম্পূর্ণ প্রশ্ন (Incomplete)</option>
          <option value="IMAGE_OR_FORMULA_BROKEN">চিত্র / সূত্র নষ্ট (Media/Formula)</option>
          <option value="OUT_OF_SYLLABUS">সিলেবাস বহির্ভূত (Out of Syllabus)</option>
          <option value="OTHER">অন্যান্য সমস্যা (Other)</option>
        </select>

        {/* Status Filter */}
        <select
          value={reportStatusFilter}
          onChange={(e) => {
            setReportStatusFilter(e.target.value);
            setReportPage(1);
          }}
          className="p-2 border border-slate-300 rounded-lg bg-white text-slate-700 outline-none focus:border-emerald-600 text-xs"
        >
          <option value="">সকল স্ট্যাটাস (All Status)</option>
          <option value="PENDING">অমীমাংসিত (PENDING)</option>
          <option value="REVIEWED">পর্যালোচিত (REVIEWED)</option>
          <option value="RESOLVED">সমাধানকৃত (RESOLVED)</option>
          <option value="DISMISSED">বাতিলকৃত (DISMISSED)</option>
        </select>

        {/* Refresh Button */}
        <button
          onClick={() => loadReports()}
          disabled={reportsLoading}
          className="p-2 border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 font-medium transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${reportsLoading ? "animate-spin" : ""}`} />
          <span>রিফ্রেশ</span>
        </button>
      </div>

      {/* Reported Questions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-3">প্রশ্ন / উদ্দীপক</th>
              <th className="p-3">রিপোর্টের কারণ</th>
              <th className="p-3">শিক্ষার্থীর বিবরণ</th>
              <th className="p-3">রিপোর্টকারী ও তারিখ</th>
              <th className="p-3">অবস্থা ও নোট</th>
              <th className="p-3 text-right">পদক্ষেপ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {reportsLoading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  রিপোর্টকৃত প্রশ্নাবলি লোড হচ্ছে...
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  কোনো রিপোর্ট পাওয়া যায়নি।
                </td>
              </tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  {/* Question Column */}
                  <td className="p-3 max-w-xs">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-semibold text-emerald-800 text-[11px]">
                        {r.question?.subject?.nameBn}
                      </span>
                      <span className="text-slate-400 text-[10px]">•</span>
                      <span className="text-slate-500 text-[11px]">
                        অধ্যায় {r.question?.chapter?.chapterNum}
                      </span>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold ml-1">
                        {r.question?.type}
                      </span>
                    </div>
                    <p className="font-medium text-slate-900 line-clamp-2">
                      <MathText
                        text={
                          r.question?.type === "CQ"
                            ? r.question?.stemBn || r.question?.questionTextBn
                            : r.question?.questionTextBn
                        }
                      />
                    </p>
                  </td>

                  {/* Reason Column */}
                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        REPORT_REASONS[r.reason]?.badgeClass || "bg-slate-50 text-slate-700"
                      }`}
                    >
                      {REPORT_REASONS[r.reason]?.bn || r.reason}
                    </span>
                  </td>

                  {/* Description Column */}
                  <td className="p-3 max-w-xs">
                    {r.description ? (
                      <p className="text-slate-700 italic line-clamp-2">"{r.description}"</p>
                    ) : (
                      <span className="text-slate-400 italic">কোনো বিবরণ নেই</span>
                    )}
                  </td>

                  {/* Reporter & Date Column */}
                  <td className="p-3 whitespace-nowrap">
                    <span className="font-medium text-slate-900 block">
                      {r.user?.fullName || "বেনামী শিক্ষার্থী"}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {r.user?.email || "-"}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {new Date(r.createdAt).toLocaleDateString("bn-BD", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </td>

                  {/* Status & Notes Column */}
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold border inline-block ${
                        REPORT_STATUS_BADGES[r.status]?.className || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {REPORT_STATUS_BADGES[r.status]?.bn || r.status}
                    </span>
                    {r.adminNotes && (
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-1 font-medium">
                        নোট: {r.adminNotes}
                      </p>
                    )}
                  </td>

                  {/* Actions Column */}
                  <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setSelectedReport(r);
                        setResolutionNotes(r.adminNotes || "");
                      }}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-semibold transition"
                      title="রিপোর্ট পর্যালোচনা ও সমাধান"
                    >
                      পর্যালোচনা
                    </button>

                    <button
                      onClick={() => setPreviewQuestion(r.question as any)}
                      className="p-1 rounded text-slate-500 hover:text-emerald-700 hover:bg-slate-100 inline-block align-middle"
                      title="প্রশ্ন প্রিভিউ"
                    >
                      <Eye className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reports Pagination */}
      {reportTotalPages > 1 && (
        <div className="flex justify-between items-center text-xs text-slate-600 pt-2">
          <span>
            মোট {reportTotalCount} টি রিপোর্ট (পৃষ্ঠা {reportPage} / {reportTotalPages})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReportPage((p) => Math.max(1, p - 1))}
              disabled={reportPage === 1}
              className="px-3 py-1.5 border border-slate-300 rounded-lg disabled:opacity-40"
            >
              পূর্ববর্তী
            </button>
            <button
              onClick={() => setReportPage((p) => Math.min(reportTotalPages, p + 1))}
              disabled={reportPage === reportTotalPages}
              className="px-3 py-1.5 border border-slate-300 rounded-lg disabled:opacity-40"
            >
              পরবর্তী
            </button>
          </div>
        </div>
      )}
    </div>
  )}

      {/* CREATE QUESTION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-emerald-600" />
                <span>{editingQuestion ? "প্রশ্ন ও অপশনসমূহ সম্পাদনা করুন" : "নতুন প্রশ্ন তৈরি করুন"}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingQuestion(null);
                }}
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

              {/* Category, Subject, Chapter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Category / Class */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">ক্যাটাগরি / শ্রেণি</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddClass(!showQuickAddClass)}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-0.5"
                      title="নতুন অ্যাকাডেমিক শ্রেণি যোগ করুন"
                    >
                      <Plus className="w-3 h-3" /> শ্রেণি যোগ
                    </button>
                  </div>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                  >
                    <option value="HSC">HSC (১১শ-১২শ)</option>
                    <option value="SSC">SSC (৯ম-১০ম)</option>
                    <option value="MEDICAL">Medical Admission</option>
                    <option value="UNIVERSITY">University Admission</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.code}>
                        {cls.nameBn} ({cls.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Subject */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">বিষয়</label>
                    <div className="flex items-center gap-1.5">
                      {selectedSubjectId && (
                        <button
                          type="button"
                          onClick={() => {
                            const sub = subjects.find((s) => s.id === selectedSubjectId);
                            if (sub) {
                              setQuickSubjectCode(sub.code);
                              setQuickSubjectNameBn(sub.nameBn);
                              setQuickSubjectNameEn(sub.nameEn || "");
                            }
                            setShowQuickEditSubject(!showQuickEditSubject);
                            setShowQuickAddSubject(false);
                          }}
                          className="text-[11px] text-slate-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5"
                          title="নির্বাচিত বিষয় সম্পাদনা করুন"
                        >
                          <Pencil className="w-2.5 h-2.5" /> এডিট
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setQuickSubjectCode("");
                          setQuickSubjectNameBn("");
                          setQuickSubjectNameEn("");
                          setShowQuickAddSubject(!showQuickAddSubject);
                          setShowQuickEditSubject(false);
                        }}
                        className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-0.5"
                        title="নতুন বিষয় যোগ করুন"
                      >
                        <Plus className="w-3 h-3" /> বিষয় যোগ
                      </button>
                    </div>
                  </div>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => {
                      setSelectedSubjectId(e.target.value);
                      const sub = subjects.find((s) => s.id === e.target.value);
                      if (sub?.chapters?.length > 0) setSelectedChapterId(sub.chapters[0].id);
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameBn} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Chapter */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">অধ্যায়</label>
                    <div className="flex items-center gap-1.5">
                      {selectedChapterId && (
                        <button
                          type="button"
                          onClick={() => {
                            const chap = currentChapters.find((c: any) => c.id === selectedChapterId);
                            if (chap) {
                              setQuickChapterNum(chap.chapterNum);
                              setQuickChapterNameBn(chap.nameBn);
                              setQuickChapterNameEn(chap.nameEn || "");
                            }
                            setShowQuickEditChapter(!showQuickEditChapter);
                            setShowQuickAddChapter(false);
                          }}
                          className="text-[11px] text-slate-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5"
                          title="নির্বাচিত অধ্যায় সম্পাদনা করুন"
                        >
                          <Pencil className="w-2.5 h-2.5" /> এডিট
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const nextNum = (currentChapters?.length || 0) + 1;
                          setQuickChapterNum(nextNum);
                          setQuickChapterNameBn("");
                          setQuickChapterNameEn("");
                          setShowQuickAddChapter(!showQuickAddChapter);
                          setShowQuickEditChapter(false);
                        }}
                        className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-0.5"
                        title="নতুন অধ্যায় যোগ করুন"
                      >
                        <Plus className="w-3 h-3" /> অধ্যায় যোগ
                      </button>
                    </div>
                  </div>
                  <select
                    value={selectedChapterId}
                    onChange={(e) => setSelectedChapterId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                  >
                    {currentChapters.length === 0 ? (
                      <option value="">কোনো অধ্যায় নেই (নতুন যোগ করুন)</option>
                    ) : (
                      currentChapters.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          অধ্যায় {c.chapterNum}: {c.nameBn}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Inline Quick Add Class Drawer */}
                {showQuickAddClass && (
                  <div className="col-span-full p-3 bg-emerald-50/80 border border-emerald-300 rounded-xl space-y-2">
                    <div className="flex items-center justify-between font-bold text-emerald-900 text-xs">
                      <span>নতুন অ্যাকাডেমিক শ্রেণি / ক্যাটাগরি তৈরি করুন</span>
                      <button type="button" onClick={() => setShowQuickAddClass(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder="কোড (যেমন: CLASS_8, ALIM)"
                        value={quickClassCode}
                        onChange={(e) => setQuickClassCode(e.target.value)}
                        className="p-1.5 border border-slate-300 rounded bg-white font-mono uppercase"
                      />
                      <input
                        type="text"
                        placeholder="নাম বাংলায় (যেমন: ৮ম শ্রেণি)"
                        value={quickClassNameBn}
                        onChange={(e) => setQuickClassNameBn(e.target.value)}
                        className="p-1.5 border border-slate-300 rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="নাম ইংরেজিতে (যেমন: Class 8)"
                        value={quickClassNameEn}
                        onChange={(e) => setQuickClassNameEn(e.target.value)}
                        className="p-1.5 border border-slate-300 rounded bg-white"
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          placeholder="ক্রমিক"
                          value={quickClassOrder}
                          onChange={(e) => setQuickClassOrder(Number(e.target.value))}
                          className="w-16 p-1.5 border border-slate-300 rounded bg-white"
                        />
                        <button
                          type="button"
                          disabled={quickLoading}
                          onClick={handleQuickCreateClass}
                          className="flex-1 bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {quickLoading ? "..." : "সংরক্ষণ"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inline Quick Add Subject Drawer */}
                {showQuickAddSubject && (
                  <div className="col-span-full p-3 bg-blue-50/80 border border-blue-300 rounded-xl space-y-2">
                    <div className="flex items-center justify-between font-bold text-blue-900 text-xs">
                      <span>নতুন বিষয় যোগ করুন</span>
                      <button type="button" onClick={() => setShowQuickAddSubject(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder="কোড (যেমন: ICT_1, BAN_2)"
                        value={quickSubjectCode}
                        onChange={(e) => setQuickSubjectCode(e.target.value)}
                        className="p-1.5 border border-slate-300 rounded bg-white font-mono uppercase"
                      />
                      <input
                        type="text"
                        placeholder="নাম বাংলায় (যেমন: তথ্য ও যোগাযোগ প্রযুক্তি)"
                        value={quickSubjectNameBn}
                        onChange={(e) => setQuickSubjectNameBn(e.target.value)}
                        className="p-1.5 border border-slate-300 rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="নাম ইংরেজিতে (ঐচ্ছিক)"
                        value={quickSubjectNameEn}
                        onChange={(e) => setQuickSubjectNameEn(e.target.value)}
                        className="p-1.5 border border-slate-300 rounded bg-white"
                      />
                      <div className="flex gap-1.5">
                        <select
                          value={quickSubjectClassId}
                          onChange={(e) => setQuickSubjectClassId(e.target.value)}
                          className="flex-1 p-1.5 border border-slate-300 rounded bg-white text-xs"
                        >
                          <option value="">শ্রেণি নির্বাচন করুন (ঐচ্ছিক)</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.nameBn}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={quickLoading}
                          onClick={handleQuickCreateSubject}
                          className="px-3 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
                        >
                          {quickLoading ? "..." : "সংরক্ষণ"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inline Quick Edit Subject Drawer */}
                {showQuickEditSubject && (
                  <div className="col-span-full p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-800 text-xs">
                      <span>নির্বাচিত বিষয় সম্পাদনা করুন</span>
                      <button type="button" onClick={() => setShowQuickEditSubject(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="কোড"
                        value={quickSubjectCode}
                        onChange={(e) => setQuickSubjectCode(e.target.value)}
                        className="p-1.5 border border-slate-300 rounded bg-white font-mono uppercase"
                      />
                      <input
                        type="text"
                        placeholder="নাম বাংলায়"
                        value={quickSubjectNameBn}
                        onChange={(e) => setQuickSubjectNameBn(e.target.value)}
                        className="p-1.5 border border-slate-300 rounded bg-white"
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="নাম ইংরেজিতে"
                          value={quickSubjectNameEn}
                          onChange={(e) => setQuickSubjectNameEn(e.target.value)}
                          className="flex-1 p-1.5 border border-slate-300 rounded bg-white"
                        />
                        <button
                          type="button"
                          disabled={quickLoading}
                          onClick={handleQuickEditSubject}
                          className="px-3 bg-slate-700 text-white rounded font-semibold hover:bg-slate-800 disabled:opacity-50"
                        >
                          {quickLoading ? "..." : "আপডেট"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inline Quick Add Chapter Drawer */}
                {showQuickAddChapter && (
                  <div className="col-span-full p-3 bg-amber-50/80 border border-amber-300 rounded-xl space-y-2">
                    <div className="flex items-center justify-between font-bold text-amber-900 text-xs">
                      <span>নতুন অধ্যায় যোগ করুন (বিষয়: {currentSubjectObj?.nameBn || "নির্বাচিত বিষয়"})</span>
                      <button type="button" onClick={() => setShowQuickAddChapter(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="number"
                        placeholder="অধ্যায় নং"
                        value={quickChapterNum}
                        onChange={(e) => setQuickChapterNum(Number(e.target.value))}
                        className="p-1.5 border border-slate-300 rounded bg-white font-mono"
                      />
                      <input
                        type="text"
                        placeholder="অধ্যায়ের নাম বাংলায়"
                        value={quickChapterNameBn}
                        onChange={(e) => setQuickChapterNameBn(e.target.value)}
                        className="p-1.5 border border-slate-300 rounded bg-white sm:col-span-2"
                      />
                      <button
                        type="button"
                        disabled={quickLoading}
                        onClick={handleQuickCreateChapter}
                        className="bg-amber-600 text-white rounded font-semibold hover:bg-amber-700 disabled:opacity-50"
                      >
                        {quickLoading ? "..." : "অধ্যায় সংরক্ষণ"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Quick Edit Chapter Drawer */}
                {showQuickEditChapter && (
                  <div className="col-span-full p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-800 text-xs">
                      <span>নির্বাচিত অধ্যায় সম্পাদনা করুন</span>
                      <button type="button" onClick={() => setShowQuickEditChapter(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="number"
                        placeholder="অধ্যায় নং"
                        value={quickChapterNum}
                        onChange={(e) => setQuickChapterNum(Number(e.target.value))}
                        className="p-1.5 border border-slate-300 rounded bg-white font-mono"
                      />
                      <input
                        type="text"
                        placeholder="অধ্যায়ের নাম বাংলায়"
                        value={quickChapterNameBn}
                        onChange={(e) => setQuickChapterNameBn(e.target.value)}
                        className="p-1.5 border border-slate-300 rounded bg-white sm:col-span-2"
                      />
                      <button
                        type="button"
                        disabled={quickLoading}
                        onClick={handleQuickEditChapter}
                        className="bg-slate-700 text-white rounded font-semibold hover:bg-slate-800 disabled:opacity-50"
                      >
                        {quickLoading ? "..." : "অধ্যায় আপডেট"}
                      </button>
                    </div>
                  </div>
                )}
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

              {/* MCQ Dynamic Options with Add & Delete Option buttons */}
              {createType === "MCQ" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-800">
                      অপশনসমূহ (সঠিক অপশনটিতে রেডিও টিক দিন):
                    </label>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>নতুন অপশন যোগ করুন</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {options.map((opt) => (
                      <div
                        key={opt.optionKey}
                        className={`p-2 rounded-xl border flex items-center gap-2 transition ${
                          opt.isCorrect
                            ? "border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500"
                            : "border-slate-200 hover:border-slate-300 bg-white"
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
                          className="w-4 h-4 text-emerald-600 accent-emerald-600 cursor-pointer shrink-0"
                          title="সঠিক উত্তর হিসেবে চিহ্নিত করুন"
                        />
                        <span className="font-bold text-slate-700 w-5 shrink-0">{opt.optionKey}.</span>
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
                          className="flex-1 p-1.5 border border-slate-300 rounded-lg text-xs outline-none bg-white focus:border-emerald-600"
                        />
                        {options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(opt.optionKey)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                            title="অপশনটি মুছুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
                  {subparts.map((sp) => (
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
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingQuestion(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {submitting ? "সংরক্ষণ হচ্ছে..." : editingQuestion ? "আপডেট সংরক্ষণ করুন" : "প্রশ্ন সংরক্ষণ করুন"}
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

      {/* REPORT REVIEW & RESOLUTION MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  প্রশ্ন রিপোর্ট পর্যালোচনা ও সমাধান
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Status & Reason Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">বর্তমান অবস্থা:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold border ${
                    REPORT_STATUS_BADGES[selectedReport.status]?.className || "bg-slate-100"
                  }`}
                >
                  {REPORT_STATUS_BADGES[selectedReport.status]?.bn || selectedReport.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">রিপোর্টের কারণ:</span>
                <span
                  className={`px-2.5 py-0.5 rounded font-semibold border ${
                    REPORT_REASONS[selectedReport.reason]?.badgeClass || "bg-slate-100"
                  }`}
                >
                  {REPORT_REASONS[selectedReport.reason]?.bn} ({REPORT_REASONS[selectedReport.reason]?.en})
                </span>
              </div>
            </div>

            {/* Question Details Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">
                    {selectedReport.question?.subject?.nameBn}
                  </span>
                  <span className="text-slate-600 font-medium">
                    অধ্যায় {selectedReport.question?.chapter?.chapterNum}: {selectedReport.question?.chapter?.nameBn}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded border border-blue-200">
                    {selectedReport.question?.type}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewQuestion(selectedReport.question as any)}
                  className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 hover:underline"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>সম্পূর্ণ প্রিভিউ</span>
                </button>
              </div>

              {selectedReport.question?.type === "CQ" && selectedReport.question?.stemBn && (
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-slate-800 font-medium whitespace-pre-line">
                  <span className="font-bold text-amber-900 block mb-0.5">উদ্দীপক:</span>
                  <MathText text={selectedReport.question.stemBn} />
                </div>
              )}

              <div className="text-sm font-semibold text-slate-900">
                <MathText text={selectedReport.question?.questionTextBn || ""} />
              </div>

              {/* Options if MCQ */}
              {selectedReport.question?.options && selectedReport.question.options.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {selectedReport.question.options.map((opt) => (
                    <div
                      key={opt.optionKey}
                      className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                        opt.isCorrect
                          ? "border-emerald-500 bg-emerald-50/90 text-emerald-900 font-bold"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-slate-200 text-slate-800 shrink-0">
                        {opt.optionKey}
                      </span>
                      <MathText text={opt.textBn} />
                      {opt.isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* CQ Subparts if CQ */}
              {selectedReport.question?.subparts && selectedReport.question.subparts.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {selectedReport.question.subparts.map((sp) => (
                    <div key={sp.partLabel} className="p-2 rounded bg-white border border-slate-200 space-y-0.5">
                      <div className="font-semibold text-slate-900">
                        ({sp.partLabel}) [{sp.marks} নম্বর]: <MathText text={sp.questionTextBn} />
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        <strong>সমাধান: </strong>
                        <MathText text={sp.solutionBn} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Answer & Explanation */}
              {selectedReport.question?.answer && (
                <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 text-xs space-y-1">
                  <span className="font-bold text-emerald-800">
                    সঠিক উত্তর: অপশন {selectedReport.question.answer.correctKey}
                  </span>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                    <MathText text={selectedReport.question.answer.explanationBn} />
                  </p>
                </div>
              )}
            </div>

            {/* Student Report Details Card */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-2">
                <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                  <User className="w-3.5 h-3.5 text-amber-700" />
                  <span>রিপোর্টকারী: </span>
                  <strong className="text-slate-900">{selectedReport.user?.fullName || "বেনামী শিক্ষার্থী"}</strong>
                  {selectedReport.user?.email && (
                    <span className="text-slate-500">({selectedReport.user.email})</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(selectedReport.createdAt).toLocaleString("bn-BD")}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-amber-900 block mb-1">শিক্ষার্থীর সমস্যা বিবরণী:</span>
                <p className="p-2.5 bg-white rounded-lg border border-amber-200 text-slate-800 leading-relaxed italic">
                  {selectedReport.description || "কোনো অতিরিক্ত বিবরণ প্রদান করা হয়নি।"}
                </p>
              </div>
            </div>

            {/* Reviewer Resolution Form */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  প্রশাসনিক সমাধান নোট / পর্যালোচকের মন্তব্য:
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="যেমন: অপশন ও ব্যাখ্যা যাচাই করে সংশোধন করা হয়েছে / প্রশ্ন ও সঠিক উত্তর নির্ভুল রয়েছে।"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold transition"
                >
                  বন্ধ করুন
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={resolvingReport}
                    onClick={() => handleResolveReport(selectedReport.id, "REVIEWED", resolutionNotes)}
                    className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>পর্যালোচনাধীন রাখুন</span>
                  </button>

                  <button
                    type="button"
                    disabled={resolvingReport}
                    onClick={() => handleResolveReport(selectedReport.id, "DISMISSED", resolutionNotes)}
                    className="px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>রিপোর্ট বাতিল (Dismiss)</span>
                  </button>

                  <button
                    type="button"
                    disabled={resolvingReport}
                    onClick={() => handleResolveReport(selectedReport.id, "RESOLVED", resolutionNotes)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{resolvingReport ? "সংরক্ষণ হচ্ছে..." : "সমাধান সম্পন্ন (Resolve)"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
