import { useEffect, useRef, useState } from 'react';
import liff from '@line/liff';
import { CameraMirrorController, cameraExternalUrl, type CameraState } from '../lib/cameraMirror';

export function useCameraMirror(available: boolean) {
  const [state, setState] = useState<CameraState>({ status: 'idle', facing: 'user' });
  const [permission, setPermission] = useState<string>('取得できません');
  const controllerRef = useRef<CameraMirrorController>();
  if (!controllerRef.current) controllerRef.current = new CameraMirrorController(setState);
  const controller = controllerRef.current;
  useEffect(() => {
    if (!available) controller.stop();
  }, [available, controller]);
  useEffect(() => {
    const stop = () => controller.stop();
    window.addEventListener('pagehide', stop);
    return () => { window.removeEventListener('pagehide', stop); controller.stop(); };
  }, [controller]);
  const on = state.status === 'requesting' || state.status === 'playing' || state.error?.stage === 'play';
  useEffect(() => {
    let disposed = false;
    // Optional diagnostic only; unsupported Permissions APIs never block camera access.
    void (async () => {
      try {
        const result = await navigator.permissions?.query({ name: 'camera' as PermissionName });
        if (!disposed && result) setPermission(result.state);
      } catch { /* Not all browsers implement the camera permission query. */ }
    })();
    return () => { disposed = true; };
  }, [state.status]);
  return { state, controller, on, permission, start: () => { if (available) void controller.start(); } };
}

export function CameraMirrorStatus({ camera }: { camera: ReturnType<typeof useCameraMirror> }) {
  const { state, controller } = camera;
  const url = cameraExternalUrl(window.location.href);
  return <div className="camera-mirror-status" style={{ overflowWrap: 'anywhere', maxWidth: '100%' }}>
    {state.status === 'requesting' && <p role="status">カメラの許可を確認しています。許可画面が出たらカメラを許可してください。表示されない場合はブラウザで開いてください。</p>}
    {(state.status === 'requesting' || state.error) && <details><summary>カメラの接続状態</summary>
      <p>Secure context: {String(window.isSecureContext)} / API: {String(!!navigator.mediaDevices?.getUserMedia)} / permission: {camera.permission} / {state.status}</p>
      <p>getUserMedia: {state.accessAttempts ?? 0} / stream: {String(!!state.streamAcquired)} / play: {String(!!state.playAttempted)}</p>
    </details>}
    {state.error && <div role="alert">
      <p>{state.error.guidance}</p>
      {state.error.stage === 'play' && <button type="button" className="secondary-button" onClick={() => void controller.play()}>映像を再生する</button>}
      <details><summary>カメラのエラー詳細</summary><p>{state.error.stage}: {state.error.name}</p><p>{state.error.message}</p></details>
    </div>}
    {(state.status === 'requesting' || state.error) && <>
      <a className="secondary-button" href={url} target="_blank" rel="noopener noreferrer" onClick={event => {
        // Do not initialize LIFF or alter login for a camera fallback.
        try {
          if (liff.isInClient()) { liff.openWindow({ url, external: true }); event.preventDefault(); }
        } catch { /* The ordinary HTTPS link remains available. */ }
      }}>ブラウザで開く</a>
      <p>LINE内で開けない場合は、右上のメニューから「ブラウザで開く」を選び、カメラを再度起動してください。</p>
    </>}
  </div>;
}
