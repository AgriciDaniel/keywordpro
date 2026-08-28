// Solid near-black base (`#0A0A0A`) matches the gallery page background that
// the Projects page "Create a New Project" tile sits on. Against the lighter
// sidebar (`oklch(0.22 0 0)`), the prior `bg-orange-500/5` composited with the
// parent gray and washed out. An opaque dark plate gives the orange chip the
// same crisp contrast the gallery tile has.
export const sidebarCtaClass =
  'flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border-[0.5px] border-orange-500/50 bg-[#0A0A0A] text-orange-500 text-sm font-semibold transition-all duration-200 hover:bg-[#141414] hover:text-orange-400 hover:border-orange-400/70 active:scale-[0.98] cursor-pointer';

export const sidebarCtaDisabledClass =
  'flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border-[0.5px] border-[#2A2A2A] bg-[#0A0A0A] text-[#6B7280] text-sm font-semibold shadow-none cursor-not-allowed';

export const sidebarCtaIconButtonClass =
  'flex h-10 w-10 items-center justify-center rounded-xl border-[0.5px] border-orange-500/50 bg-[#0A0A0A] text-orange-500 transition-all duration-200 hover:bg-[#141414] hover:text-orange-400 hover:border-orange-400/70 active:scale-[0.98] cursor-pointer';

export const sidebarCtaIconClass = 'h-4 w-4';

export const sidebarRowClass =
  'relative flex items-center justify-between w-full min-h-10 px-4 py-2.5 rounded-xl hover:bg-[#2A2A2A] transition-all duration-200';

export const sidebarSectionClass =
  'relative flex items-center w-full min-h-10 px-4 py-2.5 rounded-xl hover:bg-[#0B0B0B] transition-all duration-200';

export const sidebarChevronWrapperClass =
  // 28px slot aligned with other sidebar action buttons (`h-7 w-7`).
  // Keep this in normal flow to avoid subpixel positioning artifacts.
  'ml-auto flex h-7 w-7 shrink-0 items-center justify-center';

export const sidebarChevronPillClass =
  // Visible 24px pill used inside the 28px slot (matches legacy styling).
  'flex size-6 items-center justify-center rounded-full border border-slate-700/70 bg-black/40 transition-colors hover:border-slate-500/70';

export const sidebarChevronIconClass = 'h-4 w-4';
