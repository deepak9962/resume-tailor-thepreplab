import { downloadUrl } from '../api'

interface DownloadButtonProps {
  token: string
  label?: string
}

export const DownloadButton = ({ token, label = 'Download tailored PDF' }: DownloadButtonProps) => (
  <div className="flex flex-col items-start gap-1">
    <a
      href={downloadUrl(token)}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      {label}
    </a>
    <span className="text-xs text-slate-500">This download link expires 5 minutes after creation.</span>
  </div>
)
