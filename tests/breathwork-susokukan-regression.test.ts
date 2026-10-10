import test from 'node:test';
import assert from 'node:assert/strict';
import { PracticeAudioRuntime, type RuntimeEvent } from '../src/lib/practiceAudioRuntime';
import type { VoiceGuideEngine } from '../src/lib/voiceGuide';
import { buildBreathworkCues } from '../src/lib/breathworkCueBuilder';
import { getBreathworkEntry } from '../src/lib/breathworkCatalog';
import { SusokukanSession } from '../src/lib/susokukanSession';

test('Abdominal all rounds: audio ended gates holds; 4/6 seconds, subtitles and readings stay paired', t => {
  t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});
  let ended: (() => void) | null = null; let playing = false;
  const events: RuntimeEvent[] = []; const spoken: string[] = [];
  const engine: VoiceGuideEngine = {
    type:'audio-file',available:true,
    speak(text) {assert.equal(playing,false);playing=true;spoken.push(text);},
    speakByKey(_key,text) {this.speak(text ?? '');},
    stop(){playing=false;}, pause(){},resume(){},unlock(){},
    setOnCueEnd(cb){ended=cb;},getAudioDuration(){return null;},isPlaying(){return playing;},
    getStatus(){return {status:playing?'playing':'stopped',voiceName:null,error:null};},
  };
  const cues=buildBreathworkCues(getBreathworkEntry('abdominal-breathing')!);
  const runtime=new PracticeAudioRuntime(engine);
  runtime.start({practiceId:'abdominal-breathing',cues,onEvent:e=>events.push(e)});
  const holds:number[]=[];
  for (const [index,cue] of cues.entries()) {
    assert.equal(runtime.currentCueIndex,index);
    if(cue.type==='voice') {
      assert.equal(spoken.at(-1),cue.speechText);
      assert.equal(events.filter(e=>e.type==='subtitle').at(-1)?.subtitle,cue.displayText);
      const count=spoken.length;
      t.mock.timers.tick(7000); // longer transport latency cannot skip or truncate guidance
      assert.equal(spoken.length,count);assert.equal(runtime.currentCueIndex,index);
      playing=false;ended?.();
      if(cue.isFinalCue) {
        assert.equal(runtime.currentState,'running');
        t.mock.timers.tick(399);assert.equal(runtime.currentState,'running');
        t.mock.timers.tick(1); // existing final narration drain gap, not a changed product timer
      }
    } else if(cue.type==='silence') {
      holds.push(runtime.holdRemainingSeconds);
      assert.equal(runtime.holdRemainingSeconds,cue.durationSec);
      runtime.pause();t.mock.timers.tick(10000);assert.equal(runtime.holdRemainingSeconds,cue.durationSec);
      runtime.resume();
      t.mock.timers.tick(cue.durationSec!*1000-1);assert.equal(runtime.currentCueIndex,index);
      t.mock.timers.tick(1);
    } else {assert.equal(runtime.currentState,'completed');}
  }
  assert.deepEqual(holds,Array.from({length:6},()=>[4,6]).flat());
  assert.equal(events.filter(e=>e.type==='complete').length,1);
  runtime.dispose();
});

test('Susokukan buffering timeout releases audio; stale notifications cannot recover failed session', t => {
  t.mock.timers.enable({apis:['setTimeout'],now:100000});
  let state: {status:string} = {status:'idle'};let paused=0,cleared=0;
  const audio={currentTime:0,play:()=>Promise.resolve(),pause(){paused++;},removeAttribute(){cleared++;},load(){},onplaying:null,onwaiting:null,onended:null,onerror:null};
  const frames=new Map<number,FrameRequestCallback>();let id=0;
  const oldRaf=globalThis.requestAnimationFrame,oldCancel=globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame=cb=>{frames.set(++id,cb);return id;};
  globalThis.cancelAnimationFrame=n=>{frames.delete(n);};
  try {
    const session=new SusokukanSession(value=>state=value,()=>audio as unknown as HTMLAudioElement,()=>100000);
    session.start();const stalePlaying=audio.onplaying as (()=>void)|null;
    t.mock.timers.tick(20000);
    assert.equal(state.status,'error');assert.equal(frames.size,0);assert.equal(paused,1);assert.equal(cleared,1);
    stalePlaying?.();assert.equal(state.status,'error');
    session.dispose();
  } finally {globalThis.requestAnimationFrame=oldRaf;globalThis.cancelAnimationFrame=oldCancel;}
});
