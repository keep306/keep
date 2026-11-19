(() => {
  'use strict';
  const storageKey = 'soya-language-v1';
  const english = Object.create(null);
  const sources = new Map();
  const bindings = new WeakMap();
  let language = 'en';
  try { const saved = localStorage.getItem(storageKey); if (saved === 'zh' || saved === 'en') language = saved; } catch { /* Language remains usable without storage. */ }
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.documentElement.dataset.language = language;
  const rows = `众诚合	Zhongchenghe
饰面板材与墙面系统	Decorative Panels & Wall Systems
SPC 石晶墙板 · 碳晶板 · 格栅与集成墙板	SPC Wall Panels · Carbon Crystal Boards · Grilles & Wall Panels
温润木纹	Wood Grain
自然石纹	Stone Texture
细腻布纹	Fabric Texture
纯粹色彩	Solid Colors
SPC 石晶墙板	SPC Wall Panels
碳晶板	Carbon Crystal Boards
格栅与集成墙板	Grilles & Integrated Wall Panels
艺术装饰吸音板	Decorative Acoustic Panels
格栅与墙板	Grilles & Wall Panels
户外PE板材	Outdoor PE Panels
户外 PE 板材	Outdoor PE Panels
轮播图	carousel
幻灯片	slide
软石饰面	Flexible Stone Veneer
SPC 石晶墙板在卫浴空间的应用展示	SPC wall panels in a bathroom application
碳晶板在现代会议空间的应用展示	Carbon crystal boards in a meeting room application
竹木纤维格栅板在客厅背景墙的应用展示	Bamboo wood-fiber grilles in a feature wall application
木色条状艺术装饰吸音板与橙色休闲椅	Wood-finish acoustic slats with a lounge chair
由 SPC 基材、彩膜和耐磨层组成。画册列有 2–6 mm 厚度及多种宽度，可查看木纹、石纹、布纹与纯色饰面。	Made with an SPC core, decorative film and wear layer. The catalogue lists 2–6 mm thicknesses and several widths, with wood, stone, fabric and solid-color finishes.
提供木纹、石纹、布纹、纯色及其他表面系列。木纹系列画册规格为 5 / 8 mm 厚、1220 mm 宽，具体选择请查阅对应页面。	Available in wood, stone, fabric, solid-color and other surface collections. The wood-grain series lists 5 / 8 mm thicknesses and a width of 1220 mm. See the relevant catalogue pages for details.
包含竹木纤维格栅板与集成墙板，可搭配用于室内墙面和背景墙。板型及安装方式见产品画册。	Bamboo wood-fiber grilles and integrated wall panels for interior walls and feature walls. See the catalogue for profiles and installation methods.
条状木色饰面的艺术装饰吸音板。外形、结构与规格见对应画册页面。	Decorative acoustic panels with wood-finish slats. See the relevant catalogue pages for profiles, construction and specifications.
画册所列厚度	Catalogue thicknesses
画册所列宽度	Catalogue widths
长度	Length
可定制 · 以选定规格为准	Custom lengths · subject to the selected specification
浏览 SPC 饰面花色	Browse SPC Finishes
饰面选择	Surface finishes
木纹 / 石纹 / 布纹 / 纯色	Wood / Stone / Fabric / Solid Color
木纹系列厚度	Wood-grain thicknesses
木纹系列宽度	Wood-grain width
1220 mm · 详见画册	1220 mm · see catalogue
查看碳晶板系列	Explore Carbon Crystal Boards
产品系列	Product series
竹木纤维格栅板	Bamboo Wood-Fiber Grilles
搭配系列	Coordinating series
竹木纤维集成墙板	Bamboo Wood-Fiber Integrated Wall Panels
更多资料	Further details
产品画册第 31–38 页	Product catalogue, pages 31–38
查看格栅与墙板系列	Explore Grilles & Wall Panels
设计语言	Design features
线条 / 木色 / 层次	Lines / Wood tones / Depth
产品画册第 39–47 页	Product catalogue, pages 39–47
查看艺术饰面系列	Explore Acoustic Panels
SPC 石晶墙板叠层与板材边缘细节	SPC panel samples showing layers and edges
木纹碳晶板扇形样板，展示饰面与基材	Fanned wood-finish carbon crystal board samples showing surfaces and core
多种木色格栅样块与凹凸截面	Grille samples showing finish options and profile sections
艺术装饰吸音板样块，展示木条与黑色底板结构	Acoustic panel sample showing wood slats and black backing
产品资料正在整理中，可前往产品中心查看完整画册。	Product details are being updated. Visit Products to view the full catalogue.
选样清单已更新；当前浏览器无法保存，关闭页面后可能丢失。	Your selection is updated, but this browser cannot save it after the page is closed.
从选样中移除	Remove from Selection
加入选样	Add to Selection
饰面纹理	finish texture
饰面花色	Surface finish
柔肤灰	Soft Grey
暖白	Warm White
桔子同款	Green
七天同款	Navy
蓝色	Blue
5.0布纹	Fabric 5.0
最多可选择 24 款花色，请先移除部分选样。	You can select up to 24 finishes. Remove a finish before adding another.
✓ 已选 · 移除	✓ Selected · Remove
+ 加入选样	+ Add to Selection
未选择花色，可直接提交咨询。	No finishes selected. You can still send an enquiry.
可选最多 24 款，也可直接咨询产品。	Select up to 24 finishes, or enquire without a selection.
已显示全部花色。	All finishes are now displayed.
选样清单已清空。	Your finish selection has been cleared.
商务邮箱	Business email
邮箱待补充	Email to be added
社媒账号	Social accounts
社媒账号待补充	Social accounts to be added
服务暂时不可用，请稍后重试。	The service is temporarily unavailable. Please try again later.
服务返回了无法识别的数据，请重试。	The service returned an unexpected response. Please try again.
正在同步最新产品与花色…	Loading the latest products and finishes…
产品资料格式异常，请重试。	Product data could not be read. Please try again.
提交商务询盘	Send Enquiry
提交商务询盘 ↗	Send Enquiry ↗
选样资料已更新，请核对本次选样后重新提交。	Your selection is updated. Please check it before submitting again.
请填写产品或样板需求及联系邮箱。	Tell us about your product or sample requirements and provide a contact email.
部分花色当前未展示，已从选样清单移除，请核对后提交。	Some finishes are no longer available and have been removed. Please check your selection.
产品资料暂时无法加载，请重试。	Product details could not be loaded. Please try again.
请先同步产品资料	Load Product Details First
产品资料暂不可用，请重新加载后提交。	Product details are unavailable. Reload them before submitting.
已恢复本次浏览中填写的内容，请核对后提交。	Your draft from this tab has been restored. Please check it before submitting.
姓名需为 2–80 字。	Enter a name with 2–80 characters.
请输入有效的联系邮箱。	Enter a valid contact email.
公司 / 机构最多 120 字。	Company or organization must be no longer than 120 characters.
国家 / 地区最多 80 字。	Country or region must be no longer than 80 characters.
请选择项目类型。	Choose a project type.
请填写 10–3000 字的项目说明。	Describe your requirements in 10–3000 characters.
请先同意将填写信息用于本次业务咨询。	Please agree to the use of your information for this enquiry.
正在同步资料… ↗	Loading Product Details… ↗
正在连接产品资料，请稍候。	Connecting to product details. Please wait.
正在提交…	Submitting…
请重新加载产品资料后提交。	Reload product details before submitting.
请完善标记的必填信息。	Please complete the marked required fields.
当前浏览器无法安全生成咨询编号，请在 HTTPS 页面或较新的浏览器中重试。	This browser cannot create a secure enquiry reference. Please use HTTPS or a newer browser.
正在发送，请稍候…	Sending your enquiry…
未收到有效的咨询确认。请保留当前内容并重试。	No valid confirmation was received. Keep your details and try again.
本次为产品咨询，未附选样。	This is a product enquiry without selected finishes.
连接超时，尚未确认提交结果。内容已保留；点击提交可安全重试。	The connection timed out before confirmation. Your details are saved; you can safely retry.
提交较频繁，请约 10 分钟后重试。表单与选样已保留。	Too many submissions. Try again in about 10 minutes. Your form and selection are saved.
暂时无法连接服务器，请检查网络后重试。表单与选样已保留。	Cannot connect to the server. Check your connection and try again. Your form and selection are saved.
提交未完成，请检查网络后重试。	Your enquiry was not completed. Check your connection and try again.
填写内容在本标签页暂存，提交成功后清除。	Your draft is saved in this tab and cleared after a successful submission.
可继续填写新的咨询，当前选样清单已保留。	You can send another enquiry. Your finish selection is still saved.
打开导航	Open navigation
关闭导航	Close navigation
产品系列画册	Product Catalogue
索亚恒泰花色画册	Finish Catalogue
SPC 饰面花色画册	SPC Finish Catalogue
碳晶大板燃烧性能检测报告	Carbon Crystal Board — Fire Performance Test Report
碳晶大板甲醛释放量检测报告	Carbon Crystal Board — Formaldehyde Emission Test Report
资料阅览 / DOCUMENTS	DOCUMENT VIEWER
产品资料	Product Documents
下载原 PDF ↓	Download Original PDF ↓
关闭资料阅读器	Close document viewer
资料翻页	Document navigation
上一页	Previous page
下一页	Next page
第	Page
跳转至页码	Page number
/ — 页	/ — pages
前往	Go
跳转到输入的页码	Go to page number
适应屏幕	Fit Page
适应宽度	Fit Width
适应页面宽度，纵向滚动阅读	Fit width for vertical reading
缩小	Zoom out
放大	Zoom in
当前缩放比例	Current zoom level
资料页面，可使用方向键翻页	Document page; use arrow keys to turn pages
正在加载资料…	Loading document…
重新加载	Reload
重新加载当前资料	Reload this document
资料内容请以原始文件为准	Please refer to the original document for authoritative details.
← → 翻页 · Esc 关闭	← → Turn pages · Esc Close
资料暂时无法加载，请检查网络后重试。	Document unavailable. Check your connection and try again.
画册中的碳晶板扇形样板，展示木纹饰面与板材边缘	Carbon crystal board samples from the catalogue showing finishes and edges
画册中的 SPC 石晶墙板叠层与板材边缘	SPC wall panel layers and edges from the catalogue
画册中的多款木色格栅样板与凹凸截面	Grille samples and profiles from the catalogue
画册中的户外 PE 板材样品与截面	Outdoor PE panel samples and profiles from the catalogue
画册中的软石饰面样品	Flexible stone veneer samples from the catalogue
产品画册样图 · 颜色与质感以实物为准	Catalogue image · Color and texture are subject to the physical sample
产品展示图 · 基于画册样图制作	Product illustration · Created from catalogue sample images
请检查填写的信息。	Please check the information you entered.
请求内容必须是 JSON 对象。	The request format is invalid.
请输入有效邮箱地址。	Enter a valid email address.
请选择有效选项。	Choose a valid option.
请求来源无效，请从本站重新提交。	Please submit your enquiry from this website.
提交内容过大。	Your submission is too large.
提交内容不能为空。	Your submission cannot be empty.
JSON 格式无效。	The submission format is invalid.
请同意为处理询盘使用以上信息。	Please agree to the use of your information to process this enquiry.
提交内容无效。	Your submission is invalid.
提交标识无效，请刷新后重试。	The submission reference is invalid. Please refresh and try again.
最多选择 24 个不重复的花色。	Select no more than 24 different finishes.
该提交标识已用于不同内容，请重新提交。	This reference was used for different content. Please submit again.
所选花色已不可用，请重新选择。	A selected finish is no longer available. Please update your selection.
提交过于频繁，请十分钟后再试。	Too many submissions. Please try again in ten minutes.`;
  rows.split('\n').forEach(row => { const i=row.indexOf('\t'); if(i>0)english[row.slice(0,i)]=row.slice(i+1); });

  function translate(source, depth = 0) {
    if (english[source] !== undefined) return english[source];
    if (depth > 5) return source;
    const sub = value => translate(value, depth + 1);
    const rules = [
      [/^质感木纹(\d+)$/, (_, n) => `Wood Grain ${n}`],
      [/^质感布纹(\d+)$/, (_, n) => `Fabric Texture ${n}`],
      [/^石纹(\d+)$/, (_, n) => `Stone Texture ${n}`],
      [/^查看(.+)花色详情$/, (_, n) => `View ${sub(n)} finish details`],
      [/^查看已选花色 (.+)$/, (_, n) => `View selected finish: ${sub(n)}`],
      [/^移除 (.+)$/, (_, n) => `Remove ${sub(n)}`],
      [/^(.+)饰面纹理$/, (_, n) => `${sub(n)} finish texture`],
      [/^花色编号 (.+)$/, (_, n) => `Finish code ${n}`],
      [/^画册原名 · (.+)$/, (_, n) => `Catalogue name · ${sub(n)}`],
      [/^PDF 第 (\d+) 页$/, (_, n) => `PDF page ${n}`],
      [/^(\d+) 款花色$/, (_, n) => `${n} finishes`],
      [/^已选 (\d+) 款花色，将随商务询盘一并提交。$/, (_, n) => `${n} selected ${n === '1' ? 'finish' : 'finishes'} will be included with your enquiry.`],
      [/^本次已提交 (\d+) 款选样：(.+)$/, (_, n, names) => `${n} selected finishes submitted: ${sub(names)}`],
      [/^(.+)已移出选样清单。$/, (_, n) => `${sub(n)} removed from your selection.`],
      [/^(.+)已加入选样清单。$/, (_, n) => `${sub(n)} added to your selection.`],
      [/^(.+) 首页$/, (_, n) => `${sub(n)} Home`],
      [/^查看(.+)产品系列$/, (_, n) => `View ${sub(n)}`],
      [/^基于画册样图制作的(.+)产品展示图$/, (_, n) => `${sub(n.trim())} product illustration based on catalogue samples`],
      [/^\/ (\d+) 页$/, (_, n) => `/ ${n} pages`],
      [/^正在加载第 (\d+) 页…$/, (_, n) => `Loading page ${n}…`],
      [/^(.+) · 第 (\d+) \/ (\d+) 页$/, (_, title, p, total) => `${sub(title)} · Page ${p} / ${total}`],
      [/^(.+)，第 (\d+) 页$/, (_, title, p) => `${sub(title)} — page ${p}`],
      [/^第 (\d+) 页加载超时，请重试。$/, (_, n) => `Page ${n} timed out. Please try again.`],
      [/^第 (\d+) 页暂时无法加载，请重试。$/, (_, n) => `Page ${n} could not be loaded. Please try again.`],
      [/^请输入 (\d+) 至 (\d+) 个字符。$/, (_, min, max) => `Enter between ${min} and ${max} characters.`],
      [/^(.+) 您填写的内容已保留。$/, (_, n) => `${sub(n)} Your form details are saved.`],
      [/^(.+) 请更新选样资料后重试，表单内容已保留。$/, (_, n) => `${sub(n)} Update your selection and try again. Your form details are saved.`],
      [/^(.+)（新窗口）$/, (_, n) => `${n} (new window)`],
    ];
    for (const [pattern, replace] of rules) { if(pattern.test(source)) return source.replace(pattern, replace); }
    if (source.includes(' · ')) return source.split(' · ').map(sub).join(' · ');
    if (source.includes('、')) return source.split('、').map(sub).join(', ');
    if (source.includes(' / ')) return source.split(' / ').map(sub).join(' / ');
    return source;
  }
  function t(value, variables = {}) {
    if (value === null || value === undefined) return '';
    const current = String(value);
    const original = sources.get(current) || current;
    const whitespace = original.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const key = whitespace[2];
    let result = language === 'en' ? whitespace[1] + translate(key) + whitespace[3] : original;
    result = result.replace(/\{(\w+)\}/g, (match, name) => variables[name] === undefined ? match : String(variables[name]));
    const interpolated = original.replace(/\{(\w+)\}/g, (match, name) => variables[name] === undefined ? match : String(variables[name]));
    if (result !== interpolated) sources.set(result, interpolated);
    return result;
  }
  function bound(node, property, value, write) {
    let map=bindings.get(node); if(!map){map=new Map();bindings.set(node,map);}
    const prior=map.get(property), source=prior?.last===value?prior.source:(sources.get(value)||value);
    const next=t(source); if(next!==value)write(next);map.set(property,{source,last:next});
  }
  function refresh(root = document) {
    const elements = root === document ? Array.from(document.querySelectorAll('*')) : [root,...root.querySelectorAll('*')];
    for(const node of elements){
      if(node.matches('script,style,[contenteditable=true]')||node.closest('[translate="no"]'))continue;
      const key=node.getAttribute('data-i18n');
      if(key!==null){
        const value=t(key),mode=node.dataset.i18nMode;
        if(mode==='prefix'){
          const text=Array.from(node.childNodes).find(n=>n.nodeType===Node.TEXT_NODE&&n.nodeValue.trim());
          if(text)text.nodeValue=value;else node.prepend(document.createTextNode(value));
        }else if(mode==='lines'){
          const parts=value.split('\n'),children=[];parts.forEach((part,i)=>{if(i)children.push(document.createElement('br'));children.push(document.createTextNode(part));});node.replaceChildren(...children);
        }else if(node.textContent!==value)node.textContent=value;
      }
      for(const attr of ['placeholder','aria-label','aria-roledescription','title','alt','content']){
        if(attr==='content'&&node.tagName!=='META')continue;
        const explicit=node.getAttribute('data-i18n-'+attr);
        if(explicit!==null)node.setAttribute(attr,t(explicit));
        else if(node.hasAttribute(attr))bound(node,attr,node.getAttribute(attr),v=>node.setAttribute(attr,v));
      }
    }
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){return node.parentElement?.closest('script,style,textarea,[contenteditable=true],[data-i18n],[translate="no"]')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;}});
    const texts=[];while(walker.nextNode())texts.push(walker.currentNode);
    texts.forEach(node=>{if(node.nodeValue.trim())bound(node,'text',node.nodeValue,value=>{node.nodeValue=value;});});
    updateSwitches();
  }
  function updateSwitches(){
    document.documentElement.lang=language==='zh'?'zh-CN':'en';document.documentElement.dataset.language=language;
    document.querySelectorAll('[data-language]').forEach(button=>{if(button===document.documentElement)return;const active=button.dataset.language===language;button.setAttribute('aria-pressed',String(active));button.classList.toggle('is-active',active);});
  }
  function setLanguage(next){
    if(!['en','zh'].includes(next)||next===language)return;
    language=next;try{localStorage.setItem(storageKey,next);}catch{/* Optional preference storage. */}
    refresh();window.dispatchEvent(new CustomEvent('soya:languagechange',{detail:{language}}));
  }
  function addTranslations(values){Object.assign(english,values);if(document.readyState!=='loading')refresh();}
  window.SoyaI18n={t,addTranslations,refresh,setLanguage,get language(){return language;},get locale(){return language==='zh'?'zh-CN':'en-US';}};
  document.addEventListener('click',event=>{const button=event.target.closest('[data-language]');if(button&&button!==document.documentElement)setLanguage(button.dataset.language);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh(),{once:true});else refresh();
})();
