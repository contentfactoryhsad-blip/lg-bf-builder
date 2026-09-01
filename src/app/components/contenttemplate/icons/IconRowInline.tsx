/**
 * The LG.com benefit icon row, drawn live from the icon registry.
 *
 * Ported from promotion-banner-variation's `IconRowGroup` (Banner.tsx). It
 * replaces the four baked overlay PNGs: the operator now picks solid/line ×
 * black/white, how many groups (1–3), and which benefit each group shows.
 * All proportions hang off the row height, exactly as the source did, so the
 * PC (424×60) and MO (510×72) boxes scale without per-size numbers.
 */
import React from 'react';
import { ICON_LIST, IconSvg, splitLabel } from './IconRegistry';
import type { IconRowStyle } from '../lgcomSlots';

export function IconRowInline({
  box,
  style,
  iconIds,
  labels,
}: {
  /** Where the row sits, in frame pixels. */
  box: { x: number; y: number; w: number; h: number };
  style: IconRowStyle;
  iconIds: string[];
  /**
   * Per-slot label overrides, aligned with `iconIds` — operators localise the
   * captions here. Empty/absent falls back to the registry label. A newline in
   * the override is the operator's own line break; without one, the first space
   * decides the split, same as registry labels.
   */
  labels?: (string | null)[];
}) {
  const isWhite = style.endsWith('white');
  const isLine = style.startsWith('line');
  const textColor = isWhite ? '#FFFFFF' : '#141414';
  const iconSize = box.h;
  const fontSize = box.h * 0.2333;
  // LINE icons carry divider elements between groups, so each gap is half of SOLID spacing
  const gap = isLine ? box.h * 0.195 : box.h * 0.293;
  const itemGap = isLine ? 0 : box.h * 0.1667;
  const tracking = fontSize * 0.02;
  const halo = isWhite ? '#000000' : '#FFFFFF';
  const dividerLen = iconSize * 0.6667;
  const dividerThickness = iconSize * 0.0167;
  const itemPadRight = iconSize * 0.1;

  const lineHalo1 = iconSize * 0.061;
  const lineHalo2 = iconSize * 0.183;
  const solidHalo1 = iconSize * 0.366;
  const solidHalo2 = iconSize * 0.122;

  const parentFilter = isLine
    ? `drop-shadow(0 0 ${lineHalo1}px ${halo}) drop-shadow(0 0 ${lineHalo2}px ${halo})`
    : undefined;

  const activeIcons = iconIds
    .map((id, i) => ({ id, item: ICON_LIST.find(x => x.id === id), custom: labels?.[i]?.trim() || null }))
    .filter(x => x.item);

  return (
    <div
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap,
        filter: parentFilter,
      }}
    >
      {activeIcons.map(({ id, item, custom }, i) => {
        const [line1, line2] = custom?.includes('\n')
          ? [custom.split('\n')[0], custom.split('\n').slice(1).join(' ')]
          : splitLabel(custom ?? item!.label);
        const showDivider = isLine && i < activeIcons.length - 1;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: itemGap,
                flex: '0 0 auto',
                paddingRight: isLine ? itemPadRight : 0,
              }}
            >
              <IconSvg iconId={id} style={style} size={iconSize} />
              <div
                style={{
                  fontFamily: 'var(--obs-font-text, "LG EI Text", sans-serif)',
                  fontWeight: 600,
                  fontSize,
                  color: textColor,
                  lineHeight: 1.14,
                  whiteSpace: 'pre-line',
                  textAlign: 'left',
                  textShadow: isLine
                    ? undefined
                    : `0 0 ${solidHalo1}px ${halo}, 0 0 ${solidHalo2}px ${halo}`,
                  letterSpacing: `${tracking}px`,
                }}
              >
                {line2 ? `${line1}\n${line2}` : line1}
              </div>
            </div>
            {showDivider && (
              <div
                style={{
                  width: dividerThickness,
                  height: dividerLen,
                  background: textColor,
                  flex: '0 0 auto',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
