import type { ReactNode } from 'react'

interface RichTextProps {
  text: string
  boldClassName?: string
}

export const RichText = ({
  text,
  boldClassName = 'font-semibold text-slate-900',
}: RichTextProps): ReactNode => (
  <>
    {text
      .split(/(\*\*[^*]+\*\*)/g)
      .filter((part) => part !== '')
      .map((part, index) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={index} className={boldClassName}>
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
  </>
)
