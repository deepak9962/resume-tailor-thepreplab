interface FullPageLoaderProps {
  message?: string
}

export const FullPageLoader = ({
  message = 'Parsing and tailoring your resume…',
}: FullPageLoaderProps) => (
  <div
    role="status"
    aria-live="polite"
    className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white/85 backdrop-blur-sm"
  >
    <span className="relative flex h-16 w-16 items-center justify-center">
      <span className="absolute h-full w-full animate-ping rounded-full bg-blue-200 opacity-60" />
      <span className="h-16 w-16 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
    </span>
    <div className="flex flex-col items-center gap-1 px-6 text-center">
      <p className="text-sm font-medium text-slate-800">{message}</p>
      <p className="text-xs text-slate-500">This usually takes a few seconds.</p>
    </div>
  </div>
)
