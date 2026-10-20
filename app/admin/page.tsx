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
} from "lucide-react";
import { CurriculumManager } from "@/components/admin/CurriculumManager";
import { QuestionManager } from "@/components/admin/QuestionManager";

interface AdminAnalytics {
  totalStudents: number;
  totalQuestions: number;
  publishedQuestions: number;
  totalExamsTaken: number;
  activeSubscriptions: number;
  verifiedRevenueBdt: number;
}

export default function AdminDashboardPage() {
  const { locale, t, formatCurrency, formatNumber } = useI18n();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"analytics" | "curriculum" | "questions" | "import">("analytics");
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [csvText, setCsvText] = useState("");
  const [importStatus, setImportStatus] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetch("/api/v1/admin/analytics")
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.push("/login?redirect=/admin");
          }
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        setAnalytics(data.analytics);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
        fetch("/api/v1/admin/analytics")
          .then((r) => r.json())
          .then((d) => setAnalytics(d.analytics));
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Admin Top Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
            <span>অ্যাডমিন কন্ট্রোল সেন্টার (Admin Operations)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {locale === "bn" ? "কারিকুলাম ও প্রশ্নমালা ব্যবস্থাপনা" : "Curriculum & Question Bank Management"}
          </h1>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>CSV টেমপ্লেট ডাউনলোড</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs sm:text-sm font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 shrink-0 ${
            activeTab === "analytics"
              ? "bg-emerald-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>অ্যানালিটিক্স ড্যাশবোর্ড</span>
        </button>

        <button
          onClick={() => setActiveTab("curriculum")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 shrink-0 ${
            activeTab === "curriculum"
              ? "bg-emerald-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>কারিকুলাম ব্যবস্থাপনা</span>
        </button>

        <button
          onClick={() => setActiveTab("questions")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 shrink-0 ${
            activeTab === "questions"
              ? "bg-emerald-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileQuestion className="w-4 h-4" />
          <span>প্রশ্নমালা ও রিভিউ প্যানেল</span>
        </button>

        <button
          onClick={() => setActiveTab("import")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 shrink-0 ${
            activeTab === "import"
              ? "bg-emerald-600 text-white shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>বাল্ক CSV / এক্সেল ইম্পোর্ট</span>
        </button>
      </div>

      {/* TAB 1: ANALYTICS OVERVIEW */}
      {activeTab === "analytics" && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>মোট শিক্ষার্থী</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {formatNumber(analytics.totalStudents)}
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
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>প্রকাশিত প্রশ্ন</span>
              </div>
              <div className="text-2xl font-extrabold text-emerald-700">
                {formatNumber(analytics.publishedQuestions)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>সম্পন্ন পরীক্ষা</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {formatNumber(analytics.totalExamsTaken)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                <span>সক্রিয় মেম্বার</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {formatNumber(analytics.activeSubscriptions)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>যাচাইকৃত আয়</span>
              </div>
              <div className="text-xl font-extrabold text-emerald-700 truncate">
                {formatCurrency(analytics.verifiedRevenueBdt)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CURRICULUM MANAGEMENT */}
      {activeTab === "curriculum" && <CurriculumManager />}

      {/* TAB 3: QUESTION MANAGEMENT */}
      {activeTab === "questions" && <QuestionManager />}

      {/* TAB 4: BULK CSV/EXCEL IMPORTER */}
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
    </div>
  );
}
