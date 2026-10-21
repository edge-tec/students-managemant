"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { MathText } from "@/components/ui/MathText";
import {
  Search,
  Filter,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ArrowRight,
  Layers,
  GraduationCap,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  RotateCcw,
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
  marks: number;
  solutionBn: string;
}

interface QuestionItem {
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
  isBookmarked?: boolean;
  options: QuestionOption[];
  subparts?: QuestionSubpart[];
  answer?: { correctKey: string; explanationBn: string; explanationEn?: string | null } | null;
  subject: { nameBn: string; nameEn: string; code: string };
  paper?: { nameBn: string; paperNumber: number } | null;
  chapter: { nameBn: string; nameEn: string; chapterNum: number };
  references: { examYear: number; examSessionName?: string | null; board?: { nameBn: string } | null }[];
}

interface CurriculumSubject {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  category: string;
  papers: { id: string; paperNumber: number; nameBn: string }[];
  chapters: { id: string; chapterNum: number; nameBn: string }[];
}

interface ExaminationBoard {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
}

function QuestionBankContent() {
  const { locale, t, formatNumber } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedSolutions, setExpandedSolutions] = useState<Record<string, boolean>>({});

  // Curriculum dropdown state
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [boards, setBoards] = useState<ExaminationBoard[]>([]);

  // Filter States
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [subjectId, setSubjectId] = useState(searchParams.get("subjectId") || "");
  const [paperId, setPaperId] = useState(searchParams.get("paperId") || "");
  const [paperNumber, setPaperNumber] = useState(searchParams.get("paperNumber") || "");
  const [chapterId, setChapterId] = useState(searchParams.get("chapterId") || "");
  const [boardId, setBoardId] = useState(searchParams.get("boardId") || "");
  const [year, setYear] = useState(searchParams.get("year") || "");
  const [difficulty, setDifficulty] = useState(searchParams.get("difficulty") || "");
  const [type, setType] = useState(searchParams.get("type") || "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  // Check if ANY filter option is currently selected
  // On default page (all filters empty/default), no questions are shown.
  // When user filters ANY option (category, subject, paper, chapter, board, year, difficulty, type, or search),
  // questions matching that filter are displayed.
  const hasActiveFilter = Boolean(
    category ||
    subjectId ||
    paperId ||
    paperNumber ||
    chapterId ||
    boardId ||
    year ||
    difficulty ||
    type ||
    searchQuery.trim()
  );

  // Load curriculum metadata for dropdowns
  useEffect(() => {
    fetch("/api/v1/curriculum")
      .then((res) => res.json())
      .then((data) => {
        setSubjects(data.subjects || []);
        setBoards(data.boards || []);
      })
      .catch((err) => console.error("Curriculum load error:", err));
  }, []);

  // Filtered subjects based on active category
  const filteredSubjects = subjects.filter((s) => !category || s.category === category);
  const currentSubject = subjects.find((s) => s.id === subjectId);

  // Available papers
  const availablePapers = currentSubject?.papers || [];

  const loadQuestions = useCallback(() => {
    if (!hasActiveFilter) {
      setQuestions([]);
      setTotalCount(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (subjectId) params.set("subjectId", subjectId);
    if (paperId) params.set("paperId", paperId);
    if (paperNumber) params.set("paperNumber", paperNumber);
    if (chapterId) params.set("chapterId", chapterId);
    if (boardId) params.set("boardId", boardId);
    if (year) params.set("year", year);
    if (difficulty) params.set("difficulty", difficulty);
    if (type) params.set("type", type);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    params.set("page", String(page));
    params.set("limit", "10");

    fetch(`/api/v1/questions?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data.questions || []);
        setTotalCount(data.pagination?.totalCount || 0);
        setTotalPages(data.pagination?.totalPages || 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [hasActiveFilter, category, subjectId, paperId, paperNumber, chapterId, boardId, year, difficulty, type, searchQuery, page]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Sync URL query without full reload
  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (subjectId) params.set("subjectId", subjectId);
    if (paperId) params.set("paperId", paperId);
    if (paperNumber) params.set("paperNumber", paperNumber);
    if (chapterId) params.set("chapterId", chapterId);
    if (boardId) params.set("boardId", boardId);
    if (year) params.set("year", year);
    if (difficulty) params.set("difficulty", difficulty);
    if (type) params.set("type", type);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (page > 1) params.set("page", String(page));

    const newQuery = params.toString();
    const newUrl = newQuery ? `/questions?${newQuery}` : "/questions";
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", newUrl);
    }
  }, [category, subjectId, paperId, paperNumber, chapterId, boardId, year, difficulty, type, searchQuery, page]);

  const toggleSolution = (id: string) => {
    setExpandedSolutions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleBookmark = async (questionId: string) => {
    try {
      const res = await fetch(`/api/v1/questions/${questionId}/bookmark`, { method: "POST" });
      if (res.status === 401) {
        router.push(`/login?redirect=/questions`);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === questionId ? { ...q, isBookmarked: data.bookmarked } : q))
        );
      }
    } catch (err) {
      console.error("Bookmark error:", err);
    }
  };

  const handleResetFilters = () => {
    setCategory("");
    setSubjectId("");
    setPaperId("");
    setPaperNumber("");
    setChapterId("");
    setBoardId("");
    setYear("");
    setDifficulty("");
    setType("");
    setSearchQuery("");
    setPage(1);
  };

  const handleSelectCategory = (val: string) => {
    const nextVal = category === val ? "" : val;
    setCategory(nextVal);
    if (nextVal && currentSubject && currentSubject.category !== nextVal) {
      setSubjectId("");
      setPaperId("");
      setPaperNumber("");
      setChapterId("");
    }
    setPage(1);
  };

  const handleSelectSubject = (val: string) => {
    setSubjectId(val);
    setPaperId("");
    setPaperNumber("");
    setChapterId("");
    if (val) {
      const foundSub = subjects.find((s) => s.id === val);
      if (foundSub && !category) {
        setCategory(foundSub.category);
      }
    }
    setPage(1);
  };

  const handleSelectPaper = (val: string) => {
    if (val === "1" || val === "2") {
      setPaperNumber(val);
      setPaperId("");
    } else {
      setPaperId(val);
      setPaperNumber("");
    }
    setPage(1);
  };

  const handleSelectChapter = (val: string) => {
    setChapterId(val);
    if (val && !subjectId) {
      // Find which subject contains this chapter and auto-select
      for (const s of subjects) {
        if (s.chapters?.some((c) => c.id === val)) {
          setSubjectId(s.id);
          if (!category) setCategory(s.category);
          break;
        }
      }
    }
    setPage(1);
  };

  const categories = [
    { label: "SSC (নবম-দশম)", value: "SSC" },
    { label: "HSC (একাদশ-দ্বাদশ)", value: "HSC" },
    { label: "মেডিকেল ভর্তি", value: "MEDICAL" },
    { label: "বিশ্ববিদ্যালয় ভর্তি", value: "UNIVERSITY" },
  ];

  const yearsList = [2024, 2023, 2022, 2021, 2020, 2019, 2018];

  // Active filter tags for one-click removal
  const activeFilters = [
    category && {
      key: "category",
      label: `ক্যাটাগরি: ${categories.find((c) => c.value === category)?.label || category}`,
      onRemove: () => { setCategory(""); setPage(1); },
    },
    subjectId && {
      key: "subject",
      label: `বিষয়: ${subjects.find((s) => s.id === subjectId)?.nameBn || subjectId}`,
      onRemove: () => { setSubjectId(""); setPaperId(""); setPaperNumber(""); setChapterId(""); setPage(1); },
    },
    (paperId || paperNumber) && {
      key: "paper",
      label: `পত্র: ${paperNumber ? (paperNumber === "1" ? "১ম পত্র" : "২য় পত্র") : (availablePapers.find((p) => p.id === paperId)?.nameBn || "নির্বাচিত পত্র")}`,
      onRemove: () => { setPaperId(""); setPaperNumber(""); setPage(1); },
    },
    chapterId && {
      key: "chapter",
      label: `অধ্যায়: ${
        currentSubject?.chapters?.find((c) => c.id === chapterId)?.nameBn ||
        subjects.flatMap((s) => s.chapters || []).find((c) => c.id === chapterId)?.nameBn ||
        "নির্বাচিত অধ্যায়"
      }`,
      onRemove: () => { setChapterId(""); setPage(1); },
    },
    boardId && {
      key: "board",
      label: `বোর্ড: ${boards.find((b) => b.id === boardId)?.nameBn || boardId}`,
      onRemove: () => { setBoardId(""); setPage(1); },
    },
    year && {
      key: "year",
      label: `সাল: ${formatNumber(year)}`,
      onRemove: () => { setYear(""); setPage(1); },
    },
    type && {
      key: "type",
      label: `ধরণ: ${type === "MCQ" ? "বহুনির্বাচনি (MCQ)" : "সৃজনশীল (CQ)"}`,
      onRemove: () => { setType(""); setPage(1); },
    },
    difficulty && {
      key: "difficulty",
      label: `কঠিনতা: ${difficulty === "EASY" ? "সহজ" : difficulty === "HARD" ? "কঠিন" : "মাঝারি"}`,
      onRemove: () => { setDifficulty(""); setPage(1); },
    },
    searchQuery && {
      key: "search",
      label: `অনুসন্ধান: "${searchQuery}"`,
      onRemove: () => { setSearchQuery(""); setPage(1); },
    },
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t.nav.questionBank}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {locale === "bn"
              ? "বিগত বছরের বোর্ড প্রশ্ন, সৃজনশীল (CQ) ও বহুনির্বাচনি (MCQ) প্রশ্নের নির্ভরযোগ্য আর্কাইভ"
              : "Explore verified past board exams, creative questions (CQ) & MCQs with step-by-step solutions."}
          </p>
        </div>

        <Link
          href="/exams/custom"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 shadow-xs"
        >
          <Layers className="w-4 h-4" />
          <span>{t.exam.customBuilderTitle}</span>
        </Link>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Search Bar & Reset */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="বাংলা বা ইংরেজিতে প্রশ্ন বা কীওয়ার্ড অনুসন্ধান করুন..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:border-emerald-600 outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition shrink-0 cursor-pointer"
            title="সব ফিল্টার রিসেট করুন"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ফিল্টার রিসেট</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="font-semibold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>ক্যাটাগরি:</span>
          </span>
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => handleSelectCategory(c.value)}
              className={`px-3.5 py-1.5 rounded-full font-medium transition shrink-0 cursor-pointer ${
                category === c.value
                  ? "bg-emerald-600 text-white font-semibold shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Multi-Dimensional Dropdown Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1 text-xs">
          {/* Subject Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">বিষয় (Subject)</label>
            <select
              value={subjectId}
              onChange={(e) => handleSelectSubject(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 outline-none focus:border-emerald-600"
            >
              <option value="">বিষয় নির্বাচন করুন</option>
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameBn}
                </option>
              ))}
            </select>
          </div>

          {/* Paper Filter (For HSC) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">পত্র (Paper)</label>
            <select
              value={paperId || paperNumber}
              onChange={(e) => handleSelectPaper(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 outline-none focus:border-emerald-600"
            >
              <option value="">পত্র নির্বাচন করুন</option>
              {availablePapers.length > 0 ? (
                availablePapers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nameBn}
                  </option>
                ))
              ) : (
                <>
                  <option value="1">১ম পত্র (1st Paper)</option>
                  <option value="2">২য় পত্র (2nd Paper)</option>
                </>
              )}
            </select>
          </div>

          {/* Chapter Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">অধ্যায় (Chapter)</label>
            <select
              value={chapterId}
              onChange={(e) => handleSelectChapter(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 outline-none focus:border-emerald-600"
            >
              <option value="">অধ্যায় নির্বাচন করুন</option>
              {subjectId ? (
                (currentSubject?.chapters || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    অধ্যায় {c.chapterNum}: {c.nameBn}
                  </option>
                ))
              ) : (
                filteredSubjects.map((s) => (
                  <optgroup key={s.id} label={s.nameBn}>
                    {(s.chapters || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        অধ্যায় {c.chapterNum}: {c.nameBn}
                      </option>
                    ))}
                  </optgroup>
                ))
              )}
            </select>
          </div>

          {/* Board Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">শিক্ষা বোর্ড (Board)</label>
            <select
              value={boardId}
              onChange={(e) => {
                setBoardId(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 outline-none focus:border-emerald-600"
            >
              <option value="">শিক্ষা বোর্ড নির্বাচন করুন</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nameBn}
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">পরীক্ষার সাল (Year)</label>
            <select
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 outline-none focus:border-emerald-600"
            >
              <option value="">পরীক্ষার সাল নির্বাচন করুন</option>
              {yearsList.map((y) => (
                <option key={y} value={y}>
                  {formatNumber(y)} সাল
                </option>
              ))}
            </select>
          </div>

          {/* Question Type Filter (MCQ / CQ) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">ধরণ (Type)</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 outline-none focus:border-emerald-600"
            >
              <option value="">ধরণ নির্বাচন করুন</option>
              <option value="MCQ">বহুনির্বাচনি (MCQ)</option>
              <option value="CQ">সৃজনশীল (CQ)</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips / Badges */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold">সক্রিয় ফিল্টার:</span>
            {activeFilters.map((af) => (
              <span
                key={af.key}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium"
              >
                <span>{af.label}</span>
                <button
                  type="button"
                  onClick={af.onRemove}
                  className="hover:text-emerald-950 font-bold transition ml-0.5 cursor-pointer"
                  title="ফিল্টার সরান"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Question Results - Only visible when user filters ANY option */}
      {hasActiveFilter && (
        <>
          {/* Results Header */}
          <div className="flex justify-between items-center text-xs text-slate-500 px-1">
            <span>
              {locale === "bn"
                ? `মোট ${formatNumber(totalCount)} টি প্রশ্ন সংরক্ষিত রয়েছে`
                : `Total ${totalCount} questions found`}
            </span>
            <span>
              {locale === "bn"
                ? `পৃষ্ঠা ${formatNumber(page)} এর ${formatNumber(totalPages)}`
                : `Page ${page} of ${totalPages}`}
            </span>
          </div>

          {/* Questions List */}
          {loading ? (
            <div className="text-center py-20 text-slate-500 space-y-3">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium">প্রশ্নমালা লোড হচ্ছে...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="bg-white p-12 sm:p-16 rounded-2xl border border-slate-200 text-center space-y-4">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-slate-800 font-bold text-lg">কোনো প্রশ্ন পাওয়া যায়নি</p>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  আপনার নির্বাচিত ফিল্টার বা অনুসন্ধানের সাথে হুবহু মিল রেখে কোনো প্রশ্ন পাওয়া যায়নি। ফিল্টারের পরিধি বৃদ্ধি করে পুনরায় চেষ্টা করুন।
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {boardId && (
                  <button
                    type="button"
                    onClick={() => { setBoardId(""); setPage(1); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    বোর্ড ফিল্টার সাফ করুন
                  </button>
                )}
                {year && (
                  <button
                    type="button"
                    onClick={() => { setYear(""); setPage(1); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    সাল ফিল্টার সাফ করুন
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition cursor-pointer"
                >
                  সব ফিল্টার সাফ করুন
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => {
                const isExpanded = expandedSolutions[q.id];
                const qNum = (page - 1) * 10 + idx + 1;
                const isCQ = q.type === "CQ";

                return (
                  <div
                    key={q.id}
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-slate-300 transition"
                  >
                    {/* Meta Badges & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                          #{formatNumber(qNum)}
                        </span>
                        <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                          {q.subject.nameBn} {q.paper && `(${q.paper.nameBn})`}
                        </span>
                        <span className="text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                          অধ্যায় {formatNumber(q.chapter.chapterNum)}: {q.chapter.nameBn}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-md font-semibold ${
                            isCQ ? "bg-purple-50 text-purple-800 border border-purple-200" : "bg-blue-50 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {isCQ ? "সৃজনশীল (CQ)" : "বহুনির্বাচনি (MCQ)"}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-md font-medium ${
                            q.difficulty === "HARD"
                              ? "bg-rose-50 text-rose-700"
                              : q.difficulty === "MEDIUM"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {q.difficulty === "EASY" ? "সহজ" : q.difficulty === "HARD" ? "কঠিন" : "মাঝারি"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Board Reference Badge */}
                        {q.references && q.references.length > 0 && (
                          <div className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md text-xs font-semibold border border-indigo-100">
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>
                              {`${q.references[0].board?.nameBn || "বোর্ড"} '${formatNumber(q.references[0].examYear)}`}
                            </span>
                          </div>
                        )}

                        {/* Bookmark Toggle */}
                        <button
                          onClick={() => handleToggleBookmark(q.id)}
                          className={`p-1.5 rounded-lg border transition ${
                            q.isBookmarked
                              ? "bg-amber-50 text-amber-600 border-amber-200"
                              : "text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50"
                          }`}
                          title={q.isBookmarked ? "বুকমার্ক সরানো" : "বুকমার্ক করুন"}
                        >
                          {q.isBookmarked ? <BookmarkCheck className="w-4 h-4 text-amber-600" /> : <Bookmark className="w-4 h-4" />}
                        </button>

                        {/* Detail Page Link */}
                        <Link
                          href={`/questions/${q.id}`}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition"
                          title="প্রশ্নের বিস্তারিত পৃষ্ঠা দেখুন"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>

                    {/* Question Body */}
                    {isCQ ? (
                      /* Creative Question (CQ) Preview */
                      <div className="space-y-3">
                        {q.stemBn && (
                          <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60 text-slate-800 text-sm leading-relaxed whitespace-pre-line">
                            <span className="font-bold text-amber-900 block mb-1">উদ্দীপক:</span>
                            <MathText text={q.stemBn} />
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span className="font-semibold text-purple-900 bg-purple-50 px-2 py-1 rounded-md">
                            {q.subparts?.length || 4} টি উপপ্রশ্ন [ক, খ, গ, ঘ] • মোট নম্বর: {formatNumber(q.marks || 10)}
                          </span>
                          <Link
                            href={`/questions/${q.id}`}
                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                          >
                            <span>সম্পূর্ণ সৃজনশীল প্রশ্ন ও সমাধান দেখুন</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ) : (
                      /* MCQ Question Text & Options */
                      <div className="space-y-4">
                        <div className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed">
                          <MathText text={q.questionTextBn} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`p-3 rounded-xl border text-sm flex items-center gap-3 ${
                                isExpanded && opt.isCorrect
                                  ? "border-emerald-500 bg-emerald-50/70 text-emerald-900 font-semibold"
                                  : "border-slate-200 bg-slate-50/50 text-slate-800"
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isExpanded && opt.isCorrect
                                    ? "bg-emerald-600 text-white"
                                    : "bg-white border border-slate-300 text-slate-700"
                                }`}
                              >
                                {opt.optionKey}
                              </span>
                              <div className="pt-0.5">
                                <MathText text={opt.textBn} />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Inline Explanation Toggle for MCQ */}
                        <div className="pt-1 flex items-center justify-between">
                          <button
                            onClick={() => toggleSolution(q.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
                          >
                            <span>{isExpanded ? "ব্যাখ্যা লুকান" : "সঠিক উত্তর ও ব্যাখ্যা দেখুন"}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          <Link
                            href={`/questions/${q.id}`}
                            className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-medium"
                          >
                            <span>অনুশীলন মোডে খুলুন</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>

                        {isExpanded && q.answer && (
                          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs sm:text-sm space-y-2 text-slate-800">
                            <div className="flex items-center gap-2 font-bold text-emerald-900">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>সঠিক উত্তর: ({q.answer.correctKey})</span>
                            </div>
                            <div className="leading-relaxed whitespace-pre-line">
                              <strong>ব্যাখ্যা:</strong> <MathText text={q.answer.explanationBn} />
                            </div>
                            {q.textbookRef && (
                              <div className="text-slate-600 text-xs pt-1 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                <span>পাঠ্যবই রেফারেন্স: {q.textbookRef}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-slate-50 transition"
              >
                পূর্ববর্তী
              </button>
              <span className="text-xs font-semibold text-slate-600 px-3">
                {formatNumber(page)} / {formatNumber(totalPages)}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-slate-50 transition"
              >
                পরবর্তী
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function QuestionBankPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-slate-500">Loading questions...</div>}>
      <QuestionBankContent />
    </Suspense>
  );
}
