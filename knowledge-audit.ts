import { supabase } from './src/lib/supabase';
import { rankConversationKnowledge, retrieveConversationKnowledge, getRetrievalTrace } from './src/services/conversationKnowledge';
import { rankKnowledgeCandidates } from './src/services/teacherKnowledgeService';
document.querySelector('#audit')!.addEventListener('click',async()=>{
 const {data:auth}=await supabase!.auth.getSession();
 if(!auth.session){document.querySelector('#results')!.textContent='未ログイン';return;}
 const {data,error}=await supabase!.rpc('lookup_teacher_explanation',{p_search:null});
 const report=[{audit:'approved-knowledge',error:error?.message??null,count:data?.length??0,candidates:data,queries:['太陽礼拝について教えてください','太陽礼拝','側面を伸ばすポーズ'].map(query=>({query,oldRanked:rankKnowledgeCandidates(query,data??[]),v22Ranked:rankConversationKnowledge(query,"",data??[])}))}];
 const traces=[];
 for(const query of ['太陽礼拝について教えてください','側面を伸ばすポーズがよいです']) {
  await retrieveConversationKnowledge(query,[]);traces.push(getRetrievalTrace());
 }
 (report[0] as any).retrievalTraces=traces;
 document.querySelector('#results')!.textContent=JSON.stringify(report,null,2);
 await fetch('/__acceptance/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});
});
