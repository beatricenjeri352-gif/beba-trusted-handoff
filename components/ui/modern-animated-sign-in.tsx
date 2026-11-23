"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export function AuthCard({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full rounded-3xl border border-emerald-100 bg-white p-5 shadow-xl shadow-emerald-950/5 sm:p-8"
    >
      {children}
    </motion.section>
  );
}

export const authInputClass = "min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200";
