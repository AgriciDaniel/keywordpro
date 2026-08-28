'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ModeSwitcher } from '../layout/mode-switcher';

interface DashboardBreadcrumbItem {
  label: string;
  isCurrentPage?: boolean;
  onClick?: () => void;
}

interface DashboardHeaderProps {
  breadcrumbs: DashboardBreadcrumbItem[];
  actions?: ReactNode;
  /**
   * Monotonic counter. Bump it to force a single "flourish" crossfade even
   * when the breadcrumb text itself hasn't changed (e.g. clicking
   * "Projects" while already on the gallery). Optional; defaults to 0 for
   * layouts that don't need same-page flourishes.
   */
  replayKey?: number;
}

/**
 * Measures the natural (untruncated) width of a text string using an off-screen
 * element that inherits the same font styles. This avoids oscillation from
 * measuring an element whose width changes when we toggle siblings.
 */
function measureTextWidth(text: string, referenceEl: HTMLElement): number {
  const measurer = document.createElement('span');
  measurer.style.cssText =
    'position:absolute;visibility:hidden;white-space:nowrap;pointer-events:none;';
  // Copy computed font properties so measurement is accurate
  const computed = getComputedStyle(referenceEl);
  measurer.style.font = computed.font;
  measurer.style.letterSpacing = computed.letterSpacing;
  measurer.textContent = text;
  document.body.appendChild(measurer);
  const width = measurer.offsetWidth;
  document.body.removeChild(measurer);
  return width;
}

/**
 * Dashboard header
 *
 * Hides prefix breadcrumb items (domain) when the title would need to
 * truncate, prioritizing full title visibility over showing the domain.
 * Uses off-screen text measurement to avoid oscillation.
 */
// ── Breadcrumb motion design: "Overlapping left-to-right sweep" ────────
//
// Both phases move in the same direction (left → right, reading order):
//   Exit:  leading char leaves first, trailing char last.    (fade only)
//   Enter: leading char arrives first, trailing char last.   (fade only)
//
// The new text STARTS entering while the old text is still exiting -
// their sweeps overlap by CROSSFADE_OFFSET_RATIO of the exit duration.
// This kills the "dead air" moment between disappear and reappear that a
// strict sequential morph has, and creates a single continuous reading-
// direction wave.
//
// Collision safety: the two texts render as SIBLING children of an
// inline-grid cell with shared `grid-area: 1 / 1`. That means they
// occupy the same rectangular slot in z-space rather than flowing in
// line, so a long outgoing string and a short incoming string can never
// collide horizontally - they're layered, not inlined. The grid cell
// sizes to max-content of the two layers during the overlap window, so
// the container grows/shrinks to fit whichever is wider at any moment.
//
// Interruption safety: `targetRef` tracks the latest requested text.
// When a crossfade is in flight and a new target arrives, we don't
// interrupt - we let the current crossfade complete, then start a new
// one from the freshly-landed text to the latest target. Intermediate
// targets are dropped (if the user rapid-fires 4 clicks, we animate
// only to the final one).
//
// Progress is RAF + time-driven rather than setInterval-counted, so
// animations stay smooth under frame-rate drops and pause tabs cleanly.

const BASE_CHAR_DELAY = 12;         // ms between each char's state flip
const MAX_PHASE_MS = 420;           // total-duration cap per phase
const CHAR_TRANSITION_MS = 240;     // per-char opacity/transform/blur resolve
const MOTION_CURVE = 'cubic-bezier(0.22, 1, 0.36, 1)'; // ease-out-quart
const CROSSFADE_OFFSET_RATIO = 0.6;  // incoming starts at 60% of outgoing timeline

/** Dynamic per-char stagger: long strings tighten up to finish under MAX_PHASE_MS. */
function charDelayFor(len: number): number {
  if (len <= 1) return BASE_CHAR_DELAY;
  return Math.min(BASE_CHAR_DELAY, MAX_PHASE_MS / len);
}

type Layer = {
  /** Unique id per crossfade cycle; drives React key stability. */
  id: number;
  text: string;
  /** `out` = fade chars away, `in` = bring chars in. */
  direction: 'out' | 'in';
  /** `performance.now()` timestamp when this layer's animation begins. */
  startedAt: number;
  /** Count of chars currently in their "gone" state. */
  progress: number;
  done: boolean;
};

/** Stable settled-layer key so React reconciles the same DOM across text changes. */
const SETTLED_KEY = 'settled';

/**
 * BreadcrumbMorph - character-level crossfade between breadcrumb strings.
 * See the block comment above for the full motion-design rationale.
 */
function BreadcrumbMorph({ text, replayKey = 0 }: { text: string; replayKey?: number }) {
  const [displayText, setDisplayText] = useState(text);
  const [outgoing, setOutgoing] = useState<Layer | null>(null);
  const [incoming, setIncoming] = useState<Layer | null>(null);

  // Refs mirror state for the RAF tick loop, plus the "latest requested text"
  // pointer used for interruption handling.
  const displayTextRef = useRef(text);
  const targetRef = useRef(text);
  const outgoingRef = useRef<Layer | null>(null);
  const incomingRef = useRef<Layer | null>(null);
  const rafRef = useRef<number | null>(null);
  const nextIdRef = useRef(0);

  useEffect(() => { displayTextRef.current = displayText; }, [displayText]);
  useEffect(() => { outgoingRef.current = outgoing; }, [outgoing]);
  useEffect(() => { incomingRef.current = incoming; }, [incoming]);

  // Forward-declared so tick() can invoke it on chained crossfades; assigned
  // below. Using a ref avoids the useCallback(tick ↔ startCrossfade) cycle.
  const startCrossfadeRef = useRef<(from: string, to: string) => void>(() => {});

  const tick = useCallback(() => {
    const now = performance.now();
    const curOut = outgoingRef.current;
    const curIn = incomingRef.current;

    let nextOut = curOut;
    let nextIn = curIn;

    if (curOut && !curOut.done) {
      const delay = charDelayFor(curOut.text.length);
      const raw = Math.floor((now - curOut.startedAt) / delay);
      const progress = Math.max(0, Math.min(curOut.text.length, raw));
      const done = progress >= curOut.text.length;
      if (progress !== curOut.progress || done !== curOut.done) {
        nextOut = { ...curOut, progress, done };
      }
    }

    if (curIn && !curIn.done) {
      const elapsed = now - curIn.startedAt;
      // Incoming's startedAt is in the future until the crossfade offset
      // elapses; once positive, it advances like any other layer.
      if (elapsed >= 0) {
        const delay = charDelayFor(curIn.text.length);
        const raw = Math.floor(elapsed / delay);
        const progress = Math.max(0, Math.min(curIn.text.length, raw));
        const done = progress >= curIn.text.length;
        if (progress !== curIn.progress || done !== curIn.done) {
          nextIn = { ...curIn, progress, done };
        }
      }
    }

    if (nextOut !== curOut) {
      outgoingRef.current = nextOut;
      setOutgoing(nextOut);
    }
    if (nextIn !== curIn) {
      incomingRef.current = nextIn;
      setIncoming(nextIn);
    }

    const bothSettled =
      (!nextOut || nextOut.done) && (!nextIn || nextIn.done);
    const anythingToSettle = !!(curOut || curIn);

    if (bothSettled && anythingToSettle) {
      // Commit the final text and tear down both layers in one render.
      const finalText = nextIn?.text ?? nextOut?.text ?? displayTextRef.current;
      displayTextRef.current = finalText;
      outgoingRef.current = null;
      incomingRef.current = null;
      setDisplayText(finalText);
      setOutgoing(null);
      setIncoming(null);
      rafRef.current = null;

      // The user may have moved the target during the crossfade. Chain
      // straight into the next one without an idle gap.
      if (targetRef.current !== finalText) {
        queueMicrotask(() => {
          startCrossfadeRef.current(finalText, targetRef.current);
        });
      }
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startCrossfade = useCallback((from: string, to: string, force = false) => {
    if (!force && from === to) return;

    const now = performance.now();
    const outDelay = charDelayFor(from.length);
    const outTotalMs = outDelay * from.length;
    const offsetMs = outTotalMs * CROSSFADE_OFFSET_RATIO;

    const outLayer: Layer = {
      id: nextIdRef.current++,
      text: from,
      direction: 'out',
      startedAt: now,
      progress: 0,
      done: from.length === 0,
    };
    const inLayer: Layer = {
      id: nextIdRef.current++,
      text: to,
      direction: 'in',
      startedAt: now + offsetMs,
      progress: 0,
      done: to.length === 0,
    };

    outgoingRef.current = outLayer;
    incomingRef.current = inLayer;
    setOutgoing(outLayer);
    setIncoming(inLayer);

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  // Wire the forward-declared ref now that startCrossfade exists.
  useEffect(() => {
    startCrossfadeRef.current = startCrossfade;
  }, [startCrossfade]);

  // Respond to text prop changes.
  useEffect(() => {
    targetRef.current = text;
    // If a crossfade is already running, don't queue up here - the tick
    // handler picks up the new target when the current crossfade lands.
    if (outgoingRef.current || incomingRef.current) return;
    if (displayTextRef.current === text) return;
    startCrossfade(displayTextRef.current, text);
  }, [text, startCrossfade]);

  // Respond to replayKey bumps - "flourish on click even if text is the
  // same". Runs a single forced same-text crossfade. If a crossfade is
  // already in flight, skip (that crossfade IS the flourish already). The
  // initial mount (replayKey === 0) is a no-op; we depend only on replayKey
  // here so an unrelated text change doesn't retrigger this path.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (replayKey === 0) return;
    if (outgoingRef.current || incomingRef.current) return;
    startCrossfade(displayTextRef.current, displayTextRef.current, true);
  }, [replayKey]);

  // Cancel any pending RAF on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const showSettled = !outgoing && !incoming;

  return (
    <span
      className="inline-grid text-base font-medium align-baseline"
      style={{ gridTemplateColumns: 'auto', overflow: 'hidden' }}
    >
      {outgoing && <LayerSpan key={`layer-${outgoing.id}`} layer={outgoing} />}
      {incoming && <LayerSpan key={`layer-${incoming.id}`} layer={incoming} />}
      {showSettled && <SettledSpan key={SETTLED_KEY} text={displayText} />}
    </span>
  );
}

/** Renders a crossfade layer - chars fade in/out one-at-a-time per `layer.progress`. */
function LayerSpan({ layer }: { layer: Layer }) {
  const chars = useMemo(() => layer.text.split(''), [layer.text]);

  return (
    <span
      className="inline-flex"
      style={{ gridArea: '1 / 1', whiteSpace: 'nowrap' }}
    >
      {chars.map((char, i) => {
        // Both phases sweep in reading order (left → right):
        //   `out`: char at index i is hidden once progress > i.
        //   `in`:  char at index i is visible once progress > i.
        const isVisible =
          layer.direction === 'out' ? i >= layer.progress : i < layer.progress;

        // Breadcrumbs are persistent chrome. Keep their geometry and baseline
        // completely still; only opacity/blur can change during a text morph.
        const hiddenTransform = 'translateY(0)';

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : hiddenTransform,
              filter: isVisible ? 'blur(0px)' : 'blur(2px)',
              transition: `opacity ${CHAR_TRANSITION_MS}ms ${MOTION_CURVE}, transform ${CHAR_TRANSITION_MS}ms ${MOTION_CURVE}, filter ${CHAR_TRANSITION_MS}ms ${MOTION_CURVE}`,
              minWidth: char === ' ' ? '0.25em' : undefined,
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </span>
  );
}

/**
 * Settled (idle) text render. Visually identical to an all-visible LayerSpan
 * but without any transition CSS, so the idle state doesn't eat GPU cycles
 * animating non-changes. Shares the same per-char span structure so React
 * can reconcile cleanly across the idle ↔ crossfading boundary.
 */
function SettledSpan({ text }: { text: string }) {
  const chars = useMemo(() => text.split(''), [text]);
  return (
    <span
      className="inline-flex"
      style={{ gridArea: '1 / 1', whiteSpace: 'nowrap' }}
    >
      {chars.map((char, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            minWidth: char === ' ' ? '0.25em' : undefined,
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}

export function DashboardHeader({
  breadcrumbs,
  actions,
  replayKey,
}: DashboardHeaderProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const prefixRef = useRef<HTMLLIElement | null>(null);
  const titleRef = useRef<HTMLSpanElement | null>(null);
  const [_hidePrefix, setHidePrefix] = useState(false);

  // Cache measured widths so we only hit the DOM once per unique value
  const cachedTitleWidth = useRef<{ label: string; width: number } | null>(null);
  const cachedPrefixWidth = useRef<number>(0);

  const hasPrefix = breadcrumbs.length > 1;
  const titleLabel = breadcrumbs.find((b) => b.isCurrentPage)?.label ?? '';

  const checkFit = useCallback(() => {
    const container = containerRef.current;
    const titleEl = titleRef.current;
    if (!container || !titleEl || !hasPrefix) return;

    // Measure title's natural width (cached per label string)
    let titleNaturalWidth: number;
    if (cachedTitleWidth.current?.label === titleLabel) {
      titleNaturalWidth = cachedTitleWidth.current.width;
    } else {
      titleNaturalWidth = measureTextWidth(titleLabel, titleEl);
      cachedTitleWidth.current = { label: titleLabel, width: titleNaturalWidth };
    }

    // Cache prefix width when it's visible and measurable
    const prefixEl = prefixRef.current;
    if (prefixEl && prefixEl.offsetWidth > 0) {
      // 40px accounts for separator + gaps
      cachedPrefixWidth.current = prefixEl.offsetWidth + 40;
    }
    const prefixTotalWidth = cachedPrefixWidth.current || 40;

    const availableWidth = container.clientWidth;

    // Single stable decision: can the full title + prefix fit?
    const needsHiding = titleNaturalWidth + prefixTotalWidth > availableWidth;

    setHidePrefix(needsHiding);
  }, [hasPrefix, titleLabel]);

  useEffect(() => {
    // Run initial check
    checkFit();

    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(checkFit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [checkFit]);

  return (
    <header className="sticky top-0 z-40 flex h-(--header-height) shrink-0 items-center gap-2 bg-[#1F1F1F] transition-[width,height] ease-linear after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:z-50 after:h-px after:w-[calc(100%+var(--workspace-native-scrollbar-clip,0px))] after:bg-[#3B3935] after:content-[''] group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 pl-4 pr-2 lg:gap-2 lg:pl-6 lg:pr-2">
        <SidebarTrigger className="-ml-1 cursor-pointer" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        <Breadcrumb ref={containerRef} className="min-w-0 flex-1">
          <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden whitespace-nowrap">
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage ref={titleRef} className="block min-w-0 max-w-full">
                <BreadcrumbMorph
                  text={breadcrumbs.map((b) => b.label).join('  \u203A  ')}
                  replayKey={replayKey}
                />
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* dashboard header actions on the right side */}
        <div className="ml-auto flex items-center gap-2 pl-4">
          {actions}

          <ModeSwitcher />
        </div>
      </div>
    </header>
  );
}
