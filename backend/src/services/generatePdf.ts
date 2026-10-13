import PDFDocument from 'pdfkit'
import type { CustomizedResume, TailorResult } from '../schemas/tailorResult.js'
import {
  BLACK,
  BODY_SIZES,
  bullets,
  contactLine,
  LEADING_FACTOR,
  MM,
  NAME_LEADING,
  NAME_SIZE,
  NAVY,
  pageMargins,
  registerFonts,
  ROLE_SPACER,
  SECTION_RULE_WIDTH,
  SECTION_SPACER,
  style,
} from './pdfShared.js'

const DATES_COLUMN = 40 * MM

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
      margins: pageMargins(),
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
