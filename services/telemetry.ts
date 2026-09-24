/**
 * Local-first anonymous telemetry. No PII. Ring buffer in localStorage.
 */
export type TelemetryEventName =
  | 'interview_start'
  | 'interview_leave'
  | 'interview_end'
  | 'interview_analyze_fail'
  | 'evaluate_retry'
  | 'quiz_complete'
  | 'recommendation_click'
  | 'feature_use'
  | 'api_error'
  | 'api_latency';

export interface TelemetryEvent {
  name: TelemetryEventName;
  ts: string;
  props?: Record<string, string | number | boolean | null>;
}

const KEY = 'prepai_telemetry_v1';
const MAX_EVENTS = 500;

function loadEvents(): TelemetryEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as TelemetryEvent[];
  } catch {
    return [];
  }
}

function saveEvents(events: TelemetryEvent[]): void {
  localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
}

export function track(name: TelemetryEventName, props?: TelemetryEvent['props']): void {
  const events = loadEvents();
  events.push({ name, ts: new Date().toISOString(), props });
  saveEvents(events);
}

export function getTelemetryEvents(): TelemetryEvent[] {
  return loadEvents();
}

export function clearTelemetry(): void {
  localStorage.removeItem(KEY);
}

export function exportTelemetryJson(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      note: 'Anonymous PrepAI diagnostics — no transcripts or PII',
      events: loadEvents(),
      aggregates: getTelemetryAggregates(),
    },
    null,
    2
  );
}

export function downloadTelemetry(): void {
  const blob = new Blob([exportTelemetryJson()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prepai_diagnostics_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface TelemetryAggregates {
  totalEvents: number;
  interviewStarts: number;
  interviewEnds: number;
  interviewLeaves: number;
  completionRate: number;
  analyzeFails: number;
  evaluateRetries: number;
  quizCompletes: number;
  recommendationClicks: number;
  apiErrors: number;
  avgLatencyMs: number | null;
}

export function getTelemetryAggregates(): TelemetryAggregates {
  const events = loadEvents();
  const starts = events.filter((e) => e.name === 'interview_start').length;
  const ends = events.filter((e) => e.name === 'interview_end').length;
  const leaves = events.filter((e) => e.name === 'interview_leave').length;
  const latencies = events
    .filter((e) => e.name === 'api_latency' && typeof e.props?.ms === 'number')
    .map((e) => Number(e.props!.ms));
  const avgLatencyMs =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : null;

  return {
    totalEvents: events.length,
    interviewStarts: starts,
    interviewEnds: ends,
    interviewLeaves: leaves,
    completionRate: starts > 0 ? Math.round((ends / starts) * 100) : 0,
    analyzeFails: events.filter((e) => e.name === 'interview_analyze_fail').length,
    evaluateRetries: events.filter((e) => e.name === 'evaluate_retry').length,
    quizCompletes: events.filter((e) => e.name === 'quiz_complete').length,
    recommendationClicks: events.filter((e) => e.name === 'recommendation_click').length,
    apiErrors: events.filter((e) => e.name === 'api_error').length,
    avgLatencyMs,
  };
}
