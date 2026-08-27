import React from 'react';
import { BackButton } from './BackButton';

interface Props {
  title: string;
  /** Back pill shown top-left. Omit entirely on screens with no "back" (Home). */
  onBack?: () => void;
  /** Right-aligned actions (buttons, badges, language picker, etc.). */
  right?: React.ReactNode;
}

/**
 * Shared 64px app header: Back pill (optional) + LG logo/title, both
 * left-aligned, with right-side actions.
 */
export function AppHeader({ title, onBack, right }: Props) {
  return (
    <header className="bg-white border-b border-gray-200 px-8 h-16 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-4 shrink-0">
        {onBack && <BackButton onClick={onBack} />}
        <div className="flex items-center gap-2">
          <img src="/lg-logo.svg" alt="LG" style={{ height: 20, width: 'auto' }} draggable={false} />
          <div className="w-px h-4 bg-gray-200" />
          <span className="font-lgei font-bold text-[15px] text-gray-900" style={{ lineHeight: '20px' }}>
            {title}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">{right}</div>
    </header>
  );
}
