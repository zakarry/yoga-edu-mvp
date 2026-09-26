import { build } from 'esbuild';
import fs from 'node:fs';
await build({entryPoints:['supabase/functions/_shared/currentTurnPolicy.ts'],outfile:'../evidence/policy.mjs',bundle:true,platform:'node',format:'esm'});
const {assessCurrentTurn}=await import('../evidence/policy.mjs');
const cases=[
 ['腰痛について教えて','none'],['腰痛を予防したい','none'],['今、腰が痛い','current_symptom'],['胸の筋肉を鍛えたい','none'],['今、胸が痛い','red_flag'],['違う、胸が痛い','red_flag'],
 ['違う、胸が痛いって言ってる','red_flag'],['腰痛予防はどうしたらよいですか？','none'],['太陽礼拝について教えてください','none'],
 ['腰は痛くないけど胸が痛い','red_flag'],['腰痛予防のために今運動したい','none'],['胸が痛い人について一般的に教えて','none'],['膝の痛みを予防したい','none'],['今、膝が痛い','current_symptom'],['肩の痛みについて知りたい','none'],['肩が痛いです','current_symptom'],['今は痛みはありません','none'],['息苦しいです','red_flag'],['違う、足がしびれています','current_symptom'],['話が噛み合わないようです','none']
];
const result=cases.map(([input,expected])=>{const actual=assessCurrentTurn(input);return {input,expected,actual,pass:actual.safety===expected}});
fs.writeFileSync('../evidence/policy-tests.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result.filter(r=>!r.pass),null,2));console.log(`${result.filter(r=>r.pass).length}/${result.length} PASS`);
process.exitCode=result.some(r=>!r.pass)?1:0;
