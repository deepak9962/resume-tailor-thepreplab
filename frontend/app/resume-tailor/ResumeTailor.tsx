'use client'

import { startTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MIN_JD_LENGTH, tailorResume } from './api'
import { ErrorBanner } from './components/ErrorBanner'
import { FullPageLoader } from './components/FullPageLoader'
import { JobDescriptionInput } from './components/JobDescriptionInput'
import { ResumeUpload } from './components/ResumeUpload'
import { saveLastTailorResult } from './storage'

type Status = 'idle' | 'processing' | 'error'

export const ResumeTailor = () => {
  const router = useRouter()
  const [jobDescription, setJobDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const isProcessing = status === 'processing'
  const canSubmit =
    !isProcessing && jobDescription.trim().length >= MIN_JD_LENGTH && file !== null

  const handleSubmit = async () => {
    if (!canSubmit || !file) return

    setStatus('processing')
    setError(null)

    try {
      const result = await tailorResume(jobDescription.trim(), file)
      saveLastTailorResult(result)
      startTransition(() => {
        setStatus('idle')
        router.push('/resume')
      })
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Something went wrong. Please try again.',
      )
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
        <header className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            AI resume tailoring
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Resume Tailor
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Paste a job description and upload your resume. We&apos;ll rewrite it to match the role
            without inventing anything.
          </p>
        </header>

        <section className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <JobDescriptionInput
            value={jobDescription}
            onChange={setJobDescription}
            onSubmit={handleSubmit}
            disabled={isProcessing}
          />

          <ResumeUpload file={file} onFileSelect={setFile} disabled={isProcessing} />

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isProcessing ? 'Tailoring…' : 'Tailor Resume'}
            </button>
            <span className="text-xs text-slate-500">
              Your resume and the job description are never stored on our servers.
            </span>
          </div>

          {status === 'error' && error && <ErrorBanner message={error} />}
        </section>
      </div>

      {isProcessing && <FullPageLoader />}
    </main>
  )
}
