"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Layers,
  GraduationCap,
  FolderTree,
  Archive,
  RefreshCw,
  UserCheck,
  UserX,
  ArrowRightLeft,
  Search,
  Mail,
  Calendar,
  X,
  Pencil,
  Filter,
} from "lucide-react";

interface AcademicClass {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  orderIndex: number;
  isActive: boolean;
  subjects?: { id: string; nameBn: string; code: string }[];
}

interface AcademicGroup {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  orderIndex: number;
  isActive: boolean;
  subjects?: { id: string; nameBn: string; code: string }[];
  _count?: { subjects: number };
}

interface Subject {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  category: "SSC" | "HSC" | "MEDICAL" | "UNIVERSITY";
  classId?: string | null;
  class?: { nameBn: string };
  academicClass?: { id: string; code: string; nameBn: string; nameEn: string } | null;
  groupId?: string | null;
  academicGroup?: { id: string; code: string; nameBn: string; nameEn: string } | null;
  isActive: boolean;
  papers?: { id: string; paperNumber: number; nameBn: string }[];
  chapters?: { id: string; chapterNum: number; nameBn: string; _count?: { questions: number } }[];
  _count?: { questions: number };
}

interface Chapter {
  id: string;
  subjectId: string;
  chapterNum: number;
  nameBn: string;
  nameEn: string;
  isActive: boolean;
  _count?: { questions: number; topics: number };
}

interface Board {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  isActive: boolean;
  _count?: { questionReferences: number };
}

interface TeacherAssignmentItem {
  id: string;
  teacherId: string;
  subjectId: string;
  classId: string | null;
  isActive: boolean;
  notes: string | null;
  assignedAt: string;
  teacher: { id: string; fullName: string; fullNameBn: string | null; email: string; phoneNumber: string | null };
  subject: { id: string; code: string; nameEn: string; nameBn: string; category: string };
  academicClass: { id: string; code: string; nameEn: string; nameBn: string } | null;
  assignedBy?: { id: string; fullName: string; email: string } | null;
}

interface ClassEnrollmentItem {
  id: string;
  studentId: string;
  classId: string;
  academicYear: string;
  rollNumber: string | null;
  status: "ACTIVE" | "TRANSFERRED" | "COMPLETED" | "DROPPED";
  enrolledAt: string;
  transferredAt?: string | null;
  transferReason?: string | null;
  student: { id: string; fullName: string; fullNameBn: string | null; email: string; phoneNumber: string | null };
  academicClass: { id: string; code: string; nameEn: string; nameBn: string };
}

export function CurriculumManager() {
  const [activeTab, setActiveTab] = useState<
    "classes" | "groups" | "subjects" | "chapters" | "boards" | "teachers" | "enrollments"
  >("subjects");
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [groups, setGroups] = useState<AcademicGroup[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignmentItem[]>([]);
  const [classEnrollments, setClassEnrollments] = useState<ClassEnrollmentItem[]>([]);

  // Search & Filter state
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectCategoryFilter, setSubjectCategoryFilter] = useState("");
  const [subjectClassFilter, setSubjectClassFilter] = useState("");
  const [subjectGroupFilter, setSubjectGroupFilter] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal / Form state for standard entities
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState<"class" | "group" | "subject" | "">("");
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});

  // Teacher Assignment Modal
  const [showAssignTeacherModal, setShowAssignTeacherModal] = useState(false);
  const [teacherForm, setTeacherForm] = useState({
    teacherId: "",
    subjectId: "",
    classId: "",
    notes: "",
  });

  // Student Enrollment Modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    studentId: "",
    classId: "",
    academicYear: "2025-2026",
    rollNumber: "",
    notes: "",
  });

  // Student Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    studentId: "",
    fromClassId: "",
    toClassId: "",
    reason: "",
    academicYear: "2025-2026",
  });

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/curriculum?onlyActive=false");
      const data = await res.json();
      setClasses(data.classes || []);
      setGroups(data.groups || []);
      setSubjects(data.subjects || []);
      setBoards(data.boards || []);
      if (!selectedSubjectId && data.subjects?.length > 0) {
        setSelectedSubjectId(data.subjects[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedSubjectId]);

  const fetchChaptersForSubject = useCallback(async (subjectId: string) => {
    if (!subjectId) return;
    try {
      const res = await fetch(
        `/api/v1/admin/curriculum?entity=chapters&subjectId=${subjectId}&onlyActive=false`
      );
      const data = await res.json();
      setChapters(data.chapters || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchTeacherAssignments = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/teachers/assignments?onlyActive=false");
      const data = await res.json();
      setTeacherAssignments(data.assignments || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchClassEnrollments = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/enrollments");
      const data = await res.json();
      setClassEnrollments(data.enrollments || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === "chapters" && selectedSubjectId) {
      fetchChaptersForSubject(selectedSubjectId);
    } else if (activeTab === "teachers") {
      fetchTeacherAssignments();
    } else if (activeTab === "enrollments") {
      fetchClassEnrollments();
    }
  }, [activeTab, selectedSubjectId, fetchChaptersForSubject, fetchTeacherAssignments, fetchClassEnrollments]);

  // Filtered lists for instant search and filters
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const matchSearch =
        !subjectSearch ||
        s.nameBn.toLowerCase().includes(subjectSearch.toLowerCase()) ||
        s.nameEn.toLowerCase().includes(subjectSearch.toLowerCase()) ||
        s.code.toLowerCase().includes(subjectSearch.toLowerCase());
      const matchCategory = !subjectCategoryFilter || s.category === subjectCategoryFilter;
      const matchClass = !subjectClassFilter || s.classId === subjectClassFilter;
      const matchGroup = !subjectGroupFilter || s.groupId === subjectGroupFilter;
      return matchSearch && matchCategory && matchClass && matchGroup;
    });
  }, [subjects, subjectSearch, subjectCategoryFilter, subjectClassFilter, subjectGroupFilter]);

  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      return (
        !classSearch ||
        cls.nameBn.toLowerCase().includes(classSearch.toLowerCase()) ||
        cls.nameEn.toLowerCase().includes(classSearch.toLowerCase()) ||
        cls.code.toLowerCase().includes(classSearch.toLowerCase())
      );
    });
  }, [classes, classSearch]);

  const filteredGroups = useMemo(() => {
    return groups.filter((grp) => {
      return (
        !groupSearch ||
        grp.nameBn.toLowerCase().includes(groupSearch.toLowerCase()) ||
        grp.nameEn.toLowerCase().includes(groupSearch.toLowerCase()) ||
        grp.code.toLowerCase().includes(groupSearch.toLowerCase())
      );
    });
  }, [groups, groupSearch]);

  // Handle Active / Archived Toggle
  const handleToggleActive = async (entity: string, id: string, currentActive: boolean) => {
    try {
      const res = await fetch("/api/v1/admin/curriculum", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, id, isActive: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg({ type: "error", text: data.error || "স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।" });
      } else {
        setAlertMsg({
          type: "success",
          text: `স্ট্যাটাস সফলভাবে ${!currentActive ? "সক্রিয়" : "সংরক্ষিত/আর্কাইভ"} করা হয়েছে।`,
        });
        fetchOverview();
        if (selectedSubjectId) fetchChaptersForSubject(selectedSubjectId);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setAlertMsg({ type: "error", text: e.message });
    }
  };

  // Safe delete with referential protection check
  const handleDelete = async (entity: string, id: string) => {
    if (
      !confirm(
        `সতর্কতা: আপনি কি নিশ্চিতভাবে এটি মুছে ফেলতে চান? যদি এর অধীনে প্রশ্ন বা ডেটা থাকে তবে ডিলিট ব্লক হবে এবং আর্কাইভ করতে হবে।`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/curriculum?entity=${entity}&id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg({ type: "error", text: data.error || "মুছে ফেলা যায়নি।" });
      } else {
        setAlertMsg({ type: "success", text: "সফলভাবে মুছে ফেলা হয়েছে।" });
        fetchOverview();
        if (selectedSubjectId) fetchChaptersForSubject(selectedSubjectId);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setAlertMsg({ type: "error", text: e.message });
    }
  };

  // Open Edit Modal for standard academic entities
  const handleOpenEdit = (entity: "class" | "group" | "subject", item: any) => {
    setEditingEntity(entity);
    setEditFormData({
      id: item.id,
      code: item.code || "",
      nameBn: item.nameBn || "",
      nameEn: item.nameEn || "",
      orderIndex: item.orderIndex ?? 0,
      category: item.category || "HSC",
      classId: item.classId || "",
      groupId: item.groupId || "",
      isActive: item.isActive,
    });
    setShowEditModal(true);
  };

  // Submit Edit Form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAlertMsg(null);
    try {
      const res = await fetch("/api/v1/admin/curriculum", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: editingEntity,
          ...editFormData,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg({ type: "error", text: data.error || "আপডেট ব্যর্থ হয়েছে।" });
      } else {
        setAlertMsg({ type: "success", text: "সফলভাবে আপডেট করা হয়েছে।" });
        setShowEditModal(false);
        setEditFormData({});
        fetchOverview();
        if (selectedSubjectId) fetchChaptersForSubject(selectedSubjectId);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setAlertMsg({ type: "error", text: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Create Standard Academic Entity (class, group, subject, chapter, board)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAlertMsg(null);

    const entityMap: Record<string, string> = {
      classes: "class",
      groups: "group",
      subjects: "subject",
      chapters: "chapter",
      boards: "board",
    };
    const entity = entityMap[activeTab];
    if (!entity) return;

    const payload = {
      entity,
      ...formData,
      ...(entity === "chapter" ? { subjectId: selectedSubjectId } : {}),
    };

    try {
      const res = await fetch("/api/v1/admin/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg({ type: "error", text: data.error || "তৈরি ব্যর্থ হয়েছে।" });
      } else {
        setAlertMsg({ type: "success", text: "সফলভাবে তৈরি হয়েছে।" });
        setShowAddModal(false);
        setFormData({});
        fetchOverview();
        if (selectedSubjectId) fetchChaptersForSubject(selectedSubjectId);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setAlertMsg({ type: "error", text: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Assign Teacher Submission
  const handleAssignTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/admin/teachers/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teacherForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "শিক্ষক দায়িত্ব অর্পণ ব্যর্থ হয়েছে");
      }
      setAlertMsg({ type: "success", text: "শিক্ষকের দায়িত্ব সফলভাবে অর্পণ করা হয়েছে।" });
      setShowAssignTeacherModal(false);
      setTeacherForm({ teacherId: "", subjectId: "", classId: "", notes: "" });
      fetchTeacherAssignments();
    } catch (err: unknown) {
      const e = err as Error;
      setAlertMsg({ type: "error", text: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Revoke Teacher Assignment
  const handleRevokeTeacher = async (assignmentId: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই শিক্ষকের দায়িত্ব প্রত্যাহার করতে চান?")) return;
    try {
      const res = await fetch(`/api/v1/admin/teachers/assignments?id=${assignmentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "দায়িত্ব প্রত্যাহার ব্যর্থ হয়েছে");
      }
      setAlertMsg({ type: "success", text: "শিক্ষকের দায়িত্ব প্রত্যাহার করা হয়েছে।" });
      fetchTeacherAssignments();
    } catch (err: unknown) {
      const e = err as Error;
      setAlertMsg({ type: "error", text: e.message });
    }
  };

  // Enroll Student Submission
  const handleEnrollStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/admin/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrollForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "শিক্ষার্থী ভর্তি ব্যর্থ হয়েছে");
      }
      setAlertMsg({ type: "success", text: "শিক্ষার্থী সফলভাবে শ্রেণিতে ভর্তি করা হয়েছে।" });
      setShowEnrollModal(false);
      setEnrollForm({
        studentId: "",
        classId: "",
        academicYear: "2025-2026",
        rollNumber: "",
        notes: "",
      });
      fetchClassEnrollments();
    } catch (err: unknown) {
      const e = err as Error;
      setAlertMsg({ type: "error", text: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Transfer Student Submission
  const handleTransferStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/admin/enrollments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transferForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "শ্রেণি পরিবর্তন/বদলি ব্যর্থ হয়েছে");
      }
      setAlertMsg({ type: "success", text: "শিক্ষার্থীর শ্রেণি পরিবর্তন সফলভাবে সম্পন্ন হয়েছে।" });
      setShowTransferModal(false);
      setTransferForm({
        studentId: "",
        fromClassId: "",
        toClassId: "",
        reason: "",
        academicYear: "2025-2026",
      });
      fetchClassEnrollments();
    } catch (err: unknown) {
      const e = err as Error;
      setAlertMsg({ type: "error", text: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-emerald-600" />
            <span>কারিকুলাম ও অ্যাকাডেমিক প্রশাসন (Curriculum & Academic Structure)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            এসএসসি ও এইচএসসি বিষয়, অধ্যায়, শিক্ষক দায়িত্ব বণ্টন ও শিক্ষার্থী ভর্তি পরিচালনা করুন।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchOverview();
              if (selectedSubjectId) fetchChaptersForSubject(selectedSubjectId);
              if (activeTab === "teachers") fetchTeacherAssignments();
              if (activeTab === "enrollments") fetchClassEnrollments();
            }}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition"
            title="রিফ্রেশ"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
          {activeTab === "teachers" ? (
            <button
              onClick={() => {
                if (subjects.length > 0) {
                  setTeacherForm((prev) => ({ ...prev, subjectId: subjects[0].id }));
                }
                setShowAssignTeacherModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <UserCheck className="w-4 h-4" />
              <span>শিক্ষক দায়িত্ব অর্পণ</span>
            </button>
          ) : activeTab === "enrollments" ? null : (
            <button
              onClick={() => {
                setFormData({});
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>
                {activeTab === "classes"
                  ? "নতুন শ্রেণি"
                  : activeTab === "groups"
                  ? "নতুন বিভাগ / গ্রুপ"
                  : activeTab === "subjects"
                  ? "নতুন বিষয়"
                  : activeTab === "chapters"
                  ? "নতুন অধ্যায়"
                  : "নতুন বোর্ড"}
              </span>
            </button>
          )}
        </div>
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
          <button
            onClick={() => setAlertMsg(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Tab Selectors */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("subjects")}
          className={`px-3.5 py-1.5 rounded-lg transition ${
            activeTab === "subjects" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          বিষয়সমূহ ({subjects.length})
        </button>
        <button
          onClick={() => setActiveTab("classes")}
          className={`px-3.5 py-1.5 rounded-lg transition ${
            activeTab === "classes" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          শ্রেণি সমূহ ({classes.length})
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          className={`px-3.5 py-1.5 rounded-lg transition ${
            activeTab === "groups" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          বিভাগ / গ্রুপসমূহ ({groups.length})
        </button>
        <button
          onClick={() => setActiveTab("chapters")}
          className={`px-3.5 py-1.5 rounded-lg transition ${
            activeTab === "chapters" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          অধ্যায়সমূহ ({chapters.length})
        </button>
        <button
          onClick={() => setActiveTab("boards")}
          className={`px-3.5 py-1.5 rounded-lg transition ${
            activeTab === "boards" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          শিক্ষা বোর্ডসমূহ ({boards.length})
        </button>
        <button
          onClick={() => setActiveTab("teachers")}
          className={`px-3.5 py-1.5 rounded-lg transition ${
            activeTab === "teachers" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          শিক্ষক দায়িত্ব বণ্টন ({teacherAssignments.length})
        </button>
        <button
          onClick={() => setActiveTab("enrollments")}
          className={`px-3.5 py-1.5 rounded-lg transition ${
            activeTab === "enrollments" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          শ্রেণি ভর্তি ও বদলি ({classEnrollments.length})
        </button>
      </div>

      {/* SUBJECTS TAB */}
      {activeTab === "subjects" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="বিষয়ের নাম বা কোড অনুসন্ধান..."
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:border-emerald-600 outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={subjectCategoryFilter}
                onChange={(e) => setSubjectCategoryFilter(e.target.value)}
                className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 outline-none focus:border-emerald-600"
              >
                <option value="">সকল ক্যাটাগরি</option>
                <option value="HSC">HSC</option>
                <option value="SSC">SSC</option>
                <option value="MEDICAL">MEDICAL</option>
                <option value="UNIVERSITY">UNIVERSITY</option>
              </select>

              <select
                value={subjectClassFilter}
                onChange={(e) => setSubjectClassFilter(e.target.value)}
                className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 outline-none focus:border-emerald-600"
              >
                <option value="">সকল শ্রেণি</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.nameBn}
                  </option>
                ))}
              </select>

              <select
                value={subjectGroupFilter}
                onChange={(e) => setSubjectGroupFilter(e.target.value)}
                className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 outline-none focus:border-emerald-600"
              >
                <option value="">সকল বিভাগ / গ্রুপ</option>
                {groups.map((grp) => (
                  <option key={grp.id} value={grp.id}>
                    {grp.nameBn}
                  </option>
                ))}
              </select>

              {(subjectSearch || subjectCategoryFilter || subjectClassFilter || subjectGroupFilter) && (
                <button
                  onClick={() => {
                    setSubjectSearch("");
                    setSubjectCategoryFilter("");
                    setSubjectClassFilter("");
                    setSubjectGroupFilter("");
                  }}
                  className="px-2 py-1 text-slate-500 hover:text-slate-800 underline font-medium"
                >
                  রিসেট
                </button>
              )}
            </div>

            <div className="text-slate-500 font-medium">
              মোট বিষয়: <span className="font-bold text-slate-800">{filteredSubjects.length}</span> টি
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">কোড</th>
                  <th className="p-3">বিষয়ের নাম (বাংলা)</th>
                  <th className="p-3">বিষয়ের নাম (ইংরেজি)</th>
                  <th className="p-3">ক্যাটাগরি</th>
                  <th className="p-3">শ্রেণি</th>
                  <th className="p-3">বিভাগ / গ্রুপ</th>
                  <th className="p-3">পত্র (Papers)</th>
                  <th className="p-3">অধ্যায় সংখ্যা</th>
                  <th className="p-3">প্রশ্ন সংখ্যা</th>
                  <th className="p-3">স্ট্যাটাস</th>
                  <th className="p-3 text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-6 text-center text-slate-400">
                      কোনো বিষয় পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-mono font-bold text-slate-800">{s.code}</td>
                      <td className="p-3 font-semibold text-slate-900">{s.nameBn}</td>
                      <td className="p-3 text-slate-500">{s.nameEn}</td>
                      <td className="p-3 font-medium text-emerald-700">{s.category}</td>
                      <td className="p-3">
                        {s.academicClass ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-medium">
                            {s.academicClass.nameBn}
                          </span>
                        ) : (
                          <span className="text-slate-400">সাধারণ</span>
                        )}
                      </td>
                      <td className="p-3">
                        {s.academicGroup ? (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[11px] font-medium">
                            {s.academicGroup.nameBn}
                          </span>
                        ) : (
                          <span className="text-slate-400">সর্বজনীন</span>
                        )}
                      </td>
                      <td className="p-3">
                        {s.papers && s.papers.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {s.papers.map((p) => (
                              <span
                                key={p.id}
                                className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px]"
                              >
                                {p.nameBn}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">একক পত্র</span>
                        )}
                      </td>
                      <td className="p-3 font-medium text-slate-700">{s.chapters?.length || 0} টি</td>
                      <td className="p-3 font-semibold text-emerald-700">{s._count?.questions || 0} টি</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleActive("subject", s.id, s.isActive)}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition ${
                            s.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {s.isActive ? "সক্রিয়" : "আর্কাইভড"}
                        </button>
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedSubjectId(s.id);
                            setActiveTab("chapters");
                          }}
                          className="px-2 py-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded font-semibold text-xs transition"
                        >
                          অধ্যায় &rarr;
                        </button>
                        <button
                          onClick={() => handleOpenEdit("subject", s)}
                          className="px-2 py-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition text-xs font-medium inline-flex items-center gap-1"
                          title="সম্পাদনা করুন"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>সম্পাদনা</span>
                        </button>
                        <button
                          onClick={() => handleDelete("subject", s.id)}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition inline-block"
                          title="মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CHAPTERS TAB */}
      {activeTab === "chapters" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">বিষয় নির্বাচন করুন:</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium text-slate-800 outline-none"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.nameBn} ({sub.code})
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">অধ্যায় নং</th>
                  <th className="p-3">অধ্যায়ের নাম (বাংলা)</th>
                  <th className="p-3">অধ্যায়ের নাম (ইংরেজি)</th>
                  <th className="p-3">টপিক সংখ্যা</th>
                  <th className="p-3">প্রশ্ন সংখ্যা</th>
                  <th className="p-3">স্ট্যাটাস</th>
                  <th className="p-3 text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {chapters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-slate-400">
                      এই বিষয়ের অধীনে কোনো অধ্যায় পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  chapters.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-mono font-bold text-slate-800">{c.chapterNum}</td>
                      <td className="p-3 font-semibold text-slate-900">{c.nameBn}</td>
                      <td className="p-3 text-slate-500">{c.nameEn}</td>
                      <td className="p-3 text-slate-600">{c._count?.topics || 0} টি</td>
                      <td className="p-3 font-semibold text-emerald-700">{c._count?.questions || 0} টি</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleActive("chapter", c.id, c.isActive)}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition ${
                            c.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {c.isActive ? "সক্রিয়" : "আর্কাইভড"}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDelete("chapter", c.id)}
                          className="text-rose-600 hover:text-rose-800"
                          title="মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CLASSES TAB */}
      {activeTab === "classes" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="শ্রেণির নাম বা কোড অনুসন্ধান..."
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:border-emerald-600 outline-none"
              />
            </div>
            <div className="text-slate-500 font-medium">
              মোট অ্যাকাডেমিক শ্রেণি: <span className="font-bold text-slate-800">{filteredClasses.length}</span> টি
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">কোড</th>
                  <th className="p-3">শ্রেণির নাম (বাংলা)</th>
                  <th className="p-3">শ্রেণির নাম (ইংরেজি)</th>
                  <th className="p-3">ক্রমিক সূচক</th>
                  <th className="p-3">বিষয় সংখ্যা</th>
                  <th className="p-3">স্ট্যাটাস</th>
                  <th className="p-3 text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredClasses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      কোনো অ্যাকাডেমিক শ্রেণি পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredClasses.map((cls) => (
                    <tr key={cls.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-mono font-bold text-slate-800">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-800">
                          {cls.code}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-900">{cls.nameBn}</td>
                      <td className="p-3 text-slate-500">{cls.nameEn}</td>
                      <td className="p-3">{cls.orderIndex}</td>
                      <td className="p-3 font-semibold text-emerald-700">{cls.subjects?.length || 0} টি</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleActive("class", cls.id, cls.isActive)}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition ${
                            cls.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {cls.isActive ? "সক্রিয়" : "আর্কাইভড"}
                        </button>
                      </td>
                      <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit("class", cls)}
                          className="px-2 py-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition text-xs font-medium inline-flex items-center gap-1"
                          title="সম্পাদনা করুন"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>সম্পাদনা</span>
                        </button>
                        <button
                          onClick={() => handleDelete("class", cls.id)}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition inline-block"
                          title="মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GROUPS TAB */}
      {activeTab === "groups" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="গ্রুপের নাম বা কোড অনুসন্ধান..."
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:border-emerald-600 outline-none"
              />
            </div>
            <div className="text-slate-500 font-medium">
              মোট অ্যাকাডেমিক বিভাগ / গ্রুপ: <span className="font-bold text-slate-800">{filteredGroups.length}</span> টি
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">কোড</th>
                  <th className="p-3">বিভাগ / গ্রুপের নাম (বাংলা)</th>
                  <th className="p-3">গ্রুপের নাম (ইংরেজি)</th>
                  <th className="p-3">ক্রমিক সূচক</th>
                  <th className="p-3">সংযুক্ত বিষয় সংখ্যা</th>
                  <th className="p-3">স্ট্যাটাস</th>
                  <th className="p-3 text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      কোনো অ্যাকাডেমিক বিভাগ / গ্রুপ পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((grp) => (
                    <tr key={grp.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-mono font-bold text-slate-800">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-800">
                          {grp.code}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-900">{grp.nameBn}</td>
                      <td className="p-3 text-slate-500">{grp.nameEn}</td>
                      <td className="p-3">{grp.orderIndex}</td>
                      <td className="p-3 font-semibold text-emerald-700">
                        {grp.subjects?.length ?? grp._count?.subjects ?? 0} টি
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleActive("group", grp.id, grp.isActive)}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition ${
                            grp.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {grp.isActive ? "সক্রিয়" : "আর্কাইভড"}
                        </button>
                      </td>
                      <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit("group", grp)}
                          className="px-2 py-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition text-xs font-medium inline-flex items-center gap-1"
                          title="সম্পাদনা করুন"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>সম্পাদনা</span>
                        </button>
                        <button
                          onClick={() => handleDelete("group", grp.id)}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition inline-block"
                          title="মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BOARDS TAB */}
      {activeTab === "boards" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">বোর্ড কোড</th>
                <th className="p-3">বোর্ডের নাম (বাংলা)</th>
                <th className="p-3">বোর্ডের নাম (ইংরেজি)</th>
                <th className="p-3">প্রশ্ন রেফারেন্স</th>
                <th className="p-3">স্ট্যাটাস</th>
                <th className="p-3 text-right">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {boards.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/60">
                  <td className="p-3 font-mono font-bold text-slate-800">{b.code}</td>
                  <td className="p-3 font-semibold text-slate-900">{b.nameBn}</td>
                  <td className="p-3 text-slate-500">{b.nameEn}</td>
                  <td className="p-3 font-semibold text-emerald-700">
                    {b._count?.questionReferences || 0} টি
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleToggleActive("board", b.id, b.isActive)}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition ${
                        b.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {b.isActive ? "সক্রিয়" : "আর্কাইভড"}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDelete("board", b.id)}
                      className="text-rose-600 hover:text-rose-800"
                      title="মুছুন"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TEACHER ASSIGNMENTS TAB */}
      {activeTab === "teachers" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">শিক্ষক (Teacher)</th>
                <th className="p-3">নিযুক্ত বিষয় (Assigned Subject)</th>
                <th className="p-3">শ্রেণি (Class)</th>
                <th className="p-3">অর্পণ তারিখ (Date)</th>
                <th className="p-3">স্ট্যাটাস</th>
                <th className="p-3 text-right">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {teacherAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    এখনো কোনো শিক্ষকের দায়িত্ব অর্পণ করা হয়নি।
                  </td>
                </tr>
              ) : (
                teacherAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{a.teacher.fullName}</div>
                      <div className="text-[11px] text-slate-500">{a.teacher.email}</div>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-emerald-800">
                        {a.subject.nameBn} ({a.subject.code})
                      </span>
                      <div className="text-[10px] text-slate-500">{a.subject.category}</div>
                    </td>
                    <td className="p-3">
                      {a.academicClass ? (
                        <span className="font-semibold text-slate-700">
                          {a.academicClass.nameBn}
                        </span>
                      ) : (
                        <span className="text-slate-400">সকল শ্রেণি (All Classes)</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500">
                      {new Date(a.assignedAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          a.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {a.isActive ? "সক্রিয়" : "প্রত্যাহারকৃত"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {a.isActive && (
                        <button
                          onClick={() => handleRevokeTeacher(a.id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition"
                        >
                          প্রত্যাহার (Revoke)
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* STUDENT ENROLLMENTS TAB */}
      {activeTab === "enrollments" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">শিক্ষার্থী (Student)</th>
                <th className="p-3">ভর্তি শ্রেণি (Class)</th>
                <th className="p-3">সেশন (Year)</th>
                <th className="p-3">রোল নং</th>
                <th className="p-3">ভর্তির তারিখ</th>
                <th className="p-3">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {classEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    এখনো কোনো শ্রেণি ভর্তি রেকর্ড নেই।
                  </td>
                </tr>
              ) : (
                classEnrollments.map((enr) => (
                  <tr key={enr.id} className="hover:bg-slate-50/60">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{enr.student.fullName}</div>
                      <div className="text-[11px] text-slate-500">{enr.student.email}</div>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {enr.academicClass.nameBn} ({enr.academicClass.code})
                    </td>
                    <td className="p-3 text-slate-600">{enr.academicYear}</td>
                    <td className="p-3 font-mono">{enr.rollNumber || "N/A"}</td>
                    <td className="p-3 text-slate-500">
                      {new Date(enr.enrolledAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          enr.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-800"
                            : enr.status === "TRANSFERRED"
                            ? "bg-blue-50 text-blue-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {enr.status}
                      </span>
                      {enr.transferReason && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {enr.transferReason}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: Add Standard Curriculum Item */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b pb-2">
              {activeTab === "classes"
                ? "নতুন অ্যাকাডেমিক শ্রেণি যোগ করুন"
                : activeTab === "groups"
                ? "নতুন অ্যাকাডেমিক বিভাগ / গ্রুপ যোগ করুন"
                : activeTab === "subjects"
                ? "নতুন বিষয় যোগ করুন"
                : activeTab === "chapters"
                ? "নতুন অধ্যায় যোগ করুন"
                : "নতুন বোর্ড যোগ করুন"}
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              {activeTab === "classes" && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      শ্রেণি কোড (যেমন: CLASS_9, CLASS_10, CLASS_11, CLASS_12)
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code || ""}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="CLASS_11"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">শ্রেণির নাম (বাংলা)</label>
                    <input
                      type="text"
                      required
                      value={formData.nameBn || ""}
                      onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
                      placeholder="একাদশ শ্রেণি"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">শ্রেণির নাম (ইংরেজি)</label>
                    <input
                      type="text"
                      required
                      value={formData.nameEn || ""}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="Class 11"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ক্রমিক সূচক (Order Index)</label>
                    <input
                      type="number"
                      value={formData.orderIndex ?? (classes.length + 9)}
                      onChange={(e) =>
                        setFormData({ ...formData, orderIndex: parseInt(e.target.value, 10) })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
                  </div>
                </>
              )}

              {activeTab === "groups" && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      গ্রুপ কোড (যেমন: SCIENCE, COMMERCE, HUMANITIES, VOCATIONAL)
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code || ""}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="SCIENCE"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">গ্রুপ / বিভাগের নাম (বাংলা)</label>
                    <input
                      type="text"
                      required
                      value={formData.nameBn || ""}
                      onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
                      placeholder="বিজ্ঞান বিভাগ"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">গ্রুপের নাম (ইংরেজি)</label>
                    <input
                      type="text"
                      required
                      value={formData.nameEn || ""}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="Science Group"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ক্রমিক সূচক (Order Index)</label>
                    <input
                      type="number"
                      value={formData.orderIndex ?? (groups.length + 1)}
                      onChange={(e) =>
                        setFormData({ ...formData, orderIndex: parseInt(e.target.value, 10) })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
                  </div>
                </>
              )}

              {activeTab === "subjects" && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      বিষয় কোড (যেমন: PHY_1, CHEM_1, BIO_1)
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code || ""}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="PHY_1"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">বিষয়ের নাম (বাংলা)</label>
                    <input
                      type="text"
                      required
                      value={formData.nameBn || ""}
                      onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
                      placeholder="পদার্থবিজ্ঞান ১ম পত্র"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">বিষয়ের নাম (ইংরেজি)</label>
                    <input
                      type="text"
                      required
                      value={formData.nameEn || ""}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="Physics 1st Paper"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ক্যাটাগরি</label>
                    <select
                      value={formData.category || "HSC"}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                    >
                      <option value="HSC">HSC</option>
                      <option value="SSC">SSC</option>
                      <option value="MEDICAL">MEDICAL</option>
                      <option value="UNIVERSITY">UNIVERSITY</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">শ্রেণি (ঐচ্ছিক)</label>
                    <select
                      value={formData.classId || ""}
                      onChange={(e) => setFormData({ ...formData, classId: e.target.value || null })}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                    >
                      <option value="">কোনো শ্রেণি নেই (সাধারণ)</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.nameBn}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">বিভাগ / গ্রুপ (ঐচ্ছিক)</label>
                    <select
                      value={formData.groupId || ""}
                      onChange={(e) => setFormData({ ...formData, groupId: e.target.value || null })}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                    >
                      <option value="">কোনো নির্দিষ্ট গ্রুপ নেই (সাধারণ / সর্বজনীন)</option>
                      {groups.map((grp) => (
                        <option key={grp.id} value={grp.id}>
                          {grp.nameBn} ({grp.nameEn})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {activeTab === "chapters" && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">অধ্যায় নম্বর</label>
                    <input
                      type="number"
                      required
                      value={formData.chapterNum || 1}
                      onChange={(e) =>
                        setFormData({ ...formData, chapterNum: parseInt(e.target.value, 10) })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">অধ্যায়ের নাম (বাংলা)</label>
                    <input
                      type="text"
                      required
                      value={formData.nameBn || ""}
                      onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
                      placeholder="ভেক্টর"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">অধ্যায়ের নাম (ইংরেজি)</label>
                    <input
                      type="text"
                      required
                      value={formData.nameEn || ""}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="Vector"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
                  </div>
                </>
              )}

              {activeTab === "boards" && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      বোর্ড কোড (যেমন: DHA, RAJ, CTG)
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code || ""}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">বোর্ডের নাম (বাংলা)</label>
                    <input
                      type="text"
                      required
                      value={formData.nameBn || ""}
                      onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
                      placeholder="ঢাকা শিক্ষা বোর্ড"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">বোর্ডের নাম (ইংরেজি)</label>
                    <input
                      type="text"
                      required
                      value={formData.nameEn || ""}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="Dhaka Education Board"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {submitting ? "তৈরি হচ্ছে..." : "সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Academic Item (Class, Group, Subject) */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-emerald-600" />
                <span>
                  {editingEntity === "class"
                    ? "অ্যাকাডেমিক শ্রেণি সম্পাদনা"
                    : editingEntity === "group"
                    ? "অ্যাকাডেমিক বিভাগ / গ্রুপ সম্পাদনা"
                    : "বিষয় সম্পাদনা"}
                </span>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">কোড (Code)</label>
                <input
                  type="text"
                  required
                  value={editFormData.code || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">নাম (বাংলা)</label>
                <input
                  type="text"
                  required
                  value={editFormData.nameBn || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, nameBn: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">নাম (ইংরেজি)</label>
                <input
                  type="text"
                  required
                  value={editFormData.nameEn || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, nameEn: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>

              {editingEntity === "subject" && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ক্যাটাগরি</label>
                    <select
                      value={editFormData.category || "HSC"}
                      onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                    >
                      <option value="HSC">HSC</option>
                      <option value="SSC">SSC</option>
                      <option value="MEDICAL">MEDICAL</option>
                      <option value="UNIVERSITY">UNIVERSITY</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">শ্রেণি (ঐচ্ছিক)</label>
                    <select
                      value={editFormData.classId || ""}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, classId: e.target.value || null })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                    >
                      <option value="">কোনো শ্রেণি নেই (সাধারণ)</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.nameBn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">বিভাগ / গ্রুপ (ঐচ্ছিক)</label>
                    <select
                      value={editFormData.groupId || ""}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, groupId: e.target.value || null })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                    >
                      <option value="">কোনো নির্দিষ্ট গ্রুপ নেই (সাধারণ / সর্বজনীন)</option>
                      {groups.map((grp) => (
                        <option key={grp.id} value={grp.id}>
                          {grp.nameBn} ({grp.nameEn})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ক্রমিক সূচক (Order Index)</label>
                <input
                  type="number"
                  value={editFormData.orderIndex ?? 0}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, orderIndex: parseInt(e.target.value, 10) })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {submitting ? "সংরক্ষণ হচ্ছে..." : "আপডেট সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Assign Teacher */}
      {showAssignTeacherModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span>শিক্ষকের দায়িত্ব অর্পণ করুন (Assign Teacher)</span>
              </h3>
              <button
                onClick={() => setShowAssignTeacherModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignTeacherSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  শিক্ষকের আইডি (Teacher ID) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. user uuid from user management"
                  value={teacherForm.teacherId}
                  onChange={(e) => setTeacherForm({ ...teacherForm, teacherId: e.target.value.trim() })}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  নিযুক্ত বিষয় (Subject) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={teacherForm.subjectId}
                  onChange={(e) => setTeacherForm({ ...teacherForm, subjectId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="">বিষয় নির্বাচন করুন</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.nameBn} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  নির্দিষ্ট শ্রেণি (Class - ঐচ্ছিক)
                </label>
                <select
                  value={teacherForm.classId}
                  onChange={(e) => setTeacherForm({ ...teacherForm, classId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="">সকল শ্রেণি (All Classes)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameBn} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">দায়িত্বের নোট</label>
                <input
                  type="text"
                  placeholder="e.g. Lead HSC Physics Question Author"
                  value={teacherForm.notes}
                  onChange={(e) => setTeacherForm({ ...teacherForm, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAssignTeacherModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {submitting ? "সংরক্ষণ হচ্ছে..." : "দায়িত্ব অর্পণ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Enroll Student */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
                <span>শিক্ষার্থী শ্রেণি ভর্তি (Enroll Student)</span>
              </h3>
              <button
                onClick={() => setShowEnrollModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollStudentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  শিক্ষার্থীর আইডি (Student ID) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. student uuid"
                  value={enrollForm.studentId}
                  onChange={(e) => setEnrollForm({ ...enrollForm, studentId: e.target.value.trim() })}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ভর্তি শ্রেণি (Class) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={enrollForm.classId}
                  onChange={(e) => setEnrollForm({ ...enrollForm, classId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="">শ্রেণি নির্বাচন করুন</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.nameBn} ({cls.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">শিক্ষাবর্ষ (Academic Year)</label>
                  <input
                    type="text"
                    required
                    value={enrollForm.academicYear}
                    onChange={(e) => setEnrollForm({ ...enrollForm, academicYear: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">রোল নম্বর</label>
                  <input
                    type="text"
                    placeholder="e.g. 101"
                    value={enrollForm.rollNumber}
                    onChange={(e) => setEnrollForm({ ...enrollForm, rollNumber: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {submitting ? "ভর্তি হচ্ছে..." : "ভর্তি সম্পন্ন করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Transfer Student */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                <span>শিক্ষার্থীর শ্রেণি বদলি (Class Transfer)</span>
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferStudentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  শিক্ষার্থীর আইডি (Student ID) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. student uuid"
                  value={transferForm.studentId}
                  onChange={(e) => setTransferForm({ ...transferForm, studentId: e.target.value.trim() })}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">বর্তমান শ্রেণি (From)</label>
                  <select
                    required
                    value={transferForm.fromClassId}
                    onChange={(e) => setTransferForm({ ...transferForm, fromClassId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="">বর্তমান শ্রেণি</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.nameBn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">নতুন শ্রেণি (To)</label>
                  <select
                    required
                    value={transferForm.toClassId}
                    onChange={(e) => setTransferForm({ ...transferForm, toClassId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="">নতুন শ্রেণি</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.nameBn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">বদলির কারণ (Reason)</label>
                <input
                  type="text"
                  placeholder="e.g. Promoted to next academic year"
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {submitting ? "বদলি হচ্ছে..." : "বদলি সম্পন্ন করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
