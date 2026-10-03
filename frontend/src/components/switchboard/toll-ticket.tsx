// Operators wrote a toll ticket for every call they put through. This is that
// ticket for the agent's routing decision — the explanation layer of the board.
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { HyperText } from '../ui/hyper-text';
import { Call, describeRouting, OPERATORS, splitPii } from '../../lib/exchange';

export function TollTicket({ call, serial }: { call: Call; serial: number }) {
  const reduceMotion = useReducedMotion();
  const { prediction } = call;
  const { routing } = prediction;
  const operator = OPERATORS[routing.chosen_model];
  const slip = splitPii(call.text);
  const heard = slip.some((p) => p.kind === 'pii');
  const answered = new Date(prediction.timestamp);
  const ranked = Object.entries(prediction.all_scores).sort(([, a], [, b]) => b - a);

  const rows: [string, ReactNode][] = [
    ['Answered', answered.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })],
    ['Length', `${routing.text_length} characters`],
    ['Language', routing.has_multilingual ? 'Not English' : 'English'],
    ['Caller details', routing.pii_scrubbed ? 'Scrubbed before routing' : 'None found'],
    ['Position', `${operator.position}, ${operator.model}`],
    ['Why', describeRouting(call)],
    ['Put through to', <strong key="to">{prediction.label}</strong>],
    ['Confidence', `${(prediction.confidence * 100).toFixed(1)}%`],
    ['Handling time', `${(prediction.processing_time * 1000).toFixed(0)} ms`],
  ];

  return (
    <motion.article
      key={prediction.timestamp}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: reduceMotion ? 0 : 1.2 }}
      className="panel relative"
      aria-live="polite"
    >
      <header className="flex items-baseline justify-between border-b border-brass/60 px-5 py-3">
        <h2 className="plate">Toll ticket</h2>
        <span className="font-type text-sm text-graphite">No. {String(serial).padStart(5, '0')}</span>
      </header>

      {heard && (
        <div className="border-b border-dashed border-brass/60 px-5 py-4">
          <p className="plate mb-2 text-graphite">As the operator heard it</p>
          <p className="font-type leading-7" dir="auto">
            {slip.map((part, i) =>
              part.kind === 'text' ? (
                <span key={i}>{part.value}</span>
              ) : (
                <mark key={i} className="bg-bakelite px-1 text-lamp" title={`Scrubbed: ${part.tag}`}>
                  <HyperText text={part.tag} duration={900} className="font-type" />
                </mark>
              ),
            )}
          </p>
        </div>
      )}

      <dl className="ruled px-5 py-1 font-type text-[0.95rem]">
        {rows.map(([term, value]) => (
          <div key={term} className="grid grid-cols-[6.5rem_1fr] gap-3 leading-8 sm:grid-cols-[10rem_1fr]">
            <dt className="text-graphite">{term}</dt>
            <dd className="min-w-0">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-brass/60 px-5 py-4">
        <p className="plate mb-3 text-graphite">Every line on the board</p>
        <ol className="space-y-2">
          {ranked.map(([label, value]) => (
            <li key={label} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
              <span className={label === prediction.label ? 'font-semibold' : ''}>
                {label}
              </span>
              <span className="font-type tabular-nums">{(value * 100).toFixed(1)}%</span>
              <span className="col-span-2 h-1 bg-bakelite/10">
                <motion.span
                  className={label === prediction.label ? 'block h-full bg-lamp' : 'block h-full bg-brass/70'}
                  initial={{ width: 0 }}
                  animate={{ width: `${value * 100}%` }}
                  transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 1.3 }}
                />
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Operator's stamp */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-4 top-14 rotate-[-8deg] border-2 border-cord/80 px-2 py-0.5 font-display text-sm font-extrabold uppercase tracking-[0.2em] text-cord/80"
      >
        Connected
      </div>
    </motion.article>
  );
}
