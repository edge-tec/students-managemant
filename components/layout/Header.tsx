"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import {
  BookOpen,
  GraduationCap,
  Sparkles,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  ShieldAlert,
  Menu,
  X,
  Languages,
  FileQuestion,
  Layers,
  Library,
  CreditCard,
} from "lucide-react";

export function Header() {
  const { locale, setLocale, t } = useI18n();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    fullName: string;
    email: string;
    roles: string[];
  } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => setCurrentUser(null));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    setCurrentUser(null);
    setIsUserDropdownOpen(false);
    router.push("/");
    router.refresh();
  };

  const navLinks = [
    { href: "/ssc", label: t.nav.ssc },
    { href: "/hsc", label: t.nav.hsc },
    { href: "/medical", label: t.nav.medical },
    { href: "/university", label: t.nav.university },
    { href: "/questions", label: t.nav.questionBank, icon: FileQuestion },
    { href: "/exams", label: locale === "bn" ? "পরীক্ষা ও মডেল টেস্ট" : "Exams & Model Tests", icon: Layers },
    { href: "/library", label: t.nav.library, icon: Library },
    { href: "/pricing", label: t.nav.pricing, icon: CreditCard },
  ];

  const isAdminUser = currentUser?.roles?.includes("ADMIN") || currentUser?.roles?.includes("SUPER_ADMIN");

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner for Bangladesh Target Market */}
      <div className="bg-emerald-800 text-white text-xs py-1.5 px-4 text-center font-medium flex justify-between items-center max-w-7xl mx-auto">
        <span className="hidden sm:inline">
          🇧🇩 {locale === "bn" ? "বাংলাদেশের শিক্ষার্থীদের জন্য নির্ভরযোগ্য শিক্ষামূলক প্ল্যাটফর্ম" : "Reliable Educational SaaS for Students of Bangladesh"}
        </span>
        <span className="sm:hidden mx-auto font-semibold">{t.brand.tagline}</span>
        <div className="flex items-center gap-3">
          <Link href="/ai-assistant" className="inline-flex items-center gap-1 text-emerald-200 hover:text-white transition">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.nav.aiAssistant}</span>
          </Link>
          <span className="text-emerald-500">|</span>
          <button
            onClick={() => setLocale(locale === "bn" ? "en" : "bn")}
            className="inline-flex items-center gap-1 text-white hover:text-emerald-200 font-bold transition cursor-pointer"
            title="Switch Language"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{locale === "bn" ? "English" : "বাংলা"}</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm group-hover:bg-emerald-700 transition">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-900 tracking-tight leading-none group-hover:text-emerald-700 transition">
                  {t.brand.name}
                </span>
                <span className="text-[11px] text-emerald-600 font-medium tracking-wide mt-0.5">
                  {t.brand.tagline}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    isActive
                      ? "text-emerald-700 bg-emerald-50 font-semibold"
                      : "text-slate-600 hover:text-emerald-600 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Controls & Auth */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 bg-white text-sm font-medium text-slate-800 transition cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    {currentUser.fullName.charAt(0)}
                  </div>
                  <span className="max-w-[120px] truncate">{currentUser.fullName}</span>
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg border border-slate-200 py-1 z-50">
                    <div className="px-4 py-2 border-b border-slate-100 text-xs text-slate-500">
                      Signed in as <br />
                      <strong className="text-slate-800 font-medium">{currentUser.email}</strong>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                      <span>{t.nav.dashboard}</span>
                    </Link>

                    {isAdminUser && (
                      <Link
                        href="/admin"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50"
                      >
                        <ShieldAlert className="w-4 h-4 text-amber-600" />
                        <span>{t.nav.admin}</span>
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t.nav.logout}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-emerald-700 transition"
                >
                  {t.nav.login}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition"
                >
                  {t.nav.register}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-1">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-emerald-600 hover:bg-emerald-50"
            >
              {item.label}
            </Link>
          ))}

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            {currentUser ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-emerald-700 bg-emerald-50"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>{t.nav.dashboard}</span>
                </Link>
                {isAdminUser && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-amber-700 bg-amber-50"
                  >
                    <ShieldAlert className="w-5 h-5" />
                    <span>{t.nav.admin}</span>
                  </Link>
                )}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{t.nav.logout}</span>
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center py-2 px-3 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t.nav.login}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold"
                >
                  {t.nav.register}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
