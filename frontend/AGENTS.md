<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Frontend (Resume Tailor UI)

Guidelines for humans and AI agents working on the frontend. Keep this file in sync with the code. The block above is machine-managed — never edit or remove it.

## 1. Purpose

A two-route app. `/` collects a job description and a resume and sends them to the backend `POST /resume-tailor`. `/resume` renders the tailored result (paper preview + match card + ATS-friendliness card) with a 5-minute expiring PDF download link, plus a **Cover letter** tab that generates a matching cover letter on demand (`POST /cover-letter`) and offers its own expiring PDF download.

Scope is intentionally small and human-maintainable. No auth, no database, no global state library.

## 2. Stack

- Next.js 16, App Router, React 19, TypeScript (strict).
- Tailwind CSS v4.
- Two routes: `/` and `/resume`. Path alias `@/*` maps to the project root.
- Backend base URL from `NEXT_PUBLIC_API_URL`.

> Before writing Next.js code, consult `node_modules/next/dist/docs/` — this version differs from older training data (see the block above).

## 3. Directory layout

```
app/
  layout.tsx
  page.tsx                    # renders <ResumeTailor />
  resume/
    page.tsx                  # /resume route: renders <ResumeResult />
    ResumeResult.tsx          # client container: reads the last result from sessionStorage
    components/
      ResumePreview.tsx       # paper-style resume
      MatchCard.tsx           # analysis panel (score, keywords, gaps, changes)
      ScoreRing.tsx           # shared circular score gauge (match + ATS)
      AtsCard.tsx             # ATS-friendliness score + pass/fail checklist
      CoverLetterPanel.tsx    # cover letter tab: options form + generate + result
      CoverLetterPreview.tsx  # paper-style cover letter
      CoverLetterAnalysis.tsx # why-this-letter panel (priorities, evidence, left-out)
  resume-tailor/
    index.ts                  # barrel export
    ResumeTailor.tsx          # container: owns state machine + submit handler
    api.ts                    # typed fetch wrapper for the backend
    storage.ts                # sessionStorage-backed store for the last result
    types.ts                  # TailorResult, ApiError, TailorResponse
    components/
      JobDescriptionInput.tsx
      ResumeUpload.tsx
      ErrorBanner.tsx
      DownloadButton.tsx
      RichText.tsx            # renders **bold** spans as <strong>
      FullPageLoader.tsx      # full-screen overlay during a request
      GeneratingFeedback.tsx  # animated spinner + rotating status + elapsed timer + progress bar
      useElapsedTime.ts       # hook: elapsed seconds while mounted (drives GeneratingFeedback)
```

One component per file with a single responsibility. Presentational components take props and stay dumb; `ResumeTailor.tsx` owns state and side effects.

## 4. Environment

| Variable             | Required | Default                 | Notes                         |
| -------------------- | -------- | ----------------------- | ----------------------------- |
| `NEXT_PUBLIC_API_URL`| yes      | `http://localhost:3001` | Backend origin, no trailing `/` |

Committed `.env.example` documents it; `.env.local` is git-ignored. Never put server secrets (e.g. `GEMINI_API_KEY`) in the frontend — it runs in the browser.

## 5. UX requirements

- Centered layout. A textarea for the full JD and, in the center of the screen, a file upload area supporting both click-to-select and drag-and-drop.
- After a file is selected, show its name and a human-readable size.
- A primary "Tailor Resume" button. Pressing Enter in the JD textarea also submits.
- The button is disabled until the JD is within `MIN_JD_LENGTH`–`MAX_JD_LENGTH` and a valid file is selected.
- While the request is in flight, show a full-page loading overlay (`FullPageLoader`) built on `GeneratingFeedback`: a spinner, a message that advances with elapsed time, a running seconds counter and a decorative progress bar. The AI call can take up to a minute, so the copy must not promise "a few seconds" as an upper bound.
- On success, save the response to `sessionStorage` and navigate to `/resume`, which shows the tailored resume in a paper-style read-only preview plus a match card, and a Download button pointing at `GET /download/:token`.
- `/resume` has a **Resume | Cover letter** segmented control. The cover letter tab collects optional company, role, tone and notes, then calls `POST /cover-letter` on demand using the resume token; the result is saved to `sessionStorage` and shown with its own Download button.
- On failure, show a friendly message via `ErrorBanner` and allow retry.

## 6. State machine

`ResumeTailor.tsx` drives one explicit state:

```
idle -> processing -> (navigate to /resume)
                  \-> error -> (retry) idle
```

- Keep it in local `useState`. No Redux/Zustand.
- Keep JD text, selected file, and error in component state.
- No `useEffect` for data fetching; submit runs from the user event handler.
- On success, reset `status` to `idle` and `router.push('/resume')` inside `startTransition` so the overlay stays up until navigation commits (and the home form is not left stuck in `processing` when the user navigates back).

## 7. Validation (client-side, mirrors the backend)

- JD: trimmed length `>= MIN_JD_LENGTH` (100) and `<= MAX_JD_LENGTH` (6000). Show inline helper/error text and `aria-invalid`; the submit button stays disabled when out of range.
- Cover letter optional fields: `companyName`/`roleTitle` cap at 120 and `candidateNotes` at 2000 (`COVER_LETTER_LIMITS`), enforced with `maxLength` (a counter shows the notes usage).
- File: accept `.pdf,.docx`, reject others; max 5 MB. Validate again before submit.
- Client checks are UX only — the backend is the source of truth. Never rely on them for security.

## 8. Backend integration (`api.ts`)

- `tailorResume(jobDescription, file)` builds `FormData` and `POST`s to `${NEXT_PUBLIC_API_URL}/resume-tailor`.
- Client-side bounds mirror the backend (`MIN_JD_LENGTH`/`MAX_JD_LENGTH`, `COVER_LETTER_LIMITS` in `api.ts`); keep them in sync when the backend limits change.
- Parse the backend error shape `{ error: { code, message } }` and turn it into a user-safe message.
- Handle timeouts and network failures distinctly from validation errors; both surface through `ErrorBanner`.
- Requests are bounded client-side: `api.ts` aborts after `REQUEST_TIMEOUT_MS` (180s) via an `AbortController` so a hung call degrades to a clear "taking longer than expected" message instead of spinning forever. Keep this comfortably above the backend's worst case (~60s timeout + one retry).
- Reuse the backend contract in `types.ts` so both sides stay consistent. `POST /resume-tailor` returns `{ token, expiresAt, result }` where `result` is `{ customizedResume, analysis, ats? }` (camelCase). `ats` is the optional ATS report. Update both guides together when it changes.
- `generateCoverLetter(token, options)` posts JSON to `${NEXT_PUBLIC_API_URL}/cover-letter` and returns `{ token, expiresAt, result }` where `result` is `{ coverLetter, analysis }`. The request `token` is the resume token; the response `token` is for the cover-letter PDF.

## 9. Rendering the result

- The result lives on `/resume` (`ResumeResult.tsx`), which reads the last response from the `storage.ts` external store (backed by `sessionStorage`) via `useSyncExternalStore`. A hard refresh keeps the result; if `sessionStorage` is empty it renders an empty state linking back to `/`.
- `ResumePreview` shows read-only resume sections in order: header (name/title/contact), Summary, Skills (grouped), Experience, Projects, Education, Additional.
- `MatchCard` renders the `analysis` as a separate panel: Match Score, Matched Keywords, Missing Keywords, Gaps (gap + note), and Changes Summary. This panel is UI-only and must not be written into the downloaded PDF.
- When the response includes `result.ats`, an `AtsCard` stacks below `MatchCard` in the same sticky sidebar column: the ATS score (shared `ScoreRing`, label `ATS`) plus a pass/fail checklist grouped into "Content & structure" and "PDF parseability", showing each failing check's note. `ats` is optional so older `sessionStorage` results still render (the card is simply skipped).
- Semantic HTML (`section`, `h2`, `ul`/`li`) with Tailwind spacing and typography. No inline styles.
- Bullet strings may contain Markdown `**bold**` spans (the model bolds key metrics/technologies for the PDF). `RichText` renders these as `<strong>` so raw asterisks never appear in the UI.
- Accessibility: label the textarea and file input, use `aria-live="polite"` for loading/errors, ensure keyboard-only upload and download work.
- The download link must reflect that it expires in 5 minutes (e.g. a small caption).
- Navy `#1F3864` accents in the UI echo the generated PDF's headings.
- The cover letter tab (`CoverLetterPanel`) reads/owns the saved `CoverLetterResponse` via the `storage.ts` external store (same `useSyncExternalStore` pattern). It renders `CoverLetterPreview` (paper header from the resume, greeting, opening, bullets, closing, sign-off with preserved line breaks) and `CoverLetterAnalysis` (JD priorities, evidence used, unsupported requirements). That analysis panel is UI-only and never written into the PDF. While generating it shows a `compact` `GeneratingFeedback` beneath the action row.

## 10. Engineering standards

- TypeScript strict; no `any`. Prefer explicit prop types and discriminated unions for state.
- Client components need `"use client"`; keep it at the leaf that needs interactivity.
- No comments unless they explain non-obvious intent.
- Keep dependencies minimal. Do not add a UI kit or form library for this single page.
- Never log or render secrets.

## 11. Scripts

```bash
npm run dev        # next dev
npm run build      # next build
npm run start      # next start
npm run lint       # eslint
npx tsc --noEmit   # typecheck (no dedicated script)
```

Always run `lint` and `tsc --noEmit` before considering a task done.

## 12. Future work (out of scope for now)

Diff view, multiple resume versions, section-wise customization, authentication/history, and streaming responses. Add these only after updating this document and the backend Agent guide.
