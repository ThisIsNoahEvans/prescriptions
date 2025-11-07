/**
 * Utility functions for managing body scroll lock with scrollbar compensation
 * to prevent layout shift when modals open/close
 */

let scrollbarWidth: number | null = null;

/**
 * Calculate the scrollbar width
 */
function getScrollbarWidth(): number {
  if (scrollbarWidth !== null) {
    return scrollbarWidth;
  }

  // Create a temporary element to measure scrollbar width
  const outer = document.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll';
  document.body.appendChild(outer);

  const inner = document.createElement('div');
  outer.appendChild(inner);

  // Calculate the difference between outer and inner widths
  scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

  // Clean up
  outer.parentNode?.removeChild(outer);

  return scrollbarWidth;
}

/**
 * Lock body scroll and compensate for scrollbar to prevent layout shift
 */
export function lockBodyScroll(): void {
  const scrollbarWidth = getScrollbarWidth();
  
  // Only add padding if scrollbar exists (width > 0)
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
  
  document.body.style.overflow = 'hidden';
}

/**
 * Unlock body scroll and remove scrollbar compensation
 */
export function unlockBodyScroll(): void {
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}