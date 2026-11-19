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
  const note={value:'',focus(){},addEventListener:(name,fn)=>listeners[name]=fn};
  const send={href:'',addEventListener:(name,fn)=>listeners['send:'+name]=fn};
  const count={textContent:''};
  const language={value:'en'};
  let selected=[{id:'wood-01',name:'木纹 01',code:'W01'}];
  const location=new URL('https://example.test/keep/?product=spc#inquiry');
  const productRow={hidden:true},productLabel={textContent:''};
  const remove={addEventListener:(_,fn)=>listeners.removeProduct=fn};
  const fields={'whatsapp-note':note,'whatsapp-send':send,'whatsapp-note-count':count,
    'whatsapp-product-row':productRow,'whatsapp-product':productLabel,'whatsapp-remove-product':remove};
  const en={'木纹 01':'Wood 01','SPC 石晶墙板':'SPC wall panels'};
  const context={
    URL,location,history:{state:null,replaceState:(_,__,url)=>{location.href=url;}},
    document:{readyState:'complete',querySelector:()=>({dataset:{whatsappUrl:'https://wa.me/8615215986929'}}),getElementById:id=>fields[id]},
    window:{
      SoyaI18n:{addTranslations(){},get language(){return language.value;},t:value=>language.value==='en'?(en[value]||value):value},
      SoyaGetSelectedFinishes:()=>selected,SoyaGetInquiryProduct:()=>location.searchParams.has('product')?'SPC 石晶墙板':'',
      addEventListener:(name,fn)=>events[name]=fn
    },
    sessionStorage:{getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)}
  };
  vm.runInNewContext(await read('whatsapp.js'),context);
  note.value='500 m² & samples\nDestination: UAE';listeners.input();
  const url=new URL(send.href),text=url.searchParams.get('text');
  assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/8615215986929');
  assert.equal(productRow.hidden,false);assert.equal(productLabel.textContent,'SPC wall panels');
  assert.match(text,/Selected panel: SPC wall panels/);
  assert.match(text,/Wood 01 \[W01\]/);assert.ok(text.includes(note.value));assert.equal(saved.size,1);
  language.value='zh';events['soya:languagechange']();assert.match(new URL(send.href).searchParams.get('text'),/所选花色：\n- 木纹 01 \[W01\]/);
  assert.match(new URL(send.href).searchParams.get('text'),/所选板材：SPC 石晶墙板/);
  listeners.removeProduct();assert.equal(productRow.hidden,true);assert.equal(location.hash,'#inquiry');
  assert.doesNotMatch(new URL(send.href).searchParams.get('text'),/所选板材/);
  assert.ok(new URL(send.href).searchParams.get('text').includes(note.value));
  selected=[];events['soya:selectionchange']();assert.doesNotMatch(new URL(send.href).searchParams.get('text'),/W01/);
  note.value='';listeners.input();assert.equal(saved.size,0);
});

test('home material links reach four finish groups and the two extended catalogue sections',async()=>{
  const html=await read('index.html');
  assert.equal((html.match(/\bdata-hero-slide\b/g)||[]).length,5);
  assert.equal((html.match(/data-hero-src="\/keep\/assets\/studio-[a-z]+-v2\.webp"/g)||[]).length,5);
  for(const texture of ['wood','stone','fabric','solid'])assert.ok(html.includes('href="/keep/finishes/?texture='+texture+'"'));
  for(const page of [48,60])assert.ok(html.includes('data-hero-link="/keep/documents/product-catalog.pdf#page='+page+'"'));
  assert.match(await read('hero-carousel.js'),/prefers-reduced-motion/);
});
