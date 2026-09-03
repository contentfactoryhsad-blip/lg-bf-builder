/**
 * mp4 export for the motion key visual — cut on demand, in the browser.
 *
 * The two ST0001 hero placements ship as video, and they ship bare: artwork
 * plus, at most, the benefit icon row. The cut is pure geometry — place the
 * 3000×3000 master where `artFor` puts the still, crop the banner, overlay the
 * icons — so it renders from whatever the builder currently holds, with nothing
 * pre-baked to go stale.
 *
 * The pipeline is WebCodecs via mediabunny: hardware decode → canvas composite
 * → hardware H.264 encode. A 7 s master cuts in a few seconds. The earlier
 * ffmpeg.wasm attempt did the same job on a single software thread and took 8+
 * minutes per file — that is the approach not to revisit, not on-demand cutting
 * itself.
 *
 * There is deliberately no pre-rendered fallback. One existed briefly, but its
 * placement values were a hand-synced copy of `lgcomSlots.ts`, which is a
 * machine for silently shipping stale video; and every browser this builder
 * targets has WebCodecs. A failed cut is reported, not papered over.
 */
import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  CanvasSource,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  VideoSampleSink,
} from 'mediabunny';
export interface MotionCut {
  w: number;
  h: number;
  /** Where the artwork square sits in the frame — the still's own placement. */
  art: { x: number; y: number; size: number };
  /** Benefit icons burned over the video, when the operator has them on. */
  iconRow?: { url: string; x: number; y: number; w: number; h: number };
}

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

/** Hardware-encoded cut of the motion master. Throws where WebCodecs cannot. */
export async function renderMotionCutLive(motionUrl: string, cut: MotionCut): Promise<Blob> {
  if (typeof VideoEncoder === 'undefined') throw new Error('WebCodecs unavailable');
  const { w, h, art, iconRow } = cut;

  const [srcBlob, icon] = await Promise.all([
    fetch(motionUrl).then(r => { if (!r.ok) throw new Error(`motion fetch ${r.status}`); return r.blob(); }),
    iconRow ? loadImage(iconRow.url) : Promise.resolve(null),
  ]);

  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(srcBlob) });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error('no video track');
  const frameRate = (await track.computePacketStats(50)).averagePacketRate || 24;

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const source = new CanvasSource(canvas, { codec: 'avc', bitrate: QUALITY_HIGH });
  output.addVideoTrack(source, { frameRate });
  await output.start();

  const sink = new VideoSampleSink(track);
  for await (const sample of sink.samples()) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    sample.draw(ctx, art.x, art.y, art.size, art.size);
    if (icon && iconRow) ctx.drawImage(icon, iconRow.x, iconRow.y, iconRow.w, iconRow.h);
    await source.add(sample.timestamp, sample.duration);
    sample.close();
  }
  source.close();
  await output.finalize();

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error('empty output');
  return new Blob([buffer], { type: 'video/mp4' });
}

/**
 * The Shorts download with sound off: same file, minus the audio track.
 *
 * mediabunny's Conversion passes the video stream through untouched when no
 * transform is asked of it, so this is a lossless remux — the H.264 packets in
 * the output are byte-identical to the source. Only the audio is dropped.
 */
export async function stripAudioTrack(srcUrl: string): Promise<Blob> {
  const { Conversion } = await import('mediabunny');
  const srcBlob = await (await fetch(srcUrl)).blob();
  const input = new Input({ source: new BlobSource(srcBlob), formats: ALL_FORMATS });
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const conversion = await Conversion.init({ input, output, audio: { discard: true } });
  await conversion.execute();
  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error('empty output');
  return new Blob([buffer], { type: 'video/mp4' });
}
