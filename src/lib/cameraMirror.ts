export type CameraFacing = 'user' | 'environment';
export type CameraState = {
  status: 'idle' | 'requesting' | 'playing' | 'error';
  facing: CameraFacing;
  accessAttempts?: number;
  streamAcquired?: boolean;
  playAttempted?: boolean;
  error?: { name: string; message: string; stage: 'access' | 'play'; guidance: string };
};

export function cameraError(error: unknown, stage: 'access' | 'play'): NonNullable<CameraState['error']> {
  const e = error as { name?: string; message?: string } | null;
  const name = e?.name || 'UnknownError';
  const messages: Record<string, string> = {
    NotAllowedError: 'カメラへのアクセスが許可されていません。ブラウザと端末の設定からカメラを許可してください。',
    NotFoundError: 'この端末で利用できるカメラが見つかりません。',
    NotReadableError: 'カメラを使用できません。他のカメラアプリを閉じてもう一度お試しください。',
    OverconstrainedError: '指定したカメラを使用できません。別のカメラまたはブラウザでお試しください。',
    SecurityError: 'ブラウザのセキュリティ設定でカメラが制限されています。HTTPSのページを通常のブラウザで開いてください。',
    NotSupportedError: 'このブラウザではカメラを利用できません。ChromeやSafariなどのブラウザで開いてください。',
    AbortError: 'カメラの起動が中断されました。もう一度お試しください。',
  };
  return { name, message: e?.message || '', stage, guidance: stage === 'play'
    ? 'カメラ映像を再生できませんでした。「映像を再生する」を押してください。'
    : messages[name] || 'カメラを起動できませんでした。ブラウザで開き直してお試しください。' };
}

/** Local mirror only: no capture, recording, upload or device-ID persistence. */
export class CameraMirrorController {
  private generation = 0;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private state: CameraState = { status: 'idle', facing: 'user' };

  constructor(
    private readonly notify: (state: CameraState) => void,
    private readonly environment = () => ({ secure: window.isSecureContext, devices: navigator.mediaDevices }),
  ) {}

  private update(next: Partial<CameraState>) {
    this.state = { ...this.state, ...next };
    this.notify(this.state);
  }

  private release() {
    if (this.video) this.video.srcObject = null;
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
  }

  stop = () => {
    ++this.generation;
    this.release();
    this.update({ status: 'idle', error: undefined, streamAcquired: false, playAttempted: false });
  };

  // Called directly from a user click, before yielding to React/effects.
  start = async (facing: CameraFacing = this.state.facing) => {
    const generation = ++this.generation;
    this.release(); // Android devices may allow only one camera at a time.
    this.update({ status: 'requesting', facing, error: undefined, accessAttempts: 0, streamAcquired: false, playAttempted: false });
    try {
      const { secure, devices } = this.environment();
      if (!secure) throw new DOMException('Camera requires a secure context', 'SecurityError');
      if (!devices?.getUserMedia) throw new DOMException('getUserMedia is unavailable', 'NotSupportedError');
      let stream: MediaStream;
      try {
        const request = devices.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false });
        this.update({ accessAttempts: 1 });
        stream = await request;
      } catch (error) {
        if (generation !== this.generation) return;
        const name = (error as { name?: string })?.name;
        // Do not retry a denied permission or security failure.
        if (name !== 'OverconstrainedError' && name !== 'NotFoundError') throw error;
        const request = devices.getUserMedia({ video: true, audio: false });
        this.update({ accessAttempts: 2 });
        stream = await request;
      }
      if (generation !== this.generation) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      this.stream = stream;
      this.update({ streamAcquired: true });
      const actualFacing = stream.getVideoTracks()[0]?.getSettings().facingMode;
      if (actualFacing === 'user' || actualFacing === 'environment') this.update({ facing: actualFacing });
      await this.play();
    } catch (error) {
      if (generation === this.generation) {
        this.release();
        this.update({ status: 'error', error: cameraError(error, 'access') });
      }
    }
  };

  // Callback ref handles guide -> practice swaps and delayed permission responses.
  attach = (video: HTMLVideoElement | null) => {
    if (this.video && this.video !== video) this.video.srcObject = null;
    this.video = video;
    if (video && this.stream) void this.play();
  };

  play = async () => {
    const video = this.video;
    const stream = this.stream;
    const generation = this.generation;
    if (!video || !stream) return;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.srcObject = stream;
    try {
      const playback = video.play();
      this.update({ playAttempted: true });
      await playback;
      if (generation === this.generation && video === this.video) this.update({ status: 'playing', error: undefined });
    } catch (error) {
      if (generation === this.generation && video === this.video) this.update({ status: 'error', error: cameraError(error, 'play') });
    }
  };
}

// Carry only the entry destination; never copy auth codes, tokens or the URL hash.
export function cameraExternalUrl(current: string) {
  const source = new URL(current);
  const url = new URL('/', source.origin);
  url.searchParams.set('entry', source.searchParams.get('entry') === 'event-demo' ? 'event-demo' : 'teacher');
  url.searchParams.set('openExternalBrowser', '1');
  return url.href;
}
