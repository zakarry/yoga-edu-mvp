import { assessCurrentTurn } from '../supabase/functions/_shared/currentTurnPolicy.ts';

const cases = [
 ['腰痛について教えて','none'],['腰痛を予防したい','none'],['今、腰が痛い','current_symptom'],['胸の筋肉を鍛えたい','none'],['今、胸が痛い','red_flag'],['違う、胸が痛い','red_flag'],
 ['違う、胸が痛いって言ってる','red_flag'],['腰痛予防はどうしたらよいですか？','none'],['太陽礼拝について教えてください','none'],
 ['腰は痛くないけど胸が痛い','red_flag'],['腰痛予防のために今運動したい','none'],['胸が痛い人について一般的に教えて','none'],['膝の痛みを予防したい','none'],['今、膝が痛い','current_symptom'],['肩の痛みについて知りたい','none'],['肩が痛いです','current_symptom'],['今は痛みはありません','none'],['息苦しいです','red_flag'],['違う、足がしびれています','current_symptom'],['話が噛み合わないようです','none'],
];
for (const [input, expected] of cases) Deno.test(`current-turn: ${input}`, () => {
 if (assessCurrentTurn(input).safety !== expected) throw new Error(`Safety mismatch: ${input}`);
});

// Import the actual deployment entrypoints. No copied handler or system instruction.
// Auth/profile responses are local stubs; provider/network access is prohibited here.
for (const name of ['ai-teacher-explanation', 'ai-teacher-explanation-preview']) {
 Deno.test(`${name}: boot, CORS and server Safety before provider/usage`, async () => {
  const originalServe = Deno.serve;
  const originalFetch = globalThis.fetch;
  const keys = ['SUPABASE_URL','SUPABASE_ANON_KEY'];
  const originalEnv = keys.map(k => Deno.env.get(k));
  let handler: ((r: Request) => Response | Promise<Response>) | undefined;
  let unexpectedCalls = 0;
  try {
   Deno.env.set(keys[0], 'https://release-test.invalid');
   Deno.env.set(keys[1], 'local-fixture-not-a-secret');
   Deno.serve = ((fn: typeof handler) => { handler = fn; return {}; }) as unknown as typeof Deno.serve;
   globalThis.fetch = async (input) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes('/auth/v1/user')) return Response.json({id:'00000000-0000-4000-8000-000000000001'});
    if (url.includes('/rest/v1/profiles')) return Response.json({membership_tier:'free'});
    unexpectedCalls++; throw new Error('Unexpected network/provider/usage request');
   };
   await import(`../supabase/functions/${name}/index.ts`);
   if (!handler) throw new Error('No handler registered');
   const options = await handler(new Request('https://release-test.invalid', {method:'OPTIONS'}));
   if (options.status !== 200) throw new Error('OPTIONS must return 200');
   const response = await handler(new Request('https://release-test.invalid', {
    method:'POST', headers:{'Authorization':'Bearer local-test-session','Content-Type':'application/json'},
    body:JSON.stringify({userMessage:'違う、胸が痛いって言ってる',knowledge:[],turns:[{role:'user',text:'側面を伸ばすポーズがよいです'},{role:'assistant',text:'どんな実践にしますか？'}]})
   }));
   const body = await response.json();
   if (response.status !== 200 || body.evidence?.safety !== 'red_flag' || body.evidence?.openaiCalled !== false || body.evidence?.usageRecorded !== false || unexpectedCalls !== 0) {
    throw new Error('Server Safety must stop before provider and usage');
   }
  } finally {
   Deno.serve = originalServe; globalThis.fetch = originalFetch;
   keys.forEach((k,i)=> originalEnv[i] === undefined ? Deno.env.delete(k) : Deno.env.set(k,originalEnv[i]!));
  }
 });
}
