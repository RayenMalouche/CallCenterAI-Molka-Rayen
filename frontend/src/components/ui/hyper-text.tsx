// From component-lab `hyper-text.tsx` (21st.dev). Changes: renders inline so it
// can sit inside a sentence, keeps the source casing, and honours reduced motion.
import { AnimatePresence, motion, useReducedMotion, Variants } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import { cn } from '../../lib/cn';

interface HyperTextProps {
  text: string;
  duration?: number;
  framerProps?: Variants;
  className?: string;
  animateOnLoad?: boolean;
}

const alphabets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*'.split('');

const getRandomInt = (max: number) => Math.floor(Math.random() * max);

export function HyperText({
  text,
  duration = 800,
  framerProps = {
    initial: { opacity: 0, y: -4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 2 },
  },
  className,
  animateOnLoad = true,
}: HyperTextProps) {
  const reduceMotion = useReducedMotion();
  const [displayText, setDisplayText] = useState(text.split(''));
  const [trigger, setTrigger] = useState(false);
  const iterations = useRef(0);
  const isFirstRender = useRef(true);

  const triggerAnimation = () => {
    iterations.current = 0;
    setTrigger(true);
  };

  useEffect(() => {
    if (reduceMotion) {
      setDisplayText(text.split(''));
      return;
    }
    const interval = setInterval(
      () => {
        if (!animateOnLoad && isFirstRender.current) {
          clearInterval(interval);
          isFirstRender.current = false;
          return;
        }
        if (iterations.current < text.length) {
          setDisplayText((t) =>
            t.map((l, i) =>
              l === ' ' ? l : i <= iterations.current ? text[i] : alphabets[getRandomInt(alphabets.length)],
            ),
          );
          iterations.current = iterations.current + 0.1;
        } else {
          setTrigger(false);
          clearInterval(interval);
        }
      },
      duration / (text.length * 10),
    );
    return () => clearInterval(interval);
  }, [text, duration, trigger, animateOnLoad, reduceMotion]);

  return (
    <span className="inline-flex cursor-default" onMouseEnter={triggerAnimation} aria-label={text}>
      <AnimatePresence mode="wait">
        {displayText.map((letter, i) => (
          <motion.span key={i} aria-hidden className={cn(letter === ' ' ? 'w-2' : '', className)} {...framerProps}>
            {letter}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}
