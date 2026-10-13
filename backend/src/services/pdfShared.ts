import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const MM = 72 / 25.4
export const MARGIN_LEFT = 12 * MM
export const MARGIN_RIGHT = 12 * MM
export const MARGIN_TOP = 8 * MM
export const MARGIN_BOTTOM = 8 * MM

export const NAVY = '#1F3864'
export const LINK = '#0563C1'
export const BLACK = '#000000'

export const LEADING_FACTOR = 1.32
export const NAME_SIZE = 24
export const NAME_LEADING = 28
export const BASE_SIZE = 11
export const BODY_SIZES = [BASE_SIZE, BASE_SIZE - 0.5, BASE_SIZE - 1]

export const SECTION_SPACER = 4
export const SECTION_RULE_WIDTH = 1.2
export const ROLE_SPACER = 3
export const BULLET_INDENT = 12

export const pageMargins = () => ({
  top: MARGIN_TOP,
  bottom: MARGIN_BOTTOM,
  left: MARGIN_LEFT,
  right: MARGIN_RIGHT,
})

const FONT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'assets',
  'fonts',
)
const FONT_REGULAR = path.join(FONT_DIR, 'Carlito-Regular.ttf')
const FONT_BOLD = path.join(FONT_DIR, 'Carlito-Bold.ttf')
const FONT_ITALIC = path.join(FONT_DIR, 'Carlito-Italic.ttf')
const FONT_BOLD_ITALIC = path.join(FONT_DIR, 'Carlito-BoldItalic.ttf')

const EMAIL_RE = /^[^\s@,;|]+@[^\s@,;|]+\.[^\s@,;|]+$/
const URL_RE = /^(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s,;|]*)?$/i
const EMAIL_FIND = /[^\s@,;|]+@[^\s@,;|]+\.[^\s@,;|]+/
const PROTO_URL_FIND = /(?:https?:\/\/|www\.)[^\s,;|]+/i
const BARE_URL_FIND =
  /(?:[a-z0-9-]+\.)+(?:com|org|net|io|dev|me|co|edu|gov|ai|app|info|biz|xyz|tech|site|online|club|live|link)(?:\/[^\s,;|]*)?/i

export const registerFonts = (doc: PDFKit.PDFDocument): void => {
  doc.registerFont('Carlito', FONT_REGULAR)
  doc.registerFont('Carlito-Bold', FONT_BOLD)
  doc.registerFont('Carlito-Italic', FONT_ITALIC)
  doc.registerFont('Carlito-BoldItalic', FONT_BOLD_ITALIC)
}

export const style = (
  doc: PDFKit.PDFDocument,
  font: string,
  size: number,
  color: string,
  leading: number,
): number => {
  doc.font(font).fontSize(size).fillColor(color)
  return Math.max(0, leading - doc.currentLineHeight())
}

export type Run = { text: string; bold: boolean }

export const parseBold = (text: string): Run[] =>
  text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((segment) => segment !== '')
    .map((segment) =>
      segment.startsWith('**') && segment.endsWith('**')
        ? { text: segment.slice(2, -2), bold: true }
        : { text: segment, bold: false },
    )

export const bullets = (doc: PDFKit.PDFDocument, items: string[], fs: number, LD: number): void => {
  if (items.length === 0) return
  const left = doc.page.margins.left
  const textX = left + BULLET_INDENT
  const width = doc.page.width - doc.page.margins.right - textX

  for (const item of items) {
    const y = doc.y
    const gap = style(doc, 'Carlito', fs, BLACK, LD)
    doc.fillColor(BLACK).text('•', left + 2, y, { lineBreak: false })

    const runs = parseBold(item)
    runs.forEach((run, index) => {
      const isLast = index === runs.length - 1
      doc.font(run.bold ? 'Carlito-Bold' : 'Carlito').fontSize(fs).fillColor(BLACK)
      if (index === 0) {
        doc.text(run.text, textX, y, { width, lineGap: gap, continued: !isLast })
      } else {
        doc.text(run.text, { width, lineGap: gap, continued: !isLast })
      }
    })
  }
}

const linkFor = (token: string): string | undefined => {
  if (EMAIL_RE.test(token)) return `mailto:${token}`
  if (URL_RE.test(token)) return token.startsWith('http') ? token : `https://${token}`
  return undefined
}

export const contactParts = (contact: string): { text: string; link?: string }[] => {
  const tokens = contact
    .replace(/[\r\n\t]+/g, '|')
    .replace(/[•·]/g, '|')
    .split('|')
    .map((token) => token.replace(/\s+/g, ' ').trim())
    .filter((token) => token !== '')

  const parts: { text: string; link?: string }[] = []
  tokens.forEach((token, index) => {
    if (index > 0) parts.push({ text: ' | ' })

    const anchored = linkFor(token)
    if (anchored) {
      parts.push({ text: token, link: anchored })
      return
    }

    const found = token.match(EMAIL_FIND) ?? token.match(PROTO_URL_FIND) ?? token.match(BARE_URL_FIND)
    if (found && found.index !== undefined && found.index >= 0) {
      const start = found.index
      const end = start + found[0].length
      if (start > 0) parts.push({ text: token.slice(0, start) })
      parts.push({ text: found[0], link: linkFor(found[0]) })
      if (end < token.length) parts.push({ text: token.slice(end) })
      return
    }

    parts.push({ text: token })
  })
  return parts
}

export const contactLine = (
  doc: PDFKit.PDFDocument,
  contact: string,
  fs: number,
  LD: number,
): void => {
  const left = doc.page.margins.left
  const contentWidth = doc.page.width - left - doc.page.margins.right
  const parts = contactParts(contact)

  let size = fs - 0.5
  while (size > 8) {
    doc.font('Carlito').fontSize(size)
    const measured = parts.reduce((sum, part) => sum + doc.widthOfString(part.text), 0)
    if (measured <= contentWidth) break
    size -= 0.5
  }
  doc.font('Carlito').fontSize(size)

  const widths = parts.map((part) => doc.widthOfString(part.text))
  const total = widths.reduce((sum, width) => sum + width, 0)
  const gap = Math.max(0, LD - doc.currentLineHeight())

  if (total > contentWidth) {
    doc
      .fillColor(BLACK)
      .font('Carlito')
      .fontSize(fs - 0.5)
      .text(contact, { align: 'center', lineGap: gap })
    return
  }

  const startX = left + (contentWidth - total) / 2
  const y = doc.y
  let x = startX
  parts.forEach((part, index) => {
    const width = widths[index] ?? 0
    doc.fillColor(part.link ? LINK : BLACK).font('Carlito').fontSize(size)
    doc.text(part.text, x, y, { lineBreak: false, underline: Boolean(part.link) })
    if (part.link) {
      doc.link(x, y, width, doc.currentLineHeight(), part.link)
    }
    x += width
  })
  doc.x = left
  doc.y = y + LD
}
