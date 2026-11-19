import assert from 'node:assert/strict';
import fs from 'node:fs';
const pages=['home','products','finishes','spaces','quality'];
for(const name of pages){
 const html=fs.readFileSync('content/'+name+'.html','utf8');
 assert.equal([...html.matchAll(/<h1\b/g)].length,1,name+' has one page title');
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length,name+' IDs unique');
 for(const [,path] of html.matchAll(/(?:src|href)="(\/(?:assets|documents|styles\.css|app\.js|catalog\.js|document-viewer\.js|document-viewer\.css|favicon\.svg)[^"#]*)[^\"]*"/g))assert.ok(fs.existsSync('public'+path),name+': '+path);
 for(const a of html.matchAll(/<a\b[^>]*href="\/documents\/[^\"]+\.pdf[^\"]*"[^>]*>/g)){assert.ok(a[0].includes('data-document='),name+' uses inline reader');assert.ok(!a[0].includes('target="_blank"'));}
 assert.ok(html.includes('/products')&&html.includes('/finishes')&&html.includes('/spaces')&&html.includes('/quality'),name+' has connected navigation');
}
const manifest=JSON.parse(fs.readFileSync('public/documents/manifest.json','utf8'));let total=0;
for(const [id,count] of Object.entries({product:83,finish:11,fire:5,formaldehyde:3})){
 assert.equal(manifest[id].pageCount,count);assert.equal(manifest[id].pages.length,count);total+=count;
 for(const p of manifest[id].pages)assert.ok(fs.existsSync('public'+p.src));
}
assert.equal(total,102);
console.log('PASS: five connected pages, unique titles/IDs, existing assets, inline document links and all 102 document pages');
