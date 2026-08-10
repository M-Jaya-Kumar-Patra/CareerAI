import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

const MIME_PDF = 'application/pdf';
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function validateResumeFile(file) {
  if (!file) {
    const error = new Error('A PDF or DOCX resume is required');
    error.statusCode = 400;
    error.code = 'RESUME_REQUIRED';
    throw error;
  }
  const extension = file.originalname.toLowerCase().split('.').pop();
  const validExtension = extension === 'pdf' || extension === 'docx';
  const validMime = file.mimetype === MIME_PDF || file.mimetype === MIME_DOCX;
  const isPdf = file.buffer.subarray(0, 4).toString() === '%PDF';
  const isDocx = file.buffer.subarray(0, 2).toString() === 'PK';
  if (!validExtension || !validMime || (extension === 'pdf' && !isPdf) || (extension === 'docx' && !isDocx)) {
    const error = new Error('The uploaded file does not match a supported PDF or DOCX document');
    error.statusCode = 415;
    error.code = 'RESUME_FILE_TYPE_INVALID';
    throw error;
  }
}

export async function extractResumeText(file) {
  if (file.mimetype === MIME_PDF) {
    const result = await pdfParse(file.buffer);
    return result.text.trim();
  }
  const result = await mammoth.extractRawText({ buffer: file.buffer });
  return result.value.trim();
}

export function normalizeResumeText(text) {
  return text.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function basicResumeMetadata(text) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  return {
    name: lines[0] || null,
    email: text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null,
    phone: text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() || null,
    sections: lines.filter((line) => /^(summary|experience|education|skills|projects|certifications|achievements|objective)\b/i.test(line)).slice(0, 20),
  };
}

export { MIME_PDF, MIME_DOCX };
