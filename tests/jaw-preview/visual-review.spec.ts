import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const path = '/review/face-visual-v02/index.html';
const names = ['01_Jaw_Release','02_Kapola_Awareness','03_Simhasana_Face','04_Tongue_Mobility','05_Lip_O_Smile_reference','06_Smile_Balance','07_Griva_Gentle','08_Face_Relax'];
const durations = [9,12,20,12,4,15,40,16];
test('review preserves seven supplied MP4 hashes and excludes audio tracks',()=>{
 const m=JSON.parse(readFileSync('review/face-visual-v02/source/manifest.json','utf8'));
 for(const c of m.clips){const b=readFileSync('review/face-visual-v02/media/'+c.filename);expect(createHash('sha256').update(b).digest('hex')).toBe(c.sha256);expect(b.includes(Buffer.from('soun'))).toBe(false);}
});
test('eight real videos decode, play by tap, pause on switch and never autoplay next',async({page})=>{
 test.setTimeout(60000);const external:string[]=[];page.on('request',r=>{if(!new URL(r.url()).hostname.match(/127.0.0.1|localhost/))external.push(r.url());});
 await page.goto(path);const video=page.locator('video');
 for(let i=0;i<8;i++){
  await page.locator('#clip-'+i).click();await expect.poll(()=>video.evaluate(v=>v.readyState)).toBeGreaterThanOrEqual(1);
  expect(await video.evaluate(v=>v.paused)).toBe(true);expect(await video.evaluate(v=>v.duration)).toBeCloseTo(durations[i],1);
  await expect(video).toHaveAttribute('src','media/'+names[i]+'.mp4');
  await page.locator('#play').click();await expect.poll(()=>video.evaluate(v=>v.currentTime)).toBeGreaterThan(0);
  await video.evaluate(v=>{v.pause();v.currentTime=v.duration-0.1;void v.play();});
  await expect(page.locator('#media-status')).toHaveText('再生が終わりました。下の判定を入力してください。');
  expect(await video.evaluate(v=>v.loop||v.autoplay)).toBe(false);await expect(page.locator('#clip-'+i)).toHaveAttribute('aria-pressed','true');
 }
 expect(external).toEqual([]);
});
test('per-exercise answers restore and produce private LINE reply text without access URL',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);await page.goto(path);
 await page.locator('#reviewer').fill('検品者');await page.locator('#device').fill('Galaxy Chrome');
 for(let i=0;i<8;i++){await page.locator('#clip-'+i).click();await page.locator('#verdict').selectOption(i===0?'要修正':'OK');if(i===0)await page.locator('#comment').fill('3秒：脱力が見えにくい');}
 await page.reload();await expect(page.locator('#reviewer')).toHaveValue('検品者');await page.locator('#clip-0').click();await expect(page.locator('#comment')).toHaveValue('3秒：脱力が見えにくい');
 await page.locator('#copy').click();await expect(page.locator('#result-status')).toContainText('コピーしました');const text=await page.evaluate(()=>navigator.clipboard.readText());
 expect(text).toContain('Galaxy Chrome');expect(text).toContain('3秒：脱力が見えにくい');expect(text).toContain('Face Relax');expect(text).not.toContain('_vercel_share');expect(text).not.toContain('https://');await expect(page.locator('#progress')).toContainText('8 / 8');
});
test('unfinished or unexplained correction cannot be submitted, copy denial has manual fallback',async({page})=>{
 await page.goto(path);await page.locator('#copy').click();await expect(page.locator('#result-status')).toContainText('少なくとも1種目');
 await page.locator('#verdict').selectOption('要修正');await page.locator('#copy').click();await expect(page.locator('#result-status')).toContainText('気になる点');
 await page.locator('#comment').fill('<img src=x onerror=alert(1)>');await page.evaluate(()=>Object.defineProperty(navigator.clipboard,'writeText',{value:()=>Promise.reject(new Error('denied')),configurable:true}));
 await page.locator('#copy').click();await expect(page.locator('#result-status')).toContainText('自動コピーが使えません');
 expect(await page.locator('#output').inputValue()).toContain('<img src=x');expect(await page.locator('img[src=x]').count()).toBe(0);
});
test('blocked storage is explained and native share cancellation never claims delivery',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(Storage.prototype,'setItem',{value:()=>{throw Error('denied');}});Object.defineProperty(navigator,'share',{value:()=>Promise.reject(new DOMException('cancel','AbortError'))});});
 await page.goto(path);await page.locator('#verdict').selectOption('判断保留');await expect(page.locator('#save-status')).toContainText('保存できません');
 await page.locator('#share').click();await expect(page.locator('#result-status')).toHaveText('共有をキャンセルしました。入力内容はこの画面に残っています。');
});
for(const width of [320,390,430])test('staff review controls fit '+width+'px',async({page},info)=>{
 await page.setViewportSize({width,height:844});await page.goto(path);await expect(page.getByRole('heading',{name:'1. 映像を見る'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
 await page.locator('#clip-6').click();await expect(page.locator('#focus')).toContainText('正面 → 右 → 正面 → 左');
 await page.locator('#verdict').scrollIntoViewIfNeeded();const rect=await page.locator('#verdict').boundingBox();expect(rect!.width).toBeLessThan(width);await page.screenshot({path:info.outputPath('review-'+width+'.png'),fullPage:true});
});

test('clear next-step guidance and long comments remain a compact LINE reply',async({page})=>{
 await page.goto(path);await page.locator('#next-review').click();await expect(page.locator('#review-status')).toContainText('総合判定を選んで');
 await page.locator('#verdict').selectOption('OK');await page.locator('#next-review').click();await expect(page.locator('#clip-0')).toHaveAttribute('aria-pressed','true');
 for(let i=0;i<8;i++){await page.locator('#clip-'+i).click();await page.locator('#verdict').selectOption('要修正');await page.locator('#comment').fill('あ'.repeat(300));}
 expect((await page.locator('#output').inputValue()).length).toBeLessThan(4500);
 await page.locator('#clip-0').click();await page.locator('#next-review').click();await expect(page.locator('#clip-1')).toHaveAttribute('aria-pressed','true');
});
