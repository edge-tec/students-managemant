"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  KeyRound,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Calendar,
  X,
  Copy,
  ExternalLink,
  UserPlus,
  Upload,
  FileText,
  Award,
  CheckSquare,
  Square,
  Edit,
  GraduationCap,
  BookOpen,
} from "lucide-react";

interface UserRecord {
  id: string;
  fullName: string;
  fullNameBn: string | null;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
  isVerified: boolean;
  preferredLang: string;
  createdAt: string;
  roles: string[];
  institution: string | null;
  targetCategory: string | null;
  district: string | null;
  examCount?: number;
  createdQuestionsCount?: number;
}

interface ExamSessionRecord {
  id: string;
  examTitle: string;
  category: string;
  mode: string;
  status: string;
  durationMinutes: number;
  serverStartTime: string;
  submittedAt: string | null;
  result?: {
    totalScore: number;
    maxMarks: number;
    correctCount: number;
    incorrectCount: number;
    accuracyPct: number;
    isPassed: boolean | null;
    rankInCohort: number | null;
  } | null;
}

interface LearningHistoryData {
  user: {
    id: string;
    fullName: string;
    fullNameBn: string | null;
    email: string;
    phoneNumber: string | null;
    isActive: boolean;
    isVerified: boolean;
    roles: string[];
    profile?: {
      institutionName?: string | null;
      targetCategory?: string | null;
      district?: string | null;
      division?: string | null;
      sscYear?: number | null;
      hscYear?: number | null;
      bio?: string | null;
    } | null;
  };
  examSessions: ExamSessionRecord[];
  academic: {
    classEnrollments: Array<{
      id: string;
      academicYear: string;
      status: string;
      academicClass: { nameBn: string; nameEn: string; code: string };
    }>;
    courseEnrollments: Array<{
      id: string;
      course: { titleBn: string; titleEn: string };
    }>;
  };
  analytics: {
    totalExamsTaken: number;
    completedExams: number;
    totalMistakesRecorded: number;
    unmasteredMistakes: number;
    masteredMistakes: number;
    bookmarksCount: number;
    streakDays: number;
    longestStreak: number;
  };
}

const ALL_ROLES = [
  "STUDENT",
  "TEACHER",
  "CONTENT_REVIEWER",
  "CONTENT_MANAGER",
  "SUPPORT_AGENT",
  "FINANCE_MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
];

const EXAM_CATEGORIES = ["SSC", "HSC", "MEDICAL", "DENTAL", "UNIVERSITY", "MODEL_TEST"];

export function UserManager() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Multi-selection for bulk actions
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkActionRole, setBulkActionRole] = useState("STUDENT");
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Modals & Drawers
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState("STUDENT");
  const [resetTokenData, setResetTokenData] = useState<{ resetUrl: string; expiresAt: string } | null>(null);

  // Create User Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    fullNameBn: "",
    email: "",
    phoneNumber: "",
    password: "",
    preferredLang: "bn",
    role: "STUDENT",
    targetCategory: "HSC",
    institutionName: "",
    district: "",
    division: "",
    sscYear: "",
    hscYear: "",
    bio: "",
  });
  const [creating, setCreating] = useState(false);

  // Edit User Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    fullNameBn: "",
    phoneNumber: "",
    preferredLang: "bn",
    institutionName: "",
    targetCategory: "",
    district: "",
    division: "",
    sscYear: "",
    hscYear: "",
    bio: "",
  });
  const [updating, setUpdating] = useState(false);

  // Profile & Learning History Drawer
  const [learningDrawerOpen, setLearningDrawerOpen] = useState(false);
  const [learningHistory, setLearningHistory] = useState<LearningHistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // CSV Import Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [importErrors, setImportErrors] = useState<Array<{ rowNumber: number; email?: string; errorMessage: string }>>([]);
  const [importSummary, setImportSummary] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (search.trim()) params.set("q", search.trim());
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/v1/admin/users?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      // Reset selection when page/filter changes
      setSelectedUserIds([]);
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ text: e.message || "Failed to load users", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle single status toggle
  const handleStatusToggle = async (user: UserRecord) => {
    const newStatus = !user.isActive;
    const confirmPrompt = !newStatus
      ? `Are you sure you want to suspend account for ${user.fullName}?`
      : `Reactivate account for ${user.fullName}?`;

    if (!confirm(confirmPrompt)) return;

    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_status",
          isActive: newStatus,
          reason: newStatus ? "Reactivated by admin" : "Suspended by admin",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }
      setMessage({
        text: `Account for ${user.fullName} has been ${newStatus ? "reactivated" : "suspended"}.`,
        type: "success",
      });
      fetchUsers();
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ text: e.message, type: "error" });
    }
  };

  // Bulk Status Update
  const handleBulkStatus = async (isActive: boolean) => {
    if (selectedUserIds.length === 0) return;
    const actionLabel = isActive ? "reactivate" : "suspend";
    if (!confirm(`Are you sure you want to ${actionLabel} ${selectedUserIds.length} selected accounts?`)) return;

    setBulkProcessing(true);
    try {
      const res = await fetch("/api/v1/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          userIds: selectedUserIds,
          isActive,
          reason: `Bulk ${actionLabel} by administrator`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to perform bulk action");
      }
      setMessage({
        text: `Bulk action complete: ${data.updatedCount} accounts updated (${data.skippedCount || 0} protected/skipped).`,
        type: "success",
      });
      setSelectedUserIds([]);
      fetchUsers();
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ text: e.message, type: "error" });
    } finally {
      setBulkProcessing(false);
    }
  };

  // Bulk Assign Role
  const handleBulkRoleAssign = async () => {
    if (selectedUserIds.length === 0) return;
    if (!confirm(`Assign role '${bulkActionRole}' to ${selectedUserIds.length} accounts?`)) return;

    setBulkProcessing(true);
    try {
      const res = await fetch("/api/v1/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_role",
          userIds: selectedUserIds,
          role: bulkActionRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign roles in bulk");
      }
      setMessage({
        text: `Successfully assigned ${bulkActionRole} role to ${data.affectedCount} users.`,
        type: "success",
      });
      setSelectedUserIds([]);
      fetchUsers();
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ text: e.message, type: "error" });
    } finally {
      setBulkProcessing(false);
    }
  };

  // Single Role Action
  const handleRoleAction = async (action: "ASSIGN" | "REVOKE") => {
    if (!selectedUser) return;
    try {
      const currentRoles = selectedUser.roles;
      let newRoles: string[];
      if (action === "ASSIGN") {
        newRoles = Array.from(new Set([...currentRoles, targetRole]));
      } else {
        newRoles = currentRoles.filter((r) => r !== targetRole);
      }

      const res = await fetch(`/api/v1/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_roles", roles: newRoles }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update role");
      }
      setMessage({
        text: `Role ${targetRole} ${action === "ASSIGN" ? "assigned" : "revoked"} successfully`,
        type: "success",
      });
      setRoleModalOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ text: e.message, type: "error" });
    }
  };

  // Generate Password Reset Token
  const handleGenerateReset = async (user: UserRecord) => {
    if (!confirm(`Generate one-time expiring password reset link for ${user.fullName}?`)) return;

    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate password reset token");
      }
      setResetTokenData({
        resetUrl: data.resetUrl,
        expiresAt: data.expiresAt,
      });
      setSelectedUser(user);
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ text: e.message, type: "error" });
    }
  };

  // Create User Submission
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: createForm.fullName,
          fullNameBn: createForm.fullNameBn || undefined,
          email: createForm.email,
          phoneNumber: createForm.phoneNumber || undefined,
          password: createForm.password || undefined,
          preferredLang: createForm.preferredLang,
          roles: [createForm.role],
          profile: {
            institutionName: createForm.institutionName || undefined,
            targetCategory: createForm.targetCategory || undefined,
            district: createForm.district || undefined,
            division: createForm.division || undefined,
            sscYear: createForm.sscYear ? parseInt(createForm.sscYear, 10) : undefined,
            hscYear: createForm.hscYear ? parseInt(createForm.hscYear, 10) : undefined,
            bio: createForm.bio || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setMessage({
        text: `User ${data.user.fullName} (${data.user.email}) created successfully! Initial password: ${
          data.user.generatedPassword || "as specified"
        }`,
        type: "success",
      });
      setCreateModalOpen(false);
      setCreateForm({
        fullName: "",
        fullNameBn: "",
        email: "",
        phoneNumber: "",
        password: "",
        preferredLang: "bn",
        role: "STUDENT",
        targetCategory: "HSC",
        institutionName: "",
        district: "",
        division: "",
        sscYear: "",
        hscYear: "",
        bio: "",
      });
      fetchUsers();
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ text: e.message, type: "error" });
    } finally {
      setCreating(false);
    }
  };

  // Edit User Submission
  const handleOpenEdit = (user: UserRecord) => {
    setSelectedUser(user);
    setEditForm({
      fullName: user.fullName || "",
      fullNameBn: user.fullNameBn || "",
      phoneNumber: user.phoneNumber || "",
      preferredLang: user.preferredLang || "bn",
      institutionName: user.institution || "",
      targetCategory: user.targetCategory || "",
      district: user.district || "",
      division: "",
      sscYear: "",
      hscYear: "",
      bio: "",
    });
    setEditModalOpen(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/v1/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editForm.fullName,
          fullNameBn: editForm.fullNameBn || undefined,
          phoneNumber: editForm.phoneNumber || undefined,
          preferredLang: editForm.preferredLang,
          profile: {
            institutionName: editForm.institutionName || undefined,
            targetCategory: editForm.targetCategory || undefined,
            district: editForm.district || undefined,
            division: editForm.division || undefined,
            sscYear: editForm.sscYear ? parseInt(editForm.sscYear, 10) : undefined,
            hscYear: editForm.hscYear ? parseInt(editForm.hscYear, 10) : undefined,
            bio: editForm.bio || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setMessage({ text: "User profile updated successfully.", type: "success" });
      setEditModalOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ text: e.message, type: "error" });
    } finally {
      setUpdating(false);
    }
  };

  // Fetch full learning history & open drawer
  const handleViewLearningHistory = async (user: UserRecord) => {
    setSelectedUser(user);
    setLearningDrawerOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}/learning`);
      if (!res.ok) {
        throw new Error("Failed to load learning activity");
      }
      const data = await res.json();
      setLearningHistory(data);
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ text: e.message, type: "error" });
    } finally {
      setHistoryLoading(false);
    }
  };

  // CSV Import Submission
  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) {
      alert("Please paste CSV text or select a file first.");
      return;
    }
    setImporting(true);
    setImportErrors([]);
    setImportSummary(null);

    try {
      const res = await fetch("/api/v1/admin/users/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import CSV");
      }

      setImportSummary({
        total: data.totalRows || 0,
        success: data.successfulRows || 0,
        failed: data.failedRows || 0,
      });
      setImportErrors(data.errors || []);

      if (data.successfulRows > 0) {
        setMessage({
          text: `CSV Import complete: ${data.successfulRows} user(s) created successfully!`,
          type: "success",
        });
        fetchUsers();
      }
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ text: e.message, type: "error" });
    } finally {
      setImporting(false);
    }
  };

  // Select all toggle
  const allOnPageSelected = users.length > 0 && users.every((u) => selectedUserIds.includes(u.id));
  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map((u) => u.id));
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>ব্যবহারকারী ও অ্যাকাডেমিক প্রশাসন (User Management & Administration)</span>
            </h2>
            <p className="text-xs text-slate-500">
              শিক্ষার্থী, শিক্ষক, কনটেন্ট রিভিউয়ার ও অ্যাডমিনিস্ট্রেটর অ্যাকাউন্ট নিরাপদে পরিচালনা করুন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchUsers()}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
              title="Refresh users"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>নতুন ব্যবহারকারী যোগ করুন</span>
            </button>

            <button
              onClick={() => setImportModalOpen(true)}
              className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV ইমপোর্ট</span>
            </button>

            <a
              href="/api/v1/admin/export?type=users"
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>রপ্তানি (CSV)</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="নাম, ইমেইল বা ফোন নম্বর দিয়ে খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="ALL">সকল রোল (All Roles)</option>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="ALL">সকল স্ট্যাটাস (All Status)</option>
              <option value="active">সক্রিয় (Active)</option>
              <option value="suspended">স্থগিত (Suspended)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Floating Bar */}
      {selectedUserIds.length > 0 && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {selectedUserIds.length}
            </span>
            <span className="text-xs font-bold text-emerald-950">
              জন ব্যবহারকারী নির্বাচিত করা হয়েছে (Selected)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={bulkProcessing}
              onClick={() => handleBulkStatus(false)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
            >
              নির্বাচিতদের স্থগিত করুন (Bulk Suspend)
            </button>

            <button
              disabled={bulkProcessing}
              onClick={() => handleBulkStatus(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
            >
              সক্রিয় করুন (Bulk Reactivate)
            </button>

            <div className="flex items-center gap-1 border-l border-emerald-200 pl-2">
              <select
                value={bulkActionRole}
                onChange={(e) => setBulkActionRole(e.target.value)}
                className="px-2 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-semibold"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                disabled={bulkProcessing}
                onClick={handleBulkRoleAssign}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                রোল দিন (Assign Role)
              </button>
            </div>

            <button
              onClick={() => setSelectedUserIds([])}
              className="px-2.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
            >
              বাতিল (Clear)
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-3 w-8">
                  <button
                    onClick={toggleSelectAll}
                    className="text-slate-500 hover:text-slate-800 transition"
                    title={allOnPageSelected ? "সব অনির্বাচন করুন" : "এই পৃষ্ঠার সব নির্বাচন করুন"}
                  >
                    {allOnPageSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">ব্যবহারকারী ও প্রতিষ্ঠান</th>
                <th className="py-3 px-4">যোগাযোগ</th>
                <th className="py-3 px-4">রোল ও অধিকার</th>
                <th className="py-3 px-4">স্ট্যাটাস</th>
                <th className="py-3 px-4">রেজিস্ট্রেশন তারিখ</th>
                <th className="py-3 px-4 text-right">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    কোন ব্যবহারকারী পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/70 transition ${
                        isSelected ? "bg-emerald-50/40" : ""
                      }`}
                    >
                      <td className="py-3 px-3">
                        <button
                          onClick={() => toggleSelectUser(u.id)}
                          className="text-slate-400 hover:text-slate-700 transition"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{u.fullName}</span>
                          {u.isVerified && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Verified" />
                          )}
                        </div>
                        {u.fullNameBn && (
                          <div className="text-xs text-slate-500">{u.fullNameBn}</div>
                        )}
                        {u.institution && (
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            🏫 {u.institution} {u.district ? `(${u.district})` : ""}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{u.id}</div>
                      </td>
                      <td className="py-3 px-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                        {u.phoneNumber && (
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{u.phoneNumber}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((role) => (
                            <span
                              key={role}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                role === "SUPER_ADMIN"
                                  ? "bg-purple-100 text-purple-900 border border-purple-200"
                                  : role === "ADMIN"
                                  ? "bg-rose-100 text-rose-900 border border-rose-200"
                                  : role === "TEACHER"
                                  ? "bg-blue-100 text-blue-900 border border-blue-200"
                                  : role === "CONTENT_REVIEWER"
                                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            u.isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {u.isActive ? (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>সক্রিয়</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3" />
                              <span>স্থগিত</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => handleViewLearningHistory(u)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold transition"
                          title="পরীক্ষা ও প্রোফাইল হিস্ট্রি"
                        >
                          <BookOpen className="w-3.5 h-3.5 inline mr-1" />
                          প্রোফাইল
                        </button>

                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                          title="প্রোফাইল সম্পাদনা"
                        >
                          <Edit className="w-3.5 h-3.5 inline" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setTargetRole(u.roles[0] || "STUDENT");
                            setRoleModalOpen(true);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                          title="রোল পরিচালনা"
                        >
                          <Shield className="w-3.5 h-3.5 inline" />
                        </button>

                        <button
                          onClick={() => handleGenerateReset(u)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold transition"
                          title="পাসওয়ার্ড রিসেট লিংক জেনারেট"
                        >
                          <KeyRound className="w-3.5 h-3.5 inline" />
                        </button>

                        <button
                          onClick={() => handleStatusToggle(u)}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
                            u.isActive
                              ? "bg-rose-50 hover:bg-rose-100 text-rose-800"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                          }`}
                          title={u.isActive ? "স্থগিত করুন" : "সক্রিয় করুন"}
                        >
                          {u.isActive ? "স্থগিত" : "সক্রিয়"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <div>
            মোট {total} জন ব্যবহারকারী (পৃষ্ঠা {page} / {totalPages})
          </div>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-50 font-semibold cursor-pointer"
            >
              পূর্ববর্তী
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-50 font-semibold cursor-pointer"
            >
              পরবর্তী
            </button>
          </div>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <span>নতুন ব্যবহারকারী অ্যাকাউন্ট তৈরি করুন</span>
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    পুরো নাম (ইংরেজি) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shakib Al Hasan"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    পুরো নাম (বাংলায়)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. সাকিব আল হাসান"
                    value={createForm.fullNameBn}
                    onChange={(e) => setCreateForm({ ...createForm, fullNameBn: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    ইমেইল ঠিকানা <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="student@example.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    মোবাইল নম্বর
                  </label>
                  <input
                    type="text"
                    placeholder="017XXXXXXXX"
                    value={createForm.phoneNumber}
                    onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    প্রাথমিক ভূমিকা (Role) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    প্রাথমিক পাসওয়ার্ড (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    placeholder="ফাঁকা রাখলে স্বয়ংক্রিয় তৈরি হবে"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="text-xs font-bold text-slate-800">
                  অ্যাকাডেমিক প্রোফাইল তথ্য (Academic Profile)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">লক্ষ্য পরীক্ষার বিভাগ</label>
                    <select
                      value={createForm.targetCategory}
                      onChange={(e) => setCreateForm({ ...createForm, targetCategory: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                    >
                      {EXAM_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 block mb-1">শিক্ষা প্রতিষ্ঠান</label>
                    <input
                      type="text"
                      placeholder="e.g. Notre Dame College"
                      value={createForm.institutionName}
                      onChange={(e) => setCreateForm({ ...createForm, institutionName: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">জেলা (District)</label>
                    <input
                      type="text"
                      placeholder="e.g. Dhaka, Bogura"
                      value={createForm.district}
                      onChange={(e) => setCreateForm({ ...createForm, district: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 block mb-1">এইচএসসি সাল (HSC Year)</label>
                    <input
                      type="number"
                      placeholder="e.g. 2026"
                      value={createForm.hscYear}
                      onChange={(e) => setCreateForm({ ...createForm, hscYear: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {creating ? "তৈরি হচ্ছে..." : "অ্যাকাউন্ট তৈরি করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-emerald-600" />
                <span>প্রোফাইল তথ্য সম্পাদনা ({selectedUser.email})</span>
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    পুরো নাম (ইংরেজি)
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    পুরো নাম (বাংলায়)
                  </label>
                  <input
                    type="text"
                    value={editForm.fullNameBn}
                    onChange={(e) => setEditForm({ ...editForm, fullNameBn: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  মোবাইল নম্বর
                </label>
                <input
                  type="text"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">শিক্ষা প্রতিষ্ঠান</label>
                  <input
                    type="text"
                    value={editForm.institutionName}
                    onChange={(e) => setEditForm({ ...editForm, institutionName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">জেলা (District)</label>
                  <input
                    type="text"
                    value={editForm.district}
                    onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {updating ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                <span>নিরাপদ CSV বাল্ক ব্যবহারকারী ইমপোর্ট</span>
              </h3>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-800">CSV কলাম ফরম্যাট:</div>
              <div className="font-mono text-[11px] text-slate-700">
                email,fullName,fullNameBn,phoneNumber,role,institution,targetCategory
              </div>
              <div className="text-[11px] text-slate-500">
                * প্রতিটি সারির ইমেইল ও নাম যাচাই করা হবে। ডুপ্লিকেট অ্যাকাউন্ট স্বয়ংক্রিয়ভাবে চিহ্নিত হবে।
              </div>
            </div>

            <form onSubmit={handleCsvImport} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  CSV ডেটা পেস্ট করুন অথবা ফাইল নির্বাচন করুন:
                </label>
                <textarea
                  rows={8}
                  placeholder={`email,fullName,fullNameBn,phoneNumber,role,institution,targetCategory\nstudent1@edubd.ac,Rahim Islam,রহিম ইসলাম,01711111111,STUDENT,Dhaka College,HSC\nteacher1@edubd.ac,Dr. Karim Ahmed,ড. করিম আহমেদ,01822222222,TEACHER,Rajshahi College,HSC`}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Import Results Summary */}
              {importSummary && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-emerald-900">ইমপোর্ট সারাংশ (Summary):</div>
                  <div className="text-emerald-800">
                    মোট সারি: {importSummary.total} | সফল: {importSummary.success} | ত্রুটি/ব্যর্থ:{" "}
                    {importSummary.failed}
                  </div>
                </div>
              )}

              {/* Row Level Errors Table */}
              {importErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-rose-900">
                    সারিভিত্তিক ত্রুটি তালিকা ({importErrors.length} টি ত্রুটি পাওয়া গেছে):
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                    {importErrors.map((err, idx) => (
                      <div key={idx} className="text-rose-800 flex items-start gap-1">
                        <span className="font-bold">সারি {err.rowNumber}:</span>
                        <span>{err.errorMessage}</span>
                        {err.email && <span className="text-slate-500 font-mono">({err.email})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const sample = `email,fullName,fullNameBn,phoneNumber,role,institution,targetCategory\nsample_student@edubd.ac,Shakil Khan,শাকিল খান,01799887766,STUDENT,Dhaka City College,HSC\nsample_teacher@edubd.ac,Farhana Akter,ফারহানা আক্তার,01899887766,TEACHER,Viqarunnisa Noon School,HSC`;
                    setCsvContent(sample);
                  }}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold underline"
                >
                  নমুনা ডেটা পূরণ করুন (Load Sample)
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition"
                  >
                    বন্ধ করুন
                  </button>
                  <button
                    type="submit"
                    disabled={importing}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    {importing ? "ইমপোর্ট হচ্ছে..." : "এখনই ইমপোর্ট করুন"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER PROFILE & LEARNING HISTORY DRAWER */}
      {learningDrawerOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-end z-50 animate-in fade-in">
          <div className="bg-white max-w-2xl w-full h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-start bg-slate-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{selectedUser.fullName}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      selectedUser.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {selectedUser.isActive ? "সক্রিয়" : "স্থগিত"}
                  </span>
                </div>
                {selectedUser.fullNameBn && (
                  <div className="text-xs text-slate-500">{selectedUser.fullNameBn}</div>
                )}
                <div className="text-xs text-slate-600 flex items-center gap-2 mt-1">
                  <span>✉ {selectedUser.email}</span>
                  {selectedUser.phoneNumber && <span>📞 {selectedUser.phoneNumber}</span>}
                </div>
              </div>

              <button
                onClick={() => setLearningDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {historyLoading ? (
                <div className="py-20 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  <span>লার্নিং হিস্ট্রি ও প্রোফাইল লোড হচ্ছে...</span>
                </div>
              ) : learningHistory ? (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-[11px] text-slate-500 font-semibold">পরীক্ষা দেওয়া হয়েছে</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">
                        {learningHistory.analytics.totalExamsTaken} টি
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-[11px] text-slate-500 font-semibold">সম্পূর্ণ পরীক্ষা</div>
                      <div className="text-lg font-bold text-emerald-700 mt-1">
                        {learningHistory.analytics.completedExams} টি
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-[11px] text-slate-500 font-semibold">ভুল প্রশ্ন (Mistakes)</div>
                      <div className="text-lg font-bold text-rose-700 mt-1">
                        {learningHistory.analytics.unmasteredMistakes} টি
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-[11px] text-slate-500 font-semibold">স্টাডি স্ট্রিক</div>
                      <div className="text-lg font-bold text-amber-700 mt-1">
                        🔥 {learningHistory.analytics.streakDays} দিন
                      </div>
                    </div>
                  </div>

                  {/* Academic Profile Details */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-emerald-600" />
                      <span>অ্যাকাডেমিক বিবরণ ও তথ্য (Academic Profile)</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                      <div>
                        প্রতিষ্ঠান:{" "}
                        <span className="font-semibold">
                          {learningHistory.user.profile?.institutionName || "উল্লিখিত নেই"}
                        </span>
                      </div>
                      <div>
                        টার্গেট পরীক্ষা:{" "}
                        <span className="font-semibold">
                          {learningHistory.user.profile?.targetCategory || "HSC"}
                        </span>
                      </div>
                      <div>
                        জেলা:{" "}
                        <span className="font-semibold">
                          {learningHistory.user.profile?.district || "উল্লিখিত নেই"}
                        </span>
                      </div>
                      <div>
                        এইচএসসি সাল:{" "}
                        <span className="font-semibold">
                          {learningHistory.user.profile?.hscYear || "উল্লিখিত নেই"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Class & Course Enrollments */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>শ্রেণি ও কোর্স এনরোলমেন্ট (Academic Enrollments)</span>
                    </h4>
                    {learningHistory.academic.classEnrollments.length === 0 ? (
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400">
                        কোন শ্রেণিতে সক্রিয় এনরোলমেন্ট নেই
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {learningHistory.academic.classEnrollments.map((e) => (
                          <div
                            key={e.id}
                            className="p-2.5 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs"
                          >
                            <span className="font-bold text-slate-800">
                              {e.academicClass.nameBn} ({e.academicClass.code})
                            </span>
                            <span className="text-[11px] text-slate-500">
                              সেশন: {e.academicYear} | স্ট্যাটাস:{" "}
                              <span className="font-bold text-emerald-700">{e.status}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Exam History */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>পরীক্ষার ফলাফল ও ইতিহাস (Real Exam Attempts)</span>
                    </h4>
                    {learningHistory.examSessions.length === 0 ? (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400 text-center">
                        এখনো কোনো পরীক্ষা গ্রহণ করা হয়নি
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {learningHistory.examSessions.map((s) => (
                          <div
                            key={s.id}
                            className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 text-xs"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-900">{s.examTitle}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  s.status === "EVALUATED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : s.status === "SUBMITTED"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {s.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3">
                              <span>বিভাগ: {s.category}</span>
                              <span>সময়কাল: {s.durationMinutes} মিনিট</span>
                              {s.submittedAt && (
                                <span>জমা: {new Date(s.submittedAt).toLocaleTimeString()}</span>
                              )}
                            </div>
                            {s.result && (
                              <div className="pt-1 border-t border-slate-100 flex justify-between items-center text-xs">
                                <span className="font-bold text-emerald-800">
                                  প্রাপ্ত নম্বর: {s.result.totalScore} / {s.result.maxMarks}
                                </span>
                                <span className="text-slate-600">
                                  সঠিকতা: {s.result.accuracyPct.toFixed(1)}% | মেধা ক্রম:{" "}
                                  {s.result.rankInCohort || "N/A"}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-400 py-10">কোন ডেটা পাওয়া যায়নি</div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setLearningDrawerOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROLE MODAL */}
      {roleModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-600" />
                <span>রোল অ্যাসাইনমেন্ট</span>
              </h3>
              <button onClick={() => setRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div>
                ব্যবহারকারী: <span className="font-bold text-slate-900">{selectedUser.fullName}</span> ({selectedUser.email})
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span>বর্তমান রোল:</span>
                <span className="font-bold text-slate-800">{selectedUser.roles.join(", ")}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">রোল নির্বাচন করুন</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handleRoleAction("REVOKE")}
                className="px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition"
              >
                রোল বাতিল করুন (Revoke)
              </button>
              <button
                onClick={() => handleRoleAction("ASSIGN")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                রোল বরাদ্দ করুন (Assign)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {resetTokenData && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-600" />
                <span>নিরাপদ পাসওয়ার্ড রিসেট লিংক তৈরি হয়েছে</span>
              </h3>
              <button onClick={() => setResetTokenData(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="font-bold">সতর্কতা:</div>
              <div>
                প্রশাসক কখনো ব্যবহারকারীর বিদ্যমান পাসওয়ার্ড দেখতে পাবেন না। এই একক-ব্যবহারযোগ্য লিংকটি ব্যবহারকারীর সাথে শেয়ার করুন। এটি ১ ঘণ্টা কার্যকর থাকবে।
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">রিসেট URL:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={resetTokenData.resetUrl}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 select-all"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(resetTokenData.resetUrl);
                    alert("লিংক কপি করা হয়েছে!");
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>কপি</span>
                </button>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                মেয়াদ: {new Date(resetTokenData.expiresAt).toLocaleTimeString()} পর্যন্ত কার্যকর।
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setResetTokenData(null)}
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
