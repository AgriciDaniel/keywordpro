import { useEffect, useRef, useState } from 'react';

/**
 * Animates a string transition by erasing characters from the end until the
 * remaining text is a prefix of the new target, then typing the rest in.
 *
 * Used for the chat textarea placeholder so endpoint changes don't snap from
 * one example to another - the old text rewinds, the new text rolls in.
 *
 * Honors `prefers-reduced-motion`: returns the target immediately when set.
 */
export function useTypewriter(target: string, charDelayMs = 18): string {
  const [displayed, setDisplayed] = useState(target);
  const currentRef = useRef(target);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      currentRef.current = target;
      setDisplayed(target);
      return;
    }

    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const current = currentRef.current;

      let commonPrefixLen = 0;
      while (
        commonPrefixLen < current.length &&
        commonPrefixLen < target.length &&
        current[commonPrefixLen] === target[commonPrefixLen]
      ) {
        commonPrefixLen++;
      }

      let next: string;
      if (current.length > commonPrefixLen) {
        next = current.slice(0, -1);
      } else if (current.length < target.length) {
        next = target.slice(0, current.length + 1);
      } else {
        return;
      }

      currentRef.current = next;
      setDisplayed(next);
      timeoutRef.current = setTimeout(tick, charDelayMs);
    };

    tick();

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [target, charDelayMs]);

  return displayed;
}
