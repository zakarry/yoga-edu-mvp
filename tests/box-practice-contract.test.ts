import test from 'node:test';
import { withoutTeacherSettingsEdits } from './teacher-settings-source-boundary';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import before from './fixtures/box-before-b7448f0.json';
import q05Approved from './fixtures/q05-approved-source-hashes.json';
import { getBreathworkEntry } from '../src/lib/breathworkCatalog';
import { buildBreathworkCues } from '../src/lib/breathworkCueBuilder';
import { defineBoxPractice, validatePracticeDefinitions } from '../src/lib/practiceDefinition';
import { collectPracticeOutputs } from '../scripts/audit-practice-core';
import { BreathworkVisual, buildPhasesFromPattern, type BreathPhase } from '../src/components/BreathworkVisual';
import { PracticeAudioRuntime, type PracticeCue, type RuntimeEvent } from '../src/lib/practiceAudioRuntime';
import type { VoiceGuideEngine } from '../src/lib/voiceGuide';

// tsx uses classic JSX here; production Vite uses automatic JSX. Test harness only.
(globalThis as unknown as {React:typeof React}).React=React;
const entry=getBreathworkEntry('box-breathing')!;
const definition=()=>defineBoxPractice(entry,buildBreathworkCues(entry));
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');

test('Box contract preserves exact main output, 4/4/4/4 x4, all cues and original content/Knowledge identity',()=>{
  const d=definition();
  assert.deepEqual(JSON.parse(JSON.stringify(entry)),before.entry);
  // JSON cannot retain the existing builder's own undefined speechText property.
  assert.deepEqual(d.guide.cues,before.cues.map(c => ({...c, speechText: 'speechText' in c ? c.speechText : undefined})));
  assert.deepEqual(buildPhasesFromPattern(entry.pattern!),before.phases);
  assert.deepEqual(JSON.parse(JSON.stringify(collectPracticeOutputs().find(r=>r.entry.id===entry.id))),before.output);
  assert.equal(d.content,entry);assert.equal(d.timing.mode,'phase_minimum_and_voice_end');
  if(d.timing.mode==='phase_minimum_and_voice_end') assert.equal(d.timing.pattern,entry.pattern);
  const cues=buildBreathworkCues(entry);assert.equal(defineBoxPractice(entry,cues).guide.cues,cues);
  assert.equal(d.knowledge.catalogReference,entry.knowledge);assert.equal(d.review.pronunciation,'unconfirmed');assert.equal(d.review.fullAudioCaptionSync,'unconfirmed');
  assert.deepEqual(validatePracticeDefinitions([d]),[]);
  assert.deepEqual(entry.pattern,{inhaleSec:4,holdAfterInhaleSec:4,exhaleSec:4,holdAfterExhaleSec:4,rounds:4});
});

test('Box visual SSR and protected sources preserve baseline plus independently approved Q-05 repair; builder allows only exact read adapter',()=>{
  for(const [path,expected] of Object.entries(before.sourceHashes)){
    let source=readFileSync(path,'utf8').replace(/\r\n/g,'\n');
    if(path==='src/lib/breathworkCueBuilder.ts') source=source
      .replace('defineAbdominalPractice, defineBoxPractice','defineAbdominalPractice')
      .replace("  if (entry.id === 'box-breathing') return defineBoxPractice(entry, cues).guide.cues;\n",'');
    assert.equal(hash(withoutTeacherSettingsEdits(path,source)),(q05Approved as Record<string,string>)[path] ?? expected,path);
  }
  for(const saved of before.renders) assert.equal(renderToStaticMarkup(React.createElement(BreathworkVisual,{breathwork:entry,phase:saved.phase as BreathPhase,remainingSeconds:saved.remaining,isRunning:true,isCompleted:false,phaseDurationSeconds:4})),saved.html);
});

test('Box registration rejects changed phases, lost rounds, silence conversion, ambiguous reading and wrong clock',()=>{
  const d=definition();
  const reject=(mutate:(c:typeof d)=>void,code:string)=>{const c=structuredClone(d);mutate(c);assert.ok(validatePracticeDefinitions([c]).some(i=>i.code===code),code);};
  reject(c=>{c.guide.cues.find(q=>q.phaseDurationSec)!.phaseDurationSec=3;},'phase-guide');
  reject(c=>{c.guide.cues.splice(c.guide.cues.findIndex(q=>q.phaseDurationSec),4);},'phase-guide');
  reject(c=>{const q=c.guide.cues.find(q=>q.phaseDurationSec)!;q.type='silence';q.durationSec=4;delete q.phaseDurationSec;},'phase-guide');
  reject(c=>{c.guide.cues[0].speechText='鼻から吐きます。';},'pronunciation');
  reject(c=>{c.timing={mode:'wall_clock_with_voice_drain',plannedSec:64};},'box-clock');
});

function transport(){
  const playback={ended:null as (()=>void)|null};let playing=false,overlaps=0;const spoken:{key:string|null;text:string}[]=[];
  const say=(key:string|null,text:string)=>{if(playing) overlaps++;playing=true;spoken.push({key,text});};
  const engine:VoiceGuideEngine={type:'audio-file',available:true,speak(text){say(null,text);},speakByKey(key,text){say(key,text??'');},stop(){playing=false;},pause(){},resume(){},unlock(){},setOnCueEnd(cb){playback.ended=cb;},getAudioDuration(){return null;},isPlaying(){return playing;},getStatus(){return {status:playing?'playing':'stopped',voiceName:null,error:null};}};
  return {engine,playback,spoken,finish(){playing=false;playback.ended?.();},get overlaps(){return overlaps;}};
}

test('Box before/after production runtime traces match for short/long audio, 16 phases, paused timer, ending and stop',t=>{
  t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});
  const run=(cues:PracticeCue[],stopEarly=false)=>{
    const a=transport(),start=Date.now(),events:{at:number;event:RuntimeEvent}[]=[],samples:{at:number;cue:number;remaining:number}[]=[];
    const runtime=new PracticeAudioRuntime(a.engine);
    runtime.start({practiceId:'box-breathing',cues,onEvent:event=>events.push({at:Date.now()-start,event})});
    const sample=()=>samples.push({at:Date.now()-start,cue:runtime.currentCueIndex,remaining:runtime.holdRemainingSeconds});
    let phaseCount=0;
    if(stopEarly){const stale=a.playback.ended;runtime.stop();const n=events.length;t.mock.timers.tick(30000);stale?.();assert.equal(events.length,n);}
    else for(const [i,cue] of cues.entries()){
      assert.equal(runtime.currentCueIndex,i);
      if(cue.type==='voice'&&cue.phaseDurationSec){
        phaseCount++;sample();assert.equal(runtime.holdRemainingSeconds,4);
        if(phaseCount%2===0){
          t.mock.timers.tick(4000);sample();assert.equal(runtime.currentCueIndex,i,'phase elapsed must wait for voice');
          assert.equal(events.filter(e=>e.event.type==='subtitle').at(-1)?.event.subtitle,cue.displayText);
          t.mock.timers.tick(2000);a.finish();
        }else{
          t.mock.timers.tick(1000);a.finish();assert.equal(runtime.currentCueIndex,i,'short voice must wait for phase minimum');sample();
          if(phaseCount===1){runtime.pause();t.mock.timers.tick(9000);assert.equal(runtime.holdRemainingSeconds,3);sample();runtime.resume();}
          t.mock.timers.tick(2999);assert.equal(runtime.currentCueIndex,i);t.mock.timers.tick(1);
        }
      }else if(cue.type==='voice'){
        t.mock.timers.tick(7000);assert.equal(runtime.currentCueIndex,i);a.finish();if(cue.isFinalCue){assert.equal(runtime.currentState,'running');t.mock.timers.tick(400);}
      }
    }
    if(!stopEarly){assert.equal(phaseCount,16);assert.equal(runtime.currentState,'completed');assert.equal(events.filter(e=>e.event.type==='complete').length,1);assert.equal(a.overlaps,0);}
    runtime.dispose();return {events,samples,spoken:a.spoken,overlaps:a.overlaps};
  };
  const baseline=before.cues as PracticeCue[],current=definition().guide.cues;
  assert.deepEqual(run(current),run(baseline));assert.deepEqual(run(current,true),run(baseline,true));
});

test('Q-05 repaired long-phase audio waits for ended after pause/resume on both baseline cues and contract',t=>{
  t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:100000});
  const run=(cues:PracticeCue[])=>{
    const a=transport(),runtime=new PracticeAudioRuntime(a.engine),phase=cues.findIndex(c=>c.phaseDurationSec);
    runtime.start({practiceId:'box-breathing',cues});
    while(runtime.currentCueIndex<phase) a.finish();
    t.mock.timers.tick(1000);runtime.pause();t.mock.timers.tick(9000);assert.equal(runtime.holdRemainingSeconds,3);runtime.resume();
    t.mock.timers.tick(3000); // The repaired main runtime must wait for the unfinished voice.
    assert.equal(runtime.currentCueIndex,phase);assert.equal(a.overlaps,0);
    const stale=a.playback.ended;a.finish();assert.equal(runtime.currentCueIndex,phase+1);stale?.();assert.equal(runtime.currentCueIndex,phase+1);
    const observed={overlaps:a.overlaps,cue:runtime.currentCueIndex,spoken:a.spoken};runtime.dispose();return observed;
  };
  const original=run(before.cues as PracticeCue[]),current=run(definition().guide.cues);
  assert.deepEqual(current,original);assert.equal(original.overlaps,0);
  t.diagnostic('Q-05 repaired-main gate PASS for original and contract cues: no overlap, minimum elapsed still waits for ended; old ended cannot advance new cue. Device acceptance remains unconfirmed.');
});
