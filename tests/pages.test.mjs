import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parse} from 'acorn';
execFileSync(process.execPath,[fileURLToPath(new URL('../scripts/build-pages.mjs',import.meta.url))],{env:{...process.env,PAGES_BASE_PATH:'/keep'}});
const out=new URL('../out/',import.meta.url);
const read=name=>fs.readFile(new URL(name,out),'utf8');

test('Pages routes, scripts and images stay under /keep and resolve to exported files',async()=>{
  for(const route of ['', 'products/','finishes/','spaces/','quality/']){
    const html=await read(route+'index.html');
    assert.ok(!/href="\/admin|id="inquiry-form"|id="inquiry-success"/.test(html),'No backend form or admin link: '+route);
    assert.match(html,/<html lang="en"/);
    for(const [,url] of html.matchAll(/\b(?:href|src|data-hero-src|data-hero-fallback|data-hero-link)="(\/(?!\/)[^"]*)"/g)){
      assert.ok(url.startsWith('/keep/'),route+': '+url);
      let local=new URL(url,'https://example.test').pathname.slice('/keep/'.length);
      if(local.endsWith('/')||local==='')local+='index.html';
      await fs.access(new URL(local,out));
    }
  }
  for(const name of ['app.js','document-viewer.js','hero-carousel.js','whatsapp.js'])parse(await read(name),{ecmaVersion:'latest'});
  const app=await read('app.js'),reader=await read('document-viewer.js');
  assert.ok(app.includes('fetchJSON("/keep/catalog.json",'),'Static catalogue URL');
  assert.match(app,/image\.split\('\/'\)/);
  assert.ok(app.includes("'#finishes':\"/keep/finishes/\""),'Product finish button stays under project path');
  assert.doesNotMatch(app,/\/api\/inquiries|method:'POST'/);
  assert.match(reader,/\.pdf\.split\('\/'\)/);
  for(const id of ['product','finish','fire','formaldehyde'])assert.match(reader,new RegExp('/keep/documents/'+({product:'product-catalog',finish:'finish-catalog',fire:'fire-report',formaldehyde:'formaldehyde-report'}[id])+'.pdf'));
  assert.match(reader,/`\/keep\/documents\/pages\/\$\{id\}/);
  await assert.rejects(()=>fs.access(new URL('admin.js',out)));
});

test('all 102 document pages and four PDFs are included, with public catalogue data only',async()=>{
  const manifest=JSON.parse(await read('documents/manifest.json'));
  assert.equal(Object.keys(manifest).length,4);
  let count=0;
  for(const item of Object.values(manifest)){
    assert.equal(item.pages.length,item.pageCount);
    for(const src of [item.pdf,...item.pages.map(p=>p.src)]){
      assert.ok(src.startsWith('/keep/documents/'));
      await fs.access(new URL(src.slice('/keep/'.length),out));
    }
    count+=item.pageCount;
  }
  assert.equal(count,102);
  const catalog=JSON.parse(await read('catalog.json'));
  assert.deepEqual(Object.keys(catalog).sort(),['products','settings','swatches']);
  assert.equal(catalog.swatches.length,24);
  assert.equal(catalog.settings.socials.whatsapp,'https://wa.me/8615215986929');
});

test('WhatsApp draft includes selected references and notes, switches language and never sends',async()=>{
  const events={},listeners={},saved=new Map();
  const note={value:'',addEventListener:(name,fn)=>listeners[name]=fn};
  const send={href:'',addEventListener:(name,fn)=>listeners['send:'+name]=fn};
  const count={textContent:''};
  const language={value:'en'};
  let selected=[{id:'wood-01',name:'木纹 01',code:'W01'}];
  const context={URL,document:{readyState:'complete',querySelector:()=>({dataset:{whatsappUrl:'https://wa.me/8615215986929'}}),getElementById:id=>({'whatsapp-note':note,'whatsapp-send':send,'whatsapp-note-count':count}[id])},window:{SoyaI18n:{addTranslations(){},get language(){return language.value;},t:value=>language.value==='en'&&value==='木纹 01'?'Wood 01':value},SoyaGetSelectedFinishes:()=>selected,addEventListener:(name,fn)=>events[name]=fn},sessionStorage:{getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)}};
  vm.runInNewContext(await read('whatsapp.js'),context);
  note.value='500 m² & samples\nDestination: UAE';listeners.input();
  const url=new URL(send.href),text=url.searchParams.get('text');
  assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/8615215986929');
  assert.match(text,/Wood 01 \[W01\]/);assert.ok(text.includes(note.value));assert.equal(saved.size,1);
  language.value='zh';events['soya:languagechange']();assert.match(new URL(send.href).searchParams.get('text'),/所选花色：\n- 木纹 01 \[W01\]/);
  selected=[];events['soya:selectionchange']();assert.doesNotMatch(new URL(send.href).searchParams.get('text'),/W01/);
  note.value='';listeners.input();assert.equal(saved.size,0);
});
