import test from 'node:test';
import assert from 'node:assert/strict';
import { PracticeAudioRuntime, type PracticeCue, type RuntimeEvent } from '../src/lib/practiceAudioRuntime';
import { buildBreathworkCues } from '../src/lib/breathworkCueBuilder';
import { getBreathworkEntry } from '../src/lib/breathworkCatalog';

function transport(){
 const playback={ended:null as (()=>void)|null};let playing=false,overlap=0;const spoken:string[]=[];
 const engine={type:'audio-file' as const,available:true,speak(text:string){if(playing)overlap++;playing=true;spoken.push(text);},speakByKey(_key:string,text?:string){this.speak(text??'');},stop(){playing=false;},pause(){},resume(){},unlock(){},setOnCueEnd(cb:(()=>void)|null){playback.ended=cb;},getAudioDuration(){return null;},isPlaying(){return playing;},getStatus(){return {status:'available' as const,voiceName:null,error:null};}};
 return {engine,playback,spoken,finish(){playing=false;playback.ended?.();},get overlap(){return overlap;}};
}
const cues:PracticeCue[]=[{id:'phase',type:'voice',speechText:'吸います',displayText:'吸う',phaseDurationSec:4},{id:'next',type:'voice',speechText:'止めます',displayText:'止める',phaseDurationSec:4},{id:'complete',type:'complete'}];

test('Q-05 long Box voice still blocks next cue after repeated pause/resume and expired phase timer',t=>{
 t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});
 const a=transport(),events:RuntimeEvent[]=[],r=new PracticeAudioRuntime(a.engine);
 r.start({practiceId:'box-breathing',cues,onEvent:e=>events.push(e)});
 t.mock.timers.tick(1000);r.pause();r.pause();t.mock.timers.tick(9000);assert.equal(r.holdRemainingSeconds,3);
 r.resume();r.resume();t.mock.timers.tick(1000);r.pause();t.mock.timers.tick(9000);assert.equal(r.holdRemainingSeconds,2);r.resume();t.mock.timers.tick(2000);
 assert.equal(r.currentCueIndex,0);assert.equal(a.overlap,0);assert.deepEqual(a.spoken,['吸います']);assert.equal(events.filter(e=>e.type==='subtitle').at(-1)?.subtitle,'吸う');
 a.finish();assert.equal(r.currentCueIndex,1);assert.equal(a.overlap,0);r.dispose();
});

test('short voice ended while paused is retained; remaining minimum time resumes without duplicate playback',t=>{
 t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});
 const a=transport(),r=new PracticeAudioRuntime(a.engine);r.start({practiceId:'box-breathing',cues});
 t.mock.timers.tick(1000);r.pause();a.finish();t.mock.timers.tick(9000);assert.equal(r.currentCueIndex,0);r.resume();t.mock.timers.tick(2999);assert.equal(r.currentCueIndex,0);t.mock.timers.tick(1);assert.equal(r.currentCueIndex,1);assert.deepEqual(a.spoken,['吸います','止めます']);r.dispose();
});

test('pause after minimum expired still waits for voice end, including ended during pause',t=>{
 t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});
 const a=transport(),r=new PracticeAudioRuntime(a.engine);r.start({practiceId:'box-breathing',cues});
 t.mock.timers.tick(4000);r.pause();a.finish();r.resume();assert.equal(r.currentCueIndex,1);assert.equal(a.overlap,0);r.dispose();
});

test('next cancels current audio; old ended events cannot advance the new step or a restarted session',t=>{
 t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});
 const a=transport(),r=new PracticeAudioRuntime(a.engine);r.start({practiceId:'box-breathing',cues});const old=a.playback.ended;r.next();assert.equal(r.currentCueIndex,1);old?.();assert.equal(r.currentCueIndex,1);assert.equal(a.overlap,0);
 r.stop();r.start({practiceId:'box-breathing',cues});old?.();t.mock.timers.tick(4000);assert.equal(r.currentCueIndex,0);assert.equal(a.overlap,0);r.dispose();
});

test('final drain and late ended cannot affect a new session at the same cue index',t=>{
 t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});
 const a=transport(),r=new PracticeAudioRuntime(a.engine);r.start({practiceId:'old',cues:[{id:'end',type:'voice',speechText:'完了',isFinalCue:true},{id:'done',type:'complete'}]});a.finish();r.stop();r.start({practiceId:'new',cues});t.mock.timers.tick(400);assert.equal(r.currentCueIndex,0);r.dispose();
});

test('leave/dispose cancels phase timer and all late audio callbacks',t=>{
 t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});
 const a=transport(),events:RuntimeEvent[]=[],r=new PracticeAudioRuntime(a.engine);r.start({practiceId:'box-breathing',cues,onEvent:e=>events.push(e)});const late=a.playback.ended;r.dispose();const n=events.length;late?.();t.mock.timers.tick(60000);assert.equal(events.length,n);assert.equal(r.currentState,'idle');assert.equal(a.playback.ended,null);
});

test('normal real Box guide preserves 16 four-second phases and completes once after final narration',t=>{
 t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});
 const a=transport(),r=new PracticeAudioRuntime(a.engine),guide=buildBreathworkCues(getBreathworkEntry('box-breathing')!),events:RuntimeEvent[]=[];
 r.start({practiceId:'box-breathing',cues:guide,onEvent:e=>events.push(e)});
 let phases=0;
 for(const [i,c] of guide.entries()){
  assert.equal(r.currentCueIndex,i);
  if(c.type==='voice'){
   if(c.phaseDurationSec){phases++;assert.equal(c.phaseDurationSec,4);t.mock.timers.tick(1000);a.finish();t.mock.timers.tick(2999);assert.equal(r.currentCueIndex,i);t.mock.timers.tick(1);}
   else {a.finish();if(c.isFinalCue)t.mock.timers.tick(400);}
  }
 }
 assert.equal(phases,16);assert.equal(a.overlap,0);assert.equal(events.filter(e=>e.type==='complete').length,1);r.dispose();
});

test('paused next skips once; stale voice completion at identical index cannot affect restarted session', t => {
 t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});
 const a=transport(),r=new PracticeAudioRuntime(a.engine),plain:PracticeCue[]=[{id:'one',type:'voice',speechText:'一'},{id:'two',type:'voice',speechText:'二'},{id:'done',type:'complete'}];
 r.start({practiceId:'plain',cues:plain});const old=a.playback.ended;r.stop();r.start({practiceId:'plain',cues:plain});old?.();assert.equal(r.currentCueIndex,0);
 r.pause();r.next();assert.equal(r.currentState,'paused');r.resume();assert.equal(r.currentCueIndex,1);assert.equal(a.overlap,0);a.finish();assert.equal(r.currentState,'completed');r.dispose();
});

test('final 400ms drain freezes on pause and duplicate ended does not reset it', t => {
 t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});
 const a=transport(),r=new PracticeAudioRuntime(a.engine);r.start({practiceId:'final',cues:[{id:'voice',type:'voice',speechText:'終わり',isFinalCue:true},{id:'done',type:'complete'}]});
 const ended=a.playback.ended;a.finish();assert.equal(r.holdRemainingSeconds,0);t.mock.timers.tick(100);ended?.();r.pause();t.mock.timers.tick(9000);r.resume();t.mock.timers.tick(299);assert.equal(r.currentState,'running');t.mock.timers.tick(1);assert.equal(r.currentState,'completed');r.dispose();
});
