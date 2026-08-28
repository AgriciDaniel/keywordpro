import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeJsonParse<T = unknown>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Smart truncation for meta descriptions
 * Truncates text to fit within a character range while respecting word boundaries
 * @param text - The text to truncate
 * @param minLength - Minimum acceptable length (default: 155)
 * @param maxLength - Maximum acceptable length (default: 160)
 * @returns Truncated text with proper punctuation
 */
export function smartTruncateDescription(
  text: string,
  minLength = 155,
  maxLength = 160
): string {
  // If already within acceptable range, return as-is
  if (text.length <= maxLength) {
    return text;
  }

  // Find the last complete word within maxLength
  let truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  // If we found a space and it's after minLength, cut there
  if (lastSpace > minLength) {
    truncated = truncated.substring(0, lastSpace);
  }
  // Otherwise just use maxLength (edge case: very long word)

  // Remove trailing punctuation except periods
  truncated = truncated.replace(/[,;:!?-]+$/, '').trim();

  // Ensure it ends with proper punctuation
  if (!/[.!?]$/.test(truncated)) {
    truncated += '.';
  }

  return truncated;
}
