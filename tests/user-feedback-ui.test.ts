import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

test('Actual chat component focuses, reports pending response and scrolls latest reply; diagnosis has one primary next action', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', runScripts: 'outside-only' });
  const win = dom.window as any;
  win.HTMLElement.prototype.scrollIntoView = function() { win.lastScrolled = this; };
  const bundle = await build({
    stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
      import {MyAITeacherPage} from './src/components/MyAITeacherPage';
      import {ResultPage} from './src/components/ResultPage';
      const noop=()=>{}; const root=createRoot(document.getElementById('root'));
      window.mountChat=()=>root.render(<MyAITeacherPage onBackHome={noop} onOpenDiagnosis={noop} onOpenMyPage={noop} onOpenProYoga={noop} latestDiagnosis={null}/>);
      window.mountResult=()=>root.render(<ResultPage result={{typeName:'テスト診断',summary:'テスト',recommendedYogaPose:{type:'asana',title:'未掲載ポーズ',poseId:null},recommendedSchools:[],recommendedTeachers:[],recommendedEvents:[],recommendedClubs:[],allRecommendedItems:[],internationalSupportNotes:[]}} onRestart={noop} onOpenSearch={noop} onBackHome={noop} onOpenMyPage={noop} onOpenProYoga={noop} onOpenAITeacher={()=>window.openedTeacher=true} onOpenPoseGuide={noop} onOpenBreathworkGuide={noop} onDetail={noop}/>);
      window.unmount=()=>root.unmount();`, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    define: { 'import.meta.env': '{}', 'process.env.NODE_ENV': '"test"' },
    plugins: [{ name: 'ui-only-controlled-response', setup(builder) {
      builder.onLoad({ filter: /[/\\]lib[/\\]auth\.ts$/ }, () => ({ contents: `
        import {useSyncExternalStore} from 'react'; let state={user:null,profile:null,privacy:null,authReady:true,loading:false}; const listeners=new Set();
        window.testLogin=id=>{state={...state,user:id?{id}:null};listeners.forEach(f=>f());};
        export const useAuth=()=>useSyncExternalStore(f=>{listeners.add(f);return()=>listeners.delete(f);},()=>state);
      `, loader: 'ts' }));
      builder.onLoad({ filter: /aiTeacherPersonaService\.ts$/ }, () => ({ contents: `
        const accounts=new Map(); export const getSavedTeacher=async id=>{if(window.failTeacherRead)throw new Error('storage unavailable');return accounts.get(id)??null;};
        export const persistTeacher=async(id,p)=>{window.teacherWrites=(window.teacherWrites??0)+1;accounts.set(id,p);};
      `, loader: 'ts' }));
      builder.onLoad({ filter: /teacherResponseService\.ts$/ }, () => ({ contents: `
        export const generateTeacherResponse=(...args)=>{window.receivedContext=args[0];return new Promise(resolve=>window.resolveReply=()=>resolve({text:'UI検証用の回答です。',updatedContext:{},knowledgeUsed:false}));};
        export const generateNextSuggestion=()=>''; export const getLastBM5Debug=()=>null; export const getLastRouterDebug=()=>null;
      `, loader: 'ts' }));
    } }],
  });
  win.eval(bundle.outputFiles[0].text);
  const wait = async (check: () => boolean) => {
    for (let i = 0; i < 100; i++) { if (check()) return; await new Promise(r => setTimeout(r, 20)); }
    throw new Error('UI condition timed out');
  };
  const button = (label: string) => [...win.document.querySelectorAll('button')].find((b: any) => b.textContent === label) as HTMLButtonElement;
  try {
    win.mountChat(); await wait(() => !!button('話しかける'));
    win.testLogin('account-a');
    button('AI先生をつくる').click(); await wait(() => !!win.document.querySelector('input[placeholder="MAYA"]'));
    const nameInput = win.document.querySelector('input[placeholder="MAYA"]');
    Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value')!.set!.call(nameInput, '継続テスト先生');
    nameInput.dispatchEvent(new win.Event('input', { bubbles: true }));
    await wait(() => !!button('保存する') && !button('保存する').disabled);
    button('保存する').click(); await wait(() => win.document.body.textContent.includes('継続テスト先生'));
    win.testLogin(null); await wait(() => !win.document.body.textContent.includes('継続テスト先生'));
    win.testLogin('account-b'); await wait(() => !button('保存中…'));
    assert.equal(win.document.body.textContent.includes('継続テスト先生'), false);
    win.testLogin('account-a'); await wait(() => win.document.body.textContent.includes('継続テスト先生'));
    button('話しかける').click(); await wait(() => !!win.document.querySelector('input[aria-label="AI先生へのメッセージ"]'));
    const input = win.document.querySelector('input[aria-label="AI先生へのメッセージ"]');
    assert.equal(win.document.activeElement, input);
    assert.match(win.lastScrolled.textContent, /STEP 5/);
    Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value')!.set!.call(input, 'こんにちは');
    input.dispatchEvent(new win.Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30)); button('送信').click();
    await wait(() => win.document.body.textContent.includes('考えています…'));
    assert.equal(button('…').disabled, true);
    await wait(() => !!win.resolveReply);
    assert.equal(win.receivedContext.persona.name, '継続テスト先生');
    win.resolveReply();
    await wait(() => win.document.body.textContent.includes('UI検証用の回答です。'));
    assert.equal(win.lastScrolled.parentElement.className, 'ai-teacher-chat-messages');
    assert.equal(win.document.body.textContent.includes('考えています…'), false);
    win.mountResult(); await wait(() => !!button('AI先生と今日のYogaを作る →'));
    const primary = win.document.querySelectorAll('.result-hero-actions .primary-button');
    assert.equal(primary.length, 1);
    assert.equal(primary[0].disabled, false); primary[0].click(); assert.equal(win.openedTeacher, true);
    const writesBeforeFailure = win.teacherWrites;
    win.failTeacherRead = true;
    win.testLogin('unavailable-account'); win.mountChat();
    await wait(() => win.document.body.textContent.includes('先生設定を読み込めませんでした'));
    button('AI先生をつくる').click(); await wait(() => !!button('保存する'));
    assert.equal(button('保存する').disabled, true);
    button('保存する').click();
    assert.equal(win.teacherWrites, writesBeforeFailure, 'Missing migration/load failure must never overwrite a saved teacher');
    button('話しかける').click(); await wait(() => !!button('送信'));
    assert.equal(button('送信').disabled, true);
  } finally { win.unmount(); dom.window.close(); }
});

test('Teacher registration restores own draft, edits it and recovers from network rejection', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/', runScripts: 'outside-only' });
  const win = dom.window as any;
  const bundle = await build({
    stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';
      import {OwnedTeacherRegistration} from './src/components/OwnedTeacherRegistration';
      const root=createRoot(document.getElementById('root'));window.mount=()=>root.render(<OwnedTeacherRegistration sections={[{title:'基本情報',fields:[{name:'name',label:'先生名',type:'text'}]}]}/>);window.unmount=()=>root.unmount();`, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    define: { 'import.meta.env': '{}', 'process.env.NODE_ENV': '"test"' },
    plugins: [{ name: 'registration-test-transport', setup(builder) {
      builder.onLoad({ filter: /[/\\]lib[/\\]auth\.ts$/ }, () => ({ contents: `import {useSyncExternalStore} from 'react';let state={user:{id:'owner-a'},authReady:true,loading:false};const listeners=new Set();window.login=id=>{state={...state,user:{id}};listeners.forEach(f=>f());};export const useAuth=()=>useSyncExternalStore(f=>{listeners.add(f);return()=>listeners.delete(f)},()=>state);`, loader: 'ts' }));
      builder.onLoad({ filter: /[/\\]lib[/\\]supabase\.ts$/ }, () => ({ contents: `
        const rows=new Map([['owner-a',{name:'保存済み講師'}]]);window.rows=rows;
        export const supabase={from:()=>({select:()=>({eq:(_,id)=>({maybeSingle:async()=>{if(window.failRead)throw new Error('offline');return {data:rows.has(id)?{values:rows.get(id)}:null,error:null};}})}),upsert:async row=>{if(window.failSave)throw new Error('offline');rows.set(row.user_id,row.values);return {error:null};}})};`, loader: 'ts' }));
    } }],
  });
  win.eval(bundle.outputFiles[0].text);
  const wait = async (check: () => boolean) => { for (let i = 0; i < 100; i++) { if (check()) return; await new Promise(r => setTimeout(r, 20)); } throw new Error('Registration UI condition timed out'); };
  const button = (name: string) => [...win.document.querySelectorAll('button')].find((b: any) => b.textContent === name) as HTMLButtonElement;
  try {
    win.mount(); await wait(() => !!win.document.querySelector('input'));
    assert.equal(win.document.querySelector('input').value, '保存済み講師');
    const input = win.document.querySelector('input');
    Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value')!.set!.call(input, '編集後の講師');
    input.dispatchEvent(new win.Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    win.failSave = true; button('登録内容を保存する').click();
    await wait(() => win.document.body.textContent.includes('保存できませんでした'));
    assert.equal(input.value, '編集後の講師'); assert.equal(button('登録内容を保存する').disabled, false);
    assert.equal(win.rows.get('owner-a').name, '保存済み講師');
    win.failSave = false; button('登録内容を保存する').click();
    await wait(() => win.document.body.textContent.includes('登録内容を保存しました'));
    assert.equal(win.rows.get('owner-a').name, '編集後の講師');
    win.login('owner-b'); await wait(() => win.document.querySelector('input')?.value === '');
    win.login('owner-a'); await wait(() => win.document.querySelector('input')?.value === '編集後の講師');
    win.failRead = true; win.login('unavailable-owner');
    await wait(() => win.document.body.textContent.includes('登録情報を読み込めませんでした'));
    assert.equal(win.document.querySelector('input'), null);
    win.failRead = false; button('再試行').click(); await wait(() => !!win.document.querySelector('input'));
  } finally { win.unmount(); dom.window.close(); }
});
