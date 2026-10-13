import type { AtsCheck, AtsReport } from '@/app/resume-tailor/types'
import { ScoreRing } from './ScoreRing'

interface AtsCardProps {
  ats: AtsReport
}

const GROUP_TITLES: Record<string, string> = {
  content: 'Content & structure',
  pdf: 'PDF parseability',
}

const CheckRow = ({ check }: { check: AtsCheck }) => (
  <li className="flex gap-2.5">
    {check.status === 'pass' ? (
      <span
        aria-hidden
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    ) : (
      <span
        aria-hidden
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
          <path d="M12 8v5m0 3h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>
    )}
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-medium text-slate-900">{check.label}</span>
      {check.note && <span className="text-xs leading-relaxed text-slate-600">{check.note}</span>}
    </div>
  </li>
)

const Group = ({ title, checks }: { title: string; checks: AtsCheck[] }) => (
  <div className="flex flex-col gap-3">
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1F3864]">
      {title}
    </h3>
    <ul className="flex flex-col gap-3">
      {checks.map((check) => (
        <CheckRow key={check.id} check={check} />
      ))}
    </ul>
  </div>
)

export const AtsCard = ({ ats }: AtsCardProps) => {
  const content = ats.checks.filter((check) => check.group === 'content')
  const pdf = ats.checks.filter((check) => check.group === 'pdf')

  return (
    <aside className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-5">
        <ScoreRing score={ats.score} label="ATS" />
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-slate-900">ATS friendliness</h2>
          <p className="text-xs leading-relaxed text-slate-600">
            How easily applicant tracking systems can parse and read your resume.
          </p>
        </div>
      </div>

      <Group title={GROUP_TITLES.content} checks={content} />
      <Group title={GROUP_TITLES.pdf} checks={pdf} />
    </aside>
  )
}
