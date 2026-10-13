const RADIUS = 34
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface ScoreRingProps {
  score: number
  label: string
}

export const ScoreRing = ({ score, label }: ScoreRingProps) => {
  const value = Math.max(0, Math.min(100, Math.round(score)))

  return (
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
          strokeDashoffset={CIRCUMFERENCE * (1 - value / 100)}
          className="stroke-[#1F3864] transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
      </div>
    </div>
  )
}
