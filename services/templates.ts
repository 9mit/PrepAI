import { InterviewContext } from '../types';
import { sanitizeExportCell } from './sanitize';

export interface InterviewTemplate {
  id: string;
  name: string;
  createdAt: string;
  context: Partial<InterviewContext> & {
    domainPack?: string;
    speechPace?: string;
  };
}

const TEMPLATES_KEY = 'prepai_interview_templates';
const SEATS_KEY = 'prepai_practice_seats';

export function listTemplates(): InterviewTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]') as InterviewTemplate[];
  } catch {
    return [];
  }
}

export function saveTemplate(name: string, context: InterviewTemplate['context']): InterviewTemplate {
  const tpl: InterviewTemplate = {
    id: `tpl-${Date.now()}`,
    name: name.trim() || 'Untitled template',
    createdAt: new Date().toISOString(),
    context,
  };
  const all = [tpl, ...listTemplates()].slice(0, 30);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(all));
  return tpl;
}

export function deleteTemplate(id: string): void {
  const all = listTemplates().filter((t) => t.id !== id);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(all));
}

export interface PracticeSeat {
  id: string;
  name: string;
  scores: number[];
}

export function listSeats(): PracticeSeat[] {
  try {
    return JSON.parse(localStorage.getItem(SEATS_KEY) || '[]') as PracticeSeat[];
  } catch {
    return [];
  }
}

export function upsertSeat(name: string, score?: number): PracticeSeat {
  const seats = listSeats();
  let seat = seats.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
  if (!seat) {
    seat = { id: `seat-${Date.now()}`, name: name.trim(), scores: [] };
    seats.push(seat);
  }
  if (typeof score === 'number') {
    seat.scores = [score, ...seat.scores].slice(0, 50);
  }
  localStorage.setItem(SEATS_KEY, JSON.stringify(seats));
  return seat;
}

export function exportSeatsCsv(): string {
  const seats = listSeats();
  const lines = ['name,sessions,avg_score'];
  for (const s of seats) {
    const avg = s.scores.length
      ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length)
      : 0;
    const safeName = sanitizeExportCell(s.name).replace(/"/g, '""');
    lines.push(`"${safeName}",${s.scores.length},${avg}`);
  }
  return lines.join('\n');
}

export function downloadSeatsCsv(): void {
  const blob = new Blob([exportSeatsCsv()], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'prepai_seats.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
