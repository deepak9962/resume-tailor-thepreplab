# AGENTS.md — Backend (Resume Tailor API)

Guidelines for humans and AI agents working on the backend. Keep this file in sync with the code; it is the contract for how the API is built and maintained.

## 1. Purpose

Fastify API that turns a job description (JD) plus an uploaded resume into a tailored resume as structured JSON, then renders it to a PDF behind a 5-minute expiring download link. It can also write a truthful cover letter for the same JD on demand and render it to its own expiring PDF. Every tailored result also carries a deterministic ATS-friendliness score (`ats`).

Scope is intentionally small. Everything here should stay readable by one person. Do not add auth, a database, queues, or bonus features without updating this document first.

## 2. Stack

- Node.js 20+ (matches the Google GenAI SDK requirement).
- TypeScript (strict), ESM.
- Fastify v5.
- Google AI Studio via `@google/genai` (model `gemini-3.8-flash`, overridable with `GEMINI_MODEL`).
- `@fastify/multipart` for uploads, `@fastify/cors`, `@fastify/rate-limit`.
- `pdf-parse` for PDF text extraction, `mammoth` for DOCX.
- `pdfkit` for PDF generation.
- `zod` for request/response validation.

Deployment note (Render/Railway and similar container hosts): the server binds `host: '0.0.0.0'` and reads `PORT` from the environment (see `server.ts` / `config.ts`); binding to `localhost` would make it unreachable behind the platform proxy. Fastify runs with `trustProxy: true` so rate limiting and `request.ip` use the platform's forwarded client IP.

## 3. Directory layout

```
backend/
  src/
    server.ts                 # process start: listen + graceful shutdown
    app.ts                    # buildServer(): plugins, routes, error handler
    routes/
      health.ts               # GET /health
      resumeTailor.ts         # POST /resume-tailor
      coverLetter.ts          # POST /cover-letter
      download.ts             # GET /download/:token
    services/
      extractText.ts          # PDF/DOCX -> plain text
      gemini.ts               # shared GoogleGenAI client + transient-retry helper
      tailor.ts               # resume prompt + Gemini structured-output call
      coverLetter.ts          # cover letter prompt + Gemini structured-output call
      promptSafety.ts         # untrusted-input fencing (random nonce) + shared anti-injection rules
      ats.ts                  # deterministic ATS score: content checks + PDF parseability
      generatePdf.ts          # tailored JSON -> resume PDF Buffer
      generateCoverLetterPdf.ts # cover letter JSON -> PDF Buffer
      pdfShared.ts            # shared PDF constants, fonts, contact line, bullets
      tokenStore.ts           # in-memory Map<token, { buffer, expiresAt, context? }>
      *.test.ts               # colocated vitest unit tests
    schemas/
      tailorResult.ts         # zod schema + JSON schema used for Gemini
      coverLetter.ts          # zod schema + JSON schema used for Gemini
    lib/
      config.ts               # env parsing/validation, fail fast
      errors.ts               # AppError + error helpers
  assets/
    fonts/                    # Carlito TTF files bundled for pdfkit (ship with deploy)
  .env.example
  package.json
  tsconfig.json               # typechecks src incl. tests
  tsconfig.build.json         # build config, excludes *.test.ts
  vitest.config.ts
  eslint.config.js
```

`buildServer` lives in `app.ts` and is exportable so tests can use `app.inject` without opening a port; `server.ts` only wires the process lifecycle. One responsibility per file. If a service grows past ~150 lines, split it rather than nesting helpers.

## 4. Environment

All config is read once in `src/lib/config.ts` and validated at startup. Never read `process.env` directly elsewhere.

| Variable            | Required | Default | Notes                                   |
| ------------------- | -------- | ------- | --------------------------------------- |
| `GEMINI_API_KEY`    | yes      | —       | Google AI Studio key. Server-side only. |
| `PORT`              | no       | `3001`  |                                         |
| `MAX_FILE_SIZE_MB`  | no       | `5`     | Hard cap for resume uploads.            |
| `MIN_JD_LENGTH`     | no       | `100`   | Minimum characters for a valid JD.      |
| `MAX_JD_LENGTH`     | no       | `6000`  | Hard cap for the JD; longer is rejected with `400`. |
| `MAX_RESUME_TEXT_LENGTH` | no  | `20000` | Extracted resume text is truncated to this length (with a logged warning). |
| `CORS_ORIGIN`       | no       | `http://localhost:3000` | Comma-separated allowed frontend origins (e.g. local dev + deployed URL). |
| `DOWNLOAD_TTL_MS`   | no       | `300000`| 5 minutes.                              |
| `GEMINI_MODEL`      | no       | `gemini-3.8-flash` | Must be a Gemini 3 model (2.5 is limited to legacy users). |

The process must exit with a clear message if `GEMINI_API_KEY` is missing. `.env` is git-ignored; `.env.example` is committed with placeholder values.

## 5. API contract

### `POST /resume-tailor`

- `multipart/form-data`.
- Fields:
  - `jobDescription` — string, trimmed, `>= MIN_JD_LENGTH` and `<= MAX_JD_LENGTH`.
  - `resume` — single file, PDF or DOCX, `<= MAX_FILE_SIZE_MB`.

Response `200`:

```json
{
  "token": "uuid",
  "expiresAt": "2026-01-01T00:05:00.000Z",
  "result": {
    "customizedResume": {
      "name": "…",
      "title": "…",
      "contact": "…",
      "summary": "…",
      "skills": [{ "category": "Languages", "items": ["…"] }],
      "experience": [{ "role": "…", "company": "…", "dates": "…", "bullets": ["…"] }],
      "projects": [{ "name": "…", "tech": "…", "bullets": ["…"] }],
      "education": ["…"],
      "other": ["…"]
    },
    "analysis": {
      "matchScore": 82,
      "matchedKeywords": ["…"],
      "missingKeywords": ["…"],
      "gaps": [{ "gap": "…", "note": "…" }],
      "changesSummary": ["…"]
    },
    "ats": {
      "score": 91,
      "checks": [
        { "id": "contact", "group": "content", "label": "Complete contact details", "status": "pass", "weight": 12 },
        { "id": "pdf-text", "group": "pdf", "label": "PDF text is extractable", "status": "pass", "weight": 16, "note": "…" }
      ]
    }
  }
}
```

`ats` is computed in code (see §8a), not requested from the model. `score` is the sum of the `weight`s of the checks whose `status` is `pass` (all weights sum to 100). `group` is `content` or `pdf`; `note` is present only on failed checks.

### `POST /cover-letter`

- `application/json` body: `{ token, candidateNotes?, companyName?, roleTitle?, tone? }`. `tone` is `professional` (default), `warm` or `direct`. Free-text fields are length-capped (`token` 64, `companyName`/`roleTitle` 120, `candidateNotes` 2000) in `COVER_LETTER_INPUT_LIMITS`; anything longer is a `400`.
- `token` is the one returned by `POST /resume-tailor`; the JD, extracted resume text and parsed resume are read back from it (no re-upload).
- Generates the cover letter, renders it to a PDF, and stores it under a new token.
- Response `200`:

```json
{
  "token": "uuid",
  "expiresAt": "2026-01-01T00:05:00.000Z",
  "result": {
    "coverLetter": {
      "greeting": "Dear Hiring Manager,",
      "opening": "…",
      "bullets": ["…"],
      "closing": "…",
      "signOff": "Best regards,\nJane Doe"
    },
    "analysis": {
      "jdPriorities": ["…"],
      "evidenceUsed": [{ "requirement": "…", "resumeFact": "…" }],
      "unsupportedRequirements": ["…"]
    }
  }
}
```

- `400` invalid body, `404` unknown token, `410` expired token (both ask the user to tailor again).

### `GET /download/:token`

- `200` with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="tailored-resume.pdf"`.
- Serves whichever PDF was stored for the token (resume or cover letter).
- `404` unknown token, `410` expired token.

### `GET /health`

- `200 { "status": "ok" }`. Used for smoke tests.

## 6. Request pipeline (order matters)

`resumeTailor.ts` must run these steps in sequence and stop at the first failure:

1. Validate multipart fields and file presence.
2. Validate file type (MIME + extension + magic bytes) and size.
3. Extract plain text from the resume (`extractText`).
4. Guard content length: JD `>= MIN_JD_LENGTH` and `<= MAX_JD_LENGTH` (reject with `400`); truncate extracted resume text over `MAX_RESUME_TEXT_LENGTH` with a logged warning. Never silently drop or alter the JD.
5. Call the LLM (`tailor`) with JD + resume text.
6. Parse and validate the model output against the `tailorResult` zod schema. On parse failure, fail the request — do not pass malformed data downstream.
7. Generate the PDF (`generatePdf`).
8. Score ATS friendliness (`scoreAts`): deterministic content checks plus parseability of the generated PDF buffer.
9. Store the PDF buffer, together with the tailoring context (JD, extracted resume text, parsed resume), in the token store and return `token` + `expiresAt` + `result` (including `ats`).

## 7. Validation rules

- Accepted types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- Always verify magic bytes in addition to the declared MIME type: PDF starts with `%PDF-`, DOCX (zip) with `PK\x03\x04`.
- Enforce the size limit in the `@fastify/multipart` config AND re-check the buffered length.
- Reject empty/whitespace-only JD and resumes with no extractable text, and reject a JD longer than `MAX_JD_LENGTH`.
- Error codes: `400` invalid input, `413` too large, `415` unsupported type.

## 8. LLM usage

- One prompt module per task. Keep each system instruction and its output schema together (`services/tailor.ts` + `schemas/tailorResult.ts`; `services/coverLetter.ts` + `schemas/coverLetter.ts`). The shared `GoogleGenAI` client and the transient-retry helper live in `services/gemini.ts`.
- Use the Interactions API (`ai.interactions.create`): pass `system_instruction`, `input`, and `response_format: { type: 'text', mime_type: 'application/json', schema }` derived from the zod schema. Read `interaction.output_text`. Set `generation_config.thinking_level = 'low'` to keep latency down.
- The model must return a `customizedResume` (truthful rewrite of summary, grouped skills, impact-first experience bullets, projects, education) and an `analysis` (`matchScore`, `matchedKeywords`, `missingKeywords`, `gaps`, `changesSummary`). The response contract uses camelCase; the JSON schema in `schemas/tailorResult.ts` is the single source of truth and the prompt's schema text must be kept in sync with it. Bullet strings may contain Markdown `**bold**` spans around the key metric/technology (1 to 3 per bullet); the PDF renderer and the frontend both parse them.
- The cover letter prompt (`schemas/coverLetter.ts`, camelCase: `coverLetter { greeting, opening, bullets, closing, signOff }` + `analysis { jdPriorities, evidenceUsed, unsupportedRequirements }`) enforces the same truthfulness rules: only resume facts plus the optional `candidateNotes`, no invented company facts, no mention of unsupported requirements. An all-empty opening/closing is treated as a model failure.
- Keep the prompt's truthfulness rules intact: never invent employers, dates, metrics or skills; never add a JD skill the resume does not show (list it under `gaps`/`missingKeywords` instead).
- Treat every untrusted field as data, not instructions. `promptSafety.ts` strips control characters and wraps each field (JD, resume, notes, company, role) in a per-request random nonce fence (`<<<UNTRUSTED_...>>>`); each system instruction ends with the shared `UNTRUSTED_RULES` telling the model to ignore any instructions found inside the fence and never reveal the system message. Never interpolate untrusted text into a prompt without `wrapUntrusted`.
- The model cannot emit the prompt's `{ error }` variants under a strict `responseSchema`. Deterministic checks (JD length, empty extraction) live in code, and `tailor.ts` adds a not-a-resume guard: an all-empty `customizedResume` becomes a `400`.
- Set a request timeout and retry at most once on transient errors (HTTP 429 or 5xx, classified from the provider `ApiError.status` with a message fallback).
- Never log the API key or raw provider errors to the client. Attach the original provider error as `cause` on the `502` and log that `cause` server-side only.

## 8a. ATS scoring

- `scoreAts(result, pdf)` in `services/ats.ts` returns `{ score, checks }` and is deterministic — no model call. `scoreContent(result)` runs the content checks; `scorePdf(pdf)` parses the generated PDF buffer with `pdf-parse` (`new PDFParse({ data }).getText()`, then `destroy()`).
- Content checks (weights sum to 100): complete contact/identity (12), standard sections (10), dated roles (8), quantified achievements (12), strong bullet openers (6), JD keyword coverage from `analysis` (15), summary length (4), no skill/keyword stuffing (5), no ATS-risky characters (5). PDF checks: extractable text (16), text on every page (7).
- `score` is the sum of the weights of passing checks. Each check carries a short `note` only when it fails. A PDF that cannot be parsed fails the PDF checks without throwing.
- Keep the checks and weights in one place; the frontend renders whatever `checks` it receives.

## 9. PDF generation

- `generatePdf` takes the validated `TailorResult` and returns a `Buffer`. It must not call the network.
- `generateCoverLetterPdf` takes the `CoverLetterResult` plus the parsed resume and returns a `Buffer`: a one-page business letter (header from the resume name/title/contact, date, greeting, opening, bullets, closing, sign-off) using the same A4/margins/Carlito/navy palette. Also network-free.
- Shared PDF constants (mm margins, palette, sizes), font registration, `parseBold`, the contact line and the bullet renderer live in `services/pdfShared.ts`; use them in both renderers rather than duplicating.
- Single page, single column, A4, matching the reference ReportLab layout. Order: centered header (name, title, contact), Summary, Technical Skills, Experience, Projects, Education, Additional. Render only the `customizedResume` — the `analysis` block is UI-only.
- Fonts: Carlito (SIL OFL) is bundled in `assets/fonts/` (Regular/Bold/Italic/BoldItalic) and registered with pdfkit. Ship that folder with any deployment; the path is resolved relative to the module, so it works from both `src/` (dev) and `dist/` (build). Only faces actually used get embedded.
- Base size `FS` steps 11 → 10.5 → 10 pt (largest that fits). Leading = `FS × 1.32`. Derived sizes: name 24 bold, title `FS+1`, contact `FS-0.5`, section head `FS+1.5`, role line `FS+0.5`, dates/project tech `FS` italic, body/bullets `FS`.
- Palette: body black; name, section headings and section rules navy `#1F3864`; links `#0563C1` and underlined.
- Margins: A4 with 12 mm left/right and 8 mm top/bottom (converted from millimetres via a `MM` constant so sizes stay editable in mm).
- Spacing: 4 pt spacer before each section; section rule full width, 1.2 pt thick, navy, 1 pt below the heading and 3 pt above the content; 3 pt spacer between roles. Keep constants at the top of the file.
- Role line is a two-column row: `role | company` bold on the left, dates right-aligned italic in a 40 mm column, bottom-aligned, 1 pt top padding.
- Bullets use a literal "•" with a 12 pt indent, black, no extra spacing between bullets. Bullet strings may contain Markdown `**bold**` spans (key metrics/technologies); `parseBold` renders them in Carlito-Bold inline. Text is drawn with pdfkit's `continued` option per run.
- The contact line is centered and clickable. `contactParts` is deliberately tolerant: it normalizes separators (`|`, `•`, `·`, newlines/tabs) and finds emails/URLs even inside labeled tokens (e.g. `Email: jane@x.com`, `LinkedIn: linkedin.com/in/x`) using anchored-then-substring matching (email, `http(s)://`/`www.`, bare known-TLD domains). Emails become `mailto:`, URLs get `https://`, drawn with explicit `doc.link` rectangles (do not use pdfkit's `continued` link option — it applies one link to the whole line). If the line is too wide it steps the font down to 8 pt before falling back to plain centered text.
- No inline HTML engines (puppeteer/Chromium) — they are heavy and slow to maintain.

## 10. Token store

- Module-level `Map<string, { buffer: Buffer; expiresAt: number; context?: TailorContext }>`.
- Token = `crypto.randomUUID()`.
- `expiresAt = Date.now() + DOWNLOAD_TTL_MS`.
- `save(buffer, context?)` optionally stores the tailoring context (JD, extracted resume text, parsed resume) so `POST /cover-letter` can read it via `getContext(token)` without re-uploading. Both the PDF and the context expire together.
- Purge lazily on lookup and via a single `setInterval` sweep; clear the interval on shutdown.
- Documented limitation: memory-only, single process, lost on restart. Do not pretend it survives horizontal scaling.

## 11. Error handling

- Use a single `AppError` class carrying an HTTP status and a safe message.
- Register one global error handler in `app.ts` that returns `{ "error": { "code": "...", "message": "..." } }`.
- Log the full error server-side; return only the safe message to the client.
- Never expose stack traces, provider payloads, or file system paths.

## 12. Engineering standards

- TypeScript strict; no `any` in public function signatures.
- Validate all external input (HTTP and LLM output) before use.
- No secrets or PII in logs.
- Keep dependencies minimal; justify any new runtime dependency in the PR/commit message.
- Tests: add unit tests for `extractText`, `tailor` (mocked), `promptSafety`, `generatePdf`, `scoreAts`, and `tokenStore` expiry. Integration-test the route with `fastify.inject`.

## 13. Scripts

```bash
npm run dev        # tsx watch src/server.ts
npm run build      # tsc -p tsconfig.build.json (excludes tests)
npm run start      # node dist/server.js
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest run
```

Always run `lint` and `typecheck` before considering a task done.

Note: `pdf-parse` is v2 — use `new PDFParse({ data }).getText()` and call `destroy()`. `GEMINI_API_KEY` must be set (tests use a dummy via `vitest.config.ts`).

## 14. Future work (out of scope for now)

Diff view, Match Score UI, multiple versions, section-wise customization, authentication/history, streaming responses. Add these only after updating this document and the frontend Agent guide.
