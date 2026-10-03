"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** DESIGN.md entry easing: cubic-bezier(0.23,1,0.32,1). Never ease-in. */
export const EASE_IN_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Operate-tier entrance: opacity plus scale from 0.95, not 0. Transform and
 * opacity only, runs once on mount. Reduced motion renders the final state.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: EASE_IN_OUT }}
    >
      {children}
    </motion.div>
  );
}
