import type { ReactNode } from 'react'
import type { TailorAnalysis } from '@/app/resume-tailor/types'

interface MatchCardProps {
  analysis: TailorAnalysis
}

const RADIUS = 34
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const ScoreRing = ({ score }: { score: number }) => (
  <div className="relative h-24 w-24 shrink-0">
    <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
      <circle
        cx="40"
        cy="40"
        r={RADIUS}
        fill="none"
        strokeWidth="8"
        className="stroke-slate-200"
      />
      <circle
        cx="40"
        cy="40"
        r={RADIUS}
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - score / 100)}
        className="stroke-[#1F3864] transition-[stroke-dashoffset] duration-700"
      />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-2xl font-bold text-slate-900">{score}</span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
        match
      </span>
    </div>
  </div>
)

const Chip = ({ label, tone }: { label: string; tone: 'matched' | 'missing' }) => (
  <span
    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
      tone === 'matched'
        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100'
        : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100'
    }`}
  >
    {label}
  </span>
)

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-2">
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1F3864]">
      {title}
    </h3>
    {children}
  </div>
)

export const MatchCard = ({ analysis }: MatchCardProps) => {
  const score = Math.max(0, Math.min(100, Math.round(analysis.matchScore)))

  return (
    <aside className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-5">
        <ScoreRing score={score} />
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-slate-900">Overall match</h2>
          <p className="text-xs leading-relaxed text-slate-600">
            How well your tailored resume aligns with the job description.
          </p>
        </div>
      </div>

      <Group title="Matched keywords">
        {analysis.matchedKeywords.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {analysis.matchedKeywords.map((keyword, index) => (
              <Chip key={index} label={keyword} tone="matched" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">None identified.</p>
        )}
      </Group>

      <Group title="Missing keywords">
        {analysis.missingKeywords.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {analysis.missingKeywords.map((keyword, index) => (
              <Chip key={index} label={keyword} tone="missing" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">None identified.</p>
        )}
      </Group>

      {analysis.gaps.length > 0 && (
        <Group title="Gaps to address">
          <ul className="flex flex-col gap-2.5 text-sm text-slate-700">
            {analysis.gaps.map((gap, index) => (
              <li key={index} className="border-l-2 border-amber-200 pl-3">
                <span className="font-medium text-slate-900">{gap.gap}</span>
                <span className="block text-slate-600">{gap.note}</span>
              </li>
            ))}
          </ul>
        </Group>
      )}

      {analysis.changesSummary.length > 0 && (
        <Group title="What changed">
          <ul className="flex flex-col gap-1.5 text-sm text-slate-700">
            {analysis.changesSummary.map((change, index) => (
              <li key={index} className="flex gap-2">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>{change}</span>
              </li>
            ))}
          </ul>
        </Group>
      )}
    </aside>
  )
}
