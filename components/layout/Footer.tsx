"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { GraduationCap, Mail, Phone, MapPin, Heart } from "lucide-react";

export function Footer() {
  const { locale, t } = useI18n();

  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                {t.brand.name}
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              {locale === "bn"
                ? "বাংলাদেশের শীর্ষস্থানীয় ডিজিটাল এডুকেশন প্ল্যাটফর্ম। এসএসসি, এইচএসসি, মেডিকেল ও বিশ্ববিদ্যালয় ভর্তি পরীক্ষার প্রস্তুতিকে সহজ ও নিশ্চিত করুন।"
                : "Bangladesh's leading digital learning platform for SSC, HSC, Medical, and University Admission test excellence."}
            </p>
            <div className="pt-2 text-xs text-emerald-400 font-semibold tracking-wide">
              {t.brand.tagline}
            </div>
          </div>

          {/* Academic Categories */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3 tracking-wider uppercase">
              {locale === "bn" ? "প্রস্তুতি কর্নার" : "Curriculum Corners"}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/ssc" className="hover:text-emerald-400 transition">
                  {t.nav.ssc}
                </Link>
              </li>
              <li>
                <Link href="/hsc" className="hover:text-emerald-400 transition">
                  {t.nav.hsc}
                </Link>
              </li>
              <li>
                <Link href="/medical" className="hover:text-emerald-400 transition">
                  {t.nav.medical}
                </Link>
              </li>
              <li>
                <Link href="/university" className="hover:text-emerald-400 transition">
                  {t.nav.university}
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Tools */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3 tracking-wider uppercase">
              {locale === "bn" ? "পরীক্ষা ও অনুশীলন" : "Tests & Practice"}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/questions" className="hover:text-emerald-400 transition">
                  {t.nav.questionBank}
                </Link>
              </li>
              <li>
                <Link href="/exams/custom" className="hover:text-emerald-400 transition">
                  {t.nav.customExam}
                </Link>
              </li>
              <li>
                <Link href="/library" className="hover:text-emerald-400 transition">
                  {t.nav.library}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-emerald-400 transition">
                  {t.nav.pricing}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details & Legal */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3 tracking-wider uppercase">
              {locale === "bn" ? "যোগাযোগ ও নীতি" : "Contact & Policies"}
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Panthapath, Dhaka-1205, Bangladesh</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>support@edubd.ac</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>+880 1700-000000</span>
              </li>
              <li className="pt-2 text-xs flex flex-wrap gap-2 text-slate-400">
                <Link href="/terms" className="hover:text-white underline">
                  Terms
                </Link>
                <span>•</span>
                <Link href="/privacy" className="hover:text-white underline">
                  Privacy
                </Link>
                <span>•</span>
                <Link href="/refund" className="hover:text-white underline">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 mt-8 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 EduBD (শিক্ষা বিডি). All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for the students of Bangladesh
          </p>
        </div>
      </div>
    </footer>
  );
}
