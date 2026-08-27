import React from 'react';
import type { ThumbnailTemplateProps } from './thumbnailRegistry';
import { ThumbnailPlaceholderTemplate } from './ThumbnailPlaceholderTemplate';

/**
 * Renders a thumbnail slot as its exported Figma PNG.
 *
 * Resolves the image for the active orientation (GWP / Bundle), falling back to
 * whichever orientation image exists. Until the PNG is present on disk, or if it
 * fails to load, it falls back to the dashed placeholder so the builder never
 * shows a broken image.
 */
export function ThumbnailTemplate({ slot, orientation }: ThumbnailTemplateProps) {
  const { w, h } = slot.size;
  const src =
    slot.images[orientation] ?? slot.images.horizontal ?? slot.images.vertical;

  const [errored, setErrored] = React.useState(false);

  if (!src || errored) {
    return <ThumbnailPlaceholderTemplate slot={slot} orientation={orientation} />;
  }

  return (
    <div style={{ width: w, height: h }} className="relative overflow-hidden bg-white">
      <img
        src={src}
        alt={slot.nameKey}
        width={w}
        height={h}
        draggable={false}
        onError={() => setErrored(true)}
        style={{ width: w, height: h, objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
}
