type Client = any;
export async function handleManagement(client: Client, admin: Client, profile: { is_super_admin?: boolean }, body: Record<string, unknown>, headers: Record<string, string>): Promise<Response> {
  const reply = (data: unknown, status=200) => new Response(JSON.stringify(data), {status,headers:{...headers,'Content-Type':'application/json'}});
  if (body.action === 'permissions') return reply({isSuperAdmin:profile.is_super_admin===true});
  if (body.action === 'admin_directory') {
    if (profile.is_super_admin !== true) return reply({error:'Forbidden'},403);
    const page=Number.isInteger(body.page)&&Number(body.page)>0?Math.min(Number(body.page),100000):1;
    const search=typeof body.search==='string'?body.search.trim().slice(0,100):'';
    let query=admin.from('profiles').select('id,display_name,area,role,membership_tier,is_admin,is_super_admin,updated_at',{count:'exact'}).order('created_at',{ascending:false}).order('id').range((page-1)*20,page*20-1);
    if(search) query=query.ilike('display_name',`%${search}%`);
    const {data,error,count}=await query;
    if(error) return reply({error:'Internal server error'},500);
    return reply({users:(data??[]).map((p:any)=>({id:p.id,displayName:p.display_name??'',area:p.area??'',role:p.role,membershipTier:p.membership_tier,isAdmin:p.is_admin,isSuperAdmin:p.is_super_admin,updatedAt:p.updated_at})),total:count??0,page,pageSize:20});
  }
  if(body.action !== 'update_member' && body.action !== 'set_admin') return reply({error:'Unknown action'},400);
  if(typeof body.targetId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.targetId)||typeof body.expectedUpdatedAt!=='string'||!Number.isFinite(Date.parse(body.expectedUpdatedAt))) return reply({error:'INVALID_FIELDS'},400);
  if(body.action==='set_admin' && profile.is_super_admin!==true) return reply({error:'Forbidden'},403);
  if(body.action==='set_admin' && typeof body.enabled!=='boolean') return reply({error:'INVALID_FIELDS'},400);
  if(body.action==='update_member' && (!body.patch||typeof body.patch!=='object'||Array.isArray(body.patch))) return reply({error:'INVALID_FIELDS'},400);
  // Forward the verified user's JWT to the DB: auth.uid()/auth.jwt() are authoritative.
  const {data,error}=await client.rpc(body.action==='set_admin'?'admin_set_admin':'admin_update_member',{
    p_target:body.targetId,p_expected_updated_at:body.expectedUpdatedAt,
    ...(body.action==='set_admin'?{p_enabled:body.enabled}:{p_patch:body.patch}),
  });
  if(error){
    const code=error.message;
    const statuses:Record<string,number>={MFA_REQUIRED:403,FORBIDDEN:403,PROTECTED_ADMIN:403,NOT_FOUND:404,CONFLICT:409,INVALID_FIELDS:400};
    return reply({error:code in statuses?code:'Internal server error'},statuses[code]??500);
  }
  return reply(data);
}
