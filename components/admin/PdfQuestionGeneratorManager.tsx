"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  Upload,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Trash2,
  RefreshCw,
  ChevronRight,
  Filter,
  Check,
  X,
  Edit3,
  BookOpen,
  ArrowRight,
  Sliders,
  CheckSquare,
  Square,
  Send,
  HelpCircle,
  Layers,
  Award,
  Zap,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { MathText } from "@/components/ui/MathText";

interface PdfImportItem {
  id: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  status: "PENDING" | "QUEUED" | "EXTRACTING" | "RUNNING_OCR" | "READY" | "FAILED" | "CANCELLED";
  detectedLanguage?: string | null;
  category?: string | null;
  classId?: string | null;
  academicClass?: { id: string; nameBn: string; nameEn: string; code: string } | null;
  subject?: { id: string; nameBn: string; nameEn: string; code: string } | null;
  chapter?: { id: string; nameBn: string; chapterNum: number } | null;
  uploadedBy?: { fullName: string; email: string } | null;
  createdAt: string;
  _count?: {
    pages: number;
    generatedDrafts: number;
    importedQuestions: number;
  };
}

interface ExtractedPageItem {
  id: string;
  pageNumber: number;
  rawText: string;
  cleanedText: string;
  hasOcr: boolean;
  ocrConfidence?: number | null;
  wordCount: number;
  detectedLanguage?: string | null;
}

interface QuestionDraftItem {
  id: string;
  questionType: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "DESCRIPTIVE" | "FILL_IN_BLANK" | "MATCHING" | "ANALYTICAL" | "HIGHER_ORDER";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  status: "DRAFT" | "REVIEW" | "APPROVED" | "REJECTED" | "IMPORTED";
  questionTextBn: string;
  questionTextEn?: string | null;
  stemBn?: string | null;
  stemEn?: string | null;
  options: { optionKey: string; textBn: string; textEn?: string | null; isCorrect: boolean }[];
  correctKey?: string | null;
  answerTextBn?: string | null;
  explanationBn: string;
  explanationEn?: string | null;
  markingRubric?: string | null;
  marks: number;
  negativeMarks: number;
  estimatedSeconds: number;
  sourcePage?: number | null;
  sourcePassage?: string | null;
  topicOrConcept?: string | null;
  importedQuestionId?: string | null;
  createdAt: string;
}

interface AcademicClassOption {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  orderIndex?: number;
}

interface TopicOption {
  id: string;
  nameBn: string;
  nameEn?: string;
}

interface ChapterOption {
  id: string;
  chapterNum: number;
  nameBn: string;
  nameEn?: string;
  topics?: TopicOption[];
}

interface SubjectOption {
  id: string;
  code: string;
  nameBn: string;
  category: string;
  classId?: string | null;
  chapters?: ChapterOption[];
}

export function PdfQuestionGeneratorManager() {
  const [activeTab, setActiveTab] = useState<"upload" | "history" | "text" | "review">("upload");

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Curriculum Data
  const [classes, setClasses] = useState<AcademicClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("HSC");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");

  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generation Config State
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["MCQ", "TRUE_FALSE", "SHORT_ANSWER", "DESCRIPTIVE"]);
  const [difficulty, setDifficulty] = useState<string>("MEDIUM");
  const [genLanguage, setGenLanguage] = useState<string>("bn");
  const [defaultMarks, setDefaultMarks] = useState<number>(1.0);
  const [negativeMarks, setNegativeMarks] = useState<number>(0.25);
  const [isGenerating, setIsGenerating] = useState(false);

  // History & Imports List State
  const [imports, setImports] = useState<PdfImportItem[]>([]);
  const [loadingImports, setLoadingImports] = useState(false);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [selectedImport, setSelectedImport] = useState<PdfImportItem | null>(null);

  // Text Preview & Edit State
  const [pages, setPages] = useState<ExtractedPageItem[]>([]);
  const [selectedPageNum, setSelectedPageNum] = useState<number>(1);
  const [textSearchQuery, setTextSearchQuery] = useState("");
  const [isEditingText, setIsEditingText] = useState(false);
  const [editedPageContent, setEditedPageContent] = useState("");
  const [isSavingText, setIsSavingText] = useState(false);
  const [textVersion, setTextVersion] = useState<number>(1);

  // Drafts Review State
  const [drafts, setDrafts] = useState<QuestionDraftItem[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [filterDraftStatus, setFilterDraftStatus] = useState<string>("ALL");
  const [filterDraftType, setFilterDraftType] = useState<string>("ALL");
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [draftEditForm, setDraftEditForm] = useState<any>({});
  const [isRegeneratingId, setIsRegeneratingId] = useState<string | null>(null);
  const [isImportingToBank, setIsImportingToBank] = useState(false);

  // Import to Question Bank Modal State
  const [showImportConfirmModal, setShowImportConfirmModal] = useState(false);
  const [importCategory, setImportCategory] = useState<string>("HSC");
  const [importClassId, setImportClassId] = useState<string>("");
  const [importSubjectId, setImportSubjectId] = useState<string>("");
  const [importIsCustomSubject, setImportIsCustomSubject] = useState<boolean>(false);
  const [importCustomSubject, setImportCustomSubject] = useState<string>("");
  const [importChapterId, setImportChapterId] = useState<string>("");
  const [importIsCustomChapter, setImportIsCustomChapter] = useState<boolean>(false);
  const [importCustomChapter, setImportCustomChapter] = useState<string>("");
  const [importTopicName, setImportTopicName] = useState<string>("");
  const [importIsPremium, setImportIsPremium] = useState<boolean>(false);

  // Clear toast notifications after 5 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Load Curriculum (Classes, Subjects, and Chapters)
  const fetchCurriculum = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/curriculum?category=${selectedCategory}`);
      if (res.ok) {
        const data = await res.json();
        if (data.classes) setClasses(data.classes);
        const subjs: SubjectOption[] = data.subjects || [];
        setSubjects(subjs);
        if (subjs.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(subjs[0].id);
        }
      }
    } catch {
      // Fallback
    }
  }, [selectedCategory, selectedSubjectId]);

  useEffect(() => {
    fetchCurriculum();
  }, [fetchCurriculum]);

  // Update chapters when subject changes in Upload tab
  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);
  const availableChapters = activeSubject?.chapters || [];

  // Modal curriculum selectors and derived states
  const modalAvailableSubjects = subjects.filter((s) => s.category === importCategory);
  const modalActiveSubject = modalAvailableSubjects.find((s) => s.id === importSubjectId);
  const modalAvailableChapters = modalActiveSubject?.chapters || [];
  const modalActiveChapter = modalAvailableChapters.find((c) => c.id === importChapterId);
  const modalAvailableTopics = modalActiveChapter?.topics || [];

  const handleOpenImportModal = () => {
    const docCategory = (selectedImport?.category as string) || selectedCategory || "HSC";
    setImportCategory(docCategory);
    setImportClassId(selectedImport?.classId || selectedImport?.academicClass?.id || selectedClassId || "");

    const matchedSubjId = selectedImport?.subject?.id || selectedSubjectId;
    const subjMatchesCategory = subjects.some((s) => s.id === matchedSubjId && s.category === docCategory);
    if (subjMatchesCategory) {
      setImportSubjectId(matchedSubjId);
    } else {
      const firstInCat = subjects.find((s) => s.category === docCategory);
      setImportSubjectId(firstInCat?.id || "");
    }
    setImportIsCustomSubject(false);
    setImportCustomSubject("");

    setImportChapterId(selectedImport?.chapter?.id || selectedChapterId || "");
    setImportIsCustomChapter(false);
    setImportCustomChapter("");

    const firstDraftTopic = drafts.find((d) => d.topicOrConcept)?.topicOrConcept || selectedTopic || "";
    setImportTopicName(firstDraftTopic);
    setImportIsPremium(false);

    setShowImportConfirmModal(true);
  };

  const handleImportCategoryChange = (newCat: string) => {
    setImportCategory(newCat);
    const catSubjects = subjects.filter((s) => s.category === newCat);
    if (catSubjects.length > 0) {
      setImportSubjectId(catSubjects[0].id);
      const chaps = catSubjects[0].chapters || [];
      setImportChapterId(chaps.length > 0 ? chaps[0].id : "");
    } else {
      setImportSubjectId("");
      setImportChapterId("");
    }
    setImportIsCustomSubject(false);
    setImportIsCustomChapter(false);
  };

  const handleImportSubjectChange = (newSubjId: string) => {
    setImportSubjectId(newSubjId);
    setImportIsCustomSubject(false);
    const matched = subjects.find((s) => s.id === newSubjId);
    const chaps = matched?.chapters || [];
    setImportChapterId(chaps.length > 0 ? chaps[0].id : "");
    setImportIsCustomChapter(false);
  };

  // Load Imports List
  const fetchImports = useCallback(async () => {
    setLoadingImports(true);
    try {
      const res = await fetch("/api/v1/pdf-imports?limit=30");
      if (res.ok) {
        const data = await res.json();
        setImports(data.items || []);
        if (data.items && data.items.length > 0 && !selectedImportId) {
          setSelectedImportId(data.items[0].id);
          setSelectedImport(data.items[0]);
        }
      }
    } catch (err: any) {
      console.error("Fetch imports error:", err);
    } finally {
      setLoadingImports(false);
    }
  }, [selectedImportId]);

  useEffect(() => {
    fetchImports();
  }, [fetchImports]);

  // Load Text for Selected Import
  const fetchTextPages = useCallback(async (importId: string, keepPageNum?: number) => {
    try {
      const res = await fetch(`/api/v1/pdf-imports/${importId}/text`);
      if (res.ok) {
        const data = await res.json();
        const pageList: ExtractedPageItem[] = data.pages || [];
        setPages(pageList);
        setTextVersion(data.latestVersion || 1);
        if (pageList.length > 0) {
          setSelectedPageNum((prev) => {
            const target = keepPageNum !== undefined ? keepPageNum : prev || 1;
            const targetPage = pageList.find((p) => p.pageNumber === target) || pageList[0];
            setEditedPageContent(targetPage.cleanedText);
            return targetPage.pageNumber;
          });
        }
      }
    } catch (err) {
      console.error("Fetch text error:", err);
    }
  }, []);

  // Load Drafts for Selected Import
  const fetchDrafts = useCallback(async (importId: string) => {
    setLoadingDrafts(true);
    try {
      const statusParam = filterDraftStatus !== "ALL" ? `&status=${filterDraftStatus}` : "";
      const typeParam = filterDraftType !== "ALL" ? `&type=${filterDraftType}` : "";
      const res = await fetch(`/api/v1/pdf-imports/${importId}/generated-questions?limit=100${statusParam}${typeParam}`);
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.items || []);
        setStatusCounts(data.statusCounts || {});
      }
    } catch (err) {
      console.error("Fetch drafts error:", err);
    } finally {
      setLoadingDrafts(false);
    }
  }, [filterDraftStatus, filterDraftType]);

  // When selectedImportId changes, fetch corresponding text and drafts
  useEffect(() => {
    if (selectedImportId) {
      const imp = imports.find((i) => i.id === selectedImportId);
      if (imp) setSelectedImport(imp);
      fetchTextPages(selectedImportId);
      fetchDrafts(selectedImportId);
    }
  }, [selectedImportId, imports, fetchTextPages, fetchDrafts]);

  // Update edited page text whenever selected page changes
  useEffect(() => {
    const page = pages.find((p) => p.pageNumber === selectedPageNum);
    if (page) {
      setEditedPageContent(page.cleanedText);
      setIsEditingText(false);
    }
  }, [selectedPageNum, pages]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setUploadFile(file);
      } else {
        setErrorMsg("শুধুমাত্র পিডিএফ (.pdf) ফাইল আপলোড করা যাবে।");
      }
    }
  };

  // Upload PDF Handler
  const handleUploadSubmit = async () => {
    if (!uploadFile) {
      setErrorMsg("অনুগ্রহ করে একটি পিডিএফ ফাইল সিলেক্ট করুন।");
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("category", selectedCategory);
    if (selectedClassId) formData.append("classId", selectedClassId);
    if (selectedSubjectId) formData.append("subjectId", selectedSubjectId);
    if (selectedChapterId) formData.append("chapterId", selectedChapterId);

    try {
      setUploadProgress(40);
      const res = await fetch("/api/v1/pdf-imports", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(85);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "পিডিএফ আপলোড ও প্রসেসিং ব্যর্থ হয়েছে।");
      }

      setUploadProgress(100);
      setSuccessMsg(
        data.isDuplicate
          ? "এই পিডিএফটি আগেই আপলোড করা হয়েছিল। বিদ্যমান রেকর্ড ওপেন করা হয়েছে।"
          : "পিডিএফ সফলভাবে আপলোড ও টেক্সট নিষ্কাশন সম্পন্ন হয়েছে!"
      );

      setUploadFile(null);
      await fetchImports();
      if (data.import?.id) {
        setSelectedImportId(data.import.id);
        setSelectedImport(data.import);
        setActiveTab("text");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "আপলোড প্রক্রিয়ায় ত্রুটি দেখা দিয়েছে।");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Save Text Corrections
  const handleSaveTextCorrection = async () => {
    if (!selectedImportId) return;
    setIsSavingText(true);
    try {
      const res = await fetch(`/api/v1/pdf-imports/${selectedImportId}/text`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageNumber: selectedPageNum,
          content: editedPageContent,
          diffSummary: `পৃষ্ঠা ${selectedPageNum}-এর পাঠ্যাংশ সংশোধন করা হয়েছে।`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "সংশোধন সংরক্ষণ ব্যর্থ হয়েছে।");

      setSuccessMsg(`পৃষ্ঠা ${selectedPageNum}-এর সংশোধন সফলভাবে সংরক্ষিত হয়েছে (ভার্সন ${data.versionNumber})।`);
      setIsEditingText(false);
      await fetchTextPages(selectedImportId);
    } catch (err: any) {
      setErrorMsg(err.message || "টেক্সট সংরক্ষণ ব্যর্থ হয়েছে।");
    } finally {
      setIsSavingText(false);
    }
  };

  // Auto-Heal Broken Bengali Font via Visual OCR
  const [isHealingFont, setIsHealingFont] = useState(false);

  const isBrokenBengaliText = (text: string) => {
    if (!text || text.length < 25) return false;
    const standaloneMatras = (text.match(/\s[\u09BE-\u09CC]\s/g) || []).length;
    const brokenLigatures = (text.match(/[\u0985-\u09B9]্\s+[\u0985-\u09B9]/g) || []).length;
    const misplacedIkars = (text.match(/(?:^|\s)ি[োৌােৈ]/g) || []).length;
    const shArtifacts = (text.match(/শ্\s*[\u0985-\u09B9]/g) || []).length;
    const okarAbuse = (text.match(/[\u0995-\u09B9]ো[\u0995-\u09B9]ো/g) || []).length;
    return (standaloneMatras + brokenLigatures + misplacedIkars + shArtifacts + okarAbuse) >= 3;
  };

  const handleHealFont = async (pageNum?: number, allBroken?: boolean) => {
    if (!selectedImportId) return;
    setIsHealingFont(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/pdf-imports/${selectedImportId}/heal-font`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageNumber: pageNum,
          allBroken,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ফন্ট সংশোধন ব্যর্থ হয়েছে।");

      setSuccessMsg(
        pageNum
          ? `পৃষ্ঠা ${pageNum}-এর বাংলা ফন্ট সফলভাবে হাই-রেজোলিউশন OCR দিয়ে ইউনিকোডে রূপান্তর করা হয়েছে!`
          : `${data.healedCount || 0} টি পৃষ্ঠার বাংলা ফন্ট সফলভাবে ঠিক করা হয়েছে!`
      );
      setIsEditingText(false);
      await fetchTextPages(selectedImportId, pageNum || selectedPageNum);
    } catch (err: any) {
      setErrorMsg(err.message || "বাংলা ফন্ট অটো-ফিক্স ব্যর্থ হয়েছে।");
    } finally {
      setIsHealingFont(false);
    }
  };

  // Start AI Question Generation
  const handleStartGeneration = async () => {
    if (!selectedImportId) return;
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/pdf-imports/${selectedImportId}/generate-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedCount: questionCount,
          questionTypes: selectedTypes,
          difficulty,
          language: genLanguage,
          defaultMarks,
          negativeMarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "প্রশ্ন তৈরি করা ব্যর্থ হয়েছে।");

      setSuccessMsg(`অভিনন্দন! মোট ${data.count} টি প্রশ্ন সফলভাবে তৈরি হয়েছে।`);
      await fetchDrafts(selectedImportId);
      await fetchImports();
      setActiveTab("review");
    } catch (err: any) {
      setErrorMsg(err.message || "প্রশ্ন তৈরিতে ত্রুটি হয়েছে।");
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate Single Question
  const handleRegenerateQuestion = async (draftId: string) => {
    setIsRegeneratingId(draftId);
    try {
      const res = await fetch(`/api/v1/generated-questions/${draftId}/regenerate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "প্রশ্ন পুনরায় তৈরি ব্যর্থ হয়েছে।");

      setSuccessMsg("প্রশ্নটি মূল পৃষ্ঠার আলোকে সফলভাবে পুনরায় তৈরি করা হয়েছে।");
      if (selectedImportId) await fetchDrafts(selectedImportId);
    } catch (err: any) {
      setErrorMsg(err.message || "পুনরায় তৈরিতে সমস্যা হয়েছে।");
    } finally {
      setIsRegeneratingId(null);
    }
  };

  // Approve Draft
  const [approvingDraftId, setApprovingDraftId] = useState<string | null>(null);

  const handleApproveDraft = async (draftId: string) => {
    setApprovingDraftId(draftId);
    setErrorMsg(null);
    try {
      // Optimistic update for instant realtime responsiveness
      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? { ...d, status: "APPROVED" } : d))
      );
      setStatusCounts((prev) => ({
        ...prev,
        DRAFT: Math.max((prev["DRAFT"] || 1) - 1, 0),
        APPROVED: (prev["APPROVED"] || 0) + 1,
      }));

      const res = await fetch("/api/v1/generated-questions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "অনুমোদন ব্যর্থ হয়েছে।");

      setSuccessMsg("প্রশ্নটি সফলভাবে অনুমোদিত হয়েছে এবং প্রশ্ন ব্যাংকে ইম্পোর্টের জন্য প্রস্তুত!");
      if (selectedImportId) await fetchDrafts(selectedImportId);
    } catch (err: any) {
      setErrorMsg(err.message || "অনুমোদনে সমস্যা হয়েছে।");
      if (selectedImportId) await fetchDrafts(selectedImportId);
    } finally {
      setApprovingDraftId(null);
    }
  };

  // Approve All Drafts for Current Document
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  const handleApproveAllDrafts = async () => {
    if (!selectedImportId) return;
    setIsApprovingAll(true);
    setErrorMsg(null);

    // Optimistically update all unapproved to APPROVED
    setDrafts((prev) =>
      prev.map((d) => (d.status !== "IMPORTED" ? { ...d, status: "APPROVED" } : d))
    );
    setStatusCounts((prev) => ({
      ...prev,
      DRAFT: 0,
      APPROVED: (prev["TOTAL"] || drafts.length) - (prev["IMPORTED"] || 0),
    }));

    try {
      const res = await fetch("/api/v1/generated-questions/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importId: selectedImportId,
          allForImport: true,
          action: "APPROVE",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "সবগুলো অনুমোদন ব্যর্থ হয়েছে।");

      setSuccessMsg(
        `এক ক্লিকে সকল (${data.count || drafts.length}টি) খসড়া প্রশ্ন সফলভাবে অনুমোদিত হয়েছে! এখন সরাসরি প্রশ্ন ব্যাংকে ইম্পোর্ট করা যাবে।`
      );
      setSelectedDraftIds([]);
      await fetchDrafts(selectedImportId);
    } catch (err: any) {
      setErrorMsg(err.message || "সবগুলো অনুমোদনে ত্রুটি হয়েছে।");
      await fetchDrafts(selectedImportId);
    } finally {
      setIsApprovingAll(false);
    }
  };

  // Reject Draft
  const handleRejectDraft = async (draftId: string) => {
    try {
      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? { ...d, status: "REJECTED" } : d))
      );
      const res = await fetch("/api/v1/generated-questions/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftIds: [draftId], action: "REJECT" }),
      });
      if (!res.ok) throw new Error("প্রত্যাখ্যান ব্যর্থ হয়েছে।");

      setSuccessMsg("প্রশ্নটি প্রত্যাখ্যাত হয়েছে।");
      if (selectedImportId) await fetchDrafts(selectedImportId);
    } catch (err: any) {
      setErrorMsg(err.message || "প্রত্যাখ্যানে সমস্যা হয়েছে।");
    }
  };

  // Delete Draft
  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই প্রশ্নটি মুছে ফেলতে চান?")) return;
    try {
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      const res = await fetch(`/api/v1/generated-questions/${draftId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("প্রশ্ন মুছে ফেলা যায়নি।");

      setSuccessMsg("প্রশ্নটি মুছে ফেলা হয়েছে।");
      if (selectedImportId) await fetchDrafts(selectedImportId);
    } catch (err: any) {
      setErrorMsg(err.message || "মুছে ফেলতে সমস্যা হয়েছে।");
    }
  };

  // Bulk Actions
  const handleBulkAction = async (action: "APPROVE" | "REJECT" | "DELETE") => {
    if (selectedDraftIds.length === 0) {
      setErrorMsg("কোন প্রশ্ন নির্বাচিত নেই।");
      return;
    }
    if (action === "DELETE" && !confirm(`নির্বাচিত ${selectedDraftIds.length}টি প্রশ্ন মুছে ফেলতে চান?`)) return;

    // Optimistic update
    if (action === "APPROVE") {
      setDrafts((prev) =>
        prev.map((d) => (selectedDraftIds.includes(d.id) ? { ...d, status: "APPROVED" } : d))
      );
    } else if (action === "REJECT") {
      setDrafts((prev) =>
        prev.map((d) => (selectedDraftIds.includes(d.id) ? { ...d, status: "REJECTED" } : d))
      );
    } else if (action === "DELETE") {
      setDrafts((prev) => prev.filter((d) => !selectedDraftIds.includes(d.id)));
    }

    try {
      const res = await fetch("/api/v1/generated-questions/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftIds: selectedDraftIds, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "বাল্ক অ্যাকশন ব্যর্থ হয়েছে।");

      setSuccessMsg(
        action === "APPROVE"
          ? `নির্বাচিত ${selectedDraftIds.length}টি প্রশ্ন সফলভাবে অনুমোদিত হয়েছে!`
          : `নির্বাচিত প্রশ্নসমূহের ওপর '${action}' অ্যাকশন সম্পন্ন হয়েছে।`
      );
      setSelectedDraftIds([]);
      if (selectedImportId) await fetchDrafts(selectedImportId);
    } catch (err: any) {
      setErrorMsg(err.message || "বাল্ক অ্যাকশন পরিচালনায় ত্রুটি।");
      if (selectedImportId) await fetchDrafts(selectedImportId);
    }
  };

  // Import to Question Bank
  const handleImportToQuestionBank = async (publishImmediately: boolean) => {
    // Collect approved draft IDs
    const approvedIds = drafts.filter((d) => d.status === "APPROVED").map((d) => d.id);
    if (approvedIds.length === 0) {
      setErrorMsg("প্রশ্ন ব্যাংকে যুক্ত করার জন্য কমপক্ষে একটি অনুমোদিত (Approved) প্রশ্ন থাকতে হবে।");
      return;
    }

    setIsImportingToBank(true);
    setShowImportConfirmModal(false);
    try {
      const res = await fetch("/api/v1/generated-questions/import-to-question-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftIds: approvedIds,
          publishImmediately,
          category: importCategory,
          classId: importClassId || undefined,
          subjectId: !importIsCustomSubject && importSubjectId ? importSubjectId : undefined,
          chapterId: !importIsCustomChapter && importChapterId ? importChapterId : undefined,
          customSubjectName: importIsCustomSubject ? importCustomSubject.trim() || undefined : undefined,
          customChapterName: importIsCustomChapter ? importCustomChapter.trim() || undefined : undefined,
          topicName: importTopicName.trim() || undefined,
          isPremium: importIsPremium,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "প্রশ্ন ব্যাংকে ইম্পোর্ট ব্যর্থ হয়েছে।");

      setSuccessMsg(`সাফল্য! ${data.importedCount}টি অনুমোদিত প্রশ্ন সরাসরি অফিসিয়াল প্রশ্ন ব্যাংকে সংরক্ষিত হয়েছে!`);
      if (selectedImportId) await fetchDrafts(selectedImportId);
      await fetchImports();
    } catch (err: any) {
      setErrorMsg(err.message || "প্রশ্ন ব্যাংকে সংরক্ষণে ত্রুটি দেখা দিয়েছে।");
    } finally {
      setIsImportingToBank(false);
    }
  };

  // Toggle selection for all drafts
  const handleSelectAllDrafts = () => {
    if (selectedDraftIds.length === drafts.length) {
      setSelectedDraftIds([]);
    } else {
      setSelectedDraftIds(drafts.map((d) => d.id));
    }
  };

  // Toggle selection for single draft
  const handleToggleSelectDraft = (id: string) => {
    if (selectedDraftIds.includes(id)) {
      setSelectedDraftIds(selectedDraftIds.filter((item) => item !== id));
    } else {
      setSelectedDraftIds([...selectedDraftIds, id]);
    }
  };

  // Question Type Toggle helper
  const handleTypeToggle = (typeStr: string) => {
    if (selectedTypes.includes(typeStr)) {
      if (selectedTypes.length === 1) return; // Keep at least one
      setSelectedTypes(selectedTypes.filter((t) => t !== typeStr));
    } else {
      setSelectedTypes([...selectedTypes, typeStr]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="p-1 hover:bg-emerald-100 rounded-md">
            <X className="w-4 h-4 text-emerald-700" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-rose-100 rounded-md">
            <X className="w-4 h-4 text-rose-700" />
          </button>
        </div>
      )}

      {/* Module Header Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-sm border border-emerald-800/40 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>AI-Powered PDF Question Generation Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              পিডিএফ থেকে টেক্সট কনভার্সন ও স্বয়ংক্রিয় এআই প্রশ্ন জেনারেটর
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
              পাঠ্যবই ও প্রশ্নপত্রের পিডিএফ আপলোড করুন। সিস্টেম স্বয়ংক্রিয়ভাবে বাংলা ইউনিকোড টেক্সট নিষ্কাশন করবে, স্ক্যান করা পৃষ্ঠায় ওসিআর চালাবে এবং সিলেবাস অনুযায়ী সঠিক ও নির্ভরযোগ্য প্রশ্নমালা তৈরি করবে।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {selectedImport && (
              <div className="px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium">
                <span className="text-slate-300">বর্তমান ফাইল: </span>
                <span className="font-bold text-emerald-300">{selectedImport.fileName}</span>
                <span className="text-slate-400 ml-1.5 font-mono">({selectedImport.pageCount} পৃষ্ঠা)</span>
              </div>
            )}
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center gap-2 border-t border-emerald-800/60 pt-4 overflow-x-auto no-scrollbar text-xs sm:text-sm font-bold">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === "upload"
                ? "bg-emerald-500 text-white shadow-xs font-bold"
                : "text-slate-300 hover:bg-white/10"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>১. পিডিএফ আপলোড</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === "history"
                ? "bg-emerald-500 text-white shadow-xs font-bold"
                : "text-slate-300 hover:bg-white/10"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>২. প্রসেসিং হিস্ট্রি ({imports.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("text")}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === "text"
                ? "bg-emerald-500 text-white shadow-xs font-bold"
                : "text-slate-300 hover:bg-white/10"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>৩. টেক্সট প্রিভিউ ও এডিটর ({pages.length} পৃষ্ঠা)</span>
          </button>

          <button
            onClick={() => setActiveTab("review")}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === "review"
                ? "bg-emerald-500 text-white shadow-xs font-bold"
                : "text-slate-300 hover:bg-white/10"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>৪. প্রশ্ন রিভিউ ও অনুমোদন ({drafts.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: UPLOAD & CONFIGURATION */}
      {activeTab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Drag & Drop Upload */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-emerald-600" />
                  <span>পিডিএফ ডকুমেন্ট আপলোড ও প্রসেসিং</span>
                </h3>
                <p className="text-xs text-slate-500">
                  এনসিটিবি পাঠ্যবই, মডেল টেস্ট, লেকচার শিট বা প্রশ্নপত্রের পিডিএফ নির্বাচন করুন। সর্বোচ্চ সাইজ ২৫ মেগাবাইট।
                </p>
              </div>

              {/* Drag & Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragOver
                    ? "border-emerald-600 bg-emerald-50/50 scale-[0.99]"
                    : uploadFile
                    ? "border-emerald-500 bg-emerald-50/20"
                    : "border-slate-300 hover:border-emerald-500 hover:bg-slate-50/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileText className="w-7 h-7" />
                </div>

                {uploadFile ? (
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 text-sm sm:text-base">{uploadFile.name}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB • PDF Document
                    </p>
                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold mt-1">
                      ফাইল প্রস্তুত
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 text-sm sm:text-base">
                      এখানে পিডিএফ ফাইল টেনে আনুন অথবা ক্লিক করে ফাইল সিলেক্ট করুন
                    </p>
                    <p className="text-xs text-slate-500">
                      সাপোর্টেড ফরম্যাট: PDF (বাংলা ও ইংরেজি ইউনিকোড এবং স্ক্যানড পেজ)
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      <span>পিডিএফ আপলোড ও টেক্সট কনভার্সন চলছে...</span>
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Upload CTA Button */}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                {uploadFile && (
                  <button
                    type="button"
                    onClick={() => setUploadFile(null)}
                    disabled={isUploading}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    বাতিল
                  </button>
                )}
                <button
                  type="button"
                  disabled={!uploadFile || isUploading}
                  onClick={handleUploadSubmit}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>প্রসেসিং হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>আপলোড ও টেক্সট নিষ্কাশন শুরু করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Academic Mapping & Generation Settings */}
          <div className="space-y-6">
            {/* Academic Classification */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>একাডেমিক ম্যাপিং (Curriculum Mapping)</span>
              </h4>

              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">পরীক্ষার ক্যাটাগরি</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 font-medium"
                  >
                    <option value="HSC">HSC (একাদশ-দ্বাদশ শ্রেণি)</option>
                    <option value="SSC">SSC (নবম-দশম শ্রেণি)</option>
                    <option value="MEDICAL">মেডিকেল ভর্তি পরীক্ষা (Medical Admission)</option>
                    <option value="UNIVERSITY">বিশ্ববিদ্যালয় ভর্তি (DU/GST Admission)</option>
                    <option value="DENTAL">ডেন্টাল ভর্তি পরীক্ষা (Dental)</option>
                    <option value="MODEL_TEST">মডেল টেস্ট ও অনুশীলন</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">একাডেমিক শ্রেণি (Academic Class)</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 font-medium"
                  >
                    <option value="">-- সকল শ্রেণি / সাধারণ (All Classes) --</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.nameBn} ({cls.nameEn})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">পাঠ্য বিষয় (Subject)</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 font-medium"
                  >
                    <option value="">-- বিষয় নির্বাচন করুন --</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.nameBn} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">অধ্যায় (Chapter)</label>
                  <select
                    value={selectedChapterId}
                    onChange={(e) => setSelectedChapterId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 font-medium"
                  >
                    <option value="">-- অধ্যায় নির্বাচন করুন --</option>
                    {availableChapters.map((chap) => (
                      <option key={chap.id} value={chap.id}>
                        অধ্যায় {chap.chapterNum}: {chap.nameBn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">টপিক বা পাঠ্য বিষয়বস্তু (Topic / Concept)</label>
                  <input
                    type="text"
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    placeholder="টপিকের নাম লিখুন (ঐচ্ছিক, যেমন: তাওহীদ, শিরক)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 font-medium text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Question Generation Configuration */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>এআই প্রশ্ন তৈরির কনফিগারেশন</span>
              </h4>

              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-700 font-semibold">প্রশ্নের সংখ্যা</label>
                    <span className="font-extrabold text-emerald-700 text-sm font-mono">{questionCount} টি</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={30}
                    step={1}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">প্রশ্নের ধরনসমূহ</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { key: "MCQ", label: "বহুনির্বাচনী (MCQ)" },
                      { key: "TRUE_FALSE", label: "সত্য / মিথ্যা (T/F)" },
                      { key: "SHORT_ANSWER", label: "সংক্ষিপ্ত উত্তর" },
                      { key: "DESCRIPTIVE", label: "সৃজনশীল / রুব্রিক্স" },
                      { key: "FILL_IN_BLANK", label: "শূন্যস্থান পূরণ" },
                      { key: "ANALYTICAL", label: "উচ্চতর দক্ষতা" },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.key}
                        onClick={() => handleTypeToggle(item.key)}
                        className={`p-2 rounded-lg border text-left flex items-center gap-1.5 transition cursor-pointer ${
                          selectedTypes.includes(item.key)
                            ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      >
                        {selectedTypes.includes(item.key) ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">কঠিনতার স্তর</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 font-medium"
                    >
                      <option value="EASY">সহজ (Easy)</option>
                      <option value="MEDIUM">মাঝারি (Medium)</option>
                      <option value="HARD">কঠিন (Hard)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">প্রশ্নের ভাষা</label>
                    <select
                      value={genLanguage}
                      onChange={(e) => setGenLanguage(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 font-medium"
                    >
                      <option value="bn">বাংলা (Bengali)</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">প্রতি প্রশ্নে পূর্ণমান</label>
                    <input
                      type="number"
                      step="0.5"
                      value={defaultMarks}
                      onChange={(e) => setDefaultMarks(parseFloat(e.target.value) || 1.0)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">নেগেটিভ মার্কিং</label>
                    <input
                      type="number"
                      step="0.05"
                      value={negativeMarks}
                      onChange={(e) => setNegativeMarks(parseFloat(e.target.value) || 0.0)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROCESSING QUEUE & HISTORY */}
      {activeTab === "history" && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <span>পিডিএফ প্রসেসিং কিউ ও ইতিহাস</span>
              </h3>
              <p className="text-xs text-slate-500">
                পূর্বে আপলোডকৃত সকল নথিপত্র, টেক্সট প্রসেসিং অবস্থা ও তৈরি করা প্রশ্নের সারাংশ।
              </p>
            </div>

            <button
              onClick={fetchImports}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingImports ? "animate-spin" : ""}`} />
              <span>রিফ্রেশ করুন</span>
            </button>
          </div>

          {imports.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-600">কোন পিডিএফ নথি এখনো আপলোড করা হয়নি</p>
              <button
                onClick={() => setActiveTab("upload")}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-700 cursor-pointer"
              >
                প্রথম পিডিএফ আপলোড করুন
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ফাইলের নাম</th>
                    <th className="py-3 px-4">ক্যাটাগরি ও বিষয়</th>
                    <th className="py-3 px-4">পৃষ্ঠা সংখ্যা</th>
                    <th className="py-3 px-4">অবস্থা (Status)</th>
                    <th className="py-3 px-4">তৈরি করা প্রশ্ন</th>
                    <th className="py-3 px-4">আপলোডের সময়</th>
                    <th className="py-3 px-4 text-right">কার্যক্রম</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {imports.map((item) => {
                    const isSelected = selectedImportId === item.id;
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/80 transition ${
                          isSelected ? "bg-emerald-50/40" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-[200px]" title={item.fileName}>
                            {item.fileName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <span className="font-semibold text-slate-800">{item.category || "General"}</span>
                          {item.subject && (
                            <span className="block text-[11px] text-slate-400">{item.subject.nameBn}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                          {item.pageCount > 0 ? `${item.pageCount} পৃষ্ঠা` : "গণনাধীন"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              item.status === "READY"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : item.status === "FAILED"
                                ? "bg-rose-50 text-rose-800 border border-rose-200"
                                : "bg-blue-50 text-blue-800 border border-blue-200 animate-pulse"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800">{item._count?.generatedDrafts || 0} টি</span>
                          {item._count?.importedQuestions ? (
                            <span className="block text-[11px] text-emerald-600 font-semibold">
                              ({item._count.importedQuestions} টি ব্যাংকে ইম্পোর্টকৃত)
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-xs font-mono">
                          {new Date(item.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedImportId(item.id);
                                setSelectedImport(item);
                                setActiveTab("text");
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title="টেক্সট প্রিভিউ ও এডিটর"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>টেক্সট</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedImportId(item.id);
                                setSelectedImport(item);
                                setActiveTab("review");
                              }}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title="প্রশ্ন দেখুন ও রিভিউ করুন"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                              <span>প্রশ্নমালা</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TEXT PREVIEW & EDITOR WORKSPACE */}
      {activeTab === "text" && (
        <div className="space-y-6">
          {/* Document Top Bar */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedImport ? selectedImport.fileName : "কোন ফাইল নির্বাচিত নেই"}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                    ভার্সন {textVersion}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {selectedImport?.category || "HSC"} • মোট {pages.length} টি পৃষ্ঠা নিষ্কাশিত হয়েছে
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                disabled={isGenerating || pages.length === 0}
                onClick={handleStartGeneration}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>প্রশ্ন তৈরি হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>এই টেক্সট থেকে এআই প্রশ্ন তৈরি করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {pages.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-sm font-bold text-slate-700">এই ডকুমেন্টে এখনো কোন টেক্সট পাওয়া যায়নি</p>
              <p className="text-xs text-slate-400">প্রসেসিং হিস্ট্রি থেকে পুনরায় নিষ্কাশন চালাতে পারেন।</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Page Navigator Sidebar */}
              <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-700">পৃষ্ঠার তালিকা ({pages.length})</span>
                  <button
                    type="button"
                    disabled={isHealingFont}
                    onClick={() => handleHealFont(undefined, true)}
                    className="text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    title="সম্পূর্ণ ডকুমেন্টের সব পৃষ্ঠায় হাই-রেজোলিউশন ভিজ্যুয়াল OCR চালিয়ে বাংলা ফন্ট ফিক্স করুন"
                  >
                    {isHealingFont ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5 text-amber-600" />}
                    <span>সব ফন্ট ফিক্স</span>
                  </button>
                </div>

                <div className="max-h-[500px] overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                  {pages.map((p) => {
                    const isSelected = selectedPageNum === p.pageNumber;
                    const hasBrokenFont = isBrokenBengaliText(p.cleanedText);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPageNum(p.pageNumber);
                          setEditedPageContent(p.cleanedText);
                          setIsEditingText(false);
                        }}
                        className={`w-full p-2.5 rounded-xl text-left transition flex items-center justify-between text-xs cursor-pointer ${
                          isSelected
                            ? "bg-emerald-600 text-white font-bold shadow-xs"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold">পৃষ্ঠা {p.pageNumber}</span>
                          {p.hasOcr && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-mono ${
                                isSelected ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              OCR
                            </span>
                          )}
                          {hasBrokenFont && !p.hasOcr && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                isSelected ? "bg-amber-400 text-amber-950" : "bg-amber-100 text-amber-800"
                              }`}
                              title="ভাঙা বাংলা ফন্ট শনাক্ত হয়েছে"
                            >
                              ফন্ট ফিক্স
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                          {p.wordCount} শব্দ
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Text Content Editor */}
              <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      পৃষ্ঠা নং {selectedPageNum}
                    </span>
                    <span className="text-xs text-slate-400">
                      মোট শব্দ: {pages.find((p) => p.pageNumber === selectedPageNum)?.wordCount || 0}
                    </span>
                    {pages.find((p) => p.pageNumber === selectedPageNum)?.hasOcr && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-bold border border-blue-200">
                        ভিজ্যুয়াল OCR সম্পন্ন
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!isEditingText && (
                      <button
                        type="button"
                        disabled={isHealingFont}
                        onClick={() => handleHealFont(selectedPageNum)}
                        className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="উচ্চ-রেজোলিউশন ভিজ্যুয়াল OCR চালিয়ে এই পৃষ্ঠার বাংলা ফন্ট সঠিক ইউনিকোডে রূপান্তর করুন"
                      >
                        {isHealingFont ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                            <span>OCR ফিক্স হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>বাংলা ফন্ট অটো-ফিক্স (OCR)</span>
                          </>
                        )}
                      </button>
                    )}

                    {isEditingText ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const orig = pages.find((p) => p.pageNumber === selectedPageNum)?.cleanedText || "";
                            setEditedPageContent(orig);
                            setIsEditingText(false);
                          }}
                          className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          বাতিল
                        </button>
                        <button
                          type="button"
                          disabled={isSavingText}
                          onClick={handleSaveTextCorrection}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isSavingText ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>সংরক্ষণ হচ্ছে...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>সংশোধন সংরক্ষণ করুন</span>
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const cur = pages.find((p) => p.pageNumber === selectedPageNum);
                          if (cur) setEditedPageContent(cur.cleanedText);
                          setIsEditingText(true);
                        }}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                        <span>টেক্সট সংশোধন করুন</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Broken Bengali Font Warning Banner */}
                {(() => {
                  const currentText = pages.find((p) => p.pageNumber === selectedPageNum)?.cleanedText || "";
                  if (isBrokenBengaliText(currentText)) {
                    return (
                      <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                          <div>
                            <span className="font-bold">বাংলা ফন্ট সমস্যা শনাক্ত হয়েছে:</span> এই পৃষ্ঠার ফন্টে বিজয়ী (Bijoy/CMap) বা ভাঙা যুক্তাক্ষর রয়েছে।
                            <p className="text-[11px] text-amber-700">স্বয়ংক্রিয়ভাবে ভিজ্যুয়াল OCR চালিয়ে লেখাটিকে সঠিক ইউনিকোডে রূপান্তর করতে ফিক্স বাটনে ক্লিক করুন।</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isHealingFont}
                          onClick={() => handleHealFont(selectedPageNum)}
                          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shrink-0 shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isHealingFont ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          <span>এখনই ফিক্স করুন</span>
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                {isEditingText ? (
                  <div className="space-y-2">
                    <textarea
                      rows={18}
                      value={editedPageContent}
                      onChange={(e) => setEditedPageContent(e.target.value)}
                      className="w-full p-4 text-xs sm:text-sm font-sans border border-emerald-400 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 leading-relaxed bg-slate-50/50"
                      placeholder="এখানে টেক্সট সংশোধন করুন..."
                    />
                    <p className="text-[11px] text-slate-400 italic">
                      * সম্পাদনা করলে মূল পিডিএফ অপরিবর্তিত থাকবে এবং নতুন একটি সংশোধিত ভার্সন সংরক্ষিত হবে।
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-100 max-h-[550px] overflow-y-auto whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-slate-800 font-sans">
                    {pages.find((p) => p.pageNumber === selectedPageNum)?.cleanedText || "কোন টেক্সট নেই"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: QUESTION REVIEW & QUALITY CONTROL HUB */}
      {activeTab === "review" && (
        <div className="space-y-6">
          {/* Review Toolbar & Status Filters */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  <span>প্রশ্ন সম্পাদনা, অনুমোদন ও কোয়ালিটি কন্ট্রোল হাব</span>
                </h3>
                <p className="text-xs text-slate-500">
                  এআই দ্বারা উৎপন্ন খসড়া প্রশ্নগুলো যাচাই করুন। অনুমোদন শেষে সরাসরি অফিসিয়াল প্রশ্ন ব্যাংকে ইম্পোর্ট করা যাবে।
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={isApprovingAll || (statusCounts["DRAFT"] || 0) === 0}
                  onClick={handleApproveAllDrafts}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="বর্তমান ডকুমেন্টের সকল খসড়া প্রশ্ন এক ক্লিকে অনুমোদন করুন"
                >
                  {isApprovingAll ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>সবগুলো অনুমোদন করুন ({statusCounts["DRAFT"] || 0} টি খসড়া)</span>
                </button>

                <button
                  type="button"
                  disabled={isImportingToBank || ((statusCounts["APPROVED"] || 0) === 0 && (statusCounts["DRAFT"] || 0) === 0)}
                  onClick={handleOpenImportModal}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Award className="w-4 h-4" />
                  <span>প্রশ্ন ব্যাংকে ইম্পোর্ট করুন ({statusCounts["APPROVED"] || 0} টি অনুমোদিত)</span>
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                {[
                  { key: "ALL", label: "সব প্রশ্ন", count: statusCounts["TOTAL"] || drafts.length },
                  { key: "DRAFT", label: "খসড়া (Drafts)", count: statusCounts["DRAFT"] || 0 },
                  { key: "APPROVED", label: "অনুমোদিত (Approved)", count: statusCounts["APPROVED"] || 0 },
                  { key: "REJECTED", label: "প্রত্যাখ্যাত (Rejected)", count: statusCounts["REJECTED"] || 0 },
                  { key: "IMPORTED", label: "ব্যাংকে সংরক্ষিত (Imported)", count: statusCounts["IMPORTED"] || 0 },
                ].map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => setFilterDraftStatus(pill.key)}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                      filterDraftStatus === pill.key
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        filterDraftStatus === pill.key ? "bg-white/20 text-white" : "bg-white text-slate-700 border border-slate-200"
                      }`}
                    >
                      {pill.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Bulk Actions Controls */}
              {selectedDraftIds.length > 0 && (
                <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs">
                  <span className="font-bold text-emerald-900">{selectedDraftIds.length} টি নির্বাচিত</span>
                  <button
                    onClick={() => handleBulkAction("APPROVE")}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition cursor-pointer"
                  >
                    অনুমোদন
                  </button>
                  <button
                    onClick={() => handleBulkAction("REJECT")}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition cursor-pointer"
                  >
                    প্রত্যাখ্যান
                  </button>
                  <button
                    onClick={() => handleBulkAction("DELETE")}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition cursor-pointer"
                  >
                    মুছুন
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Questions Cards List */}
          {drafts.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">কোন প্রশ্ন পাওয়া যায়নি</p>
              <p className="text-xs text-slate-400">ফিল্টার পরিবর্তন করুন অথবা নতুন করে প্রশ্ন তৈরি করুন।</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-slate-500 font-semibold">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSelectAllDrafts}
                    className="flex items-center gap-2 hover:text-slate-800 cursor-pointer"
                  >
                    {selectedDraftIds.length === drafts.length && drafts.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>সব নির্বাচন করুন ({drafts.length} টি)</span>
                  </button>

                  {selectedDraftIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleBulkAction("APPROVE")}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>নির্বাচিত {selectedDraftIds.length}টি অনুমোদন করুন</span>
                    </button>
                  )}
                </div>
                <span>পৃষ্ঠা রেফারেন্স ও রুব্রিক্স প্রদর্শিত হচ্ছে</span>
              </div>

              {drafts.map((draft, idx) => {
                const isSelected = selectedDraftIds.includes(draft.id);
                const isEditing = editingDraftId === draft.id;
                const isRegenerating = isRegeneratingId === draft.id;

                return (
                  <div
                    key={draft.id}
                    className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all space-y-4 shadow-xs ${
                      isSelected ? "border-emerald-500 ring-2 ring-emerald-500/10" : "border-slate-200"
                    }`}
                  >
                    {/* Header Row: Type, Difficulty, Source, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectDraft(draft.id)}
                          className="text-slate-400 hover:text-emerald-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <span className="font-mono font-bold text-slate-500">#{idx + 1}</span>

                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border border-slate-200">
                          {draft.questionType}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            draft.difficulty === "HARD"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : draft.difficulty === "MEDIUM"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {draft.difficulty}
                        </span>

                        <span className="font-mono text-slate-400">
                          মান: {draft.marks} | নেগেটিভ: {draft.negativeMarks}
                        </span>

                        {draft.sourcePage && (
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-[11px]">
                            উৎস: পৃষ্ঠা {draft.sourcePage}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            draft.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : draft.status === "REJECTED"
                              ? "bg-rose-50 text-rose-800 border border-rose-200"
                              : draft.status === "IMPORTED"
                              ? "bg-purple-50 text-purple-800 border border-purple-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {draft.status}
                        </span>
                      </div>
                    </div>

                    {/* Question Content */}
                    {isEditing ? (
                      /* Inline Edit Form */
                      <div className="space-y-4 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">প্রশ্ন (বাংলা)</label>
                          <textarea
                            rows={3}
                            value={draftEditForm.questionTextBn}
                            onChange={(e) =>
                              setDraftEditForm({ ...draftEditForm, questionTextBn: e.target.value })
                            }
                            className="w-full p-3 text-xs sm:text-sm font-sans border border-emerald-400 rounded-xl outline-none"
                          />
                        </div>

                        {draftEditForm.options && draftEditForm.options.length > 0 && (
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">অপশনসমূহ ও সঠিক উত্তর</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {draftEditForm.options.map((opt: any, optIdx: number) => (
                                <div
                                  key={opt.optionKey}
                                  className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs ${
                                    opt.isCorrect ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-200"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`correct-${draft.id}`}
                                    checked={opt.isCorrect}
                                    onChange={() => {
                                      const updatedOpts = draftEditForm.options.map((o: any, i: number) => ({
                                        ...o,
                                        isCorrect: i === optIdx,
                                      }));
                                      setDraftEditForm({
                                        ...draftEditForm,
                                        options: updatedOpts,
                                        correctKey: opt.optionKey,
                                      });
                                    }}
                                    className="accent-emerald-600"
                                  />
                                  <span className="font-bold text-slate-700">{opt.optionKey}.</span>
                                  <input
                                    type="text"
                                    value={opt.textBn}
                                    onChange={(e) => {
                                      const updatedOpts = [...draftEditForm.options];
                                      updatedOpts[optIdx].textBn = e.target.value;
                                      setDraftEditForm({ ...draftEditForm, options: updatedOpts });
                                    }}
                                    className="w-full p-1 bg-white border border-slate-200 rounded text-xs"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">ব্যাখ্যা (বাংলা)</label>
                          <textarea
                            rows={2}
                            value={draftEditForm.explanationBn}
                            onChange={(e) =>
                              setDraftEditForm({ ...draftEditForm, explanationBn: e.target.value })
                            }
                            className="w-full p-2.5 text-xs sm:text-sm font-sans border border-slate-300 rounded-xl outline-none"
                          />
                        </div>

                        {draft.questionType === "DESCRIPTIVE" && (
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">মার্কিং রুব্রিক্স</label>
                            <textarea
                              rows={2}
                              value={draftEditForm.markingRubric || ""}
                              onChange={(e) =>
                                setDraftEditForm({ ...draftEditForm, markingRubric: e.target.value })
                              }
                              className="w-full p-2.5 text-xs sm:text-sm font-sans border border-slate-300 rounded-xl outline-none"
                            />
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingDraftId(null)}
                            className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                          >
                            বাতিল
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/v1/generated-questions/${draft.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(draftEditForm),
                                });
                                if (!res.ok) throw new Error("সম্পাদনা সংরক্ষণ ব্যর্থ।");
                                setSuccessMsg("প্রশ্ন সফলভাবে আপডেট হয়েছে।");
                                setEditingDraftId(null);
                                if (selectedImportId) fetchDrafts(selectedImportId);
                              } catch (err: any) {
                                setErrorMsg(err.message);
                              }
                            }}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
                          >
                            সংরক্ষণ করুন
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Mode */
                      <div className="space-y-3">
                        {draft.stemBn && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 italic">
                            <MathText text={draft.stemBn} />
                          </div>
                        )}

                        <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                          <MathText text={draft.questionTextBn} />
                        </h4>

                        {/* Options Display for MCQ or T/F */}
                        {draft.options && draft.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {draft.options.map((opt) => (
                              <div
                                key={opt.optionKey}
                                className={`p-3 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between ${
                                  opt.isCorrect
                                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold"
                                    : "bg-slate-50/60 border-slate-200 text-slate-700"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                                      opt.isCorrect
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-200 text-slate-700"
                                    }`}
                                  >
                                    {opt.optionKey}
                                  </span>
                                  <span>
                                    <MathText text={opt.textBn} />
                                  </span>
                                </div>
                                {opt.isCorrect && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Short Answer / Model Solution */}
                        {draft.questionType === "SHORT_ANSWER" && draft.answerTextBn && (
                          <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-xs text-emerald-900 space-y-1">
                            <span className="font-bold text-emerald-800">আদর্শ উত্তর / সমাধান: </span>
                            <MathText text={draft.answerTextBn} />
                          </div>
                        )}

                        {/* Descriptive / CQ Marking Rubric */}
                        {draft.questionType === "DESCRIPTIVE" && draft.markingRubric && (
                          <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs space-y-1">
                            <span className="font-bold text-amber-900 block">মার্কিং রুব্রিক্স (Evaluation Rubric):</span>
                            <p className="whitespace-pre-line text-amber-800">{draft.markingRubric}</p>
                          </div>
                        )}

                        {/* Explanation */}
                        {draft.explanationBn && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 space-y-1">
                            <span className="font-bold text-slate-800">ব্যাখ্যা ও সমাধান: </span>
                            <MathText text={draft.explanationBn} />
                          </div>
                        )}

                        {/* Supporting Source Citation */}
                        {draft.sourcePassage && (
                          <div className="text-[11px] text-slate-500 bg-slate-50/40 p-2 rounded-lg border border-slate-100">
                            <span className="font-semibold text-slate-700">উৎস উদ্ধৃতি: </span>
                            <span className="italic">"<MathText text={draft.sourcePassage} />"</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer Actions */}
                    {!isEditing && draft.status !== "IMPORTED" && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDraftId(draft.id);
                              setDraftEditForm({
                                questionTextBn: draft.questionTextBn,
                                options: draft.options,
                                correctKey: draft.correctKey,
                                explanationBn: draft.explanationBn,
                                markingRubric: draft.markingRubric,
                                marks: draft.marks,
                                negativeMarks: draft.negativeMarks,
                                difficulty: draft.difficulty,
                              });
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>এডিট</span>
                          </button>

                          <button
                            type="button"
                            disabled={isRegenerating}
                            onClick={() => handleRegenerateQuestion(draft.id)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="এই পেজের আলোকে প্রশ্নটি পুনরায় তৈরি করুন"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                            <span>পুনরায় তৈরি</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteDraft(draft.id)}
                            className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {draft.status !== "REJECTED" && (
                            <button
                              type="button"
                              onClick={() => handleRejectDraft(draft.id)}
                              className="px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg font-bold cursor-pointer"
                            >
                              প্রত্যাখ্যান
                            </button>
                          )}

                          {draft.status === "APPROVED" && (
                            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>অনুমোদিত</span>
                            </span>
                          )}

                          {draft.status !== "APPROVED" && (
                            <button
                              type="button"
                              disabled={approvingDraftId === draft.id}
                              onClick={() => handleApproveDraft(draft.id)}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
                            >
                              {approvingDraftId === draft.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>অনুমোদন করুন</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal: Import to Official Question Bank */}
      {showImportConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">প্রশ্ন ব্যাংকে সংরক্ষণ ও কারিকুলাম ম্যাপিং</h3>
                  <p className="text-xs text-slate-500">
                    অনুমোদিত প্রশ্নগুলো সরাসরি অফিসিয়াল প্রশ্ন ব্যাংকে সংরক্ষিত হবে। বিভাগ, শ্রেণি ও বিষয় নির্বাচন করুন।
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Summary & Quick Approval Action */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>অনুমোদিত প্রশ্নের সংখ্যা:</span>
                  <span className="font-extrabold text-emerald-700 text-sm font-mono ml-1">
                    {statusCounts["APPROVED"] || 0} টি
                  </span>
                </div>
                {(statusCounts["DRAFT"] || 0) > 0 && (
                  <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                    খসড়া: {statusCounts["DRAFT"]} টি
                  </span>
                )}
              </div>

              {(statusCounts["DRAFT"] || 0) > 0 && (
                <button
                  type="button"
                  disabled={isApprovingAll}
                  onClick={async () => {
                    await handleApproveAllDrafts();
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {isApprovingAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>সব খসড়া অনুমোদন করুন</span>
                </button>
              )}
            </div>

            {/* Curriculum Configuration Grid */}
            <div className="space-y-4">
              {/* Category & Class */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                    <span>লক্ষ্য ক্যাটাগরি (Exam Category) *</span>
                  </label>
                  <select
                    value={importCategory}
                    onChange={(e) => handleImportCategoryChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-xs sm:text-sm font-semibold text-slate-800"
                  >
                    <option value="HSC">HSC (এইচএসসি - একাদশ/দ্বাদশ)</option>
                    <option value="SSC">SSC (এসএসসি - নবম/দশম)</option>
                    <option value="MEDICAL">মেডিকেল ভর্তি পরীক্ষা (Medical)</option>
                    <option value="UNIVERSITY">বিশ্ববিদ্যালয় ভর্তি (University)</option>
                    <option value="DENTAL">ডেন্টাল ভর্তি পরীক্ষা (Dental)</option>
                    <option value="MODEL_TEST">মডেল টেস্ট ও অনুশীলন</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>একাডেমিক শ্রেণি (Academic Class)</span>
                  </label>
                  <select
                    value={importClassId}
                    onChange={(e) => setImportClassId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-xs sm:text-sm font-semibold text-slate-800"
                  >
                    <option value="">-- সকল শ্রেণি / সাধারণ (All Classes) --</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.nameBn} ({cls.nameEn})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject & Chapter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Subject */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      <span>পাঠ্য বিষয় (Subject) *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setImportIsCustomSubject(!importIsCustomSubject)}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                    >
                      {importIsCustomSubject ? "তালিকা থেকে বাছুন" : "+ নতুন বিষয়"}
                    </button>
                  </div>

                  {importIsCustomSubject ? (
                    <input
                      type="text"
                      value={importCustomSubject}
                      onChange={(e) => setImportCustomSubject(e.target.value)}
                      placeholder="নতুন বিষয়ের নাম লিখুন (যেমন: ইসলামিক স্টাডিজ)"
                      className="w-full p-2.5 bg-white border border-emerald-500 rounded-xl outline-none text-xs sm:text-sm font-medium"
                    />
                  ) : (
                    <select
                      value={importSubjectId}
                      onChange={(e) => handleImportSubjectChange(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-xs sm:text-sm font-semibold text-slate-800"
                    >
                      <option value="">-- বিষয় নির্বাচন করুন --</option>
                      {modalAvailableSubjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.nameBn} ({sub.code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Chapter */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>অধ্যায় (Chapter) *</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setImportIsCustomChapter(!importIsCustomChapter)}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                    >
                      {importIsCustomChapter ? "তালিকা থেকে বাছুন" : "+ নতুন অধ্যায়"}
                    </button>
                  </div>

                  {importIsCustomChapter ? (
                    <input
                      type="text"
                      value={importCustomChapter}
                      onChange={(e) => setImportCustomChapter(e.target.value)}
                      placeholder="নতুন অধ্যায়ের নাম লিখুন (যেমন: তাওহীদ ও আকাইদ)"
                      className="w-full p-2.5 bg-white border border-emerald-500 rounded-xl outline-none text-xs sm:text-sm font-medium"
                    />
                  ) : (
                    <select
                      value={importChapterId}
                      onChange={(e) => setImportChapterId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-xs sm:text-sm font-semibold text-slate-800"
                    >
                      <option value="">-- অধ্যায় নির্বাচন করুন --</option>
                      {modalAvailableChapters.map((chap) => (
                        <option key={chap.id} value={chap.id}>
                          অধ্যায় {chap.chapterNum}: {chap.nameBn}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Topic & Concept */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>টপিক বা পাঠ্য বিষয়বস্তু (Topic / Concept)</span>
                </label>
                <input
                  type="text"
                  value={importTopicName}
                  onChange={(e) => setImportTopicName(e.target.value)}
                  placeholder="টপিকের নাম লিখুন (যেমন: তাওহীদ, শিরক, সালাত, ভেক্টর যোগ ইত্যাদি)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-xs sm:text-sm font-medium text-slate-800"
                />

                {modalAvailableTopics.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-400 font-medium">প্রস্তাবিত টপিক:</span>
                    {modalAvailableTopics.map((top) => (
                      <button
                        key={top.id}
                        type="button"
                        onClick={() => setImportTopicName(top.nameBn)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                          importTopicName === top.nameBn
                            ? "bg-emerald-100 border-emerald-400 text-emerald-800 font-bold"
                            : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                        }`}
                      >
                        {top.nameBn}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Topic-Related Options */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-slate-800 block cursor-pointer" htmlFor="premium-toggle">
                      প্রশ্ন অ্যাক্সেস টাইপ (Access Level)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      {importIsPremium
                        ? "প্রিমিয়াম কনটেন্ট: শুধুমাত্র পেইড সাবস্ক্রিপশনধারী শিক্ষার্থীরা এই প্রশ্ন অ্যাক্সেস করতে পারবে।"
                        : "ফ্রি কনটেন্ট: সকল সাধারণ শিক্ষার্থী এই প্রশ্নগুলো অনুশীলন করতে পারবে।"}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="premium-toggle"
                      type="checkbox"
                      checked={importIsPremium}
                      onChange={(e) => setImportIsPremium(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
                  <div>
                    <span className="font-semibold text-slate-700">উৎস: </span>
                    <span>{selectedImport?.fileName || "পিডিএফ ফাইল"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">নম্বর: </span>
                    <span>ডিফল্ট ১.০ (নেগেটিভ ০.২৫)</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              প্রশ্নগুলো ব্যাংকে সংরক্ষণের পর শিক্ষক ও অ্যাডমিনগণ সরাসরি পরীক্ষা তৈরিতে (Exam Manager) এগুলো নির্বাচন করতে পারবেন এবং শিক্ষার্থীরা অনুশীলন পরীক্ষায় অংশগ্রহণ করতে পারবে।
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImportConfirmModal(false)}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                ফিরে যান
              </button>
              <button
                type="button"
                disabled={isImportingToBank || (statusCounts["APPROVED"] || 0) === 0}
                onClick={() => handleImportToQuestionBank(false)}
                className="px-4 py-2.5 border border-emerald-600 text-emerald-700 rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-50 transition cursor-pointer disabled:opacity-50"
              >
                {isImportingToBank ? "ইম্পোর্ট হচ্ছে..." : "অনুমোদিত হিসেবে ইম্পোর্ট"}
              </button>
              <button
                type="button"
                disabled={isImportingToBank || (statusCounts["APPROVED"] || 0) === 0}
                onClick={() => handleImportToQuestionBank(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isImportingToBank ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ইম্পোর্ট হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>সরাসরি পাবলিশ ও ইম্পোর্ট</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
