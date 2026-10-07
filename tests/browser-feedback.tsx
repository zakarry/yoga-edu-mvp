// Local acceptance fixture: imports product components and audio, never a separate implementation.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/styles/global.css';
import { MyAITeacherPage } from '../src/components/MyAITeacherPage';
import { PracticeAudioRuntime } from '../src/lib/practiceAudioRuntime';
import { getVoiceGuideEngine, unlockAudioContext } from '../src/lib/voiceGuide';
import { getCatalogEntry } from '../src/lib/poseCatalog';
import { buildAsanaCues } from '../src/lib/asanaCueBuilder';

const pose = new URLSearchParams(location.search).get('pose');
if (pose) {
  const noop = () => {};
  createRoot(document.getElementById('root')!).render(<MyAITeacherPage initialPoseId={pose} latestDiagnosis={null} onBackHome={noop} onOpenDiagnosis={noop} onOpenMyPage={noop} onOpenProYoga={noop}/>);
} else {
  const root = document.getElementById('root')!;
  root.innerHTML = '<h1>実音声のローカル受入</h1><button id="rest">休息 1分</button><button id="tree">立ち木 左右30秒</button><button id="pause">一時停止</button><button id="resume">再開</button><button id="stop">中止</button><p id="status">待機中</p><pre id="events"></pre>';
  const engine = getVoiceGuideEngine();
  const runtime = new PracticeAudioRuntime(engine);
  let started = 0;
  runtime.addListener(event => {
    root.querySelector('#status')!.textContent = `${runtime.currentState} / ${engine.type} / ${engine.getStatus().error ?? 'no error'}`;
    root.querySelector('#events')!.textContent += JSON.stringify({seconds: Math.round((performance.now()-started)/100)/10, ...event})+'\n';
  });
  for (const [button, id] of [['rest','savasana'], ['tree','vrksasana']]) root.querySelector('#'+button)!.addEventListener('click', () => {
    unlockAudioContext(); started = performance.now(); root.querySelector('#events')!.textContent = '';
    runtime.start({practiceId:id, cues:buildAsanaCues(getCatalogEntry(id)!,1), totalDurationSec:60});
  });
  root.querySelector('#pause')!.addEventListener('click',()=>runtime.pause());
  root.querySelector('#resume')!.addEventListener('click',()=>runtime.resume());
  root.querySelector('#stop')!.addEventListener('click',()=>runtime.stop());
  window.addEventListener('pagehide',()=>runtime.dispose());
}
