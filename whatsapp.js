(() => {
  'use strict';
  const translations = {
    '选择感兴趣的花色，或简单描述所需产品与数量，通过 WhatsApp 与我们确认。': 'Choose finishes or describe the products and quantities you need, then contact us on WhatsApp.',
    '咨询内容将带入 WhatsApp，由您确认后发送。': 'Your enquiry opens in WhatsApp for you to review and send.',
    '产品或样品需求（选填）': 'Product or sample requirements (optional)',
    '例如：产品系列、花色、预计数量和收货国家。': 'For example: product collection, finishes, estimated quantity and destination country.',
    '通过 WhatsApp 咨询': 'Enquire on WhatsApp',
    'WhatsApp 商务咨询': 'WHATSAPP ENQUIRIES',
    '说明您的需求': 'Tell us what you need',
    '选样与说明将带入 WhatsApp，发送前可继续编辑。': 'Your selected finishes and notes open in WhatsApp, where you can edit them before sending.',
    '未选择花色，可直接咨询产品。': 'No finishes selected. You can still enquire about our products.',
    '开启 JavaScript 后可浏览动态花色和站内资料，或直接通过 WhatsApp 联系。': 'Enable JavaScript for interactive finishes and document reading, or contact us directly on WhatsApp.',
    '项目说明（选填）': 'Project details (optional)',
    '例如：需要 300 平方米木纹墙板，寄往迪拜。希望先看样板。': 'For example, I need 300 m² of wood-finish panels for delivery to Dubai. Could you send samples?',
    '打开 WhatsApp': 'Open WhatsApp',
    '选样和说明会带入对话，您可以在 WhatsApp 中确认后发送。': 'Your selection and notes will open in WhatsApp for you to review and send.',
  };
  window.SoyaI18n?.addTranslations(translations);
  const init = () => {
    const panel=document.querySelector('[data-whatsapp-composer]');
    if(!panel)return;
    const note=document.getElementById('whatsapp-note'),send=document.getElementById('whatsapp-send'),count=document.getElementById('whatsapp-note-count');
    const productRow = document.getElementById('whatsapp-product-row');
    const productName = document.getElementById('whatsapp-product');
    const removeProduct = document.getElementById('whatsapp-remove-product');
    const key='zhongchenghe-whatsapp-draft-v1';
    try{const saved=sessionStorage.getItem(key);if(saved)note.value=saved.slice(0,1500);}catch{/* Draft storage is optional. */}
    function update(){
      const zh=window.SoyaI18n?.language==='zh';
      const t=value=>window.SoyaI18n?.t(value)||value;
      const chosen=window.SoyaGetSelectedFinishes?.()||[];
      const lines=[zh?'您好，众诚合。我想咨询板材产品与样品。':'Hello Zhongchenghe, I would like to enquire about your panels and samples.'];
      const product = window.SoyaGetInquiryProduct?.();
      if (productRow) productRow.hidden = !product;
      if (productName) productName.textContent = product ? t(product) : '';
      if (product) lines.push('', (zh ? '所选板材：' : 'Selected panel: ') + t(product));
      if(chosen.length){lines.push('',zh?'所选花色：':'Selected finishes:');for(const item of chosen){const name=t(item.name);const reference=item.code||item.id;lines.push('- '+name+(reference&&reference!==name?' ['+reference+']':''));}}
      const text=note.value.trim();
      if(text)lines.push('',zh?'产品或样品需求：':'Product or sample requirements:',text);
      const url=new URL(panel.dataset.whatsappUrl);url.searchParams.set('text',lines.join('\n'));send.href=url.href;
      if(count)count.textContent=note.value.length+' / 1500';
    }
    note.addEventListener('input',()=>{try{if(note.value)sessionStorage.setItem(key,note.value);else sessionStorage.removeItem(key);}catch{/* Optional storage. */}update();});
    send.addEventListener('click',update);
    removeProduct?.addEventListener('click', () => {
      const url = new URL(location.href);
      url.searchParams.delete('product');
      history.replaceState(history.state, '', url);
      update();
      note.focus();
    });
    window.addEventListener('soya:languagechange',update);
    window.addEventListener('soya:selectionchange',update);
    update();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
