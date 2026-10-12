'use client'

import { useRef, useState } from 'react'
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES } from '../api'

interface ResumeUploadProps {
  file: File | null
  onFileSelect: (file: File | null) => void
  disabled: boolean
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const validate = (file: File): string | null => {
  const name = file.name.toLowerCase()
  if (!ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension))) {
    return 'Only PDF and DOCX files are supported.'
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'This file is larger than the 5 MB limit.'
  }
  return null
}

export const ResumeUpload = ({ file, onFileSelect, disabled }: ResumeUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectFile = (selected: File | null) => {
    if (!selected) {
      onFileSelect(null)
      setError(null)
      return
    }
    const message = validate(selected)
    setError(message)
    onFileSelect(message ? null : selected)
  }

  const clear = () => {
    if (inputRef.current) inputRef.current.value = ''
    selectFile(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">Resume</span>

      <input
        ref={inputRef}
        id="resume-file"
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          if (!disabled) selectFile(event.dataTransfer.files?.[0] ?? null)
        }}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50'
        }`}
      >
        <span className="text-sm font-medium text-slate-700">
          {file ? 'Replace resume' : `Drag & drop your resume or click to browse`}
        </span>
        <span className="text-xs text-slate-500">PDF or DOCX, up to 5 MB</span>
      </button>

      {file && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <span className="truncate text-slate-700">
            {file.name} <span className="text-slate-400">({formatSize(file.size)})</span>
          </span>
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="ml-3 shrink-0 text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-60"
            aria-label="Remove selected resume"
          >
            Remove
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
