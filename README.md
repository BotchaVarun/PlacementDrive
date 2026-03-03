# 📌 1. Project Overview

**Placement-Prime** is a comprehensive, AI-powered placement preparation and career management platform designed for early-career professionals and students. 

### The Problem It Solves
Job seekers often struggle to align their resumes with ATS (Applicant Tracking Systems) requirements, lack realistic mock interview practice, and find it tedious to track job applications across multiple platforms. Placement-Prime solves this by consolidating the entire job hunt lifecycle into a unified dashboard enhanced by artificial intelligence.

### Target Users
- Students preparing for campus placements.
- Early-career developers and professionals.
- Job seekers wanting to optimize their resumes for ATS and practice domain-specific interviews.

### Core Features
- **AI Resume Analyzer & Generator:** Upload a PDF resume and paste a Job Description (JD). The AI extracts keywords, scores the resume against the JD, and generates an optimized LaTeX resume.
- **AI Mock Interviews:** Select a domain and difficulty to generate custom technical and HR questions. Record audio responses which are sent to the AI for transcription and detailed performance evaluations (technical accuracy, clarity, filler words).
- **Job Application Tracker:** Discover jobs, bookmark them, or move them through an application pipeline (Wishlist, Applied, Interviewing).
- **Comprehensive Profile Builder:** Maintain structured career data (Education, Experience, Projects, Skills) which seamlessly feeds into the ATS resume generator.
- **Interactive Dashboard:** Visualize your job search progress and interview performance metrics over time.

---

# 🏗 2. System Architecture

Placement-Prime follows a robust **Client-Server Architecture** utilizing a modern monolithic repository structure with shared schemas. 

### High-Level Architecture Explanation
- **Frontend (Client):** A React (Vite) application built with TailwindCSS and Radix UI components. It handles user interactions, global state (React Query), layout, and audio/file capturing.
- **Backend (Server):** Node.js Express server handling API routing, AI orchestrations, file processing, and session management.
- **Database Layer:** PostgreSQL accessed via Drizzle ORM, ensuring type safety from the database to the client via shared Zod schemas.
- **AI Layer:** Groq AI (running LLaMA 3.1/3.3 models) handles heavy text processing for ATS scoring, resume enhancement, and mock interview answering/evaluations.

### Client-Server Interaction
1. **Data Definition:** The client and server share TypeScript interfaces via a `shared/` directory, minimizing mismatch errors manually.
2. **Requests:** React components trigger API calls using Axios/Fetch wrapped in React Query (for caching and loading states).
3. **Response Validation:** The Express server validates incoming request payloads using Zod before any database or AI operation.

### Data Flow Example (Resume Optimization)
1. User uploads a PDF and provides a JD on the Client.
2. The Client hits `/api/resumes/analyze` (multipart/form-data or JSON with parsed text).
3. The Server compresses profile data and triggers two parallel Groq AI calls: one for ATS scoring (returning JSON) and one for LaTeX rebuild.
4. AI responses are aggregated, saved to PostgreSQL, and returned to the React Client.
5. The React Client updates its cache and renders the ATS score and LaTeX preview.

---

# 📂 3. Complete Folder Structure

```text
Placement-Prime/
├── client/                     # Frontend React Application
│   ├── src/
│   │   ├── components/         # Reusable UI components (Buttons, Inputs, etc.)
│   │   ├── pages/              # Route components (Dashboard, Resume, Interviews)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utility wrappers (query client, formatters)
│   │   ├── App.tsx             # Root React component & Routing
│   │   └── main.tsx            # React DOM attachment point
│   └── index.html              # HTML entry point
│
├── server/                     # Backend Express API
│   ├── middleware/             # Express middlewares
│   │   └── auth.ts             # Firebase/Session authentication verification
│   ├── services/               # Core business logic
│   │   ├── ai.ts               # Groq & OpenAI interactions (Mock Interviews)
│   │   └── jobs.ts             # Job discovery logic
│   ├── storage.ts              # Database abstraction layer (Drizzle queries)
│   ├── routes.ts               # Express Router & API endpoints definitions
│   ├── db.ts                   # Postgres connection instantiation
│   └── index.ts                # Express server entry point
│
├── shared/                     # Shared code between Client & Server
│   ├── schema.ts               # Zod schemas & Drizzle ORM Table definitions
│   └── routes.ts               # API Route constants and interfaces
│
├── package.json                # Project dependencies and bash scripts
├── drizzle.config.ts           # Drizzle ORM configuration for migrations
├── tailwind.config.ts          # Utility classes configuration
└── .env                        # Environment Secrets (DO NOT COMMIT)
```

### Purpose of Key Files & Folders
- **Backend Files (`server/`):** Contains the application's secure logic, interacting with APIs (Groq) and databases, ensuring sensitive operations aren't exposed.
- **Frontend Files (`client/`):** Contains the view layer, responsive design, and local state management for the user interface.
- **Config Files:** `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, and `postcss.config.js` govern how the project is bundled, transpiled, and styled.
- **Models & Schemas (`shared/schema.ts`):** Acts as the crucial bridge. It defines both the Postgres table structures and the Zod validation schemas.
- **Routes (`server/routes.ts`):** Defines the API endpoints (e.g., `/api/resumes`, `/api/interviews`) and maps them to controllers/storage logic.
- **Middleware (`server/middleware/auth.ts`):** Intercepts requests to check for valid sessions/tokens before accessing protected routes.

---

# 📦 4. Modules & Dependencies Used

### Backend Dependencies
| Module | Purpose / Problem it Solves |
| :--- | :--- |
| **Express** | Rapidly deploy robust HTTP APIs. |
| **drizzle-orm** | Lightweight, type-safe Postgres ORM. Ensures DB schemas match TS interfaces. |
| **zod & drizzle-zod** | Schema validation for user payloads, ensuring clean data enters the DB. |
| **groq-sdk** | Client to interface with Groq's high-inference AI models (LLaMA) for text logic. |
| **multer** | Handles `multipart/form-data` for PDF and audio uploads. |
| **pdf-parse** | Extracts raw text buffers from uploaded Resume PDFs for the AI to digest. |
| **passport / firebase-admin**| Modular authentication logic & secure Firebase token verification. |

### Frontend Dependencies
| Module | Purpose / Problem it Solves |
| :--- | :--- |
| **React & Vite** | Component-driven UI development with lightning-fast HMR and building. |
| **TailwindCSS & Framer Motion**| Utility-based styling for rapid design alongside smooth page/element animations. |
| **Radix UI** | Unstyled, accessible UI primitives (dialogs, select, tooltips) reducing boilerplate. |
| **@tanstack/react-query** | Data fetching, caching, and server state management without complex Redux setups. |
| **react-hook-form** | Performant form validation via uncontrolled components (paired with Zod). |
| **react-speech-recognition**| Captures webcam/mic audio and transcodes it directly on the client view. |

---

# 🔐 5. Authentication Flow

Placement-Prime utilizes **Firebase Authentication** alongside a secure server-session sync.

1. **Client Registration/Login:** The user authenticates on the frontend via Google OAuth or Email/Password using Firebase Client SDK.
2. **Token Generation:** Firebase returns an ID token to the client.
3. **Session Sync:** The client POSTs the Firebase UID and Email to `/api/users/sync`.
4. **Backend Verification:** The Express app validates the request, checks PostgreSQL for the associated `firebaseUid`, creating a mapped local Database User if they don't exist.
5. **Protection:** The `checkAuth` middleware explicitly validates session object attachments or headers for subsequent requests (`/api/resumes`, `/api/jobs`).

---

# 🖼 6. Image & File Handling Flow

1. **Files involved:** PDFs (Resumes) and WebM/Audio (Mock Interviews).
2. **Storage Approach:** Ephemeral Memory Storage (`multer.memoryStorage()`) and temporary OS files mapped to Base64/APIs. 
3. **Why?** Since PDFs and Audio are directly fed to external APIs (like OpenAI Whisper or Groq Text Extraction) and do not need to be hosted publicly on a CDN, capturing the buffer in RAM avoids costly cloud bucket usage.
4. **Flow:**
   - User drops a PDF.
   - `multer` intercepts the file in memory (`req.file.buffer`).
   - `pdf-parse` reads the buffer, strips raw text, and deletes the form context.
   - The text is passed via API response or fed straight to Groq AI.

---

# 🗄 7. Database Design

We use a relational database structure (PostgreSQL).

### Core Tables
- **Users:** Core auth mapping (`id`, `firebaseUid`, `email`).
- **Resumes:** Stores history (`userId`, `title`, `content`, `atsScore`, `latexContent`).
- **Jobs & SavedJobs:** Job Tracker data (`id`, `title`, `company`, `status`, `userId`).
- **Interviews & Questions:** Mock interview tracking (`domain`, `difficulty`, `status`). 
- **Responses:** Links to Interviews (`userTranscript`, `aiFeedbackJson`).
- **Profile Segments:** Fragmented tables for `experience`, `education`, `skills` mapped to `userId`.

### Example JSON Document (Interview Response Output)
```json
{
  "id": "e4db...",
  "interviewId": "a1b2...",
  "questionId": "q9x8...",
  "userTranscript": "In Java, standard polymorphic behavior...",
  "aiFeedbackJson": {
    "score": 85,
    "clarity": 90,
    "technicalAccuracy": 80,
    "suggestion": "Mention method overloading vs overriding explicitly."
  }
}
```

---

# ⚙️ 8. Environment Variables

Store these inside a `.env` file at the root of the project.

```env
# Server settings
PORT=5000

# Database Configuration (Postgres)
DATABASE_URL=postgresql://user:password@localhost:5432/placement_prime

# Groq AI Keys
GROQ_API_KEY=your_groq_api_key
RESUME_GROQ_API_KEY=your_dedicated_resume_groq_api_key

# Firebase Admin SDK settings (Optional depending on auth flow)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
```

---

# 🚀 9. Setup Instructions (Very Detailed)

### Prerequisites
- **Node.js**: v18.0.0 or higher.
- **PostgreSQL**: v14.0 or higher installed locally or via cloud (Neon/Supabase).
- **TypeScript**: Installed globally (optional).

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/placement-prime.git
cd placement-prime
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root based on the variables listed in section 8.

### 4. Database Setup
Ensure PostgreSQL is running. Create a target database. 
Push the schema to your database using Drizzle:
```bash
npm run db:push
```

### 5. Run Development Server
This project utilizes a combined Vite + Express dev setup via TSX.
```bash
npm run dev
```
The application will be accessible at `http://localhost:5000` (or the port defined by Vite's proxy).

### 6. Run Production Build
```bash
npm run build
npm run start
```

---

# 🧪 10. Running Tests

*(If testing frameworks like Jest or Vitest are implemented)*
```bash
npm run test
```
- **Unit Tests:** Ensures AI parsing logic and Resume Deduplication work properly.
- **Integration Tests:** Verifies Database ORM insertions using mocked postgres environments.

---

# 📡 11. API Documentation

### `POST /api/resumes/analyze`
**Purpose:** Analyzes profile, outputs ATS Score, and rebuilds LaTeX.
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
```json
{
  "resumeId": "uuid-optional",
  "resumeContent": "Raw scraped PDF text...",
  "jobDescription": "We are looking for a Java Spring Boot dev..."
}
```
- **Response Example:**
```json
{
  "atsScore": 84,
  "missingKeywords": ["Microservices", "Docker"],
  "feedback": "Strong fit, but missing deployment specifics.",
  "optimizedLatex": "\\documentclass[]... (Full LaTeX structure)"
}
```

### `POST /api/interviews/:id/responses`
**Purpose:** Evaluates custom audio/transcript for an interview prompt.
- **Content-Type:** `multipart/form-data`
- **Fields:** `audio` (WebM Blob), `questionId` (string), `userTranscript` (string/fallback)

---

# 🖥 12. UI/UX Overview

- **Landing/Auth Page:** Clean, glassmorphism UI introducing the product natively with Firebase Auth integration.
- **Dashboard:** Generates radial charts showing ATS match history, total jobs applied, and interview average scores.
- **Profile Page:** Multi-pane accordion holding Education, Work History, and Skills. Includes smart parsing.
- **Resume Hub:** Upload zone with side-by-side comparison. Left shows the JD, right shows the generated LaTeX rendered via PDF preview.
- **Mock Interviews:** Interface featuring a webcam/audio record button, real-time transcription, and immediate post-question feedback cards.
- **Job Tracker:** Kanban-style board (Wishlist → Applied → Interviewing → Offered) for managing active opportunities.

---

# 📈 13. Performance Optimization Techniques Used

1. **Parallel AI Execution:** The `/api/resumes/analyze` route splits ATS scoring (Model A) and LaTeX Generation (Model B) into concurrent `Promise.all()` Groq requests, cutting waiting times by 50%.
2. **Ephemeral Memory Storage:** `multer` avoids Disk I/O bottlenecks by processing files purely in RAM.
3. **React Query Caching:** Prevents redundant database requests for static objects like user profiles or immutable interview results.
4. **Token Limits:** Input job descriptions and resumes are heavily truncated securely to prevent 413 Payload Large and 429 AI Rate Limit errors.

---

# 🔒 14. Security Practices

- **Resource Ownership:** API endpoints utilize `req.user.id` checks ensuring Users cannot delete or view resumes/jobs belonging to other IDs.
- **Input Validation:** Zod completely sanitizes injection payloads and ensures structural integrity of `POST/PATCH` actions.
- **Rate Limit Resilience:** Graceful model failover (`llama-3.1-8b` → `llama-3.3-70b`) manages heavy Groq API abuse securely.
- **Environment Scrubbing:** Critical API tokens (Firebase / Database / Groq) are loaded exclusively via `process.env`.

---

# 🌍 15. Deployment Guide

1. **Backend (Render / Railway / Heroku):** 
   - Ensure target environment variable `NODE_ENV=production`.
   - Run `npm run build` locally or let the PaaS run it, then `npm run start`.
2. **Database (Neon Serverless Postgres / Supabase):** 
   - Connect the generated connection string to `$DATABASE_URL`.
   - Run `npx drizzle-kit push` from your local machine to the production DB.
3. **Frontend (Vercel / Netlify):** 
   - Note: Because this repository merges the Client & Server into one application thread loop, it is best deployed wholly as a Node.js Docker Container or standard Node App, rather than splitting it on Vercel unless explicitly breaking apart the `/api` directory.

---

# 🛠 16. Troubleshooting

- **Error: `413 Request too large` on Resume Gen:** Ensure the PDF is not packed entirely with invisible image bytes, and limit Job Descriptions to 1200 characters.
- **Error: `429 Rate Limit Exceeded`:** You have run out of Groq API free tokens. Either add a delay or set up multiple keys in proxy.
- **Frontend not syncing with Backend:** Ensure Vite proxy in `vite.config.ts` matches your Express server's operating port.

---

# 🤝 17. Contributing Guide

1. Fork the Project.
2. Create your Feature Branch: `git checkout -b feature/AmazingFeature`
3. Commit your Changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the Branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request on Github making sure to tag any relevant issue numbers.

---

# 📜 18. License Section

Distributed under the **MIT License**. See `LICENSE` for more information.
