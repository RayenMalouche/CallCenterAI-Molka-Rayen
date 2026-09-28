// The signature element: a cord board. The incoming line is patched through an
// operator position (TF-IDF = local, DistilBERT = trunk) into one of the eight
// department jacks. Each department's lamp burns as bright as its score.
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { Call, DEPARTMENTS, Operator, OPERATORS } from '../../lib/exchange';

type Point = { x: number; y: number };

interface Layout {
  width: number;
  height: number;
  line: Point;
  operators: Record<Operator, Point>;
  departments: Point[];
}

// Two drawings of the same board: one row of eight jacks, or two rows of four.
const WIDE: Layout = {
  width: 1100,
  height: 350,
  line: { x: 550, y: 56 },
  operators: { tfidf: { x: 370, y: 158 }, transformer: { x: 730, y: 158 } },
  departments: DEPARTMENTS.map((_, i) => ({ x: 80 + i * 134.3, y: 268 })),
};

const NARROW: Layout = {
  width: 400,
  height: 560,
  line: { x: 200, y: 62 },
  operators: { tfidf: { x: 110, y: 170 }, transformer: { x: 290, y: 170 } },
  departments: DEPARTMENTS.map((_, i) => ({ x: 56 + (i % 4) * 96, y: i < 4 ? 290 : 440 })),
};

/** A patch cord hangs below both of its jacks, like a real one. */
function cordPath(a: Point, b: Point, sag = 46) {
  const low = Math.max(a.y, b.y) + sag;
  return `M ${a.x} ${a.y} C ${a.x} ${low}, ${b.x} ${low}, ${b.x} ${b.y}`;
}

function useNarrow(ref: React.RefObject<HTMLElement | null>) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < 560));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return narrow;
}

interface PatchPanelProps {
  call: Call | null;
  ringing: boolean;
  fault: string | null;
}

export function PatchPanel({ call, ringing, fault }: PatchPanelProps) {
  const reduceMotion = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const layout = useNarrow(frameRef) ? NARROW : WIDE;

  const prediction = call?.prediction;
  const operator = prediction?.routing.chosen_model;
  const target = prediction ? DEPARTMENTS.findIndex((d) => d.label === prediction.label) : -1;
  const score = (label: string) => prediction?.all_scores?.[label] ?? 0;

  const draw = (delay: number) =>
    reduceMotion ? { duration: 0 } : { pathLength: { duration: 0.7, delay, ease: [0.3, 0, 0.2, 1] as const } };

  const summary = prediction
    ? `Line patched through the ${OPERATORS[operator!].position.toLowerCase()} operator (${OPERATORS[operator!].model}) to ${prediction.label}, ${(prediction.confidence * 100).toFixed(1)}% confidence.`
    : ringing
      ? 'Incoming call ringing.'
      : 'Board idle — no call connected.';

  return (
    <div ref={frameRef} className="relative bg-walnut p-2 sm:p-3">
      <div className="relative bg-bakelite">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="block h-auto w-full"
          role="img"
          aria-label={summary}
        >
          <defs>
            <filter id="lamp-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="jack-hole">
              <stop offset="0" stopColor="#000" />
              <stop offset="1" stopColor="#1a100a" />
            </radialGradient>
          </defs>

          {/* Engraved rails behind each row of jacks */}
          {[layout.line.y, layout.operators.tfidf.y, ...Array.from(new Set(layout.departments.map((d) => d.y)))].map(
            (y) => (
              <line key={y} x1={24} x2={layout.width - 24} y1={y} y2={y} stroke="#A8833A" strokeOpacity={0.18} />
            ),
          )}

          {/* Cords: drawn beneath the jacks so plugs sit on top */}
          {prediction && operator && (
            <g key={prediction.timestamp} fill="none" stroke="#9A3324" strokeWidth={5} strokeLinecap="round">
              <motion.path
                d={cordPath(layout.line, layout.operators[operator])}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={draw(0)}
              />
              {target >= 0 && (
                <motion.path
                  d={cordPath(layout.operators[operator], layout.departments[target])}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={draw(0.55)}
                />
              )}
            </g>
          )}

          {/* Incoming line */}
          <Jack
            at={layout.line}
            plate="Line 1"
            sub={ringing ? 'ringing' : prediction ? 'connected' : 'idle'}
            lamp={ringing ? 1 : prediction ? 1 : 0}
            blinking={ringing}
            plugged={!!prediction}
          />

          {/* Operator positions */}
          {(Object.keys(OPERATORS) as Operator[]).map((key) => (
            <Jack
              key={key}
              at={layout.operators[key]}
              plate={OPERATORS[key].position}
              sub={OPERATORS[key].model}
              lamp={operator === key ? 1 : 0}
              plugged={operator === key}
              delay={0.45}
            />
          ))}

          {/* Department jacks */}
          {DEPARTMENTS.map((dept, i) => (
            <Jack
              key={dept.label}
              at={layout.departments[i]}
              plate={dept.plate}
              sub={prediction ? `${(score(dept.label) * 100).toFixed(1)}%` : '—'}
              lamp={i === target ? 1 : score(dept.label)}
              chosen={i === target}
              plugged={i === target}
              delay={1.1 + i * 0.04}
            />
          ))}
        </svg>

        {fault && (
          <div className="absolute inset-x-4 top-4 flex justify-center sm:inset-x-auto sm:right-6 sm:top-6">
            <div className="rotate-[-2deg] border-2 border-cord bg-faceplate px-4 py-2 text-center shadow-lg">
              <p className="plate text-cord">Out of order</p>
              <p className="mt-1 max-w-[16rem] font-type text-xs text-bakelite">{fault}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface JackProps {
  at: Point;
  plate: string;
  sub: string;
  /** 0–1: how brightly the lamp burns */
  lamp: number;
  blinking?: boolean;
  chosen?: boolean;
  plugged?: boolean;
  delay?: number;
}

function Jack({ at, plate, sub, lamp, blinking, chosen, plugged, delay = 0 }: JackProps) {
  const reduceMotion = useReducedMotion();
  const lit = lamp > 0;
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      {/* Lamp */}
      <circle cx={0} cy={-36} r={10} fill="#1a100a" stroke="#A8833A" strokeOpacity={0.5} />
      <motion.circle
        cx={0}
        cy={-36}
        r={7.5}
        fill="#F0A73A"
        filter={chosen || blinking ? 'url(#lamp-glow)' : undefined}
        className={blinking ? 'animate-ring' : undefined}
        initial={false}
        animate={{ opacity: lit ? 0.12 + lamp * 0.88 : 0.06 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.4, delay: lit ? delay : 0 }}
      />

      {/* Jack: brass collar, black socket */}
      <circle r={15} fill="#8A6B2E" />
      <circle r={12.5} fill="#C9A45A" />
      <circle r={7} fill="url(#jack-hole)" />
      {plugged && (
        <motion.g
          initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay, duration: 0.2 }}
        >
          <circle r={9} fill="#2A1C13" stroke="#9A3324" strokeWidth={3} />
          <circle r={3} fill="#C9A45A" />
        </motion.g>
      )}

      {/* Engraved plate */}
      <g transform="translate(0 30)">
        <rect x={-46} y={0} width={92} height={36} rx={1} fill={chosen ? '#F0A73A' : '#F7F1E3'} />
        <text
          y={15}
          textAnchor="middle"
          fontFamily='"Big Shoulders Display", Impact, sans-serif'
          fontWeight={800}
          fontSize={13}
          letterSpacing="0.12em"
          fill="#2A1C13"
          style={{ textTransform: 'uppercase' }}
        >
          {plate}
        </text>
        <text y={29} textAnchor="middle" fontFamily='"Courier Prime", monospace' fontSize={10.5} fill="#4A3426">
          {sub}
        </text>
      </g>
    </g>
  );
}
