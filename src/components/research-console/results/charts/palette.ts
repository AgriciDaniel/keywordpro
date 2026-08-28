/*
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * One palette for every chart and badge.
 *
 * The rule that matters: a concept keeps its colour everywhere it appears.
 * "Commercial" is the same amber in the intent donut, the scatter dot and the
 * table badge, so the reader never has to re-learn the legend when their eye
 * moves down the page.
 */

/** Search intent. Matches the badge colours in keyword-columns.tsx. */
export const INTENT_COLORS: Record<string, string> = {
  commercial: '#E8B673',
  informational: '#7FA8D9',
  navigational: '#B79BD6',
  transactional: '#6FBF8B',
  unknown: '#7D7870',
};

export function intentColor(intent: unknown): string {
  return typeof intent === 'string'
    ? (INTENT_COLORS[intent] ?? INTENT_COLORS.unknown)
    : INTENT_COLORS.unknown;
}

/**
 * Difficulty, low to high.
 *
 * Ordered green through amber to red because difficulty has a direction: low
 * is the opportunity. A categorical palette here would hide that.
 */
export const DIFFICULTY_COLORS = [
  '#6FBF8B',
  '#A9C87A',
  '#E8B673',
  '#DFA070',
  '#E08A7A',
];

/**
 * A ramp from the app's accent, for measures with no inherent meaning per
 * band, such as a ranked bar list. Mirrors the reference app's single-hue
 * ramp rather than a rainbow: rank is already carried by position, so the
 * colour only needs to recede.
 */
export const ACCENT_RAMP = [
  '#F2A65A',
  '#E39A55',
  '#D08D51',
  '#B87F4D',
  '#9E7049',
  '#856245',
];

export const CHART_INK = {
  /** Axis lines and gridlines. */
  grid: 'rgba(255,255,255,0.07)',
  axis: '#7D7870',
  label: '#9F9A92',
  strong: '#EDE7DC',
  surface: '#1A1A19',
  surfaceRaised: '#252524',
  border: 'rgba(255,255,255,0.10)',
  /** The opportunity quadrant; matches the "Easiest wins" bars. */
  sweetSpot: '#6FBF8B',
} as const;

/**
 * Compatibility accents for cached social results created by older private
 * builds. Brand hues are lifted so they hold up on the dark surface.
 */
export const SOCIAL_PLATFORM_COLORS: Record<string, string> = {
  tiktok: '#F27D9F',
  instagram: '#D97AB0',
  youtube: '#E06B6B',
  twitter: '#8DB8DE',
  threads: '#C9C4BC',
  bluesky: '#7FB3E8',
  reddit: '#F2A65A',
  linkedin: '#7FA8D9',
  facebook: '#7F9BE0',
  github: '#B8B2A8',
  twitch: '#B79BD6',
  snapchat: '#E8D673',
  truthsocial: '#E08A7A',
  soundcloud: '#F2A65A',
  rumble: '#6FBF8B',
  pinterest: '#E08A7A',
};

export const TREND_COLORS = {
  up: '#6FBF8B',
  down: '#E08A7A',
  flat: '#9F9A92',
  none: '#5E5A54',
} as const;
