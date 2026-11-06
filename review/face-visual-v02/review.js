"use strict";
const KEY = 'face-visual-review-v02-20261106';
const criteria = ['動きが滑らかか','表情や動きが自然か','種目の意図が伝わるか','動画として見やすいか','Yoga AIで使えそうか'];
const focuses = [
 '顎の脱力が伝わるか。口を閉じたまま、力を抜く変化が分かりますか。',
 '頬の膨らみと元に戻る動きが自然か。頬や唇がゆがんで見えませんか。',
 '口の開け方・舌の出し方がやりすぎでないか。舌や歯の形が不自然に変わりませんか。',
 '舌の動きが過剰でないか。前・右・左・戻す動きが分かりますか。',
 '【比較基準】唇の「オ」から笑顔へ切り替わる自然さ・見やすさを、他の7種目と比べてください。',
 '笑顔が自然で、口角が上がって見えるか。左右を無理にそろえた感じがありませんか。',
 '順番を確認：正面 → 右 → 正面 → 左 → 正面 → 右 → 正面 → 左 → 正面 → 右 → 正面 → 左 → 正面 → 下。首の動きが不自然でないか。右・左は実演者本人の向きです。',
 '「額と眉間 → 目元とほっぺた → 顎と舌」の力を抜く感じが伝わるか。目を閉じるだけに見えませんか。',
];
const $ = id => document.getElementById(id);
const empty = () => ({ version:'0.2-review-only', reviewer:'', device:'', answers:Object.fromEntries(CLIPS.map(c=>[c.id,{verdict:'未確認',criteria:criteria.map(()=> '未確認'),comment:''}])) });
let state = empty(), storageOK = true;
try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
 if (saved?.version === state.version) {
  state.reviewer = typeof saved.reviewer === 'string' ? saved.reviewer.slice(0,40) : '';
  state.device = typeof saved.device === 'string' ? saved.device.slice(0,100) : '';
  for (const clip of CLIPS) { const a=saved.answers?.[clip.id]; if (!a) continue;
   state.answers[clip.id] = { verdict:['未確認','OK','要修正','判断保留'].includes(a.verdict)?a.verdict:'未確認',
    criteria:criteria.map((_,i)=>['未確認','OK','要修正','判断保留'].includes(a.criteria?.[i])?a.criteria[i]:'未確認'),comment:typeof a.comment==='string'?a.comment.slice(0,300):'' };
  }
 }
} catch { storageOK = false; }
const REVIEW_ORDER = [4,0,1,2,3,5,6,7];
const adjacent = direction => REVIEW_ORDER[REVIEW_ORDER.indexOf(index) + direction];
let index = 4;
const video = $('video');
const selects = criteria.map((text,i)=>{
 const label=document.createElement('label');label.className='criterion';label.textContent=text;
 const select=document.createElement('select');select.setAttribute('aria-label',text);
 for(const value of ['未確認','OK','要修正','判断保留'])select.add(new Option(value,value));
 select.addEventListener('change',()=>{state.answers[CLIPS[index].id].criteria[i]=select.value;save();});
 label.append(select);$('criteria').append(label);return select;
});
CLIPS.forEach((c,i)=>{
 const button=document.createElement('button');button.type='button';button.id='clip-'+i;
 const title=document.createElement('span');title.textContent=c.title;
 const small=document.createElement('small');small.textContent=String(i+1).padStart(2,'0')+' · '+c.duration+'秒'+(c.reference?' · 比較基準':'');
 button.append(title,small);button.addEventListener('click',()=>showClip(i,true));$('clips').append(button);
});
function format(){
 const lines=['FACE BALANCE YOGA 映像レビュー v0.2','氏名：'+(state.reviewer.trim()||'未記入'),'端末・ブラウザ：'+(state.device.trim()||'未記入'),'※社内確認用。監修・安全性・効果の合格判定ではありません。',''];
 for(const c of CLIPS){const a=state.answers[c.id];lines.push('【'+c.title+'】 '+a.verdict,...criteria.map((t,i)=>'・'+t+'：'+a.criteria[i]),'気になる点：'+(a.comment.trim()||'記入なし'),'');}
 const fixes=CLIPS.filter(c=>state.answers[c.id].verdict==='要修正');lines.push('要修正の種目：'+(fixes.map(c=>c.title).join('／')||'なし（未確認は合格に含めません）'));
 return lines.join('\n');
}
function refresh(){
 const done=CLIPS.filter(c=>state.answers[c.id].verdict!=='未確認').length;
 $('progress').textContent=done+' / 8 種目に判定あり。未確認は合格に含めません。';$('summary-link').textContent='回答まとめへ（'+done+' / 8）';
 $('summary-list').replaceChildren();CLIPS.forEach(c=>{const li=document.createElement('li');li.textContent=c.title+'：'+state.answers[c.id].verdict;$('summary-list').append(li);});$('output').value=format();
}
function save(){
 try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;}catch{storageOK=false;}
 $('save-status').textContent=storageOK?'下書きをこのブラウザに保存しました。まだLINEには送信されていません。':'このブラウザでは下書きを保存できません。ページを閉じる前に回答をコピーしてください。';refresh();
}
function showClip(next,scroll=false){
 video.pause(); index=next;const clip=CLIPS[index],a=state.answers[clip.id];
 $('clip-title').textContent=clip.title;$('clip-meta').textContent=(clip.reference?'比較基準 · ':'修正候補 · ')+'無音 · '+clip.duration+'秒';
 $('focus').textContent=focuses[index];$('clip-note').textContent=clip.id.startsWith('07')?'首はコマ切替を含む修正候補です。つながり・本人の左右・最後の下向きを重点確認してください。最初の動きは画面右向き（本人の左向き）に見えます。指定順との一致を確認してください。鏡像補正はしていません。':'AI生成素材の修正候補です。途中の顔・口元のゆがみや、脱力の伝わり方も確認してください。';
 $('rating-for').textContent=clip.title+'への回答';$('verdict').value=a.verdict;$('comment').value=a.comment;selects.forEach((s,i)=>s.value=a.criteria[i]);
 CLIPS.forEach((_,i)=>$('clip-'+i).setAttribute('aria-pressed',String(i===index)));
 $('previous').disabled=adjacent(-1)===undefined;$('next').disabled=adjacent(1)===undefined;$('media-status').textContent='再生ボタンを押してください。自動再生・自動ループはしません。';$('play').disabled=false;
 video.poster='media/'+clip.file.replace('.mp4','_poster.jpg');
 $('next-review').textContent=index===7?'回答まとめへ':'この回答を残して、次の種目へ';$('review-status').textContent='';
 video.src='media/'+clip.file;video.load();refresh();if(scroll)$('current-clip').scrollIntoView({block:'start'});
}
$('play').addEventListener('click',async()=>{try{if(video.ended)video.currentTime=0;await video.play();}catch{$('media-status').textContent='再生できませんでした。動画内の再生ボタンもお試しください。';}});
video.addEventListener('loadedmetadata',()=>{const c=CLIPS[index];if(Math.abs(video.duration-c.duration)>.15){video.pause();$('media-status').textContent='映像の尺を確認できません。依頼者へこの種目名をお知らせください。';$('play').disabled=true;}});
video.addEventListener('play',()=>{$('media-status').textContent='再生中（無音）。動画内の操作で一時停止できます。';});
video.addEventListener('ended',()=>{$('media-status').textContent='再生が終わりました。下の判定を入力してください。';});
video.addEventListener('error',()=>{$('media-status').textContent='映像を読み込めませんでした。再読み込みしても開かない場合は依頼者へお知らせください。';$('play').disabled=true;});
$('previous').addEventListener('click',()=>showClip(adjacent(-1),true));$('next').addEventListener('click',()=>showClip(adjacent(1),true));
$('verdict').addEventListener('change',()=>{state.answers[CLIPS[index].id].verdict=$('verdict').value;save();});
$('comment').addEventListener('input',()=>{state.answers[CLIPS[index].id].comment=$('comment').value;save();});
for(const key of ['reviewer','device']){$(key).value=state[key];$(key).addEventListener('input',()=>{state[key]=$(key).value;save();});}
$('next-review').addEventListener('click',()=>{const a=state.answers[CLIPS[index].id];if(a.verdict==='未確認'){$('review-status').textContent='総合判定を選んでください。分からない場合は判断保留を選べます。';$('verdict').focus();return;}if(a.verdict==='要修正'&&!a.comment.trim()){$('review-status').textContent='気になる点を1つ以上記入してください。';$('comment').focus();return;}if(adjacent(1)===undefined)$('summary').scrollIntoView();else showClip(adjacent(1),true);});
$('stamp').addEventListener('click',()=>{const text='['+(Number.isFinite(video.currentTime)?video.currentTime.toFixed(1):'0.0')+'秒] ';const el=$('comment');el.value=(el.value+(el.value?'\n':'')+text).slice(0,300);state.answers[CLIPS[index].id].comment=el.value;save();el.focus();});
function validate(){
 if(!CLIPS.some(c=>state.answers[c.id].verdict!=='未確認')){$('result-status').textContent='少なくとも1種目の総合判定を選んでください。';return false;}
 const missing=CLIPS.find(c=>state.answers[c.id].verdict==='要修正'&&!state.answers[c.id].comment.trim());
 if(missing){showClip(CLIPS.indexOf(missing));$('result-status').textContent=missing.title+'の「気になる点」を記入してください。';$('comment').setCustomValidity('要修正の内容を記入してください。');$('comment').reportValidity();$('comment').setCustomValidity('');return false;}return true;
}
$('copy').addEventListener('click',async()=>{if(!validate())return;refresh();try{await navigator.clipboard.writeText(format());$('result-status').textContent='コピーしました。LINEで依頼者への返信に貼り付けて送信してください。';}catch{$('output').focus();$('output').select();$('result-status').textContent='自動コピーが使えません。下の回答を長押ししてコピーし、LINEで依頼者へ送信してください。';}});
if(typeof navigator.share==='function'){$('share').hidden=false;$('share').addEventListener('click',async()=>{if(!validate())return;try{await navigator.share({title:'FACE BALANCE YOGA 社内レビュー',text:format()});$('result-status').textContent='共有メニューを閉じました。LINEの送信先と送信結果を確認してください。';}catch(e){$('result-status').textContent=e.name==='AbortError'?'共有をキャンセルしました。入力内容はこの画面に残っています。':'共有メニューを開けません。回答をコピーしてLINEへ送信してください。';}});}
$('download').addEventListener('click',()=>{if(!validate())return;const url=URL.createObjectURL(new Blob([format()],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='FACE_BALANCE_YOGA_review_v0.2.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('result-status').textContent='保存したテキストをLINEで依頼者へ送ってください。';});
$('clear').addEventListener('click',()=>{if(!confirm('このブラウザの下書きをすべて消しますか？ LINEへ送った返信は消えません。'))return;try{localStorage.removeItem(KEY);}catch{}state=empty();$('reviewer').value='';$('device').value='';showClip(index);$('save-status').textContent='下書きを消しました。';});
document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});window.addEventListener('pagehide',()=>video.pause());
showClip(index);if(!storageOK)$('save-status').textContent='下書き保存が使えません。閉じる前に回答をコピーしてください。';
