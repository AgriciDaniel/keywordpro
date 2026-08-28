'use client';

import { cn } from '@/lib/utils';
import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_THUMB_SIZE = 32;
const SHOW_RAIL_THRESHOLD_PX = 2;
const HIDE_RAIL_THRESHOLD_PX = 0.5;
const NATIVE_SCROLLBAR_CLIP_PX = 20;
const CUSTOM_SCROLL_RAIL_WIDTH_PX = 12;

type ProtectedScrollShellProps = {
  children: ReactNode;
  className?: string;
  railOffsetPx?: number;
};

type ScrollMetrics = {
  canScroll: boolean;
  thumbTop: number;
  thumbHeight: number;
  maxScrollTop: number;
};

const INITIAL_METRICS: ScrollMetrics = {
  canScroll: false,
  thumbTop: 0,
  thumbHeight: MIN_THUMB_SIZE,
  maxScrollTop: 0,
};

export function ProtectedScrollShell({
  children,
  className,
  railOffsetPx = 8,
}: ProtectedScrollShellProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startY: number;
    startScrollTop: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const metricsRef = useRef<ScrollMetrics>(INITIAL_METRICS);
  const [metrics, setMetrics] = useState<ScrollMetrics>(INITIAL_METRICS);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  const computeMetrics = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const { scrollHeight, clientHeight, scrollTop } = viewport;
    const trackHeight = track.clientHeight;
    const overflowPx = Math.max(scrollHeight - clientHeight, 0);

    setMetrics((prev) => {
      if (trackHeight <= 0) {
        return prev;
      }

      const shouldShow =
        overflowPx > SHOW_RAIL_THRESHOLD_PX ||
        (prev.canScroll && overflowPx > HIDE_RAIL_THRESHOLD_PX);

      if (!shouldShow) {
        if (
          !prev.canScroll &&
          prev.thumbTop === 0 &&
          prev.maxScrollTop === 0 &&
          prev.thumbHeight === MIN_THUMB_SIZE
        ) {
          return prev;
        }

        return {
          canScroll: false,
          thumbTop: 0,
          thumbHeight: MIN_THUMB_SIZE,
          maxScrollTop: 0,
        };
      }

      const proportionalThumb = (clientHeight / scrollHeight) * trackHeight;
      const thumbHeightRaw = Math.min(
        trackHeight,
        Math.max(MIN_THUMB_SIZE, proportionalThumb)
      );
      const maxThumbTop = Math.max(trackHeight - thumbHeightRaw, 0);
      const thumbTopRaw =
        overflowPx > 0 ? (scrollTop / overflowPx) * maxThumbTop : 0;
      const thumbHeight = Math.round(thumbHeightRaw * 100) / 100;
      const thumbTop = Math.round(thumbTopRaw * 100) / 100;

      if (
        prev.canScroll &&
        prev.thumbTop === thumbTop &&
        prev.thumbHeight === thumbHeight &&
        prev.maxScrollTop === overflowPx
      ) {
        return prev;
      }

      return {
        canScroll: true,
        thumbTop,
        thumbHeight,
        maxScrollTop: overflowPx,
      };
    });
  }, []);

  const scheduleComputeMetrics = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      computeMetrics();
    });
  }, [computeMetrics]);

  useEffect(() => {
    scheduleComputeMetrics();

    const viewport = viewportRef.current;
    if (!viewport) return;

    const onScroll = () => scheduleComputeMetrics();
    viewport.addEventListener('scroll', onScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => scheduleComputeMetrics());
    resizeObserver.observe(viewport);
    if (viewport.firstElementChild instanceof HTMLElement) {
      resizeObserver.observe(viewport.firstElementChild);
    }

    window.addEventListener('resize', scheduleComputeMetrics);
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      viewport.removeEventListener('scroll', onScroll);
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleComputeMetrics);
    };
  }, [scheduleComputeMetrics]);

  const scrollToThumbTop = useCallback(
    (nextThumbTop: number) => {
      const viewport = viewportRef.current;
      const track = trackRef.current;
      if (!viewport || !track || !metrics.canScroll) return;

      const maxThumbTop = Math.max(track.clientHeight - metrics.thumbHeight, 0);
      const clampedTop = Math.max(0, Math.min(nextThumbTop, maxThumbTop));
      const ratio = maxThumbTop > 0 ? clampedTop / maxThumbTop : 0;
      viewport.scrollTop = ratio * metrics.maxScrollTop;
    },
    [metrics.canScroll, metrics.maxScrollTop, metrics.thumbHeight]
  );

  const handleTrackPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const track = trackRef.current;
      if (!track || !metrics.canScroll) return;
      const rect = track.getBoundingClientRect();
      const targetTop = event.clientY - rect.top - metrics.thumbHeight / 2;
      scrollToThumbTop(targetTop);
    },
    [metrics.canScroll, metrics.thumbHeight, scrollToThumbTop]
  );

  const handleThumbPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const viewport = viewportRef.current;
      if (!viewport || !metrics.canScroll) return;

      event.preventDefault();
      dragStateRef.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startScrollTop: viewport.scrollTop,
      };

      const onPointerMove = (moveEvent: PointerEvent) => {
        const state = dragStateRef.current;
        const currentViewport = viewportRef.current;
        const track = trackRef.current;
        if (
          !state ||
          !currentViewport ||
          !track ||
          moveEvent.pointerId !== state.pointerId
        ) {
          return;
        }

        const maxThumbTop = Math.max(
          track.clientHeight - metrics.thumbHeight,
          1
        );
        const scrollPerPixel = metrics.maxScrollTop / maxThumbTop;
        const deltaY = moveEvent.clientY - state.startY;
        currentViewport.scrollTop =
          state.startScrollTop + deltaY * scrollPerPixel;
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        if (dragStateRef.current?.pointerId !== upEvent.pointerId) return;
        dragStateRef.current = null;
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [metrics.canScroll, metrics.maxScrollTop, metrics.thumbHeight]
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const handleRailWheel = (event: WheelEvent) => {
      const viewport = viewportRef.current;
      if (!viewport || !metricsRef.current.canScroll) return;
      event.preventDefault();
      viewport.scrollTop += event.deltaY;
    };

    track.addEventListener('wheel', handleRailWheel, { passive: false });
    return () => track.removeEventListener('wheel', handleRailWheel);
  }, []);

  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 flex-col rounded-none bg-[#1F1F1F]',
        className
      )}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-none bg-[#1F1F1F]">
        <div
          ref={viewportRef}
          className="h-full min-h-0 overflow-y-scroll overflow-x-hidden bg-[#1F1F1F]"
          style={{
            width: `calc(100% + ${NATIVE_SCROLLBAR_CLIP_PX}px)`,
            marginRight: `-${NATIVE_SCROLLBAR_CLIP_PX}px`,
          }}
        >
          <div
            data-workspace-canvas
            className="min-h-full bg-[#1F1F1F]"
            style={{
              // The scroll viewport is widened only to clip the native
              // scrollbar. Content must still center against the visible
              // canvas, not the invisible clipped gutter.
              width: `calc(100% - ${NATIVE_SCROLLBAR_CLIP_PX}px)`,
              '--workspace-native-scrollbar-clip': `${NATIVE_SCROLLBAR_CLIP_PX}px`,
              '--workspace-scroll-rail-width': `${CUSTOM_SCROLL_RAIL_WIDTH_PX}px`,
            } as CSSProperties}
          >
            {children}
          </div>
        </div>
      </div>

      <div
        ref={trackRef}
        data-workspace-scroll-rail
        className={cn(
          'absolute inset-y-0 w-3 z-50',
          metrics.canScroll ? 'cursor-pointer' : 'pointer-events-none opacity-0'
        )}
        style={{ right: `${-railOffsetPx}px` }}
        onPointerDown={handleTrackPointerDown}
      >
        {metrics.canScroll && (
          <>
            <div className="absolute inset-y-0 right-0 w-[10px] rounded-full z-30" />
            <button
              type="button"
              aria-label="Scroll page"
              onPointerDown={handleThumbPointerDown}
              className="absolute right-0 w-[10px] rounded-full bg-[#9A9AA0] hover:bg-[#B4B4BA] transition-colors cursor-grab active:cursor-grabbing z-40"
              style={{
                top: `${metrics.thumbTop}px`,
                height: `${metrics.thumbHeight}px`,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
