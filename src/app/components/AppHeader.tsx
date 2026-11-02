import React from 'react';
import { BackButton } from './BackButton';

const HUB_URL = 'https://builder-hub.lge-d2c.com';

interface Props {
  title: string;
  /** Back pill shown top-left. Omit entirely on screens with no "back" (Home). */
  onBack?: () => void;
  /** Right-aligned actions (buttons, badges, language picker, etc.). */
  right?: React.ReactNode;
  /** Makes the title a link back to the builder-picker home (the LG logo always goes to the Builder Hub). */
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
  const name = (
    <span className={`font-lgei font-bold text-[15px] text-gray-900 ${titleVis}`} style={{ lineHeight: '20px' }}>
      {title}
    </span>
  );
  return (
    <header className="relative bg-white border-b border-gray-200 px-8 h-16 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-4 shrink-0">
        {onBack && <BackButton onClick={onBack} />}
        <div className="flex items-center gap-2">
          {/* The LG logo always goes to the Builder Hub (shared across builders). */}
          <a
            href={HUB_URL}
            title="Builder Hub"
            aria-label="Builder Hub"
            className="flex items-center rounded-md -mx-1 px-1 hover:opacity-70 transition-opacity"
          >
            <img src="/lg-logo.svg" alt="LG" style={{ height: 20, width: 'auto' }} draggable={false} />
          </a>
          <div className={`w-px h-4 bg-gray-200 ${titleVis}`} />
          {onHome ? (
            <button
              type="button"
              onClick={onHome}
              aria-label="Home"
              className={`items-center rounded-md -mx-1 px-1 hover:opacity-70 transition-opacity ${center ? 'hidden lg:flex' : 'flex'}`}
            >
              {name}
            </button>
          ) : (
            name
          )}
        </div>
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
