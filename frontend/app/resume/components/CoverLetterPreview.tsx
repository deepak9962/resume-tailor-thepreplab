import type { CoverLetter, CustomizedResume } from '@/app/resume-tailor/types'

interface CoverLetterPreviewProps {
  letter: CoverLetter
  resume: CustomizedResume
}

export const CoverLetterPreview = ({ letter, resume }: CoverLetterPreviewProps) => (
  <article className="mx-auto w-full max-w-[820px] rounded-xl border border-slate-200 bg-white p-8 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.35)] sm:p-10">
    <header className="flex flex-col items-center gap-1 border-b border-slate-200 pb-5 text-center">
      <h2 className="text-2xl font-bold tracking-tight text-[#1F3864] sm:text-3xl">
        {resume.name || 'Cover Letter'}
      </h2>
      {resume.title && <p className="text-sm text-slate-700">{resume.title}</p>}
      {resume.contact && <p className="text-xs leading-relaxed text-slate-500">{resume.contact}</p>}
    </header>

    <div className="mt-6 flex flex-col gap-4 text-[13px] leading-relaxed text-slate-700">
      {letter.greeting && <p className="font-semibold text-slate-900">{letter.greeting}</p>}
      {letter.opening && <p>{letter.opening}</p>}

      {letter.bullets.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {letter.bullets.map((bullet, index) => (
            <li key={index} className="flex gap-2.5">
              <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {letter.closing && <p>{letter.closing}</p>}
      {letter.signOff && <p className="whitespace-pre-line text-slate-900">{letter.signOff}</p>}
    </div>
  </article>
)
