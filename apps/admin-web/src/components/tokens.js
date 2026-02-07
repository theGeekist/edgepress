/**
 * Global design tokens for EdgePress Admin
 * Includes spacing, typography, animations, and other reusable values
 */

// ========== Animation Tokens ==========

export const animation = {
  // Snappy, fast transitions
  duration: {
    instant: 50,
    fast: 100,
    normal: 150,
    slow: 200,
    slower: 300,
  },
  // WordPress-like easing
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)', // ease-out
    in: 'cubic-bezier(0.4, 0, 1, 1)',        // ease-in
    out: 'cubic-bezier(0, 0, 0.2, 1)',       // ease-out
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  // Common transitions
  transition: {
    fast: 'all 100ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    fade: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: 'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    color: 'color 100ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// ========== Spacing Tokens ==========

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// ========== Typography Tokens ==========

export const typography = {
  fontSize: {
    xs: 11,
    sm: 12,
    md: 13,
    base: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    display: 32,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// ========== Border Radius Tokens ==========

export const radius = {
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
  round: 9999,
};

// ========== Shadow Tokens ==========

export const shadow = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  lg: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
  xl: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
};

// ========== Z-Index Tokens ==========

export const zIndex = {
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
};

// ========== Breakpoint Tokens ==========

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

// ========== Helper: Create transition string ==========

export function createTransition(properties, duration = 'normal', easing = 'default') {
  const durationMs = animation.duration[duration] || duration;
  const easingFn = animation.easing[easing] || easing;
  const props = Array.isArray(properties) ? properties.join(', ') : properties;
  return `${props} ${durationMs}ms ${easingFn}`;
}

// ========== Helper: Check reduced motion preference ==========

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ========== Helper: Get safe transition duration ==========

export function getSafeDuration(duration = 'normal') {
  return prefersReducedMotion() ? 0 : animation.duration[duration] || duration;
}
