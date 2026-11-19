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
  const samples = {
    spc: {studio:'assets/studio-spc-v2.webp', image:'assets/material-spc-stack.jpg', alt:'SPC 石晶墙板叠层与板材边缘细节', detail:'板材截面与芯材', tab:'SPC 墙板'},
    carbon: {studio:'assets/studio-carbon-v2.webp', image:'assets/material-carbon-samples.jpg', alt:'木纹碳晶板扇形样板，展示饰面与基材', detail:'木纹饰面样板', tab:'碳晶板材'},
    grille: {studio:'assets/studio-grille-v2.webp', image:'assets/material-grille-samples.jpg', alt:'多种木色格栅样块与凹凸截面', detail:'格栅截面', tab:'格栅与墙板系列'},
    art: {image:'assets/material-acoustic-sample.jpg', alt:'艺术装饰吸音板样块，展示木条与黑色底板结构', detail:'木色条状饰面', tab:'吸音板'}
  };
  const STORAGE_KEY = 'soya-selected-finishes-v1';
  let products=Object.entries(fallbackProducts).map(([id,item])=>({id,...item}));
  let swatches=(window.SWATCHES||[]).map(item=>({...item,id:item.id||item.image.split('/').pop().replace(/\.[^.]+$/,'')}));
  const queryValue = key => new URL(location.href).searchParams.get(key);
  const textureFromUrl = () => {
    const value = queryValue('texture');
    return Object.hasOwn(categories, value) ? value : 'all';
  };
  let activeProduct = queryValue('series') || products[0]?.id;
  let activeFilter = textureFromUrl();
  let productView = 'sample';

  function rememberChoice(key, value, method = 'pushState') {
    const next = new URL(location.href);
    if (value) next.searchParams.set(key, value);
    else next.searchParams.delete(key);
    if (next.href !== location.href) history[method](history.state, '', next);
  }
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
  function renderProductImage(product) {
    const sample = samples[product.id];
    const showingSample = sample && productView === 'sample';
    const image = $('#product-image');
    image.src = assetPath(showingSample ? sample.image : product.image);
    image.alt = t(showingSample ? sample.alt : product.alt);
    const mode = showingSample ? 'sample' : 'application';
    $('.product-figure').dataset.view = mode;
    $('.view-switch').hidden = !sample;
    $$('[data-product-view]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.productView === mode));
    });
  }
  function setProduct(id) {
    const panel = $('#product-panel');
    const product = products.find(item => item.id === id);
    if (!panel || !product) return;
    activeProduct = id;
    $$('.product-tabs button').forEach(button => {
      const active = button.dataset.product === id;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', 'tab-' + id);
    renderProductImage(product);
    setText('#product-title', product.title);
    setText('#product-description', product.description);
    $('#product-details').replaceChildren(...product.details.map(([label,value]) => {
      const row = element('div');
      row.append(element('dt','',label),element('dd','',value));
      return row;
    }));
    const enquiry = new URL("/keep/#inquiry", location.origin);
    enquiry.searchParams.set('product', id);
    $('#product-enquire').href = enquiry.href;
    const link = $('#product-action');
    delete link.dataset.document;
    delete link.dataset.documentPage;
    link.dataset.i18n = product.actionLabel;
    link.textContent = t(product.actionLabel);
    if (product.action.startsWith('#')) {
      link.href = ({'#finishes':"/keep/finishes/",'#contact':"/keep/#inquiry",'#collections':"/keep/products/",'#spaces':"/keep/spaces/",'#quality':"/keep/quality/"})[product.action] || "/keep/products/";
    } else {
      link.href = allowedAction(product.action) ? assetPath(product.action) : "/keep/documents/product-catalog.pdf";
      const documents = {'fire-report':'fire','formaldehyde-report':'formaldehyde','product-catalog':'product','finish-catalog':'finish'};
      const match = Object.entries(documents).find(([name]) => product.action.includes(name + '.pdf'));
      if (match) link.dataset.document = match[1];
      const page = product.action.match(/#page=(\d+)/);
      if (page) link.dataset.documentPage = page[1];
    }
  }
  function renderProducts() {
    const tablist = $('.product-tabs');
    if (!tablist) return;
    const focusedProduct = tablist.contains(document.activeElement) ? document.activeElement.dataset.product : null;
    tablist.replaceChildren(...products.map(product => {
      const short = fallbackProducts[product.id]?.title === product.title && samples[product.id]?.tab;
      const button = element('button','',short || product.title);
      button.type = 'button';
      button.id = 'tab-' + product.id;
      button.dataset.product = product.id;
      button.setAttribute('role','tab');
      button.setAttribute('aria-controls','product-panel');
      return button;
    }));
    tablist.hidden = !products.length;
    $('#product-panel').hidden = !products.length;
    $('#products-empty').hidden = !!products.length;
    setProduct(products.some(p => p.id === activeProduct) ? activeProduct : products[0]?.id);
    if (focusedProduct) document.getElementById('tab-' + focusedProduct)?.focus({preventScroll:true});
  }
  function renderProductPreviews() {
    const grid = $('#product-preview-grid');
    if (!grid) return;
    grid.replaceChildren(...products.map(product => {
      const sample = samples[product.id];
      const card = element('a', 'product-preview-card');
      card.href = "/keep/products/?series=" + encodeURIComponent(product.id);
      const frame = element('div','product-preview-image');
      const img = element('img');
      img.src = assetPath(sample?.studio || sample?.image || product.image);
      if (sample?.studio) img.className = 'studio-preview';
      img.alt = t(sample?.studio ? '基于画册样图制作的'+product.title+'产品展示图' : sample?.alt || product.alt);
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 640;
      img.height = 640;
      frame.append(img);
      card.append(frame, element('h3','',product.title));
      if (sample) card.append(element('p','',sample.detail));
      return card;
    }));
    if (!products.length) grid.append(element('p','empty-state','产品资料正在整理中，可前往产品中心查看完整画册。'));
  }
  $('.product-tabs')?.addEventListener('click', event => {
    const button = event.target.closest('[data-product]');
    if (button) {
      setProduct(button.dataset.product);
      rememberChoice('series', activeProduct);
    }
  });
  $('.product-tabs')?.addEventListener('keydown', event => {
    const tabs = $$('.product-tabs button');
    const index = tabs.indexOf(event.target);
    if (index < 0) return;
    const keys = {ArrowRight:(index+1)%tabs.length, ArrowLeft:(index+tabs.length-1)%tabs.length, Home:0, End:tabs.length-1};
    if (!Object.hasOwn(keys,event.key)) return;
    event.preventDefault();
    const tab = tabs[keys[event.key]];
    tab.focus();
    setProduct(tab.dataset.product);
    rememberChoice('series', activeProduct, 'replaceState');
  });
  $('.view-switch')?.addEventListener('click', event => {
    const button = event.target.closest('[data-product-view]');
    const product = products.find(item => item.id === activeProduct);
    if (!button || !product) return;
    productView = button.dataset.productView;
    renderProductImage(product);
  });
  function updateDialogSelection(){
    const s=swatches.find(item=>item.id===dialogSwatchId),b=$('#dialog-select'),chosen=selectedIds.includes(dialogSwatchId);if(!b)return;
    b.disabled=!s||submitting;b.setAttribute('aria-pressed',String(chosen));b.textContent=t(chosen?'移除所选花色':'收藏此花色');
  }
  function openSwatch(swatch,trigger){
    if(!dialog)return;
    returnFocus=trigger;returnSelectionIndex=$$('.selection-preview').indexOf(trigger);dialogSwatchId=swatch.id;$('#dialog-image').src=assetPath(swatch.image);$('#dialog-image').alt=t(swatch.name+'饰面纹理');$('#dialog-title').textContent=t(swatch.name);
    $('#dialog-category').textContent=t(categories[swatch.category]||'饰面花色');$('#dialog-code').textContent=t(swatch.code?'花色编号 '+swatch.code:'画册原名 · '+swatch.name);
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
    $('#swatch-grid').replaceChildren(...matching.map(swatch => {
      const card = element('article','swatch-card');
      const open = element('button','swatch-open');
      open.type = 'button';
      open.setAttribute('aria-label', t('查看'+swatch.name+'花色详情'));
      const figure = element('div','swatch-image');
      const img = element('img');
      img.src = assetPath(swatch.image);
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 600;
      img.height = 750;
      figure.append(img);
      const info = element('div','swatch-info');
      info.append(element('h3','',swatch.name), element('span','',categories[swatch.category]));
      open.append(figure,info);
      open.addEventListener('click', () => openSwatch(swatch,open));
      const select = element('button','swatch-select');
      select.type = 'button';
      select.dataset.selectId = swatch.id;
      select.addEventListener('click', () => toggleSelection(swatch.id));
      card.append(open,select);
      return card;
    }));
    $('#finish-count').textContent=t(matching.length+' 款花色');$('#finishes-empty').hidden=matching.length>0;$('#swatch-grid').hidden=matching.length===0;
    updateSelectionButtons();
  }
  function updateSelectionButtons(){
    $$('[data-select-id]').forEach(button => {
      const id = button.dataset.selectId;
      const chosen = selectedIds.includes(id);
      const name = swatches.find(item => item.id === id)?.name || '';
      button.setAttribute('aria-pressed', String(chosen));
      button.textContent = chosen ? '✓' : '+';
      button.title = t(chosen ? '移除所选花色' : '收藏此花色');
      button.setAttribute('aria-label', t(chosen ? '移除所选花色' : '收藏此花色') + ' · ' + t(name));
      button.disabled = submitting;
    });
    updateDialogSelection();
  }

  function setFilter(value) {
    activeFilter = value;
    $$('.filter-group button').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === value));
    });
    renderSwatches();
  }
  function syncLocation() {
    if ($('#product-panel')) setProduct(products.find(item => item.id === queryValue('series'))?.id || products[0]?.id);
    if ($('#swatch-grid')) setFilter(textureFromUrl());
    updateSelection();
  }
  window.addEventListener('popstate', syncLocation);
  window.addEventListener('pageshow', event => { if (event.persisted) refreshSavedSelection(); });
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY || event.key === null) refreshSavedSelection();
  });
  function refreshSavedSelection() {
    try {
      const next = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(next)) selectedIds = [...new Set(next.filter(id => typeof id === 'string'))].slice(0,24);
    } catch { /* Keep the current selection if storage is unavailable. */ }
    syncLocation();
  }
  window.SoyaGetSelectedFinishes = () => selectedSwatches().map(({id,name,code}) => ({id,name,code}));
  window.SoyaGetInquiryProduct = () => products.find(item => item.id === queryValue('product'))?.title || '';
  function updateSelection(){
    const chosen=selectedSwatches();window.dispatchEvent(new CustomEvent('soya:selectionchange'));$$('[data-selection-count]').forEach(node=>node.textContent=t(String(chosen.length)));
    const dock=$('#selection-dock');if(dock)dock.hidden=!chosen.length;
    document.body.classList.toggle('has-selection-dock',!!dock&&chosen.length>0);
    setText('#inquiry-selection-summary',chosen.length?chosen.map(s=>s.name).join(' · '):'未选择花色，可直接咨询产品。');
    if($('#selection-items')){
      setText('#selection-total',chosen.length+' / 24');$('#selection-empty').hidden=chosen.length>0;$('#selection-clear').hidden=chosen.length===0;$('#selection-clear').disabled=submitting;
      $('#selection-items').replaceChildren(...chosen.map(s=>{const item=element('div','selection-item'),open=element('button','selection-preview');open.type='button';const img=element('img');img.src=assetPath(s.image);img.alt=t('');img.loading='lazy';open.append(img,element('span','',s.name));open.setAttribute('aria-label',t('查看已选花色 '+s.name));open.addEventListener('click',()=>openSwatch(s,open));const remove=element('button','selection-remove','×');remove.type='button';remove.disabled=submitting;remove.setAttribute('aria-label',t('移除 '+s.name));remove.addEventListener('click',()=>{const prior=chosen.indexOf(s);toggleSelection(s.id);const remaining=$$('.selection-remove');(remaining[Math.min(prior,remaining.length-1)]||$('.selection-shortcut'))?.focus();});item.append(open,remove);return item;}));
      setText('#selection-summary',chosen.length?'您的选样保存在此设备。':'可选最多 24 款，也可直接咨询产品。');
    }
    updateSelectionButtons();
  }
  $('.filter-group')?.addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    setFilter(button.dataset.filter);
    rememberChoice('texture', activeFilter === 'all' ? null : activeFilter);
  });
  $('#reset-filters')?.addEventListener('click', () => {
    setFilter('all');
    rememberChoice('texture', null);
    $('.filter-group button').focus();
    announce('已显示全部花色。');
  });
  $('#selection-clear')?.addEventListener('click',()=>{if(submitting)return;selectedIds=[];saveSelection();updateSelection();$('.selection-shortcut').focus();announce('选样清单已清空。');});
  $('#dialog-select')?.addEventListener('click',()=>toggleSelection(dialogSwatchId));
  $('.dialog-close')?.addEventListener('click',()=>dialog.close());
  dialog?.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  dialog?.addEventListener('close',()=>{document.body.style.overflow='';if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});else if(returnSelectionIndex>=0){const previews=$$('.selection-preview');(previews[Math.min(returnSelectionIndex,previews.length-1)]||$('#selection'))?.focus({preventScroll:true});}else $('.selection-shortcut')?.focus({preventScroll:true});});
  function safeSocialUrl(value,key){
    try{const parsed=new URL(value||''),base=key+'.com';const validHost=key==='whatsapp'?['wa.me','api.whatsapp.com'].includes(parsed.hostname):(parsed.hostname===base||parsed.hostname.endsWith('.'+base));return parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&!parsed.port&&validHost?parsed.href:null;}catch{return null;}
  }
  function applySettings(settings){
    $$('.brand-cn').forEach(node=>node.textContent=String(settings.brandName));$$('[data-brand-name]').forEach(node=>node.textContent=t(settings.brandName));$('.header .brand')?.setAttribute('aria-label',t(settings.brandName+' 首页'));document.title=t(settings.brandName+' · '+(document.body.dataset.pageTitle||settings.heroTitle));setText('[data-site-hero-title]',settings.heroTitle);
    const email=$('#contact-email');if(email){email.replaceChildren();if(settings.email){const link=element('a','',settings.email);link.href='mailto:'+settings.email;email.append(link);email.setAttribute('aria-label',t('商务邮箱'));}else{email.textContent=t('—');email.setAttribute('aria-label',t('邮箱待补充'));}}
    const names={facebook:'Facebook',tiktok:'TikTok',whatsapp:'WhatsApp'};let anySocial=false;
    const socials=$('#contact-socials');if(socials){socials.replaceChildren(...Object.entries(names).map(([key,label])=>{const url=safeSocialUrl(settings.socials?.[key],key),node=element(url?'a':'span','',label);if(url){anySocial=true;node.href=url;node.target='_blank';node.rel='noopener noreferrer';node.setAttribute('aria-label',t(label+'（新窗口）'));}return node;}));socials.setAttribute('aria-label',t(anySocial?'社媒账号':'社媒账号待补充'));}
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
  function closeMenu(){menu.setAttribute('aria-expanded','false');menu.dataset.i18nAriaLabel='打开导航';menu.setAttribute('aria-label',t('打开导航'));mobileNav.hidden=true;document.body.classList.remove('nav-open');}
  menu.addEventListener('click',()=>{const opening=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(opening));menu.dataset.i18nAriaLabel=opening?'关闭导航':'打开导航';menu.setAttribute('aria-label',t(menu.dataset.i18nAriaLabel));mobileNav.hidden=!opening;document.body.classList.toggle('nav-open',opening);if(opening){mobileNav.scrollTop=0;mobileNav.querySelector('a').focus();}});
  $$('#mobile-nav a').forEach(link=>link.addEventListener('click',closeMenu));
  document.addEventListener('keydown',event=>{if(menu.getAttribute('aria-expanded')!=='true')return;if(event.key==='Escape'){closeMenu();menu.focus();}if(event.key==='Tab'){const links=[menu,...$$('#mobile-nav a')],first=links[0],last=links[links.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  document.addEventListener('click',event=>{if(menu.getAttribute('aria-expanded')==='true'&&!mobileNav.contains(event.target)&&!menu.contains(event.target))closeMenu();});
  matchMedia('(min-width: 801px)').addEventListener('change',event=>{if(event.matches)closeMenu();});$('#year').textContent=t(new Date().getFullYear());
  if($('#selection-dock')&&'IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{document.body.classList.toggle('selection-in-view',entries.some(entry=>entry.isIntersecting));},{rootMargin:'0px 0px -90px 0px'});observer.observe($('#selection'));}
  window.addEventListener('soya:languagechange',()=>{setProduct(activeProduct);updateSelection();const node=$('#success-time');if(node?.dataset.createdAt){const date=new Date(node.dataset.createdAt);if(!Number.isNaN(date.getTime()))node.textContent=date.toLocaleString(window.SoyaI18n.locale);}});
  renderProducts();renderProductPreviews();setFilter(activeFilter);updateSelection();loadCatalog();
})();
