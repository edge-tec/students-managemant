"use client";

import React, { useState, useEffect, useCallback } from "react";
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

interface Subject {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  category: "SSC" | "HSC" | "MEDICAL" | "UNIVERSITY";
  classId?: string | null;
  class?: { nameBn: string };
  isActive: boolean;
  papers?: { id: string; paperNumber: number; nameBn: string }[];
  chapters?: { id: string; chapterNum: number; nameBn: string; _count?: { questions: number } }[];
  _count?: { questions: number };
}

interface Paper {
  id: string;
  subjectId: string;
  paperNumber: number;
  nameBn: string;
  nameEn: string;
  isActive: boolean;
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

interface Topic {
  id: string;
  chapterId: string;
  nameBn: string;
  nameEn: string;
  isActive: boolean;
  _count?: { questions: number };
}

interface Board {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  isActive: boolean;
  _count?: { questionReferences: number };
}

export function CurriculumManager() {
  const [activeTab, setActiveTab] = useState<"classes" | "subjects" | "chapters" | "boards">("subjects");
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal / Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/curriculum?onlyActive=false");
      const data = await res.json();
      setClasses(data.classes || []);
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
      const res = await fetch(`/api/v1/admin/curriculum?entity=chapters&subjectId=${subjectId}&onlyActive=false`);
      const data = await res.json();
      setChapters(data.chapters || []);
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
    }
  }, [activeTab, selectedSubjectId, fetchChaptersForSubject]);

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
    } catch (err: any) {
      setAlertMsg({ type: "error", text: err.message });
    }
  };

  const handleDelete = async (entity: string, id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই রেকর্ডটি ডিলিট করতে চান? কোনো প্রশ্ন বা নির্ভরতা থাকলে সিস্টেম ডিলিট প্রতিরোধ করবে।")) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/curriculum?entity=${entity}&id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertMsg({ type: "error", text: data.error || "ডিলিট ব্যর্থ হয়েছে।" });
      } else {
        setAlertMsg({ type: "success", text: "সফলভাবে মুছে ফেলা হয়েছে।" });
        fetchOverview();
        if (selectedSubjectId) fetchChaptersForSubject(selectedSubjectId);
      }
    } catch (err: any) {
      setAlertMsg({ type: "error", text: err.message });
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAlertMsg(null);

    let entity = "subject";
    if (activeTab === "classes") entity = "class";
    if (activeTab === "chapters") entity = "chapter";
    if (activeTab === "boards") entity = "board";

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
    } catch (err: any) {
      setAlertMsg({ type: "error", text: err.message });
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
            <span>কারিকুলাম ব্যবস্থাপনা (Curriculum Management)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            এসএসসি (৯ম-১০ম) এবং এইচএসসি (১১শ-১২শ, ১ম ও ২য় পত্র) বিষয়, অধ্যায় ও বোর্ড পরিচালনা করুন।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchOverview();
              if (selectedSubjectId) fetchChaptersForSubject(selectedSubjectId);
            }}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition"
            title="রিফ্রেশ"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
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
                : activeTab === "subjects"
                ? "নতুন বিষয়"
                : activeTab === "chapters"
                ? "নতুন অধ্যায়"
                : "নতুন বোর্ড"}
            </span>
          </button>
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
          <button onClick={() => setAlertMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-2">
            &times;
          </button>
        </div>
      )}

      {/* Tab Selectors */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("subjects")}
          className={`px-3.5 py-1.5 rounded-lg transition ${
            activeTab === "subjects"
              ? "bg-emerald-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          বিষয়সমূহ ({subjects.length})
        </button>
        <button
          onClick={() => setActiveTab("chapters")}
          className={`px-3.5 py-1.5 rounded-lg transition ${
            activeTab === "chapters"
              ? "bg-emerald-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          অধ্যায়সমূহ ({chapters.length})
        </button>
        <button
          onClick={() => setActiveTab("classes")}
          className={`px-3.5 py-1.5 rounded-lg transition ${
            activeTab === "classes"
              ? "bg-emerald-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          শ্রেণি সমূহ ({classes.length})
        </button>
        <button
          onClick={() => setActiveTab("boards")}
          className={`px-3.5 py-1.5 rounded-lg transition ${
            activeTab === "boards"
              ? "bg-emerald-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          শিক্ষা বোর্ডসমূহ ({boards.length})
        </button>
      </div>

      {/* SUBJECTS TAB */}
      {activeTab === "subjects" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">কোড</th>
                <th className="p-3">বিষয়ের নাম (বাংলা)</th>
                <th className="p-3">বিষয়ের নাম (ইংরেজি)</th>
                <th className="p-3">ক্যাটাগরি</th>
                <th className="p-3">পত্র (Papers)</th>
                <th className="p-3">অধ্যায় সংখ্যা</th>
                <th className="p-3">প্রশ্ন সংখ্যা</th>
                <th className="p-3">স্ট্যাটাস</th>
                <th className="p-3 text-right">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {subjects.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="p-3 font-mono font-bold text-emerald-800">{s.code}</td>
                  <td className="p-3 font-medium">{s.nameBn}</td>
                  <td className="p-3 text-slate-500">{s.nameEn}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      {s.category}
                    </span>
                  </td>
                  <td className="p-3">
                    {s.papers && s.papers.length > 0 ? (
                      <span className="text-emerald-700 font-semibold">{s.papers.map((p) => p.nameBn).join(", ")}</span>
                    ) : (
                      <span className="text-slate-400">১ম পত্র</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">{s.chapters?.length || 0} টি</td>
                  <td className="p-3 font-semibold text-slate-700">{s._count?.questions || 0}</td>
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
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => {
                        setSelectedSubjectId(s.id);
                        setActiveTab("chapters");
                      }}
                      className="text-emerald-600 hover:text-emerald-800 font-semibold"
                    >
                      অধ্যায়সমূহ
                    </button>
                    <button
                      onClick={() => handleDelete("subject", s.id)}
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

      {/* CHAPTERS TAB */}
      {activeTab === "chapters" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-700">বিষয় নির্বাচন করুন:</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                fetchChaptersForSubject(e.target.value);
              }}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 font-medium outline-none focus:border-emerald-600"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameBn} ({s.code}) - {s.category}
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
                  <th className="p-3">প্রশ্ন সংখ্যা</th>
                  <th className="p-3">স্ট্যাটাস</th>
                  <th className="p-3 text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {chapters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      এই বিষয়ে এখনও কোনো অধ্যায় যুক্ত করা হয়নি।
                    </td>
                  </tr>
                ) : (
                  chapters.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-bold text-slate-700">অধ্যায় {c.chapterNum}</td>
                      <td className="p-3 font-medium">{c.nameBn}</td>
                      <td className="p-3 text-slate-500">{c.nameEn}</td>
                      <td className="p-3 font-semibold text-slate-700">{c._count?.questions || 0}</td>
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
              {classes.map((cls) => (
                <tr key={cls.id} className="hover:bg-slate-50/60">
                  <td className="p-3 font-mono font-bold text-slate-800">{cls.code}</td>
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
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDelete("class", cls.id)}
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

      {/* BOARDS TAB */}
      {activeTab === "boards" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">কোড</th>
                <th className="p-3">বোর্ডের নাম (বাংলা)</th>
                <th className="p-3">বোর্ডের নাম (ইংরেজি)</th>
                <th className="p-3">সংযুক্ত প্রশ্নসংখ্যা</th>
                <th className="p-3">স্ট্যাটাস</th>
                <th className="p-3 text-right">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {boards.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/60">
                  <td className="p-3 font-mono font-bold text-indigo-700">{b.code}</td>
                  <td className="p-3 font-medium text-slate-900">{b.nameBn}</td>
                  <td className="p-3 text-slate-500">{b.nameEn}</td>
                  <td className="p-3 font-semibold text-slate-700">{b._count?.questionReferences || 0}</td>
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                {activeTab === "classes"
                  ? "নতুন শ্রেণি তৈরি করুন"
                  : activeTab === "subjects"
                  ? "নতুন বিষয় তৈরি করুন"
                  : activeTab === "chapters"
                  ? "নতুন অধ্যায় তৈরি করুন"
                  : "নতুন শিক্ষা বোর্ড যোগ করুন"}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              {activeTab === "classes" && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">কোড (যেমন: CLASS_9)</label>
                    <input
                      type="text"
                      required
                      value={formData.code || ""}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">নাম (বাংলা)</label>
                    <input
                      type="text"
                      required
                      value={formData.nameBn || ""}
                      onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
                      placeholder="নবম শ্রেণি"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">নাম (ইংরেজি)</label>
                    <input
                      type="text"
                      required
                      value={formData.nameEn || ""}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="Class 9"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
                  </div>
                </>
              )}

              {activeTab === "subjects" && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ক্যাটাগরি</label>
                    <select
                      value={formData.category || "HSC"}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                    >
                      <option value="SSC">SSC (মাধ্যমিক)</option>
                      <option value="HSC">HSC (উচ্চ মাধ্যমিক)</option>
                      <option value="MEDICAL">Medical Admission</option>
                      <option value="UNIVERSITY">University Admission</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">শ্রেণি (ঐচ্ছিক)</label>
                    <select
                      value={formData.classId || ""}
                      onChange={(e) => setFormData({ ...formData, classId: e.target.value || null })}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 bg-white"
                    >
                      <option value="">কোনো শ্রেণি নির্ধারিত নয়</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameBn} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">কোড (যেমন: PHY_1, MATH_2)</label>
                    <input
                      type="text"
                      required
                      value={formData.code || ""}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">নাম (বাংলা)</label>
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
                    <label className="block font-semibold text-slate-700 mb-1">নাম (ইংরেজি)</label>
                    <input
                      type="text"
                      required
                      value={formData.nameEn || ""}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="Physics 1st Paper"
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                    />
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
                      min={1}
                      value={formData.chapterNum || 1}
                      onChange={(e) => setFormData({ ...formData, chapterNum: parseInt(e.target.value, 10) })}
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
                    <label className="block font-semibold text-slate-700 mb-1">বোর্ড কোড (যেমন: DHA, RAJ, CTG)</label>
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
    </div>
  );
}
