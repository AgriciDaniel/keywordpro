// Quiet loading placeholder. Intentionally renders a solid dark panel
// with no skeleton grid - Next.js used to flash a 6-card skeleton during
// segment transitions under `/keyword-pro` and
// it read as a visual glitch. The actual gallery + project views are
// client-rendered with their own staggered entrance, so a blank dark
// plate here is the right "between state" to bridge navigation.
export default function KeywordProLoading() {
  return <div className="h-full w-full bg-[#1F1F1F]" aria-hidden="true" />;
}
