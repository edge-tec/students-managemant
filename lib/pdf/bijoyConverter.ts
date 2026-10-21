/**
 * Bijoy (ANSI / SutonnyMJ) to Bengali Unicode Converter
 * Converts legacy Bengali ANSI text into standard Unicode (NFC).
 * Distinguishes font family from text encoding and correctly handles
 * pre-base vowel signs, reph, and conjunct ligatures.
 */

export class BijoyConverterService {
  private static readonly LIGATURE_MAP: Record<string, string> = {
    // Multi-character ligatures
    "¯‹": "স্ক",
    "¯Í": "স্ত",
    "¯’": "স্থ",
    "¯œ": "স্ন",
    "¯ú": "স্প",
    "¯¢": "স্ফ",
    "¯^": "স্ব",
    "¯§": "স্ম",
    "¯ª": "স্র",
    "¯ø": "স্ল",
    "šÍ": "ন্ত",
    "š’": "ন্থ",
    "šœ": "ন্ন",
    "šú": "ন্প",
    "š^": "ন্ব",
    "š§": "ন্ম",
    "kÖ": "শ্র",
    "cÖ": "প্র",
    "MÖ": "গ্র",
    "KÖ": "ক্র",
    "bÖ": "ন্র",
    "aÖ": "ধ্র",
    "eÖ": "ব্র",
    "fÖ": "ভ্র",
    "Î": "ত্র",
    "iæ": "রু",
    "iƒ": "রূ",

    // Single-character ligatures
    "²": "ক্ষ",
    "³": "ক্ত",
    "´": "জ্ঞ",
    "µ": "ক্র",
    "¶": "ক্ষ",
    "·": "প্ত",
    "¸": "গু",
    "¹": "হু",
    "º": "হৃ",
    "»": "হ্ন",
    "¼": "হ্ম",
    "½": "ঙ্গ",
    "¾": "ঙ্ক",
    "¿": "ষ্ক",
    "À": "ল্ক",
    "Á": "ল্গ",
    "Â": "ল্ট",
    "Ã": "ল্ড",
    "Ä": "ল্প",
    "Å": "ল্ফ",
    "Æ": "ল্ব",
    "Ç": "ল্ম",
    "È": "ষ্ট",
    "É": "ষ্ঠ",
    "Ê": "ষ্ণ",
    "Ë": "ত্ত",
    "Ì": "ষ্ফ",
    "Í": "ন্ট",
    "Ï": "ন্ড",
    "Ð": "ন্ত",
    "Ñ": "ন্থ",
    "Ò": "ন্দ",
    "Ó": "ন্ধ",
    "Ô": "ন্ন",
    "Õ": "ন্ম",
    "Ö": "্র",
    "œ": "্ন",
    "×": "দ্ব",
    "Ø": "দ্ধ",
    "Ù": "দ্ম",
    "Ú": "দ্ভ",
    "Û": "দ্ব",
    "Ü": "ত্ম",
    "Ý": "ত্ন",
    "Þ": "ত্র",
    "ß": "দ্দ",
    "à": "দ্ধ",
    "á": "দ্ব",
    "â": "দ্ম",
    "ã": "ব্ধ",
    "ä": "ব্ব",
    "å": "ভ্ন",
    "æ": "ম্ন",
    "ç": "ম্প",
    "è": "ম্ফ",
    "é": "ম্ব",
    "ê": "ম্ভ",
    "ë": "ম্ম",
    "ì": "ম্ল",
    "í": "দ্ব",
    "î": "জ্ঞ",
    "ï": "জ্ঞ",
    "ð": "ট্ট",
    "ñ": "ড্ড",
    "ò": "ণ্ট",
    "ó": "ণ্ঠ",
    "ô": "ণ্ড",
    "õ": "ণ্ণ",
    "ö": "ণ্ঢ",
    "÷": "ঞ্চ",
    "ø": "ঞ্ছ",
    "ù": "ঞ্জ",
    "ú": "ঞ্ঝ",
    "û": "ঙ্ক্ষ",
    "ü": "ঙ্খ",
    "ý": "ঙ্গ",
    "þ": "ঙ্ঘ",
    "ÿ": "ঙ্ক",
  };

  private static readonly CHAR_MAP: Record<string, string> = {
    // Vowels
    Av: "আ",
    A: "অ",
    B: "ই",
    C: "ঈ",
    D: "উ",
    E: "ঊ",
    F: "ঋ",
    G: "এ",
    H: "ঐ",
    I: "ও",
    J: "ঔ",

    // Consonants
    K: "ক",
    L: "খ",
    M: "গ",
    N: "ঘ",
    O: "ঙ",
    P: "চ",
    Q: "ছ",
    R: "জ",
    S: "ঝ",
    T: "ঞ",
    U: "ট",
    V: "ঠ",
    W: "ড",
    X: "ঢ",
    Y: "ণ",
    Z: "ত",
    _: "থ",
    "`": "দ",
    a: "ধ",
    b: "ন",
    c: "প",
    d: "ফ",
    e: "ব",
    f: "ভ",
    g: "ম",
    h: "য",
    i: "র",
    j: "ল",
    k: "শ",
    l: "ষ",
    m: "স",
    n: "হ",
    o: "ড়",
    p: "ঢ়",
    q: "য়",
    r: "ৎ",
    s: "ং",
    t: "ঃ",
    u: "ঁ",

    // Vowel Signs / Matras
    v: "া",
    w: "ি",
    x: "ী",
    y: "ু",
    z: "ূ",
    "~": "ৃ",
    "†": "ে",
    "‡": "ে",
    "‰": "ৈ",
    "Š": "ৌ",

    // Phalas & Hasanta
    "&": "্",
    "¨": "্য",
    "ª": "্য",
    "^": "্ব",
    "¥": "্ম",

    // Digits
    "0": "০",
    "1": "১",
    "2": "২",
    "3": "৩",
    "4": "৪",
    "5": "৫",
    "6": "৬",
    "7": "৭",
    "8": "৮",
    "9": "৯",

    // Punctuation
    "|": "।",
  };

  // Pattern matching a single consonant cluster in SutonnyMJ representation
  private static readonly CLUSTER_PATTERN =
    "(?:[¯š][‹’œú¢^§ªøÍ’]|iæ|iƒ|[²³´µ¶·¸¹º»¼½¾¿À-ÿ]|[A-Za-z_`~])(?:&(?:[²³´µ¶·¸¹º»¼½¾¿À-ÿ]|[A-Za-z_`~]))*(?:[Ö¨ª^¥uyz~])*";

  /**
   * Checks if a string contains substantial Bijoy (SutonnyMJ) encoded character patterns.
   * Ensures that genuine Unicode Bengali or genuine English text is never falsely flagged.
   */
  static isBijoyEncoded(text: string): boolean {
    if (!text || text.length < 8) return false;

    // 1. If text already contains substantial Unicode Bengali characters, do NOT convert again
    const unicodeBengaliMatches = text.match(/[\u0980-\u09FF]/g) || [];
    if (unicodeBengaliMatches.length > 10 && unicodeBengaliMatches.length / text.length > 0.15) {
      return false;
    }

    // 2. Look for frequent Bijoy character sequences & ligatures
    const bijoyPatterns =
      /(?:Avwg|Avgvi|evsjv|cÖkœ|DËi|PwiÎ|GKwU|wb‡`©k|we`¨vjq|cÖ_g|‡[A-Za-z_`~]|†[A-Za-z_`~]|w[A-Za-z_`~]|[A-Za-z_`~]v|[¯š][‹’œú¢^§ªøÍ’]|[²³´µ¶·¸¹º»¼½¾¿À-ÿ])/g;
    const matches = text.match(bijoyPatterns) || [];

    // 3. Compare with standard English words to avoid false positives on English docs
    const englishWordMatches =
      text.match(/\b(?:the|and|for|with|this|that|from|have|are|was|were|they|been|their|which)\b/gi) || [];
    if (englishWordMatches.length > matches.length) return false;

    return matches.length >= 2;
  }

  /**
   * Converts Bijoy (SutonnyMJ) text to standard Bengali Unicode (NFC).
   * Preserves logical character ordering for pre-base vowels, composite okar/oukar, and reph.
   */
  static convertBijoyToUnicode(rawText: string): string {
    if (!rawText) return "";

    // Normalize WinAnsi 1252 / Latin-1 control codes to standard SutonnyMJ glyph characters
    let result = rawText
      .replace(/\u0086/g, "†")
      .replace(/\u0087/g, "‡")
      .replace(/\u0089/g, "‰")
      .replace(/\u008A/g, "Š")
      .replace(/\u008B/g, "‹")
      .replace(/\u0092/g, "’")
      .replace(/\u0094/g, "”");

    const cluster = this.CLUSTER_PATTERN;

    // 1. Composite okar and oukar with reph: †[cons]©v -> র্[cons]ো
    result = result.replace(new RegExp(`([†‡])(${cluster})©v`, "g"), "র্$2ো");
    result = result.replace(new RegExp(`([†‡])(${cluster})©Š`, "g"), "র্$2ৌ");

    // 2. Composite okar and oukar without reph: †[cons]v -> [cons]ো
    result = result.replace(new RegExp(`([†‡])(${cluster})v`, "g"), "$2ো");
    result = result.replace(new RegExp(`([†‡])(${cluster})Š`, "g"), "$2ৌ");

    // 3. Pre-base vowel signs with reph: w[cons]© -> র্[cons]ি, †[cons]© -> র্[cons]ে
    result = result.replace(new RegExp(`w(${cluster})©`, "g"), "র্$1ি");
    result = result.replace(new RegExp(`([†‡])(${cluster})©`, "g"), "র্$2ে");
    result = result.replace(new RegExp(`‰(${cluster})©`, "g"), "র্$1ৈ");

    // 4. Pre-base vowel signs without reph: w[cons] -> [cons]ি, †[cons] -> [cons]ে, ‰[cons] -> [cons]ৈ
    result = result.replace(new RegExp(`w(${cluster})`, "g"), "$1ি");
    result = result.replace(new RegExp(`([†‡])(${cluster})`, "g"), "$2ে");
    result = result.replace(new RegExp(`‰(${cluster})`, "g"), "$1ৈ");

    // 5. Standalone reph: [cons]© or ©[cons] -> র্[cons]
    result = result.replace(new RegExp(`(${cluster})©`, "g"), "র্$1");
    result = result.replace(new RegExp(`©(${cluster})`, "g"), "র্$1");

    // 6. Map ligatures (longest first)
    for (const [bijoy, uni] of Object.entries(this.LIGATURE_MAP)) {
      result = result.split(bijoy).join(uni);
    }

    // 7. Map individual characters
    for (const [bijoy, uni] of Object.entries(this.CHAR_MAP)) {
      result = result.split(bijoy).join(uni);
    }

    return result.normalize("NFC");
  }
}

