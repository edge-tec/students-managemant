"use client";

import React, { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { MathText } from "@/components/ui/MathText";
import {
  Sparkles,
  Send,
  HelpCircle,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";

export default function AiAssistantPage() {
  const { locale, t } = useI18n();
  const [prompt, setPrompt] = useState("");
  const [subject, setSubject] = useState("Physics");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{
    answerBn: string;
    isAiGenerated: boolean;
    model: string;
    disclaimer: string;
  } | null>(null);

  const samplePrompts = [
    locale === "bn" ? "ভেক্টর ডট ও ক্রস গুণনের মধ্যে মূল পার্থক্য কী?" : "What is the difference between vector dot and cross product?",
    locale === "bn" ? "গতিশক্তি ও ভরবেগের সম্পর্ক সমীকরণসহ ব্যাখ্যা করুন।" : "Explain relationship between kinetic energy and momentum with equations.",
    locale === "bn" ? "পরমাণুর বোর মডেলের দুটি প্রধান স্বীকার্য কী কী?" : "What are the two main postulates of Bohr's atomic model?",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/v1/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, subject }),
      });

      const data = await res.json();
      setResponse(data);
      setLoading(false);
    } catch {
      setResponse({
        answerBn: "সার্ভারে অনুরোধ পাঠানো সম্ভব হয়নি। অনুগ্রহ করে ইন্টারনেট সংযোগ পরীক্ষা করুন।",
        isAiGenerated: false,
        model: "Network Error",
        disclaimer: "Connection error",
      });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>{locale === "bn" ? "বুদ্ধিমান এআই স্টাডি পার্টনার" : "AI Powered Academic Tutor"}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">
          {t.nav.aiAssistant}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
          {locale === "bn"
            ? "পদার্থ, রসায়ন বা গণিতের যেকোনো কঠিন সূত্র ও সমীকরণ বাংলায় ধাপে ধাপে বুঝে নিন।"
            : "Ask questions, review complex formulas, and get step-by-step explanations in Bengali."}
        </p>
      </div>

      {/* Input Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg outline-none bg-white text-slate-700"
            >
              <option value="Physics">{locale === "bn" ? "পদার্থবিজ্ঞান (Physics)" : "Physics"}</option>
              <option value="Chemistry">{locale === "bn" ? "রসায়ন (Chemistry)" : "Chemistry"}</option>
              <option value="Mathematics">{locale === "bn" ? "উচ্চতর গণিত (Math)" : "Mathematics"}</option>
              <option value="Biology">{locale === "bn" ? "জীববিজ্ঞান (Biology)" : "Biology"}</option>
            </select>
          </div>

          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={locale === "bn" ? "এখানে আপনার প্রশ্ন লিখুন (যেমন: কাজ W = F * s সূত্রটির ব্যাখ্যা কী?)..." : "Ask your academic question here..."}
            className="w-full p-4 text-sm border border-slate-300 rounded-xl outline-none focus:border-emerald-600 resize-none"
          />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-500">
              <span className="font-semibold flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-amber-500" />
                <span>{locale === "bn" ? "নমুনা প্রশ্ন:" : "Samples:"}</span>
              </span>
              {samplePrompts.map((s, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setPrompt(s)}
                  className="hover:text-emerald-700 hover:underline text-left cursor-pointer"
                >
                  "{s.slice(0, 32)}..."
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
            >
              {loading ? (
                <span>{t.common.loading}</span>
              ) : (
                <>
                  <span>{locale === "bn" ? "ব্যাখ্যা তৈরি করুন" : "Explain Step-by-Step"}</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Response Box */}
      {response && (
        <div className="p-6 rounded-2xl bg-white border border-emerald-200 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{locale === "bn" ? "এআই শিক্ষকের বিশদ সমাধান" : "AI Step-by-Step Explanation"}</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              {response.model}
            </span>
          </div>

          <div className="text-sm sm:text-base text-slate-800 leading-relaxed space-y-2 whitespace-pre-line">
            <MathText text={response.answerBn} />
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{response.disclaimer}</span>
          </div>
        </div>
      )}
    </div>
  );
}
