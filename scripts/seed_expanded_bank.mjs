import { PrismaClient, ExamCategoryType, QuestionType, DifficultyLevel, ContentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Expanding EduBD Question Bank with authentic questions and chapters...");

  const admin = await prisma.user.findUnique({ where: { email: "admin@edubd.ac" } });
  const dhakaBoard = await prisma.examinationBoard.findUnique({ where: { code: "DHA" } });
  const rajBoard = await prisma.examinationBoard.findUnique({ where: { code: "RAJ" } });
  const ctgBoard = await prisma.examinationBoard.findUnique({ where: { code: "CTG" } });
  const du = await prisma.university.findUnique({ where: { code: "DU" } });

  // 1. Get or create subjects
  const phy1 = await prisma.subject.findUnique({ where: { code: "PHY_1" } });
  const chem1 = await prisma.subject.findUnique({ where: { code: "CHEM_1" } });
  const sscMath = await prisma.subject.findUnique({ where: { code: "SSC_MATH" } });
  const medBio = await prisma.subject.findUnique({ where: { code: "MED_BIO" } });

  // Add Physics 2nd Paper
  const phy2 = await prisma.subject.upsert({
    where: { code: "PHY_2" },
    update: {},
    create: {
      code: "PHY_2",
      nameBn: "পদার্থবিজ্ঞান ২য় পত্র",
      nameEn: "Physics 2nd Paper",
      category: ExamCategoryType.HSC,
    },
  });

  // Add Higher Math 1st Paper
  const hmath1 = await prisma.subject.upsert({
    where: { code: "HMATH_1" },
    update: {},
    create: {
      code: "HMATH_1",
      nameBn: "উচ্চতর গণিত ১ম পত্র",
      nameEn: "Higher Mathematics 1st Paper",
      category: ExamCategoryType.HSC,
    },
  });

  // Add DU Admission Science Unit
  const duScience = await prisma.subject.upsert({
    where: { code: "DU_KA" },
    update: {},
    create: {
      code: "DU_KA",
      nameBn: "ঢাবি 'ক' ইউনিট (বিজ্ঞান)",
      nameEn: "DU 'Ka' Unit Science",
      category: ExamCategoryType.UNIVERSITY,
    },
  });

  async function getOrCreateChapter(subjectId, chapterNum, nameBn, nameEn) {
    let ch = await prisma.chapter.findFirst({ where: { subjectId, chapterNum } });
    if (!ch) {
      ch = await prisma.chapter.create({
        data: { subjectId, chapterNum, nameBn, nameEn },
      });
    }
    return ch;
  }

  // 2. Add or retrieve Chapters
  const chGravitation = await getOrCreateChapter(phy1.id, 5, "মহাকর্ষ ও অভিকর্ষ (Gravitation & Gravity)", "Gravitation & Gravity");
  const chPeriodic = await getOrCreateChapter(phy1.id, 8, "পর্যাবৃত্ত গতি (Periodic Motion)", "Periodic Motion");
  const chThermo = await getOrCreateChapter(phy2.id, 1, "তাপগতিবিদ্যা (Thermodynamics)", "Thermodynamics");
  const chCurrent = await getOrCreateChapter(phy2.id, 3, "চল তড়িৎ (Current Electricity)", "Current Electricity");
  const chMatrix = await getOrCreateChapter(hmath1.id, 1, "ম্যাট্রিক্স ও নির্ণায়ক (Matrices & Determinants)", "Matrices & Determinants");
  const chDiff = await getOrCreateChapter(hmath1.id, 9, "অন্তরীকরণ (Differentiation)", "Differentiation");
  const chDuPhy = await getOrCreateChapter(duScience.id, 1, "পদার্থবিজ্ঞান মডেল টেস্ট (Physics Model Test)", "Physics Model Test");
  const chDuMath = await getOrCreateChapter(duScience.id, 2, "উচ্চতর গণিত মডেল টেস্ট (Mathematics Model Test)", "Mathematics Model Test");

  // Get existing chapters
  const chVector = await prisma.chapter.findFirst({ where: { subjectId: phy1.id, chapterNum: 2 } });
  const chWork = await prisma.chapter.findFirst({ where: { subjectId: phy1.id, chapterNum: 4 } });
  const chQualitative = await prisma.chapter.findFirst({ where: { subjectId: chem1.id, chapterNum: 2 } });
  const chCell = await prisma.chapter.findFirst({ where: { subjectId: medBio.id, chapterNum: 1 } });

  // 3. Populate Questions
  const questionsData = [
    // --- Physics 1st Paper (Vectors) ---
    {
      category: ExamCategoryType.HSC,
      subjectId: phy1.id,
      chapterId: chVector.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      questionTextBn: "কোনো ভেক্টর \\vec{A} = 2\\hat{i} + 3\\hat{j} + \\sqrt{3}\\hat{k} হলে, এর মান কত?",
      questionTextEn: "If a vector is \\vec{A} = 2\\hat{i} + 3\\hat{j} + \\sqrt{3}\\hat{k}, what is its magnitude?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 45,
      textbookRef: "ড. শাহজাহান তপন (HSC ১ম পত্র, পৃষ্ঠা ৫২)",
      teacherTipsBn: "|\\vec{A}| = \\sqrt{A_x^2 + A_y^2 + A_z^2} সূত্র ব্যবহার করুন।",
      options: [
        { key: "A", bn: "4 একক", en: "4 units", correct: true },
        { key: "B", bn: "16 একক", en: "16 units", correct: false },
        { key: "C", bn: "\\sqrt{8} একক", en: "\\sqrt{8} units", correct: false },
        { key: "D", bn: "8 একক", en: "8 units", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "|\\vec{A}| = \\sqrt{2^2 + 3^2 + (\\sqrt{3})^2} = \\sqrt{4 + 9 + 3} = \\sqrt{16} = 4 একক।",
      },
      boardCode: "DHA",
      year: 2024,
    },
    {
      category: ExamCategoryType.HSC,
      subjectId: phy1.id,
      chapterId: chVector.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      questionTextBn: "দুটি সমমানের ভেক্টরের লব্ধির মান এদের যেকোনো একটির মানের সমান হলে তাদের মধ্যবর্তী কোণ কত?",
      questionTextEn: "If the magnitude of the resultant of two equal vectors is equal to either of them, what is the angle between them?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 50,
      textbookRef: "প্রফেসর ইসহাক (পদার্থবিজ্ঞান ১ম পত্র)",
      teacherTipsBn: "লব্ধির সূত্র R^2 = P^2 + Q^2 + 2PQ\\cos\\theta বসান।",
      options: [
        { key: "A", bn: "60^\\circ", en: "60^\\circ", correct: false },
        { key: "B", bn: "90^\\circ", en: "90^\\circ", correct: false },
        { key: "C", bn: "120^\\circ", en: "120^\\circ", correct: true },
        { key: "D", bn: "180^\\circ", en: "180^\\circ", correct: false },
      ],
      answer: {
        correctKey: "C",
        explanationBn: "ধরি, P = Q = R। তাহলে P^2 = P^2 + P^2 + 2P^2\\cos\\theta \\implies \\cos\\theta = -\\frac{1}{2} \\implies \\theta = 120^\\circ।",
      },
      boardCode: "RAJ",
      year: 2023,
    },

    // --- Physics 1st Paper (Work, Energy & Power) ---
    {
      category: ExamCategoryType.HSC,
      subjectId: phy1.id,
      chapterId: chWork.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      questionTextBn: "কাজের মাত্রা সমীকরণ নিচের কোনটি?",
      questionTextEn: "Which of the following is the dimensional formula for work?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 30,
      textbookRef: "ড. শাহজাহান তপন (পৃষ্ঠা ১৩০)",
      teacherTipsBn: "কাজ = বল × সরণ = [MLT^{-2}][L] = [ML^2T^{-2}]",
      options: [
        { key: "A", bn: "[ML^2T^{-2}]", en: "[ML^2T^{-2}]", correct: true },
        { key: "B", bn: "[MLT^{-2}]", en: "[MLT^{-2}]", correct: false },
        { key: "C", bn: "[ML^2T^{-1}]", en: "[ML^2T^{-1}]", correct: false },
        { key: "D", bn: "[ML^{-1}T^{-2}]", en: "[ML^{-1}T^{-2}]", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "কাজ = বল \\times সরণ = [MLT^{-2}] \\times [L] = [ML^2T^{-2}]।",
      },
      boardCode: "CTG",
      year: 2023,
    },
    {
      category: ExamCategoryType.HSC,
      subjectId: phy1.id,
      chapterId: chWork.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.HARD,
      questionTextBn: "একটি স্প্রিংকে সংকুচিত করতে প্রযুক্ত বল F = 50x হলে, স্প্রিংটিকে x = 0 হতে x = 0.2\\text{ m} সংকুচিত করতে কৃতকাজ কত?",
      questionTextEn: "If the force required to compress a spring is F = 50x, what is the work done to compress it from x = 0 to x = 0.2 m?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 60,
      textbookRef: "ড. গিয়াসউদ্দিন আহমেদ (পৃষ্ঠা ১৫২)",
      teacherTipsBn: "পরিবর্তনশীল বল দ্বারা কাজ W = \\int_0^{0.2} F dx।",
      options: [
        { key: "A", bn: "1 J", en: "1 J", correct: true },
        { key: "B", bn: "2 J", en: "2 J", correct: false },
        { key: "C", bn: "5 J", en: "5 J", correct: false },
        { key: "D", bn: "10 J", en: "10 J", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "W = \\int_0^{0.2} 50x dx = 50 \\left[\\frac{x^2}{2}\\right]_0^{0.2} = 25 \\times (0.2)^2 = 25 \\times 0.04 = 1\\text{ J}।",
      },
      boardCode: "DHA",
      year: 2023,
    },

    // --- Physics 1st Paper (Gravitation) ---
    {
      category: ExamCategoryType.HSC,
      subjectId: phy1.id,
      chapterId: chGravitation.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      questionTextBn: "পৃথিবীর পৃষ্ঠ হতে কত উচ্চতায় অভিকর্ষজ ত্বরণ ভূ-পৃষ্ঠের মানের এক-চতুর্থাংশ (\\frac{g}{4}) হবে? (পৃথিবীর ব্যাসার্ধ R)",
      questionTextEn: "At what height above the Earth's surface will gravity be one-fourth (g/4) of its value at the surface? (Earth radius R)",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 50,
      textbookRef: "ড. শাহজাহান তপন (পৃষ্ঠা ১৯০)",
      teacherTipsBn: "g' = g\\left(\\frac{R}{R+h}\\right)^2 সম্পর্ক মনে রাখুন।",
      options: [
        { key: "A", bn: "R", en: "R", correct: true },
        { key: "B", bn: "2R", en: "2R", correct: false },
        { key: "C", bn: "\\frac{R}{2}", en: "\\frac{R}{2}", correct: false },
        { key: "D", bn: "4R", en: "4R", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "g' = g\\left(\\frac{R}{R+h}\\right)^2 \\implies \\frac{1}{4} = \\left(\\frac{R}{R+h}\\right)^2 \\implies \\frac{R}{R+h} = \\frac{1}{2} \\implies R+h = 2R \\implies h = R।",
      },
      boardCode: "DHA",
      year: 2022,
    },

    // --- Physics 1st Paper (Periodic Motion) ---
    {
      category: ExamCategoryType.HSC,
      subjectId: phy1.id,
      chapterId: chPeriodic.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      questionTextBn: "একটি সরল ছন্দিত স্পন্দনে গতিশীল কণার বিস্তার A হলে, সাম্যাবস্থা হতে কত দূরত্বে এর গতিশক্তি ও স্থিতিশক্তি সমান হবে?",
      questionTextEn: "For a particle in SHM with amplitude A, at what displacement from equilibrium will KE equal PE?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 45,
      textbookRef: "প্রফেসর ইসহাক (পৃষ্ঠা ২৩২)",
      teacherTipsBn: "E_k = E_p \\implies \\frac{1}{2}k(A^2 - x^2) = \\frac{1}{2}kx^2।",
      options: [
        { key: "A", bn: "x = \\pm \\frac{A}{\\sqrt{2}}", en: "x = \\pm \\frac{A}{\\sqrt{2}}", correct: true },
        { key: "B", bn: "x = \\pm \\frac{A}{2}", en: "x = \\pm \\frac{A}{2}", correct: false },
        { key: "C", bn: "x = \\pm \\frac{A}{4}", en: "x = \\pm \\frac{A}{4}", correct: false },
        { key: "D", bn: "x = \\pm \\sqrt{2}A", en: "x = \\pm \\sqrt{2}A", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "\\frac{1}{2}k(A^2 - x^2) = \\frac{1}{2}kx^2 \\implies A^2 - x^2 = x^2 \\implies 2x^2 = A^2 \\implies x = \\pm \\frac{A}{\\sqrt{2}}।",
      },
      boardCode: "RAJ",
      year: 2023,
    },

    // --- Physics 2nd Paper (Thermodynamics) ---
    {
      category: ExamCategoryType.HSC,
      subjectId: phy2.id,
      chapterId: chThermo.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      questionTextBn: "একটি কার্নো ইঞ্জিন 500 K এবং 300 K তাপমাত্রার দুটি আধারের মধ্যে পরিচালিত হয়। এর দক্ষতা (\\eta) কত?",
      questionTextEn: "A Carnot engine operates between reservoirs at 500 K and 300 K. What is its efficiency?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 40,
      textbookRef: "ড. শাহজাহান তপন (HSC ২য় পত্র, পৃষ্ঠা ২০)",
      teacherTipsBn: "\\eta = 1 - \\frac{T_2}{T_1} সূত্র সরাসরি প্রয়োগ করুন।",
      options: [
        { key: "A", bn: "40%", en: "40%", correct: true },
        { key: "B", bn: "60%", en: "60%", correct: false },
        { key: "C", bn: "20%", en: "20%", correct: false },
        { key: "D", bn: "50%", en: "50%", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "\\eta = \\left(1 - \\frac{T_2}{T_1}\\right) \\times 100\\% = \\left(1 - \\frac{300}{500}\\right) \\times 100\\% = \\frac{200}{500} \\times 100\\% = 40\\%।",
      },
      boardCode: "DHA",
      year: 2024,
    },

    // --- Physics 2nd Paper (Current Electricity) ---
    {
      category: ExamCategoryType.HSC,
      subjectId: phy2.id,
      chapterId: chCurrent.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      questionTextBn: "একটি পরিবাহী তারকে টেনে এর দৈর্ঘ্য দ্বিগুণ করা হলে তারটির রোধ পূর্বের কতগুণ হবে?",
      questionTextEn: "If a conducting wire is stretched to double its length, what will its new resistance be?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 50,
      textbookRef: "ড. শাহজাহান তপন (HSC ২য় পত্র, পৃষ্ঠা ৭৫)",
      teacherTipsBn: "আয়তন ধ্রুব থাকলে দৈর্ঘ্য n গুণ হলে রোধ n^2 গুণ হয় (R \\propto L^2)।",
      options: [
        { key: "A", bn: "4 গুণ", en: "4 times", correct: true },
        { key: "B", bn: "2 গুণ", en: "2 times", correct: false },
        { key: "C", bn: "8 গুণ", en: "8 times", correct: false },
        { key: "D", bn: "\\frac{1}{2} গুণ", en: "\\frac{1}{2} times", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "তারকে টানলে আয়তন ধ্রুব থাকে। দৈর্ঘ্য দ্বিগুণ (L' = 2L) হলে প্রস্থচ্ছেদের ক্ষেত্রফল অর্ধেক (A' = A/2) হয়। সুতরাং R' = \\rho \\frac{2L}{A/2} = 4 R।",
      },
      boardCode: "CTG",
      year: 2023,
    },

    // --- Chemistry 1st Paper (Qualitative Chem) ---
    {
      category: ExamCategoryType.HSC,
      subjectId: chem1.id,
      chapterId: chQualitative.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      questionTextBn: "হাইড্রোজেন পরমাণুর বর্ণালীতে বামার (Balmer) সিরিজের রেখাসমূহ কোন অঞ্চলে দেখা যায়?",
      questionTextEn: "In the hydrogen spectrum, in which region are the Balmer series lines observed?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 30,
      textbookRef: "ড. সরোজ কান্তি সিংহ হাজারী (রসায়ন ১ম পত্র)",
      teacherTipsBn: "লাইম্যান = অতিবেগুনী (UV), বামার = দৃশ্যমান (Visible), প্যাসচেন = অবলোহিত (IR)।",
      options: [
        { key: "A", bn: "দৃশ্যমান অঞ্চল (Visible)", en: "Visible Region", correct: true },
        { key: "B", bn: "অতিবেগুনী অঞ্চল (UV)", en: "UV Region", correct: false },
        { key: "C", bn: "অবলোহিত অঞ্চল (IR)", en: "IR Region", correct: false },
        { key: "D", bn: "এক্স-রে অঞ্চল (X-Ray)", en: "X-Ray Region", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "বামার সিরিজের ক্ষেত্রে ইলেকট্রন উচ্চ শক্তিস্তর থেকে ২য় শক্তিস্তরে (n_1 = 2) নেমে আসে এবং এর তরঙ্গদৈর্ঘ্য ৩৮০-৭৮০ nm দৃশ্যমান আলো অঞ্চলে অবস্থিত।",
      },
      boardCode: "DHA",
      year: 2023,
    },

    // --- Higher Math 1st Paper (Matrices) ---
    {
      category: ExamCategoryType.HSC,
      subjectId: hmath1.id,
      chapterId: chMatrix.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      questionTextBn: "A = \\begin{bmatrix} 2 & k \\\\ 4 & 6 \\end{bmatrix} একটি ব্যতিক্রমী (Singular) ম্যাট্রিক্স হলে k এর মান কত?",
      questionTextEn: "If A = \\begin{bmatrix} 2 & k \\\\ 4 & 6 \\end{bmatrix} is a singular matrix, what is the value of k?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 35,
      textbookRef: "অক্ষরপত্র উচ্চতর গণিত ১ম পত্র (পৃষ্ঠা ১৫)",
      teacherTipsBn: "ব্যতিক্রমী ম্যাট্রিক্সের নির্ণায়কের মান শূন্য |A| = 0 হয়।",
      options: [
        { key: "A", bn: "3", en: "3", correct: true },
        { key: "B", bn: "6", en: "6", correct: false },
        { key: "C", bn: "-3", en: "-3", correct: false },
        { key: "D", bn: "12", en: "12", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "|A| = (2)(6) - (4)(k) = 0 \\implies 12 - 4k = 0 \\implies 4k = 12 \\implies k = 3।",
      },
      boardCode: "DHA",
      year: 2024,
    },

    // --- Higher Math 1st Paper (Differentiation) ---
    {
      category: ExamCategoryType.HSC,
      subjectId: hmath1.id,
      chapterId: chDiff.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      questionTextBn: "\\lim_{x \\to 0} \\frac{\\sin 5x}{x} এর মান কত?",
      questionTextEn: "What is the value of \\lim_{x \\to 0} \\frac{\\sin 5x}{x}?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 30,
      textbookRef: "এস ইউ আহাম্মদ (উচ্চতর গণিত ১ম পত্র)",
      teacherTipsBn: "\\lim_{\\theta \\to 0} \\frac{\\sin \\theta}{\\theta} = 1 সূত্র প্রয়োগ করুন।",
      options: [
        { key: "A", bn: "5", en: "5", correct: true },
        { key: "B", bn: "1", en: "1", correct: false },
        { key: "C", bn: "0", en: "0", correct: false },
        { key: "D", bn: "\\frac{1}{5}", en: "\\frac{1}{5}", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "\\lim_{x \\to 0} 5 \\cdot \\frac{\\sin 5x}{5x} = 5 \\cdot (1) = 5।",
      },
      boardCode: "RAJ",
      year: 2023,
    },

    // --- DU Ka Unit Science Admission ---
    {
      category: ExamCategoryType.UNIVERSITY,
      subjectId: duScience.id,
      chapterId: chDuPhy.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.HARD,
      questionTextBn: "একটি ভূ-স্থির উপগ্রহের (Geostationary Satellite) আবর্তনকাল কত?",
      questionTextEn: "What is the orbital period of a geostationary satellite?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 30,
      textbookRef: "DU 'Ka' Unit 2022-23 Admission Test",
      teacherTipsBn: "ভূ-স্থির উপগ্রহ পৃথিবীর সাথে সাথে নিজ অক্ষে আবর্তন করে, তাই আবর্তনকাল ২৪ ঘণ্টা।",
      options: [
        { key: "A", bn: "24 ঘণ্টা (24 hours)", en: "24 hours", correct: true },
        { key: "B", bn: "12 ঘণ্টা", en: "12 hours", correct: false },
        { key: "C", bn: "365 দিন", en: "365 days", correct: false },
        { key: "D", bn: "48 ঘণ্টা", en: "48 hours", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "ভূ-স্থির উপগ্রহ পৃথিবীর আহ্নিক গতির সাথে মিল রেখে পশ্চিম থেকে পূর্বে ২৪ ঘণ্টায় একবার পৃথিবীকে প্রদক্ষিণ করে।",
      },
      year: 2023,
    },
    {
      category: ExamCategoryType.UNIVERSITY,
      subjectId: duScience.id,
      chapterId: chDuMath.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.HARD,
      questionTextBn: "\\int e^x (\\sin x + \\cos x) dx এর মান কোনটি?",
      questionTextEn: "What is the value of \\int e^x (\\sin x + \\cos x) dx?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 40,
      textbookRef: "DU 'Ka' Unit 2021-22 Admission Test",
      teacherTipsBn: "\\int e^x [f(x) + f'(x)] dx = e^x f(x) + C স্ট্যান্ডার্ড ফর্মুলা।",
      options: [
        { key: "A", bn: "e^x \\sin x + C", en: "e^x \\sin x + C", correct: true },
        { key: "B", bn: "e^x \\cos x + C", en: "e^x \\cos x + C", correct: false },
        { key: "C", bn: "-e^x \\cos x + C", en: "-e^x \\cos x + C", correct: false },
        { key: "D", bn: "e^x (\\sin x - \\cos x) + C", en: "e^x (\\sin x - \\cos x) + C", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "যেহেতু \\frac{d}{dx}(\\sin x) = \\cos x, সুতরাং স্ট্যান্ডার্ড ফর্মুলা \\int e^x [f(x) + f'(x)] dx = e^x f(x) + C অনুসারে ফলাফল e^x \\sin x + C।",
      },
      year: 2022,
    },

    // --- Medical Admission Biology ---
    {
      category: ExamCategoryType.MEDICAL,
      subjectId: medBio.id,
      chapterId: chCell.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      questionTextBn: "কোষের 'পাওয়ার হাউস' (Powerhouse of the Cell) বলা হয় নিচের কোনটিকে?",
      questionTextEn: "Which of the following is called the 'Powerhouse of the Cell'?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 25,
      textbookRef: "গাজী আজমল (উচ্চ মাধ্যমিক জীববিজ্ঞান ১ম পত্র)",
      teacherTipsBn: "এটি এটিপি (ATP) তৈরি ও সঞ্চয় করে বলে একে কোষের শক্তিকেন্দ্র বলে।",
      options: [
        { key: "A", bn: "মাইটোকন্ড্রিয়া (Mitochondria)", en: "Mitochondria", correct: true },
        { key: "B", bn: "গলজি বস্তু (Golgi Apparatus)", en: "Golgi Apparatus", correct: false },
        { key: "C", bn: "রাইবোসোম (Ribosome)", en: "Ribosome", correct: false },
        { key: "D", bn: "লাইসোসোম (Lysosome)", en: "Lysosome", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "মাইটোকন্ড্রিয়ায় শ্বসনের ক্রেবস চক্র ও ইলেকট্রন ট্রান্সপোর্ট চেইনের মাধ্যমে সর্বাধিক শক্তি (ATP) উৎপন্ন হয়, তাই একে কোষের পাওয়ার হাউস বলে।",
      },
      year: 2023,
    },
    {
      category: ExamCategoryType.MEDICAL,
      subjectId: medBio.id,
      chapterId: chCell.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      questionTextBn: "কোন অঙ্গাণুকে কোষের 'আত্মঘাতী থলিকা' বা 'Suicidal Squad' বলা হয়?",
      questionTextEn: "Which organelle is called the 'Suicidal Squad' of a cell?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 25,
      textbookRef: "মেডিকেল ভর্তি পরীক্ষা ২০২৩-২৪",
      teacherTipsBn: "লাইসোসোমে হাইড্রোলাইটিক এনজাইম থাকে যা অটোলাইসিস ঘটাতে পারে।",
      options: [
        { key: "A", bn: "লাইসোসোম (Lysosome)", en: "Lysosome", correct: true },
        { key: "B", bn: "সেন্ট্রোজোম (Centrosome)", en: "Centrosome", correct: false },
        { key: "C", bn: "রাইবোসোম (Ribosome)", en: "Ribosome", correct: false },
        { key: "D", bn: "পারঅক্সিসোম (Peroxisome)", en: "Peroxisome", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "তীব্র খাদ্যাভাব বা কোষাভ্যন্তরীণ প্রতিকূল অবস্থায় লাইসোসোমের প্রাচীর বিদীর্ণ হয়ে এর হাইড্রোলাইটিক এনজাইমসমূহ সমগ্র কোষকে ধ্বংস করে ফেলে, তাই একে আত্মঘাতী থলিকা (Suicidal bag) বলে।",
      },
      year: 2023,
    },
  ];

  let createdCount = 0;
  for (const q of questionsData) {
    const createdQ = await prisma.question.create({
      data: {
        category: q.category,
        subjectId: q.subjectId,
        chapterId: q.chapterId,
        type: q.type,
        difficulty: q.difficulty,
        status: ContentStatus.PUBLISHED,
        questionTextBn: q.questionTextBn,
        questionTextEn: q.questionTextEn,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        estimatedSeconds: q.estimatedSeconds,
        textbookRef: q.textbookRef,
        teacherTipsBn: q.teacherTipsBn,
        authorId: admin.id,
        options: {
          create: q.options.map((opt, idx) => ({
            optionKey: opt.key,
            textBn: opt.bn,
            textEn: opt.en,
            isCorrect: opt.correct,
            orderIndex: idx + 1,
          })),
        },
        answer: {
          create: {
            correctKey: q.answer.correctKey,
            explanationBn: q.answer.explanationBn,
          },
        },
      },
    });

    if (q.boardCode) {
      const b = await prisma.examinationBoard.findUnique({ where: { code: q.boardCode } });
      if (b) {
        await prisma.questionReference.create({
          data: {
            questionId: createdQ.id,
            boardId: b.id,
            examYear: q.year,
            examSessionName: `${b.nameBn} ${q.year}`,
          },
        });
      }
    } else if (q.category === ExamCategoryType.UNIVERSITY && du) {
      await prisma.questionReference.create({
        data: {
          questionId: createdQ.id,
          universityId: du.id,
          examYear: q.year,
          examSessionName: `ঢাকা বিশ্ববিদ্যালয় ${q.year}`,
        },
      });
    }

    createdCount++;
  }

  console.log(`✓ Added ${createdCount} new authentic questions across HSC, DU Admission, and Medical.`);
  const total = await prisma.question.count();
  console.log(`🎉 Total question bank volume is now: ${total} questions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
