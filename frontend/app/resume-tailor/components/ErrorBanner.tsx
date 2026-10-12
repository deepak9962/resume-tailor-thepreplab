interface ErrorBannerProps {
  message: string
}

export const ErrorBanner = ({ message }: ErrorBannerProps) => (
  <div
    role="alert"
    aria-live="polite"
    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
  >
    {message}
  </div>
)
