import path from 'node:path'
import { fileURLToPath } from 'node:url'
import PDFDocument from 'pdfkit'
import type { CustomizedResume, TailorResult } from '../schemas/tailorResult.js'

const MM = 72 / 25.4
const MARGIN_LEFT = 12 * MM
const MARGIN_RIGHT = 12 * MM
const MARGIN_TOP = 8 * MM
const MARGIN_BOTTOM = 8 * MM

const NAVY = '#1F3864'
const LINK = '#0563C1'
const BLACK = '#000000'

const NAME_SIZE = 24
const NAME_LEADING = 28
const LEADING_FACTOR = 1.32
const BASE_SIZE = 11
const BODY_SIZES = [BASE_SIZE, BASE_SIZE - 0.5, BASE_SIZE - 1]

const SECTION_SPACER = 4
const SECTION_RULE_WIDTH = 1.2
const ROLE_SPACER = 3
const BULLET_INDENT = 12
const DATES_COLUMN = 40 * MM

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

const linkFor = (token: string): string | undefined => {
  if (EMAIL_RE.test(token)) return `mailto:${token}`
  if (URL_RE.test(token)) return token.startsWith('http') ? token : `https://${token}`
  return undefined
}

const contactParts = (contact: string): { text: string; link?: string }[] => {
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

const registerFonts = (doc: PDFKit.PDFDocument): void => {
  doc.registerFont('Carlito', FONT_REGULAR)
  doc.registerFont('Carlito-Bold', FONT_BOLD)
  doc.registerFont('Carlito-Italic', FONT_ITALIC)
  doc.registerFont('Carlito-BoldItalic', FONT_BOLD_ITALIC)
}

const style = (
  doc: PDFKit.PDFDocument,
  font: string,
  size: number,
  color: string,
  leading: number,
): number => {
  doc.font(font).fontSize(size).fillColor(color)
  return Math.max(0, leading - doc.currentLineHeight())
}

type Run = { text: string; bold: boolean }

const parseBold = (text: string): Run[] =>
  text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((segment) => segment !== '')
    .map((segment) =>
      segment.startsWith('**') && segment.endsWith('**')
        ? { text: segment.slice(2, -2), bold: true }
        : { text: segment, bold: false },
    )

const sectionHeading = (doc: PDFKit.PDFDocument, label: string, fs: number, LD: number): void => {
  doc.y += SECTION_SPACER
  const left = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right
  const gap = style(doc, 'Carlito-Bold', fs + 1.5, NAVY, LD + 2)
  doc.text(label.toUpperCase(), { lineGap: gap })
  const ruleY = doc.y + 1
  doc
    .moveTo(left, ruleY)
    .lineTo(right, ruleY)
    .lineWidth(SECTION_RULE_WIDTH)
    .strokeColor(NAVY)
    .stroke()
  doc.y = ruleY + 3
}

const contactLine = (doc: PDFKit.PDFDocument, contact: string, fs: number, LD: number): void => {
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

const bullets = (doc: PDFKit.PDFDocument, items: string[], fs: number, LD: number): void => {
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

const roleLine = (
  doc: PDFKit.PDFDocument,
  item: CustomizedResume['experience'][number],
  fs: number,
  LD: number,
): void => {
  const left = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right
  const datesX = right - DATES_COLUMN
  const leftWidth = Math.max(0, datesX - left - 6)
  const y = doc.y + 1

  const roleText = item.company ? `${item.role} | ${item.company}` : item.role
  const roleGap = style(doc, 'Carlito-Bold', fs + 0.5, BLACK, LD)
  const natural = doc.currentLineHeight()
  const roleLines = Math.max(1, Math.round(doc.heightOfString(roleText, { width: leftWidth }) / natural))
  const roleHeight = roleLines * LD
  doc.text(roleText, left, y, { width: leftWidth, lineGap: roleGap })

  if (item.dates) {
    const datesGap = style(doc, 'Carlito-Italic', fs, BLACK, LD)
    const datesLines = Math.max(
      1,
      Math.round(doc.heightOfString(item.dates, { width: DATES_COLUMN }) / doc.currentLineHeight()),
    )
    doc.text(item.dates, datesX, y + Math.max(0, roleHeight - datesLines * LD), {
      width: DATES_COLUMN,
      align: 'right',
      lineGap: datesGap,
    })
  }

  doc.x = left
  doc.y = y + roleHeight
}

const renderContent = (
  doc: PDFKit.PDFDocument,
  resume: CustomizedResume,
  fs: number,
): void => {
  const LD = fs * LEADING_FACTOR
  doc.fillColor(NAVY).font('Carlito-Bold').fontSize(NAME_SIZE)
  doc.text(resume.name || 'Resume', {
    align: 'center',
    lineGap: Math.max(0, NAME_LEADING - doc.currentLineHeight()),
  })

  if (resume.title) {
    const gap = style(doc, 'Carlito', fs + 1, BLACK, LD + 1)
    doc.text(resume.title, { align: 'center', lineGap: gap })
  }

  if (resume.contact) {
    contactLine(doc, resume.contact, fs, LD)
  }

  if (resume.summary) {
    sectionHeading(doc, 'Summary', fs, LD)
    const gap = style(doc, 'Carlito', fs, BLACK, LD)
    doc.text(resume.summary, { lineGap: gap })
  }

  if (resume.skills.length > 0) {
    sectionHeading(doc, 'Technical Skills', fs, LD)
    for (const group of resume.skills) {
      const gap = style(doc, 'Carlito-Bold', fs, BLACK, LD)
      doc.text(`${group.category}: `, { continued: true, lineGap: gap })
      doc.font('Carlito').text(group.items.join(', '), { lineGap: gap })
    }
  }

  if (resume.experience.length > 0) {
    sectionHeading(doc, 'Experience', fs, LD)
    resume.experience.forEach((item, index) => {
      if (index > 0) doc.y += ROLE_SPACER
      roleLine(doc, item, fs, LD)
      bullets(doc, item.bullets, fs, LD)
    })
  }

  if (resume.projects.length > 0) {
    sectionHeading(doc, 'Projects', fs, LD)
    resume.projects.forEach((project, index) => {
      if (index > 0) doc.y += ROLE_SPACER
      const gap = style(doc, 'Carlito-Bold', fs, BLACK, LD)
      doc.text(project.name, { lineGap: gap })
      if (project.tech) {
        const techGap = style(doc, 'Carlito-Italic', fs, BLACK, LD)
        doc.text(project.tech, { lineGap: techGap })
      }
      bullets(doc, project.bullets, fs, LD)
    })
  }

  if (resume.education.length > 0) {
    sectionHeading(doc, 'Education', fs, LD)
    bullets(doc, resume.education, fs, LD)
  }

  if (resume.other.length > 0) {
    sectionHeading(doc, 'Additional', fs, LD)
    bullets(doc, resume.other, fs, LD)
  }
}

const build = (
  resume: CustomizedResume,
  bodySize: number,
): Promise<{ buffer: Buffer; pages: number }> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: MARGIN_TOP,
        bottom: MARGIN_BOTTOM,
        left: MARGIN_LEFT,
        right: MARGIN_RIGHT,
      },
      bufferPages: true,
    })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('error', reject)
    registerFonts(doc)
    renderContent(doc, resume, bodySize)
    const pages = doc.bufferedPageRange().count
    doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), pages }))
    doc.end()
  })

export const generatePdf = async (result: TailorResult): Promise<Buffer> => {
  const { customizedResume } = result
  let buffer: Buffer | undefined
  for (const [index, size] of BODY_SIZES.entries()) {
    const rendered = await build(customizedResume, size)
    buffer = rendered.buffer
    if (rendered.pages <= 1 || index === BODY_SIZES.length - 1) break
  }
  return buffer as Buffer
}
