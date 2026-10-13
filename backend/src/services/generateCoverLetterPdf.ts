import PDFDocument from 'pdfkit'
import type { CoverLetterResult } from '../schemas/coverLetter.js'
import type { CustomizedResume } from '../schemas/tailorResult.js'
import {
  BLACK,
  BODY_SIZES,
  bullets,
  contactLine,
  LEADING_FACTOR,
  NAVY,
  pageMargins,
  registerFonts,
  SECTION_SPACER,
  style,
} from './pdfShared.js'

const LETTER_NAME_SIZE = 18
const PARAGRAPH_GAP = 6

const formatDate = (): string =>
  new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

const renderLetter = (
  doc: PDFKit.PDFDocument,
  resume: CustomizedResume,
  letter: CoverLetterResult['coverLetter'],
  fs: number,
): void => {
  const LD = fs * LEADING_FACTOR

  doc.fillColor(NAVY).font('Carlito-Bold').fontSize(LETTER_NAME_SIZE)
  doc.text(resume.name || 'Cover Letter', { align: 'center' })

  if (resume.title) {
    const gap = style(doc, 'Carlito', fs, BLACK, LD)
    doc.text(resume.title, { align: 'center', lineGap: gap })
  }

  if (resume.contact) {
    contactLine(doc, resume.contact, fs, LD)
  }

  doc.y += SECTION_SPACER
  style(doc, 'Carlito', fs, BLACK, LD)
  doc.text(formatDate())
  doc.y += PARAGRAPH_GAP

  style(doc, 'Carlito-Bold', fs, BLACK, LD)
  doc.text(letter.greeting)
  doc.y += PARAGRAPH_GAP

  if (letter.opening) {
    const gap = style(doc, 'Carlito', fs, BLACK, LD)
    doc.text(letter.opening, { lineGap: gap })
    doc.y += PARAGRAPH_GAP
  }

  if (letter.bullets.length > 0) {
    bullets(doc, letter.bullets, fs, LD)
    doc.y += PARAGRAPH_GAP
  }

  if (letter.closing) {
    const gap = style(doc, 'Carlito', fs, BLACK, LD)
    doc.text(letter.closing, { lineGap: gap })
    doc.y += PARAGRAPH_GAP
  }

  if (letter.signOff) {
    const gap = style(doc, 'Carlito', fs, BLACK, LD)
    doc.text(letter.signOff, { lineGap: gap })
  }
}

const build = (
  resume: CustomizedResume,
  result: CoverLetterResult,
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
    renderLetter(doc, resume, result.coverLetter, bodySize)
    const pages = doc.bufferedPageRange().count
    doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), pages }))
    doc.end()
  })

export const generateCoverLetterPdf = async (
  result: CoverLetterResult,
  resume: CustomizedResume,
): Promise<Buffer> => {
  let buffer: Buffer | undefined
  for (const [index, size] of BODY_SIZES.entries()) {
    const rendered = await build(resume, result, size)
    buffer = rendered.buffer
    if (rendered.pages <= 1 || index === BODY_SIZES.length - 1) break
  }
  return buffer as Buffer
}
