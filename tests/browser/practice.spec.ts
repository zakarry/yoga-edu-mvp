import { test, expect, type Page } from '@playwright/test';

type Practice = 'box' | 'abdominal' | 'tree' | 'susokukan';
async function start(page: Page, name: Practice) {
  // Follow public controls, without authentication, saved accounts or hidden app state.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'メニュー', exact: true }).click();
  const category = name === 'tree' ? 'Asana' : name === 'susokukan' ? 'Dhyana' : 'Pranayama';
  await page.getByRole('button', { name: new RegExp(`^${category}（`) }).click();
  await page.getByRole('button', { name: new RegExp(`^${category} .*実践を始める$`) }).click();
  if (name === 'tree') {
    await page.locator('li').filter({ hasText: '立ち木' }).getByRole('button').click();
    await page.getByRole('button', { name: '実践スタート', exact: true }).click();
  } else if (name === 'susokukan') {
    await page.locator('.meditation-select-card').filter({ hasText: '数息観' }).getByRole('button').click();
    await page.getByRole('button', { name: '瞑想を始める', exact: true }).click();
  } else {
    await page.getByRole('button', { name: '呼吸ガイドを見る', exact: true }).nth(name === 'box' ? 0 : 1).click();
    await page.getByRole('button', { name: '実践スタート', exact: true }).click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
}

async function observeAudio(page: Page) {
  await page.addInitScript(() => {
    const sources: AudioBufferSourceNode[] = [];
    const contexts: AudioContext[] = [];
    const media: HTMLMediaElement[] = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!media.includes(this)) media.push(this);
      return play.call(this);
    };
    let maximum = 0;
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      if (!contexts.includes(this)) contexts.push(this);
      const source = create.call(this);
      const originalStart = source.start.bind(source);
      const originalStop = source.stop.bind(source);
      const remove = () => { const i = sources.indexOf(source); if (i >= 0) sources.splice(i, 1); };
      source.addEventListener('ended', remove);
      source.start = (...args: Parameters<typeof source.start>) => { originalStart(...args); sources.push(source); maximum = Math.max(maximum, sources.length); };
      source.stop = (...args: Parameters<typeof source.stop>) => { originalStop(...args); remove(); };
      return source;
    };
    Object.assign(window, { audioObservation: () => ({ active: sources.length, maximum, states: contexts.map(c => c.state), media: media.map(a => ({ time: a.currentTime, duration: a.duration, ended: a.ended, paused: a.paused })) }) });
  });
}

const scope = (name: Practice) => name === 'tree' ? '.practice-active-section' : name === 'susokukan' ? '.meditation-experience' : '.bw-experience';

for (const name of ['box', 'abdominal', 'tree', 'susokukan'] as const) {
  test(`${name}: real clock, public UI, complete guide`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await observeAudio(page);
    await start(page, name);
    const area = page.locator(scope(name));
    const trace: { t: number; text: string; media: { time: number; duration: number; ended: boolean }[] }[] = [];
    const begin = Date.now();
    let previous = '';
    let done = false;
    while (Date.now() - begin < 330_000) {
      if (name === 'tree' && await page.locator('.practice-done-section').isVisible()) {
        trace.push({ t: (Date.now() - begin) / 1000, text: 'completed', media: [] });
        done = true; break;
      }
      // Completion can unmount the active area between two browser calls.
      const text = await page.evaluate(selector => document.querySelector<HTMLElement>(selector)?.innerText ?? '', scope(name));
      if (text !== previous) {
        const media = await page.evaluate(() => (window as unknown as { audioObservation: () => { media: { time: number; duration: number; ended: boolean }[] } }).audioObservation().media);
        trace.push({ t: (Date.now() - begin) / 1000, text, media }); previous = text;
      }
      done = name === 'tree' ? await page.locator('.practice-done-section').isVisible()
        : name === 'susokukan' ? text.includes('0:00') && text.includes('お疲れさまでした')
        : name === 'abdominal' ? text.includes('6回分が終わりました') : text.includes('お疲れさまでした');
      if (done) break;
      await page.waitForTimeout(250);
    }
    // Box completion copy appears at the beginning of its final narration.
    // Keep the page alive for that entire real asset before leaving.
    if (name === 'box') await page.waitForTimeout(7_000);
    const audio = await page.evaluate(() => (window as unknown as { audioObservation: () => { active: number; maximum: number } }).audioObservation());
    expect(audio.maximum).toBeLessThanOrEqual(1);
    expect(audio.active).toBe(0);
    await info.attach('clock-and-subtitle-trace', { body: JSON.stringify(trace, null, 2), contentType: 'application/json' });
    expect(done).toBe(true);
    expect(errors).toEqual([]);
    if (name === 'box') {
      const phases = trace.filter(x => /^Box Breathing\n(?:吸う|止める|吐く)\n4\n/.test(x.text));
      expect(phases.map(x => x.text.split('\n')[1])).toEqual(Array.from({ length: 4 }, () => ['吸う', '止める', '吐く', '止める']).flat());
      expect(phases.map(x => x.text.match(/ラウンド (\d)/)?.[1])).toEqual(Array.from({ length: 4 }, (_, i) => Array(4).fill(String(i + 1))).flat());
      await expect(area.getByRole('button', { name: '一時停止', exact: true })).toHaveCount(0);
    } else if (name === 'abdominal') {
      expect(trace.filter(x => /\n吸う\n4秒\n/.test(x.text))).toHaveLength(6);
      expect(trace.filter(x => /\n吐く\n6秒\n/.test(x.text))).toHaveLength(6);
    } else if (name === 'tree') {
      for (const side of ['右側', '左側']) {
        const first = trace.find(x => x.text.includes(`${side}\n保持中\n0:30`));
        expect(first).toBeDefined();
        const last = trace.find(x => x.t > first!.t && !x.text.includes(`${side}\n保持中`));
        // Completion can replace the active area; 0:01 is independently recorded.
        expect(trace.some(x => x.text.includes(`${side}\n保持中\n0:01`))).toBe(true);
        expect(last).toBeDefined();
        expect(last!.t - first!.t).toBeGreaterThan(29);
        expect(last!.t - first!.t).toBeLessThan(31);
      }
    } else {
      const silence = trace.find(x => x.text.includes('\n静寂\n'));
      // The narration uses media time: loading/buffering must not consume silence.
      expect(silence).toBeDefined();
      expect(silence!.media[0].time).toBeGreaterThan(59.8);
      expect(silence!.media[0].time).toBeLessThan(60.2);
      expect(silence!.media[0].ended).toBe(true);
      expect(trace.at(-1)!.t - silence!.t).toBeGreaterThan(239);
      expect(trace.at(-1)!.t - silence!.t).toBeLessThan(241);
    }
  });
}

for (const width of [320, 390, 430]) {
  for (const name of ['box', 'abdominal', 'tree', 'susokukan'] as const) {
    test(`${name}: ${width}px controls reachable above fixed navigation`, async ({ page }, info) => {
      await observeAudio(page);
    await start(page, name);
      await page.setViewportSize({ width, height: 844 });
      await expect(page.locator(scope(name))).toBeVisible();
      if (name === 'tree') {
        await expect.poll(async () => page.locator('.practice-reference-visual img').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
      } else if (name === 'susokukan') {
        await expect(page.locator('.meditation-breath-circle')).toBeVisible();
      } else {
        await expect(page.locator('.bw-experience .breathing-visual-panel')).toBeVisible();
      }
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
      // Reproduce the original fixed-nav collision by aligning a primary control
      // with the navigation edge, then verify that its sticky group remains clear.
      const action = page.locator('.practice-active-actions').last();
      const collision = await action.boundingBox();
      if (collision) {
        await page.evaluate(({ y }) => window.scrollBy(0, y - innerHeight + 35), { y: collision.y });
        const positioned = await action.boundingBox();
        const fixedNav = await page.locator('.mobile-bottom-nav').boundingBox();
        if (positioned && positioned.y >= 0) expect(positioned.y + positioned.height).toBeLessThanOrEqual(fixedNav!.y + 1);
      }
      // Include parent completion/abort actions as well as the inner player.
      const buttons = page.locator(`${scope(name)} button, .practice-active-actions button`);
      expect(await buttons.count()).toBeGreaterThan(0);
      for (const button of await buttons.all()) {
        await button.evaluate(el => el.scrollIntoView({ block: 'center' }));
        await button.click({ trial: true });
        const box = await button.boundingBox();
        const nav = await page.locator('.mobile-bottom-nav').boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
        expect(box!.y + box!.height).toBeLessThanOrEqual(nav!.y + 1);
      }
      await info.attach('mobile-screen', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    });
  }
}

test('shared audio: real tree guide repeated pause/resume and confirmed exit', async ({ page }, info) => {
  await observeAudio(page);
  const read = () => page.evaluate(() => (window as unknown as { audioObservation: () => { active: number; maximum: number; states: string[] } }).audioObservation());
  await start(page, 'tree');
  await expect.poll(async () => (await read()).active).toBe(1);
  const observations = [];
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: '一時停止', exact: true }).click();
    await expect.poll(async () => (await read()).states.every(s => s === 'suspended')).toBe(true);
    observations.push(await read());
    await page.getByRole('button', { name: '再開する', exact: true }).click();
    await expect.poll(async () => (await read()).states.some(s => s === 'running')).toBe(true);
    observations.push(await read());
  }
  await page.getByRole('button', { name: '← 戻る', exact: true }).click();
  await page.getByRole('button', { name: '終了して戻る', exact: true }).click();
  await expect.poll(async () => (await read()).active).toBe(0);
  await page.waitForTimeout(1500);
  expect((await read()).maximum).toBe(1);
  expect((await read()).active).toBe(0);
  await info.attach('real-audio-controls', { body: JSON.stringify(observations), contentType: 'application/json' });
});

