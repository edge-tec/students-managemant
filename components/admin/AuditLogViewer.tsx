"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  User,
  Activity,
  X,
  FileCode,
  Layers,
  Calendar,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: any;
  ipAddress: string | null;
  createdAt: string;
  actor: {
    id?: string;
    name: string;
    email: string;
    roles: string[];
  };
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (search.trim()) params.set("search", search.trim());
      if (actionFilter !== "ALL") params.set("action", actionFilter);

      const res = await fetch(`/api/v1/admin/audit-logs?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch audit logs");
      }
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600" />
              <span>নিরাপত্তা ও অপারেশনাল অডিট লগ (Audit Trail & Activity Logs)</span>
            </h2>
            <p className="text-xs text-slate-500">
              প্ল্যাটফর্মের প্রতিটি সংবেদনশীল প্রশাসনিক কাজ, প্রশ্ন অনুমোদন, ভূমিকা পরিবর্তন ও আর্থিক লেনদেন অপরিবর্তনীয়ভাবে ট্র্যাকিং করা হয়।
            </p>
          </div>

          <button
            onClick={() => fetchLogs()}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="অ্যাকশন, রিসোর্স বা বিস্তারিত বিবরণ দিয়ে খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">সকল অ্যাকশন (All Actions)</option>
              <option value="QUESTION_APPROVED">প্রশ্ন অনুমোদন (QUESTION_APPROVED)</option>
              <option value="QUESTION_PUBLISHED">প্রশ্ন প্রকাশ (QUESTION_PUBLISHED)</option>
              <option value="QUESTION_REJECTED">প্রশ্ন প্রত্যাখ্যান (QUESTION_REJECTED)</option>
              <option value="USER_STATUS_UPDATED">ব্যবহারকারী স্ট্যাটাস (USER_STATUS_UPDATED)</option>
              <option value="USER_ROLE_ASSIGNED">রোল বরাদ্দ (USER_ROLE_ASSIGNED)</option>
              <option value="PASSWORD_RESET_REQUESTED">পাসওয়ার্ড রিসেট (PASSWORD_RESET_REQUESTED)</option>
              <option value="PAYMENT_VERIFIED">পেমেন্ট ভেরিফাই (PAYMENT_VERIFIED)</option>
              <option value="PAYMENT_REFUNDED">পেমেন্ট রিফান্ড (PAYMENT_REFUNDED)</option>
              <option value="SETTINGS_UPDATED">সেটিংস পরিবর্তন (SETTINGS_UPDATED)</option>
              <option value="DATA_EXPORTED">তথ্য এক্সপোর্ট (DATA_EXPORTED)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-4">সময় ও তারিখ</th>
                <th className="py-3 px-4">অ্যাকশন (Action)</th>
                <th className="py-3 px-4">রিসোর্স (Resource)</th>
                <th className="py-3 px-4">কর্তা (Actor)</th>
                <th className="py-3 px-4">আইপি ঠিকানা</th>
                <th className="py-3 px-4 text-right">বিস্তারিত</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    কোন অডিট রেকর্ড পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-sans">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          log.action.includes("APPROVED") || log.action.includes("PUBLISHED") || log.action.includes("VERIFIED")
                            ? "bg-emerald-100 text-emerald-800"
                            : log.action.includes("REJECTED") || log.action.includes("REFUNDED") || log.action.includes("SUSPENDED")
                            ? "bg-rose-100 text-rose-800"
                            : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-sans font-medium">
                      <span>{log.resource}</span>
                      {log.resourceId && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          ID: {log.resourceId.slice(0, 10)}...
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <div className="font-bold text-slate-900">{log.actor.name}</div>
                      <div className="text-[11px] text-slate-500">{log.actor.email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {log.ipAddress || "internal"}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                      >
                        বিবরণ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <div>মোট {total} টি অডিট এন্ট্রি (পৃষ্ঠা {page} / {totalPages})</div>
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

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-indigo-600" />
                <span>অডিট লগ বিস্তারিত বিবরণ</span>
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block">অ্যাকশন:</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">রিসোর্স:</span>
                  <span className="font-bold text-slate-900">{selectedLog.resource}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">কর্তা (Actor):</span>
                  <span className="font-bold text-slate-900">{selectedLog.actor.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">সময়:</span>
                  <span className="font-bold text-slate-900">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">পেলোড / বিবরণ (JSON):</label>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.details, null, 2) || "{}"}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
