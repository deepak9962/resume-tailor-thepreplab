'use client'

import { useRef, useSyncExternalStore, useState } from 'react'
import { generateCoverLetter } from '@/app/resume-tailor/api'
import { DownloadButton } from '@/app/resume-tailor/components/DownloadButton'
import { ErrorBanner } from '@/app/resume-tailor/components/ErrorBanner'
import { GeneratingFeedback } from '@/app/resume-tailor/components/GeneratingFeedback'
import {
  getLastCoverLetter,
  getServerLastCoverLetter,
  saveLastCoverLetter,
  subscribeLastCoverLetter,
} from '@/app/resume-tailor/storage'
import type { CoverLetterTone, CustomizedResume } from '@/app/resume-tailor/types'
import { CoverLetterAnalysis } from './CoverLetterAnalysis'
import { CoverLetterPreview } from './CoverLetterPreview'

const subscribeNoop = (): (() => void) => () => {}
const getHydrated = (): boolean => true
const getServerHydrated = (): boolean => false

const TONES: { value: CoverLetterTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'warm', label: 'Warm' },
  { value: 'direct', label: 'Direct' },
]

const GENERATING_MESSAGES = [
  'Reading the job description and your resume…',
  'Drafting your cover letter…',
  'Refining the wording and structure…',
  'The AI is taking longer than usual, so hang tight.',
]

const fieldClassName =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100'

interface CoverLetterPanelProps {
  token: string
  resume: CustomizedResume
}

export const CoverLetterPanel = ({ token, resume }: CoverLetterPanelProps) => {
  const hydrated = useSyncExternalStore(subscribeNoop, getHydrated, getServerHydrated)
  const saved = useSyncExternalStore(
    subscribeLastCoverLetter,
    getLastCoverLetter,
    getServerLastCoverLetter,
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const scrollToTop = () => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const [companyName, setCompanyName] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [tone, setTone] = useState<CoverLetterTone>('professional')
  const [candidateNotes, setCandidateNotes] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showForm = isEditing || !saved

  const handleGenerate = async () => {
    if (isGenerating) return
    setIsGenerating(true)
    setError(null)

    try {
      const response = await generateCoverLetter(token, {
        companyName,
        roleTitle,
        candidateNotes,
        tone,
      })
      saveLastCoverLetter(response)
      setIsEditing(false)
      scrollToTop()
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerate = () => {
    setError(null)
    setIsEditing(true)
    scrollToTop()
  }

  return (
    <div ref={containerRef} className="flex scroll-mt-24 flex-col gap-6">
      {!hydrated && <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm" />}

      {hydrated && showForm && (
        <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-slate-900">Cover letter</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              We&apos;ll write a specific, truthful cover letter from your tailored resume and the
              job description. Add any details you want included.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cover-letter-company" className="text-xs font-medium text-slate-600">
                Company (optional)
              </label>
              <input
                id="cover-letter-company"
                type="text"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Inferred from the job description"
                disabled={isGenerating}
                className={fieldClassName}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cover-letter-role" className="text-xs font-medium text-slate-600">
                Role title (optional)
              </label>
              <input
                id="cover-letter-role"
                type="text"
                value={roleTitle}
                onChange={(event) => setRoleTitle(event.target.value)}
                placeholder="Inferred from the job description"
                disabled={isGenerating}
                className={fieldClassName}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cover-letter-tone" className="text-xs font-medium text-slate-600">
              Tone
            </label>
            <select
              id="cover-letter-tone"
              value={tone}
              onChange={(event) => setTone(event.target.value as CoverLetterTone)}
              disabled={isGenerating}
              className={fieldClassName}
            >
              {TONES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cover-letter-notes" className="text-xs font-medium text-slate-600">
              Anything else to include? (optional)
            </label>
            <textarea
              id="cover-letter-notes"
              value={candidateNotes}
              onChange={(event) => setCandidateNotes(event.target.value)}
              rows={3}
              placeholder="Extra true facts only, for example: I can relocate, or I use Claude Code daily."
              disabled={isGenerating}
              className={`${fieldClassName} resize-y`}
            />
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-100 pt-5">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isGenerating ? 'Writing…' : saved ? 'Write again' : 'Write cover letter'}
              </button>
              {saved && !isGenerating && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Cancel
                </button>
              )}
              {!isGenerating && (
                <span className="text-xs text-slate-500">One page, tailored to this role.</span>
              )}
            </div>

            {isGenerating && <GeneratingFeedback messages={GENERATING_MESSAGES} compact />}

            <div aria-live="polite">{error && <ErrorBanner message={error} />}</div>
          </div>
        </section>
      )}

      {hydrated && !showForm && saved && (
        <>
          <div>
            <button
              type="button"
              onClick={handleRegenerate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                <path
                  d="M4 4v5h5M20 20v-5h-5M20 9a8 8 0 0 0-14.3-2.3M4 15a8 8 0 0 0 14.3 2.3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Regenerate
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex flex-col gap-4">
              <CoverLetterPreview letter={saved.result.coverLetter} resume={resume} />
              <div className="mx-auto w-full max-w-[820px]">
                <DownloadButton token={saved.token} label="Download cover letter PDF" />
              </div>
            </div>
            <div className="self-start lg:sticky lg:top-24">
              <CoverLetterAnalysis analysis={saved.result.analysis} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
