'use client'

import { MIN_JD_LENGTH } from '../api'

interface JobDescriptionInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
}

export const JobDescriptionInput = ({
  value,
  onChange,
  onSubmit,
  disabled,
}: JobDescriptionInputProps) => {
  const length = value.trim().length
  const isTooShort = length > 0 && length < MIN_JD_LENGTH

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="job-description" className="text-sm font-medium text-slate-700">
        Job description
      </label>
      <textarea
        id="job-description"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            onSubmit()
          }
        }}
        rows={8}
        placeholder="Paste the full job description here…"
        className="w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-50"
      />
      <p className={`text-xs ${isTooShort ? 'text-amber-600' : 'text-slate-500'}`}>
        {isTooShort
          ? `Add at least ${MIN_JD_LENGTH - length} more characters.`
          : `${length} characters. Press Enter to tailor, Shift+Enter for a new line.`}
      </p>
    </div>
  )
}
