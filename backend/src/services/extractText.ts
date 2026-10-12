import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import { badRequest, unsupportedType } from '../lib/errors.js'

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d] // %PDF-
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04] // PK\x03\x04 (DOCX is a zip)

const hasSignature = (buffer: Buffer, signature: number[]): boolean =>
  buffer.length >= signature.length && signature.every((byte, index) => buffer[index] === byte)

const isPdf = (buffer: Buffer): boolean => hasSignature(buffer, PDF_SIGNATURE)
const isDocx = (buffer: Buffer): boolean => hasSignature(buffer, ZIP_SIGNATURE)

const clean = (text: string): string =>
  text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

export const extractText = async (buffer: Buffer): Promise<string> => {
  let raw: string

  if (isPdf(buffer)) {
    const parser = new PDFParse({ data: buffer })
    try {
      const parsed = await parser.getText()
      raw = parsed.text
    } finally {
      await parser.destroy()
    }
  } else if (isDocx(buffer)) {
    const parsed = await mammoth.extractRawText({ buffer })
    raw = parsed.value
  } else {
    throw unsupportedType('Only PDF (.pdf) and Word (.docx) resumes are supported.')
  }

  const text = clean(raw)
  if (!text) {
    throw badRequest('No readable text could be extracted from the resume.')
  }
  return text
}
