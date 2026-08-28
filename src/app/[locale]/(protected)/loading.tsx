// Quiet loading placeholder matching the Keyword Pro route. A
// skeleton grid here would flash in the same irritating way during
// navigation between protected routes.
export default function ProtectedLoading() {
  return <div className="h-full w-full bg-[#1F1F1F]" aria-hidden="true" />;
}
