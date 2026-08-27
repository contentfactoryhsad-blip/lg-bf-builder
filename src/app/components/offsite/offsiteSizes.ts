/**
 * Off-site delivery sizes.
 *
 * Meta and PMax take the same two specs, so there is no media split — a
 * banner is identified by its size alone and the filenames carry no media
 * segment. Adding a size means adding a row here and nothing else.
 */

export interface OffSiteSize {
  /** Stable id — used as the override key and in filenames. */
  id: string;
  w: number;
  h: number;
}

export const OFFSITE_SIZES: OffSiteSize[] = [
  { id: '1200x1200', w: 1200, h: 1200 },
  { id: '1200x650', w: 1200, h: 650 },
];

/** Aspect at or above this renders side-by-side instead of stacked. */
export const HORIZONTAL_THRESHOLD = 1.2;

export function aspectOf(s: OffSiteSize): number {
  return s.w / s.h;
}

/** 1200×650 (1.85) goes side-by-side; 1200×1200 stacks. */
export function isHorizontal(s: OffSiteSize): boolean {
  return aspectOf(s) >= HORIZONTAL_THRESHOLD;
}
