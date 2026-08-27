/**
 * Off-site Banner — the scene's lamp, as Photoshop's Global Light dial.
 *
 * One control carries both numbers, because they are one thing: where the lamp
 * is. The handle's DIRECTION from the centre is the angle it lights from, and
 * its DISTANCE is how low it stands — centre is directly overhead, the rim is
 * on the horizon. Dragging it is how you set both at once, which is the point:
 * a pair of number fields makes you solve for a look you can already see.
 *
 * The two figures beside it are typed as well as read: the dial is the fast way
 * to find a look, and the boxes are how you land on a round number or copy one
 * banner's lamp onto another exactly.
 */

import React, { useCallback, useRef, useState } from 'react';
import { useT } from '../../i18n/LanguageContext';
import { LIGHT_ALTITUDE_MIN, type OffSiteLight } from './offsiteTypes';

/**
 * Dial radius, in pixels — and the control's precision, which is why it is
 * this large.
 *
 * The radius IS the altitude scale: the whole 0–90° range is spent between the
 * centre and the rim, so a small dial makes altitude several degrees per pixel
 * and leaves the angle turning in visible jumps near the middle. At 44px it is
 * about two degrees per pixel, which a hand can actually aim.
 */
const R = 44;
const HANDLE = 5;

export function GlobalLightDial({
  light: value, onChange,
}: {
  light: OffSiteLight;
  onChange: (light: OffSiteLight) => void;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);

  /** Screen point → lamp position. Anything past the rim is read as sitting on
   *  it: dragging out of the circle should pin the altitude at 0, not stop
   *  tracking, or the handle sticks the moment your hand overshoots. */
  const apply = useCallback((e: React.PointerEvent | PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    // Screen y grows downward; the dial reads anticlockwise from the right.
    const dy = (r.top + r.height / 2) - e.clientY;
    const dist = Math.min(Math.hypot(dx, dy), R);
    // Dead centre has no direction to read, so the angle simply stays put.
    const angle = dx === 0 && dy === 0
      ? value.angle
      : Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360);
    // The rim is the lowest the lamp goes, not the horizon — see
    // LIGHT_ALTITUDE_MIN. Dragging past it simply pins there.
    const span = 90 - LIGHT_ALTITUDE_MIN;
    onChange({ ...value, angle, altitude: Math.round(LIGHT_ALTITUDE_MIN + (1 - dist / R) * span) });
  }, [onChange, value]);

  function start(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    apply(e);
  }

  const rad = (value.angle * Math.PI) / 180;
  const alt = Math.min(90, Math.max(LIGHT_ALTITUDE_MIN, value.altitude));
  const dist = (1 - (alt - LIGHT_ALTITUDE_MIN) / (90 - LIGHT_ALTITUDE_MIN)) * R;
  const hx = R + Math.cos(rad) * dist;
  const hy = R - Math.sin(rad) * dist;

  return (
    <div className="flex items-center gap-3">
      <div
        ref={ref}
        onPointerDown={start}
        onPointerMove={(e) => e.buttons === 1 && apply(e)}
        className="relative shrink-0 cursor-crosshair rounded-full border border-gray-300 bg-white"
        style={{ width: R * 2, height: R * 2, touchAction: 'none' }}
      >
        <svg width={R * 2} height={R * 2} className="pointer-events-none absolute inset-0">
          {/* Crosshair and half-way ring: without them the face is blank, and
              there is nothing to judge 45° or "straight back" against. */}
          <line x1={R} y1={2} x2={R} y2={R * 2 - 2} stroke="#f3f4f6" strokeWidth={1} />
          <line x1={2} y1={R} x2={R * 2 - 2} y2={R} stroke="#f3f4f6" strokeWidth={1} />
          <circle cx={R} cy={R} r={R / 2} fill="none" stroke="#f3f4f6" strokeWidth={1} />
          {/* The lamp's track, drawn from the centre so the lean is readable. */}
          <line x1={R} y1={R} x2={hx} y2={hy} stroke="#d1d5db" strokeWidth={1.5} />
          <circle cx={R} cy={R} r={2} fill="#9ca3af" />
          <circle cx={hx} cy={hy} r={HANDLE} fill="#FD312E" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <DegreeField
          label={t('Angle')}
          value={value.angle}
          // A bearing has no ends: 370 is 10, and −10 is 350.
          normalise={(n) => ((Math.round(n) % 360) + 360) % 360}
          onChange={(angle) => onChange({ ...value, angle })}
        />
        <DegreeField
          label={t('Altitude')}
          value={value.altitude}
          normalise={(n) => Math.min(90, Math.max(LIGHT_ALTITUDE_MIN, Math.round(n)))}
          onChange={(altitude) => onChange({ ...value, altitude })}
        />
      </div>
    </div>
  );
}

/** One typed figure. Held as text while it is being typed, so a half-finished
 *  entry — an empty box, a lone minus — is not snapped back to the last valid
 *  number under the cursor; the field re-reads from the value on blur. */
function DegreeField({
  label, value, normalise, onChange,
}: {
  label: string;
  value: number;
  normalise: (n: number) => number;
  onChange: (n: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-gray-500 first:mt-0">
      <span className="shrink-0">{label}</span>
      <span className="flex items-center gap-0.5">
        <input
          type="number"
          value={draft ?? String(value)}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value !== '' && Number.isFinite(n)) onChange(normalise(n));
          }}
          onBlur={() => setDraft(null)}
          className="w-14 rounded border border-gray-200 px-1.5 py-1 text-right text-[11px] tabular-nums text-gray-900 focus:border-[#FD312E] focus:outline-none"
        />
        <span>°</span>
      </span>
    </label>
  );
}
