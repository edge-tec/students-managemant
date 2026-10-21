"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  DollarSign,
  TrendingUp,
  RotateCcw,
  Clock,
  X,
  FileText,
} from "lucide-react";

interface PaymentRecord {
  id: string;
  amountBdt: number;
  status: "PENDING" | "VERIFIED" | "FAILED" | "REFUNDED";
  method: string;
  trxId: string | null;
  manualBankRef: string | null;
  createdAt: string;
  verifiedAt: string | null;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
  };
  subscriptionPlan?: {
    nameEn: string;
    nameBn: string;
    durationDays: number;
  } | null;
}

interface FinanceSummary {
  verifiedRevenueBdt: number;
  refundedRevenueBdt: number;
  pendingCount: number;
  verifiedCount: number;
  totalOrders: number;
}

export function FinanceManager() {
  const [orders, setOrders] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [refundModalOrder, setRefundModalOrder] = useState<PaymentRecord | null>(null);
  const [refundReason, setRefundReason] = useState("");

  const fetchFinance = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (methodFilter !== "ALL") params.set("method", methodFilter);

      const res = await fetch(`/api/v1/admin/finance?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch finance records");
      }
      const data = await res.json();
      setOrders(data.orders);
      setSummary(data.summary);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to load financial records", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, methodFilter]);

  useEffect(() => {
    fetchFinance();
  }, [fetchFinance]);

  const handleVerify = async (orderId: string) => {
    if (!confirm("Are you sure you want to verify and activate this payment order?")) return;

    try {
      const res = await fetch("/api/v1/admin/finance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: "VERIFIED" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to verify payment");
      }
      setMessage({ text: "Payment verified successfully. Subscription activated.", type: "success" });
      fetchFinance();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    }
  };

  const handleRefund = async () => {
    if (!refundModalOrder) return;
    if (!refundReason.trim()) {
      alert("Please provide a reason for the refund.");
      return;
    }

    try {
      const res = await fetch("/api/v1/admin/finance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: refundModalOrder.id,
          status: "REFUNDED",
          reason: refundReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process refund");
      }
      setMessage({ text: "Payment marked as REFUNDED and recorded in audit log.", type: "success" });
      setRefundModalOrder(null);
      setRefundReason("");
      fetchFinance();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>যাচাইকৃত মোট আয় (Verified Net)</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700">
              ৳ {summary.verifiedRevenueBdt.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400">সফল ও অ্যাক্টিভেটেড অর্ডারের মোট যোগফল</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>যাচাইয়ের অপেক্ষায় (Pending)</span>
            </div>
            <div className="text-2xl font-extrabold text-amber-700">{summary.pendingCount} টি অর্ডার</div>
            <div className="text-[11px] text-slate-400">ম্যানুয়াল ব্যাংক ট্রান্সফার বা পেমেন্ট প্রক্রিয়াধীন</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>রিফান্ডকৃত পরিমাণ (Refunded)</span>
            </div>
            <div className="text-2xl font-extrabold text-rose-700">
              ৳ {summary.refundedRevenueBdt.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400">অনুমোদিত রিফান্ড রেকর্ড</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <span>সর্বমোট ট্রানজেকশন (Total Orders)</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{summary.totalOrders} টি</div>
            <div className="text-[11px] text-slate-400">সফল ভেরিফিকেশন: {summary.verifiedCount} টি</div>
          </div>
        </div>
      )}

      {/* Control Bar & Filter */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <span>পেমেন্ট লেজার ও সাবস্ক্রিপশন ফাইন্যান্স (Finance & Transactions)</span>
            </h2>
            <p className="text-xs text-slate-500">
              bKash, Nagad এবং ব্যাংক ট্রান্সফার ভেরিফিকেশন লেজার। প্রতিটি আর্থিক পরিবর্তন অডিট লগে সংরক্ষিত হয়।
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchFinance()}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
              title="Refresh finance"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <a
              href="/api/v1/admin/export?type=payments"
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>লেজার এক্সপোর্ট (CSV)</span>
            </a>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-3 rounded-xl flex items-center justify-between text-xs font-semibold ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="ALL">সকল স্ট্যাটাস (All Payment Statuses)</option>
              <option value="VERIFIED">যাচাইকৃত (Verified)</option>
              <option value="PENDING">অপেক্ষমাণ (Pending)</option>
              <option value="REFUNDED">রিফান্ডকৃত (Refunded)</option>
              <option value="FAILED">ব্যর্থ (Failed)</option>
            </select>
          </div>

          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="ALL">সকল পেমেন্ট মাধ্যম (All Gateways)</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
              <option value="CARD">Debit / Credit Card</option>
              <option value="BANK_TRANSFER">Bank Transfer / Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-4">অর্ডার আইডি</th>
                <th className="py-3 px-4">শিক্ষার্থী</th>
                <th className="py-3 px-4">প্ল্যান ও প্যাকেজ</th>
                <th className="py-3 px-4">পরিমাণ (BDT)</th>
                <th className="py-3 px-4">মাধ্যম ও ট্রানজেকশন</th>
                <th className="py-3 px-4">স্ট্যাটাস</th>
                <th className="py-3 px-4 text-right">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    কোন পেমেন্ট রেকর্ড পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      <div>{order.id.slice(0, 13)}...</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{order.user.fullName}</div>
                      <div className="text-xs text-slate-500">{order.user.email}</div>
                      {order.user.phone && (
                        <div className="text-[11px] text-slate-400">{order.user.phone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {order.subscriptionPlan?.nameBn || order.subscriptionPlan?.nameEn || "কোর্স সাবস্ক্রিপশন"}
                      </div>
                      {order.subscriptionPlan?.durationDays && (
                        <div className="text-[11px] text-slate-400">
                          {order.subscriptionPlan.durationDays} দিন মেয়াদ
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ৳ {order.amountBdt.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 space-y-0.5">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold">
                        {order.method}
                      </span>
                      {(order.trxId || order.manualBankRef) && (
                        <div className="font-mono text-[10px] text-slate-500">
                          Ref: {order.trxId || order.manualBankRef}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          order.status === "VERIFIED"
                            ? "bg-emerald-100 text-emerald-800"
                            : order.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : order.status === "REFUNDED"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {order.status === "VERIFIED" && <CheckCircle2 className="w-3 h-3" />}
                        {order.status === "PENDING" && <Clock className="w-3 h-3" />}
                        {order.status === "REFUNDED" && <RotateCcw className="w-3 h-3" />}
                        <span>{order.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {order.status === "PENDING" && (
                        <button
                          onClick={() => handleVerify(order.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                        >
                          ভেরিফাই
                        </button>
                      )}
                      {order.status === "VERIFIED" && (
                        <button
                          onClick={() => {
                            setRefundModalOrder(order);
                            setRefundReason("");
                          }}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition"
                        >
                          রিফান্ড
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <div>পৃষ্ঠা {page} / {totalPages}</div>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-50 font-semibold"
            >
              পূর্ববর্তী
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-50 font-semibold"
            >
              পরবর্তী
            </button>
          </div>
        </div>
      </div>

      {/* Refund Confirmation Modal */}
      {refundModalOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <span>রিফান্ড অনুমোদন</span>
              </h3>
              <button onClick={() => setRefundModalOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div>শিক্ষার্থী: <span className="font-bold text-slate-800">{refundModalOrder.user.fullName}</span></div>
              <div>অর্ডার পরিমাণ: <span className="font-bold text-slate-800">৳ {refundModalOrder.amountBdt}</span></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">রিফান্ডের কারণ (অডিট লগের জন্য আবশ্যক)</label>
              <textarea
                rows={3}
                placeholder="রিফান্ডের কারণ লিখুন (যেমন: ডুপ্লিকেট পেমেন্ট, কোর্স বাতিল অনুরোধ)..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRefundModalOrder(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition"
              >
                বাতিল
              </button>
              <button
                onClick={handleRefund}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                রিফান্ড নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
