"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import {
  ShieldAlert,
  Users,
  FileQuestion,
  Layers,
  CreditCard,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  FolderTree,
  BarChart3,
  FileCheck,
  FileText,
  Clock,
  Settings,
  History,
  TrendingUp,
  ExternalLink,
  ChevronRight,
  BookOpen,
  LogOut,
  UserCheck,
} from "lucide-react";
import { CurriculumManager } from "@/components/admin/CurriculumManager";
import { QuestionManager } from "@/components/admin/QuestionManager";
import { ExamManager } from "@/components/admin/ExamManager";
import { ManualGradingManager } from "@/components/admin/ManualGradingManager";
import { UserManager } from "@/components/admin/UserManager";
import { FinanceManager } from "@/components/admin/FinanceManager";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { SettingsManager } from "@/components/admin/SettingsManager";
import { PdfQuestionGeneratorManager } from "@/components/admin/PdfQuestionGeneratorManager";
import { Sparkles } from "lucide-react";

interface AdminAnalytics {
  totalStudents: number;
  activeStudents: number;
  totalQuestions: number;
  draftQuestions: number;
  reviewQuestions: number;
  approvedQuestions: number;
  publishedQuestions: number;
  reviewBacklog: number;
  totalExams: number;
  publishedExams: number;
  totalExamsTaken: number;
  evaluatedExams: number;
  gradingBacklog: number;
  activeSubscriptions: number;
  verifiedRevenueBdt: number;
  pendingPaymentsCount: number;
}

interface SubjectStat {
  id: string;
  name: string;
  count: number;
}

interface AuditLogSummary {
  id: string;
  action: string;
  resource: string;
  actor: string;
  createdAt: string;
}

type AdminTab =
  | "analytics"
  | "users"
  | "curriculum"
  | "questions"
  | "exams"
  | "grading"
  | "pdf-generator"
  | "import"
  | "finance"
  | "audit"
  | "settings";

export default function AdminDashboardPage() {
  const { locale, t, formatCurrency, formatNumber } = useI18n();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>("analytics");
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [subjectBreakdown, setSubjectBreakdown] = useState<SubjectStat[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AuditLogSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Bulk Import state
  const [csvText, setCsvText] = useState("");
  const [importStatus, setImportStatus] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; fullName: string; roles: string[] } | null>(null);

  const fetchDashboardAnalytics = () => {
    // 1. Fetch authenticated admin profile
    fetch("/api/v1/admin/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/admin/login?redirect=/admin");
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});

    // 2. Fetch dashboard analytics
    fetch("/api/v1/admin/analytics")
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.push("/admin/login?redirect=/admin");
          }
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        setAnalytics(data.analytics);
        setSubjectBreakdown(data.subjectBreakdown || []);
        setRecentAuditLogs(data.recentAuditLogs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/admin/auth/logout", { method: "POST" });
    } catch (err) {
      console.error(err);
    }
    router.push("/admin/login");
    router.refresh();
  };

  useEffect(() => {
    fetchDashboardAnalytics();
  }, [router]);

  const handleDownloadTemplate = () => {
    window.location.href = "/api/v1/admin/import";
  };

  const handlePreviewOrImport = async (commit = false) => {
    if (!csvText.trim()) return;
    setIsImporting(true);
    setImportStatus(null);

    try {
      const lines = csvText.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || "";
        });
        return rowObj;
      });

      const res = await fetch("/api/v1/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, commit }),
      });

      const data = await res.json();
      setImportStatus(data);
      setIsImporting(false);

      if (commit && data.success) {
        fetchDashboardAnalytics();
      }
    } catch (err) {
      console.error(err);
      setIsImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500 font-medium">
        {t.common.loading}
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: "analytics", label: "ওভারভিউ ও অ্যানালিটিক্স", icon: BarChart3 },
    { id: "users", label: "শিক্ষার্থী ও স্টাফ", icon: Users },
    { id: "curriculum", label: "কারিকুলাম", icon: FolderTree },
    { id: "questions", label: "প্রশ্নমালা ও কোয়ালিটি রিভিউ", icon: FileQuestion, badge: analytics?.reviewBacklog },
    { id: "exams", label: "পরীক্ষা ব্যবস্থাপনা", icon: FileText },
    { id: "grading", label: "ম্যানুয়াল গ্রেডিং কিউ", icon: FileCheck, badge: analytics?.gradingBacklog },
    { id: "pdf-generator", label: "পিডিএফ এআই প্রশ্ন জেনারেটর", icon: Sparkles },
    { id: "import", label: "বাল্ক CSV ইম্পোর্ট", icon: Upload },
    { id: "finance", label: "পেমেন্ট ও রাজস্ব", icon: CreditCard, badge: analytics?.pendingPaymentsCount },
    { id: "audit", label: "অডিট ট্রেইল", icon: History },
    { id: "settings", label: "পলিসি ও সেটিংস", icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Admin Top Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-700" />
            <span>EduBD Enterprise Control Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {locale === "bn" ? "প্রশাসনিক ও একাডেমিক ব্যবস্থাপনা প্যানেল" : "Administrative & Academic Control Panel"}
          </h1>
          <p className="text-xs text-slate-500">
            Learn • Practice • Test • Succeed — শিক্ষার্থী, শিক্ষক, প্রশ্ন ও পরীক্ষার কেন্দ্রীয় ড্যাশবোর্ড।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>CSV টেমপ্লেট</span>
          </button>
          <a
            href="/api/v1/admin/export?type=questions"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-1.5"
          >
            <ExternalLink className="w-4 h-4" />
            <span>প্রশ্ন এক্সপোর্ট</span>
          </a>

          {currentUser && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="font-bold text-slate-800">{currentUser.fullName}</span>
                <span className="text-[10px] text-slate-400 block font-mono">{currentUser.roles.join(", ")}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="px-3.5 py-2 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="নিরাপদে সাইন আউট করুন"
          >
            <LogOut className="w-4 h-4" />
            <span>লগআউট</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs sm:text-sm font-bold overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 shrink-0 ${
                isActive
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.badge === "number" && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isActive ? "bg-white text-emerald-700" : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ANALYTICS OVERVIEW */}
      {activeTab === "analytics" && analytics && (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>মোট শিক্ষার্থী</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {formatNumber(analytics.totalStudents)}
              </div>
              <div className="text-[10px] text-slate-400">
                সক্রিয় (৩০ দিন): {formatNumber(analytics.activeStudents)} জন
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <FileQuestion className="w-3.5 h-3.5 text-blue-600" />
                <span>সংরক্ষিত প্রশ্ন</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {formatNumber(analytics.totalQuestions)}
              </div>
              <div className="text-[10px] text-slate-400">
                খসড়া: {formatNumber(analytics.draftQuestions)} টি
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>রিভিউ অপেক্ষমাণ</span>
              </div>
              <div className="text-2xl font-extrabold text-amber-600">
                {formatNumber(analytics.reviewBacklog)}
              </div>
              <div className="text-[10px] text-slate-400">
                প্রকাশিত: {formatNumber(analytics.publishedQuestions)} টি
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>অংশগ্রহণকৃত পরীক্ষা</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {formatNumber(analytics.totalExamsTaken)}
              </div>
              <div className="text-[10px] text-slate-400">
                মূল্যায়িত: {formatNumber(analytics.evaluatedExams)} টি
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5 text-rose-600" />
                <span>গ্রেডিং কিউ</span>
              </div>
              <div className="text-2xl font-extrabold text-rose-600">
                {formatNumber(analytics.gradingBacklog)}
              </div>
              <div className="text-[10px] text-slate-400">লিখিত উত্তর পর্যালোচনার অপেক্ষায়</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>যাচাইকৃত রাজস্ব</span>
              </div>
              <div className="text-xl font-extrabold text-emerald-700 truncate">
                {formatCurrency(analytics.verifiedRevenueBdt)}
              </div>
              <div className="text-[10px] text-slate-400">
                অ্যাক্টিভ সদস্য: {formatNumber(analytics.activeSubscriptions)} জন
              </div>
            </div>
          </div>

          {/* Subject Distribution & Recent Audits */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>বিষয়ভিত্তিক প্রশ্ন বণ্টন (Question Coverage)</span>
                </div>
                <button
                  onClick={() => setActiveTab("questions")}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                >
                  <span>সব দেখুন</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </h3>

              {subjectBreakdown.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  কোন বিষয়ের প্রশ্ন ডেটাবেসে পাওয়া যায়নি
                </div>
              ) : (
                <div className="space-y-3">
                  {subjectBreakdown.map((subj) => {
                    const percent =
                      analytics.totalQuestions > 0
                        ? Math.round((subj.count / analytics.totalQuestions) * 100)
                        : 0;
                    return (
                      <div key={subj.id} className="space-y-1 text-xs">
                        <div className="flex justify-between items-center text-slate-700 font-semibold">
                          <span>{subj.name}</span>
                          <span className="font-bold text-slate-900">
                            {formatNumber(subj.count)} টি ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Audit Events */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  <span>সাম্প্রতিক প্রশাসনিক অডিট কার্যকলাপ (Audit Trail)</span>
                </div>
                <button
                  onClick={() => setActiveTab("audit")}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                >
                  <span>সম্পূর্ণ লগ</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </h3>

              {recentAuditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-sans">
                  এখনো কোন অডিট রেকর্ড নেই
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-800">{log.action}</div>
                        <div className="text-[11px] text-slate-500">
                          {log.resource} • {log.actor}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER & STAFF MANAGEMENT */}
      {activeTab === "users" && <UserManager />}

      {/* TAB 3: CURRICULUM MANAGEMENT */}
      {activeTab === "curriculum" && <CurriculumManager />}

      {/* TAB 4: QUESTION MANAGEMENT & QUALITY REVIEW */}
      {activeTab === "questions" && <QuestionManager />}

      {/* TAB 5: EXAMS ENGINE MANAGEMENT */}
      {activeTab === "exams" && <ExamManager />}

      {/* TAB 6: MANUAL SUBJECTIVE GRADING QUEUE */}
      {activeTab === "grading" && <ManualGradingManager />}

      {/* TAB: PDF TO TEXT & AI QUESTION GENERATION */}
      {activeTab === "pdf-generator" && <PdfQuestionGeneratorManager />}

      {/* TAB 7: BULK CSV/EXCEL IMPORTER */}
      {activeTab === "import" && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              <span>বাল্ক প্রশ্ন ইম্পোর্ট ইঞ্জিন (CSV / বাংলা ইউনিকোড ও KaTeX)</span>
            </h2>
            <p className="text-xs text-slate-500">
              হাজার হাজার প্রশ্ন এক ক্লিকে যুক্ত করুন। ডেটাবেসে ঢোকার আগে প্রতিটি সারি ভ্যালিডেশন ও ডুপ্লিকেট চেকের মধ্য দিয়ে যায়।
            </p>
          </div>

          <div className="space-y-3">
            <textarea
              rows={7}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`category,subjectCode,chapterNumber,questionTextBn,optionA,optionB,optionC,optionD,correctKey,explanationBn
HSC,PHY_1,2,"একটি ভেক্টরের মান ১০ ও দিক উত্তর।","২","৫","১০","২০",C,"ভেক্টরের মান ১০ একক।"...`}
              className="w-full p-4 text-xs font-mono border border-slate-300 rounded-xl outline-none focus:border-emerald-600 resize-none bg-slate-50"
            />

            <div className="flex flex-wrap gap-3">
              <button
                disabled={isImporting || !csvText.trim()}
                onClick={() => handlePreviewOrImport(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-50"
              >
                সারিগুলো যাচাই ও প্রিভিউ করুন
              </button>

              <button
                disabled={isImporting || !csvText.trim()}
                onClick={() => handlePreviewOrImport(true)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition disabled:opacity-50"
              >
                {isImporting ? "ডেটাবেসে সংরক্ষণ হচ্ছে..." : "সরাসরি ডেটাবেসে ইম্পোর্ট সম্পন্ন করুন"}
              </button>
            </div>
          </div>

          {/* Import Results & Error Feedback */}
          {importStatus && (
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2 font-bold">
                {importStatus.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                )}
                <span>{importStatus.message}</span>
              </div>

              {importStatus.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500">মোট সারি:</span>
                    <p className="font-bold text-slate-800 text-base">{importStatus.summary.totalRows}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-emerald-200 text-emerald-800">
                    <span className="text-emerald-600">বৈধ সারি:</span>
                    <p className="font-bold text-base">{importStatus.summary.validRows}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-rose-200 text-rose-800">
                    <span className="text-rose-600">ত্রুটিযুক্ত সারি:</span>
                    <p className="font-bold text-base">{importStatus.summary.errorRows}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-indigo-700">
                    <span className="text-slate-500">ইম্পোর্টকৃত:</span>
                    <p className="font-bold text-base">{importStatus.summary.insertedRows || 0}</p>
                  </div>
                </div>
              )}

              {importStatus.validationErrors && importStatus.validationErrors.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-rose-800 text-xs">ত্রুটির তালিকা:</h4>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {importStatus.validationErrors.map((err: any, idx: number) => (
                      <div key={idx} className="p-2 bg-white rounded border border-rose-200 text-xs text-rose-700">
                        সারি {err.rowNumber} [{err.column}]: {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 8: FINANCE & PAYMENTS */}
      {activeTab === "finance" && <FinanceManager />}

      {/* TAB 9: AUDIT TRAIL */}
      {activeTab === "audit" && <AuditLogViewer />}

      {/* TAB 10: SETTINGS & POLICIES */}
      {activeTab === "settings" && <SettingsManager />}
    </div>
  );
}
