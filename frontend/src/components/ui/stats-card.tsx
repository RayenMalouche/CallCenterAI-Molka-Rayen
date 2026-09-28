// From component-lab `stats-card.tsx` (21st.dev ActivityStatsCard). Changes: the
// shadcn Card/Button wrappers are replaced by the switchboard's brass panel, the
// comparison bar is optional (we only hold per-class scores for one model), and
// each bar carries its value label so the chart reads without hovering.
import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { cn } from '../../lib/cn';

export interface ChartDataPoint {
  label: string;
  /** 0–100 */
  currentValue: number;
  /** 0–100, optional second bar */
  previousValue?: number;
  /** Text shown above the bar */
  valueLabel?: string;
}

export interface ActivityStatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  icon?: React.ReactNode;
  mainValue: string;
  changeValue: number;
  changeDescription: string;
  chartData: ChartDataPoint[];
  /** Bars are drawn from this floor, so small differences near the top stay visible. */
  floor?: number;
  primaryBarClassName?: string;
  secondaryBarClassName?: string;
}

export const ActivityStatsCard = React.forwardRef<HTMLDivElement, ActivityStatsCardProps>(
  (
    {
      className,
      title,
      icon,
      mainValue,
      changeValue,
      changeDescription,
      chartData,
      floor = 0,
      primaryBarClassName,
      secondaryBarClassName,
      ...props
    },
    ref,
  ) => {
    const reduceMotion = useReducedMotion();
    const ChangeIndicator = changeValue > 0 ? ArrowUpRight : ArrowDownRight;
    const scale = (v: number) => Math.max(2, ((v - floor) / (100 - floor)) * 100);

    const containerVariants = {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
    };
    const barVariants = {
      hidden: { height: '0%', opacity: 0 },
      visible: (height: number) => ({
        height: `${height}%`,
        opacity: 1,
        transition: reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 300, damping: 25 },
      }),
    };

    return (
      <div ref={ref} className={cn('panel w-full overflow-hidden p-5 sm:p-6', className)} {...props}>
        <div className="flex items-center gap-3">
          {icon && <div className="text-brass">{icon}</div>}
          <h3 className="plate text-graphite">{title}</h3>
        </div>

        <p className="mt-4 font-display text-5xl font-extrabold leading-none tracking-tight">{mainValue}</p>
        <p className="mt-2 flex items-center gap-1 text-sm">
          <ChangeIndicator className="h-4 w-4 text-bakelite" aria-hidden />
          <span className="font-semibold">
            {changeValue > 0 ? '+' : ''}
            {changeValue}
          </span>
          <span className="text-graphite">{changeDescription}</span>
        </p>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          className="mt-6 flex h-44 w-full items-end justify-between gap-1.5 sm:gap-2"
        >
          {chartData.map((point) => (
            <div key={point.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <div className="relative flex h-full w-full items-end justify-center gap-1">
                <motion.div
                  custom={scale(point.currentValue)}
                  variants={barVariants}
                  className={cn('relative w-full bg-bakelite', primaryBarClassName)}
                  role="img"
                  aria-label={`${point.label}: ${point.valueLabel ?? point.currentValue}`}
                >
                  {point.valueLabel && (
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-type text-[0.7rem] text-bakelite">
                      {point.valueLabel}
                    </span>
                  )}
                </motion.div>
                {point.previousValue !== undefined && (
                  <motion.div
                    custom={scale(point.previousValue)}
                    variants={barVariants}
                    className={cn('w-full bg-brass/40', secondaryBarClassName)}
                  />
                )}
              </div>
              <span className="w-full truncate text-center font-display text-[0.7rem] font-bold uppercase tracking-wider text-graphite">
                {point.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    );
  },
);
ActivityStatsCard.displayName = 'ActivityStatsCard';
