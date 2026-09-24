/** Escape spreadsheet formula injection in CSV/export fields. */
export function sanitizeExportCell(value: string): string {
  const s = String(value ?? '');
  if (/^[=+\-@]/.test(s) || s.startsWith('\t') || s.startsWith('\r')) {
    return `'${s}`;
  }
  return s;
}

/** Strip most control characters from user-provided JD/resume text. */
export function stripControlChars(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

export const MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024;
