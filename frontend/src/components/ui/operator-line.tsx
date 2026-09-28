// From component-lab `animated-ai-chat.tsx` (21st.dev). Kept: the auto-resizing
// textarea, the "/" command palette with arrow/Tab/Enter/Escape handling, and
// the typing dots. Changed: the palette now picks the operator position (the
// agent's `force_model`) instead of mock prompts; the violet glow blobs and the
// cursor-following gradient are gone — a call slip on a switchboard doesn't glow.
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Hash, PhoneForwarded } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Operator, OPERATORS } from '../../lib/exchange';

function useAutoResizeTextarea({ minHeight, maxHeight }: { minHeight: number; maxHeight?: number }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = `${minHeight}px`;
      if (reset) return;
      const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY));
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight],
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

interface Position {
  forced: Operator | null;
  label: string;
  description: string;
  prefix: string;
}

const POSITIONS: Position[] = [
  { forced: null, label: 'Automatic', description: 'let the agent route the call', prefix: '/auto' },
  { forced: 'tfidf', label: OPERATORS.tfidf.position, description: OPERATORS.tfidf.model, prefix: '/local' },
  { forced: 'transformer', label: OPERATORS.transformer.position, description: OPERATORS.transformer.model, prefix: '/trunk' },
];

export interface OperatorLineProps {
  value: string;
  onValueChange: (value: string) => void;
  forced: Operator | null;
  onForcedChange: (forced: Operator | null) => void;
  onConnect: () => void;
  busy: boolean;
}

export function OperatorLine({ value, onValueChange, forced, onForcedChange, onConnect, busy }: OperatorLineProps) {
  const reduceMotion = useReducedMotion();
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 128, maxHeight: 320 });
  const commandPaletteRef = useRef<HTMLDivElement>(null);
  const paletteId = React.useId();

  // Values set from outside (the sample calls) still need the slip resized.
  useEffect(() => adjustHeight(), [value, adjustHeight]);

  useEffect(() => {
    const token = value.match(/^\/\S*$/);
    if (token) {
      setShowCommandPalette(true);
      setActiveSuggestion(POSITIONS.findIndex((p) => p.prefix.startsWith(token[0])));
    } else {
      setShowCommandPalette(false);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const commandButton = document.querySelector('[data-command-button]');
      if (commandPaletteRef.current && !commandPaletteRef.current.contains(target) && !commandButton?.contains(target)) {
        setShowCommandPalette(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectPosition = (index: number) => {
    onForcedChange(POSITIONS[index].forced);
    // The command only chooses the position; it is never sent as part of the call.
    if (/^\/\S*$/.test(value)) onValueChange('');
    setShowCommandPalette(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandPalette) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestion((prev) => (prev < POSITIONS.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : POSITIONS.length - 1));
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        if (activeSuggestion >= 0) selectPosition(activeSuggestion);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandPalette(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !busy) onConnect();
    }
  };

  const current = POSITIONS.find((p) => p.forced === forced) ?? POSITIONS[0];
  const canConnect = !!value.trim() && !busy && !/^\/\S*$/.test(value);

  return (
    <div className="panel relative">
      <AnimatePresence>
        {showCommandPalette && (
          <motion.div
            ref={commandPaletteRef}
            id={paletteId}
            role="listbox"
            aria-label="Operator position"
            className="absolute inset-x-4 bottom-full z-50 mb-2 border border-brass bg-bakelite text-faceplate shadow-lg"
            initial={reduceMotion ? false : { opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
          >
            {POSITIONS.map((position, index) => (
              <div
                key={position.prefix}
                role="option"
                aria-selected={activeSuggestion === index}
                className={cn(
                  'flex cursor-pointer items-baseline gap-3 px-4 py-2.5 text-sm transition-colors',
                  activeSuggestion === index ? 'bg-walnut text-lamp' : 'hover:bg-walnut/60',
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectPosition(index)}
              >
                <span className="font-type">{position.prefix}</span>
                <span className="plate">{position.label}</span>
                <span className="text-xs text-faceplate/60">{position.description}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between border-b border-brass/60 px-5 py-3">
        <label htmlFor="call-slip" className="plate">
          Incoming call
        </label>
        <span className="font-type text-xs text-graphite">type “/” to pick a position</span>
      </div>

      <textarea
        id="call-slip"
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          adjustHeight();
        }}
        onKeyDown={handleKeyDown}
        disabled={busy}
        dir="auto"
        placeholder="What is the caller asking for?"
        aria-controls={showCommandPalette ? paletteId : undefined}
        className="ruled block w-full resize-none overflow-hidden bg-transparent px-5 pt-[0.4rem] font-type text-base leading-8 text-bakelite placeholder:text-graphite/60 focus:outline-none disabled:opacity-60"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brass/60 px-4 py-3">
        <button
          type="button"
          data-command-button
          onClick={(e) => {
            e.stopPropagation();
            setActiveSuggestion(POSITIONS.indexOf(current));
            setShowCommandPalette((prev) => !prev);
          }}
          aria-expanded={showCommandPalette}
          className="flex items-center gap-2 border border-brass/60 px-3 py-2 text-sm transition-colors hover:border-bakelite"
        >
          <Hash className="h-4 w-4 text-brass" aria-hidden />
          <span className="plate">{current.label}</span>
          <span className="hidden text-xs text-graphite sm:inline">{current.description}</span>
        </button>

        <motion.button
          type="button"
          onClick={onConnect}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          disabled={!canConnect}
          className={cn(
            'flex items-center gap-2.5 px-5 py-2.5 transition-colors',
            canConnect || busy ? 'bg-bakelite text-faceplate hover:bg-walnut' : 'bg-bakelite/15 text-graphite',
          )}
        >
          {busy ? (
            <>
              <span className="h-2.5 w-2.5 animate-ring rounded-full bg-lamp" aria-hidden />
              <span className="plate">Ringing</span>
              <TypingDots />
            </>
          ) : (
            <>
              <PhoneForwarded className="h-4 w-4" aria-hidden />
              <span className="plate">Connect</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}

function TypingDots() {
  const reduceMotion = useReducedMotion();
  return (
    <span className="ml-0.5 flex items-center" aria-hidden>
      {[1, 2, 3].map((dot) => (
        <motion.span
          key={dot}
          className="mx-0.5 h-1 w-1 rounded-full bg-faceplate"
          initial={{ opacity: 0.3 }}
          animate={reduceMotion ? { opacity: 0.8 } : { opacity: [0.3, 0.9, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}
