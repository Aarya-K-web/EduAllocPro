// ============================================================
// EduAllocPro — Framer Motion Animation Tokens
// All animation variants defined here — import in components.
// ============================================================

// ── Slide Panel (School Detail) ─────────────────────────────
// Spring: damping 28, stiffness 280 — per spec
export const slideInRight = {
  initial:  { x: '100%', opacity: 0 },
  animate:  {
    x: 0,
    opacity: 1,
    transition: {
      type:      'spring',
      damping:   28,
      stiffness: 280,
    },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: {
      type:      'spring',
      damping:   28,
      stiffness: 280,
    },
  },
}

// ── Card Entrance ───────────────────────────────────────────
// y: 16→0, opacity 0→1, 250ms
export const cardEntrance = {
  initial:  { y: 16, opacity: 0 },
  animate:  {
    y: 0,
    opacity: 1,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  exit: {
    y: -8,
    opacity: 0,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
}

// ── Stagger Container ───────────────────────────────────────
// staggerChildren: 0.06s
export const staggerContainer = {
  initial:  {},
  animate:  {
    transition: {
      staggerChildren: 0.06,
      delayChildren:   0.05,
    },
  },
}

// ── Fade In ─────────────────────────────────────────────────
export const fadeIn = {
  initial:  { opacity: 0 },
  animate:  { opacity: 1, transition: { duration: 0.2 } },
  exit:     { opacity: 0, transition: { duration: 0.15 } },
}

// ── Toast Slide In ──────────────────────────────────────────
export const toastSlideIn = {
  initial:  { x: 60, opacity: 0 },
  animate:  {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', damping: 24, stiffness: 300 },
  },
  exit: {
    x: 60,
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
}

// ── DVS Bar Fill ────────────────────────────────────────────
// 0%→width% over 600ms, sequential segments
export const dvsBarFill = (width, delay = 0) => ({
  initial:  { width: '0%' },
  animate:  {
    width: `${width}%`,
    transition: {
      duration: 0.6,
      delay,
      ease: 'easeOut',
    },
  },
})

// ── DI Score Count-Up ───────────────────────────────────────
// 1.2s easeOut from 0 to final score
export const diScoreCountUp = {
  initial:  { opacity: 0 },
  animate:  {
    opacity: 1,
    transition: { duration: 1.2, ease: 'easeOut' },
  },
}

// ── Scale In ────────────────────────────────────────────────
export const scaleIn = {
  initial:  { scale: 0.95, opacity: 0 },
  animate:  {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', damping: 20, stiffness: 300 },
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    transition: { duration: 0.15 },
  },
}

// ── Overlay Backdrop ────────────────────────────────────────
export const overlayBackdrop = {
  initial:  { opacity: 0 },
  animate:  { opacity: 1, transition: { duration: 0.2 } },
  exit:     { opacity: 0, transition: { duration: 0.2 } },
}
