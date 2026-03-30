// Animation variants for consistent motion across the app
export const fadeInVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export const fadeInUpVariants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 }
};

export const scaleInVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 }
};

export const slideInVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 }
};

// Constants for file sizes
export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;

// Animation constants
export const FULL_ROTATION = 360;
export const SPRING_CONFIG = { type: 'spring', stiffness: 300, damping: 30 };
export const SEARCH_DEBOUNCE_MS = 300;

// Timing constants
export const LOADING_DELAY_MS = 100;
export const ANIMATION_DURATION = 0.3;
export const STAGGER_DELAY = 0.05;
