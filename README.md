# EduBD — Production-Ready Bilingual Educational Platform for Bangladesh
> **Product Tagline:** Learn • Practice • Test • Succeed  
> **Primary Market:** Bangladesh (SSC, HSC, Medical Admission, University Admission)  
> **Languages:** Bengali (বাংলা) & English  
> **Currency:** Bangladeshi Taka (৳)


---

## 1. System Overview

**EduBD** is a full-stack, production-ready educational SaaS platform designed specifically for students in Bangladesh preparing for:
- **SSC (Class 9–10):** NCTB curriculum, all 11 Education Boards (Dhaka, Rajshahi, Chittagong, Comilla, Sylhet, Barisal, Jessore, Dinajpur, Mymensingh, Madrasah, Technical).
- **HSC (Class 11–12):** Science, Commerce, and Humanities with full Paper 1 & Paper 2 separation (Physics, Chemistry, Higher Math, Biology, ICT, Accounting, etc.).
- **Medical Admission:** MBBS & BDS preparation, DGHS syllabus coverage, GK, English, and scientific formula practice.
- **University Admission:** Top public university admission tests including Dhaka University (DU ‘Ka’/‘Kha’/‘Ga’ units), BUET / Engineering, RU, CU, JU, and GST (General Science & Technology) cluster.

---

## 2. Technical Stack

| Layer | Technology |
|---|---|
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router), React 19, TypeScript (Strict Mode) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) with a professional light educational theme (White / Emerald / Slate-50) |
| **Mathematical Typesetting** | [KaTeX](https://katex.org/) for fast, server and client rendering of mathematical and chemical formulas (e.g., $E = mc^2$, $\vec{F} = m\vec{a}$) |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) (Sole persistent source of truth) |
| **ORM & Migrations** | [Prisma ORM 6](https://www.prisma.io/) (54 relational models, strict foreign keys, indexes, enums) |
| **Authentication & RBAC** | Custom stateless JWT + Secure HTTP-only cookies + bcrypt password hashing (Roles: `STUDENT`, `TEACHER`, `ADMIN`, `MODERATOR`) |
| **Testing** | [Vitest](https://vitest.dev/) (Unit & Integration tests covering Auth, i18n, Exam Engine, Payments, Importer) |
| **Containerization** | Multi-stage Docker build + `docker-compose.yml` with PostgreSQL health checks |

---

## 3. Database Schema & Architecture

The database schema (`prisma/schema.prisma`) comprises 54 interconnected models modeling the Bangladeshi academic structure:

```
AcademicClass ──< Subject ──< Paper ──< Chapter ──< Topic
      │                                       │
      ▼                                       ▼
    Board                                 Question (Bengali + English + KaTeX)
      │                                       │
      ▼                                       ├──< Option (Options A, B, C, D)
University ──< AdmissionUnit                  └──< Answer (Correct option + Explanation)
                                                      │
User (Student/Admin) ─────────────────────────────────┼──< ExamSession ──< StudentAnswer
   │                                                  │         │
   ├──< Subscription ──< SubscriptionPlan             │         └──< ExamResult
   ├──< PaymentOrder ──< PaymentTransaction           │
   └──< WrongQuestion (Autosaved error notebook) <────┘
```

### Key Relational Features
- **Strict Bilingual Content:** Questions, options, and explanations store both English (`contentEn`) and Bengali (`contentBn`) Unicode text.
- **Formula Typesetting:** Raw LaTeX equations (`$...$` and `$$...$$`) stored directly and rendered with KaTeX.
- **Audit Logging & Idempotency:** Payment transactions and administrative imports include idempotency keys, checksums, and audit trails.

---

## 4. Getting Started Locally

### Prerequisites
- Node.js 20+ LTS
- PostgreSQL 16+ running locally or via Docker
- Git & modern shell (`bash` / `zsh`)

### Step 1: Clone & Install Dependencies
```bash
git clone <repo-url> "edubd-platform"
cd "edubd-platform"
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
```

Key environment variables:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/edubd_db"

# Authentication
JWT_SECRET="your_strong_jwt_signing_key_min_32_chars"
NEXTAUTH_SECRET="your_nextauth_secret_hash"

# App Settings
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_DEFAULT_LOCALE="bn"

# AI Study Assistant (Optional - Fallback explanation available)
GEMINI_API_KEY=""

# Payment Gateways (Optional sandbox credentials)
BKASH_APP_KEY=""
BKASH_APP_SECRET=""
BKASH_USERNAME=""
BKASH_PASSWORD=""
NAGAD_MERCHANT_ID=""
```

### Step 3: Database Migration & Seeding
Push the schema to your PostgreSQL database and run the comprehensive Bangladeshi curriculum seed script:
```bash
npx prisma db push
node scripts/seed.mjs
```

The seed script creates:
- 11 National Education Boards (Dhaka, Chittagong, Rajshahi, etc.)
- Top Universities & Admission Units (DU 'Ka', 'Kha', 'Ga', Medical MBBS/BDS)
- Core Academic Classes (SSC Class 9-10, HSC Class 11-12)
- Subjects with Paper 1 and Paper 2 separation and chapters
- Real verified questions with Bengali Unicode text and KaTeX mathematical formulas
- 6 Subscription Tiers (SSC Free, SSC Pro ৳499, HSC Science ৳799, Medical Premium ৳1,299, DU Admission ৳999, All-Access ৳2,499)
- Test Admin and Student accounts

### Seed Credentials
| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@edubd.ac` | `Admin@123456` | Full platform access, Question Importer, Analytics |
| **Student** | `student@edubd.ac` | `Student@123456` | Practice exams, Custom Exam Builder, Error Notebook |

---

## 5. Development & Testing

### Running the Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Automated Tests
```bash
npm test
```
The test suite validates:
- Password hashing & JWT token issue/verification (`tests/unit/auth.test.ts`)
- Bengali and English digit and currency formatting (`tests/unit/i18n.test.ts`)
- Server-authoritative exam scoring with negative marking (-0.25) (`tests/integration/exam-engine.test.ts`)
- Payment processing idempotency & transaction safety (`tests/integration/payments.test.ts`)
- Bulk question CSV/Excel validation and duplicate prevention (`tests/integration/bulk-import.test.ts`)

### Building for Production
```bash
npm run build
npm start
```

---

## 6. Core Modules & Functionality

### 1. Server-Authoritative Exam Engine
- **Synchronized Server Countdown:** Prevents client-side clock manipulation; remaining time is calculated against the database `expiresAt` timestamp.
- **Continuous Autosave:** Student answers are persisted via `POST /api/v1/exams/[id]/answer` as they are selected.
- **Negative Marking Calculation:**
  $$\text{Final Score} = (\text{Correct Answers} \times 1.0) - (\text{Wrong Answers} \times 0.25)$$
- **Automatic Wrong-Question Notebook:** Any incorrect response is automatically registered in the student's `WrongQuestion` table for targeted revision.

### 2. Modular Payment Gateway Architecture
Supports Bangladesh's leading mobile financial services (MFS) and banking rails:
- **bKash (MFS):** Tokenized checkout with agreement, execution, and callback verification.
- **Nagad (MFS):** Encrypted payment payload adapter.
- **Bank Transfer & Cards:** Manual invoice confirmation and SSLCommerz card payments.
- **Idempotent Callbacks:** Prevents double-crediting through database-level transaction locking and unique transaction ID indexing.

### 3. Bilingual Support (English & Bengali)
- Persistent language toggle stored in `localStorage` and synchronized via React Context.
- Native Bengali number formatting (e.g., `০, ১, ২, ৩...`), currency display (`৳ ৪৯৯`), and date conversions.
- Full RTL and Unicode font rendering for complex Bengali ligatures (যুক্তবর্ণ).

### 4. Admin Management & Bulk Question Importer
- Accessible at `/admin` for users with role `ADMIN`.
- System-wide metrics: Total questions, registered students, completed exams, and monthly platform revenue.
- CSV/JSON question import engine with schema validation, dry-run parsing, and duplicate rejection.

---

## 7. Database Backup & Disaster Recovery

Two automated, production-ready shell scripts are provided in `scripts/`:

### Automated Backup (`scripts/backup_db.sh`)
Creates timestamped, gzip-compressed SQL dumps and automatically rotates backups older than 14 days:
```bash
./scripts/backup_db.sh
```
*Output: `backups/edubd_backup_YYYYMMDD_HHMMSS.sql.gz`*

**Setup Cron Job for Automated Daily Backups at 3:00 AM:**
```bash
crontab -e
# Add line:
0 3 * * * cd /path/to/edubd-platform && ./scripts/backup_db.sh >> /var/log/edubd_backup.log 2>&1
```

### Safe Database Restoration (`scripts/restore_db.sh`)
Verifies gzip archive integrity and safely restores all tables into PostgreSQL:
```bash
./scripts/restore_db.sh backups/edubd_backup_20261020_143852.sql.gz --force
```

---

## 8. Docker Deployment

### Multi-Container Deployment with Docker Compose
The platform includes a multi-stage `Dockerfile` and a production `docker-compose.yml` configuring PostgreSQL 16 and the Next.js application:

```bash
docker-compose up -d --build
```

### Health Check
```bash
docker-compose ps
curl http://localhost:3000/api/v1/curriculum
```

---

## 9. Security & Hardening

1. **RBAC & Authorization:** API routes verify user role permissions (`ADMIN`, `STUDENT`) via `lib/auth/rbac.ts`.
2. **Password Hashing:** Passwords hashed with bcrypt (salt rounds: 10).
3. **HTTP-Only Cookies:** Auth tokens stored in Secure, SameSite=Strict HTTP-only cookies to mitigate XSS attacks.
4. **Input Validation:** All incoming request payloads validated against strict Zod schemas (`lib/validation/schemas.ts`).
5. **No Client Clock Trust:** Exam session expirations and score evaluations are strictly server-authoritative.

---

## 10. License

Proprietary — Developed for Educational Institutions and Students in Bangladesh.  
All Rights Reserved © 2026 EduBD.
