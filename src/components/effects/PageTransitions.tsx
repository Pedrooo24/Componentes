import { PropsWithChildren } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export function PageTransition({ children, pageKey }: PropsWithChildren<{ pageKey: string }>) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.992, filter: 'blur(4px)' }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.996, filter: 'blur(3px)' }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function LoadingPulse({ label = 'A carregar...' }: { label?: string }) {
  return (
    <div
      className="inline-flex items-center gap-3 px-4 py-2.5 rounded-lg"
      style={{ backgroundColor: '#21262d', border: '1px solid #30363d', color: '#8b949e', boxShadow: '0 0 20px rgba(32, 128, 128, 0.08)' }}
    >
      <motion.span
        className="w-4 h-4 rounded-full"
        style={{ border: '2px solid #30363d', borderTopColor: '#208080' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      />
      <span className="text-sm" style={{ color: '#8b949e' }}>{label}</span>
      <span className="inline-flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1 h-1 rounded-full"
            style={{ backgroundColor: '#6e7681' }}
            animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.12 }}
          />
        ))}
      </span>
    </div>
  );
}
