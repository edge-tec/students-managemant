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
  Clock,
  Sparkles,
} from "lucide-react";

interface AdminAnalytics {
  totalStudents: number;
  totalQuestions: number;
  publishedQuestions: number;
  totalExamsTaken: number;
  activeSubscriptions: number;
  verifiedRevenueBdt: number;
}

export default function AdminDashboardPage() {
  const { locale, t, formatCurrency, formatNumber, formatDate } = useI18n();
  const router = useRouter();

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
      // Parse CSV client-side lines for preview
      const lines = csvText.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const rows = lines.slice(1).map((line) => {
        // Simple regex match for comma-separated or quoted values
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
        // Refresh analytics
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

  if (!analytics) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
            <span>Admin Console (অ্যাডমিন প্যানেল)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {locale === "bn" ? "প্ল্যাটফর্ম অপারেশন ও কন্ট্রোল" : "Platform Operations & Analytics"}
          </h1>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{locale === "bn" ? "CSV টেমপ্লেট ডাউনলোড" : "Download Import Template"}</span>
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>{locale === "bn" ? "মোট শিক্ষার্থী" : "Students"}</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatNumber(analytics.totalStudents)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <FileQuestion className="w-3.5 h-3.5 text-blue-600" />
            <span>{locale === "bn" ? "প্রশ্ন সংখ্যা" : "Questions"}</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatNumber(analytics.totalQuestions)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{locale === "bn" ? "প্রকাশিত প্রশ্ন" : "Published"}</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">
            {formatNumber(analytics.publishedQuestions)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>{locale === "bn" ? "সম্পন্ন পরীক্ষা" : "Exams Taken"}</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatNumber(analytics.totalExamsTaken)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 text-rose-600" />
            <span>{locale === "bn" ? "সক্রিয় মেম্বার" : "Subscriptions"}</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatNumber(analytics.activeSubscriptions)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>{locale === "bn" ? "যাচাইকৃত আয়" : "Revenue"}</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-700 truncate">
            {formatCurrency(analytics.verifiedRevenueBdt)}
          </div>
        </div>
      </div>

      {/* Bulk Question Importer Section */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-600" />
            <span>{locale === "bn" ? "বাল্ক প্রশ্ন ইম্পোর্ট ইঞ্জিন (CSV / Unicode বাংলা)" : "Bulk Question Importer (CSV / Bengali Unicode)"}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {locale === "bn"
              ? "হাজার হাজার প্রশ্ন এক ক্লিকে যুক্ত করুন। ডেটাবেসে ঢোকার আগে প্রতিটি সারি ভ্যালিডেশন ও ডুপ্লিকেট চেকের মধ্য দিয়ে যায়।"
              : "Paste CSV text below or download the template to prepare bulk question uploads."}
          </p>
        </div>

        <div className="space-y-3">
          <textarea
            rows={6}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`category,subjectCode,chapterNumber,questionTextBn,optionA,optionB,optionC,optionD,correctKey,explanationBn
HSC,PHY_1,2,"একটি ভেক্টরের মান ১০ ও দিক উত্তর।","২","৫","১০","২০",C,"ভেক্টরের মান ১০ একক।"...`}
            className="w-full p-4 text-xs font-mono border border-slate-300 rounded-xl outline-none focus:border-emerald-600 resize-none bg-slate-50"
          />

          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-4">
              <button
                onClick={handleDownloadTemplate}
                className="text-xs text-emerald-600 hover:underline font-semibold cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{locale === "bn" ? "নমুনা ফাইল ডাউনলোড" : "Download Sample"}</span>
              </button>

              <label className="text-xs text-slate-600 hover:text-emerald-700 font-semibold cursor-pointer flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded-lg bg-white shadow-2xs hover:bg-slate-50 transition">
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>{locale === "bn" ? "ফাইল বেছে নিন (.csv)" : "Choose File (.csv)"}</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const text = evt.target?.result as string;
                      if (text) setCsvText(text);
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isImporting || !csvText.trim()}
                onClick={() => handlePreviewOrImport(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                {locale === "bn" ? "প্রিভিউ ও ভ্যালিডেশন" : "Preview & Validate"}
              </button>
              <button
                type="button"
                disabled={isImporting || !csvText.trim()}
                onClick={() => handlePreviewOrImport(true)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-40 cursor-pointer"
              >
                {isImporting ? t.common.loading : (locale === "bn" ? "ডেটাবেসে ইম্পোর্ট করুন" : "Commit Import")}
              </button>
            </div>
          </div>
        </div>

        {/* Validation Result Box */}
        {importStatus && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
            <div className="flex justify-between items-center font-bold">
              <span>{importStatus.preview ? "Preview Summary" : "Import Result"}:</span>
              <span className="text-emerald-700">
                {locale === "bn"
                  ? `${importStatus.validCount ?? importStatus.successfulCount} টি সঠিক`
                  : `${importStatus.validCount ?? importStatus.successfulCount} valid`}
              </span>
            </div>

            {importStatus.errors && importStatus.errors.length > 0 && (
              <div className="space-y-1 text-rose-700">
                <span className="font-bold">{importStatus.errors.length} validation errors:</span>
                <ul className="list-disc pl-4 space-y-0.5">
                  {importStatus.errors.slice(0, 5).map((err: any, i: number) => (
                    <li key={i}>
                      Row {err.rowNumber} [{err.column}]: {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
