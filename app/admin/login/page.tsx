"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { validateSafeRedirect } from "@/lib/security/urlValidation";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();

  const redirectParam = searchParams.get("redirect");
  const targetDestination = validateSafeRedirect(redirectParam, "/admin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(
            locale === "bn"
              ? "অতিরিক্ত ব্যর্থ চেষ্টার কারণে সাময়িকভাবে অ্যাক্সেস স্থগিত করা হয়েছে। অনুগ্রহ করে কিছু সময় পর আবার চেষ্টা করুন।"
              : "Too many failed login attempts. Access temporarily restricted. Please try again later."
          );
        }
        throw new Error(
          data.error ||
            (locale === "bn"
              ? "ইমেইল বা পাসওয়ার্ড সঠিক নয় অথবা আপনার অ্যাকাউন্ট প্রশাসনিক অনুমোদিত নয়।"
              : "Invalid email or password.")
        );
      }

      // Safe navigation
      router.push(targetDestination);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition">
            E
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            Edu<span className="text-emerald-600">BD</span>
          </span>
        </Link>

        <div className="pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-700" />
            <span>প্রশাসনিক সাইন-ইন পোর্টাল (Admin Gateway)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
            {locale === "bn" ? "অ্যাডমিন কন্ট্রোল সেন্টারে প্রবেশ" : "Administrator Sign In"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Learn • Practice • Test • Succeed — সুরক্ষিত প্রশাসনিক ব্যবস্থাপনা।
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-lg rounded-3xl border border-slate-200/80 space-y-6">
          {/* Security Banner */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 text-slate-600 text-[11px] leading-relaxed flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              {locale === "bn"
                ? "এই পোর্টালটি শুধুমাত্র অনুমোদিত শিক্ষক, রিভিউয়ার ও অ্যাডমিনিস্ট্রেটরদের জন্য সংরক্ষিত। প্রতিটি লগইন প্রচেষ্টা অডিট লগে রেকর্ড করা হয়।"
                : "Restricted administrative system for authorized staff, reviewers, and platform administrators. All activity is monitored and audited."}
            </span>
          </div>

          {/* Error Feedback */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {locale === "bn" ? "প্রশাসনিক ইমেইল" : "Administrative Email"}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@edubd.ac"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {locale === "bn" ? "পাসওয়ার্ড" : "Password"}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span>{locale === "bn" ? "যাচাই করা হচ্ছে..." : "Verifying..."}</span>
                ) : (
                  <>
                    <span>{locale === "bn" ? "অ্যাডমিন সাইন ইন" : "Sign In to Admin Panel"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer Back link */}
          <div className="text-center pt-2 border-t border-slate-100">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-500 hover:text-emerald-700 transition inline-flex items-center gap-1.5"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{locale === "bn" ? "সাধারণ শিক্ষার্থী লগইন পোর্টাল" : "Student Login Portal"}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">
          Loading admin authentication...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
