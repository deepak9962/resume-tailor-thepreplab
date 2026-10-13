import type { ReactNode } from 'react'
import type { CoverLetterAnalysis as CoverLetterAnalysisData } from '@/app/resume-tailor/types'

interface CoverLetterAnalysisProps {
  analysis: CoverLetterAnalysisData
}

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-2">
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1F3864]">
      {title}
    </h3>
    {children}
  </div>
)

export const CoverLetterAnalysis = ({ analysis }: CoverLetterAnalysisProps) => (
  <aside className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold text-slate-900">Why this letter</h2>
      <p className="text-xs leading-relaxed text-slate-600">
        The JD priorities the letter targets and the resume facts behind every claim.
      </p>
    </div>

    <Group title="JD priorities">
      {analysis.jdPriorities.length > 0 ? (
        <ul className="flex flex-col gap-1.5 text-sm text-slate-700">
          {analysis.jdPriorities.map((priority, index) => (
            <li key={index} className="flex gap-2">
              <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>{priority}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">None identified.</p>
      )}
    </Group>

    {analysis.evidenceUsed.length > 0 && (
      <Group title="Evidence used">
        <ul className="flex flex-col gap-2.5 text-sm text-slate-700">
          {analysis.evidenceUsed.map((item, index) => (
            <li key={index} className="border-l-2 border-emerald-200 pl-3">
              <span className="font-medium text-slate-900">{item.requirement}</span>
              <span className="block text-slate-600">{item.resumeFact}</span>
            </li>
          ))}
        </ul>
      </Group>
    )}

    {analysis.unsupportedRequirements.length > 0 && (
      <Group title="Left out (not supported)">
        <ul className="flex flex-col gap-2.5 text-sm text-slate-700">
          {analysis.unsupportedRequirements.map((requirement, index) => (
            <li key={index} className="border-l-2 border-amber-200 pl-3">
              {requirement}
            </li>
          ))}
        </ul>
      </Group>
    )}
  </aside>
)
