import { PrismaClient, UserRoleType, ExamCategoryType, QuestionType, DifficultyLevel, ContentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting verified database seeding for EduBD Platform...");

  // 1. Roles
  const roles = Object.values(UserRoleType);
  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        description: `Platform role for ${roleName}`,
      },
    });
  }
  console.log("✓ Roles initialized");

  // 2. Default Admin and Test Student
  const adminPasswordHash = await bcrypt.hash("Admin@123456", 10);
  const studentPasswordHash = await bcrypt.hash("Student@123456", 10);

  const adminRole = await prisma.role.findUnique({ where: { name: UserRoleType.ADMIN } });
  const superAdminRole = await prisma.role.findUnique({ where: { name: UserRoleType.SUPER_ADMIN } });
  const studentRole = await prisma.role.findUnique({ where: { name: UserRoleType.STUDENT } });

  const admin = await prisma.user.upsert({
    where: { email: "admin@edubd.ac" },
    update: {},
    create: {
      email: "admin@edubd.ac",
      fullName: "System Administrator",
      fullNameBn: "সিস্টেম অ্যাডমিনিস্ট্রেটর",
      passwordHash: adminPasswordHash,
      isVerified: true,
      preferredLang: "bn",
      profile: {
        create: {
          institutionName: "EduBD Headquarters, Dhaka",
        },
      },
      userRoles: {
        create: [
          { roleId: adminRole.id },
          { roleId: superAdminRole.id },
        ],
      },
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@edubd.ac" },
    update: {},
    create: {
      email: "student@edubd.ac",
      fullName: "Tanvir Ahmed",
      fullNameBn: "তানভীর আহমেদ",
      passwordHash: studentPasswordHash,
      isVerified: true,
      preferredLang: "bn",
      profile: {
        create: {
          targetCategory: ExamCategoryType.HSC,
          institutionName: "Dhaka College",
          hscYear: 2026,
        },
      },
      userRoles: {
        create: [{ roleId: studentRole.id }],
      },
      preferences: {
        create: {
          examCategory: ExamCategoryType.HSC,
        },
      },
      studyStreaks: {
        create: {
          currentStreak: 3,
          longestStreak: 5,
        },
      },
    },
  });
  console.log("✓ Default accounts created: admin@edubd.ac, student@edubd.ac");

  // 2.5 Academic Classes (SSC & HSC)
  const classData = [
    { code: "CLASS_9", nameEn: "Class 9", nameBn: "নবম শ্রেণি", orderIndex: 9 },
    { code: "CLASS_10", nameEn: "Class 10", nameBn: "দশম শ্রেণি", orderIndex: 10 },
    { code: "CLASS_11", nameEn: "Class 11", nameBn: "একাদশ শ্রেণি", orderIndex: 11 },
    { code: "CLASS_12", nameEn: "Class 12", nameBn: "দ্বাদশ শ্রেণি", orderIndex: 12 },
  ];

  for (const c of classData) {
    await prisma.academicClass.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }
  console.log("✓ Academic classes (SSC & HSC) seeded");

  // 3. Examination Boards
  const boardsData = [
    { code: "DHA", nameEn: "Dhaka Board", nameBn: "ঢাকা শিক্ষা বোর্ড" },
    { code: "RAJ", nameEn: "Rajshahi Board", nameBn: "রাজশাহী শিক্ষা বোর্ড" },
    { code: "CTG", nameEn: "Chattogram Board", nameBn: "চট্টগ্রাম শিক্ষা বোর্ড" },
    { code: "BAR", nameEn: "Barishal Board", nameBn: "বরিশাল শিক্ষা বোর্ড" },
    { code: "COM", nameEn: "Cumilla Board", nameBn: "কুমিল্লা শিক্ষা বোর্ড" },
    { code: "DIN", nameEn: "Dinajpur Board", nameBn: "দিনাজপুর শিক্ষা বোর্ড" },
    { code: "JES", nameEn: "Jashore Board", nameBn: "যশোর শিক্ষা বোর্ড" },
    { code: "MYM", nameEn: "Mymensingh Board", nameBn: "ময়মনসিংহ শিক্ষা বোর্ড" },
    { code: "SYL", nameEn: "Sylhet Board", nameBn: "সিলেট শিক্ষা বোর্ড" },
    { code: "MAD", nameEn: "Madrasah Board", nameBn: "বাংলাদেশ মাদ্রাসা শিক্ষা বোর্ড" },
    { code: "TEC", nameEn: "Technical Board", nameBn: "বাংলাদেশ কারিগরি শিক্ষা বোর্ড" },
  ];

  for (const b of boardsData) {
    await prisma.examinationBoard.upsert({
      where: { code: b.code },
      update: {},
      create: b,
    });
  }
  console.log("✓ Examination boards seeded");

  // 4. Universities & Units
  const du = await prisma.university.upsert({
    where: { code: "DU" },
    update: {},
    create: {
      code: "DU",
      nameEn: "University of Dhaka",
      nameBn: "ঢাকা বিশ্ববিদ্যালয়",
      shortName: "DU",
      admissionUnits: {
        create: [
          { code: "KA", nameEn: "Ka Unit (Science)", nameBn: "ক ইউনিট (বিজ্ঞান)", focusGroup: "Science" },
          { code: "KHA", nameEn: "Kha Unit (Arts)", nameBn: "খ ইউনিট (মানবিক)", focusGroup: "Arts" },
          { code: "GA", nameEn: "Ga Unit (Business)", nameBn: "গ ইউনিট (ব্যবসায় শিক্ষা)", focusGroup: "Commerce" },
        ],
      },
    },
  });

  await prisma.university.upsert({
    where: { code: "DMC" },
    update: {},
    create: {
      code: "DMC",
      nameEn: "Medical Colleges (MBBS)",
      nameBn: "সরকারি মেডিকেল কলেজসমূহ (এমবিবিএস)",
      shortName: "MBBS",
      admissionUnits: {
        create: [
          { code: "MBBS_GENERAL", nameEn: "MBBS Admission", nameBn: "এমবিবিএস ভর্তি পরীক্ষা", focusGroup: "Medical" },
        ],
      },
    },
  });

  await prisma.university.upsert({
    where: { code: "BDS" },
    update: {},
    create: {
      code: "BDS",
      nameEn: "Dental Colleges (BDS)",
      nameBn: "ডেন্টাল কলেজসমূহ (বিডিএস)",
      shortName: "BDS",
      admissionUnits: {
        create: [
          { code: "BDS_GENERAL", nameEn: "BDS Admission", nameBn: "বিডিএস ভর্তি পরীক্ষা", focusGroup: "Dental" },
        ],
      },
    },
  });

  await prisma.university.upsert({
    where: { code: "GST" },
    update: {},
    create: {
      code: "GST",
      nameEn: "GST General & Science-Tech Universities",
      nameBn: "গুচ্ছ সাধারণ, বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়সমূহ",
      shortName: "GST",
      admissionUnits: {
        create: [
          { code: "A", nameEn: "A Unit (Science)", nameBn: "এ ইউনিট (বিজ্ঞান)", focusGroup: "Science" },
          { code: "B", nameEn: "B Unit (Humanities)", nameBn: "বি ইউনিট (মানবিক)", focusGroup: "Humanities" },
          { code: "C", nameEn: "C Unit (Commerce)", nameBn: "সি ইউনিট (বাণিজ্য)", focusGroup: "Commerce" },
        ],
      },
    },
  });
  console.log("✓ Universities and admission units seeded");

  // 5. Subscription Plans
  const plans = [
    {
      code: "FREE",
      nameBn: "ফ্রি প্ল্যান",
      nameEn: "Free Plan",
      descriptionBn: "দৈনিক ৫টি কুইজ, পাবলিক প্রশ্নব্যাংক ব্রাউজিং ও লাইব্রেরি অ্যাক্সেস",
      descriptionEn: "Daily 5 quizzes, public question bank search & basic library",
      priceBdt: 0,
      durationDays: 365,
      featuresJson: JSON.stringify([
        "দৈনিক সীমিত প্রশ্ন অনুশীলন",
        "পাবলিক প্রশ্ন ব্যাংক অনুসন্ধান",
        "মৌলিক ফলাফল বিশ্লেষণ",
      ]),
    },
    {
      code: "SSC_PREMIUM",
      nameBn: "এসএসসি স্পেশাল প্রিমিয়াম",
      nameEn: "SSC Premium",
      descriptionBn: "এসএসসি সকল বিষয়ের বিগত ১৫ বছরের বোর্ড প্রশ্ন, লাইভ মডেল টেস্ট ও সমাধান",
      descriptionEn: "All SSC subjects 15 years board questions, live model tests & detailed solutions",
      priceBdt: 99,
      durationDays: 30,
      category: ExamCategoryType.SSC,
      featuresJson: JSON.stringify([
        "সীমাহীন কাস্টম এক্সাম তৈরি",
        "সকল বোর্ড পরীক্ষার নির্ভুল সমাধান",
        "ভুল উত্তরের স্বয়ংক্রিয় খাতা ও অনুশীলন",
        "অধ্যায়ভিত্তিক ফর্মুলা শিট ও নোটস",
      ]),
    },
    {
      code: "HSC_PREMIUM",
      nameBn: "এইচএসসি স্পেশাল প্রিমিয়াম",
      nameEn: "HSC Premium",
      descriptionBn: "এইচএসসি ১ম ও ২য় পত্রের অধ্যায়ভিত্তিক প্রশ্ন, লেকচার নোটস ও মডেল টেস্ট",
      descriptionEn: "HSC 1st & 2nd paper chapterwise test series, notes & unlimited mock tests",
      priceBdt: 149,
      durationDays: 30,
      category: ExamCategoryType.HSC,
      featuresJson: JSON.stringify([
        "পদার্থ, রসায়ন, উচ্চতর গণিত ও জীববিজ্ঞান সম্পূর্ণ প্রশ্নব্যাংক",
        "সীমাহীন রিয়েল টাইম মডেল টেস্ট উইথ টাইমার",
        "নেগেটিভ মার্কিং সহ মেধা তালিকা (র‍্যাংক)",
        "এআই স্টাডি অ্যাসিস্ট্যান্ট আনলিমিটেড ব্যবহার",
      ]),
    },
    {
      code: "MED_PREMIUM",
      nameBn: "মেডিকেল ভর্তি স্পেশাল",
      nameEn: "Medical Admission Premium",
      descriptionBn: "এমবিবিএস ও বিডিএস বিগত ২০ বছরের প্রশ্ন, বায়োলজি স্পেশাল ড্রিল ও নেগেটিভ মার্কিং টেস্ট",
      descriptionEn: "MBBS & BDS past 20 years questions, negative marking drills & full mock exams",
      priceBdt: 199,
      durationDays: 30,
      category: ExamCategoryType.MEDICAL,
      featuresJson: JSON.stringify([
        "১০০ নম্বরের ফুল মেডিকেল স্ট্যান্ডার্ড মডেল টেস্ট",
        "০.২৫ নেগেটিভ মার্কিং নিখুঁত রেজাল্ট",
        "বিষয়ভিত্তিক ও অধ্যায়ভিত্তিক নিবিড় প্রশ্নব্যাংক",
        "মেডিকেল বিশেষজ্ঞদের দ্বারা তৈরি নির্ভুল ব্যাখ্যা",
      ]),
    },
    {
      code: "VARSITY_PREMIUM",
      nameBn: "ভার্সিটি 'ক' ও গুচ্ছ প্রিমিয়াম",
      nameEn: "University Admission Premium",
      descriptionBn: "ঢাবি, রাবি, জাবি ও গুচ্ছ বিশ্ববিদ্যালয়ের প্রশ্নব্যাংক ও স্পেশাল মডেল টেস্ট",
      descriptionEn: "DU, RU, JU & GST university admission tests with unitwise rankings",
      priceBdt: 199,
      durationDays: 30,
      category: ExamCategoryType.UNIVERSITY,
      featuresJson: JSON.stringify([
        "ঢাবি 'ক' ইউনিট ও গুচ্ছ স্ট্যান্ডার্ড প্রশ্নব্যাংক",
        "টাইম ম্যানেজমেন্ট অ্যানালিটিক্স",
        "টপ পারফরমারদের সাথে তুলনামূলক র‍্যাংক",
        "শর্টকাট ক্যালকুলেশন ট্রিকস ও টেকনিক",
      ]),
    },
    {
      code: "ALL_ACCESS",
      nameBn: "অল অ্যাক্সেস মেম্বারশিপ",
      nameEn: "All Access Membership",
      descriptionBn: "এসএসসি, এইচএসসি, মেডিকেল ও ভার্সিটি ভর্তি - সব কোর্সের পূর্ণ অ্যাক্সেস",
      descriptionEn: "Full unlimited access to SSC, HSC, Medical & University admission modules",
      priceBdt: 499,
      durationDays: 90,
      featuresJson: JSON.stringify([
        "প্ল্যাটফর্মের সকল প্রশ্নব্যাংক আনলক",
        "লাইভ ও রেকর্ডেড সকল অনলাইন ক্লাস",
        "ডিজিটাল লাইব্রেরির সকল পিডিএফ ও নোটস ডাউনলোড",
        "২৪/৭ শিক্ষক ডাউট সলভ ও সরাসরি সাপোর্ট",
      ]),
    },
  ];

  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
  }
  console.log("✓ Subscription plans seeded");

  // 6. Subjects and Chapters
  // HSC Physics 1st Paper
  const hscPhy = await prisma.subject.upsert({
    where: { code: "PHY_1" },
    update: {},
    create: {
      code: "PHY_1",
      nameBn: "পদার্থবিজ্ঞান ১ম পত্র",
      nameEn: "Physics 1st Paper",
      category: ExamCategoryType.HSC,
      papers: {
        create: [
          {
            paperNumber: 1,
            nameBn: "১ম পত্র",
            nameEn: "1st Paper",
          },
        ],
      },
    },
  });

  const phyPaper1 = await prisma.paper.findFirst({
    where: { subjectId: hscPhy.id, paperNumber: 1 },
  });

  const chVector = await prisma.chapter.create({
    data: {
      subjectId: hscPhy.id,
      paperId: phyPaper1.id,
      chapterNum: 2,
      nameBn: "ভেক্টর (Vectors)",
      nameEn: "Vectors",
      description: "স্কেলার ও ভেক্টর রাশি, ভেক্টর যোগ, ডট গুণন ও ক্রস গুণন",
    },
  });

  const chWork = await prisma.chapter.create({
    data: {
      subjectId: hscPhy.id,
      paperId: phyPaper1.id,
      chapterNum: 4,
      nameBn: "কাজ, শক্তি ও ক্ষমতা (Work, Energy & Power)",
      nameEn: "Work, Energy & Power",
      description: "বল দ্বারা কৃতকাজ, গতিশক্তি ও বিভব শক্তি, সংরক্ষণশীল বল",
    },
  });

  // HSC Chemistry 1st Paper
  const hscChem = await prisma.subject.upsert({
    where: { code: "CHEM_1" },
    update: {},
    create: {
      code: "CHEM_1",
      nameBn: "রসায়ন ১ম পত্র",
      nameEn: "Chemistry 1st Paper",
      category: ExamCategoryType.HSC,
      papers: {
        create: [{ paperNumber: 1, nameBn: "১ম পত্র", nameEn: "1st Paper" }],
      },
    },
  });

  const chemPaper1 = await prisma.paper.findFirst({
    where: { subjectId: hscChem.id, paperNumber: 1 },
  });

  const chQualitativeChem = await prisma.chapter.create({
    data: {
      subjectId: hscChem.id,
      paperId: chemPaper1.id,
      chapterNum: 2,
      nameBn: "গুণগত রসায়ন (Qualitative Chemistry)",
      nameEn: "Qualitative Chemistry",
      description: "পরমাণুর মডেল, কোয়ান্টাম সংখ্যা, বর্ণালী, দ্রাব্যতা ও দ্রাব্যতা গুণফল",
    },
  });

  // SSC General Math
  const sscMath = await prisma.subject.upsert({
    where: { code: "SSC_MATH" },
    update: {},
    create: {
      code: "SSC_MATH",
      nameBn: "সাধারণ গণিত (এসএসসি)",
      nameEn: "General Mathematics",
      category: ExamCategoryType.SSC,
    },
  });

  const chSscTrig = await prisma.chapter.create({
    data: {
      subjectId: sscMath.id,
      chapterNum: 9,
      nameBn: "ত্রিকোণমিতিক অনুপাত (Trigonometric Ratios)",
      nameEn: "Trigonometric Ratios",
    },
  });

  // Medical Biology
  const medBio = await prisma.subject.upsert({
    where: { code: "MED_BIO" },
    update: {},
    create: {
      code: "MED_BIO",
      nameBn: "জীববিজ্ঞান (মেডিকেল ভর্তি)",
      nameEn: "Medical Biology",
      category: ExamCategoryType.MEDICAL,
    },
  });

  const chCell = await prisma.chapter.create({
    data: {
      subjectId: medBio.id,
      chapterNum: 1,
      nameBn: "কোষ ও এর গঠন (Cell & its Structure)",
      nameEn: "Cell & its Structure",
    },
  });

  console.log("✓ Core subjects and chapters seeded");

  // 7. Verified Questions with Options, Answers, and Board References
  const dhakaBoard = await prisma.examinationBoard.findUnique({ where: { code: "DHA" } });
  const rajBoard = await prisma.examinationBoard.findUnique({ where: { code: "RAJ" } });

  // Question 1: Physics Vector (Dot Product)
  const q1 = await prisma.question.create({
    data: {
      category: ExamCategoryType.HSC,
      subjectId: hscPhy.id,
      paperId: phyPaper1.id,
      chapterId: chVector.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      status: ContentStatus.PUBLISHED,
      questionTextBn: "দুটি ভেক্টর \\vec{A} এবং \\vec{B} পরস্পরের উপর লম্ব হলে নিচের কোনটি সঠিক?",
      questionTextEn: "If two vectors \\vec{A} and \\vec{B} are mutually perpendicular, which of the following is correct?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 45,
      textbookRef: "ড. শাহজাহান তপন (HSC পদার্থবিজ্ঞান ১ম পত্র, পৃষ্ঠা ৪৫)",
      teacherTipsBn: "মনে রাখুন: লম্ব হলে ডট গুণন শূন্য, আর সমান্তরাল হলে ক্রস গুণন শূন্য হয়।",
      authorId: admin.id,
      options: {
        create: [
          { optionKey: "A", textBn: "\\vec{A} \\cdot \\vec{B} = 0", textEn: "\\vec{A} \\cdot \\vec{B} = 0", isCorrect: true, orderIndex: 1 },
          { optionKey: "B", textBn: "\\vec{A} \\times \\vec{B} = 0", textEn: "\\vec{A} \\times \\vec{B} = 0", isCorrect: false, orderIndex: 2 },
          { optionKey: "C", textBn: "\\vec{A} + \\vec{B} = 0", textEn: "\\vec{A} + \\vec{B} = 0", isCorrect: false, orderIndex: 3 },
          { optionKey: "D", textBn: "|\\vec{A}| = |\\vec{B}|", textEn: "|\\vec{A}| = |\\vec{B}|", isCorrect: false, orderIndex: 4 },
        ],
      },
      answer: {
        create: {
          correctKey: "A",
          explanationBn: "আমরা জানি, \\vec{A} \\cdot \\vec{B} = AB \\cos(\\theta)। যখন ভেক্টর দুটি লম্ব হয়, তখন মধ্যবর্তী কোণ \\theta = 90^\\circ। যেহেতু \\cos(90^\\circ) = 0, তাই \\vec{A} \\cdot \\vec{B} = 0।",
          explanationEn: "We know \\vec{A} \\cdot \\vec{B} = AB \\cos(\\theta). Since they are perpendicular, \\theta = 90^\\circ. As \\cos(90^\\circ) = 0, \\vec{A} \\cdot \\vec{B} = 0.",
        },
      },
      references: {
        create: [
          {
            boardId: dhakaBoard.id,
            examYear: 2023,
            examSessionName: "ঢাকা বোর্ড ২০২৩",
          },
        ],
      },
    },
  });

  // Question 2: Physics Work and Energy
  const q2 = await prisma.question.create({
    data: {
      category: ExamCategoryType.HSC,
      subjectId: hscPhy.id,
      paperId: phyPaper1.id,
      chapterId: chWork.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      status: ContentStatus.PUBLISHED,
      questionTextBn: "কোনো বস্তুর ভরবেগ দ্বিগুণ করা হলে তার গতিশক্তি কতগুণ বৃদ্ধি পাবে?",
      questionTextEn: "If the momentum of an object is doubled, by how many times will its kinetic energy increase?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 60,
      textbookRef: "প্রফেসর ড. গিয়াসউদ্দিন আহমেদ (পদার্থবিজ্ঞান ১ম পত্র)",
      teacherTipsBn: "গতিশক্তি ও ভরবেগের সম্পর্ক E_k = p^2 / (2m) সরাসরি প্রয়োগ করুন।",
      authorId: admin.id,
      options: {
        create: [
          { optionKey: "A", textBn: "২ গুণ", textEn: "2 times", isCorrect: false, orderIndex: 1 },
          { optionKey: "B", textBn: "৩ গুণ বৃদ্ধি পাবে (৪ গুণ হবে)", textEn: "Increase by 3 times (becomes 4 times)", isCorrect: true, orderIndex: 2 },
          { optionKey: "C", textBn: "৪ গুণ বৃদ্ধি পাবে", textEn: "Increase by 4 times", isCorrect: false, orderIndex: 3 },
          { optionKey: "D", textBn: "অপরিবর্তিত থাকবে", textEn: "Remains unchanged", isCorrect: false, orderIndex: 4 },
        ],
      },
      answer: {
        create: {
          correctKey: "B",
          explanationBn: "গতিশক্তি E_k = \\frac{p^2}{2m}। ভরবেগ p' = 2p হলে নতুন গতিশক্তি E_k' = \\frac{(2p)^2}{2m} = 4 E_k। সুতরাং গতিশক্তি ৪ গুণ হয়, যার অর্থ বৃদ্ধি পায় (৪ - ১) = ৩ গুণ।",
          explanationEn: "Kinetic energy E_k = p^2 / (2m). With p' = 2p, new energy is 4 times original, which means it increases by 3 times.",
        },
      },
      references: {
        create: [
          {
            boardId: rajBoard.id,
            examYear: 2022,
            examSessionName: "রাজশাহী বোর্ড ২০২২",
          },
        ],
      },
    },
  });

  // Question 3: Chemistry Quantum Numbers
  const q3 = await prisma.question.create({
    data: {
      category: ExamCategoryType.HSC,
      subjectId: hscChem.id,
      paperId: chemPaper1.id,
      chapterId: chQualitativeChem.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.MEDIUM,
      status: ContentStatus.PUBLISHED,
      questionTextBn: "প্রধান কোয়ান্টাম সংখ্যা n = 3 হলে মোট অরবিটাল সংখ্যা কতটি?",
      questionTextEn: "For principal quantum number n = 3, what is the total number of orbitals?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 40,
      textbookRef: "হাজারী ও নাগ (উচ্চমাধ্যমিক রসায়ন ১ম পত্র)",
      authorId: admin.id,
      options: {
        create: [
          { optionKey: "A", textBn: "৬টি", textEn: "6", isCorrect: false, orderIndex: 1 },
          { optionKey: "B", textBn: "৯টি", textEn: "9", isCorrect: true, orderIndex: 2 },
          { optionKey: "C", textBn: "১৮টি", textEn: "18", isCorrect: false, orderIndex: 3 },
          { optionKey: "D", textBn: "৩টি", textEn: "3", isCorrect: false, orderIndex: 4 },
        ],
      },
      answer: {
        create: {
          correctKey: "B",
          explanationBn: "যেকোনো প্রধান শক্তিস্তর n-এ মোট অরবিটাল সংখ্যা n^2। এখানে n = 3, সুতরাং অরবিটাল সংখ্যা = 3^2 = 9টি (1টি s, 3টি p এবং 5টি d অরবিটাল)। মোট ইলেকট্রন ধারণক্ষমতা 2n^2 = 18টি।",
          explanationEn: "Total number of orbitals in shell n is n^2. Here n = 3, so orbitals = 3^2 = 9.",
        },
      },
      references: {
        create: [
          {
            boardId: dhakaBoard.id,
            examYear: 2021,
            examSessionName: "ঢাকা বোর্ড ২০২১",
          },
        ],
      },
    },
  });

  // Question 4: SSC Trigonometry
  const q4 = await prisma.question.create({
    data: {
      category: ExamCategoryType.SSC,
      subjectId: sscMath.id,
      chapterId: chSscTrig.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.EASY,
      status: ContentStatus.PUBLISHED,
      questionTextBn: "\\sin^2\\theta + \\cos^2\\theta = ?",
      questionTextEn: "\\sin^2\\theta + \\cos^2\\theta = ?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 30,
      textbookRef: "এনসিটিবি (NCTB) গণিত, নবম-দশম শ্রেণি, অধ্যায় ৯",
      authorId: admin.id,
      options: {
        create: [
          { optionKey: "A", textBn: "০ (0)", textEn: "0", isCorrect: false, orderIndex: 1 },
          { optionKey: "B", textBn: "১ (1)", textEn: "1", isCorrect: true, orderIndex: 2 },
          { optionKey: "C", textBn: "-১ (-1)", textEn: "-1", isCorrect: false, orderIndex: 3 },
          { optionKey: "D", textBn: "২ (2)", textEn: "2", isCorrect: false, orderIndex: 4 },
        ],
      },
      answer: {
        create: {
          correctKey: "B",
          explanationBn: "পীথাগোরাসের উপপাদ্য অনুযায়ী সমকোণী ত্রিভুজে লম্ব^২ + ভূমি^২ = অতিভুজ^২। ফলে \\sin^2\\theta + \\cos^2\\theta = 1।",
          explanationEn: "By Pythagorean identity in right angled triangle, \\sin^2\\theta + \\cos^2\\theta = 1.",
        },
      },
    },
  });

  // Question 5: Medical Biology
  const q5 = await prisma.question.create({
    data: {
      category: ExamCategoryType.MEDICAL,
      subjectId: medBio.id,
      chapterId: chCell.id,
      type: QuestionType.MCQ,
      difficulty: DifficultyLevel.HARD,
      status: ContentStatus.PUBLISHED,
      questionTextBn: "কোষের প্রোটিন তৈরির কারখানা (Protein Factory) বলা হয় কোন অঙ্গাণুকে?",
      questionTextEn: "Which organelle is known as the 'Protein Factory' of the cell?",
      marks: 1.0,
      negativeMarks: 0.25,
      estimatedSeconds: 30,
      textbookRef: "ড. আবুল হাসান (জীববিজ্ঞান ১ম পত্র)",
      authorId: admin.id,
      options: {
        create: [
          { optionKey: "A", textBn: "মাইটোকন্ড্রিয়া", textEn: "Mitochondria", isCorrect: false, orderIndex: 1 },
          { optionKey: "B", textBn: "রাইবোসোম", textEn: "Ribosome", isCorrect: true, orderIndex: 2 },
          { optionKey: "C", textBn: "গলগি বডি", textEn: "Golgi Body", isCorrect: false, orderIndex: 3 },
          { optionKey: "D", textBn: "লাইসোজোম", textEn: "Lysosome", isCorrect: false, orderIndex: 4 },
        ],
      },
      answer: {
        create: {
          correctKey: "B",
          explanationBn: "রাইবোসোম ট্রান্সলেশন প্রক্রিয়ায় পলিপেপটাইড তথা প্রোটিন সংশ্লেষণ করে। এজন্য রাইবোসোমকে কোষের প্রোটিন ফ্যাক্টরি বলা হয়। মাইটোকন্ড্রিয়া হলো পাওয়ার হাউস।",
          explanationEn: "Ribosome synthesizes proteins during translation, making it the protein factory of the cell.",
        },
      },
      references: {
        create: [
          {
            examYear: 2023,
            examSessionName: "মেডিকেল ভর্তি পরীক্ষা ২০২৩-২৪",
          },
        ],
      },
    },
  });

  console.log("✓ Verified curriculum questions seeded");

  // 8. Digital Library Resources
  await prisma.libraryResource.create({
    data: {
      titleBn: "এইচএসসি পদার্থবিজ্ঞান ১ম পত্র - সকল অধ্যায়ের সূত্রসমগ্র",
      titleEn: "HSC Physics 1st Paper - All Formulas Cheat Sheet",
      description: "ভেক্টর, গতিবিদ্যা, কাজ শক্তি ক্ষমতা এবং পর্যাবৃত্ত গতির সকল গাণিতিক সূত্র ও একক।",
      type: "FORMULA_SHEET",
      category: ExamCategoryType.HSC,
      subjectId: hscPhy.id,
      fileUrl: "/resources/hsc-physics-1st-formulas.pdf",
      fileSizeMb: 2.4,
      isPremium: false,
    },
  });

  await prisma.libraryResource.create({
    data: {
      titleBn: "মেডিকেল ভর্তি পরীক্ষা ২০২৩-২৪ প্রশ্নব্যাংক ও নির্ভুল সমাধান",
      titleEn: "Medical Admission 2023-24 Question Paper & Solutions",
      description: "১০০টি প্রশ্নের সম্পূর্ণ নির্ভুল সমাধান, ব্যাখ্যা এবং পাঠ্যবই রেফারেন্স।",
      type: "MODEL_PAPER",
      category: ExamCategoryType.MEDICAL,
      subjectId: medBio.id,
      fileUrl: "/resources/medical-2023-24-solutions.pdf",
      fileSizeMb: 4.1,
      isPremium: true,
    },
  });

  console.log("✓ Digital library resources seeded");

  // 9. Exam Templates (Model Tests & Board Papers)
  const templatesToSeed = [
    {
      titleBn: "HSC পদার্থবিজ্ঞান ১ম পত্র - স্পেশাল মডেল টেস্ট",
      titleEn: "HSC Physics 1st Paper - Special Model Test",
      category: ExamCategoryType.HSC,
      subjectId: hscPhy.id,
      durationMinutes: 25,
      totalMarks: 25,
      negativeMarks: 0.25,
      questionCount: 25,
      isPremium: false,
      mode: "REAL_EXAM",
      instructionsBn: "মোট ২৫টি প্রশ্ন থাকবে। প্রতিটি সঠিক উত্তরের জন্য ১ নম্বর এবং প্রতিটি ভুল উত্তরের জন্য ০.২৫ নম্বর কাটা যাবে। সময় ২৫ মিনিট।",
      instructionsEn: "25 questions in total. +1 for correct, -0.25 for incorrect answer. Duration 25 minutes.",
    },
    {
      titleBn: "ঢাকা বোর্ড ২০২৩ - পদার্থবিজ্ঞান ১ম পত্র",
      titleEn: "Dhaka Board 2023 - Physics 1st Paper",
      category: ExamCategoryType.HSC,
      subjectId: hscPhy.id,
      durationMinutes: 25,
      totalMarks: 25,
      negativeMarks: 0.25,
      questionCount: 25,
      isPremium: false,
      mode: "REAL_EXAM",
      instructionsBn: "বিগত ঢাকা বোর্ড ২০২৩ এর পদার্থবিজ্ঞান ১ম পত্রের প্রশ্নপত্র। সময় ২৫ মিনিট।",
      instructionsEn: "Past Dhaka Board 2023 Physics 1st Paper question paper. Duration 25 minutes.",
    },
    {
      titleBn: "মেডিকেল ভর্তি পূর্ণাঙ্গ মডেল টেস্ট ২০২৪",
      titleEn: "Medical Admission Full Model Test 2024",
      category: ExamCategoryType.MEDICAL,
      subjectId: medBio.id,
      durationMinutes: 60,
      totalMarks: 100,
      negativeMarks: 0.25,
      questionCount: 100,
      isPremium: false,
      mode: "REAL_EXAM",
      instructionsBn: "মেডিকেল ভর্তি পরীক্ষার অনুরূপ ১০০ নম্বরের মডেল টেস্ট। প্রতিটি ভুল উত্তরের জন্য ০.২৫ কাটা যাবে।",
      instructionsEn: "Medical Admission 100-mark model test with 0.25 negative marking.",
    },
    {
      titleBn: "SSC ২০২৬ বিশেষ মডেল টেস্ট - সাধারণ গণিত",
      titleEn: "SSC 2026 Special Model Test - General Math",
      category: ExamCategoryType.SSC,
      subjectId: sscMath.id,
      durationMinutes: 30,
      totalMarks: 30,
      negativeMarks: 0.25,
      questionCount: 30,
      isPremium: false,
      mode: "REAL_EXAM",
      instructionsBn: "এসএসসি পরীক্ষার্থীদের জন্য ৩০ নম্বরের এমসিকিউ মডেল টেস্ট। সময় ৩০ মিনিট।",
      instructionsEn: "30-mark MCQ model test for SSC candidates. Duration 30 minutes.",
    },
  ];

  for (const tmpl of templatesToSeed) {
    const existing = await prisma.examTemplate.findFirst({ where: { titleBn: tmpl.titleBn } });
    if (!existing) {
      await prisma.examTemplate.create({ data: tmpl });
    }
  }
  console.log("✓ Exam templates seeded");

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
