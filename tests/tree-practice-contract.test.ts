import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import before from './fixtures/tree-before-cabf5e0.json';
import { getCatalogEntry } from '../src/lib/poseCatalog';
import { buildAsanaCues } from '../src/lib/asanaCueBuilder';
import { defineTreePractice, validatePracticeDefinitions } from '../src/lib/practiceDefinition';
import { PracticeAudioRuntime, type PracticeCue, type RuntimeEvent } from '../src/lib/practiceAudioRuntime';
import { TreeHoldTimer } from '../src/components/TreeHoldTimer';
import type { VoiceGuideEngine } from '../src/lib/voiceGuide';

const entry = getCatalogEntry('vrksasana')!;
test('tree contract retains all baseline guides, Visual/Safety/Knowledge and original object identity', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(entry)), before.entry);
  for (const saved of before.guides) {
    const cues = buildAsanaCues(entry, saved.minutes), d = defineTreePractice(entry, cues);
    assert.deepEqual(cues, saved.cues);
    assert.equal(d.content, entry); assert.equal(d.guide.cues, cues);
    assert.equal(d.knowledge.catalogReference, entry.knowledge);
    assert.deepEqual(validatePracticeDefinitions([d]), []);
    assert.equal(d.review.fullAudioCaptionSync, 'unconfirmed');
    assert.equal(d.review.pronunciation, 'unconfirmed');
    assert.deepEqual(d.timing, { mode:'narration_then_hold', holds:[{side:'right',seconds:Math.max(1,Math.floor(saved.minutes*60/2))},{side:'left',seconds:Math.max(1,Math.floor(saved.minutes*60/2))}], narrationConsumesHold:false });
  }
});

test('tree registration rejects guide/declared hold mismatch, missing side and unequal actual holds', () => {
  const d = defineTreePractice(entry, buildAsanaCues(entry,1));
  for (const mutate of [
    (c: typeof d) => { c.guide.cues.find(q=>q.type==='silence')!.durationSec=29; },
    (c: typeof d) => { delete c.guide.cues.find(q=>q.type==='silence')!.side; },
    (c: typeof d) => { c.guide.cues.splice(c.guide.cues.findIndex(q=>q.type==='silence'),1); },
  ]) { const c=structuredClone(d); mutate(c); assert.ok(validatePracticeDefinitions([c]).some(i=>i.code==='bilateral-guide')); }
});

test('tree before/after runtime, subtitles, numeric timer and side events match through delayed guidance and pause/stop', t => {
  t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});
  const run = (cues: PracticeCue[], stopEarly=false) => {
    const started=Date.now(), events: {at:number;event:RuntimeEvent}[]=[], spoken:{key:string|null;text:string}[]=[], timer:{at:number;html:string}[]=[], holds:number[]=[];
    const playback={ended:null as (()=>void)|null}; let playing=false;
    const engine: VoiceGuideEngine={type:'audio-file',available:true,
      speak(text){assert.equal(playing,false);playing=true;spoken.push({key:null,text});},
      speakByKey(key,text){assert.equal(playing,false);playing=true;spoken.push({key,text:text??''});},
      stop(){playing=false;},pause(){},resume(){},unlock(){},setOnCueEnd(cb){playback.ended=cb;},getAudioDuration(){return null;},isPlaying(){return playing;},getStatus(){return {status:playing?'playing':'stopped',voiceName:null,error:null};}};
    const runtime=new PracticeAudioRuntime(engine);
    const sample=()=>timer.push({at:Date.now()-started,html:renderToStaticMarkup(React.createElement(TreeHoldTimer,{remaining:runtime.holdRemainingSeconds,holdSeconds:30}))});
    runtime.start({practiceId:'vrksasana',cues,totalDurationSec:60,onEvent:event=>events.push({at:Date.now()-started,event})});
    if(stopEarly){const stale=playback.ended;runtime.stop();const n=events.length;t.mock.timers.tick(30000);stale?.();assert.equal(events.length,n);assert.equal(runtime.currentState,'idle');}
    else for(const [index,cue] of cues.entries()){
      assert.equal(runtime.currentCueIndex,index);
      if(cue.type==='voice'){
        sample();assert.match(timer.at(-1)!.html,/案内中/);assert.match(timer.at(-1)!.html,/0:30/);
        t.mock.timers.tick(37000+index*17);assert.equal(runtime.currentCueIndex,index,'guidance must finish even after planned hold time');assert.equal(runtime.holdRemainingSeconds,0);
        assert.equal(events.filter(e=>e.event.type==='subtitle').at(-1)?.event.subtitle,cue.displayText);
        playing=false;playback.ended?.();
      }else if(cue.type==='silence'){
        holds.push(runtime.holdRemainingSeconds);assert.equal(runtime.holdRemainingSeconds,30);sample();
        assert.match(timer.at(-1)!.html,/保持中/);assert.match(timer.at(-1)!.html,/0:30/);
        t.mock.timers.tick(1000);sample();assert.match(timer.at(-1)!.html,/0:29/);
        runtime.pause();t.mock.timers.tick(17000);assert.equal(runtime.holdRemainingSeconds,29);sample();runtime.resume();
        t.mock.timers.tick(28999);assert.equal(runtime.currentCueIndex,index);t.mock.timers.tick(1);
      }
    }
    if(!stopEarly){assert.deepEqual(holds,[30,30]);assert.equal(runtime.currentState,'completed');assert.equal(events.filter(e=>e.event.type==='complete').length,1);assert.deepEqual(events.filter(e=>e.event.type==='phaseChange').map(e=>e.event.phase),['right','left']);}
    runtime.dispose();return {events,spoken,timer,holds};
  };
  const baseline=before.guides.find(g=>g.minutes===1)!.cues as PracticeCue[], current=buildAsanaCues(entry,1);
  assert.deepEqual(run(current),run(baseline));assert.deepEqual(run(current,true),run(baseline,true));
});
