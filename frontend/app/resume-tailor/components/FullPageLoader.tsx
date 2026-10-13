import { GeneratingFeedback } from './GeneratingFeedback'

const MESSAGES = [
  'Reading your resume and the job description…',
  'Rewriting your resume to match the role…',
  'Polishing bullet points and keywords…',
  'The AI is taking longer than usual, so hang tight.',
]

export const FullPageLoader = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/85 backdrop-blur-sm">
    <GeneratingFeedback messages={MESSAGES} />
  </div>
)
