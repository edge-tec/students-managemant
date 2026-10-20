"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import {
  Search,
  BookOpen,
  GraduationCap,
  Stethoscope,
  Building2,
  FileQuestion,
  Layers,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Clock,
  ShieldCheck,
  Library,
  ChevronRight,
  HelpCircle,
  Award,
} from "lucide-react";

export default function HomePage() {
  const { locale, t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/questions?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const corners = [
    {
      id: "ssc",
      title: t.categories.sscTitle,
      desc: t.categories.sscDesc,
      icon: BookOpen,
      badge: "Class 9 & 10",
      href: "/ssc",
      color: "border-blue-200 bg-blue-50/50 text-blue-700",
    },
    {
      id: "hsc",
      title: t.categories.hscTitle,
      desc: t.categories.hscDesc,
      icon: GraduationCap,
      badge: "Class 11 & 12",
      href: "/hsc",
      color: "border-emerald-200 bg-emerald-50/50 text-emerald-700",
    },
    {
      id: "medical",
      title: t.categories.medTitle,
      desc: t.categories.medDesc,
      icon: Stethoscope,
      badge: "MBBS & BDS",
      href: "/medical",
      color: "border-rose-200 bg-rose-50/50 text-rose-700",
    },
    {
      id: "university",
      title: t.categories.uniTitle,
      desc: t.categories.uniDesc,
      icon: Building2,
      badge: "DU, RU, GST",
      href: "/university",
      color: "border-purple-200 bg-purple-50/50 text-purple-700",
    },
  ];

  const features = [
    {
      title: locale === "bn" ? "সার্ভার-অথরিটেটিভ এক্সাম ইঞ্জিন" : "Server-Authoritative Exam Engine",
      desc:
        locale === "bn"
          ? "ব্রাউজারে কোনো ফেক টাইমার নয়। মিলি-সেকেন্ড নির্ভুল সার্ভার কাউন্টডাউন, স্বয়ংক্রিয় সেভ এবং ০.২৫ নেগেটিভ মার্কিং হিসাব।"
          : "Server-enforced deadlines, resilient autosave, and verified negative marking scoring.",
      icon: Clock,
    },
    {
      title: locale === "bn" ? "ভুল উত্তরের স্বয়ংক্রিয় খাতা" : "Wrong Answers Practice Notebook",
      desc:
        locale === "bn"
          ? "পরীক্ষায় যেসব প্রশ্নে ভুল করবেন, সেগুলো স্বয়ংক্রিয়ভাবে আপনার ভুল খাতায় যুক্ত হবে। আয়ত্ত না হওয়া পর্যন্ত বারবার প্র্যাকটিস করুন।"
          : "Incorrect answers automatically sync to your personal mistake notebook for targeted practice.",
      icon: TrendingUp,
    },
    {
      title: locale === "bn" ? "বোর্ড ও বিশ্ববিদ্যালয় রেফারেন্স" : "Verified Historical References",
      desc:
        locale === "bn"
          ? "প্রতিটি প্রশ্নের সাথে বিগত বছরের ঢাকা, রাজশাহী বোর্ড ও ঢাবি, মেডিকেল ভর্তির নিখুঁত রেফারেন্স ও পাঠ্যবই পৃষ্ঠা নং।"
          : "Authentic board year tags, university unit citations, and NCTB textbook page references.",
      icon: ShieldCheck,
    },
    {
      title: locale === "bn" ? "এআই স্টাডি অ্যাসিস্ট্যান্ট" : "AI Study Assistant",
      desc:
        locale === "bn"
          ? "জটিল গাণিতিক সূত্র ও বিজ্ঞানের সমীকরণ বাংলায় সহজ ধাপে ধাপে বুঝে নিন।"
          : "Step-by-step LaTeX formula walkthroughs and concept explanations.",
      icon: Sparkles,
    },
  ];

  const faqs = [
    {
      q: locale === "bn" ? "কাস্টম এক্সাম কিভাবে কাজ করে?" : "How does the Custom Exam Center work?",
      a:
        locale === "bn"
          ? "আপনি আপনার পছন্দের বিষয়, এক বা একাধিক অধ্যায়, প্রশ্নের সংখ্যা (১০-১০০) এবং সময় নির্বাচন করে মুহূর্তে রিয়েল টাইমারযুক্ত পরীক্ষা তৈরি করতে পারেন।"
          : "Choose your subject, multiple chapters, question count, and duration to generate custom timed exams.",
    },
    {
      q: locale === "bn" ? "মেডিকেল ও বিশ্ববিদ্যালয় ভর্তির নেগেটিভ মার্কিং কি নিখুঁত?" : "Are negative markings accurate?",
      a:
        locale === "bn"
          ? "হ্যাঁ, সার্ভার-সাইডে প্রতি ভুলের জন্য ০.২৫ নম্বর কাটা হয় এবং সঠিক উত্তরের জন্য ১ নম্বর যোগ করা হয়।"
          : "Yes, negative marking (-0.25) and scores are strictly calculated server-side.",
    },
    {
      q: locale === "bn" ? "পেমেন্ট করতে কোন কোন মাধ্যম ব্যবহার করা যায়?" : "What payment methods are supported?",
      a:
        locale === "bn"
          ? "বিকাশ (bKash), নগদ (Nagad), ব্যাংক ট্রান্সফার এবং যেকোনো ডেবিট/ক্রেডিট কার্ডের মাধ্যমে তাৎক্ষণিক সাবস্ক্রিপশন সক্রিয় করা যায়।"
          : "bKash, Nagad, manual bank transfers, and standard debit/credit cards.",
    },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-emerald-50/70 via-white to-slate-50 border-b border-slate-200 pt-16 pb-20">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold tracking-wide uppercase">
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            <span>{locale === "bn" ? "বাংলাদেশের ১ নম্বর এডুকেশনাল টেস্ট প্ল্যাটফর্ম" : "Bangladesh's #1 Educational Exam Platform"}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {locale === "bn" ? "শিখুন • অনুশীলন করুন • " : "Learn • Practice • "}
            <span className="text-emerald-600">
              {locale === "bn" ? "পরীক্ষা দিন • সফল হোন" : "Test • Succeed"}
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {locale === "bn"
              ? "এসএসসি, এইচএসসি, মেডিকেল এবং বিশ্ববিদ্যালয় ভর্তি পরীক্ষার জন্য বিগত ২০ বছরের বোর্ড প্রশ্ন, রিয়েল-টাইম নেগেটিভ মার্কিং মডেল টেস্ট এবং বিশদ ব্যাখ্যা।"
              : "Authentic board questions, timed real exams with negative marking, wrong answer tracking, and verified step-by-step solutions."}
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto pt-2">
            <div className="relative flex items-center shadow-md rounded-xl overflow-hidden border border-slate-300 focus-within:border-emerald-600 bg-white">
              <div className="pl-4 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.common.searchPlaceholder}
                className="w-full px-4 py-3.5 text-sm sm:text-base text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-3.5 text-sm transition cursor-pointer"
              >
                {locale === "bn" ? "অনুসন্ধান" : "Search"}
              </button>
            </div>
          </form>

          {/* Quick CTA Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href="/exams/custom"
              className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition inline-flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              <span>{t.exam.customBuilderTitle}</span>
            </Link>
            <Link
              href="/questions"
              className="px-6 py-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-sm shadow-xs transition inline-flex items-center gap-2"
            >
              <FileQuestion className="w-4 h-4 text-emerald-600" />
              <span>{t.nav.questionBank}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Curriculum Portals (SSC, HSC, Medical, University) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {locale === "bn" ? "পরীক্ষাভিত্তিক স্পেশাল কর্নার" : "Specialized Curriculum Corners"}
          </h2>
          <p className="text-sm text-slate-600">
            {locale === "bn" ? "আপনার লক্ষ্য নির্বাচন করুন এবং সম্পূর্ণ প্রস্তুতি শুরু করুন" : "Select your target exam and accelerate your preparation"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {corners.map((corner) => {
            const Icon = corner.icon;
            return (
              <Link
                key={corner.id}
                href={corner.href}
                className="group p-6 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${corner.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {corner.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition">
                      {corner.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {corner.desc}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center text-xs font-semibold text-emerald-600 group-hover:translate-x-1 transition">
                  <span>{locale === "bn" ? "প্রবেশ করুন" : "Explore"}</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Platform Engines Highlights */}
      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {locale === "bn" ? "কেন শিক্ষা বিডি প্ল্যাটফর্ম অনন্য?" : "Why Students Choose EduBD"}
            </h2>
            <p className="text-sm text-slate-600">
              {locale === "bn" ? "রিয়েল সফটওয়্যার ইঞ্জিনিয়ারিং ও নিখুঁত একাডেমিক ডেটাবেস" : "Engineered for exam accuracy, real progress and student success"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div key={idx} className="space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{feat.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Callout Section: Custom Exam Center */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-emerald-900 text-white p-8 sm:p-12 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <Layers className="w-4 h-4" />
              <span>{t.exam.customBuilderTitle}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {locale === "bn" ? "নিজের ইচ্ছামতো কাস্টম মডেল টেস্ট তৈরি করুন" : "Build Your Own Custom Mock Exam"}
            </h2>
            <p className="text-emerald-100 text-sm leading-relaxed">
              {locale === "bn"
                ? "যেকোনো নির্দিষ্ট অধ্যায় বা পূর্ণ বই থেকে পছন্দমতো প্রশ্ন সংখ্যা (১০-১০০) ও সময় বেছে নিয়ে এখনই পরীক্ষা শুরু করুন।"
                : "Select specific chapters or entire subjects, customize question count and timer, and test yourself right away."}
            </p>
          </div>
          <Link
            href="/exams/custom"
            className="shrink-0 px-6 py-3.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-sm shadow-md transition"
          >
            {t.exam.createExamBtn}
          </Link>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900">
            {locale === "bn" ? "সাধারণ জিজ্ঞাসা (FAQ)" : "Frequently Asked Questions"}
          </h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-5 rounded-xl bg-white border border-slate-200">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-900 text-sm sm:text-base">{faq.q}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
