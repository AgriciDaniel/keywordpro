import { cn } from '@/lib/utils';

/**
 * The app mark: three ascending rounded bars, drawn inline so it stays crisp
 * at any size and takes its colour from the surrounding text. The same file
 * lives at `public/images/logo-keyword-pro.svg` for favicons and metadata.
 *
 * Inline rather than `next/image` on purpose: the image optimiser refuses SVG
 * unless `dangerouslyAllowSVG` is set, and this mark needs no optimising.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      role="img"
      aria-label="Keyword Pro"
      className={cn('size-7 sm:size-8 shrink-0', className)}
      fill="currentColor"
    >
      <rect x="60" y="160" width="70" height="160" rx="35" />
      <rect x="165" y="90" width="70" height="230" rx="35" />
      <rect x="270" y="20" width="70" height="300" rx="35" />
    </svg>
  );
}
