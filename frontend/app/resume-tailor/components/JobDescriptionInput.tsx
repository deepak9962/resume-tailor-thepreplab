'use client'

import { MAX_JD_LENGTH, MIN_JD_LENGTH } from '../api'

const format = (value: number): string => value.toLocaleString('en-US')

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
  const isTooLong = length > MAX_JD_LENGTH
  const isInvalid = isTooShort || isTooLong

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
        aria-invalid={isInvalid}
        className={`w-full resize-y rounded-lg border bg-white p-3 text-sm text-slate-900 shadow-sm outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 ${
          isInvalid
            ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-200'
            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
        }`}
      />
      <p className={`text-xs ${isInvalid ? 'text-amber-600' : 'text-slate-500'}`}>
        {isTooShort
          ? `Add at least ${format(MIN_JD_LENGTH - length)} more characters.`
          : isTooLong
            ? `Shorten the job description by ${format(length - MAX_JD_LENGTH)} characters (maximum ${format(MAX_JD_LENGTH)}).`
            : `${format(length)} / ${format(MAX_JD_LENGTH)} characters. Press Enter to tailor, Shift+Enter for a new line.`}
      </p>
    </div>
  )
}
