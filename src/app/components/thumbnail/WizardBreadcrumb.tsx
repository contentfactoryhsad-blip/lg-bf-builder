import React from 'react';
import { useT } from '../../i18n/LanguageContext';

/** The live Thumbnail Builder wizard — template pick through download. */
export const THUMBNAIL_WIZARD_STEPS = [
  '1. Select Template',
  '2. Upload URLs',
  '3. Edit',
  '4. Select Feature Cards',
  '5. Review & Download',
];

/** Step bar shown on every screen of the Thumbnail Builder flow. Steps
 *  BEFORE the active one are clickable (jump back, state preserved). */
export function WizardBreadcrumb({
  steps,
  activeStep,
  onStepClick,
}: {
  steps: string[];
  activeStep: number;
  onStepClick: (step: number) => void;
}) {
  const t = useT();
  return (
    <div className="bg-[#F0ECE4] px-6 h-11 flex items-center justify-center gap-2 shrink-0">
      {steps.map((step, i) => {
        const stepN = i + 1;
        const isActive = stepN === activeStep;
        const isDone = stepN < activeStep;
        return (
          <React.Fragment key={step}>
            {i > 0 && (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="#CBC8C2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <button
              type="button"
              onClick={() => isDone && onStepClick(stepN)}
              disabled={!isDone}
              className={`text-sm transition-colors ${isActive ? 'font-medium cursor-default' : 'font-light'} ${isDone ? 'cursor-pointer hover:opacity-70' : 'cursor-default'}`}
              style={{ color: isActive ? '#4A4946' : '#716F6A' }}
            >
              {t(step)}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
