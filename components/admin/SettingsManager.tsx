"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sliders,
  ShieldCheck,
  CreditCard,
  Mail,
  ToggleLeft,
  ToggleRight,
  Info,
  Send,
} from "lucide-react";

interface SettingItem {
  key: string;
  value: string;
  description: string;
  updatedAt?: string;
}

export function SettingsManager() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Test email state
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/settings");
      if (!res.ok) {
        throw new Error("Failed to load settings");
      }
      const data = await res.json();
      setSettings(data.settings);
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to load settings", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value } : s))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings");
      }
      setMessage({ text: "প্ল্যাটফর্ম সেটিংস সফলভাবে আপডেট হয়েছে!", type: "success" });
      fetchSettings();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      setMessage({ text: "অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা দিন।", type: "error" });
      return;
    }
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/v1/admin/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail.trim(),
          provider: getSetting("email_provider"),
          host: getSetting("smtp_host"),
          port: getSetting("smtp_port"),
          user: getSetting("smtp_user"),
          pass: getSetting("smtp_pass"),
          from: getSetting("smtp_from"),
          resendApiKey: getSetting("resend_api_key"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTestResult({ success: false, message: data.error || "টেস্ট ইমেইল প্রেরণ ব্যর্থ হয়েছে।" });
      } else {
        setTestResult({ success: true, message: data.message });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "সার্ভার এরর" });
    } finally {
      setSendingTest(false);
    }
  };

  const getSetting = (key: string) => settings.find((s) => s.key === key)?.value || "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            <span>প্ল্যাটফর্ম পলিসি ও কনফিগারেশন (Platform Settings & Policies)</span>
          </h2>
          <p className="text-xs text-slate-500">
            একাডেমিক রিভিউ পলিসি, ডিফল্ট পরীক্ষার সময়কাল, নেগেটিভ মার্কিং এবং গেটওয়ে অ্যাক্টিভেশন পরিচালনা করুন।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSettings}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
            title="Refresh settings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "সংরক্ষণ হচ্ছে..." : "পরিবর্তন সংরক্ষণ করুন"}</span>
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs sm:text-sm font-semibold ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Academic & Question Review Policies */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>একাডেমিক কোয়ালিটি ও প্রশ্ন রিভিউ পলিসি</span>
          </h3>

          <div className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                দায়িত্বের পৃথকীকরণ (Separation of Duties):
              </label>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-600">
                  লেখক নিজের প্রশ্ন নিজে অনুমোদন বা প্রকাশ করতে পারবেন না
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleChange(
                      "review_separation_of_duties",
                      getSetting("review_separation_of_duties") === "true" ? "false" : "true"
                    )
                  }
                  className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                >
                  {getSetting("review_separation_of_duties") === "true" ? (
                    <ToggleRight className="w-7 h-7 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-400" />
                  )}
                  <span>{getSetting("review_separation_of_duties") === "true" ? "সক্রিয়" : "নিষ্ক্রিয়"}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                ডিফল্ট নেগেটিভ মার্কিং পেনাল্টি:
              </label>
              <input
                type="number"
                step="0.05"
                value={getSetting("negative_marking_default")}
                onChange={(e) => handleChange("negative_marking_default", e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                ভুল উত্তরের জন্য কর্তিত নম্বর (যেমন: 0.25 মার্ক)
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                ডিফল্ট পরীক্ষার সময়কাল (মিনিটে):
              </label>
              <input
                type="number"
                value={getSetting("default_exam_duration_minutes")}
                onChange={(e) => handleChange("default_exam_duration_minutes", e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Platform Identity & General Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>প্ল্যাটফর্ম পরিচিতি ও সাইট অ্যাক্সেস</span>
          </h3>

          <div className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="font-bold text-slate-700 block mb-1">প্ল্যাটফর্মের নাম:</label>
              <input
                type="text"
                value={getSetting("site_name")}
                onChange={(e) => handleChange("site_name", e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">ট্যাগলাইন / ব্র্যন্ড স্লোগান:</label>
              <input
                type="text"
                value={getSetting("site_tagline")}
                onChange={(e) => handleChange("site_tagline", e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">সহায়তা ইমেইল (Support Desk):</label>
              <input
                type="email"
                value={getSetting("support_email")}
                onChange={(e) => handleChange("support_email", e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">পাবলিক রেজিস্ট্রেশন সক্রিয়:</label>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-600">নতুন শিক্ষার্থীদের সরাসরি অ্যাকাউন্ট তৈরির সুযোগ</span>
                <button
                  type="button"
                  onClick={() =>
                    handleChange(
                      "registration_enabled",
                      getSetting("registration_enabled") === "true" ? "false" : "true"
                    )
                  }
                  className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                >
                  {getSetting("registration_enabled") === "true" ? (
                    <ToggleRight className="w-7 h-7 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-400" />
                  )}
                  <span>{getSetting("registration_enabled") === "true" ? "অনুমোদিত" : "বন্ধ"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Payment Gateways */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 md:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard className="w-4 h-4 text-purple-600" />
            <span>বাংলাদেশি পেমেন্ট চ্যানেল ও গেটওয়ে কনফিগারেশন</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">bKash Merchant Gateway</div>
                <div className="text-xs text-slate-500">স্বয়ংক্রিয় ও ম্যানুয়াল বিকাশ পেমেন্ট সুবিধা</div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleChange("bkash_enabled", getSetting("bkash_enabled") === "true" ? "false" : "true")
                }
              >
                {getSetting("bkash_enabled") === "true" ? (
                  <ToggleRight className="w-7 h-7 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-slate-400" />
                )}
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Nagad Merchant Gateway</div>
                <div className="text-xs text-slate-500">নগদ পেমেন্ট ও ভেরিফিকেশন সুবিধা</div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleChange("nagad_enabled", getSetting("nagad_enabled") === "true" ? "false" : "true")
                }
              >
                {getSetting("nagad_enabled") === "true" ? (
                  <ToggleRight className="w-7 h-7 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-7 h-7 text-slate-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Transactional Email & Notifications */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600" />
              <span>ট্রানজ্যাকশনাল ইমেইল ও নোটিফিকেশন সার্ভিস (Transactional Email & SMTP)</span>
            </h3>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold w-fit">
              সক্রিয় মোড: {getSetting("email_provider") || "SMTP"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs sm:text-sm">
            {/* Provider Selector */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">ইমেইল ডেলিভারি প্রোভাইডার:</label>
              <select
                value={getSetting("email_provider") || "SMTP"}
                onChange={(e) => handleChange("email_provider", e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="SMTP">কাস্টম SMTP (Resend / Gmail / Custom Server)</option>
                <option value="RESEND">Resend.com REST API (Direct HTTP)</option>
                <option value="MOCK">Console / Test Mode (লগিং ও টেস্ট মোড)</option>
              </select>
            </div>

            {/* From Address */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">প্রেরকের নাম ও ইমেইল (From Address):</label>
              <input
                type="text"
                value={getSetting("smtp_from")}
                onChange={(e) => handleChange("smtp_from", e.target.value)}
                placeholder="EduBD <noreply@edubd.ac>"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Resend API Key if RESEND */}
            {getSetting("email_provider") === "RESEND" ? (
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="font-bold text-slate-700 block mb-1">Resend API Key:</label>
                <input
                  type="password"
                  value={getSetting("resend_api_key")}
                  onChange={(e) => handleChange("resend_api_key", e.target.value)}
                  placeholder="re_123456789..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            ) : (
              <>
                {/* SMTP Host */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">SMTP হোস্ট / সার্ভার:</label>
                  <input
                    type="text"
                    value={getSetting("smtp_host")}
                    onChange={(e) => handleChange("smtp_host", e.target.value)}
                    placeholder="smtp.resend.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* SMTP Port */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">SMTP পোর্ট:</label>
                  <input
                    type="number"
                    value={getSetting("smtp_port")}
                    onChange={(e) => handleChange("smtp_port", e.target.value)}
                    placeholder="587"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* SMTP User */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">SMTP ইউজারনেম / API আইডি:</label>
                  <input
                    type="text"
                    value={getSetting("smtp_user")}
                    onChange={(e) => handleChange("smtp_user", e.target.value)}
                    placeholder="resend"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* SMTP Password */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">SMTP পাসওয়ার্ড / সিক্রেট টোকেন:</label>
                  <input
                    type="password"
                    value={getSetting("smtp_pass")}
                    onChange={(e) => handleChange("smtp_pass", e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* Test Email Section */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
            <div className="flex-1">
              <label className="font-bold text-slate-800 text-xs block mb-1">
                লাইভ টেস্ট ইমেইল প্রেরণ (Verify Email Dispatch):
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="আপনার টেস্ট ইমেইল ঠিকানা দিন (যেমন: admin@edubd.ac)..."
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex flex-col sm:items-end justify-center">
              <button
                type="button"
                disabled={sendingTest || !testEmail}
                onClick={handleSendTestEmail}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs whitespace-nowrap"
              >
                <Send className={`w-3.5 h-3.5 ${sendingTest ? "animate-spin" : ""}`} />
                <span>{sendingTest ? "প্রেরণ হচ্ছে..." : "টেস্ট ইমেইল পাঠান"}</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                testResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="text-slate-400 hover:text-slate-600 font-bold ml-2"
              >
                &times;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
