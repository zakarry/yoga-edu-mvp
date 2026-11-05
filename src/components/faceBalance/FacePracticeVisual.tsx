import { useEffect, useRef, useState, type ReactNode } from 'react';
import { faceVisualAssets, faceVisualFrame, type FaceVisualCue } from '../../lib/faceVisualTimeline';

interface Props {
  id: string;
  cue?: FaceVisualCue;
  cueIndex: number;
  elapsedMs: number;
  label: string;
  finished?: boolean;
  children: ReactNode;
}

export function FacePracticeVisual({ id, cue, cueIndex, elapsedMs, label, finished, children }: Props) {
  const asset = faceVisualAssets[id];
  const frame = faceVisualFrame(id, cue, cueIndex, elapsedMs, finished);
  if (!asset || frame === null) return <>{children}</>;
  return <FrameVideo key={id} asset={asset} frame={frame} label={label}>{children}</FrameVideo>;
}

function FrameVideo({ asset, frame, label, children }: {
  asset: NonNullable<typeof faceVisualAssets[string]>;
  frame: number;
  label: string;
  children: ReactNode;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [shownFrame, setShownFrame] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = video.current;
    return () => {
      if (!element) return;
      element.pause();
      element.removeAttribute('src');
      element.load();
    };
  }, []);

  useEffect(() => {
    const element = video.current;
    if (!element || failed) return;
    let current = true;
    const target = (frame + 0.5) * asset.frameSeconds;
    const fail = () => { if (current) setFailed(true); };
    const ready = () => {
      if (current && element.readyState >= 2 && !element.seeking &&
          Math.abs(element.currentTime - target) < 0.04) {
        clearTimeout(timeout);
        setShownFrame(frame);
      }
    };
    const seek = () => {
      if (!current) return;
      if (!Number.isFinite(element.duration) || Math.abs(element.duration - asset.duration) > 0.07) {
        fail();
        return;
      }
      element.pause();
      try {
        if (Math.abs(element.currentTime - target) < 0.04) ready();
        else element.currentTime = target;
      } catch { fail(); }
    };
    const timeout = window.setTimeout(fail, 8000);
    element.addEventListener('loadedmetadata', seek);
    element.addEventListener('loadeddata', seek);
    element.addEventListener('seeked', ready);
    element.addEventListener('error', fail);
    if (element.readyState >= 1) seek();
    return () => {
      current = false;
      clearTimeout(timeout);
      element.removeEventListener('loadedmetadata', seek);
      element.removeEventListener('loadeddata', seek);
      element.removeEventListener('seeked', ready);
      element.removeEventListener('error', fail);
    };
  }, [asset, frame, failed]);

  const ready = !failed && shownFrame === frame;
  const visibleHeight = asset.height - asset.cropTop - (asset.cropBottom ?? 0);
  return <figure style={{ margin: '12px 0', maxWidth: 'min(100%, 320px)' }}
    data-testid="face-animation" data-frame={frame}
    data-visual-status={failed ? 'fallback' : ready ? 'ready' : 'loading'}>
    <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: asset.width + '/' + visibleHeight }}>
      <video ref={video} src={asset.url} muted playsInline preload="auto"
        role="img" aria-label={label} aria-hidden={!ready}
        style={{
          position: 'absolute', left: 0, top: -(asset.cropTop / visibleHeight) * 100 + '%',
          width: '100%', height: 'auto', display: failed ? 'none' : 'block',
          visibility: ready ? 'visible' : 'hidden', transform: asset.mirror ? 'scaleX(-1)' : undefined,
        }} />
      {!ready && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        {children}
      </div>}
    </div>
    <figcaption style={{ fontSize: 13 }}>
      {failed ? '映像を読み込めないため模式図を表示しています。' : '試作映像・動作と左右は監修待ちです。'}
    {asset.review && <span> {asset.review}</span>}
    </figcaption>
  </figure>;
}
