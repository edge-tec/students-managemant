import { BijoyConverterService } from "./bijoyConverter";

export type DocumentLanguage = "bn" | "en" | "mixed";

export interface CleanedPageResult {
  pageNumber: number;
  rawText: string;
  cleanedText: string;
  wordCount: number;
  detectedLanguage: DocumentLanguage;
}

export class TextCleanerService {
  /**
   * Decodes all HTML entities (named, hexadecimal, and decimal),
   * including malformed entities like &#986; (hex 0x0986 'আ' printed without 'x')
   * and &#xA0; (non-breaking space).
   */
  static decodeHtmlEntities(rawText: string): string {
    if (!rawText) return "";
    let decoded = rawText;

    // 1. Decode double-escaped entities like &amp;#xA0; or &amp;nbsp;
    decoded = decoded.replace(/&amp;(nbsp|amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/gi, "&$1;");

    // 2. Named HTML entities
    const namedEntities: Record<string, string> = {
      "&nbsp;": " ",
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": "\"",
      "&apos;": "'",
      "&#39;": "'",
      "&bull;": "•",
      "&ndash;": "–",
      "&mdash;": "—",
      "&lsquo;": "‘",
      "&rsquo;": "’",
      "&ldquo;": "“",
      "&rdquo;": "”",
    };

    for (const [entity, replacement] of Object.entries(namedEntities)) {
      decoded = decoded.split(entity).join(replacement);
    }

    // 3. Hexadecimal numeric entities: e.g. &#xA0; or &#x0986; or &#x986;
    decoded = decoded.replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => {
      try {
        const cp = parseInt(hex, 16);
        if (cp === 0xA0) return " ";
        return String.fromCodePoint(cp);
      } catch {
        return _;
      }
    });

    // 4. Decimal numeric entities: e.g. &#2438; or malformed hex-as-decimal &#986;
    decoded = decoded.replace(/&#([0-9]+);/g, (_, dec) => {
      try {
        const val = parseInt(dec, 10);
        // Special case: if val is in 980-999, it represents Bengali Unicode hex 0x0980-0x0999 printed without 'x'
        // e.g. 0x0986 = 'আ', but emitted as &#986; instead of &#x0986; or &#2438;
        if (val >= 980 && val <= 999) {
          const hexVal = parseInt(dec, 16);
          return String.fromCodePoint(hexVal);
        }
        if (val === 160) return " ";
        return String.fromCodePoint(val);
      } catch {
        return _;
      }
    });

    return decoded;
  }

  /**
   * Detects whether text has broken / corrupted Bengali font encoding
   * (e.g. Bijoy ANSI glyph offsets, Word 2013 mangled CMap, broken ligatures with spaces, uncomposed matras).
   */
  static isBrokenBengaliFont(text: string): boolean {
    if (!text || text.length < 15) return false;

    // Check if raw text is Bijoy ANSI encoded
    if (BijoyConverterService.isBijoyEncoded(text)) return true;

    // Check for Unicode replacement character
    if (text.includes("\uFFFD")) return true;

    // Look for broken Bengali font indicators:
    // 1. Standalone matras with spaces: e.g. ' ো ', ' ি ', ' ু ', ' ে '
    const standaloneMatras = (text.match(/\s[\u09BE-\u09CC]\s/g) || []).length;
    // 2. Hasants followed by space before consonant: e.g. 'ল্ ল', 'শ্ থ', 'স্ হ', 'ক্ ত', 'ন্ ত'
    const brokenLigatures = (text.match(/[\u0985-\u09B9]্\s+[\u0985-\u09B9]/g) || []).length;
    // 3. Inverted/misplaced 'ি' before or after consonants or matras e.g. 'িতো', 'িো', 'তবপরীি', 'িোহকীক', 'ি িোলোম'
    const misplacedIkars = (text.match(/(?:^|\s)ি[োৌােৈ\u0985-\u09B9]/g) || []).length;
    // 4. 'শ্ ' before consonants e.g. 'শ্ র', 'শ্ ক', 'শ্ ল' (common Word/InDesign CMap artifact)
    const shArtifacts = (text.match(/শ্\s*[\u0985-\u09B9]/g) || []).length;
    // 5. 'ো' instead of 'া' after consonants e.g. 'মোনুষ', 'রোসূল', 'আমরো', 'িতোরো', 'শোইখ'
    const okarAbuse = (text.match(/[\u0995-\u09B9]ো[\u0995-\u09B9]ো/g) || []).length;
    // 6. Suspicious space inside compound words e.g. 'আল্ াহ', 'পূর্ ণ', 'প্রশ্ নো', 'আল্ল োমো'
    const hasantGaps = (text.match(/[\u0995-\u09B9]্\s+[\u0995-\u09B9\u09BE-\u09CC]/g) || []).length;
    // 7. HTML entities lingering in extracted text
    const htmlEntities = (text.match(/&#(?:xA0|986|x[0-9a-fA-F]+|\d+);|&nbsp;/gi) || []).length;

    const totalAnomalies =
      standaloneMatras + brokenLigatures + misplacedIkars + shArtifacts + okarAbuse + hasantGaps + htmlEntities;
    const tokens = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = tokens.length;
    const anomalyRatio = totalAnomalies / Math.max(wordCount, 1);

    return totalAnomalies >= 3 || anomalyRatio > 0.03;
  }

  /**
   * Heals broken spacing in Bengali ligatures, matras, nuktas, HTML entities, and punctuation.
   */
  static healBengaliOrthography(text: string): string {
    if (!text) return "";
    let healed = text;

    // 0. Decode any HTML entities first
    healed = this.decodeHtmlEntities(healed);

    // Convert Bijoy ANSI if present
    if (BijoyConverterService.isBijoyEncoded(healed)) {
      healed = BijoyConverterService.convertBijoyToUnicode(healed);
    }

    // 1. Repair common CMap corrupted words e.g. 'আল্ াহ' -> 'আল্লাহ', 'আল্ল োমো' -> 'আল্লামা'
    healed = healed.replace(/আল্\s*া?হ/g, "আল্লাহ");
    healed = healed.replace(/আল্ল\s*োমো/g, "আল্লামা");

    // 2. Repair separated hasant ligatures: 'ক্ ' + 'ত' -> 'ক্ত', 'ল্ ' + 'ল' -> 'ল্ল', 'স্ ' + 'হ' -> 'স্থ'
    healed = healed.replace(/([\u0985-\u09B9]্)\s+([\u0985-\u09B9])/g, "$1$2");

    // 3. Repair separated reph: 'স্বা র্ থ' -> 'স্বার্থ' and 'র্ ' + consonant -> 'র্' + consonant
    healed = healed.replace(/([\u0985-\u09B9][\u09BE-\u09CC]?)\s+র্\s*([\u0985-\u09B9])/g, "$1র্$2");
    healed = healed.replace(/র্\s+([\u0985-\u09B9])/g, "র্$1");

    // 4. Repair separated nuktas: 'ড ়' -> 'ড়', 'ঢ ়' -> 'ঢ়', 'য ়' -> 'য়'
    healed = healed.replace(/\u09A1\s*[\u09BC]/g, "\u09DC");
    healed = healed.replace(/\u09A2\s*[\u09BC]/g, "\u09DD");
    healed = healed.replace(/\u09AF\s*[\u09BC]/g, "\u09DF");

    // 5. Repair separated candrabindu
    healed = healed.replace(/\s+ঁ/g, "ঁ");

    // 6. Repair separated matras: consonant + space + matra -> consonant + matra
    healed = healed.replace(/([\u0985-\u09B9])\s+([\u09BE-\u09CC])/g, "$1$2");

    // 7. Deduplicate consecutive identical vowel signs / matras (e.g. 'োো' -> 'ো', 'াা' -> 'া')
    healed = healed.replace(/([\u09BE-\u09CC])\1+/g, "$1");

    return healed.normalize("NFC");
  }

  /**
   * Cleans and normalizes extracted text with strict preservation of Bengali Unicode characters.
   */
  static cleanPageText(rawText: string): string {
    if (!rawText) return "";

    // 1. Decode HTML entities first
    let text = this.decodeHtmlEntities(rawText);

    // 2. Unicode Canonical Decomposition & Recomposition (NFC preserves Bengali ligatures & matras)
    text = text.normalize("NFC");

    // 3. Apply orthographic healing and Bijoy conversion if needed
    text = this.healBengaliOrthography(text);

    // 4. Replace non-standard whitespace and BOM marks with standard space or newline
    text = text.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/g, " ");

    // 5. Remove zero-width characters unless part of Bengali conjuncts
    // Keep ZWJ (\u200D) and ZWNJ (\u200C) ONLY when immediately preceded by Bengali Virama/Hasant (\u09CD)
    text = text.replace(/(?<!\u09CD)[\u200B\u200C\u200D]/g, "");

    // 6. Remove control characters except standard whitespace (\n, \r, \t)
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    // 7. Normalize line breaks: replace CRLF or CR with LF
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // 8. Split into lines to clean horizontal whitespace
    const lines = text.split("\n").map((line) => {
      // Collapse multiple horizontal spaces and tabs into a single space
      return line.replace(/[ \t]+/g, " ").trim();
    });

    // 9. Remove excessive blank lines (more than 2 consecutive newlines)
    const resultLines: string[] = [];
    let blankCount = 0;
    for (const line of lines) {
      if (line.length === 0) {
        blankCount++;
        if (blankCount <= 2) {
          resultLines.push("");
        }
      } else {
        blankCount = 0;
        resultLines.push(line);
      }
    }

    return resultLines.join("\n").trim();
  }

  /**
   * Detects whether text is primarily Bengali, English, or mixed.
   */
  static detectLanguage(text: string): DocumentLanguage {
    if (!text || text.trim().length === 0) return "bn";

    // Count Bengali characters (\u0980 to \u09FF)
    const bengaliMatches = text.match(/[\u0980-\u09FF]/g);
    const bengaliCount = bengaliMatches ? bengaliMatches.length : 0;

    // Count English/Latin alphabetic characters
    const latinMatches = text.match(/[A-Za-z]/g);
    const latinCount = latinMatches ? latinMatches.length : 0;

    const totalAlpha = bengaliCount + latinCount;
    if (totalAlpha === 0) return "bn";

    const bnRatio = bengaliCount / totalAlpha;
    const enRatio = latinCount / totalAlpha;

    if (bnRatio >= 0.65) return "bn";
    if (enRatio >= 0.65) return "en";
    return "mixed";
  }

  /**
   * Accurately counts words for Bengali and English text.
   */
  static countWords(text: string): number {
    if (!text || text.trim().length === 0) return 0;
    // Split by whitespace and common punctuation, filtering out empty tokens
    const tokens = text
      .trim()
      .split(/[\s,।!?.;:()\[\]{}"'\\/]+/)
      .filter((t) => t.length > 0);
    return tokens.length;
  }

  /**
   * Detects and removes repeating headers and footers across multiple pages.
   */
  static removeRepeatingHeadersAndFooters(pages: { pageNumber: number; text: string }[]): { pageNumber: number; text: string }[] {
    if (pages.length < 3) {
      return pages;
    }

    // Inspect first 2 lines (headers) and last 2 lines (footers) of each page
    const topLines: Map<string, number> = new Map();
    const bottomLines: Map<string, number> = new Map();

    const normalizedPages = pages.map((p) => {
      const lines = p.text.split("\n").filter((l) => l.trim().length > 0);
      return { pageNumber: p.pageNumber, lines };
    });

    for (const p of normalizedPages) {
      if (p.lines.length > 0) {
        const top1 = this.stripPageNumbers(p.lines[0]);
        if (top1.length > 3) topLines.set(top1, (topLines.get(top1) || 0) + 1);

        if (p.lines.length > 1) {
          const top2 = this.stripPageNumbers(p.lines[1]);
          if (top2.length > 3) topLines.set(top2, (topLines.get(top2) || 0) + 1);
        }

        const lastIdx = p.lines.length - 1;
        const bot1 = this.stripPageNumbers(p.lines[lastIdx]);
        if (bot1.length > 3) bottomLines.set(bot1, (bottomLines.get(bot1) || 0) + 1);

        if (p.lines.length > 2) {
          const bot2 = this.stripPageNumbers(p.lines[lastIdx - 1]);
          if (bot2.length > 3) bottomLines.set(bot2, (bottomLines.get(bot2) || 0) + 1);
        }
      }
    }

    // Threshold: if a line appears in at least 50% of the pages (or >= 3 pages)
    const threshold = Math.max(3, Math.floor(pages.length * 0.4));
    const headerArtifacts = new Set<string>();
    const footerArtifacts = new Set<string>();

    for (const [line, count] of topLines.entries()) {
      if (count >= threshold) headerArtifacts.add(line);
    }
    for (const [line, count] of bottomLines.entries()) {
      if (count >= threshold) footerArtifacts.add(line);
    }

    return pages.map((p) => {
      const lines = p.text.split("\n");
      const filtered = lines.filter((line, idx) => {
        const stripped = this.stripPageNumbers(line);
        // Remove if it's near top and matches a detected header artifact
        if (idx < 2 && headerArtifacts.has(stripped)) {
          return false;
        }
        // Remove if it's near bottom and matches a detected footer artifact
        if (idx >= lines.length - 2 && footerArtifacts.has(stripped)) {
          return false;
        }
        // Remove isolated bare page numbers like "Page 3" or "- 3 -" or "৩"
        if (/^(page\s*\d+|\d+|[-–—]\s*\d+\s*[-–—]|[০-৯]+|পৃষ্ঠা\s*[০-৯]+)$/i.test(line.trim())) {
          return false;
        }
        return true;
      });

      return {
        pageNumber: p.pageNumber,
        text: filtered.join("\n").trim(),
      };
    });
  }

  private static stripPageNumbers(line: string): string {
    return line
      .replace(/\b\d+\b/g, "#")
      .replace(/[০-৯]+/g, "#")
      .trim();
  }
}
