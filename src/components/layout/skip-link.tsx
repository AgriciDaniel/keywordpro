'use client';

/**
 * Skip Navigation Link for Accessibility (WCAG 2.1 AA)
 * Allows keyboard users to skip to main content
 * Only visible when focused via keyboard navigation
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="
        sr-only focus:not-sr-only
        focus:fixed focus:top-4 focus:left-4 focus:z-[9999]
        focus:px-4 focus:py-2
        focus:bg-primary focus:text-primary-foreground
        focus:rounded-md focus:shadow-lg
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        font-medium text-sm
        transition-all
      "
    >
      Skip to main content
    </a>
  );
}
