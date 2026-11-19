import assert from 'node:assert/strict';
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:5173';
let cookie='';
async function request(path,{method='GET',body,auth=false,origin=base}={}){
 const headers={};if(body){headers['content-type']='application/json';headers.origin=origin;}if(auth)headers.cookie=cookie;
 const response=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined,redirect:'manual'});
 const type=response.headers.get('content-type')||'';const data=type.includes('json')?await response.json():await response.text();return {status:response.status,data,response};
}
const unauth=await request('/api/admin/session');assert.equal(unauth.status,401);
const signin=await fetch(base+'/signin-with-chatgpt?return_to=/admin',{redirect:'manual'});
cookie=signin.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');assert.ok(cookie,'local starter sign-in sets cookie');
const session=await request('/api/admin/session',{auth:true});assert.equal(session.status,200,JSON.stringify(session.data));
const initial=await request('/api/admin/catalog',{auth:true});assert.equal(initial.status,200);assert.equal(initial.data.swatches.length,24);
const email='local-smoke-'+Date.now()+'@example.test';
const payload={name:'本机验证',email,company:'仅本机测试',country:'测试',projectType:'commercial',message:'这是一条仅在本机数据库中使用的询盘验证数据。',selectedSwatches:[initial.data.swatches[0].id],consent:true,requestId:crypto.randomUUID(),website:''};
const first=await request('/api/inquiries',{method:'POST',body:payload});assert.equal(first.status,201,JSON.stringify(first.data));
const duplicate=await request('/api/inquiries',{method:'POST',body:payload});assert.equal(duplicate.status,200);assert.equal(duplicate.data.inquiry.id,first.data.inquiry.id);
const changed=await request('/api/inquiries',{method:'POST',body:{...payload,message:payload.message+'修改'}});assert.equal(changed.status,409);
const cross=await request('/api/inquiries',{method:'POST',body:{...payload,requestId:crypto.randomUUID()},origin:'https://another.example'});assert.equal(cross.status,403);
const list=await request('/api/admin/inquiries?q='+encodeURIComponent(email),{auth:true});assert.equal(list.status,200);assert.equal(list.data.total,1);assert.equal(list.data.items[0].selectedSwatches[0].name,initial.data.swatches[0].name);
const record=list.data.items[0];const patch=await request('/api/admin/inquiries/'+record.id,{method:'PATCH',auth:true,body:{status:'read',notes:'本机状态验证',version:record.version}});assert.equal(patch.status,200,JSON.stringify(patch.data));
const stale=await request('/api/admin/inquiries/'+record.id,{method:'PATCH',auth:true,body:{status:'replied',notes:'',version:record.version}});assert.equal(stale.status,409);
const single=await request('/api/admin/inquiries/'+record.id,{auth:true});assert.equal(single.status,200);assert.equal(single.data.inquiry.status,'read');
const settings={...initial.data.settings,heroSubtitle:'本机持久化验证'};
try{
 const saved=await request('/api/admin/settings',{method:'PUT',auth:true,body:settings});assert.equal(saved.status,200,JSON.stringify(saved.data));
 const current=await request('/api/catalog');assert.equal(current.data.settings.heroSubtitle,settings.heroSubtitle);
}finally{assert.equal((await request('/api/admin/settings',{method:'PUT',auth:true,body:initial.data.settings})).status,200);}
const product=initial.data.products[0];
try{
 assert.equal((await request('/api/admin/products/'+product.id,{method:'PUT',auth:true,body:{...product,visible:false}})).status,200);
 const current=await request('/api/catalog');assert.ok(!current.data.products.some(x=>x.id===product.id));
}finally{assert.equal((await request('/api/admin/products/'+product.id,{method:'PUT',auth:true,body:product})).status,200);}
const csv=await request('/api/admin/inquiries/export?q='+encodeURIComponent(email),{auth:true});assert.equal(csv.status,200);assert.ok(csv.data.includes(email));
const bad=await request('/api/inquiries',{method:'POST',body:{...payload,email:'bad',requestId:crypto.randomUUID()}});assert.equal(bad.status,400);
console.log('PASS: local full-stack authorization, D1 inquiry persistence, retry idempotency, conflict handling, content updates, CSV and validation');
console.log(JSON.stringify({inquiryId:record.id,email,storedStatus:'read',database:'local only'}));
