import { PrismaClient, ExamCategoryType, QuestionType, DifficultyLevel, ContentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("==========================================================");
  console.log(" Cleaning Demo Data & Seeding Authentic Question Bank");
  console.log("==========================================================");

  // 1. Clean up duplicate test/demo questions and test subjects
  console.log("[1/5] Cleaning up demo/duplicate records...");

  // Delete questions belonging to demo subjects like PHY_AI_TEST
  const demoSubject = await prisma.subject.findUnique({ where: { code: "PHY_AI_TEST" } });
  if (demoSubject) {
    await prisma.question.deleteMany({ where: { subjectId: demoSubject.id } });
    await prisma.chapter.deleteMany({ where: { subjectId: demoSubject.id } });
    await prisma.subject.delete({ where: { id: demoSubject.id } });
    console.log("✓ Removed PHY_AI_TEST demo subject and associated questions");
  }

  async function safeDeleteQuestions(where) {
    const qs = await prisma.question.findMany({ where, select: { id: true } });
    const ids = qs.map((q) => q.id);
    if (ids.length === 0) return;

    await prisma.studentAnswer.deleteMany({ where: { questionId: { in: ids } } });
    await prisma.examSessionQuestion.deleteMany({ where: { questionId: { in: ids } } });
    await prisma.examQuestion.deleteMany({ where: { questionId: { in: ids } } });
    await prisma.bookmark.deleteMany({ where: { questionId: { in: ids } } });
    await prisma.wrongQuestion.deleteMany({ where: { questionId: { in: ids } } });
    await prisma.contentReview.deleteMany({ where: { questionId: { in: ids } } });
    await prisma.questionRevision.deleteMany({ where: { questionId: { in: ids } } });
    await prisma.questionReport.deleteMany({ where: { questionId: { in: ids } } });
    await prisma.similarQuestion.deleteMany({
      where: { OR: [{ sourceQuestionId: { in: ids } }, { similarQuestionId: { in: ids } }] },
    });
    await prisma.personalQuestionCollectionItem.deleteMany({ where: { questionId: { in: ids } } });
    await prisma.question.deleteMany({ where: { id: { in: ids } } });
  }

  // Delete OCR demo questions with specific test phrases
  await safeDeleteQuestions({
    OR: [
      { questionTextBn: { contains: "অনুবাদক: আব্দুল্লাহ" } },
      { questionTextBn: { contains: "আব্দুস সালাম ইবন বেরজিস" } },
    ],
  });

  // Deduplicate any repeated questions with identical questionTextBn
  const allQuestions = await prisma.question.findMany({
    select: { id: true, questionTextBn: true, subjectId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const seenMap = new Map();
  const toDeleteIds = [];
  for (const q of allQuestions) {
    const key = `${q.subjectId}::${q.questionTextBn.trim()}`;
    if (seenMap.has(key)) {
      toDeleteIds.push(q.id);
    } else {
      seenMap.set(key, q.id);
    }
  }

  if (toDeleteIds.length > 0) {
    await safeDeleteQuestions({ id: { in: toDeleteIds } });
    console.log(`✓ Removed ${toDeleteIds.length} duplicate question copies.`);
  }

  // 2. Load core users, boards and universities
  console.log("[2/5] Loading administrative references and boards...");
  const admin = await prisma.user.findUnique({ where: { email: "admin@edubd.ac" } });
  if (!admin) {
    throw new Error("Admin user admin@edubd.ac not found. Please run seed.mjs first.");
  }

  const boards = await prisma.examinationBoard.findMany();
  const boardMap = new Map(boards.map((b) => [b.code, b.id]));

  const du = await prisma.university.findUnique({ where: { code: "DU" } });

  // 3. Upsert Subjects for all 4 categories (SSC, HSC, MEDICAL, UNIVERSITY)
  console.log("[3/5] Setting up authentic curriculum subjects and chapters...");

  const subjectsConfig = [
    // --- SSC ---
    {
      code: "SSC_MATH",
      nameBn: "সাধারণ গণিত (এসএসসি)",
      nameEn: "General Mathematics (SSC)",
      category: ExamCategoryType.SSC,
      chapters: [
        { num: 1, bn: "বাস্তব সংখ্যা (Real Numbers)", en: "Real Numbers" },
        { num: 2, bn: "সেট ও ফাংশন (Sets & Functions)", en: "Sets & Functions" },
        { num: 3, bn: "বীজগণিতীয় রাশি (Algebraic Expressions)", en: "Algebraic Expressions" },
        { num: 7, bn: "ব্যবহারিক জ্যামিতি (Practical Geometry)", en: "Practical Geometry" },
        { num: 9, bn: "ত্রিকোণমিতিক অনুপাত (Trigonometric Ratios)", en: "Trigonometric Ratios" },
        { num: 16, bn: "পরিমিতি (Mensuration)", en: "Mensuration" },
        { num: 17, bn: "পরিসংখ্যান (Statistics)", en: "Statistics" },
      ],
    },
    {
      code: "SSC_HMATH",
      nameBn: "উচ্চতর গণিত (এসএসসি)",
      nameEn: "Higher Mathematics (SSC)",
      category: ExamCategoryType.SSC,
      chapters: [
        { num: 1, bn: "সেট ও ফাংশন (Sets & Functions)", en: "Sets & Functions" },
        { num: 2, bn: "বীজগাণিতিক রাশি (Algebraic Expressions)", en: "Algebraic Expressions" },
        { num: 7, bn: "অসীম ধারা (Infinite Series)", en: "Infinite Series" },
        { num: 8, bn: "ত্রিকোণমিতি (Trigonometry)", en: "Trigonometry" },
        { num: 10, bn: "দ্বিপদী বিস্তৃতি (Binomial Expansion)", en: "Binomial Expansion" },
        { num: 11, bn: "স্থানাঙ্ক জ্যামিতি (Coordinate Geometry)", en: "Coordinate Geometry" },
      ],
    },
    {
      code: "SSC_PHY",
      nameBn: "পদার্থবিজ্ঞান (এসএসসি)",
      nameEn: "Physics (SSC)",
      category: ExamCategoryType.SSC,
      chapters: [
        { num: 1, bn: "ভৌত রাশি ও পরিমাপ (Physical Quantities)", en: "Physical Quantities" },
        { num: 2, bn: "গতি (Motion)", en: "Motion" },
        { num: 3, bn: "বল (Force)", en: "Force" },
        { num: 4, bn: "কাজ, ক্ষমতা ও শক্তি (Work, Power & Energy)", en: "Work, Power & Energy" },
        { num: 8, bn: "আলোর প্রতিফলন (Reflection of Light)", en: "Reflection of Light" },
        { num: 11, bn: "চল বিদ্যুৎ (Current Electricity)", en: "Current Electricity" },
      ],
    },
    {
      code: "SSC_CHEM",
      nameBn: "রসায়ন (এসএসসি)",
      nameEn: "Chemistry (SSC)",
      category: ExamCategoryType.SSC,
      chapters: [
        { num: 3, bn: "পদার্থের গঠন (Structure of Matter)", en: "Structure of Matter" },
        { num: 4, bn: "পর্যায় সারণি (Periodic Table)", en: "Periodic Table" },
        { num: 5, bn: "রাসায়নিক বন্ধন (Chemical Bond)", en: "Chemical Bond" },
        { num: 6, bn: "মোলের ধারণা ও রাসায়নিক গণনা", en: "Concept of Mole" },
        { num: 11, bn: "খনিজ সম্পদ: জীবাশ্ম (Fossil Fuels)", en: "Mineral Resources" },
      ],
    },
    {
      code: "SSC_BIO",
      nameBn: "জীববিজ্ঞান (এসএসসি)",
      nameEn: "Biology (SSC)",
      category: ExamCategoryType.SSC,
      chapters: [
        { num: 1, bn: "জীবন পাঠ (Lessons of Life)", en: "Lessons of Life" },
        { num: 2, bn: "জীবকোষ ও টিস্যু (Cells & Tissues)", en: "Cells & Tissues" },
        { num: 3, bn: "কোষ বিভাজন (Cell Division)", en: "Cell Division" },
        { num: 4, bn: "জীবনীশক্তি (Bioenergetics)", en: "Bioenergetics" },
        { num: 6, bn: "জীবে পরিবহন (Transport in Organisms)", en: "Transport" },
      ],
    },

    // --- HSC ---
    {
      code: "PHY_1",
      nameBn: "পদার্থবিজ্ঞান ১ম পত্র",
      nameEn: "Physics 1st Paper",
      category: ExamCategoryType.HSC,
      hasPapers: true,
      chapters: [
        { num: 2, bn: "ভেক্টর (Vectors)", en: "Vectors", paperNumber: 1 },
        { num: 4, bn: "নিউটনিয়ান বলবিদ্যা (Newtonian Mechanics)", en: "Newtonian Mechanics", paperNumber: 1 },
        { num: 5, bn: "কাজ, শক্তি ও ক্ষমতা (Work, Energy & Power)", en: "Work, Energy & Power", paperNumber: 1 },
        { num: 6, bn: "মহাকর্ষ ও অভিকর্ষ (Gravitation & Gravity)", en: "Gravitation", paperNumber: 1 },
        { num: 8, bn: "পর্যাবৃত্ত গতি (Periodic Motion)", en: "Periodic Motion", paperNumber: 1 },
        { num: 10, bn: "আদর্শ গ্যাস ও গ্যাসের গতিতত্ত্ব (Ideal Gas)", en: "Ideal Gas", paperNumber: 1 },
      ],
    },
    {
      code: "PHY_2",
      nameBn: "পদার্থবিজ্ঞান ২য় পত্র",
      nameEn: "Physics 2nd Paper",
      category: ExamCategoryType.HSC,
      hasPapers: true,
      chapters: [
        { num: 1, bn: "তাপগতিবিদ্যা (Thermodynamics)", en: "Thermodynamics", paperNumber: 2 },
        { num: 2, bn: "স্থির তড়িৎ (Static Electricity)", en: "Static Electricity", paperNumber: 2 },
        { num: 3, bn: "চল তড়িৎ (Current Electricity)", en: "Current Electricity", paperNumber: 2 },
        { num: 7, bn: "ভৌত আলোকবিজ্ঞান (Physical Optics)", en: "Physical Optics", paperNumber: 2 },
        { num: 8, bn: "আধুনিক পদার্থবিজ্ঞানের সূচনা (Modern Physics)", en: "Modern Physics", paperNumber: 2 },
        { num: 9, bn: "পরমাণুর মডেল ও নিউক্লিয়ার পদার্থবিজ্ঞান", en: "Atomic Model", paperNumber: 2 },
      ],
    },
    {
      code: "CHEM_1",
      nameBn: "রসায়ন ১ম পত্র",
      nameEn: "Chemistry 1st Paper",
      category: ExamCategoryType.HSC,
      hasPapers: true,
      chapters: [
        { num: 2, bn: "গুণগত রসায়ন (Qualitative Chemistry)", en: "Qualitative Chemistry", paperNumber: 1 },
        { num: 3, bn: "মৌলের পর্যায়বৃত্ত ধর্ম ও রাসায়নিক বন্ধন", en: "Periodic Properties", paperNumber: 1 },
        { num: 4, bn: "রাসায়নিক পরিবর্তন (Chemical Changes)", en: "Chemical Changes", paperNumber: 1 },
        { num: 5, bn: "কর্মমুখী রসায়ন (Applied Chemistry)", en: "Applied Chemistry", paperNumber: 1 },
      ],
    },
    {
      code: "CHEM_2",
      nameBn: "রসায়ন ২য় পত্র",
      nameEn: "Chemistry 2nd Paper",
      category: ExamCategoryType.HSC,
      hasPapers: true,
      chapters: [
        { num: 1, bn: "পরিবেশ রসায়ন (Environmental Chemistry)", en: "Environmental Chemistry", paperNumber: 2 },
        { num: 2, bn: "জৈব রসায়ন (Organic Chemistry)", en: "Organic Chemistry", paperNumber: 2 },
        { num: 3, bn: "পরিমাণগত রসায়ন (Quantitative Chemistry)", en: "Quantitative Chemistry", paperNumber: 2 },
        { num: 4, bn: "তড়িৎ রসায়ন (Electrochemistry)", en: "Electrochemistry", paperNumber: 2 },
      ],
    },
    {
      code: "HMATH_1",
      nameBn: "উচ্চতর গণিত ১ম পত্র",
      nameEn: "Higher Mathematics 1st Paper",
      category: ExamCategoryType.HSC,
      hasPapers: true,
      chapters: [
        { num: 1, bn: "ম্যাট্রিক্স ও নির্ণায়ক (Matrices & Determinants)", en: "Matrices", paperNumber: 1 },
        { num: 3, bn: "সরলরেখা (Straight Lines)", en: "Straight Lines", paperNumber: 1 },
        { num: 4, bn: "বৃত্ত (Circle)", en: "Circle", paperNumber: 1 },
        { num: 7, bn: "সংযুক্ত কোণের ত্রিকোণমিতিক অনুপাত", en: "Trigonometric Ratios", paperNumber: 1 },
        { num: 9, bn: "অন্তরীকরণ (Differentiation)", en: "Differentiation", paperNumber: 1 },
        { num: 10, bn: "যৌগজীকরণ (Integration)", en: "Integration", paperNumber: 1 },
      ],
    },
    {
      code: "HMATH_2",
      nameBn: "উচ্চতর গণিত ২য় পত্র",
      nameEn: "Higher Mathematics 2nd Paper",
      category: ExamCategoryType.HSC,
      hasPapers: true,
      chapters: [
        { num: 3, bn: "জটিল সংখ্যা (Complex Numbers)", en: "Complex Numbers", paperNumber: 2 },
        { num: 4, bn: "বহুপদী ও বহুপদী সমীকরণ (Polynomials)", en: "Polynomials", paperNumber: 2 },
        { num: 6, bn: "কণিক (Conics)", en: "Conics", paperNumber: 2 },
        { num: 7, bn: "বিপরীত ত্রিকোণমিতিক ফাংশন ও সমীকরণ", en: "Inverse Trig Functions", paperNumber: 2 },
        { num: 8, bn: "স্থিতিবিদ্যা (Statics)", en: "Statics", paperNumber: 2 },
        { num: 9, bn: "গতিবিদ্যা (Dynamics)", en: "Dynamics", paperNumber: 2 },
      ],
    },
    {
      code: "BIO_1",
      nameBn: "জীববিজ্ঞান ১ম পত্র (উদ্ভিদবিজ্ঞান)",
      nameEn: "Biology 1st Paper (Botany)",
      category: ExamCategoryType.HSC,
      hasPapers: true,
      chapters: [
        { num: 1, bn: "কোষ ও এর গঠন (Cell & its Structure)", en: "Cell Structure", paperNumber: 1 },
        { num: 2, bn: "কোষ বিভাজন (Cell Division)", en: "Cell Division", paperNumber: 1 },
        { num: 4, bn: "অণুজীব (Microorganisms)", en: "Microorganisms", paperNumber: 1 },
        { num: 8, bn: "টিস্যু ও টিস্যুতন্ত্র (Tissue & Tissue System)", en: "Tissues", paperNumber: 1 },
        { num: 9, bn: "উদ্ভিদ শারীরতত্ত্ব (Plant Physiology)", en: "Plant Physiology", paperNumber: 1 },
      ],
    },
    {
      code: "BIO_2",
      nameBn: "জীববিজ্ঞান ২য় পত্র (প্রাণিবিজ্ঞান)",
      nameEn: "Biology 2nd Paper (Zoology)",
      category: ExamCategoryType.HSC,
      hasPapers: true,
      chapters: [
        { num: 1, bn: "প্রাণীর বিভিন্নতা ও শ্রেণিবিন্যাস (Diversity)", en: "Animal Diversity", paperNumber: 2 },
        { num: 2, bn: "প্রাণীর পরিচিতি: হাইড্রা ও ঘাসফড়িং", en: "Animal Types", paperNumber: 2 },
        { num: 3, bn: "মানব শারীরতত্ত্ব: পরিপাক ও শোষণ", en: "Digestion", paperNumber: 2 },
        { num: 4, bn: "মানব শারীরতত্ত্ব: রক্ত ও সংবহন", en: "Blood & Circulation", paperNumber: 2 },
        { num: 11, bn: "জিনতত্ত্ব ও বিবর্তন (Genetics & Evolution)", en: "Genetics", paperNumber: 2 },
      ],
    },
    {
      code: "HSC_ICT",
      nameBn: "তথ্য ও যোগাযোগ প্রযুক্তি (এইচএসসি)",
      nameEn: "Information & Communication Technology",
      category: ExamCategoryType.HSC,
      chapters: [
        { num: 3, bn: "সংখ্যা পদ্ধতি ও ডিজিটাল ডিভাইস", en: "Number Systems", paperNumber: 1 },
        { num: 4, bn: "ওয়েব ডিজাইন পরিচিতি এবং HTML", en: "HTML & Web Design", paperNumber: 1 },
        { num: 5, bn: "প্রোগ্রামিং ভাষা (C Programming)", en: "C Programming", paperNumber: 1 },
      ],
    },

    // --- Medical Admission ---
    {
      code: "MED_BIO",
      nameBn: "জীববিজ্ঞান (মেডিকেল ভর্তি)",
      nameEn: "Medical Biology",
      category: ExamCategoryType.MEDICAL,
      chapters: [
        { num: 1, bn: "কোষ ও এর গঠন (Cell & Organelles)", en: "Cell & Organelles" },
        { num: 2, bn: "মানব শারীরতত্ত্ব ও পরিপাক (Human Digestion)", en: "Digestion" },
        { num: 3, bn: "রক্ত ও রক্ত সংবহনতন্ত্র (Circulatory System)", en: "Circulation" },
        { num: 4, bn: "জিনতত্ত্ব ও বংশগতি (Genetics & Heredity)", en: "Genetics" },
        { num: 5, bn: "উদ্ভিদ শারীরতত্ত্ব ও প্রস্বেদন (Plant Physiology)", en: "Plant Physiology" },
      ],
    },
    {
      code: "MED_CHEM",
      nameBn: "রসায়ন (মেডিকেল ভর্তি)",
      nameEn: "Medical Chemistry",
      category: ExamCategoryType.MEDICAL,
      chapters: [
        { num: 1, bn: "গুণগত রসায়ন ও দ্রাব্যতা (Qualitative Chemistry)", en: "Qualitative Chemistry" },
        { num: 2, bn: "জৈব রসায়ন ও নামকরণ (Organic Chemistry)", en: "Organic Chemistry" },
        { num: 3, bn: "পর্যায় সারণি ও সংকরায়ন (Periodic Trends)", en: "Periodic Trends" },
      ],
    },
    {
      code: "MED_GK",
      nameBn: "সাধারণ জ্ঞান (মেডিকেল ভর্তি)",
      nameEn: "Medical General Knowledge",
      category: ExamCategoryType.MEDICAL,
      chapters: [
        { num: 1, bn: "বাংলাদেশের ইতিহাস ও মুক্তিযুদ্ধ (Liberation War)", en: "Liberation War" },
        { num: 2, bn: "সংবিধান ও জাতীয় অর্জন (Constitution & Achievements)", en: "Constitution" },
      ],
    },

    // --- University Admission (DU Ka / GST) ---
    {
      code: "DU_KA",
      nameBn: "ঢাবি 'ক' ইউনিট (বিজ্ঞান)",
      nameEn: "DU 'Ka' Unit Science",
      category: ExamCategoryType.UNIVERSITY,
      chapters: [
        { num: 1, bn: "পদার্থবিজ্ঞান উচ্চতর সমস্যা ও সমাধান", en: "Advanced Physics Problems" },
        { num: 2, bn: "উচ্চতর গণিত ক্যালকুলাস ও শর্টকাট ট্রিকস", en: "Calculus & Shortcut Tricks" },
        { num: 3, bn: "রসায়ন স্পেশাল ড্রিল (Chemistry Advanced Drill)", en: "Chemistry Advanced Drill" },
      ],
    },
    {
      code: "GST_A",
      nameBn: "গুচ্ছ 'এ' ইউনিট (বিজ্ঞান)",
      nameEn: "GST 'A' Unit Science",
      category: ExamCategoryType.UNIVERSITY,
      chapters: [
        { num: 1, bn: "পদার্থবিজ্ঞান ও গণিত মডেল প্রশ্নমালা", en: "Physics & Math Model Questions" },
        { num: 2, bn: "রসায়ন ও জীববিজ্ঞান মডেল প্রশ্নমালা", en: "Chemistry & Biology Model Questions" },
      ],
    },
  ];

  const subjectRecordMap = new Map();
  const chapterRecordMap = new Map();

  for (const s of subjectsConfig) {
    const subject = await prisma.subject.upsert({
      where: { code: s.code },
      update: {
        nameBn: s.nameBn,
        nameEn: s.nameEn,
        category: s.category,
      },
      create: {
        code: s.code,
        nameBn: s.nameBn,
        nameEn: s.nameEn,
        category: s.category,
      },
    });

    subjectRecordMap.set(s.code, subject);

    // Create or find paper if applicable
    let paper1 = null;
    let paper2 = null;
    if (s.hasPapers) {
      const pNum = s.code.endsWith("_2") ? 2 : 1;
      const paperNameBn = pNum === 2 ? "২য় পত্র" : "১ম পত্র";
      const paperNameEn = pNum === 2 ? "2nd Paper" : "1st Paper";

      paper1 = await prisma.paper.upsert({
        where: { subjectId_paperNumber: { subjectId: subject.id, paperNumber: pNum } },
        update: {},
        create: {
          subjectId: subject.id,
          paperNumber: pNum,
          nameBn: paperNameBn,
          nameEn: paperNameEn,
        },
      });
    }

    // Upsert chapters
    for (const c of s.chapters) {
      let ch = await prisma.chapter.findFirst({
        where: { subjectId: subject.id, chapterNum: c.num },
      });

      if (!ch) {
        ch = await prisma.chapter.create({
          data: {
            subjectId: subject.id,
            paperId: c.paperNumber === 2 ? (paper2 ? paper2.id : paper1?.id) : paper1?.id,
            chapterNum: c.num,
            nameBn: c.bn,
            nameEn: c.en,
          },
        });
      } else {
        await prisma.chapter.update({
          where: { id: ch.id },
          data: { nameBn: c.bn, nameEn: c.en },
        });
      }

      chapterRecordMap.set(`${s.code}::${c.num}`, ch);
    }
  }

  console.log("✓ Core curriculum subjects and chapters ready across all 4 categories.");

  // 4. Authentic Verified Questions Dataset
  console.log("[4/5] Seeding rich authentic question bank with multi-board & year references...");

  const authenticQuestions = [
    // -------------------------------------------------------------------------
    // SSC PHYSICS
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.SSC,
      subjectCode: "SSC_PHY",
      chapterNum: 2,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "স্থির অবস্থান হতে সুষম ত্বরণে চলমান কোনো বস্তুর নির্দিষ্ট সময়ে অতিক্রান্ত দূরত্ব (s) সময়ের (t) সাথে কীভাবে সম্পর্কিত?",
      textEn: "For an object starting from rest with uniform acceleration, how is displacement (s) related to time (t)?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "এনসিটিবি পদার্থবিজ্ঞান, নবম-দশম শ্রেণি, অধ্যায় ২ (পৃষ্ঠা ৪২)",
      teacherTipsBn: "s = ut + 1/2 at^2 সমীকরণে u = 0 বসালে s \\propto t^2 পাওয়া যায়।",
      options: [
        { key: "A", bn: "s \\propto t^2 (সময়ের বর্গের সমানুপাতিক)", en: "s is proportional to t^2", correct: true },
        { key: "B", bn: "s \\propto t (সময়ের সমানুপাতিক)", en: "s is proportional to t", correct: false },
        { key: "C", bn: "s \\propto \\sqrt{t}", en: "s is proportional to sqrt(t)", correct: false },
        { key: "D", bn: "s \\propto \\frac{1}{t}", en: "s is inversely proportional to t", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "স্থির অবস্থান হতে চললে আদিবেগ u = 0। সুতরাং গতির সমীকরণ s = 0 + \\frac{1}{2}at^2 \\implies s = \\frac{1}{2}at^2। যেহেতু ত্বরণ a ধ্রুবক, তাই s \\propto t^2।",
      },
      boardCode: "DHA",
      year: 2024,
    },
    {
      category: ExamCategoryType.SSC,
      subjectCode: "SSC_PHY",
      chapterNum: 3,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      textBn: "৫০ কেজি ভরের একটি স্থির বস্তুর ওপর ১০ সেকেন্ড ধরে ২০০ নিউটন বল প্রয়োগ করা হলে বস্তুটির শেষ বেগ কত হবে?",
      textEn: "If a force of 200 N is applied for 10 s on a stationary object of mass 50 kg, what will be its final velocity?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "এনসিটিবি পদার্থবিজ্ঞান, অধ্যায় ৩: বল",
      teacherTipsBn: "ত্বরণ a = F / m বের করে v = u + at ব্যবহার করুন।",
      options: [
        { key: "A", bn: "40 m/s", en: "40 m/s", correct: true },
        { key: "B", bn: "20 m/s", en: "20 m/s", correct: false },
        { key: "C", bn: "50 m/s", en: "50 m/s", correct: false },
        { key: "D", bn: "100 m/s", en: "100 m/s", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "ত্বরণ a = \\frac{F}{m} = \\frac{200}{50} = 4\\text{ m/s}^2। বস্তুটির আদিবেগ u = 0। ১০ সেকেন্ড পর শেষ বেগ v = u + at = 0 + (4 \\times 10) = 40\\text{ m/s}।",
      },
      boardCode: "CTG",
      year: 2023,
    },
    {
      category: ExamCategoryType.SSC,
      subjectCode: "SSC_PHY",
      chapterNum: 4,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "১ অশ্বক্ষমতা (1 Horse Power) সমান কত ওয়াট?",
      textEn: "How many watts is 1 Horse Power (HP) equal to?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "এনসিটিবি পদার্থবিজ্ঞান, অধ্যায় ৪",
      teacherTipsBn: "1 HP = 746 W মুখস্থ রাখা জরুরি।",
      options: [
        { key: "A", bn: "746 ওয়াট (W)", en: "746 W", correct: true },
        { key: "B", bn: "1000 ওয়াট (W)", en: "1000 W", correct: false },
        { key: "C", bn: "500 ওয়াট (W)", en: "500 W", correct: false },
        { key: "D", bn: "750 ওয়াট (W)", en: "750 W", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "ক্ষমতার ব্যবহারিক একক ১ অশ্বক্ষমতা = ৭৪৬ ওয়াট (1 HP = 746 Watts)।",
      },
      boardCode: "RAJ",
      year: 2022,
    },

    // -------------------------------------------------------------------------
    // SSC GENERAL MATH
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.SSC,
      subjectCode: "SSC_MATH",
      chapterNum: 3,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "x + \\frac{1}{x} = 3 হলে, x^2 + \\frac{1}{x^2} এর মান কত?",
      textEn: "If x + 1/x = 3, what is the value of x^2 + 1/x^2?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "এনসিটিবি গণিত, নবম-দশম শ্রেণি, অধ্যায় ৩",
      teacherTipsBn: "a^2 + b^2 = (a+b)^2 - 2ab সূত্র ব্যবহার করুন।",
      options: [
        { key: "A", bn: "7", en: "7", correct: true },
        { key: "B", bn: "9", en: "9", correct: false },
        { key: "C", bn: "11", en: "11", correct: false },
        { key: "D", bn: "5", en: "5", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "x^2 + \\frac{1}{x^2} = \\left(x + \\frac{1}{x}\\right)^2 - 2 \\cdot x \\cdot \\frac{1}{x} = 3^2 - 2 = 9 - 2 = 7।",
      },
      boardCode: "COM",
      year: 2023,
    },
    {
      category: ExamCategoryType.SSC,
      subjectCode: "SSC_MATH",
      chapterNum: 9,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "\\tan 45^\\circ + \\sin 30^\\circ এর মান কত?",
      textEn: "What is the value of tan 45° + sin 30°?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "এনসিটিবি গণিত, অধ্যায় ৯ (ত্রিকোণমিতিক অনুপাত)",
      teacherTipsBn: "\\tan 45^\\circ = 1 এবং \\sin 30^\\circ = 1/2।",
      options: [
        { key: "A", bn: "\\frac{3}{2} বা 1.5", en: "3/2 or 1.5", correct: true },
        { key: "B", bn: "1", en: "1", correct: false },
        { key: "C", bn: "\\frac{1}{2}", en: "1/2", correct: false },
        { key: "D", bn: "2", en: "2", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "\\tan 45^\\circ = 1 এবং \\sin 30^\\circ = \\frac{1}{2}। সুতরাং মান = 1 + \\frac{1}{2} = \\frac{3}{2} = 1.5।",
      },
      boardCode: "BAR",
      year: 2022,
    },
    {
      category: ExamCategoryType.SSC,
      subjectCode: "SSC_MATH",
      chapterNum: 16,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      textBn: "একটি সমবাহু ত্রিভুজের বাহুর দৈর্ঘ্য 4 cm হলে এর ক্ষেত্রফল কত বর্গ সেন্টিমিটার?",
      textEn: "If the side of an equilateral triangle is 4 cm, what is its area in square cm?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "এনসিটিবি গণিত, অধ্যায় ১৬: পরিমিতি",
      teacherTipsBn: "সমবাহু ত্রিভুজের ক্ষেত্রফল = \\frac{\\sqrt{3}}{4} a^2।",
      options: [
        { key: "A", bn: "4\\sqrt{3} cm^2", en: "4*sqrt(3) cm^2", correct: true },
        { key: "B", bn: "8\\sqrt{3} cm^2", en: "8*sqrt(3) cm^2", correct: false },
        { key: "C", bn: "16\\sqrt{3} cm^2", en: "16*sqrt(3) cm^2", correct: false },
        { key: "D", bn: "12 cm^2", en: "12 cm^2", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "ক্ষেত্রফল = \\frac{\\sqrt{3}}{4} a^2 = \\frac{\\sqrt{3}}{4} \\times 4^2 = \\frac{\\sqrt{3}}{4} \\times 16 = 4\\sqrt{3}\\text{ cm}^2।",
      },
      boardCode: "JES",
      year: 2021,
    },

    // -------------------------------------------------------------------------
    // SSC CHEMISTRY
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.SSC,
      subjectCode: "SSC_CHEM",
      chapterNum: 4,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "আধুনিক পর্যায় সারণির মূল ভিত্তি কী?",
      textEn: "What is the fundamental basis of the modern periodic table?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "এনসিটিবি রসায়ন, নবম-দশম শ্রেণি, অধ্যায় ৪",
      teacherTipsBn: "মেন্ডেলিফের ভিত্তি ছিল পারমাণবিক ভর, আধুনিক রূপ হলো পারমাণবিক সংখ্যা।",
      options: [
        { key: "A", bn: "পারমাণবিক সংখ্যা (Atomic Number)", en: "Atomic Number", correct: true },
        { key: "B", bn: "পারমাণবিক ভর (Atomic Mass)", en: "Atomic Mass", correct: false },
        { key: "C", bn: "নিউট্রন সংখ্যা (Neutron Number)", en: "Neutron Number", correct: false },
        { key: "D", bn: "আইসোটোপ সংখ্যা", en: "Isotope count", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "হেনরি মোসলে ১৯১৩ সালে পারমাণবিক সংখ্যার ভিত্তিতে পর্যায় সারণি পুনর্বিন্যাস করেন, যা পর্যায় সারণির মূল ভিত্তি হিসেবে স্বীকৃত।",
      },
      boardCode: "DIN",
      year: 2023,
    },
    {
      category: ExamCategoryType.SSC,
      subjectCode: "SSC_CHEM",
      chapterNum: 5,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "নিচের কোন যৌগটিতে আয়নিক বন্ধন বিদ্যমান?",
      textEn: "Which of the following compounds has an ionic bond?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "এনসিটিবি রসায়ন, অধ্যায় ৫: রাসায়নিক বন্ধন",
      teacherTipsBn: "ধাতু + অধাতুর মধ্যে ইলেকট্রন আদান-প্রদানে আয়নিক বন্ধন গঠিত হয়।",
      options: [
        { key: "A", bn: "NaCl (সোডিয়াম ক্লোরাইড)", en: "NaCl", correct: true },
        { key: "B", bn: "CH_4 (মিথেন)", en: "CH4", correct: false },
        { key: "C", bn: "H_2O (পানি)", en: "H2O", correct: false },
        { key: "D", bn: "CO_2 (কার্বন ডাই-অক্সাইড)", en: "CO2", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "ধাতু Na ইলেকট্রন ত্যাগ করে Na^+ এবং অধাতু Cl ইলেকট্রন গ্রহণ করে Cl^- ক্যাটায়ন ও অ্যানায়নে পরিণত হয় এবং স্থির বৈদ্যুতিক আকর্ষণে NaCl আয়নিক বন্ধন গঠন করে।",
      },
      boardCode: "SYL",
      year: 2022,
    },

    // -------------------------------------------------------------------------
    // SSC BIOLOGY
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.SSC,
      subjectCode: "SSC_BIO",
      chapterNum: 3,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      textBn: "মিয়োসিস কোষ বিভাজন জীবের কোন কোষে ঘটে?",
      textEn: "In which cells of an organism does meiosis cell division occur?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "এনসিটিবি জীববিজ্ঞান, নবম-দশম শ্রেণি, অধ্যায় ৩",
      teacherTipsBn: "জনন মাতৃকোষে ক্রোমোজোম সংখ্যা অর্ধেক করার জন্য মিয়োসিস ঘটে।",
      options: [
        { key: "A", bn: "জনন মাতৃকোষে (Germ Mother Cell)", en: "Germ Mother Cell", correct: true },
        { key: "B", bn: "দেহকোষে (Somatic Cell)", en: "Somatic Cell", correct: false },
        { key: "C", bn: "মূলের অগ্রভাগে", en: "Root tip", correct: false },
        { key: "D", bn: "কাণ্ডের অগ্রভাগে", en: "Stem apex", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "যৌন প্রজননক্ষম জীবের জনন মাতৃকোষে মিয়োসিস বিভাজন ঘটে যার ফলে হ্যাপ্লয়েড গ্যামেট তৈরি হয়। দেহকোষে মাইটোসিস ঘটে।",
      },
      boardCode: "MYM",
      year: 2023,
    },

    // -------------------------------------------------------------------------
    // HSC PHYSICS 1ST PAPER
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.HSC,
      subjectCode: "PHY_1",
      chapterNum: 2,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "দুটি ভেক্টর \\vec{A} এবং \\vec{B} পরস্পরের সমান্তরাল হলে নিচের কোনটি সঠিক?",
      textEn: "If two vectors \\vec{A} and \\vec{B} are parallel, which of the following is correct?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "ড. শাহজাহান তপন (উচ্চমাধ্যমিক পদার্থবিজ্ঞান ১ম পত্র, পৃষ্ঠা ৪৫)",
      teacherTipsBn: "সমান্তরাল হলে মধ্যবর্তী কোণ 0° হওয়ায় ক্রস গুণন শূন্য হয়।",
      options: [
        { key: "A", bn: "\\vec{A} \\times \\vec{B} = 0", en: "\\vec{A} \\times \\vec{B} = 0", correct: true },
        { key: "B", bn: "\\vec{A} \\cdot \\vec{B} = 0", en: "\\vec{A} \\cdot \\vec{B} = 0", correct: false },
        { key: "C", bn: "\\vec{A} + \\vec{B} = 0", en: "\\vec{A} + \\vec{B} = 0", correct: false },
        { key: "D", bn: "|\\vec{A}| = |\\vec{B}|", en: "|\\vec{A}| = |\\vec{B}|", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "আমরা জানি |\\vec{A} \\times \\vec{B}| = AB \\sin(\\theta)। যখন ভেক্টর দুটি সমান্তরাল, \\theta = 0^\\circ। যেহেতু \\sin(0^\\circ) = 0, তাই \\vec{A} \\times \\vec{B} = 0।",
      },
      boardCode: "DHA",
      year: 2024,
    },
    {
      category: ExamCategoryType.HSC,
      subjectCode: "PHY_1",
      chapterNum: 4,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      textBn: "রকেটের গতি কোন সংরক্ষণশীল নীতির ওপর ভিত্তি করে পরিচালিত হয়?",
      textEn: "On which conservation law is the motion of a rocket based?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "প্রফেসর ড. গিয়াসউদ্দিন আহমেদ (পদার্থবিজ্ঞান ১ম পত্র)",
      teacherTipsBn: "ভরবেগের নিত্যতা ও নিউটনের ৩য় সূত্র রকেটের গতির মূল নীতি।",
      options: [
        { key: "A", bn: "রৈখিক ভরবেগের নিত্যতা সূত্র (Conservation of Linear Momentum)", en: "Conservation of Linear Momentum", correct: true },
        { key: "B", bn: "শক্তির নিত্যতা সূত্র", en: "Conservation of Energy", correct: false },
        { key: "C", bn: "কৌণিক ভরবেগের সংরক্ষণ সূত্র", en: "Conservation of Angular Momentum", correct: false },
        { key: "D", bn: "ভরের সংরক্ষণশীলতা", en: "Conservation of Mass", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "রকেট থেকে প্রচণ্ড বেগে গ্যাস নির্গত হলে নির্গত গ্যাসের পশ্চাৎমুখী ভরবেগের বিপরীত সমপরিমাণ সম্মুখমুখী ভরবেগ রকেটকে সামনের দিকে ধাবিত করে।",
      },
      boardCode: "RAJ",
      year: 2023,
    },
    {
      category: ExamCategoryType.HSC,
      subjectCode: "PHY_1",
      chapterNum: 6,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.HARD,
      textBn: "ভূ-পৃষ্ঠ থেকে মুক্তিবেগের (Escape Velocity) সমীকরণ নিচের কোনটি?",
      textEn: "Which of the following is the equation for escape velocity from Earth's surface?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "ড. শাহজাহান তপন (পৃষ্ঠা ১৯৫)",
      teacherTipsBn: "v_e = \\sqrt{2gR} = 11.2 km/s মনে রাখুন।",
      options: [
        { key: "A", bn: "v_e = \\sqrt{2gR}", en: "v_e = sqrt(2gR)", correct: true },
        { key: "B", bn: "v_e = \\sqrt{gR}", en: "v_e = sqrt(gR)", correct: false },
        { key: "C", bn: "v_e = 2\\sqrt{gR}", en: "v_e = 2*sqrt(gR)", correct: false },
        { key: "D", bn: "v_e = \\sqrt{\\frac{gR}{2}}", en: "v_e = sqrt(gR/2)", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "মুক্তিবেগের রাশিমালা v_e = \\sqrt{\\frac{2GM}{R}} = \\sqrt{2gR}। পৃথিবীর ক্ষেত্রে এর মান প্রায় ১১.২ কিমি/সেকেন্ড।",
      },
      boardCode: "CTG",
      year: 2022,
    },
    {
      category: ExamCategoryType.HSC,
      subjectCode: "PHY_1",
      chapterNum: 8,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      textBn: "একটি সরল দোলকের কার্যকর দৈর্ঘ্য ৪ গুণ বৃদ্ধি করা হলে এর দোলনকাল (Time Period) কতগুণ হবে?",
      textEn: "If the effective length of a simple pendulum is increased 4 times, how many times will its time period become?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "প্রফেসর ইসহাক (উচ্চমাধ্যমিক পদার্থবিজ্ঞান ১ম পত্র)",
      teacherTipsBn: "T = 2\\pi \\sqrt{L/g} সূত্রে T \\propto \\sqrt{L}।",
      options: [
        { key: "A", bn: "২ গুণ (2 times)", en: "2 times", correct: true },
        { key: "B", bn: "৪ গুণ", en: "4 times", correct: false },
        { key: "C", bn: "১৬ গুণ", en: "16 times", correct: false },
        { key: "D", bn: "অর্ধেক", en: "Half", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "দোলনকাল T \\propto \\sqrt{L}। দৈর্ঘ্য ৪ গুণ (L' = 4L) হলে নতুন দোলনকাল T' \\propto \\sqrt{4L} = 2\\sqrt{L} = 2T, অর্থাৎ দোলনকাল দ্বিগুণ হবে।",
      },
      boardCode: "COM",
      year: 2021,
    },

    // -------------------------------------------------------------------------
    // HSC PHYSICS 2ND PAPER
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.HSC,
      subjectCode: "PHY_2",
      chapterNum: 1,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      textBn: "রূদ্ধতাপীয় প্রক্রিয়ায় (Adiabatic Process) গ্যাসের চাপ P ও তাপমাত্রা T এর মধ্যকার সঠিক সম্পর্ক কোনটি?",
      textEn: "In an adiabatic process, what is the relation between pressure P and temperature T?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "ড. শাহজাহান তপন (পদার্থবিজ্ঞান ২য় পত্র, অধ্যায় ১)",
      teacherTipsBn: "T^\\gamma P^{1-\\gamma} = \\text{ধ্রুবক} সম্পর্ক মুখস্থ রাখুন।",
      options: [
        { key: "A", bn: "T^\\gamma P^{1-\\gamma} = \\text{ধ্রুবক}", en: "T^gamma * P^(1-gamma) = constant", correct: true },
        { key: "B", bn: "PV^\\gamma = \\text{ধ্রুবক নয়}", en: "PV^gamma != const", correct: false },
        { key: "C", bn: "TP = \\text{ধ্রুবক}", en: "TP = constant", correct: false },
        { key: "D", bn: "T^{1-\\gamma} P^\\gamma = \\text{ধ্রুবক}", en: "T^(1-gamma) * P^gamma = constant", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "রূদ্ধতাপীয় পরিবর্তনের ক্ষেত্রে PV^\\gamma = C এবং আদর্শ গ্যাসের সমীকরণ PV = nRT সমন্বয় করলে পাওয়া যায় T^\\gamma P^{1-\\gamma} = \\text{ধ্রুবক}।",
      },
      boardCode: "BAR",
      year: 2024,
    },
    {
      category: ExamCategoryType.HSC,
      subjectCode: "PHY_2",
      chapterNum: 3,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "হুইটস্টোন ব্রিজের চারটি বাহুর রোধ যথাক্রমে P = 6\\ \\Omega, Q = 12\\ \\Omega, R = 15\\ \\Omega হলে সাম্যাবস্থায় ৪র্থ বাহুর রোধ S কত হবে?",
      textEn: "If the resistances in a Wheatstone bridge are P = 6 ohm, Q = 12 ohm, R = 15 ohm, what is S in equilibrium?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "ড. শাহজাহান তপন (পদার্থবিজ্ঞান ২য় পত্র, চল তড়িৎ)",
      teacherTipsBn: "সাম্যাবস্থার নীতি P/Q = R/S ব্যবহার করুন।",
      options: [
        { key: "A", bn: "30 \\Omega", en: "30 ohm", correct: true },
        { key: "B", bn: "20 \\Omega", en: "20 ohm", correct: false },
        { key: "C", bn: "10 \\Omega", en: "10 ohm", correct: false },
        { key: "D", bn: "45 \\Omega", en: "45 ohm", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "হুইটস্টোন ব্রিজের সাম্যাবস্থার নীতি: \\frac{P}{Q} = \\frac{R}{S} \\implies S = \\frac{Q \\times R}{P} = \\frac{12 \\times 15}{6} = 2 \\times 15 = 30\\ \\Omega।",
      },
      boardCode: "JES",
      year: 2023,
    },

    // -------------------------------------------------------------------------
    // HSC CHEMISTRY 1ST PAPER
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.HSC,
      subjectCode: "CHEM_1",
      chapterNum: 2,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      textBn: "d-উপশক্তিস্তরে সর্বোচ্চ ইলেকট্রন ধারণক্ষমতা কতটি?",
      textEn: "What is the maximum electron capacity of the d-subshell?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "হাজারী ও নাগ (উচ্চমাধ্যমিক রসায়ন ১ম পত্র, অধ্যায় ২)",
      teacherTipsBn: "উপশক্তিস্তরে ইলেকট্রন ধারণক্ষমতা = 2(2l + 1)। d এর জন্য l = 2।",
      options: [
        { key: "A", bn: "10টি", en: "10", correct: true },
        { key: "B", bn: "6টি", en: "6", correct: false },
        { key: "C", bn: "14টি", en: "14", correct: false },
        { key: "D", bn: "2টি", en: "2", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "সহকারী কোয়ান্টাম সংখ্যা d অরবিটালের জন্য l = 2। সর্বোচ্চ ইলেকট্রন ধারণক্ষমতা = 2(2l + 1) = 2(2 \\times 2 + 1) = 2(5) = 10টি।",
      },
      boardCode: "DIN",
      year: 2024,
    },
    {
      category: ExamCategoryType.HSC,
      subjectCode: "CHEM_1",
      chapterNum: 4,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "বিশুদ্ধ পানির pH এর মান 25°C তাপমাত্রায় কত?",
      textEn: "What is the pH value of pure water at 25°C?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "হাজারী ও নাগ (রসায়ন ১ম পত্র)",
      teacherTipsBn: "25°C এ পানির আয়নিক গুণফল K_w = 10^-14, তাই নিরপেক্ষ দ্রবণে pH = 7।",
      options: [
        { key: "A", bn: "7.0", en: "7.0", correct: true },
        { key: "B", bn: "0.0", en: "0.0", correct: false },
        { key: "C", bn: "14.0", en: "14.0", correct: false },
        { key: "D", bn: "1.0", en: "1.0", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "২৫ ডিগ্রি সেলসিয়াস তাপমাত্রায় বিশুদ্ধ পানিতে [H^+] = [OH^-] = 10^{-7}\\text{ M}। ফলে \\text{pH} = -\\log(10^{-7}) = 7.0।",
      },
      boardCode: "SYL",
      year: 2023,
    },

    // -------------------------------------------------------------------------
    // HSC CHEMISTRY 2ND PAPER
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.HSC,
      subjectCode: "CHEM_2",
      chapterNum: 2,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      textBn: "বেঞ্জিন বলয়ে -OH মূলক যুক্ত থাকলে তা বলয়কে কোন অবস্থানে সক্রিয় করে?",
      textEn: "When an -OH group is attached to a benzene ring, at which positions does it activate the ring?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "হাজারী ও নাগ (রসায়ন ২য় পত্র, জৈব রসায়ন)",
      teacherTipsBn: "-OH মূলকের নিঃসঙ্গ ইলেকট্রন জোড় রেজোন্যান্সের মাধ্যমে অর্থো ও প্যারা অবস্থানে ইলেকট্রন ঘনত্ব বাড়ায়।",
      options: [
        { key: "A", bn: "অর্থো ও প্যারা নির্দেশক (Ortho-Para Directing)", en: "Ortho-Para Directing", correct: true },
        { key: "B", bn: "মেটা নির্দেশক (Meta Directing)", en: "Meta Directing", correct: false },
        { key: "C", bn: "শুধুমাত্র মেটা অবস্থান", en: "Only Meta", correct: false },
        { key: "D", bn: "বলয়কে নিষ্ক্রিয় করে", en: "Deactivates ring", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "ফেনলের -OH মূলক অর্থো-প্যারা নির্দেশক মূলক। এর রেজোন্যান্স প্রভাবের কারণে অর্থো ও প্যারা অবস্থানে ইলেকট্রন ঘনত্ব বৃদ্ধি পায়।",
      },
      boardCode: "MYM",
      year: 2024,
    },

    // -------------------------------------------------------------------------
    // HSC HIGHER MATH 1ST PAPER
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.HSC,
      subjectCode: "HMATH_1",
      chapterNum: 1,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "একটি 3 \\times 3 ক্রমের ম্যাট্রিক্স A এর জন্য |2A| এর মান |A| এর কতগুণ?",
      textEn: "For a 3x3 matrix A, how many times of |A| is |2A|?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "অক্ষরপত্র উচ্চতর গণিত ১ম পত্র (পৃষ্ঠা ২০)",
      teacherTipsBn: "n \\times n ম্যাট্রিক্সের ক্ষেত্রে |kA| = k^n |A|। এখানে n = 3, তাই 2^3 = 8।",
      options: [
        { key: "A", bn: "8 গুণ (8 times)", en: "8 times", correct: true },
        { key: "B", bn: "2 গুণ", en: "2 times", correct: false },
        { key: "C", bn: "6 গুণ", en: "6 times", correct: false },
        { key: "D", bn: "4 গুণ", en: "4 times", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "নির্ণায়কের ধর্ম অনুসারে, n ক্রমের বর্গ ম্যাট্রিক্স A এর জন্য |kA| = k^n |A|। এখানে k = 2 এবং n = 3, সুতরাং |2A| = 2^3 |A| = 8|A|।",
      },
      boardCode: "DHA",
      year: 2024,
    },
    {
      category: ExamCategoryType.HSC,
      subjectCode: "HMATH_1",
      chapterNum: 9,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      textBn: "\\frac{d}{dx}(\\ln(\\sec x + \\tan x)) এর অন্তরজ নিচের কোনটি?",
      textEn: "What is the derivative of ln(sec x + tan x)?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "এস ইউ আহাম্মদ (উচ্চতর গণিত ১ম পত্র)",
      teacherTipsBn: "চেইন রুল ব্যবহার করলে সরাসরি \\sec x পাওয়া যায়।",
      options: [
        { key: "A", bn: "\\sec x", en: "sec x", correct: true },
        { key: "B", bn: "\\tan x", en: "tan x", correct: false },
        { key: "C", bn: "\\sec^2 x", en: "sec^2 x", correct: false },
        { key: "D", bn: "\\sec x \\tan x", en: "sec x tan x", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "\\frac{d}{dx}(\\ln(\\sec x + \\tan x)) = \\frac{1}{\\sec x + \\tan x} \\cdot (\\sec x \\tan x + \\sec^2 x) = \\frac{\\sec x (\\tan x + \\sec x)}{\\sec x + \\tan x} = \\sec x।",
      },
      boardCode: "RAJ",
      year: 2023,
    },

    // -------------------------------------------------------------------------
    // HSC HIGHER MATH 2ND PAPER
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.HSC,
      subjectCode: "HMATH_2",
      chapterNum: 3,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "কাল্পনিক একক i হলে, i^{2024} এর মান কত?",
      textEn: "If i is the imaginary unit, what is the value of i^2024?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "অক্ষরপত্র উচ্চতর গণিত ২য় পত্র, জটিল সংখ্যা",
      teacherTipsBn: "ঘাতকে ৪ দিয়ে ভাগ করে ভাগশেষ নির্ণয় করুন: 2024 mod 4 = 0, তাই মান i^0 = 1।",
      options: [
        { key: "A", bn: "1", en: "1", correct: true },
        { key: "B", bn: "-1", en: "-1", correct: false },
        { key: "C", bn: "i", en: "i", correct: false },
        { key: "D", bn: "-i", en: "-i", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "যেহেতু ২০২৪ সংখ্যাটি ৪ দ্বারা সম্পূর্ণরূপে নিঃশেষে বিভাজ্য (2024 = 4 \\times 506), তাই i^{2024} = (i^4)^{506} = 1^{506} = 1।",
      },
      boardCode: "CTG",
      year: 2024,
    },

    // -------------------------------------------------------------------------
    // HSC BIOLOGY 1ST PAPER (BOTANY)
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.HSC,
      subjectCode: "BIO_1",
      chapterNum: 1,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "উদ্ভিদ কোষে প্রোটিন সংশ্লেষণের প্রধান স্থান কোনটি?",
      textEn: "Which is the primary site of protein synthesis in plant cells?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "ড. আবুল হাসান (উচ্চমাধ্যমিক জীববিজ্ঞান ১ম পত্র)",
      teacherTipsBn: "রাইবোসোম ট্রান্সলেশন প্রক্রিয়ায় পলিপেপটাইড শৃঙ্খল তৈরি করে।",
      options: [
        { key: "A", bn: "রাইবোসোম (Ribosome)", en: "Ribosome", correct: true },
        { key: "B", bn: "ক্লোরোপ্লাস্ট", en: "Chloroplast", correct: false },
        { key: "C", bn: "মাইটোকন্ড্রিয়া", en: "Mitochondria", correct: false },
        { key: "D", bn: "গলগি বডি", en: "Golgi body", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "রাইবোসোমে mRNA-এর নির্দেশনা অনুযায়ী tRNA ও rRNA-এর সহায়তায় অ্যামাইনো এসিড যুক্ত হয়ে প্রোটিন তৈরি হয়। এজন্য একে কোষের প্রোটিন ফ্যাক্টরি বলা হয়।",
      },
      boardCode: "COM",
      year: 2023,
    },

    // -------------------------------------------------------------------------
    // HSC CREATIVE QUESTION (CQ)
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.HSC,
      subjectCode: "PHY_1",
      chapterNum: 2,
      type: QuestionType.CQ,
      difficulty: DifficultyLevel.HARD,
      textBn: "সৃজনশীল উদ্দীপক: একটি নদীর প্রস্থ 500 m এবং স্রোতের বেগ 3 m/s। একজন সাঁতারুর শান্ত পানিতে সাঁতার কাটার বেগ 5 m/s। তিনি সর্বনিম্ন সময়ে এবং অপর একজন সর্বনিম্ন দূরত্বে নদী পার হওয়ার চেষ্টা করলেন।",
      stemBn: "একটি নদীর প্রস্থ d = 500\\text{ m} এবং স্রোতের বেগ u = 3\\text{ m/s}।\nশান্ত পানিতে সাঁতারু 'ক' এর বেগ v = 5\\text{ m/s}। তিনি আড়াআড়িভাবে সর্বনিম্ন দূরত্বে অপর পাড়ে পৌঁছাতে চান।\nঅপরদিকে সাঁতারু 'খ' সর্বনিম্ন সময়ে নদী পার হওয়ার উদ্দেশ্যে সোজাসুজি পাড়ের সাথে লম্বালম্বিভাবে সাঁতার শুরু করলেন।",
      marks: 10.0,
      textbookRef: "ঢাকা বোর্ড ২০২৩ - পদার্থবিজ্ঞান ১ম পত্র",
      subparts: [
        {
          label: "ক",
          textBn: "নাল ভেক্টর কাকে বলে?",
          marks: 1.0,
          solutionBn: "যে ভেক্টরের মান শূন্য এবং যার কোনো নির্দিষ্ট দিক নেই, তাকে নাল ভেক্টর বা শূন্য ভেক্টর বলে।",
        },
        {
          label: "খ",
          textBn: "দুটি সমমানের ভেক্টরের লব্ধির মান শূন্য হতে পারে কি না ব্যাখ্যা কর।",
          marks: 2.0,
          solutionBn: "হ্যাঁ, পারে। যদি সমমানের দুটি ভেক্টর একই সরলরেখায় পরস্পরের সম্পূর্ণ বিপরীত দিকে (মধ্যবর্তী কোণ ১৮০ ডিগ্রি) ক্রিয়া করে, তবে তাদের লব্ধির মান R = P - P = 0 হবে।",
        },
        {
          label: "গ",
          textBn: "সাঁতারু 'খ' এর নদী পার হতে কত সময় লাগবে নির্ণয় কর।",
          marks: 3.0,
          solutionBn: "সর্বনিম্ন সময়ে পার হতে লম্বালম্বি বরাবর সাঁতার কাটতে হয় (\\alpha = 90^\\circ)। প্রয়োজনীয় সময় t = d / (v \\sin\\alpha) = 500 / (5 \\sin 90^\\circ) = 500 / 5 = 100 সেকেন্ড।",
        },
        {
          label: "ঘ",
          textBn: "সাঁতারু 'ক' এর নদী পারাপারের গতিপথ গাণিতিকভাবে বিশ্লেষণ কর।",
          marks: 4.0,
          solutionBn: "সর্বনিম্ন দূরত্বে (ঠিক বিপরীত বিন্দুতে) পৌঁছাতে লব্ধি বেগকে স্রোতের সাথে ৯০ ডিগ্রিতে থাকতে হবে। \\cos\\alpha = -u/v = -3/5 = -0.6 \\implies \\alpha = \\cos^{-1}(-0.6) = 126.87^\\circ। অর্থাৎ স্রোতের সাথে ১২৬.৮৭ ডিগ্রি কোণে যাত্রা শুরু করতে হবে। লব্ধি বেগ w = \\sqrt{v^2 - u^2} = \\sqrt{5^2 - 3^2} = 4 m/s এবং প্রয়োজনীয় সময় t' = 500 / 4 = 125 সেকেন্ড।",
        },
      ],
      boardCode: "DHA",
      year: 2023,
    },

    // -------------------------------------------------------------------------
    // MEDICAL ADMISSION (BIOLOGY, CHEMISTRY, GK)
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.MEDICAL,
      subjectCode: "MED_BIO",
      chapterNum: 1,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      textBn: "মানবদেহের স্বাভাবিক রক্তের pH এর মান কত?",
      textEn: "What is the normal pH of human blood?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "মেডিকেল ভর্তি পরীক্ষা ২০২৩-২৪ ও গাজী আজমল",
      teacherTipsBn: "রক্তের স্বাভাবিক pH পরিসীমা ৭.৩৫ - ৭.৪৫ এবং গড় মান ৭.৪।",
      options: [
        { key: "A", bn: "7.35 - 7.45 (গড় 7.4)", en: "7.35 - 7.45 (avg 7.4)", correct: true },
        { key: "B", bn: "6.50 - 6.80", en: "6.50 - 6.80", correct: false },
        { key: "C", bn: "7.80 - 8.20", en: "7.80 - 8.20", correct: false },
        { key: "D", bn: "5.50 - 6.00", en: "5.50 - 6.00", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "মানবদেহের ধমনীর রক্তের স্বাভাবিক pH সামান্য ক্ষারীয়, যার মান ৭.৩৫ হতে ৭.৪৫ এর মধ্যে সীমাবদ্ধ থাকে। pH ৭.০ এর নিচে নামলে অ্যাসিডোসিস এবং ৭.৮ এর উপরে উঠলে অ্যালকালসিস হয়।",
      },
      year: 2024,
    },
    {
      category: ExamCategoryType.MEDICAL,
      subjectCode: "MED_BIO",
      chapterNum: 3,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "রক্তের সার্বজনীন গ্রহীতা (Universal Recipient) কোন ব্লাড গ্রুপকে বলা হয়?",
      textEn: "Which blood group is known as the Universal Recipient?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "মেডিকেল ভর্তি পরীক্ষা ২০২২-২৩",
      teacherTipsBn: "AB+ রক্তে কোনো অ্যান্টিবডি থাকে না বলে এটি সবার রক্ত গ্রহণ করতে পারে। O- হলো সার্বজনীন দাতা।",
      options: [
        { key: "A", bn: "AB পজিটিভ (AB+)", en: "AB Positive", correct: true },
        { key: "B", bn: "O নেগেটিভ (O-)", en: "O Negative", correct: false },
        { key: "C", bn: "A পজিটিভ (A+)", en: "A Positive", correct: false },
        { key: "D", bn: "B পজিটিভ (B+)", en: "B Positive", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "AB ব্লাড গ্রুপের রক্তরসে কোনো অ্যান্টি-A বা অ্যান্টি-B অ্যান্টিবডি থাকে না এবং Rh পজিটিভ হওয়ায় এটি যে কোনো গ্রুপের রক্ত গ্রহণ করতে পারে।",
      },
      year: 2023,
    },
    {
      category: ExamCategoryType.MEDICAL,
      subjectCode: "MED_GK",
      chapterNum: 1,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "১৯৭১ সালের মহান মুক্তিযুদ্ধে সমগ্র বাংলাদেশকে কয়টি প্রশাসনিক সেক্টরে বিভক্ত করা হয়েছিল?",
      textEn: "Into how many sectors was Bangladesh divided during the 1971 Liberation War?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "মেডিকেল ভর্তি পরীক্ষা ২০২১-২২ (সাধারণ জ্ঞান)",
      teacherTipsBn: "১১টি সেক্টর এবং ৬৪টি সাব-সেক্টরে বিভক্ত ছিল। ১০ নম্বর সেক্টর ছিল নৌ সেক্টর (নিয়মিত কোনো কমান্ডার ছিল না)।",
      options: [
        { key: "A", bn: "১১টি সেক্টরে", en: "11 sectors", correct: true },
        { key: "B", bn: "১০টি সেক্টরে", en: "10 sectors", correct: false },
        { key: "C", bn: "১২টি সেক্টরে", en: "12 sectors", correct: false },
        { key: "D", bn: "১৪টি সেক্টরে", en: "14 sectors", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "১৯৭১ সালের জুলাই মাসে মুক্তিবাহিনীর সেক্টর কমান্ডারদের সম্মেলনে মুক্তিযুদ্ধ পরিচালনার সুবিধার্থে সারা দেশকে ১১টি সেক্টর ও ৬৪টি সাব-সেক্টরে ভাগ করা হয়।",
      },
      year: 2022,
    },

    // -------------------------------------------------------------------------
    // UNIVERSITY ADMISSION (DU 'KA' & GST SCIENCE)
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.UNIVERSITY,
      subjectCode: "DU_KA",
      chapterNum: 1,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.HARD,
      textBn: "একটি সরল দোলককে চাঁদে নিয়ে গেলে এর দোলনকাল পৃথিবীর দোলনকালের কতগুণ হবে? (চাঁদের অভিকর্ষজ ত্বরণ পৃথিবীর \\frac{1}{6} গুণ)",
      textEn: "If a simple pendulum is taken to the Moon, its time period will be how many times that on Earth? (g_moon = g/6)",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "ঢাকা বিশ্ববিদ্যালয় 'ক' ইউনিট ২০২১-২২ ভর্তি পরীক্ষা",
      teacherTipsBn: "T \\propto \\frac{1}{\\sqrt{g}} সম্পর্ক ব্যবহার করুন।",
      options: [
        { key: "A", bn: "\\sqrt{6} গুণ", en: "sqrt(6) times", correct: true },
        { key: "B", bn: "6 গুণ", en: "6 times", correct: false },
        { key: "C", bn: "\\frac{1}{\\sqrt{6}} গুণ", en: "1/sqrt(6) times", correct: false },
        { key: "D", bn: "36 গুণ", en: "36 times", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "দোলনকাল T = 2\\pi\\sqrt{\\frac{L}{g}} \\implies T \\propto \\frac{1}{\\sqrt{g}}। চাঁদে g_m = \\frac{g}{6} হলে T_m = T \\sqrt{\\frac{g}{g_m}} = T \\sqrt{6} = \\sqrt{6} T।",
      },
      year: 2022,
    },
    {
      category: ExamCategoryType.UNIVERSITY,
      subjectCode: "DU_KA",
      chapterNum: 2,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.HARD,
      textBn: "\\lim_{x \\to 0} \\frac{e^x - 1}{x} এর মান কত?",
      textEn: "What is the value of lim_{x -> 0} (e^x - 1) / x?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "ঢাকা বিশ্ববিদ্যালয় 'ক' ইউনিট ২০২০-২১ ভর্তি পরীক্ষা",
      teacherTipsBn: "L'Hopital's rule প্রয়োগ করলে লব ও হরকে অন্তরীকরণ করে সরাসরি 1 পাওয়া যায়।",
      options: [
        { key: "A", bn: "1", en: "1", correct: true },
        { key: "B", bn: "0", en: "0", correct: false },
        { key: "C", bn: "e", en: "e", correct: false },
        { key: "D", bn: "\\infty (অসীম)", en: "Infinity", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "L'Hopital এর নিয়ম অনুসারে: \\lim_{x \\to 0} \\frac{\\frac{d}{dx}(e^x - 1)}{\\frac{d}{dx}(x)} = \\lim_{x \\to 0} \\frac{e^x}{1} = e^0 = 1।",
      },
      year: 2021,
    },
    {
      category: ExamCategoryType.UNIVERSITY,
      subjectCode: "GST_A",
      chapterNum: 1,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      textBn: "একটি বস্তুর ভর 2 kg এবং গতিশক্তি 100 J হলে এর রৈখিক ভরবেগ (Linear Momentum) কত?",
      textEn: "If an object has mass 2 kg and kinetic energy 100 J, what is its linear momentum?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "গুচ্ছ 'এ' ইউনিট ২০২৩ ভর্তি পরীক্ষা",
      teacherTipsBn: "E_k = p^2 / (2m) \\implies p = \\sqrt{2m E_k}।",
      options: [
        { key: "A", bn: "20 kg m/s", en: "20 kg m/s", correct: true },
        { key: "B", bn: "10 kg m/s", en: "10 kg m/s", correct: false },
        { key: "C", bn: "40 kg m/s", en: "40 kg m/s", correct: false },
        { key: "D", bn: "200 kg m/s", en: "200 kg m/s", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "ভরবেগ p = \\sqrt{2m E_k} = \\sqrt{2 \\times 2 \\times 100} = \\sqrt{400} = 20\\text{ kg m/s}।",
      },
      year: 2023,
    },

    // -------------------------------------------------------------------------
    // MADRASAH BOARD (MAD) - DAKHIL & ALIM
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.SSC,
      subjectCode: "SSC_MATH",
      chapterNum: 1,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "সকল মূলদ ও অমূলদ সংখ্যার সেটকে কোন সংখ্যা সেট বলা হয়?",
      textEn: "The set of all rational and irrational numbers is called which number set?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "দাখিল সাধারণ গণিত (মাদ্রাসা শিক্ষা বোর্ড)",
      teacherTipsBn: "বাস্তব সংখ্যা \\mathbb{R} = \\mathbb{Q} \\cup \\mathbb{Q}'।",
      options: [
        { key: "A", bn: "বাস্তব সংখ্যা (Real Numbers)", en: "Real Numbers", correct: true },
        { key: "B", bn: "পূর্ণসংখ্যা (Integers)", en: "Integers", correct: false },
        { key: "C", bn: "স্বাভাবিক সংখ্যা (Natural Numbers)", en: "Natural Numbers", correct: false },
        { key: "D", bn: "জটিল সংখ্যা (Complex Numbers)", en: "Complex Numbers", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "সকল মূলদ সংখ্যা ও অমূলদ সংখ্যা নিয়ে যে সংখ্যা সেট গঠিত হয় তাকে বাস্তব সংখ্যা সেট (\\mathbb{R}) বলা হয়।",
      },
      boardCode: "MAD",
      year: 2023,
    },
    {
      category: ExamCategoryType.HSC,
      subjectCode: "PHY_1",
      chapterNum: 2,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "দুটি সমমানের ভেক্টরের লব্ধি এদের যেকোনো একটির সমান হলে মধ্যবর্তী কোণ কত?",
      textEn: "If the resultant of two equal vectors equals either of them, what is the angle between them?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "আলিম পদার্থবিজ্ঞান ১ম পত্র (মাদ্রাসা শিক্ষা বোর্ড)",
      teacherTipsBn: "P = Q = R হলে \\cos\\alpha = -1/2 \\implies \\alpha = 120^\\circ।",
      options: [
        { key: "A", bn: "120^\\circ", en: "120 degrees", correct: true },
        { key: "B", bn: "60^\\circ", en: "60 degrees", correct: false },
        { key: "C", bn: "90^\\circ", en: "90 degrees", correct: false },
        { key: "D", bn: "180^\\circ", en: "180 degrees", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "লব্ধির সূত্র: R^2 = P^2 + Q^2 + 2PQ\\cos\\alpha। এখানে P = Q = R বসালে \\cos\\alpha = -\\frac{1}{2} \\implies \\alpha = 120^\\circ।",
      },
      boardCode: "MAD",
      year: 2022,
    },

    // -------------------------------------------------------------------------
    // TECHNICAL BOARD (TEC)
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.SSC,
      subjectCode: "SSC_PHY",
      chapterNum: 11,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "ওহমের সূত্রানুসারে নির্দিষ্ট তাপমাত্রায় কোনো পরিবাহীর মধ্য দিয়ে প্রবাহিত তড়িৎপ্রবাহ (I) এর দুই প্রান্তের বিভব পার্থক্যের (V) সাথে কীভাবে সম্পর্কিত?",
      textEn: "According to Ohm's law, how is current (I) related to potential difference (V)?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "কারিগরি শিক্ষা বোর্ড, এসএসসি ভোকেশনাল পদার্থবিজ্ঞান",
      teacherTipsBn: "I \\propto V বা V = IR।",
      options: [
        { key: "A", bn: "তড়িৎপ্রবাহ বিভব পার্থক্যের সমানুপাতিক (I \\propto V)", en: "Current is proportional to Voltage", correct: true },
        { key: "B", bn: "তড়িৎপ্রবাহ বিভব পার্থক্যের ব্যস্তানুপাতিক", en: "Current is inversely proportional", correct: false },
        { key: "C", bn: "তড়িৎপ্রবাহ বিভব পার্থক্যের বর্গের সমানুপাতিক", en: "Current proportional to V^2", correct: false },
        { key: "D", bn: "কোনো সম্পর্ক নেই", en: "No relation", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "তাপমাত্রা স্থির থাকলে কোনো পরিবাহীর মধ্য দিয়ে প্রবাহিত তড়িৎপ্রবাহ পরিবাহীর দুই প্রান্তের বিভব পার্থক্যের সমানুপাতিক (I \\propto V বা V = IR)।",
      },
      boardCode: "TEC",
      year: 2023,
    },
    {
      category: ExamCategoryType.HSC,
      subjectCode: "HSC_ICT",
      chapterNum: 3,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "বাইনারি সংখ্যা (1011)_2 এর সমতুল্য দশমিক (Decimal) মান কত?",
      textEn: "What is the equivalent decimal value of binary (1011)_2?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "এইচএসসি ও ডিপ্লোমা আইসিটি (কারিগরি ও সাধারণ বোর্ড)",
      teacherTipsBn: "1 \\times 8 + 0 \\times 4 + 1 \\times 2 + 1 \\times 1 = 8 + 2 + 1 = 11।",
      options: [
        { key: "A", bn: "11", en: "11", correct: true },
        { key: "B", bn: "13", en: "13", correct: false },
        { key: "C", bn: "9", en: "9", correct: false },
        { key: "D", bn: "15", en: "15", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "(1011)_2 = 1 \\times 2^3 + 0 \\times 2^2 + 1 \\times 2^1 + 1 \\times 2^0 = 8 + 0 + 2 + 1 = 11।",
      },
      boardCode: "TEC",
      year: 2024,
    },

    // -------------------------------------------------------------------------
    // PAST BOARD QUESTIONS (2020, 2019, 2018) ACROSS ALL BOARDS
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.HSC,
      subjectCode: "PHY_1",
      chapterNum: 5,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "কাজের মান কখন শূন্য (Zero Work) হয়?",
      textEn: "When is the work done equal to zero?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "ঢাকা বোর্ড ২০২০ - পদার্থবিজ্ঞান ১ম পত্র",
      teacherTipsBn: "W = F s \\cos\\theta; \\theta = 90^\\circ হলে \\cos 90^\\circ = 0।",
      options: [
        { key: "A", bn: "প্রযুক্ত বল ও সরণের মধ্যবর্তী কোণ 90° হলে", en: "When angle between force and displacement is 90 deg", correct: true },
        { key: "B", bn: "প্রযুক্ত বল ও সরণ একই দিকে হলে", en: "When force and displacement are in same direction", correct: false },
        { key: "C", bn: "কোণ 0° হলে", en: "When angle is 0 deg", correct: false },
        { key: "D", bn: "কোণ 180° হলে", en: "When angle is 180 deg", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "কৃতকাজ W = F s \\cos\\theta। বল ও সরণ পরস্পর লম্ব (\\theta = 90^\\circ) হলে \\cos 90^\\circ = 0, ফলে কোনো কাজ সম্পাদিত হয় না।",
      },
      boardCode: "DHA",
      year: 2020,
    },
    {
      category: ExamCategoryType.HSC,
      subjectCode: "CHEM_1",
      chapterNum: 2,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      textBn: "হুন্ডের নিয়ম (Hund's Rule) নিচের কোন অরবিটালের ক্ষেত্রে প্রযোজ্য নয়?",
      textEn: "To which orbital is Hund's rule not applicable?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "কুমিল্লা বোর্ড ২০১৯ - রসায়ন ১ম পত্র",
      teacherTipsBn: "হুন্ডের নিয়ম সমশক্তিসম্পন্ন ডিজেনারেট অরবিটালের (p, d, f) জন্য প্রযোজ্য। s-এ মাত্র ১টি অরবিটাল থাকে।",
      options: [
        { key: "A", bn: "s-অরবিটাল", en: "s-orbital", correct: true },
        { key: "B", bn: "p-অরবিটাল", en: "p-orbital", correct: false },
        { key: "C", bn: "d-অরবিটাল", en: "d-orbital", correct: false },
        { key: "D", bn: "f-অরবিটাল", en: "f-orbital", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "s-উপশক্তিস্তরে মাত্র ১টি অরবিটাল বিদ্যমান থাকায় এতে সমশক্তিসম্পন্ন একাধিক অরবিটাল নেই। ফলে হুন্ডের নিয়ম s-অরবিটালের জন্য প্রযোজ্য নয়।",
      },
      boardCode: "COM",
      year: 2019,
    },
    {
      category: ExamCategoryType.HSC,
      subjectCode: "HMATH_1",
      chapterNum: 3,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "3x + 4y - 12 = 0 সরলরেখাটির ঢাল (Slope) কত?",
      textEn: "What is the slope of the straight line 3x + 4y - 12 = 0?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "যশোর বোর্ড ২০১৮ - উচ্চতর গণিত ১ম পত্র",
      teacherTipsBn: "ax + by + c = 0 রেখার ঢাল m = -a/b = -3/4।",
      options: [
        { key: "A", bn: "-\\frac{3}{4}", en: "-3/4", correct: true },
        { key: "B", bn: "\\frac{3}{4}", en: "3/4", correct: false },
        { key: "C", bn: "-\\frac{4}{3}", en: "-4/3", correct: false },
        { key: "D", bn: "3", en: "3", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "সমীকরণটিকে y = mx + c আকারে সাজালে: 4y = -3x + 12 \\implies y = -\\frac{3}{4}x + 3। সুতরাং ঢাল m = -\\frac{3}{4}।",
      },
      boardCode: "JES",
      year: 2018,
    },
    {
      category: ExamCategoryType.SSC,
      subjectCode: "SSC_MATH",
      chapterNum: 2,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "A = {1, 2, 3} হলে সেট A এর উপসেটের সংখ্যা (Number of Subsets) কত?",
      textEn: "If A = {1, 2, 3}, what is the number of subsets of set A?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "দিনাজপুর বোর্ড ২০২০ - সাধারণ গণিত",
      teacherTipsBn: "উপসেট সংখ্যা = 2^n = 2^3 = 8।",
      options: [
        { key: "A", bn: "8টি", en: "8", correct: true },
        { key: "B", bn: "6টি", en: "6", correct: false },
        { key: "C", bn: "7টি", en: "7", correct: false },
        { key: "D", bn: "3টি", en: "3", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "যেকোনো সেটের উপাদান সংখ্যা n হলে তার উপসেট সংখ্যা 2^n। এখানে n = 3, সুতরাং উপসেট সংখ্যা 2^3 = 8টি (প্রকৃত উপসেট 7টি)।",
      },
      boardCode: "DIN",
      year: 2020,
    },
    {
      category: ExamCategoryType.SSC,
      subjectCode: "SSC_PHY",
      chapterNum: 8,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "সমতল দর্পণে গঠিত প্রতিবিম্বের বৈশিষ্ট্য কোনটি?",
      textEn: "Which of the following is a characteristic of an image formed by a plane mirror?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "বরিশাল বোর্ড ২০১৯ - পদার্থবিজ্ঞান",
      teacherTipsBn: "সমতল দর্পণে অবাস্তব, সোজা ও বস্তুর সমান আকারের প্রতিবিম্ব গঠিত হয়।",
      options: [
        { key: "A", bn: "অবাস্তব, সোজা ও লক্ষ্যবস্তুর সমান", en: "Virtual, upright and same size", correct: true },
        { key: "B", bn: "বাস্তব ও উল্টো", en: "Real and inverted", correct: false },
        { key: "C", bn: "বাস্তব ও খর্বিত", en: "Real and diminished", correct: false },
        { key: "D", bn: "অবাস্তব ও বিবর্ধিত", en: "Virtual and magnified", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "সমতল দর্পণে প্রতিফলনের পর আলোকরশ্মিগুলো প্রকৃতপক্ষে মিলিত হয় না, ফলে গঠিত প্রতিবিম্ব অবাস্তব, সোজা এবং দর্পণ থেকে লক্ষ্যবস্তুর দূরত্ব ও প্রতিবিম্বের দূরত্ব সমান হয়।",
      },
      boardCode: "BAR",
      year: 2019,
    },
    {
      category: ExamCategoryType.SSC,
      subjectCode: "SSC_CHEM",
      chapterNum: 3,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      textBn: "ক্লোরিনের আইসোটোপ Cl-35 ও Cl-37 এর প্রকৃতির প্রাচুর্যের শতকরা অনুপাত কত?",
      textEn: "What is the natural percentage abundance ratio of chlorine isotopes Cl-35 and Cl-37?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "সিলেট বোর্ড ২০১৮ - রসায়ন",
      teacherTipsBn: "Cl-35 থাকে 75% এবং Cl-37 থাকে 25% (অনুপাত ৩:১)।",
      options: [
        { key: "A", bn: "75% ও 25% (3 : 1)", en: "75% and 25%", correct: true },
        { key: "B", bn: "50% ও 50%", en: "50% and 50%", correct: false },
        { key: "C", bn: "80% ও 20%", en: "80% and 20%", correct: false },
        { key: "D", bn: "90% ও 10%", en: "90% and 10%", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "প্রকৃতিতে প্রাপ্ত ক্লোরিনে Cl-35 আইসোটোপ ৭৫% এবং Cl-37 আইসোটোপ ২৫% পাওয়া যায়। ফলে গড় পারমাণবিক ভর = (35*75 + 37*25)/100 = 35.5 amu।",
      },
      boardCode: "SYL",
      year: 2018,
    },
    {
      category: ExamCategoryType.HSC,
      subjectCode: "BIO_2",
      chapterNum: 4,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      textBn: "হৃদপিণ্ডের কোন প্রকোষ্ঠ থেকে ফুসফুসীয় ধমনী (Pulmonary Artery) উৎপত্তি লাভ করে?",
      textEn: "From which chamber of the heart does the pulmonary artery originate?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "ময়মনসিংহ বোর্ড ২০২০ - জীববিজ্ঞান ২য় পত্র",
      teacherTipsBn: "ডান নিলয় থেকে ডিঅক্সিজেনেটেড রক্ত ফুসফুসে পাঠায় ফুসফুসীয় ধমনী।",
      options: [
        { key: "A", bn: "ডান নিলয় (Right Ventricle)", en: "Right Ventricle", correct: true },
        { key: "B", bn: "বাম নিলয় (Left Ventricle)", en: "Left Ventricle", correct: false },
        { key: "C", bn: "ডান অলিন্দ (Right Atrium)", en: "Right Atrium", correct: false },
        { key: "D", bn: "বাম অলিন্দ (Left Atrium)", en: "Left Atrium", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "ডান নিলয় থেকে ফুসফুসীয় ধমনী উৎপত্তিলাভ করে অক্সিজেনবিহীন রক্ত বিশুদ্ধকরণের জন্য ফুসফুসে নিয়ে যায়। বাম নিলয় থেকে মহাধমনী উৎপন্ন হয়।",
      },
      boardCode: "MYM",
      year: 2020,
    },

    // -------------------------------------------------------------------------
    // ADDITIONAL MEDICAL ADMISSION QUESTIONS
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.MEDICAL,
      subjectCode: "MED_CHEM",
      chapterNum: 1,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      textBn: "রক্তের বাফার প্রক্রিয়ায় প্রধান বাফার সিস্টেম নিচের কোনটি?",
      textEn: "Which of the following is the primary buffer system in human blood?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "মেডিকেল ভর্তি পরীক্ষা ২০২০-২১ ও হাজারী নাগ",
      teacherTipsBn: "বাইকার্বোনেট বাফার (H2CO3 / NaHCO3) রক্তের সবচেয়ে শক্তিশালী বাফার।",
      options: [
        { key: "A", bn: "কার্বনিক অ্যাসিড - বাইকার্বোনেট বাফার (H_2CO_3 / HCO_3^-)", en: "Carbonic Acid - Bicarbonate Buffer", correct: true },
        { key: "B", bn: "ফসফেট বাফার", en: "Phosphate buffer", correct: false },
        { key: "C", bn: "প্রোটিন বাফার", en: "Protein buffer", correct: false },
        { key: "D", bn: "হিমোগ্লোবিন বাফার", en: "Hemoglobin buffer", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "মানব রক্তের প্লাজমায় কার্বনিক অ্যাসিড ও বাইকার্বোনেট আয়নের অনুপাত ২০:১ বজায় রেখে রক্তের pH ৭.৪ এ নিয়ন্ত্রিত থাকে। এটি রক্তরসের প্রধান বাফার।",
      },
      year: 2020,
    },
    {
      category: ExamCategoryType.MEDICAL,
      subjectCode: "MED_BIO",
      chapterNum: 4,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.HARD,
      textBn: "মেন্ডেলের প্রথম সূত্রের ফিনোটাইপিক অনুপাত কোনটি?",
      textEn: "What is the phenotypic ratio of Mendel's first law (Monohybrid Cross)?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "মেডিকেল ভর্তি পরীক্ষা ২০১৯-২০",
      teacherTipsBn: "প্রথম সূত্র (পৃথকীকরণ সূত্র) = ৩:১। দ্বিতীয় সূত্র (স্বাধীনভাবে মিলনের সূত্র) = ৯:৩:৩:১।",
      options: [
        { key: "A", bn: "3 : 1", en: "3 : 1", correct: true },
        { key: "B", bn: "9 : 3 : 3 : 1", en: "9 : 3 : 3 : 1", correct: false },
        { key: "C", bn: "1 : 2 : 1", en: "1 : 2 : 1", correct: false },
        { key: "D", bn: "13 : 3", en: "13 : 3", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "একজোড়া বিপরীত বৈশিষ্ট্যের ক্রস বা একসংকর ক্রসে F_2 জনুতে ৩টি প্রকট ও ১টি প্রচ্ছন্ন বৈশিষ্ট্যের ফিনোটাইপ পাওয়া যায়, যার অনুপাত ৩:১ (জিনোটাইপিক অনুপাত ১:২:১)।",
      },
      year: 2019,
    },

    // -------------------------------------------------------------------------
    // ADDITIONAL UNIVERSITY ADMISSION QUESTIONS (BUET / DU / GST)
    // -------------------------------------------------------------------------
    {
      category: ExamCategoryType.UNIVERSITY,
      subjectCode: "DU_KA",
      chapterNum: 3,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.HARD,
      textBn: "নিচের কোন অণুর জ্যামিতিক আকৃতি ত্রিকোণাকার পিরামিডীয় (Trigonal Pyramidal)?",
      textEn: "Which of the following molecules has a trigonal pyramidal shape?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "ঢাকা বিশ্ববিদ্যালয় 'ক' ইউনিট ২০১৯-২০",
      teacherTipsBn: "NH3 তে ৩টি বন্ড পেয়ার ও ১টি লোন পেয়ার থাকে (sp^3 সংকরায়ন)।",
      options: [
        { key: "A", bn: "NH_3 (অ্যামোনিয়া)", en: "NH3", correct: true },
        { key: "B", bn: "CH_4 (মিথেন)", en: "CH4", correct: false },
        { key: "C", bn: "BF_3 (বোরন ট্রাইফ্লোরাইড)", en: "BF3", correct: false },
        { key: "D", bn: "H_2O (পানি)", en: "H2O", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "অ্যামোনিয়ায় নাইট্রোজেনের sp^3 সংকরায়ন ঘটে। ৪টি সংকর অরবিটালের ১টিতে নিঃসঙ্গ ইলেকট্রন জোড় থাকায় বিকর্ষণের কারণে চতুস্তলকীয় না হয়ে ত্রিকোণাকার পিরামিডীয় আকৃতি ধারণ করে।",
      },
      year: 2019,
    },
    {
      category: ExamCategoryType.UNIVERSITY,
      subjectCode: "DU_KA",
      chapterNum: 2,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.HARD,
      textBn: "\\int_0^{\\pi/2} \\sin^2 x dx এর মান কত?",
      textEn: "What is the value of int_0^(pi/2) sin^2(x) dx?",
      marks: 1.0,
      negativeMarks: 0.25,
      textbookRef: "ঢাকা বিশ্ববিদ্যালয় 'ক' ইউনিট ২০১৮-১৯ ভর্তি পরীক্ষা",
      teacherTipsBn: "\\sin^2 x = \\frac{1 - \\cos 2x}{2} রূপান্তর করে সমাকলন করুন।",
      options: [
        { key: "A", bn: "\\frac{\\pi}{4}", en: "pi/4", correct: true },
        { key: "B", bn: "\\frac{\\pi}{2}", en: "pi/2", correct: false },
        { key: "C", bn: "1", en: "1", correct: false },
        { key: "D", bn: "\\frac{\\pi}{8}", en: "pi/8", correct: false },
      ],
      answer: {
        correctKey: "A",
        explanationBn: "\\int_0^{\\pi/2} \\frac{1 - \\cos 2x}{2} dx = \\frac{1}{2} \\left[ x - \\frac{\\sin 2x}{2} \\right]_0^{\\pi/2} = \\frac{1}{2} \\left( \\frac{\\pi}{2} - 0 \\right) = \\frac{\\pi}{4}।",
      },
      year: 2018,
    },
  ];

  let insertedCount = 0;
  for (const q of authenticQuestions) {
    const subject = subjectRecordMap.get(q.subjectCode);
    const chapter = chapterRecordMap.get(`${q.subjectCode}::${q.chapterNum}`);

    if (!subject || !chapter) {
      console.warn(`Skipping question: subject or chapter not found for ${q.subjectCode} ch ${q.chapterNum}`);
      continue;
    }

    // Check if question already exists by matching text
    const existing = await prisma.question.findFirst({
      where: {
        subjectId: subject.id,
        questionTextBn: q.textBn,
      },
    });

    if (existing) {
      continue;
    }

    const created = await prisma.question.create({
      data: {
        category: q.category,
        subjectId: subject.id,
        chapterId: chapter.id,
        paperId: chapter.paperId || null,
        type: q.type,
        difficulty: q.difficulty,
        status: ContentStatus.PUBLISHED,
        questionTextBn: q.textBn,
        questionTextEn: q.textEn || null,
        stemBn: q.stemBn || null,
        marks: q.marks,
        negativeMarks: q.negativeMarks || 0.25,
        textbookRef: q.textbookRef || null,
        teacherTipsBn: q.teacherTipsBn || null,
        authorId: admin.id,
        ...(q.options
          ? {
              options: {
                create: q.options.map((opt, idx) => ({
                  optionKey: opt.key,
                  textBn: opt.bn,
                  textEn: opt.en || null,
                  isCorrect: opt.correct,
                  orderIndex: idx + 1,
                })),
              },
            }
          : {}),
        ...(q.subparts
          ? {
              subparts: {
                create: q.subparts.map((sp, idx) => ({
                  partLabel: sp.label,
                  questionTextBn: sp.textBn,
                  marks: sp.marks,
                  solutionBn: sp.solutionBn,
                  orderIndex: idx + 1,
                })),
              },
            }
          : {}),
        ...(q.answer
          ? {
              answer: {
                create: {
                  correctKey: q.answer.correctKey,
                  explanationBn: q.answer.explanationBn,
                },
              },
            }
          : {}),
      },
    });

    // Add board / year reference
    if (q.boardCode) {
      const bId = boardMap.get(q.boardCode);
      if (bId) {
        await prisma.questionReference.create({
          data: {
            questionId: created.id,
            boardId: bId,
            examYear: q.year,
            examSessionName: `${q.boardCode} Board ${q.year}`,
          },
        });
      }
    } else if (q.year) {
      await prisma.questionReference.create({
        data: {
          questionId: created.id,
          universityId: q.category === ExamCategoryType.UNIVERSITY ? du?.id : null,
          examYear: q.year,
          examSessionName: `${q.category} Admission ${q.year}`,
        },
      });
    }

    insertedCount++;
  }

  console.log(`✓ Inserted ${insertedCount} authentic board and admission questions.`);

  // 5. Verify total active question bank metrics
  console.log("[5/5] Auditing question bank metrics...");
  const totalQuestions = await prisma.question.count();
  const catCounts = await prisma.question.groupBy({
    by: ["category"],
    _count: true,
  });

  console.log("----------------------------------------------------------");
  console.log(`🎉 Total Questions Available: ${totalQuestions}`);
  console.log("By Category:", catCounts);
  console.log("==========================================================");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
