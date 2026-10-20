"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { GraduationCap, Mail, Lock, User, Phone, AlertCircle, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const { locale, t } = useI18n();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [examCategory, setExamCategory] = useState("HSC");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phoneNumber: phoneNumber || undefined,
          password,
          examCategory,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mx-auto">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t.auth.registerTitle}</h1>
          <p className="text-xs text-slate-500">
            {locale === "bn" ? "বিনা খরচে অ্যাকাউন্ট খুলে আজই প্রস্তুতি শুরু করুন" : "Join thousands of students across Bangladesh"}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">{t.auth.fullNameLabel}</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="তানভীর আহমেদ / Tanvir Ahmed"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">{t.auth.emailLabel}</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">{t.auth.phoneLabel} ({locale === "bn" ? "ঐচ্ছিক" : "Optional"})</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="01700-000000"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              {locale === "bn" ? "টার্গেট পরীক্ষা (Target Category)" : "Target Exam"}
            </label>
            <select
              value={examCategory}
              onChange={(e) => setExamCategory(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none bg-white focus:border-emerald-600"
            >
              <option value="HSC">HSC (এইচএসসি)</option>
              <option value="SSC">SSC (এসএসসি)</option>
              <option value="MEDICAL">Medical Admission (মেডিকেল ভর্তি)</option>
              <option value="DENTAL">Dental Admission (ডেন্টাল ভর্তি)</option>
              <option value="UNIVERSITY">University Admission (ভার্সিটি ভর্তি)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">{t.auth.passwordLabel}</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span>{t.common.loading}</span>
            ) : (
              <>
                <span>{t.auth.submitRegister}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
          <Link href="/login" className="text-emerald-700 font-semibold hover:underline">
            {t.auth.alreadyHaveAccount}
          </Link>
        </div>
      </div>
    </div>
  );
}
