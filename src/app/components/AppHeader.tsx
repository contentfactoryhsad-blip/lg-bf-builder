import React from 'react';
import { BackButton } from './BackButton';

interface Props {
  title: string;
  /** Back pill shown top-left. Omit entirely on screens with no "back" (Home). */
  onBack?: () => void;
  /** Right-aligned actions (buttons, badges, language picker, etc.). */
  right?: React.ReactNode;
  /** Makes the LG logo + title a link back to the builder-picker home. */
  onHome?: () => void;
  /** Centered between the brand and the actions — e.g. a step indicator. */
  center?: React.ReactNode;
}

/**
 * Shared 64px app header: Back pill (optional) + LG logo/title, both
 * left-aligned, with right-side actions.
 */
export function AppHeader({ title, onBack, right, onHome, center }: Props) {
  // With a centered element in play, narrow windows give the title's room to it
  // — the logo keeps the brand, and the divider goes with the text it divides.
  const titleVis = center ? 'hidden lg:block' : '';
  const brand = (
    <>
      <img src="/lg-logo.svg" alt="LG" style={{ height: 20, width: 'auto' }} draggable={false} />
      <div className={`w-px h-4 bg-gray-200 ${titleVis}`} />
      <span className={`font-lgei font-bold text-[15px] text-gray-900 ${titleVis}`} style={{ lineHeight: '20px' }}>
        {title}
      </span>
    </>
  );
  return (
    <header className="relative bg-white border-b border-gray-200 px-8 h-16 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-4 shrink-0">
        {onBack && <BackButton onClick={onBack} />}
        {onHome ? (
          <button
            type="button"
            onClick={onHome}
            aria-label="Home"
            className="flex items-center gap-2 rounded-md -mx-1 px-1 hover:opacity-70 transition-opacity"
          >
            {brand}
          </button>
        ) : (
          <div className="flex items-center gap-2">{brand}</div>
        )}
      </div>

      {/* Centered on the header's full width, not the leftover flex space —
          the brand and actions are unequal, so flex centering sat off-middle. */}
      {center && (
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center">
          {center}
        </div>
      )}

      <div className="flex items-center gap-3 shrink-0">{right}</div>
    </header>
  );
}
