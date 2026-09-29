# Campus Placement AI — Next-Generation Career Intelligence Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Azure AI Foundry](https://img.shields.io/badge/Azure_AI_Foundry-0078D4?style=for-the-badge&logo=microsoft-azure&logoColor=white)](https://ai.azure.com/)

An enterprise-ready, AI-driven placement preparation ecosystem designed to evaluate student career readiness, diagnose skill gaps, optimize resumes with evidence-based ATS scoring, generate personalized speech presentations, and provide real-time interview coaching through **Azure AI Foundry Agents**.

---

## 🌟 Key Features

### 1. 🛡️ Institutional Authentication & Multi-Channel Verification
- **Educational Domain Enforcement:** Whitelist-based domain verification ensuring only eligible university students access placement pools.
- **Two-Factor OTP Security:** Email-based OTP verification via **Nodemailer SMTP** with hashed delivery, 5-minute expiry, and anti-brute-force rate limiting.
- **Hardened Security Architecture:** Password hashing via `bcryptjs` (12 salt rounds), hashed OTP verification, 5-minute expiry windows, anti-brute-force rate limiting, and 7-day signed JWT tokens.

### 2. 🤖 Azure AI Foundry Agent Orchestration
- **Agent Integration:** Connected with Azure AI Foundry (`CampusPlacementAgent` / GPT-4.1-mini) using `@azure/ai-projects` and `@azure/identity`.
- **Grounded Context Injection:** User profile, degree, CGPA, target dream companies, and extracted resume metrics are dynamically bound into agent inference prompts.
- **Context-Aware Dialogue:** Conversational history windowing with role attribution and persistence.

### 3. 🎯 Resume Intelligence & ATS Compatibility Engine
- **Deterministic 5-Dimension Scoring Methodology:**
  - **Required Skill Coverage (30%):** Matches role-critical hard and soft skills.
  - **Job Requirement Alignment (25%):** Evaluates depth of responsibilities against targeted industry roles.
  - **Project Relevance (20%):** Assesses hands-on technical complexity and domain applicability.
  - **Educational Alignment (15%):** Verifies degree prerequisites, coursework, and accreditation.
  - **Structural Formatting (10%):** Validates standard sections (Contact, Summary, Education, Skills, Experience, Projects).
- **Actionable ATS Feedback:** Identifies satisfied criteria, missing info, confirmed gaps, and non-hallucinatory resume rewrite suggestions.

### 4. 📝 Interactive Resume Builder
- **Real-Time Visual Editor:** Custom templates styled with a signature luxury Art Deco aesthetic.
- **Dynamic Field Management:** Real-time updates for work experience, education, projects, certifications, and skills.
- **Instant Export:** Browser-native document generation and formatting.

### 5. 🎙️ Multilingual Placement Presentation & Speech Generation
- **Automated Script Generation:** Synthesizes structured 60-90 second elevator pitches and placement summaries based on verified student achievements.
- **Multi-Language Support:** Generates speech scripts in English, Hindi, and regional languages with natural phonetic transliteration.
- **Speech Synthesis:** Interactive audio player with real-time waveform visualization, playback controls, and script accompaniment.

### 6. 📊 Predictive Placement Analytics & Skill Gap Diagnostics
- **Target Company Benchmarking:** Direct alignment evaluation against hiring bars of top tech companies (Google, Microsoft, Amazon, etc.).
- **Readiness Rating:** Algorithmic calculation of profile completeness and placement eligibility indicators.

---

## 🏗️ System Architecture

```
                                  ┌────────────────────────┐
                                  │   Client Application   │
                                  │  (React 18 + Vite + TS) │
                                  └───────────┬────────────┘
                                              │ REST / JSON (JWT Auth)
                                              ▼
                                  ┌────────────────────────┐
                                  │   Express API Server   │
                                  │ (Node.js + TypeScript) │
                                  └─────┬────────────┬─────┘
                     ┌──────────────────┘            └─────────────────┐
                     ▼                                                 ▼
       ┌───────────────────────────┐                     ┌───────────────────────────┐
       │   SQLite Persistence DB   │                     │      Azure AI Foundry     │
       │ (Users, Profiles, Resumes │                     │   (CampusPlacementAgent   │
       │  Analyses, Chat History)  │                     │   + Azure AI Search RAG)  │
       └───────────────────────────┘                     └───────────────────────────┘
```

---

## 📁 Repository Structure

```
NEW_AZURE_WEB_AGENT/
├── client/                               # Frontend Single Page Application
│   ├── src/
│   │   ├── components/layout/            # AppShell, Header, Sidebar navigation
│   │   ├── components/ui/                # Loading states, badges, modals
│   │   ├── hooks/                        # useAuth, context providers
│   │   ├── lib/                          # Axios API client, auth utilities
│   │   ├── pages/
│   │   │   ├── Assistant.tsx             # Interactive AI coaching workspace
│   │   │   ├── AudioPresentation.tsx     # Multilingual audio pitch player
│   │   │   ├── Dashboard.tsx             # Placement analytics & quick actions
│   │   │   ├── Eligibility.tsx           # Company eligibility criteria check
│   │   │   ├── Landing.tsx               # High-conversion Art Deco landing page
│   │   │   ├── Login.tsx / Register.tsx  # Multi-step authentication & OTP flows
│   │   │   ├── Onboarding.tsx            # Initial student profile onboarding wizard
│   │   │   ├── Preparation.tsx           # Company-specific prep tracks & FAQs
│   │   │   ├── Profile.tsx               # Academics, projects & skills manager
│   │   │   ├── Resume.tsx                # Resume file upload & parsing manager
│   │   │   ├── ResumeBuilder.tsx         # Visual resume builder & generator
│   │   │   ├── ResumeIntelligence.tsx    # ATS deep-dive compatibility auditor
│   │   │   └── SkillGap.tsx              # Target role gap diagnostic engine
│   │   ├── types/                        # TypeScript data contracts
│   │   └── index.css                     # Custom Art Deco CSS design system
│   └── vite.config.ts
│
├── server/                               # Backend REST API Server
│   ├── src/
│   │   ├── config/
│   │   │   └── educationalDomains.ts     # Domain whitelist & institution resolver
│   │   ├── db/
│   │   │   └── database.ts               # SQLite schema, indices, migrations
│   │   ├── middleware/
│   │   │   ├── auth.ts                   # JWT bearer verification & user extraction
│   │   │   └── upload.ts                 # Multer disk storage & MIME validation
│   │   ├── routes/
│   │   │   ├── analysis.ts               # Skill gap & ATS intelligence endpoints
│   │   │   ├── audio.ts                  # Audio presentation & speech script routes
│   │   │   ├── auth.ts                   # Institutional auth, OTP & recovery routes
│   │   │   ├── chat.ts                   # AI agent conversation & context memory
│   │   │   ├── dashboard.ts              # Aggregated metrics & readiness score
│   │   │   ├── profile.ts                # Profile CRUD & onboarding completion
│   │   │   └── resume.ts                 # Resume upload & text extraction
│   │   ├── services/
│   │   │   ├── azureAgent.ts             # Azure AI Foundry agent orchestration
│   │   │   ├── emailService.ts           # SMTP email dispatcher & HTML templates
│   │   │   └── resumeExtractor.ts        # PDF & DOCX text parsing engine
│   │   └── index.ts                      # Server bootstrap & middleware chain
│   └── tsconfig.json
│
├── .env.example                          # Environment variable configuration template
├── .gitignore                            # Production gitignore rules
└── package.json                          # Monorepo orchestration scripts
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Azure Account**: Active Azure subscription with Azure AI Foundry project

### 1. Install Dependencies
Install all root, client, and server dependencies with a single command:
```bash
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` to `server/.env` and update the values:
```bash
cp .env.example server/.env
```

Key environment configurations:
- **Azure AI:** `AZURE_AI_ENDPOINT`, `AZURE_AI_KEY`, `AZURE_AGENT_ID`
- **Authentication:** `JWT_SECRET` (generate using `openssl rand -hex 32`)
- **Email (SMTP):** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`

### 3. Run Development Servers
Start both the client (Vite) and server (Express) concurrently:
```bash
npm run dev
```

The services will be available at:
- **Frontend Application:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3001](http://localhost:3001)

---

## 📡 REST API Reference

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/send-otp` | `POST` | ❌ | Validates educational email & sends OTP |
| `/api/auth/verify-otp` | `POST` | ❌ | Verifies OTP code & issues JWT session |
| `/api/auth/resend-otp` | `POST` | ❌ | Resends OTP adhering to cooldown rate limits |
| `/api/profile` | `GET` | ✅ | Fetches student profile, academics, skills, & projects |
| `/api/profile` | `PUT` | ✅ | Updates student profile details transactionally |
| `/api/resume/upload` | `POST` | ✅ | Uploads and extracts text from PDF/DOCX resume |
| `/api/resume` | `GET` | ✅ | Retrieves current user resume metadata |
| `/api/analysis/skill-gap` | `POST` | ✅ | Runs Azure AI skill gap evaluation for target role |
| `/api/analysis/resume-intelligence`| `POST` | ✅ | Runs 5-dimension ATS compatibility audit |
| `/api/audio/presentation-script` | `POST` | ✅ | Generates placement presentation pitch script |
| `/api/chat` | `POST` | ✅ | Dispatches message to Azure AI placement coach |
| `/api/chat/history` | `GET` | ✅ | Retrieves user conversational message history |
| `/api/dashboard` | `GET` | ✅ | Aggregates readiness score and pending tasks |

---

## 🔒 Security & Reliability Architecture

- **Stateless Authentication:** Industry-standard JWT tokens with 7-day lifespans stored securely.
- **Zero Hallucination Grounding:** System prompts constrain the Azure agent to verified database profile evidence.
- **Defense in Depth:** Helmet HTTP security headers, CORS origin whitelisting, rate-limiting on sensitive auth routes.
- **Transactional Consistency:** SQLite WAL mode with foreign-key constraints and ACID transactions for multi-entity profile updates.

---

## 📜 License
MIT License. Developed for Campus Placement AI intelligence and career preparation.
