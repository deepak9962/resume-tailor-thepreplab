# Resume Tailor

An AI-powered web app that tailors a resume to a specific job description without inventing anything. Upload a resume (PDF or DOCX), paste a job description, and get back a rewritten, truthful resume rendered to a downloadable PDF. It also generates a matching cover letter on demand and scores how ATS-friendly the result is.

## Features

- **Truthful tailoring** — rewrites the summary, reorders/groups skills, and turns experience into impact-first bullets, using only facts already in the resume. Missing requirements are reported as gaps instead of being fabricated.
- **Match analysis** — match score, matched/missing keywords, gaps to address, and a summary of what changed.
- **ATS-friendliness score** — a deterministic score over content checks (contact, sections, dates, quantified bullets, keyword coverage, stuffing, risky characters) and the generated PDF's parseability.
- **Cover letter generator** — an on-demand, truthful cover letter built from the same job description and resume, with optional company, role, tone and notes.
- **Expiring downloads** — every PDF is served through a link that expires after 5 minutes.
- **Honest privacy posture** — your resume and the job description are never written to disk; they live in the backend's memory only, briefly.

## Tech stack

**Frontend**

- Next.js 16 (App Router) + React 19
- TypeScript (strict)
- Tailwind CSS v4
- Two routes: `/` (upload + job description) and `/resume` (result)

**Backend**

- Node.js 20+ (ESM) with TypeScript
- Fastify v5 (`@fastify/cors`, `@fastify/multipart`, `@fastify/rate-limit`)
- `pdf-parse` (PDF text extraction), `mammoth` (DOCX), `pdfkit` (PDF generation)
- `zod` for validation, `vitest` for tests

**AI**

- Google AI Studio via the official `@google/genai` SDK

## LLM provider and model

- **Provider:** Google AI Studio (Gemini), through the `@google/genai` SDK using its **Interactions API** with structured JSON output (`response_format` + a JSON schema derived from Zod).
- **Model:** configurable with the `GEMINI_MODEL` environment variable. The code default is `gemini-3.5-flash-lite`; the committed `.env.example` uses `gemini-3.8-flash`. Use a Gemini 3 model.
- **Tuning:** `thinking_level: 'low'` to keep latency down, a 60-second HTTP timeout, and a single retry on transient errors (HTTP 429/5xx). All prompts enforce the truthfulness rules; unsupported JD requirements go to `gaps`/`missingKeywords` rather than into the resume.
- **Prompt-injection hardening:** every untrusted field (job description, resume, notes, company, role) is sanitized and wrapped in a per-request random nonce fence, and each system instruction tells the model to treat fenced text as data, never instructions. LLM inputs are length-bounded (JD ≤ 6,000 characters; extracted resume text truncated to 20,000).

## Architecture

```
Browser (Next.js 16, :3000)
  ├─ /            resume upload + job description  ──POST /resume-tailor──┐
  └─ /resume      preview + match + ATS + cover letter                    │
                     │ POST /cover-letter  (reuses the resume token)      │
                     └── GET /download/:token  (PDF) ◀────────────────┐   │
                                                                     │   ▼
Backend (Fastify, :3001) ◀───────────────────────────────────────────┴───┘
  POST /resume-tailor
    1. validate multipart + magic bytes / size
    2. extract text (pdf-parse | mammoth)
    3. LLM call (Gemini, structured JSON)  ← the slow step
    4. validate output against the Zod schema
    5. render resume PDF (pdfkit)
    6. score ATS (content checks + parse the generated PDF)
    7. store PDF + context in an in-memory token store (5 min TTL)
  POST /cover-letter  → reads JD/resume from the token, LLM call, renders PDF, new token
  GET  /download/:token → streams the stored PDF (404 unknown, 410 expired)
```

The backend is stateless except for a single in-memory `Map` (token → PDF buffer + tailoring context). `POST /resume-tailor` returns the parsed resume, analysis and ATS score directly; matching and ATS panels are **UI-only** and are never written into the downloaded PDF. The frontend stores the last result in `sessionStorage` (via `useSyncExternalStore`) so a refresh on `/resume` keeps it.

## Setup and run (local)

### Prerequisites

- Node.js 20+ (Next.js 16 recommends 20.9+)
- A Google AI Studio API key — https://aistudio.google.com/apikey

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
# then set GEMINI_API_KEY in .env
npm run dev               # http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev               # http://localhost:3000
```

Open http://localhost:3000, paste a job description, upload a resume, and submit.

### Environment variables

**`backend/.env`**

| Variable           | Required | Default                 | Notes                                             |
| ------------------ | -------- | ----------------------- | ------------------------------------------------- |
| `GEMINI_API_KEY`   | yes      | —                       | Google AI Studio key. Server-side only.           |
| `GEMINI_MODEL`     | no       | `gemini-3.5-flash-lite` | Must be a Gemini 3 model.                         |
| `PORT`             | no       | `3001`                  |                                                   |
| `MAX_FILE_SIZE_MB` | no       | `5`                     | Resume upload cap.                                |
| `MIN_JD_LENGTH`    | no       | `100`                   | Minimum job-description length.                   |
| `MAX_JD_LENGTH`    | no       | `6000`                  | Maximum job-description length (longer is rejected). |
| `MAX_RESUME_TEXT_LENGTH` | no | `20000`                 | Extracted resume text is truncated to this.       |
| `CORS_ORIGIN`      | no       | `http://localhost:3000` | Comma-separated allowed frontend origins (local dev + deployed URL). |
| `DOWNLOAD_TTL_MS`  | no       | `300000`                | Download / context lifetime (5 minutes).          |

**`frontend/.env.local`**

| Variable              | Required | Default                 | Notes                  |
| --------------------- | -------- | ----------------------- | ---------------------- |
| `NEXT_PUBLIC_API_URL` | yes      | `http://localhost:3001` | Backend origin, no trailing slash. |

### API endpoints

| Method | Path                 | Body / params                                                        | Returns |
| ------ | -------------------- | -------------------------------------------------------------------- | ------- |
| `GET`  | `/health`            | —                                                                    | `{ "status": "ok" }` |
| `POST` | `/resume-tailor`     | `multipart/form-data`: `jobDescription`, `resume` (PDF/DOCX)         | `{ token, expiresAt, result: { customizedResume, analysis, ats } }` |
| `POST` | `/cover-letter`      | JSON: `{ token, candidateNotes?, companyName?, roleTitle?, tone? }`  | `{ token, expiresAt, result: { coverLetter, analysis } }` |
| `GET`  | `/download/:token`   | —                                                                    | PDF (`404` unknown, `410` expired) |

### Scripts

```bash
# backend
npm run dev        # tsx watch src/server.ts
npm run build      # tsc -p tsconfig.build.json
npm run start      # node dist/server.js
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest run

# frontend
npm run dev        # next dev
npm run build      # next build
npm run start      # next start
npm run lint       # eslint
npx tsc --noEmit   # typecheck
```

Run `lint` and `typecheck` before considering a change done. Backend unit tests use Vitest; the frontend has no test runner (verified via `tsc`, `lint` and `build`).

## Known limitations and trade-offs

- **In-memory token store.** PDFs and tailoring context live in a single process `Map` with a 5-minute TTL. They are lost on restart and do not survive horizontal scaling — this is a deliberate simplicity trade-off, not a database.
- **No accounts or history.** There is no auth, database or persisted versions. The "last result" lives only in the browser's `sessionStorage`; closing the tab drops it.
- **LLM latency.** The single Gemini call is the slow step. With a 60-second timeout and one retry, a worst case can approach ~2 minutes. The UI shows live progress (timer, rotating messages, progress bar) but the progress is a smooth estimate, not real server progress — there is no streaming. The client aborts after 180 seconds and asks you to retry.
- **Heuristic ATS score.** The ATS-friendliness score is a deterministic set of rules (content checks plus parsing the generated PDF), not an official ATS result. It is a helpful signal, not a guarantee.
- **Output scope.** Only the tailored resume is rendered to PDF; the match and ATS analyses are UI-only. The `analysis`/`ats` blocks never appear in the downloaded file.
- **Download filename.** `/download/:token` always serves `tailored-resume.pdf`, including for cover letters.
- **Cover letter context expiry.** A cover letter reuses the resume's 5-minute context; if it has expired, you must tailor the resume again first.
- **Constraints.** Rate limit is 30 requests/minute per client; uploads are capped at 5 MB and must be text-based PDF or DOCX (scanned/image PDFs have no extractable text and are rejected).
- **Required config.** `NEXT_PUBLIC_API_URL` must be set; there is no runtime fallback. The backend exits at startup if `GEMINI_API_KEY` is missing.
- **Heavy PDF engine options avoided.** PDFs are generated with `pdfkit` (single-column, embedded Carlito fonts, no tables or graphics) rather than an HTML/Chromium renderer, to keep the output ATS-parseable and the deployment light.

## Repository layout

```
resume-tailor-thepreplab/
├─ backend/     Fastify API, Gemini prompts, PDF generation, ATS scoring, tests
│  └─ AGENTS.md backend conventions and API contract
└─ frontend/    Next.js UI (/, /resume)
   └─ AGENTS.md frontend conventions and UX requirements
```

Each package has its own `AGENTS.md` documenting the contract, file layout and conventions; keep them in sync with the code when making changes.
