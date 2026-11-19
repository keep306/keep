import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const root=fileURLToPath(new URL('../',import.meta.url));
const requested=process.env.PAGES_BASE_PATH??'/keep';
const base=requested==='/'?'':requested.replace(/\/$/,'');
if(base&&!/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(base))throw new Error('Invalid Pages base path');
const out=path.join(root,'out');
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
await fs.cp(path.join(root,'public'),out,{recursive:true});
for(const name of ['admin.js','admin.css'])await fs.rm(path.join(out,name),{force:true});

function relocate(value){
  if(value==='/api/catalog')return base+'/catalog.json';
  if(value==='/'||/^\/(?:assets(?:\/|$)|documents(?:\/|$)|api(?:\/|$)|products(?:[/?#]|$)|finishes(?:[/?#]|$)|spaces(?:[/?#]|$)|quality(?:[/?#]|$)|#)/.test(value)){
    const canonical=value.replace(/^\/(products|finishes|spaces|quality)(?=[?#]|$)/,'/$1/');
    return base+canonical;
  }
  return value;
}
function relocateScript(source){
  const ast=parse(source,{ecmaVersion:'latest',sourceType:'script'}),edits=[];
  function walk(node,parent){
    if(!node||typeof node!=='object')return;
    if(node.type==='Literal'&&typeof node.value==='string'){
      const separator=node.value==='/'&&parent?.type==='CallExpression'&&parent.callee?.property?.name==='split';
      const next=separator?node.value:relocate(node.value);if(next!==node.value)edits.push({start:node.start,end:node.end,value:JSON.stringify(next)});
    }else if(node.type==='Literal'&&node.regex&&base&&node.regex.pattern.startsWith('^\\/assets\\/')){
      edits.push({start:node.start,end:node.end,value:'/'+node.regex.pattern.replace(/^\^\\\//,'^'+base.replaceAll('/','\\/')+'\\/')+'/'+node.regex.flags});
    }else if(node.type==='TemplateElement'){
      const next=relocate(node.value.raw);if(next!==node.value.raw)edits.push({start:node.start,end:node.end,value:next});
    }
    for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(child=>walk(child,node));else if(value&&typeof value==='object'&&typeof value.type==='string')walk(value,node);}
  }
  walk(ast);for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.value+source.slice(edit.end);
  parse(source,{ecmaVersion:'latest',sourceType:'script'});return source;
}

for(const name of ['app.js','document-viewer.js','hero-carousel.js']){
  let source=await fs.readFile(path.join(out,name),'utf8');
  if(name==='app.js'){
    const start=source.indexOf("  const fieldNames=['name'"),end=source.indexOf("  const menu=$('.menu-toggle')");
    if(start<0||end<start)throw new Error('Inquiry block not found');
    source=source.slice(0,start)+source.slice(end);
    source=source.replaceAll('未选择花色，可直接提交咨询。','未选择花色，可直接咨询产品。');
  }
  await fs.writeFile(path.join(out,name),relocateScript(source));
}

const manifestPath=path.join(out,'documents/manifest.json');
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
for(const item of Object.values(manifest)){item.pdf=relocate(item.pdf);for(const page of item.pages)page.src=relocate(page.src);}
await fs.writeFile(manifestPath,JSON.stringify(manifest));
const catalog={};for(const name of ['products','swatches','settings'])catalog[name]=JSON.parse(await fs.readFile(path.join(root,'content',name+'.json'),'utf8'));
catalog.products=catalog.products.filter(x=>x.visible!==false);catalog.swatches=catalog.swatches.filter(x=>x.visible!==false);
await fs.writeFile(path.join(out,'catalog.json'),JSON.stringify(catalog));
for(const file of ['whatsapp.js','whatsapp.css'])await fs.copyFile(path.join(root,'pages',file),path.join(out,file));

const whatsapp = new URL(catalog.settings.socials.whatsapp);
if (whatsapp.protocol !== 'https:' || whatsapp.hostname !== 'wa.me' || !/^\/\d+$/.test(whatsapp.pathname)) {
  throw new Error('A valid WhatsApp business number is required for the public site');
}
const composer = (await fs.readFile(path.join(root, 'pages/enquiry.html'), 'utf8'))
  .replaceAll('{{whatsapp}}', whatsapp.origin + whatsapp.pathname);
const versions = new Map();
for (const filename of await fs.readdir(out)) {
  if (!/\.(js|css)$/.test(filename)) continue;
  const bytes = await fs.readFile(path.join(out, filename));
  versions.set(filename, createHash('sha256').update(bytes).digest('hex').slice(0, 12));
}
const replacements=[
 ['填写所需产品、规格、预计用量或样板需求，并留下联系邮箱，便于进一步确认。','选择感兴趣的花色，或简单描述所需产品与数量，通过 WhatsApp 与我们确认。'],
 ['Tell us the products, specifications, estimated quantity or samples you need, and leave your email so we can follow up.','Choose finishes or describe the products and quantities you need, then contact us on WhatsApp.'],
 ['您提交的信息仅用于本次业务咨询和相关联系。','咨询内容将带入 WhatsApp，由您确认后发送。'],
 ['The information you submit is used only for this business enquiry and related follow-up.','Your enquiry opens in WhatsApp for you to review and send.'],
 ['未选择花色，可直接提交咨询。','未选择花色，可直接咨询产品。'],
 ['开启 JavaScript 后可浏览动态花色、站内资料并提交询盘。您也可以直接查看 PDF 原文件。','开启 JavaScript 后可浏览动态花色和站内资料，或直接通过 WhatsApp 联系。'],
 ['Enable JavaScript to browse finishes, read documents and submit an enquiry. You can also view the original PDF files directly.','Enable JavaScript for interactive finishes and document reading, or contact us directly on WhatsApp.'],
];
for(const name of ['home','products','finishes','spaces','quality']){
  let html=await fs.readFile(path.join(root,'content',name+'.html'),'utf8');
  if(name==='home'){
    const enquirySlot = /<!-- enquiry-content:start -->[\s\S]*?<!-- enquiry-content:end -->/;
    if (!enquirySlot.test(html)) throw new Error('Enquiry slot missing from homepage');
    html=html.replace(enquirySlot,composer);
    html=html.replace(/<p\b[^>]*id="privacy-note"[^>]*>[\s\S]*?<\/p>/,'');

  }
  for(const [before,after] of replacements)html=html.replaceAll(before,after);
  html=html.replace(/<a\b[^>]*href="\/admin"[^>]*>[\s\S]*?<\/a>/g,'');
  if(name==='home')html=html.replace('</head>','<link rel="stylesheet" href="/whatsapp.css"><script src="/whatsapp.js" defer></script></head>');
  html=html.replace(/\b(href|src|data-hero-src|data-hero-fallback|data-hero-link)="(\/(?!\/)[^"]*)"/g,(_,attribute,value)=>attribute+'="'+(value.startsWith('/whatsapp.')?base+value:relocate(value))+'"');
  // Other root-level stylesheet/script paths are also local to the project site.
  html=html.replace(/\b(href|src)="(\/(?!\/)[^"]*)"/g,(match,attribute,value)=>value.startsWith(base+'/')?match:attribute+'="'+base+value+'"');
  // Version each referenced public script and stylesheet so Pages clients load a matching release.
  html=html.replace(/\b(href|src)="([^"]+\.(?:js|css))"/g,(match,attribute,url)=>{
    const version=versions.get(url.split('/').pop());
    return version ? attribute+'="'+url+'?v='+version+'"' : match;
  });
  const dir=name==='home'?out:path.join(out,name);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'index.html'),html);
}
await fs.writeFile(path.join(out,'.nojekyll'),'');
console.log(`Built GitHub Pages: ${base||'/'} · 5 pages · ${catalog.swatches.length} finishes · 102 document pages · WhatsApp enquiries`);
