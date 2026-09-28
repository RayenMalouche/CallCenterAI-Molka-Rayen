// Everything the switchboard knows about the agent service (services/agent_service.py).

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export type Operator = 'tfidf' | 'transformer';

export type RoutingReason =
  | 'short_simple_text'
  | 'high_confidence_tfidf'
  | 'low_confidence_tfidf'
  | 'long_complex_text'
  | 'multilingual_detected'
  | 'fallback_to_transformer';

export interface Routing {
  chosen_model: Operator;
  reason: RoutingReason;
  text_length: number;
  has_multilingual: boolean;
  pii_scrubbed: boolean;
}

export interface Prediction {
  label: string;
  confidence: number;
  all_scores: Record<string, number>;
  routing: Routing;
  processing_time: number;
  timestamp: string;
}

export interface Health {
  status: string;
  tfidf_service: boolean;
  transformer_service: boolean;
}

/** A completed call: the prediction plus what the caller asked for. */
export interface Call {
  text: string;
  forced: Operator | null;
  prediction: Prediction;
}

export async function predict(text: string, forceModel: Operator | null): Promise<Prediction> {
  const response = await fetch(`${API_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, force_model: forceModel }),
  });
  if (!response.ok) {
    throw new Error(`The agent answered HTTP ${response.status}`);
  }
  return response.json();
}

export async function fetchHealth(signal?: AbortSignal): Promise<Health> {
  const response = await fetch(`${API_URL}/health`, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// ---------------------------------------------------------------- the board

/** The eight department jacks, in the order of models/transformer/label_mapping.json. */
export const DEPARTMENTS: { label: string; plate: string }[] = [
  { label: 'Access', plate: 'Access' },
  { label: 'Administrative rights', plate: 'Admin rights' },
  { label: 'HR Support', plate: 'HR support' },
  { label: 'Hardware', plate: 'Hardware' },
  { label: 'Internal Project', plate: 'Int. project' },
  { label: 'Miscellaneous', plate: 'Misc.' },
  { label: 'Purchase', plate: 'Purchase' },
  { label: 'Storage', plate: 'Storage' },
];

export const OPERATORS: Record<Operator, { position: string; model: string }> = {
  tfidf: { position: 'Local', model: 'TF-IDF + SVM' },
  transformer: { position: 'Trunk', model: 'DistilBERT' },
};

export function describeRouting(call: Call): string {
  if (call.forced) return 'Put through by hand — automatic routing skipped';
  const reasons: Record<RoutingReason, string> = {
    short_simple_text: 'Short call — the local operator took it',
    high_confidence_tfidf: 'The local operator was sure of the department',
    low_confidence_tfidf: 'The local operator was unsure — escalated to the trunk',
    long_complex_text: 'Long, involved call — sent to the trunk',
    multilingual_detected: 'Caller not speaking English — sent to the trunk',
    fallback_to_transformer: 'Local line failed — fell back to the trunk',
  };
  return reasons[call.prediction.routing.reason] ?? call.prediction.routing.reason;
}

// ---------------------------------------------------------- caller privacy

/**
 * Mirrors PII_PATTERNS in services/agent_service.py so the operator's slip can
 * show *which* words were scrubbed. The agent only reports that scrubbing
 * happened; keep these in step with the service if its patterns change.
 */
const PII_PATTERNS: [string, RegExp][] = [
  ['EMAIL', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g],
  ['PHONE', /\b(?:\+?1[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g],
  ['SSN', /\b\d{3}-\d{2}-\d{4}\b/g],
  ['CREDIT_CARD', /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g],
  ['IP_ADDRESS', /\b(?:\d{1,3}\.){3}\d{1,3}\b/g],
];

export type SlipPart = { kind: 'text'; value: string } | { kind: 'pii'; value: string; tag: string };

/** Split a ticket into plain text and the spans the agent scrubs, in the agent's order. */
export function splitPii(text: string): SlipPart[] {
  let parts: SlipPart[] = [{ kind: 'text', value: text }];
  for (const [tag, pattern] of PII_PATTERNS) {
    parts = parts.flatMap((part): SlipPart[] => {
      if (part.kind !== 'text') return [part];
      const out: SlipPart[] = [];
      let last = 0;
      part.value.replace(pattern, (match, ...rest) => {
        const offset = rest[rest.length - 2] as number;
        if (offset > last) out.push({ kind: 'text', value: part.value.slice(last, offset) });
        out.push({ kind: 'pii', value: match, tag: `[${tag}]` });
        last = offset + match.length;
        return match;
      });
      if (last < part.value.length) out.push({ kind: 'text', value: part.value.slice(last) });
      return out;
    });
  }
  return parts;
}

// ------------------------------------------------------------ the ledger

/** Evaluation on 9,568 held-out tickets — models/tfidf/metadata.json, models/transformer/*. */
export const LEDGER = {
  tfidfAccuracy: 0.8593,
  transformerAccuracy: 0.8843,
  trainTickets: 38269,
  testTickets: 9568,
  transformerF1: [
    { label: 'Access', f1: 0.913 },
    { label: 'Administrative rights', f1: 0.807 },
    { label: 'HR Support', f1: 0.899 },
    { label: 'Hardware', f1: 0.872 },
    { label: 'Internal Project', f1: 0.889 },
    { label: 'Miscellaneous', f1: 0.852 },
    { label: 'Purchase', f1: 0.932 },
    { label: 'Storage', f1: 0.897 },
  ],
};

export const SAMPLE_CALLS = [
  'My laptop screen is broken and needs replacement',
  'Cannot login to my account, password reset not working — reach me at j.doe@example.com',
  'Need to order new office supplies for the team',
  'Mon ordinateur portable ne fonctionne plus',
  'الحاسوب المحمول لا يعمل',
];
