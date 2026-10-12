import type { ReactNode } from 'react'
import type {
  CustomizedResume,
  ExperienceItem,
  ProjectItem,
  SkillGroup,
} from '@/app/resume-tailor/types'
import { RichText } from '@/app/resume-tailor/components/RichText'

interface ResumePreviewProps {
  resume: CustomizedResume
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-2.5">
    <h3 className="border-b border-[#1F3864]/70 pb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1F3864]">
      {title}
    </h3>
    {children}
  </section>
)

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="flex flex-col gap-1.5">
    {items.map((item, index) => (
      <li key={index} className="flex gap-2.5 text-[13px] leading-relaxed text-slate-700">
        <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
        <span>
          <RichText text={item} />
        </span>
      </li>
    ))}
  </ul>
)

const SkillRow = ({ group }: { group: SkillGroup }) => (
  <p className="text-[13px] leading-relaxed text-slate-700">
    <span className="font-semibold text-slate-900">{group.category}: </span>
    {group.items.join(', ')}
  </p>
)

const ExperienceBlock = ({ item }: { item: ExperienceItem }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
      <p className="text-sm font-semibold text-slate-900">
        {item.role}
        {item.company && <span className="font-normal text-slate-600"> · {item.company}</span>}
      </p>
      {item.dates && <p className="text-xs italic text-slate-500">{item.dates}</p>}
    </div>
    {item.bullets.length > 0 && <Bullets items={item.bullets} />}
  </div>
)

const ProjectBlock = ({ item }: { item: ProjectItem }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
      {item.tech && <p className="text-xs italic text-slate-500">{item.tech}</p>}
    </div>
    {item.bullets.length > 0 && <Bullets items={item.bullets} />}
  </div>
)

export const ResumePreview = ({ resume }: ResumePreviewProps) => (
  <article className="mx-auto w-full max-w-[820px] rounded-xl border border-slate-200 bg-white p-8 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.35)] sm:p-10">
    <header className="flex flex-col items-center gap-1 border-b border-slate-200 pb-5 text-center">
      <h2 className="text-2xl font-bold tracking-tight text-[#1F3864] sm:text-3xl">
        {resume.name || 'Tailored Resume'}
      </h2>
      {resume.title && <p className="text-sm text-slate-700">{resume.title}</p>}
      {resume.contact && (
        <p className="text-xs leading-relaxed text-slate-500">{resume.contact}</p>
      )}
    </header>

    <div className="mt-6 flex flex-col gap-6">
      {resume.summary && (
        <Section title="Summary">
          <p className="text-[13px] leading-relaxed text-slate-700">{resume.summary}</p>
        </Section>
      )}

      {resume.skills.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-col gap-1.5">
            {resume.skills.map((group, index) => (
              <SkillRow key={index} group={group} />
            ))}
          </div>
        </Section>
      )}

      {resume.experience.length > 0 && (
        <Section title="Experience">
          <div className="flex flex-col gap-4">
            {resume.experience.map((item, index) => (
              <ExperienceBlock key={index} item={item} />
            ))}
          </div>
        </Section>
      )}

      {resume.projects.length > 0 && (
        <Section title="Projects">
          <div className="flex flex-col gap-4">
            {resume.projects.map((item, index) => (
              <ProjectBlock key={index} item={item} />
            ))}
          </div>
        </Section>
      )}

      {resume.education.length > 0 && (
        <Section title="Education">
          <Bullets items={resume.education} />
        </Section>
      )}

      {resume.other.length > 0 && (
        <Section title="Additional">
          <Bullets items={resume.other} />
        </Section>
      )}
    </div>
  </article>
)
