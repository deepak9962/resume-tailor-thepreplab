import type { Metadata } from 'next'
import { ResumeResult } from './ResumeResult'

export const metadata: Metadata = {
  title: 'Tailored resume · Resume Tailor',
}

export default function ResumePage() {
  return <ResumeResult />
}
