import { describe, it, expect } from "vitest";
import { BijoyConverterService } from "@/lib/pdf/bijoyConverter";
import { TextCleanerService } from "@/lib/pdf/textCleaner";
import { AiQuestionGeneratorService, GeneratedQuestionPayload } from "@/lib/pdf/aiQuestionGenerator";
import { AiQuestionType } from "@prisma/client";

describe("Bengali Font Support & Unicode Healing Tests", () => {
  describe("Phase 2: Bijoy to Unicode Conversion", () => {
    it("should detect Bijoy ANSI encoded text and ignore genuine English or Unicode", () => {
      const bijoySample = "Avwg evsjvq Mvb MvB, cÖkœ I DËi";
      expect(BijoyConverterService.isBijoyEncoded(bijoySample)).toBe(true);

      const unicodeSample = "আমি বাংলায় গান গাই, প্রশ্ন ও উত্তর";
      expect(BijoyConverterService.isBijoyEncoded(unicodeSample)).toBe(false);

      const englishSample = "The quick brown fox jumps over the lazy dog and they have been there.";
      expect(BijoyConverterService.isBijoyEncoded(englishSample)).toBe(false);
    });

    it("should correctly convert common and complex Bijoy strings to standard Bengali Unicode", () => {
      // 1. Basic words
      expect(BijoyConverterService.convertBijoyToUnicode("evsjv")).toBe("বাংলা");
      expect(BijoyConverterService.convertBijoyToUnicode("cÖkœ")).toBe("প্রশ্ন");
      expect(BijoyConverterService.convertBijoyToUnicode("DËi")).toBe("উত্তর");
      expect(BijoyConverterService.convertBijoyToUnicode("Avwg")).toBe("আমি");
      expect(BijoyConverterService.convertBijoyToUnicode("Avgvi")).toBe("আমার");
      expect(BijoyConverterService.convertBijoyToUnicode("GKwU")).toBe("একটি");
      expect(BijoyConverterService.convertBijoyToUnicode("PwiÎ")).toBe("চরিত্র");
      expect(BijoyConverterService.convertBijoyToUnicode("wewfbœ")).toBe("বিভিন্ন");

      // 2. Non-greedy vowel placement (must not produce 'বাংলাদশে')
      expect(BijoyConverterService.convertBijoyToUnicode("evsjv†`k")).toBe("বাংলাদেশ");
      expect(BijoyConverterService.convertBijoyToUnicode("evsjv‡`k")).toBe("বাংলাদেশ");

      // 3. Reph combined with vowel signs (নির্দেশ)
      expect(BijoyConverterService.convertBijoyToUnicode("wb‡`©k")).toBe("নির্দেশ");

      // 4. Composite okar and oukar
      expect(BijoyConverterService.convertBijoyToUnicode("‡Kvb")).toBe("কোন");
      expect(BijoyConverterService.convertBijoyToUnicode("‡MŠiæ")).toBe("গৌরু");

      // 5. Complex conjuncts and phalas
      expect(BijoyConverterService.convertBijoyToUnicode("cÖ_g")).toBe("প্রথম");
      expect(BijoyConverterService.convertBijoyToUnicode("we`¨vjq")).toBe("বিদ্যালয়");
      expect(BijoyConverterService.convertBijoyToUnicode("¯‹yj")).toBe("স্কুল");
      expect(BijoyConverterService.convertBijoyToUnicode("¯’vb")).toBe("স্থান");
      expect(BijoyConverterService.convertBijoyToUnicode("AvZ¥v")).toBe("আত্মা");
    });
  });

  describe("Phase 3: Broken Bengali Font & CMap Detection", () => {
    it("should flag Word 2013 mangled CMap text from user's reported document", () => {
      // The exact corrupted string reported in user's prompt
      const reportedCorruptedSample =
        "সংক্ষিপ্ত উত্তর দিন: আব্দু ি িোলোম ইবন ববরতজি ইবন নোতির আশ্ ল আব্দু ল কোরীম";
      expect(TextCleanerService.isBrokenBengaliFont(reportedCorruptedSample)).toBe(true);

      const corruptedSample2 = "িোহকীক ও িোখরীজ এবং আল্ল োমো শোইখ আব্দু র রহমোন ইবন নোতির";
      expect(TextCleanerService.isBrokenBengaliFont(corruptedSample2)).toBe(true);

      const legacyCMapParagraph =
        "স্ব\nোশ্ থণর তবপরীি ও িোশ্ দর ভ্র োন্ত বোতিল প্র বৃতত্ত র বোধোস্বরূ প বদখল। তকন্তু যখন\nআল্ল োহর পে বথশ্ ক দীন আিল যো মোনুষশ্ ক আল্ল োহর ইবোদি ও িোাঁর";
      expect(TextCleanerService.isBrokenBengaliFont(legacyCMapParagraph)).toBe(true);
    });

    it("should not flag properly formatted Bengali Unicode text", () => {
      const cleanUnicode =
        "বাংলাদেশের রাজধানী ঢাকা। বাংলা আমাদের মাতৃভাষা। ১৯৭১ সালে মহান মুক্তিযুদ্ধের মাধ্যমে বাংলাদেশ স্বাধীনতা অর্জন করে।";
      expect(TextCleanerService.isBrokenBengaliFont(cleanUnicode)).toBe(false);

      const complexValidUnicode =
        "ব্রাহ্মণবাড়িয়া এবং যুক্তরাষ্ট্রের বিজ্ঞান ও প্রযুক্তি ক্ষেত্রে অভূতপূর্ব সাফল্য অর্জিত হয়েছে।";
      expect(TextCleanerService.isBrokenBengaliFont(complexValidUnicode)).toBe(false);
    });
  });

  describe("Phase 3: HTML Entity Handling & Decoding", () => {
    it("should decode named, hex, and malformed decimal HTML entities", () => {
      // 1. User's exact reported example: **সমাধান:&#xA0;**&#986;ব্দু ি িোলোম...
      const rawUserString = "**সমাধান:&#xA0;**&#986;ব্দু ি িোলোম...";
      const decodedUserString = TextCleanerService.decodeHtmlEntities(rawUserString);
      expect(decodedUserString).toBe("**সমাধান: **আব্দু ি িোলোম...");

      // 2. Named entities
      expect(TextCleanerService.decodeHtmlEntities("বাংলা&nbsp;&amp;&nbsp;ইংরেজি")).toBe("বাংলা & ইংরেজি");
      expect(TextCleanerService.decodeHtmlEntities("&quot;বিজ্ঞান&quot; &lt;পরীক্ষা&gt;")).toBe('"বিজ্ঞান" <পরীক্ষা>');

      // 3. Hexadecimal entities (&#xA0;, &#x0986;, &#x0995;)
      expect(TextCleanerService.decodeHtmlEntities("ঢাকা&#xA0;বিশ্ববিদ্যালয়")).toBe("ঢাকা বিশ্ববিদ্যালয়");
      expect(TextCleanerService.decodeHtmlEntities("&#x0986;ব্দুল্লাহ")).toBe("আব্দুল্লাহ");

      // 4. Double-escaped entities
      expect(TextCleanerService.decodeHtmlEntities("&amp;#xA0;&amp;nbsp;")).toBe("  ");
    });
  });

  describe("Phase 3: Bengali Orthography Healing", () => {
    it("should heal separated hasants in ligatures and common CMap anomalies", () => {
      const broken = "প্রশ্ নোত্তর এবং আল্ াহর বাণী ও আল্ল োমো";
      const healed = TextCleanerService.healBengaliOrthography(broken);
      expect(healed).toContain("প্রশ্নোত্তর");
      expect(healed).toContain("আল্লাহর");
      expect(healed).toContain("আল্লামা");
    });

    it("should heal separated reph, nukta, and deduplicate consecutive vowel signs", () => {
      const broken = "স্বা র্ থ এবং ড ়ালিম এবং মোো";
      const healed = TextCleanerService.healBengaliOrthography(broken);
      expect(healed).toContain("স্বার্থ");
      expect(healed).toContain("ড\u09BCালিম".normalize("NFC"));
      expect(healed).toContain("মো");
    });
  });

  describe("Phase 5: Question Generation Validation Against Broken Fonts", () => {
    it("should reject questions with broken CMap font encoding during validation", () => {
      const corruptedQuestion: GeneratedQuestionPayload = {
        questionType: AiQuestionType.SHORT_ANSWER,
        questionTextBn: "সংক্ষিপ্ত উত্তর দিন: আব্দু ি িোলোম ইবন ববরতজি ইবন নোতির আশ্ ল আব্দু ল কোরীম",
        answerTextBn: "আব্দু ি িোলোম",
        explanationBn: "উৎস পাঠ্যাংশ: িোহকীক ও িোখরীজ",
        marks: 2.0,
        negativeMarks: 0.0,
        estimatedSeconds: 90,
        sourcePage: 1,
        sourcePassage: "আব্দু ি িোলোম ইবন ববরতজি",
      };

      const result = AiQuestionGeneratorService.validateQuestions([corruptedQuestion], [
        { pageNumber: 1, text: "আব্দুস সালাম ইবন বেরজিস ইবন নাসির" }
      ]);

      expect(result.isValid).toBe(false);
      expect(result.cleanedQuestions.length).toBe(0);
      expect(result.errors[0]).toContain("Corrupted Bengali Unicode characters or broken font detected");
    });

    it("should accept clean Unicode Bengali questions and decode any lingering entities", () => {
      const cleanQuestion: GeneratedQuestionPayload = {
        questionType: AiQuestionType.SHORT_ANSWER,
        questionTextBn: "সংক্ষিপ্ত উত্তর দিন:&#xA0;আব্দুস সালাম ইবন বেরজিস কে ছিলেন?",
        answerTextBn: "বিশিষ্ট ইসলামী গবেষক",
        explanationBn: "পাঠ্যবইয়ের 1 নম্বর পৃষ্ঠা অনুযায়ী: &#986;ব্দুস সালাম ইবন বেরজিস।",
        marks: 2.0,
        negativeMarks: 0.0,
        estimatedSeconds: 90,
        sourcePage: 1,
        sourcePassage: "আব্দুস সালাম ইবন বেরজিস",
      };

      const result = AiQuestionGeneratorService.validateQuestions([cleanQuestion], [
        { pageNumber: 1, text: "আব্দুস সালাম ইবন বেরজিস" }
      ]);

      expect(result.isValid).toBe(true);
      expect(result.cleanedQuestions.length).toBe(1);
      // Ensure HTML entities are decoded
      expect(result.cleanedQuestions[0].questionTextBn).toBe("সংক্ষিপ্ত উত্তর দিন: আব্দুস সালাম ইবন বেরজিস কে ছিলেন?");
      expect(result.cleanedQuestions[0].explanationBn).toContain("আব্দুস সালাম");
    });
  });
});

