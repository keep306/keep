(() => {
  'use strict';
  const t = (value, vars) => window.SoyaI18n ? window.SoyaI18n.t(value, vars) : String(value ?? '');
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const categories={wood:'温润木纹',stone:'自然石纹',fabric:'细腻布纹',solid:'纯粹色彩'};
  const fallbackProducts = {
    spc: {title:'SPC 石晶墙板',kicker:'SPC WALL PANEL',image:'assets/scene-spc.jpg',alt:'SPC 石晶墙板在卫浴空间的应用展示',description:'由 SPC 基材、彩膜和耐磨层组成。画册列有 2–6 mm 厚度及多种宽度，可查看木纹、石纹、布纹与纯色饰面。',details:[['画册所列厚度','2 / 3 / 4 / 5 / 6 mm'],['画册所列宽度','600 / 1200 / 1220 mm'],['长度','可定制 · 以选定规格为准']],action:'#finishes',actionLabel:'浏览 SPC 饰面花色'},
    carbon:{title:'碳晶板',kicker:'CARBON CRYSTAL BOARD',image:'assets/carbon-interior.jpg',alt:'碳晶板在现代会议空间的应用展示',description:'提供木纹、石纹、布纹、纯色及其他表面系列。木纹系列画册规格为 5 / 8 mm 厚、1220 mm 宽，具体选择请查阅对应页面。',details:[['饰面选择','木纹 / 石纹 / 布纹 / 纯色'],['木纹系列厚度','5 / 8 mm'],['木纹系列宽度','1220 mm · 详见画册']],action:'documents/product-catalog.pdf#page=12',actionLabel:'查看碳晶板系列'},
    grille:{title:'格栅与集成墙板',kicker:'LINES, TEXTURE & RHYTHM',image:'assets/grille-living.jpg',alt:'竹木纤维格栅板在客厅背景墙的应用展示',description:'包含竹木纤维格栅板与集成墙板，可搭配用于室内墙面和背景墙。板型及安装方式见产品画册。',details:[['产品系列','竹木纤维格栅板'],['搭配系列','竹木纤维集成墙板'],['更多资料','产品画册第 31–38 页']],action:'documents/product-catalog.pdf#page=32',actionLabel:'查看格栅与墙板系列'},
    art:{title:'艺术装饰吸音板',kicker:'DESIGNED TO BE FELT',image:'assets/acoustic-chair.jpg',alt:'木色条状艺术装饰吸音板与橙色休闲椅',description:'条状木色饰面的艺术装饰吸音板。外形、结构与规格见对应画册页面。',details:[['产品系列','艺术装饰吸音板'],['设计语言','线条 / 木色 / 层次'],['更多资料','产品画册第 39–47 页']],action:'documents/product-catalog.pdf#page=39',actionLabel:'查看艺术饰面系列'}
  };
  const STORAGE_KEY = 'soya-selected-finishes-v1';
  let products=Object.entries(fallbackProducts).map(([id,item])=>({id,...item}));
  let swatches=(window.SWATCHES||[]).map(item=>({...item,id:item.id||item.image.split('/').pop().replace(/\.[^.]+$/,'')}));
  let activeProduct=new URLSearchParams(location.search).get('series')||products[0]?.id,activeFilter='all';
  let selectedIds=[],returnFocus=null,returnSelectionIndex=-1,dialogSwatchId=null,catalogReady=false,submitting=false,pendingRequest=null;
  const dialog=$('#swatch-dialog'),form=$('#inquiry-form');
  const element=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=t(text);return node;};
  const assetPath=value=>"/keep/"+String(value).replace(/^\/+/, '');
  const setText=(selector,value)=>{const node=$(selector);if(node)node.textContent=t(value);};
  const selectedSwatches=()=>selectedIds.map(id=>swatches.find(s=>s.id===id)).filter(Boolean);
  const allowedAsset=value=>typeof value==='string'&&/^\/?assets\/[a-zA-Z0-9._-]+\.(?:jpe?g|png|webp|svg)$/i.test(value);
  const allowedAction=value=>typeof value==='string'&&(/^[#][a-zA-Z0-9_-]+$/.test(value)||/^\/?documents\/[a-zA-Z0-9._-]+\.pdf(?:#page=\d+)?$/.test(value));
  function announce(message){setText('#selection-announcement',message);}
  try{const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');if(Array.isArray(stored))selectedIds=[...new Set(stored.filter(id=>typeof id==='string'))].slice(0,24);}catch{/* Local preferences are optional. */}
  function saveSelection(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(selectedIds));}catch{announce('选样清单已更新；当前浏览器无法保存，关闭页面后可能丢失。');}}
  function setProduct(id){
    if(!$('#product-panel'))return;
    const product=products.find(item=>item.id===id);if(!product)return;activeProduct=id;
    $$('.product-tabs button').forEach(button=>{const active=button.dataset.product===id;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    $('#product-panel').setAttribute('aria-labelledby','tab-'+id);
    if(allowedAsset(product.image))$('#product-image').src=assetPath(product.image);
    $('#product-image').alt=t(product.alt);$('#product-title').textContent=t(product.title);$('#product-kicker').textContent=t(product.kicker);$('#product-description').textContent=t(product.description);
    $('#product-details').replaceChildren(...product.details.map(([label,value])=>{const row=element('div');row.append(element('dt','',label),element('dd','',value));return row;}));
    const link=$('#product-action');link.removeAttribute('target');link.removeAttribute('rel');delete link.dataset.document;delete link.dataset.documentPage;
    link.replaceChildren(document.createTextNode(t(product.actionLabel+' ')),element('span','','→'));
    if(product.action.startsWith('#'))link.href=({'#finishes':"/keep/finishes/",'#contact':"/keep/#inquiry",'#collections':"/keep/products/",'#spaces':"/keep/spaces/",'#quality':"/keep/quality/"})[product.action]||"/keep/products/";
    else{link.href=allowedAction(product.action)?assetPath(product.action):"/keep/documents/product-catalog.pdf";const documents={'fire-report':'fire','formaldehyde-report':'formaldehyde','product-catalog':'product','finish-catalog':'finish'};const match=Object.entries(documents).find(([name])=>product.action.includes(name+'.pdf'));if(match)link.dataset.document=match[1];const page=product.action.match(/#page=(\d+)/);if(page)link.dataset.documentPage=page[1];}

  }
  function renderProducts(){
    const tablist=$('.product-tabs');if(!tablist)return;tablist.replaceChildren(...products.map((product,index)=>{const b=element('button','',product.title);b.type='button';b.id='tab-'+product.id;b.dataset.product=product.id;b.setAttribute('role','tab');b.setAttribute('aria-controls','product-panel');b.setAttribute('aria-selected','false');b.tabIndex=-1;return b;}));
    tablist.hidden=!products.length;$('#product-panel').hidden=!products.length;$('#products-empty').hidden=!!products.length;
    setProduct(products.some(p=>p.id===activeProduct)?activeProduct:products[0]?.id);
  }
  function renderProductPreviews(){
    const grid=$('#product-preview-grid');if(!grid)return;
    const materialImages={
      spc:{image:'assets/material-spc-stack.jpg',alt:'SPC 石晶墙板叠层与板材边缘细节',label:'SPC WALL PANEL'},
      carbon:{image:'assets/material-carbon-samples.jpg',alt:'木纹碳晶板扇形样板，展示饰面与基材',label:'CARBON CRYSTAL BOARD'},
      grille:{image:'assets/material-grille-samples.jpg',alt:'多种木色格栅样块与凹凸截面',label:'GRILLE & WALL PANEL'},
      art:{image:'assets/material-acoustic-sample.jpg',alt:'艺术装饰吸音板样块，展示木条与黑色底板结构',label:'ACOUSTIC PANEL'}
    };
    grid.replaceChildren(...products.map(product=>{const material=materialImages[product.id],link=element('a','product-preview-card');link.href="/keep/products/?series="+encodeURIComponent(product.id);const image=element('img');image.src=assetPath(material?.image||product.image);image.alt=t(material?.alt||product.alt);image.loading='lazy';image.width=800;image.height=800;const copy=element('div');copy.append(element('p','eyebrow',material?.label||product.kicker),element('h3','',product.title),element('span','preview-arrow','↗'));link.append(image,copy);return link;}));
    if(!products.length)grid.append(element('p','empty-state','产品资料正在整理中，可前往产品中心查看完整画册。'));
  }
  $('.product-tabs')?.addEventListener('click',event=>{const b=event.target.closest('button[data-product]');if(b)setProduct(b.dataset.product);});
  $('.product-tabs')?.addEventListener('keydown',event=>{
    const tabs=$$('.product-tabs button'),index=tabs.indexOf(event.target);if(index<0)return;let next;
    if(event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;
    if(next!==undefined){event.preventDefault();tabs[next].focus();setProduct(tabs[next].dataset.product);}
  });
  function updateDialogSelection(){
    const s=swatches.find(item=>item.id===dialogSwatchId),b=$('#dialog-select'),chosen=selectedIds.includes(dialogSwatchId);if(!b)return;
    b.disabled=!s||submitting;b.setAttribute('aria-pressed',String(chosen));b.replaceChildren(document.createTextNode(t(chosen?'从选样中移除 ':'加入选样 ')),element('span','',chosen?'−':'+'));
  }
  function openSwatch(swatch,trigger){
    if(!dialog)return;
    returnFocus=trigger;returnSelectionIndex=$$('.selection-preview').indexOf(trigger);dialogSwatchId=swatch.id;$('#dialog-image').src=assetPath(swatch.image);$('#dialog-image').alt=t(swatch.name+'饰面纹理');$('#dialog-title').textContent=t(swatch.name);
    $('#dialog-category').textContent=t((categories[swatch.category]||'饰面花色')+' / FINISH DETAIL');$('#dialog-code').textContent=t(swatch.code?'花色编号 '+swatch.code:'画册原名 · '+swatch.name);
    $('#dialog-source').textContent=t('PDF 第 '+swatch.page+' 页');$('.dialog-catalog-link').href="/keep/documents/finish-catalog.pdf#page="+swatch.page;$('.dialog-catalog-link').dataset.document='finish';$('.dialog-catalog-link').dataset.documentPage=String(swatch.page);updateDialogSelection();dialog.showModal();document.body.style.overflow='hidden';
  }
  function toggleSelection(id){
    if(submitting||!swatches.some(item=>item.id===id))return;
    const existing=selectedIds.includes(id),name=swatches.find(item=>item.id===id).name;
    if(existing)selectedIds=selectedIds.filter(item=>item!==id);else if(selectedIds.length<24)selectedIds.push(id);else{announce('最多可选择 24 款花色，请先移除部分选样。');return;}
    saveSelection();updateSelection();announce(name+(existing?'已移出选样清单。':'已加入选样清单。'));
  }
  function renderSwatches(){
    if(!$('#swatch-grid'))return;
    const matching=swatches.filter(s=>activeFilter==='all'||s.category===activeFilter);
    const visible=matching;
    $('#swatch-grid').replaceChildren(...visible.map((s,index)=>{
      const card=element('article','swatch-card');card.style.animationDelay=(index%4)*.035+'s';const open=element('button','swatch-open');open.type='button';open.setAttribute('aria-label',t('查看'+s.name+'花色详情'));
      const figure=element('div','swatch-image'),img=element('img');img.src=assetPath(s.image);img.alt=t(s.name+'饰面纹理');img.loading='lazy';img.width=600;img.height=750;
      const zoom=element('span','swatch-zoom','↗');zoom.setAttribute('aria-hidden','true');figure.append(img,zoom);
      const info=element('div','swatch-info');info.append(element('h3','',s.name),element('span','',categories[s.category]));open.append(figure,info,element('p','swatch-code','SPC / '+(s.code||'SURFACE COLLECTION')));open.addEventListener('click',()=>openSwatch(s,open));
      const select=element('button','swatch-select');select.type='button';select.dataset.selectId=s.id;select.addEventListener('click',()=>toggleSelection(s.id));card.append(open,select);return card;
    }));
    $('#finish-count').textContent=t(matching.length+' 款花色');$('#finishes-empty').hidden=matching.length>0;$('#swatch-grid').hidden=matching.length===0;
    updateSelectionButtons();
  }
  function updateSelectionButtons(){
    $$('[data-select-id]').forEach(button=>{const chosen=selectedIds.includes(button.dataset.selectId);button.classList.toggle('is-selected',chosen);button.setAttribute('aria-pressed',String(chosen));button.textContent=t(chosen?'✓ 已选 · 移除':'+ 加入选样');button.disabled=submitting;});updateDialogSelection();
  }
  function updateSelection(){
    const chosen=selectedSwatches();window.dispatchEvent(new CustomEvent('soya:selectionchange'));$$('[data-selection-count]').forEach(node=>node.textContent=t(String(chosen.length)));
    const dock=$('#selection-dock');if(dock)dock.hidden=!chosen.length;
    document.body.classList.toggle('has-selection-dock',!!dock&&chosen.length>0);
    setText('#inquiry-selection-summary',chosen.length?chosen.map(s=>s.name).join(' · '):'未选择花色，可直接咨询产品。');
    if($('#selection-items')){
      setText('#selection-total',chosen.length+' / 24');$('#selection-empty').hidden=chosen.length>0;$('#selection-clear').hidden=chosen.length===0;$('#selection-clear').disabled=submitting;
      $('#selection-items').replaceChildren(...chosen.map(s=>{const item=element('div','selection-item'),open=element('button','selection-preview');open.type='button';const img=element('img');img.src=assetPath(s.image);img.alt=t('');img.loading='lazy';open.append(img,element('span','',s.name));open.setAttribute('aria-label',t('查看已选花色 '+s.name));open.addEventListener('click',()=>openSwatch(s,open));const remove=element('button','selection-remove','×');remove.type='button';remove.disabled=submitting;remove.setAttribute('aria-label',t('移除 '+s.name));remove.addEventListener('click',()=>{const prior=chosen.indexOf(s);toggleSelection(s.id);const remaining=$$('.selection-remove');(remaining[Math.min(prior,remaining.length-1)]||$('.selection-shortcut'))?.focus();});item.append(open,remove);return item;}));
      setText('#selection-summary',chosen.length?'已选 '+chosen.length+' 款花色，将随商务询盘一并提交。':'可选最多 24 款，也可直接咨询产品。');
    }
    updateSelectionButtons();
  }
  $$('.filter-group button').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.filter;$$('.filter-group button').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});renderSwatches();}));
  $('#reset-filters')?.addEventListener('click',()=>{activeFilter='all';$$('.filter-group button').forEach(button=>{const active=button.dataset.filter==='all';button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});renderSwatches();$('.filter-group button').focus();announce('已显示全部花色。');});
  $('#selection-clear')?.addEventListener('click',()=>{if(submitting)return;selectedIds=[];saveSelection();updateSelection();$('.selection-shortcut').focus();announce('选样清单已清空。');});
  $('#dialog-select')?.addEventListener('click',()=>toggleSelection(dialogSwatchId));
  $('.dialog-close')?.addEventListener('click',()=>dialog.close());
  dialog?.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  dialog?.addEventListener('close',()=>{document.body.style.overflow='';if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});else if(returnSelectionIndex>=0){const previews=$$('.selection-preview');(previews[Math.min(returnSelectionIndex,previews.length-1)]||$('#selection'))?.focus({preventScroll:true});}else $('.selection-shortcut')?.focus({preventScroll:true});});
  function safeSocialUrl(value,key){
    try{const parsed=new URL(value||''),base=key+'.com';const validHost=key==='whatsapp'?['wa.me','api.whatsapp.com'].includes(parsed.hostname):(parsed.hostname===base||parsed.hostname.endsWith('.'+base));return parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&!parsed.port&&validHost?parsed.href:null;}catch{return null;}
  }
  function applySettings(settings){
    $$('.brand-cn').forEach(node=>node.textContent=String(settings.brandName));$$('[data-brand-name]').forEach(node=>node.textContent=t(settings.brandName));$('.header .brand')?.setAttribute('aria-label',t(settings.brandName+' 首页'));document.title=t(settings.brandName+' · '+(document.body.dataset.pageTitle||settings.heroTitle));setText('#hero-title',settings.heroTitle);setText('.hero-subtitle',settings.heroSubtitle);
    const email=$('#contact-email');if(email){email.replaceChildren();if(settings.email){const link=element('a','',settings.email);link.href='mailto:'+settings.email;email.append(link);email.setAttribute('aria-label',t('商务邮箱'));}else{email.textContent=t('—');email.setAttribute('aria-label',t('邮箱待补充'));}}
    const names={facebook:'Facebook',tiktok:'TikTok',whatsapp:'WhatsApp'};let anySocial=false;
    const socials=$('#contact-socials');if(socials){socials.replaceChildren(...Object.entries(names).map(([key,label])=>{const url=safeSocialUrl(settings.socials?.[key],key),node=element(url?'a':'span','',label);node.append(element('i','',url?'↗':'—'));if(url){anySocial=true;node.href=url;node.target='_blank';node.rel='noopener noreferrer';node.setAttribute('aria-label',t(label+'（新窗口）'));}return node;}));socials.setAttribute('aria-label',t(anySocial?'社媒账号':'社媒账号待补充'));}
  }
  async function fetchJSON(url,options={}){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{const response=await fetch(url,{...options,signal:controller.signal,headers:{Accept:'application/json',...(options.headers||{})}});const data=await response.json().catch(()=>null);if(!response.ok){const error=new Error(data?.error?.message||'服务暂时不可用，请稍后重试。');error.fields=data?.error?.fields;error.status=response.status;throw error;}if(!data)throw new Error('服务返回了无法识别的数据，请重试。');return data;}finally{clearTimeout(timer);}
  }
  async function loadCatalog(){
    const retry=$('#catalog-retry'),status=$('#catalog-status'),inquiryRetry=$('#inquiry-catalog-retry');if(retry)retry.disabled=true;if(inquiryRetry)inquiryRetry.disabled=true;if(status)status.hidden=false;setText('#catalog-message','正在同步最新产品与花色…');
    try{
      const data=await fetchJSON("/keep/catalog.json",{cache:'no-store'});if(!Array.isArray(data.products)||!Array.isArray(data.swatches)||!data.settings)throw new Error('产品资料格式异常，请重试。');
      products=data.products.filter(p=>p.visible!==false&&typeof p.id==='string'&&Array.isArray(p.details)&&allowedAsset(p.image)&&allowedAction(p.action)).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));swatches=data.swatches.filter(s=>s.visible!==false&&typeof s.id==='string'&&allowedAsset(s.image)&&categories[s.category]).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
      const before=selectedIds.length;selectedIds=selectedIds.filter(id=>swatches.some(s=>s.id===id));saveSelection();applySettings(data.settings);catalogReady=true;renderProducts();renderProductPreviews();renderSwatches();updateSelection();if(status)status.hidden=true;if(retry)retry.hidden=true;
      const refreshingSelection=inquiryRetry&&!inquiryRetry.hidden;if(inquiryRetry)inquiryRetry.hidden=true;
      const submit=$('#inquiry-submit');if(submit){submit.disabled=submitting;submit.replaceChildren(document.createTextNode(t('提交商务询盘 ')),element('span','','↗'));if(!submitting)setText('#inquiry-status',refreshingSelection?'选样资料已更新，请核对本次选样后重新提交。':'请填写产品或样板需求及联系邮箱。');}if(before>selectedIds.length)announce('部分花色当前未展示，已从选样清单移除，请核对后提交。');
      if(refreshingSelection&&submit)submit.focus({preventScroll:true});
    }catch(error){setText('#catalog-message','产品资料暂时无法加载，请重试。');if(retry)retry.hidden=false;if(inquiryRetry)inquiryRetry.hidden=false;if(!catalogReady&&$('#inquiry-submit')){$('#inquiry-submit').disabled=true;setText('#inquiry-submit','请先同步产品资料');setText('#inquiry-status','产品资料暂不可用，请重新加载后提交。');}}finally{if(retry)retry.disabled=false;if(inquiryRetry)inquiryRetry.disabled=false;}
  }
  $('#catalog-retry')?.addEventListener('click',loadCatalog);
  $('#inquiry-catalog-retry')?.addEventListener('click',loadCatalog);
  const menu=$('.menu-toggle'),mobileNav=$('#mobile-nav');
  function closeMenu(){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label',t('打开导航'));mobileNav.hidden=true;document.body.classList.remove('nav-open');}
  menu.addEventListener('click',()=>{const opening=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(opening));menu.setAttribute('aria-label',t(opening?'关闭导航':'打开导航'));mobileNav.hidden=!opening;document.body.classList.toggle('nav-open',opening);if(opening){mobileNav.scrollTop=0;mobileNav.querySelector('a').focus();}});
  $$('#mobile-nav a').forEach(link=>link.addEventListener('click',closeMenu));
  document.addEventListener('keydown',event=>{if(menu.getAttribute('aria-expanded')!=='true')return;if(event.key==='Escape'){closeMenu();menu.focus();}if(event.key==='Tab'){const links=[menu,...$$('#mobile-nav a')],first=links[0],last=links[links.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  document.addEventListener('click',event=>{if(menu.getAttribute('aria-expanded')==='true'&&!mobileNav.contains(event.target)&&!menu.contains(event.target))closeMenu();});
  matchMedia('(min-width: 801px)').addEventListener('change',event=>{if(event.matches)closeMenu();});$('#year').textContent=t(new Date().getFullYear());
  if($('#selection-dock')&&'IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{document.body.classList.toggle('selection-in-view',entries.some(entry=>entry.isIntersecting));},{rootMargin:'0px 0px -90px 0px'});observer.observe($('#selection'));}
  if('IntersectionObserver'in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.08});$$('.intro-grid,.section-head,.inspiration-grid,.downloads,.footer-heading').forEach(e=>{e.classList.add('reveal');observer.observe(e);});}
  window.addEventListener('soya:languagechange',()=>{const node=$('#success-time');if(node?.dataset.createdAt){const date=new Date(node.dataset.createdAt);if(!Number.isNaN(date.getTime()))node.textContent=date.toLocaleString(window.SoyaI18n.locale);}});
  window.SoyaGetSelectedFinishes=()=>selectedSwatches().map(({id,name,code})=>({id,name,code}));
  renderProducts();renderProductPreviews();renderSwatches();updateSelection();loadCatalog();
})();
