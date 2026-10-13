'use client'

import { useElapsedTime } from './useElapsedTime'

interface GeneratingFeedbackProps {
  messages: string[]
  compact?: boolean
}

const BAR_STEPS = [
  'w-0',
  'w-[5%]',
  'w-[10%]',
  'w-[15%]',
  'w-[20%]',
  'w-[25%]',
  'w-[30%]',
  'w-[35%]',
  'w-[40%]',
  'w-[45%]',
  'w-[50%]',
  'w-[55%]',
  'w-[60%]',
  'w-[65%]',
  'w-[70%]',
  'w-[75%]',
  'w-[80%]',
  'w-[85%]',
  'w-[90%]',
  'w-[95%]',
]

const messageFor = (messages: string[], seconds: number): string => {
  const index = seconds < 5 ? 0 : seconds < 15 ? 1 : seconds < 35 ? 2 : 3
  return messages[Math.min(index, messages.length - 1)]
}

const barFor = (seconds: number): string => {
  const progress = Math.min(95, Math.round(100 * (1 - Math.exp(-seconds / 40))))
  return BAR_STEPS[Math.min(BAR_STEPS.length - 1, Math.round(progress / 5))]
}

const ProgressBar = ({ className }: { className: string }) => (
  <span
    aria-hidden
    className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200"
  >
    <span
      className={`block h-full rounded-full bg-blue-500 transition-[width] duration-700 ease-out ${className}`}
    />
  </span>
)

const Timer = ({ seconds }: { seconds: number }) => (
  <span aria-hidden className="text-xs tabular-nums text-slate-500">
    {seconds}s elapsed
  </span>
)

export const GeneratingFeedback = ({ messages, compact = false }: GeneratingFeedbackProps) => {
  const seconds = useElapsedTime()
  const bar = barFor(seconds)

  if (compact) {
    return (
      <div role="status" aria-live="polite" className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600 motion-reduce:animate-none"
          />
          <span className="text-sm font-medium text-slate-700">
            {messageFor(messages, seconds)}
          </span>
        </div>
        <ProgressBar className={bar} />
        <Timer seconds={seconds} />
      </div>
    )
  }

  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-6">
      <span className="relative flex h-16 w-16 items-center justify-center">
        <span
          aria-hidden
          className="absolute h-full w-full animate-ping rounded-full bg-blue-200 opacity-60 motion-reduce:animate-none"
        />
        <span
          aria-hidden
          className="h-16 w-16 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600 motion-reduce:animate-none"
        />
      </span>
      <div className="flex w-full max-w-xs flex-col items-center gap-3 px-6 text-center">
        <p className="text-sm font-medium text-slate-800">{messageFor(messages, seconds)}</p>
        <ProgressBar className={bar} />
        <Timer seconds={seconds} />
        <p className="text-xs text-slate-500">
          Usually a few seconds, but it can take up to a minute when the AI is busy.
        </p>
      </div>
    </div>
  )
}
