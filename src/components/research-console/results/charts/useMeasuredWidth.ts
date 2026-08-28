'use client';

import { useEffect, useRef, useState } from 'react';

/** Give up after this many frames rather than polling forever. */
const MAX_FRAMES = 60;

/**
 * The rendered width of an element, tracked across resizes.
 *
 * Recharts ships `ResponsiveContainer`, which does the same job. This exists
 * so chart width is an explicit prop rather than something the library
 * discovers for itself: the console reveals results inside a height-animating
 * wrapper, and a chart that lays out against a zero-width parent stays blank
 * because nothing resizes afterwards to trigger a redraw.
 *
 * A `ResizeObserver` alone cannot close that gap for the same reason, so the
 * first measurement is also retried on animation frames until a real width
 * appears. Both paths feed the same setter.
 */
export function useMeasuredWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frame = 0;
    let frames = 0;
    let done = false;

    const apply = (next: number) => {
      const rounded = Math.round(next);
      // Sub-pixel jitter from a flex parent would otherwise re-render the
      // chart on every frame of an animation.
      // The jitter guard must not swallow the very first real measurement:
      // going from 0 to 1 is a change of exactly 1, so `> 1` refused it and a
      // 1px container stayed blank forever.
      setWidth((current) =>
        current === 0 || Math.abs(current - rounded) > 1 ? rounded : current,
      );
      return rounded > 0;
    };

    const poll = () => {
      if (done) return;
      const measured = element.getBoundingClientRect().width;
      if (apply(measured) || frames >= MAX_FRAMES) {
        done = true;
        return;
      }
      frames += 1;
      frame = requestAnimationFrame(poll);
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) apply(entry.contentRect.width);
    });
    observer.observe(element);
    poll();

    return () => {
      done = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return [ref, width] as const;
}
