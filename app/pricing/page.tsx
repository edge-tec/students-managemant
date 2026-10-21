"use client";

import React, { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  Edit2,
  Plus,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  Tag,
  ArrowRight,
} from "lucide-react";

interface PlanItem {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  descriptionBn: string;
  descriptionEn?: string;
  priceBdt: number;
  durationDays: number;
  category?: string | null;
  features: string[];
  isActive?: boolean;
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

  // Admin capabilities state
  const [isAdmin, setIsAdmin] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [adminNotification, setAdminNotification] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Edit form state
  const [planForm, setPlanForm] = useState({
    code: "",
    nameBn: "",
    nameEn: "",
    descriptionBn: "",
    descriptionEn: "",
    priceBdt: 99,
    durationDays: 30,
    category: "",
    features: [""] as string[],
    isActive: true,
  });

  const paymentStatus = searchParams.get("payment");

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/subscriptions/plans");
      const data = await res.json();
      setPlans(data.plans || []);
    } catch {
      // silently fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();

    // Check if logged in user has administrative privileges
    fetch("/api/v1/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.roles?.includes("ADMIN") || data?.user?.roles?.includes("SUPER_ADMIN")) {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
  }, [fetchPlans]);

  const handleSelectPlan = (plan: PlanItem) => {
    setSelectedPlan(plan);
    setCheckoutModalOpen(true);
  };

  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      code: "",
      nameBn: "",
      nameEn: "",
      descriptionBn: "",
      descriptionEn: "",
      priceBdt: 99,
      durationDays: 30,
      category: "",
      features: ["সীমাহীন কাস্টম এক্সাম তৈরি", "সকল প্রশ্নব্যাংক অ্যাক্সেস", "স্বয়ংক্রিয় নির্ভুল ব্যাখ্যা"],
      isActive: true,
    });
    setEditModalOpen(true);
  };

  const handleOpenEditPlan = (plan: PlanItem) => {
    setEditingPlan(plan);
    setPlanForm({
      code: plan.code,
      nameBn: plan.nameBn,
      nameEn: plan.nameEn,
      descriptionBn: plan.descriptionBn || "",
      descriptionEn: plan.descriptionEn || "",
      priceBdt: plan.priceBdt,
      durationDays: plan.durationDays,
      category: plan.category || "",
      features: plan.features && plan.features.length > 0 ? [...plan.features] : [""],
      isActive: plan.isActive !== undefined ? plan.isActive : true,
    });
    setEditModalOpen(true);
  };

  const handleAddFeature = () => {
    setPlanForm((prev) => ({
      ...prev,
      features: [...prev.features, ""],
    }));
  };

  const handleRemoveFeature = (idx: number) => {
    setPlanForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== idx),
    }));
  };

  const handleFeatureChange = (index: number, val: string) => {
    setPlanForm((prev) => {
      const updated = [...prev.features];
      updated[index] = val;
      return { ...prev, features: updated };
    });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlan(true);
    setAdminNotification(null);

    const filteredFeatures = planForm.features.map((f) => f.trim()).filter(Boolean);

    try {
      if (editingPlan) {
        // Update existing plan
        const res = await fetch(`/api/v1/admin/plans/${editingPlan.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nameBn: planForm.nameBn.trim(),
            nameEn: planForm.nameEn.trim(),
            descriptionBn: planForm.descriptionBn.trim() || null,
            descriptionEn: planForm.descriptionEn.trim() || null,
            priceBdt: Number(planForm.priceBdt),
            durationDays: Number(planForm.durationDays),
            category: planForm.category || null,
            features: filteredFeatures,
            isActive: planForm.isActive,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update plan");

        setAdminNotification({ text: `প্যাকেজ "${planForm.nameBn}" এর মূল্য ও তথ্য সফলভাবে আপডেট করা হয়েছে!`, type: "success" });
      } else {
        // Create new plan
        const res = await fetch("/api/v1/admin/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: planForm.code.trim().toUpperCase(),
            nameBn: planForm.nameBn.trim(),
            nameEn: planForm.nameEn.trim(),
            descriptionBn: planForm.descriptionBn.trim() || null,
            descriptionEn: planForm.descriptionEn.trim() || null,
            priceBdt: Number(planForm.priceBdt),
            durationDays: Number(planForm.durationDays),
            category: planForm.category || null,
            features: filteredFeatures,
            isActive: planForm.isActive,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create plan");

        setAdminNotification({ text: `নতুন প্যাকেজ "${planForm.nameBn}" সফলভাবে তৈরি করা হয়েছে!`, type: "success" });
      }

      setEditModalOpen(false);
      await fetchPlans();
    } catch (err: any) {
      setAdminNotification({ text: err.message || "Failed to save plan", type: "error" });
    } finally {
      setSavingPlan(false);
    }
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

      let data: any = null;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?redirect=${encodeURIComponent("/pricing")}`);
          return;
        }
        throw new Error(data?.error || "Order creation failed");
      }

      if (data?.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Payment processing failed");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Admin Action Ribbon */}
      {isAdmin && (
        <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg border border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-white">অ্যাডমিন মোড সক্রিয়: প্যাকেজ ও প্রাইস প্ল্যান পরিচালনা</span>
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                  Admin Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                আপনি যেকোনো প্ল্যানের মূল্য, মেয়াদ ও ফিচার সরাসরি আপডেট করতে পারেন।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleOpenCreatePlan}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন প্যাকেজ তৈরি করুন</span>
            </button>
            <Link
              href="/admin"
              className="flex items-center gap-1 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <span>অ্যাডমিন প্যানেল</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Admin Toast Notification */}
      {adminNotification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
            adminNotification.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {adminNotification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{adminNotification.text}</span>
          </div>
          <button
            onClick={() => setAdminNotification(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Title */}
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
        <div className="text-center py-20 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
          <span>{t.common.loading}</span>
        </div>
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
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                    {locale === "bn" ? "সর্বাধিক জনপ্রিয়" : "Most Popular"}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Category Pill */}
                  {plan.category && (
                    <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {plan.category}
                    </span>
                  )}

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
                      {plan.priceBdt === 0 ? t.common.free : `৳ ${formatNumber(plan.priceBdt)}`}
                    </span>
                    {plan.priceBdt > 0 && (
                      <span className="text-xs text-slate-500 font-medium">
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

                {/* Actions: Subscribe & Admin Edit */}
                <div className="pt-6 space-y-2">
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

                  {/* Admin Direct Update Trigger */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditPlan(plan)}
                      className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                      <span>প্যাকেজ ও মূল্য এডিট করুন (Admin)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Plan Edit / Create Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-emerald-600" />
                  <span>{editingPlan ? "প্যাকেজ ও মূল্য আপডেট করুন" : "নতুন সাবস্ক্রিপশন প্যাকেজ তৈরি"}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  প্যাকেজের মূল্য, মেয়াদ ও ফিচার পরিবর্তন করুন। পরিবর্তন সাথে সাথে লাইভ হবে।
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">প্যাকেজ কোড (Code)</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPlan}
                    value={planForm.code}
                    onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SSC_SPECIAL, HSC_BOOSTER"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 uppercase font-mono disabled:bg-slate-100"
                  />
                  <span className="text-[10px] text-slate-400">অনন্য শনাক্তকারী কোড (Unique ID)</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">ক্যাটাগরি</label>
                  <select
                    value={planForm.category}
                    onChange={(e) => setPlanForm({ ...planForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:border-emerald-600"
                  >
                    <option value="">অল অ্যাক্সেস / জেনারেল (সকলের জন্য)</option>
                    <option value="SSC">এসএসসি (SSC)</option>
                    <option value="HSC">এইচএসসি (HSC)</option>
                    <option value="MEDICAL">মেডিকেল ভর্তি</option>
                    <option value="UNIVERSITY">বিশ্ববিদ্যালয় ভর্তি</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">প্যাকেজের নাম (বাংলা) *</label>
                  <input
                    type="text"
                    required
                    value={planForm.nameBn}
                    onChange={(e) => setPlanForm({ ...planForm, nameBn: e.target.value })}
                    placeholder="যেমন: এসএসসি স্পেশাল প্রিমিয়াম"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">প্যাকেজের নাম (English) *</label>
                  <input
                    type="text"
                    required
                    value={planForm.nameEn}
                    onChange={(e) => setPlanForm({ ...planForm, nameEn: e.target.value })}
                    placeholder="e.g. SSC Special Premium"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">মূল্য (BDT ৳) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={planForm.priceBdt}
                    onChange={(e) => setPlanForm({ ...planForm, priceBdt: parseFloat(e.target.value) || 0 })}
                    placeholder="99"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-extrabold text-emerald-800"
                  />
                  <span className="text-[10px] text-slate-400">০ দিলে 'বিনামূল্যে' হিসেবে দেখাবে</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">মেয়াদ (দিন) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={planForm.durationDays}
                    onChange={(e) => setPlanForm({ ...planForm, durationDays: parseInt(e.target.value, 10) || 30 })}
                    placeholder="30"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                  <span className="text-[10px] text-slate-400">যেমন: 30, 90 বা 365 দিন</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">স্ট্যাটাস</label>
                  <div className="pt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.isActive}
                        onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        {planForm.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">বর্ণনা (বাংলা)</label>
                <textarea
                  rows={2}
                  value={planForm.descriptionBn}
                  onChange={(e) => setPlanForm({ ...planForm, descriptionBn: e.target.value })}
                  placeholder="প্যাকেজের সংক্ষিপ্ত বিবরণ..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>

              {/* Features List */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">প্যাকেজ ফিচারসমূহ (Features List)</label>
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ফিচার যোগ করুন</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {planForm.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => handleFeatureChange(idx, e.target.value)}
                        placeholder={`ফিচার ${idx + 1}...`}
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                      />
                      {planForm.features.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {savingPlan ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <span>{editingPlan ? "পরিবর্তন সংরক্ষণ করুন" : "প্যাকেজ তৈরি করুন"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Checkout Modal */}
      {checkoutModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-slate-900">
                  {locale === "bn" ? "পেমেন্ট মেথড নির্বাচন করুন" : "Select Payment Method"}
                </h3>
                <p className="text-xs text-slate-500">
                  {locale === "bn" ? selectedPlan.nameBn : selectedPlan.nameEn} — {formatCurrency(selectedPlan.priceBdt)}
                </p>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2.5">
              {[
                { id: "BKASH", name: "bKash (বিকাশ)", desc: "Instant automated checkout", icon: Smartphone },
                { id: "NAGAD", name: "Nagad (নগদ)", desc: "Quick mobile wallet payment", icon: Smartphone },
                { id: "CARD", name: "Credit / Debit Card", desc: "Visa, Mastercard, AMEX", icon: CreditCard },
                { id: "BANK_TRANSFER", name: "Bank Transfer", desc: "Manual bank deposit verification", icon: Building },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`w-full p-3.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600"
                        : "border-slate-200 hover:border-slate-300 bg-white"
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
