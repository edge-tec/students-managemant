"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  X,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";

export interface SubscriptionPlanItem {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  descriptionBn: string | null;
  descriptionEn: string | null;
  priceBdt: number;
  durationDays: number;
  category: "SSC" | "HSC" | "MEDICAL" | "DENTAL" | "UNIVERSITY" | null;
  features: string[];
  isActive: boolean;
  totalSubscriptions?: number;
  totalOrders?: number;
}

interface PlanManagerProps {
  onPlanUpdated?: () => void;
}

export function PlanManager({ onPlanUpdated }: PlanManagerProps) {
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    code: "",
    nameBn: "",
    nameEn: "",
    descriptionBn: "",
    descriptionEn: "",
    priceBdt: 0,
    durationDays: 30,
    category: "" as string,
    features: [""] as string[],
    isActive: true,
  });

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/plans");
      if (!res.ok) {
        throw new Error("Failed to load subscription plans");
      }
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to load plans", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setFormData({
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
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: SubscriptionPlanItem) => {
    setEditingPlan(plan);
    setFormData({
      code: plan.code,
      nameBn: plan.nameBn,
      nameEn: plan.nameEn,
      descriptionBn: plan.descriptionBn || "",
      descriptionEn: plan.descriptionEn || "",
      priceBdt: plan.priceBdt,
      durationDays: plan.durationDays,
      category: plan.category || "",
      features: plan.features.length > 0 ? [...plan.features] : [""],
      isActive: plan.isActive,
    });
    setIsModalOpen(true);
  };

  const handleAddFeature = () => {
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, ""],
    }));
  };

  const handleRemoveFeature = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== idx),
    }));
  };

  const handleFeatureChange = (index: number, val: string) => {
    setFormData((prev) => {
      const updated = [...prev.features];
      updated[index] = val;
      return { ...prev, features: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const filteredFeatures = formData.features.map((f) => f.trim()).filter(Boolean);

    try {
      if (editingPlan) {
        // Update existing plan
        const res = await fetch(`/api/v1/admin/plans/${editingPlan.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nameBn: formData.nameBn.trim(),
            nameEn: formData.nameEn.trim(),
            descriptionBn: formData.descriptionBn.trim() || null,
            descriptionEn: formData.descriptionEn.trim() || null,
            priceBdt: Number(formData.priceBdt),
            durationDays: Number(formData.durationDays),
            category: formData.category || null,
            features: filteredFeatures,
            isActive: formData.isActive,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update plan");

        setMessage({ text: "প্যাকেজ ও মূল্যের তথ্য সফলভাবে আপডেট করা হয়েছে!", type: "success" });
      } else {
        // Create new plan
        const res = await fetch("/api/v1/admin/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: formData.code.trim().toUpperCase(),
            nameBn: formData.nameBn.trim(),
            nameEn: formData.nameEn.trim(),
            descriptionBn: formData.descriptionBn.trim() || null,
            descriptionEn: formData.descriptionEn.trim() || null,
            priceBdt: Number(formData.priceBdt),
            durationDays: Number(formData.durationDays),
            category: formData.category || null,
            features: filteredFeatures,
            isActive: formData.isActive,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create plan");

        setMessage({ text: "নতুন প্যাকেজ সফলভাবে তৈরি করা হয়েছে!", type: "success" });
      }

      setIsModalOpen(false);
      await fetchPlans();
      if (onPlanUpdated) onPlanUpdated();
    } catch (err: any) {
      setMessage({ text: err.message || "Operation failed", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlanItem) => {
    try {
      const res = await fetch(`/api/v1/admin/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      if (!res.ok) throw new Error("Status update failed");

      setMessage({
        text: plan.isActive ? "প্যাকেজটি নিষ্ক্রিয় করা হয়েছে।" : "প্যাকেজটি সক্রিয় করা হয়েছে।",
        type: "success",
      });
      await fetchPlans();
      if (onPlanUpdated) onPlanUpdated();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    }
  };

  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      plan.nameBn.toLowerCase().includes(search.toLowerCase()) ||
      plan.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      plan.code.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "ALL" ||
      (categoryFilter === "GENERAL" && !plan.category) ||
      plan.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">প্যাকেজ ও সাবস্ক্রিপশন প্রাইসিং ম্যানেজমেন্ট</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            শিক্ষার্থীদের সাবস্ক্রিপশন প্ল্যানের নাম, প্যাকেজ মূল্য (BDT), মেয়াদ এবং ফিচারসমূহ পরিচালনা ও আপডেট করুন।
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন প্যাকেজ তৈরি করুন</span>
        </button>
      </div>

      {/* Status Alert */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="প্যাকেজের নাম বা কোড দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:border-emerald-600"
          >
            <option value="ALL">সকল ক্যাটাগরি</option>
            <option value="SSC">এসএসসি (SSC)</option>
            <option value="HSC">এইচএসসি (HSC)</option>
            <option value="MEDICAL">মেডিকেল ভর্তি</option>
            <option value="UNIVERSITY">বিশ্ববিদ্যালয় ভর্তি</option>
            <option value="GENERAL">অল অ্যাক্সেস / জেনারেল</option>
          </select>

          <button
            onClick={fetchPlans}
            title="রিফ্রেশ করুন"
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
          <span>প্যাকেজ ও প্রাইস প্ল্যান লোড হচ্ছে...</span>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
          কোনো প্যাকেজ পাওয়া যায়নি।
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border transition shadow-xs flex flex-col justify-between overflow-hidden relative ${
                plan.isActive ? "border-slate-200 hover:border-emerald-500" : "border-slate-300 opacity-75 bg-slate-50"
              }`}
            >
              {/* Category & Status badges */}
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {plan.category || "ALL ACCESS"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleActive(plan)}
                      title={plan.isActive ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                      className="cursor-pointer"
                    >
                      {plan.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <Eye className="w-3 h-3" /> সক্রিয়
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                          <EyeOff className="w-3 h-3" /> নিষ্ক্রিয়
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900">{plan.nameBn}</h3>
                  <p className="text-xs text-slate-500 font-medium">{plan.nameEn} ({plan.code})</p>
                  {plan.descriptionBn && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {plan.descriptionBn}
                    </p>
                  )}
                </div>

                {/* Price Tag */}
                <div className="pt-2 pb-1 border-t border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {plan.priceBdt === 0 ? "ফ্রি" : `৳ ${plan.priceBdt}`}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      / {plan.durationDays} দিন
                    </span>
                  </div>
                  {plan.totalSubscriptions !== undefined && (
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      মোট সাবস্ক্রিপশন: {plan.totalSubscriptions} টি
                    </p>
                  )}
                </div>

                {/* Features List */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">প্যাকেজ ফিচারসমূহ:</p>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {plan.features.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{f}</span>
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-[11px] text-slate-500 italic pl-5.5">
                        + আরো {plan.features.length - 4} টি ফিচার...
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 font-mono">
                  Code: {plan.code}
                </span>

                <button
                  onClick={() => handleOpenEditModal(plan)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-emerald-600 hover:text-emerald-700 text-slate-700 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>প্যাকেজ এডিট করুন</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create or Edit Plan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingPlan ? "প্যাকেজ ও প্রাইস প্ল্যান আপডেট" : "নতুন সাবস্ক্রিপশন প্যাকেজ তৈরি"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  প্যাকেজের মূল্য, মেয়াদ ও ফিচারসমূহ সংশোধন করুন
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Plan Code & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">প্যাকেজ কোড (Code)</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPlan}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SSC_SPECIAL, HSC_BOOSTER"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 uppercase font-mono disabled:bg-slate-100"
                  />
                  <span className="text-[10px] text-slate-400">অনন্য শনাক্তকারী কোড (পরিবর্তনযোগ্য নয়)</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">ক্যাটাগরি</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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

              {/* Plan Names (Bangla & English) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">প্যাকেজের নাম (বাংলা) *</label>
                  <input
                    type="text"
                    required
                    value={formData.nameBn}
                    onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
                    placeholder="যেমন: এসএসসি স্পেশাল প্রিমিয়াম"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">প্যাকেজের নাম (English) *</label>
                  <input
                    type="text"
                    required
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    placeholder="e.g. SSC Special Premium"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Price and Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">প্যাকেজ মূল্য (BDT ৳) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={formData.priceBdt}
                    onChange={(e) => setFormData({ ...formData, priceBdt: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600 font-bold"
                  />
                  <span className="text-[10px] text-slate-400">০ হলে 'বিনামূল্যে/ফ্রি' প্রদর্শিত হবে</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">মেয়াদ (দিন হিসেবে) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value, 10) || 30 })}
                    placeholder="30"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                  />
                  <span className="text-[10px] text-slate-400">যেমন: 30, 90, 180 বা 365 দিন</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">স্ট্যাটাস</label>
                  <div className="pt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        {formData.isActive ? "সক্রিয় (পাবলিকলি দৃশ্যমান)" : "নিষ্ক্রিয় (লুকানো)"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Descriptions */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">বর্ণনা (বাংলা)</label>
                <textarea
                  rows={2}
                  value={formData.descriptionBn}
                  onChange={(e) => setFormData({ ...formData, descriptionBn: e.target.value })}
                  placeholder="প্যাকেজের সংক্ষিপ্ত বিবরণ..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>

              {/* Dynamic Features List */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">প্যাকেজের বৈশিষ্ট্যসমূহ (Features List)</label>
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>ফিচার যোগ করুন</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => handleFeatureChange(idx, e.target.value)}
                        placeholder={`ফিচার ${idx + 1}...`}
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-600"
                      />
                      {formData.features.length > 1 && (
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

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {saving ? (
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
    </div>
  );
}
