"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import {
  KeyRound,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

function ResetPasswordContent() {
  const { locale } = useI18n();
  const searchParams = useSearchParams();

  const tokenParam = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  // Mode: "REDEEM" if token & email exist, otherwise "REQUEST"
  const [mode, setMode] = useState<"REDEEM" | "REQUEST">(
    tokenParam && emailParam ? "REDEEM" : "REQUEST"
  );

  // Form states
  const [email, setEmail] = useState(emailParam);
  const [token, setToken] = useState(tokenParam);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Request mode state
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");

  // Verification & Submission states
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  // Verify token on mount if in REDEEM mode
  useEffect(() => {
    if (tokenParam && emailParam) {
      setMode("REDEEM");
      setEmail(emailParam);
      setToken(tokenParam);
      setVerifyingToken(true);
      setTokenError("");

      fetch(
        `/api/v1/auth/reset-password?email=${encodeURIComponent(
          emailParam
        )}&token=${encodeURIComponent(tokenParam)}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) {
            setTokenValid(true);
          } else {
            setTokenValid(false);
            setTokenError(
              data.error ||
                (locale === "bn"
                  ? "পাসওয়ার্ড রিসেট লিংকটি অবৈধ অথবা এর মেয়াদ শেষ হয়ে গেছে।"
                  : "The password reset link is invalid or has expired.")
            );
          }
          setVerifyingToken(false);
        })
        .catch(() => {
          setTokenValid(false);
          setTokenError(
            locale === "bn"
              ? "লিংক যাচাই করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।"
              : "Failed to verify reset link. Please try again."
          );
          setVerifyingToken(false);
        });
    } else {
      setMode("REQUEST");
      setTokenValid(null);
    }
  }, [tokenParam, emailParam, locale]);

  // Handle Request (Forgot Password) Submit
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process request");
      }

      setRequestSubmitted(true);
      setRequestMessage(
        data.message ||
          (locale === "bn"
            ? "যদি এই ইমেইলে কোনো সক্রিয় অ্যাকাউন্ট থাকে, তবে পাসওয়ার্ড রিসেট নির্দেশিকা প্রক্রিয়াধীন করা হয়েছে।"
            : "If an account exists with this email, password reset instructions have been generated.")
      );
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (newPassword.length < 8) {
      setErrorMessage(
        locale === "bn"
          ? "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।"
          : "Password must be at least 8 characters long."
      );
      return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setErrorMessage(
        locale === "bn"
          ? "পাসওয়ার্ডে বর্ণ এবং সংখ্যা উভয়ই থাকতে হবে।"
          : "Password must contain both letters and numbers."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(
        locale === "bn" ? "উভয় পাসওয়ার্ড মেলেনি।" : "Passwords do not match."
      );
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token,
          password: newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Password reset failed");
      }

      setSuccess(true);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xs">
            {success ? (
              <CheckCircle2 className="w-7 h-7 text-white" />
            ) : mode === "REDEEM" ? (
              <KeyRound className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {success
              ? locale === "bn"
                ? "পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!"
                : "Password Reset Successful!"
              : mode === "REDEEM"
              ? locale === "bn"
                ? "নতুন পাসওয়ার্ড নির্ধারণ করুন"
                : "Set New Password"
              : locale === "bn"
              ? "পাসওয়ার্ড ভুলে গেছেন?"
              : "Forgot Your Password?"}
          </h1>
          <p className="text-xs text-slate-500">
            {success
              ? locale === "bn"
                ? "আপনার নতুন পাসওয়ার্ড দিয়ে এখন নিরাপদে লগইন করতে পারেন।"
                : "You can now log in to your account with your new credentials."
              : mode === "REDEEM"
              ? locale === "bn"
                ? "আপনার অ্যাকাউন্টের জন্য একটি শক্তিশালী নতুন পাসওয়ার্ড প্রবেশ করান।"
                : "Choose a strong, secure new password for your account."
              : locale === "bn"
              ? "আপনার অ্যাকাউন্টের নিবন্ধিত ইমেইল প্রবেশ করান।"
              : "Enter your registered email address to receive reset instructions."}
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Case 1: Success Screen */}
        {success ? (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs leading-relaxed flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {locale === "bn" ? "পাসওয়ার্ড হালনাগাদ সম্পন্ন" : "Update Completed"}
                </p>
                <p className="mt-0.5 text-emerald-700">
                  {locale === "bn"
                    ? "নিরাপত্তার স্বার্থে পূর্ববর্তী সকল সক্রিয় সেশন বাতিল করা হয়েছে। অনুগ্রহ করে নতুন পাসওয়ার্ড দিয়ে লগইন করুন।"
                    : "For your security, previous active sessions have been invalidated. Please log in with your new password."}
                </p>
              </div>
            </div>

            <Link
              href="/login"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{locale === "bn" ? "লগইন করুন" : "Proceed to Login"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : mode === "REDEEM" ? (
          /* Case 2: Token Redemption Mode */
          verifyingToken ? (
            <div className="py-10 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                {locale === "bn"
                  ? "পাসওয়ার্ড রিসেট লিংক যাচাই করা হচ্ছে..."
                  : "Verifying password reset link..."}
              </p>
            </div>
          ) : tokenValid === false ? (
            /* Expired / Invalid Token Alert */
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {locale === "bn" ? "মেয়াদোত্তীর্ণ বা অবৈধ লিংক" : "Link Expired or Invalid"}
                  </p>
                  <p className="mt-0.5 text-amber-700">
                    {tokenError ||
                      (locale === "bn"
                        ? "এই পাসওয়ার্ড রিসেট লিংকটি ইতিপূর্বে ব্যবহৃত হয়েছে অথবা এর ১ ঘণ্টার মেয়াদ শেষ হয়ে গেছে।"
                        : "This password reset token has already been redeemed or expired.")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMode("REQUEST");
                  setTokenValid(null);
                  setErrorMessage("");
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{locale === "bn" ? "নতুন রিসেট লিংক চান?" : "Request a New Reset Link"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-xs text-slate-500 hover:text-emerald-700 font-semibold"
                >
                  {locale === "bn" ? "← লগইনে ফিরে যান" : "← Back to Login"}
                </Link>
              </div>
            </div>
          ) : (
            /* Valid Token: Set New Password Form */
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {locale === "bn" ? "ইমেইল ঠিকানা" : "Account Email"}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-100 border border-slate-200 text-slate-600 rounded-lg cursor-not-allowed select-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-700">
                    {locale === "bn" ? "নতুন পাসওয়ার্ড" : "New Password"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? (locale === "bn" ? "লুকান" : "Hide") : (locale === "bn" ? "দেখান" : "Show")}</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {locale === "bn" ? "নতুন পাসওয়ার্ড নিশ্চিত করুন" : "Confirm New Password"}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Password Quality Checklist */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-600">
                <div className="flex items-center gap-2">
                  <span className={hasMinLength ? "text-emerald-600 font-bold" : "text-slate-400"}>
                    {hasMinLength ? "✓" : "○"}
                  </span>
                  <span>{locale === "bn" ? "কমপক্ষে ৮ অক্ষর" : "At least 8 characters"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={hasLetter ? "text-emerald-600 font-bold" : "text-slate-400"}>
                    {hasLetter ? "✓" : "○"}
                  </span>
                  <span>{locale === "bn" ? "কমপক্ষে একটি ইংরেজি বর্ণ (A-Z, a-z)" : "At least one letter"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={hasNumber ? "text-emerald-600 font-bold" : "text-slate-400"}>
                    {hasNumber ? "✓" : "○"}
                  </span>
                  <span>{locale === "bn" ? "কমপক্ষে একটি সংখ্যা (0-9)" : "At least one number"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={passwordsMatch ? "text-emerald-600 font-bold" : "text-slate-400"}>
                    {passwordsMatch ? "✓" : "○"}
                  </span>
                  <span>{locale === "bn" ? "উভয় পাসওয়ার্ড মিলেছে" : "Passwords match"}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !hasMinLength || !hasLetter || !hasNumber || !passwordsMatch}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <span>{locale === "bn" ? "সংরক্ষণ করা হচ্ছে..." : "Updating password..."}</span>
                ) : (
                  <>
                    <span>{locale === "bn" ? "পাসওয়ার্ড পরিবর্তন করুন" : "Set New Password"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-slate-500">
                <Link href="/login" className="text-emerald-700 font-semibold hover:underline">
                  {locale === "bn" ? "← লগইনে ফিরে যান" : "← Back to Login"}
                </Link>
              </div>
            </form>
          )
        ) : (
          /* Case 3: Request Reset Link Form (Forgot Password) */
          requestSubmitted ? (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs leading-relaxed flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {locale === "bn" ? "অনুরোধ গ্রহণ করা হয়েছে" : "Request Received"}
                  </p>
                  <p className="mt-0.5 text-emerald-700">{requestMessage}</p>
                </div>
              </div>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="w-full inline-flex py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-xs items-center justify-center gap-2"
                >
                  <span>{locale === "bn" ? "লগইনে ফিরে যান" : "Return to Login"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {locale === "bn" ? "আপনার নিবন্ধিত ইমেইল" : "Registered Email Address"}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@edubd.ac"
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <span>{locale === "bn" ? "প্রক্রিয়াধীন..." : "Processing..."}</span>
                ) : (
                  <>
                    <span>
                      {locale === "bn" ? "রিসেট লিংক পাঠান" : "Send Reset Link"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-slate-500">
                <Link href="/login" className="text-emerald-700 font-semibold hover:underline">
                  {locale === "bn" ? "← লগইনে ফিরে যান" : "← Back to Login"}
                </Link>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-slate-500">
          Loading reset password...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
