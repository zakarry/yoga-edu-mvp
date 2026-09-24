import { useEffect, useState } from 'react';
import { fetchAdminDirectory, setAdminAccess, updateAdminMember, type AdminMember, type AdminUser, type MemberPatch } from '../services/adminDashboardService';

const field = { padding: '8px 10px', border:'1px solid #ccd', borderRadius:8, width:'100%', boxSizing:'border-box' as const };
function message(e:unknown):string {
  const code=e instanceof Error?e.message:'';
  const messages:Record<string,string>={CONFLICT:'他の操作で更新されています。閉じて一覧を再読み込みしてください。',INVALID_FIELDS:'入力内容をご確認ください。',NOT_FOUND:'対象の会員が見つかりません。',FORBIDDEN:'この操作を行う権限がありません。',Forbidden:'この操作を行う権限がありません。',PROTECTED_ADMIN:'Super Adminの権限はこの画面では変更できません。'};
  return messages[code]??'保存できませんでした。もう一度お試しください。';
}
export function AdminMemberEdit({member,onSaved,onMfaRequired}:{member:AdminMember;onSaved:()=>Promise<void>;onMfaRequired:()=>void}) {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [name,setName]=useState(''),[area,setArea]=useState(''),[role,setRole]=useState('student'),[tier,setTier]=useState('free');
  function start(){const p=member.editableProfile;setName(p.display_name??'');setArea(p.area??'');setRole(p.role??'student');setTier(p.membership_tier??'free');setError('');setOpen(true);}
  async function save(e:React.FormEvent){
    e.preventDefault();if(busy)return;setBusy(true);setError('');
    const next:MemberPatch={display_name:name.trim()||null,area:area.trim()||null,role:role as MemberPatch['role'],membership_tier:tier as MemberPatch['membership_tier']};
    const patch:MemberPatch={};
    for(const k of Object.keys(next) as (keyof MemberPatch)[]) if(next[k]!==member.editableProfile[k]) Object.assign(patch,{[k]:next[k]});
    try{if(Object.keys(patch).length)await updateAdminMember(member.id,member.updatedAt,patch);setOpen(false);await onSaved();}
    catch(e){if(e instanceof Error&&e.message==='mfa_required')onMfaRequired();else setError(message(e));}
    finally{setBusy(false);}
  }
  return <><button className="ghost-button" onClick={start}>編集</button>{open&&<div role="dialog" aria-modal="true" aria-label="会員情報を編集" style={{position:'fixed',inset:0,zIndex:1000,background:'#10254288',display:'grid',placeItems:'center',padding:16}} onKeyDown={e=>{if(e.key==='Escape'&&!busy)setOpen(false);}}>
    <form onSubmit={save} style={{background:'#fff',padding:24,borderRadius:16,width:'min(420px,100%)',maxHeight:'90vh',overflowY:'auto',textAlign:'left',boxSizing:'border-box'}}>
      <h2 style={{fontSize:20,marginTop:0}}>会員情報を編集</h2>
      <p style={{color:'#667'}}>会員：{member.displayName}</p>
      <label>表示名<input autoFocus maxLength={100} value={name} onChange={e=>setName(e.target.value)} style={field}/></label>
      <label>地域<input maxLength={120} value={area} onChange={e=>setArea(e.target.value)} style={{...field,marginBottom:12}}/></label>
      <label>生徒・先生の区分<select value={role} onChange={e=>setRole(e.target.value)} style={field}><option value="student">生徒</option><option value="teacher">先生</option><option value="both">両方</option></select></label>
      <label>会員区分<select value={tier} onChange={e=>setTier(e.target.value)} style={field}><option value="free">無料</option><option value="paid">有料</option></select></label>
      <p style={{fontSize:12,color:'#667'}}>会員区分の変更では、請求や決済は行いません。</p>
      {error&&<p role="alert" style={{color:'#a33'}}>{error}</p>}
      <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}><button type="button" disabled={busy} onClick={()=>setOpen(false)} className="ghost-button">キャンセル</button><button disabled={busy} className="primary-button">{busy?'保存中…':'変更を保存'}</button></div>
    </form>
  </div>}</>;
}

export function AdminAccessPanel({onMfaRequired}:{onMfaRequired:()=>void}){
  const [input,setInput]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(1),[version,setVersion]=useState(0);
  const [users,setUsers]=useState<AdminUser[]>([]),[total,setTotal]=useState(0),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [pending,setPending]=useState<AdminUser|null>(null);
  useEffect(()=>{let alive=true;setLoading(true);setError('');setPending(null);
    fetchAdminDirectory(query,page).then(r=>{if(alive){setUsers(r.users);setTotal(r.total);}}).catch(e=>{if(alive){setUsers([]);if(e instanceof Error&&e.message==='mfa_required')onMfaRequired();else setError(message(e));}}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[query,page,version,onMfaRequired]);
  async function commit(){if(!pending||busy)return;setBusy(true);setError('');setNotice('');try{await setAdminAccess(pending.id,pending.updatedAt,!pending.isAdmin);setNotice(pending.isAdmin?'管理者権限を解除しました。':'管理者を追加しました。管理画面の利用には本人の追加認証が必要です。');setPending(null);setVersion(v=>v+1);}catch(e){if(e instanceof Error&&e.message==='mfa_required')onMfaRequired();else setError(message(e));}finally{setBusy(false);}}
  return <section style={{background:'#fff',borderRadius:16,padding:20,marginTop:24}}>
    <h2 style={{fontSize:18}}>管理者の追加・解除</h2><p style={{color:'#667',fontSize:13}}>登録済みユーザーから選びます。Adminは会員情報と無料／有料区分を編集できます。</p>
    <form onSubmit={e=>{e.preventDefault();setQuery(input.trim());setPage(1);setVersion(v=>v+1);}} style={{display:'flex',gap:8}}><input aria-label="管理者候補を表示名で検索" placeholder="表示名で検索" maxLength={100} value={input} onChange={e=>setInput(e.target.value)} style={field}/><button disabled={busy} className="primary-button">検索</button></form>
    {error&&<p role="alert" style={{color:'#a33'}}>{error}</p>}{notice&&<p role="status" style={{color:'#176b4b'}}>{notice}</p>}
    {pending&&<div style={{background:'#fff7e5',padding:16,borderRadius:8,marginTop:12}}><p><strong>{pending.displayName||'表示名未設定'}</strong>を{pending.isAdmin?'Adminから解除':'Adminに追加'}します。</p><p style={{fontSize:12,overflowWrap:'anywhere'}}>対象ID：{pending.id}</p><button disabled={busy} onClick={commit} className="primary-button">{busy?'処理中…':pending.isAdmin?'解除を確定':'追加を確定'}</button> <button disabled={busy} onClick={()=>setPending(null)} className="ghost-button">キャンセル</button></div>}
    {loading?<p>読み込み中…</p>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13,marginTop:12}}><thead><tr><th>表示名</th><th>地域</th><th>権限</th><th>操作</th></tr></thead><tbody>{users.map(u=><tr key={u.id} style={{borderTop:'1px solid #eee'}}><td style={{padding:10}}>{u.displayName||'表示名未設定'}<small style={{display:'block',color:'#889'}}>{u.id.slice(0,8)}</small></td><td>{u.area||'—'}</td><td>{u.isSuperAdmin?'Super Admin':u.isAdmin?'Admin':'一般会員'}</td><td>{u.isSuperAdmin?'変更不可':<button disabled={busy} className="ghost-button" onClick={()=>{setPending(u);setError('');setNotice('');}}>{u.isAdmin?'Adminを解除':'Adminに追加'}</button>}</td></tr>)}</tbody></table>{users.length===0&&<p>該当するユーザーがいません。</p>}</div>}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12}}><span>{total}件</span><div><button disabled={page<=1||busy||loading} onClick={()=>setPage(p=>p-1)}>前へ</button> {page} / {Math.max(1,Math.ceil(total/20))} <button disabled={page*20>=total||busy||loading} onClick={()=>setPage(p=>p+1)}>次へ</button></div></div>
  </section>;
}
