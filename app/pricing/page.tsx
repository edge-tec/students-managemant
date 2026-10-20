"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import {
  Check,
  Crown,
  ShieldCheck,
  CreditCard,
  Building,
  Smartphone,
  AlertCircle,
  X,
} from "lucide-react";

interface PlanItem {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  descriptionBn: string;
  priceBdt: number;
  durationDays: number;
  features: string[];
}

function PricingContent() {
  const { locale, t, formatCurrency, formatNumber } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"BKASH" | "NAGAD" | "BANK_TRANSFER" | "CARD">("BKASH");
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const paymentStatus = searchParams.get("payment");

  useEffect(() => {
    fetch("/api/v1/subscriptions/plans")
      .then((res) => res.json())
      .then((data) => {
        setPlans(data.plans || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSelectPlan = (plan: PlanItem) => {
    setSelectedPlan(plan);
    setCheckoutModalOpen(true);
  };

  const handleProceedPayment = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/v1/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?redirect=${encodeURIComponent("/pricing")}`);
          return;
        }
        throw new Error(data.error || "Order creation failed");
      }

      // If development/callback mode or redirect URL
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Title */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
          {locale === "bn" ? "স্বচ্ছ ও সাশ্রয়ী মূল্য" : "Transparent Pricing"}
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
          {locale === "bn" ? "আপনার লক্ষ্য অনুযায়ী সেরা প্ল্যান বেছে নিন" : "Choose the Plan That Fits Your Goals"}
        </h1>
        <p className="text-sm text-slate-600">
          {locale === "bn"
            ? "কোনো গোপন চার্জ নেই। বিকাশ, নগদ ও ব্যাংকের মাধ্যমে সহজে পেমেন্ট করে নিশ্চিত করুন আপনার সেরা ফলাফল।"
            : "No hidden charges. Verified payment gateway integration for bKash, Nagad, and Cards."}
        </p>
      </div>

      {paymentStatus === "failed" && (
        <div className="max-w-md mx-auto p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{locale === "bn" ? "পেমেন্ট সম্পন্ন হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।" : "Payment was not completed. Please try again."}</span>
        </div>
      )}

      {/* Plans Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-500">{t.common.loading}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isFeatured = plan.code === "HSC_PREMIUM" || plan.code === "MED_PREMIUM";
            return (
              <div
                key={plan.id}
                className={`p-6 sm:p-8 rounded-2xl bg-white border transition flex flex-col justify-between ${
                  isFeatured
                    ? "border-emerald-600 ring-2 ring-emerald-600 shadow-md relative"
                    : "border-slate-200 shadow-xs"
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                    {locale === "bn" ? "সর্বাধিক জনপ্রিয়" : "Most Popular"}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900">
                      {locale === "bn" ? plan.nameBn : plan.nameEn}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed min-h-[36px]">
                      {locale === "bn" ? plan.descriptionBn : plan.nameEn}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1 pt-2">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                      {plan.priceBdt === 0 ? t.common.free : formatCurrency(plan.priceBdt)}
                    </span>
                    {plan.priceBdt > 0 && (
                      <span className="text-xs text-slate-500">
                        / {formatNumber(plan.durationDays)} {locale === "bn" ? "দিন" : "days"}
                      </span>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="pt-4 border-t border-slate-100 space-y-2.5">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs ${
                      isFeatured
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    {plan.priceBdt === 0
                      ? (locale === "bn" ? "বিনামূল্যে শুরু করুন" : "Get Started Free")
                      : (locale === "bn" ? "প্ল্যানটি সক্রিয় করুন" : "Subscribe Now")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-slate-900">
                  {locale === "bn" ? "পেমেন্ট মেথড নির্বাচন করুন" : "Select Payment Method"}
                </h3>
                <p className="text-xs text-slate-500">
                  {locale === "bn" ? selectedPlan.nameBn : selectedPlan.nameEn} • {formatCurrency(selectedPlan.priceBdt)}
                </p>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Payment Options */}
            <div className="space-y-2.5">
              {[
                { id: "BKASH", name: "bKash (বিকাশ)", desc: "Direct bKash online payment", icon: Smartphone },
                { id: "NAGAD", name: "Nagad (নগদ)", desc: "Nagad wallet checkout", icon: Smartphone },
                { id: "CARD", name: "Cards (ভিসা / মাস্টারকার্ড)", desc: "Debit & Credit cards", icon: CreditCard },
                { id: "BANK_TRANSFER", name: "Bank Deposit (ব্যাংক ট্রান্সফার)", desc: "Sonali / City Bank manual slip", icon: Building },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/70"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                        <Icon className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{m.name}</div>
                        <div className="text-[11px] text-slate-500">{m.desc}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCheckoutModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleProceedPayment}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isProcessing
                  ? t.common.loading
                  : `${locale === "bn" ? "পেমেন্ট সম্পন্ন করুন" : "Pay"} ${formatCurrency(selectedPlan.priceBdt)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-slate-500">Loading plans...</div>}>
      <PricingContent />
    </Suspense>
  );
}
