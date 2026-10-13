'use client'

import { useSyncExternalStore, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DownloadButton } from '@/app/resume-tailor/components/DownloadButton'
import {
  clearLastCoverLetter,
  clearLastTailorResult,
  getLastTailorResult,
  getServerLastTailorResult,
  subscribeLastTailorResult,
} from '@/app/resume-tailor/storage'
import { CoverLetterPanel } from './components/CoverLetterPanel'
import { AtsCard } from './components/AtsCard'
import { MatchCard } from './components/MatchCard'
import { ResumePreview } from './components/ResumePreview'

const subscribeNoop = (): (() => void) => () => {}
const getHydrated = (): boolean => true
const getServerHydrated = (): boolean => false

const TAB_CLASS = (active: boolean): string =>
  `rounded-md px-4 py-1.5 text-sm font-medium transition ${
    active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
  }`

const EmptyState = () => (
  <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
        <path
          d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </span>
    <div className="flex flex-col gap-1">
      <h1 className="text-lg font-semibold text-slate-900">No resume to show yet</h1>
      <p className="text-sm text-slate-600">
        Tailor a resume first and we&apos;ll display it here with a match breakdown.
      </p>
    </div>
    <Link
      href="/"
      className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
    >
      Tailor a resume
    </Link>
  </div>
)

export const ResumeResult = () => {
  const router = useRouter()
  const [view, setView] = useState<'resume' | 'cover-letter'>('resume')
  const hydrated = useSyncExternalStore(subscribeNoop, getHydrated, getServerHydrated)
  const response = useSyncExternalStore(
    subscribeLastTailorResult,
    getLastTailorResult,
    getServerLastTailorResult,
  )

  const startOver = () => {
    clearLastTailorResult()
    clearLastCoverLetter()
    router.push('/')
  }

  return (
    <main className="min-h-screen w-full bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              Resume Tailor
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-semibold text-slate-900">Tailored result</span>
          </div>
          <div className="flex items-center gap-3">
            {response && <DownloadButton token={response.token} />}
            <button
              type="button"
              onClick={startOver}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Start over
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {!hydrated && <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm" />}

        {hydrated && !response && <EmptyState />}

        {hydrated && response && (
          <>
            <div
              role="tablist"
              aria-label="Result view"
              className="mb-6 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
            >
              <button
                type="button"
                role="tab"
                aria-selected={view === 'resume'}
                onClick={() => setView('resume')}
                className={TAB_CLASS(view === 'resume')}
              >
                Resume
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'cover-letter'}
                onClick={() => setView('cover-letter')}
                className={TAB_CLASS(view === 'cover-letter')}
              >
                Cover letter
              </button>
            </div>

            {view === 'resume' ? (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <ResumePreview resume={response.result.customizedResume} />
                <div className="flex flex-col gap-6 self-start lg:sticky lg:top-24">
                  <MatchCard analysis={response.result.analysis} />
                  {response.result.ats && <AtsCard ats={response.result.ats} />}
                </div>
              </div>
            ) : (
              <CoverLetterPanel
                token={response.token}
                resume={response.result.customizedResume}
              />
            )}
          </>
        )}
      </div>
    </main>
  )
}
