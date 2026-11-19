(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const statusLabels = { new: '待处理', read: '已查看', replied: '已回复', archived: '已归档' };
  const categoryLabels = { wood: '木纹', stone: '石纹', fabric: '布纹', solid: '纯色' };
  const projectLabels = { residential: '住宅空间', commercial: '商业空间', hospitality: '酒店 / 民宿', other: '其他项目' };
  const productImages = [
    ['assets/scene-spc.jpg', 'SPC 石晶墙板 · 卫浴空间'],
    ['assets/carbon-interior.jpg', '碳晶板 · 会议空间'],
    ['assets/grille-living.jpg', '格栅与集成墙板 · 客厅'],
    ['assets/acoustic-chair.jpg', '艺术装饰吸音板 · 休闲空间'],
  ];
  const swatchImages = [
    ['wood-01', '质感木纹1'], ['stone-sm-s1', 'SM-S1'], ['fabric-50', '5.0布纹'], ['solid-soft-grey', '柔肤灰'],
    ['wood-14', '质感木纹14'], ['stone-sm-s2', 'SM-S2'], ['fabric-10', '质感布纹10'], ['solid-warm-white', '暖白'],
    ['wood-16', '质感木纹16'], ['stone-sm-s4', 'SM-S4'], ['fabric-11', '质感布纹11'], ['solid-green', '桔子同款'],
    ['wood-07', '质感木纹7'], ['stone-11', '石纹11'], ['fabric-zy-bw2', 'ZY-BW2'], ['solid-blue', '蓝色'],
    ['wood-08', '质感木纹8'], ['stone-12', '石纹12'], ['fabric-zy-bw3', 'ZY-BW3'], ['solid-navy', '七天同款'],
    ['stone-23', '石纹23'], ['stone-25', '石纹25'], ['stone-zy-sw3', 'ZY-SW3'], ['fabric-zy-bw1', 'ZY-BW1'],
  ].map(([id, label]) => [`assets/${id}.jpg`, label]);
  const allowedImages = new Set([...productImages, ...swatchImages].map(([path]) => path));
  const productActions = [
    ['#finishes', '浏览 SPC 饰面花色'],
    ['documents/product-catalog.pdf#page=12', '产品画册 · 碳晶板系列'],
    ['documents/product-catalog.pdf#page=32', '产品画册 · 格栅与墙板系列'],
    ['documents/product-catalog.pdf#page=39', '产品画册 · 艺术饰面系列'],
  ];
  const state = { panel: 'overview', session: null, catalog: null, items: [], filters: { status: 'all', q: '', page: 1 }, total: 0, pageSize: 20, inquiryRequest: 0, inquiryAbort: null, inquiriesLoading: false, booting: false, settingsDirty: false, settingsSaving: false, editor: null, exportBusy: false };
  const dialog = $('editor-dialog');
  let noticeTimer;
  let searchTimer;

  function node(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined && text !== null) el.textContent = String(text);
    if (className) el.className = className;
    return el;
  }
  function button(text, className, handler) {
    const el = node('button', text, className);
    el.type = 'button';
    if (handler) el.addEventListener('click', handler);
    return el;
  }
  function image(path, alt, className) {
    const el = node('img', null, className);
    if (allowedImages.has(path)) el.src = `/${path}`;
    el.alt = alt || '';
    el.loading = 'lazy';
    return el;
  }
  function date(value, short = false) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', ...(short ? {} : { hour: '2-digit', minute: '2-digit' }) }).format(parsed);
  }
  function badge(status) { return node('span', statusLabels[status] || status, `badge badge-${Object.hasOwn(statusLabels, status) ? status : 'archived'}`); }
  function visibility(item) { return node('span', item.visible ? '展示中' : '已隐藏', `badge badge-${item.visible ? 'visible' : 'hidden'}`); }
  function sorted(items) { return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)); }
  function showNotice(message, error = false) {
    clearTimeout(noticeTimer);
    $('notice-text').textContent = message;
    $('notice').classList.toggle('is-error', error);
    $('notice').setAttribute('role', error ? 'alert' : 'status');
    $('notice').hidden = false;
    if (!error) noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 6500);
  }
  function showAccess(kind, message) {
    state.session = null;
    state.inquiryAbort?.abort();
    if (dialog.open) dialog.close();
    $('admin-app').hidden = true;
    $('access-screen').hidden = false;
    $('access-title').textContent = kind === 401 ? '登录管理工作台' : kind === 403 ? '此账号没有管理权限' : '暂时无法连接工作台';
    $('access-message').textContent = message || (kind === 401 ? '使用已授权的 ChatGPT 账号登录，查看询盘并管理站点内容。' : kind === 403 ? '当前账号未获本站管理员授权。请退出后使用已授权账号登录。' : '请检查网络连接后重新尝试。');
    $('signin-link').hidden = kind !== 401;
    $('access-signout').hidden = kind !== 403;
    $('access-retry').hidden = kind === 401 || kind === 403;
  }
  async function api(path, options = {}) {
    const { raw = false, handleAuth = true, ...request } = options;
    let response;
    try {
      response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...request, headers: { Accept: raw ? 'text/csv' : 'application/json', ...(request.body ? { 'Content-Type': 'application/json' } : {}), ...request.headers } });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      throw new Error('网络连接失败。请检查网络后重试，刚才的操作尚未确认完成。');
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const fieldLabels = { title: '系列名称', kicker: '英文短标题', alt: '图片说明', description: '系列介绍', details: '规格与信息', action: '按钮目标', actionLabel: '按钮文字', name: '名称', code: '编号', image: '展示图片', page: '画册页码', sortOrder: '展示排序', brandName: '品牌名称', heroTitle: '首页主标题', heroSubtitle: '首页副标题', email: '邮箱', notes: '内部备注' };
      const details = data.error?.fields && typeof data.error.fields === 'object' ? Object.entries(data.error.fields).map(([key, value]) => `${fieldLabels[key] || key.replace('socials.', '')}：${value}`).join('；') : '';
      const error = new Error(details || data.error?.message || `请求未完成（${response.status}），请重试。`);
      error.status = response.status;
      error.fields = data.error?.fields;
      if (handleAuth && [401, 403].includes(response.status)) showAccess(response.status);
      throw error;
    }
    if (raw) return response.blob();
    try { return await response.json(); } catch { throw new Error('服务器返回了无法识别的数据，请刷新后重试。'); }
  }
  function setCounts(counts) {
    if (!counts) return;
    if (state.session) state.session.counts = counts;
    const grid = $('overview-stats');
    grid.replaceChildren();
    for (const [key, label] of [['total', '全部询盘'], ['new', '待处理'], ['read', '已查看'], ['replied', '已回复'], ['archived', '已归档']]) {
      const card = button('', 'stat-card', () => {
        state.filters = { status: key === 'total' ? 'all' : key, q: '', page: 1 };
        $('inquiry-search').value = '';
        $('inquiry-status').value = state.filters.status;
        activatePanel('inquiries');
        void loadInquiries();
      });
      card.append(node('span', label), node('strong', Number(counts[key] || 0).toLocaleString('zh-CN')), node('em', '↗'));
      card.setAttribute('aria-label', `${label} ${counts[key] || 0} 条，查看列表`);
      grid.append(card);
    }
    $('nav-new-count').textContent = String(counts.new || 0);
    $('nav-new-count').hidden = !counts.new;
  }
  function activatePanel(name, focus = true) {
    if (!['overview', 'inquiries', 'products', 'swatches', 'settings'].includes(name)) return;
    state.panel = name;
    document.querySelectorAll('.panel').forEach((el) => { el.hidden = el.id !== `panel-${name}`; });
    document.querySelectorAll('[data-panel]').forEach((el) => {
      const active = el.dataset.panel === name;
      el.classList.toggle('is-active', active);
      if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    });
    if (focus) $(name + '-title').focus({ preventScroll: true });
    history.replaceState(null, '', `#${name}`);
  }
  async function loadSession() {
    const data = await api('/api/admin/session');
    state.session = data;
    $('user-name').textContent = data.user.displayName || '管理员';
    $('user-email').textContent = data.user.email;
    setCounts(data.counts);
    return data;
  }
  async function initialize() {
    if (state.booting) return;
    state.booting = true;
    $('access-retry').disabled = true;
    $('access-title').textContent = '正在验证访问权限';
    $('access-message').textContent = '请稍候，正在检查管理员登录状态。';
    try {
      await loadSession();
      $('access-screen').hidden = true;
      $('admin-app').hidden = false;
      activatePanel(location.hash.slice(1) || 'overview', false);
      await Promise.all([loadCatalog(), loadInquiries()]);
    } catch (error) {
      if (![401, 403].includes(error.status)) showAccess(0, error.message);
    } finally {
      state.booting = false;
      $('access-retry').disabled = false;
    }
  }
  function emptyState(title, message, retry) {
    const wrap = node('div', null, 'empty-state');
    wrap.append(node('h3', title), node('p', message));
    if (retry) wrap.append(button('重新加载', 'button button-outline', retry));
    return wrap;
  }
  async function loadCatalog() {
    try {
      const data = await api('/api/admin/catalog');
      if (!state.session) return;
      state.catalog = data;
      renderCatalog();
      if (!state.settingsDirty) fillSettings(data.settings);
    } catch (error) {
      if ([401, 403].includes(error.status)) return;
      showNotice(error.message, true);
      if (!state.catalog) {
        $('product-list').replaceChildren(emptyState('产品内容暂未加载', error.message, () => { void loadCatalog(); }));
        $('swatch-list').replaceChildren(emptyState('花色内容暂未加载', error.message, () => { void loadCatalog(); }));
        $('catalog-summary').replaceChildren(node('p', '内容暂未加载，请刷新重试。'));
      }
    }
  }
  function renderCatalog() {
    if (!state.catalog) return;
    const { products, swatches, settings } = state.catalog;
    $('sidebar-brand').textContent = settings.brandName;
    document.title = `管理工作台 · ${settings.brandName}`;
    const summary = $('catalog-summary');
    summary.replaceChildren();
    for (const [items, label] of [[products, '产品系列'], [swatches, 'SPC 饰面花色']]) {
      const p = node('p');
      p.append(node('strong', `${items.filter((item) => item.visible).length} / ${items.length}`), document.createTextNode(label), node('span', '展示数量 / 全部数量'));
      summary.append(p);
    }
    renderProducts();
    renderSwatches();
  }
  function renderProducts() {
    const products = sorted(state.catalog.products);
    $('product-count').textContent = `${products.length} 个系列`;
    const fragment = document.createDocumentFragment();
    for (const product of products) {
      const card = node('article', null, `product-card${product.visible ? '' : ' is-hidden'}`);
      card.append(image(product.image, product.alt, 'product-image'));
      const content = node('div', null, 'product-card-content');
      const head = node('div', null, 'product-card-head');
      head.append(node('h2', product.title), visibility(product));
      const foot = node('div', null, 'product-card-foot');
      const edit = button('编辑系列 ↗', 'button button-outline button-small', () => openProduct(product));
      edit.setAttribute('aria-label', `编辑 ${product.title}`);
      foot.append(node('span', `排序 ${product.sortOrder}`, 'sort-label'), edit);
      content.append(head, node('p', product.description, 'product-description'), foot);
      card.append(content);
      fragment.append(card);
    }
    $('product-list').replaceChildren(fragment);
  }
  function renderSwatches() {
    if (!state.catalog) return;
    const q = $('swatch-search').value.trim().toLowerCase();
    const category = $('swatch-category').value;
    const display = $('swatch-visibility').value;
    const items = sorted(state.catalog.swatches).filter((item) => (category === 'all' || item.category === category) && (display === 'all' || item.visible === (display === 'visible')) && (!q || `${item.name} ${item.code || ''}`.toLowerCase().includes(q)));
    $('swatch-count').textContent = `${items.length} / ${state.catalog.swatches.length} 款花色`;
    const fragment = document.createDocumentFragment();
    for (const item of items) {
      const card = node('article', null, `swatch-card${item.visible ? '' : ' is-hidden'}`);
      const cover = node('div', null, 'swatch-image-wrap');
      cover.append(image(item.image, item.name, 'swatch-image'), visibility(item));
      const content = node('div', null, 'swatch-card-content');
      content.append(node('h2', item.name), node('p', `${categoryLabels[item.category] || item.category} · 画册第 ${item.page} 页`));
      const foot = node('div', null, 'swatch-card-foot');
      const edit = button('编辑 ↗', 'button button-outline button-small', () => openSwatch(item));
      edit.setAttribute('aria-label', `编辑花色 ${item.name}`);
      foot.append(node('span', `排序 ${item.sortOrder}`, 'sort-label'), edit);
      content.append(foot);
      card.append(cover, content);
      fragment.append(card);
    }
    if (!items.length) fragment.append(emptyState('没有匹配的花色', '试试其他名称、分类或展示状态。'));
    $('swatch-list').replaceChildren(fragment);
  }
  function queryString(includePage = true) {
    const params = new URLSearchParams({ status: state.filters.status, q: state.filters.q });
    if (includePage) params.set('page', String(state.filters.page));
    return params.toString();
  }
  async function loadInquiries() {
    const request = ++state.inquiryRequest;
    state.inquiryAbort?.abort();
    state.inquiryAbort = new AbortController();
    state.inquiriesLoading = true;
    $('inquiry-summary').textContent = '正在读取询盘…';
    $('previous-page').disabled = true;
    $('next-page').disabled = true;
    $('inquiry-rows').replaceChildren();
    $('inquiry-empty').hidden = true;
    $('inquiry-reset').hidden = !state.filters.q && state.filters.status === 'all';
    try {
      const data = await api(`/api/admin/inquiries?${queryString()}`, { signal: state.inquiryAbort.signal });
      if (request !== state.inquiryRequest || !state.session) return;
      state.items = data.items;
      state.total = data.total;
      state.pageSize = data.pageSize || 20;
      state.filters.page = data.page;
      const pages = Math.max(1, Math.ceil(data.total / state.pageSize));
      if (!data.items.length && data.total > 0 && data.page > pages) {
        state.filters.page = pages;
        return loadInquiries();
      }
      setCounts(data.counts);
      renderInquiries();
    } catch (error) {
      if (error.name === 'AbortError' || request !== state.inquiryRequest || [401, 403].includes(error.status)) return;
      $('inquiry-summary').textContent = '询盘未能加载';
      $('inquiry-empty').replaceChildren(emptyState('暂时无法读取询盘', error.message, () => { void loadInquiries(); }));
      $('inquiry-empty').hidden = false;
      $('page-label').textContent = '—';
    } finally {
      if (request === state.inquiryRequest) state.inquiriesLoading = false;
    }
  }
  function renderInquiries() {
    const fragment = document.createDocumentFragment();
    for (const inquiry of state.items) {
      const row = node('tr');
      const customer = node('td');
      customer.append(node('strong', inquiry.name, 'customer-name'), node('span', inquiry.company || '未填写公司', 'cell-secondary'), node('span', inquiry.email, 'cell-secondary'));
      const project = node('td');
      project.append(node('span', projectLabels[inquiry.projectType] || '其他项目'), node('span', inquiry.message, 'cell-message'));
      const samples = node('td', `${inquiry.selectedSwatches.length} 款`);
      const status = node('td'); status.append(badge(inquiry.status));
      const created = node('td', date(inquiry.createdAt, true));
      const action = node('td');
      const open = button('查看 ↗', 'text-button', () => openInquiry(inquiry));
      open.setAttribute('aria-label', `查看 ${inquiry.name} 的询盘`);
      action.append(open);
      row.append(customer, project, samples, status, created, action);
      fragment.append(row);
    }
    $('inquiry-rows').replaceChildren(fragment);
    $('inquiry-summary').textContent = `共 ${state.total.toLocaleString('zh-CN')} 条${state.filters.q || state.filters.status !== 'all' ? '匹配' : ''}询盘`;
    $('inquiry-empty').hidden = state.items.length > 0;
    if (!state.items.length) $('inquiry-empty').replaceChildren(emptyState(state.filters.q || state.filters.status !== 'all' ? '没有匹配的询盘' : '还没有收到询盘', state.filters.q || state.filters.status !== 'all' ? '调整关键词或处理状态，查看其他结果。' : '客户提交的项目需求与选样清单会出现在这里。'));
    const pages = Math.max(1, Math.ceil(state.total / state.pageSize));
    $('page-label').textContent = `第 ${state.filters.page} / ${pages} 页`;
    $('previous-page').disabled = state.filters.page <= 1;
    $('next-page').disabled = state.filters.page >= pages;
  }
  function applyFilters() {
    clearTimeout(searchTimer);
    state.filters = { q: $('inquiry-search').value.trim(), status: $('inquiry-status').value, page: 1 };
    void loadInquiries();
  }
  async function exportCSV() {
    if (state.exportBusy) return;
    clearTimeout(searchTimer);
    const q = $('inquiry-search').value.trim();
    const status = $('inquiry-status').value;
    if (q !== state.filters.q || status !== state.filters.status) { state.filters = { q, status, page: 1 }; void loadInquiries(); }
    state.exportBusy = true;
    const el = $('export-button');
    el.disabled = true;
    el.textContent = '正在准备 CSV…';
    try {
      const blob = await api(`/api/admin/inquiries/export?${queryString(false)}`, { raw: true });
      const url = URL.createObjectURL(blob);
      const link = node('a');
      link.href = url;
      link.download = `soya-inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      showNotice(state.total > 10000 ? 'CSV 已准备好，当前筛选超过 10,000 条，本次导出前 10,000 条。' : '当前筛选的 CSV 已准备好，请查看浏览器下载。');
    } catch (error) { if (![401, 403].includes(error.status)) showNotice(error.message, true); }
    finally { state.exportBusy = false; el.disabled = false; el.textContent = '导出当前筛选 CSV ↓'; }
  }

  function field(label, name, value, options = {}) {
    const wrap = node('label', null, 'field-label');
    wrap.append(node('span', label));
    const input = node(options.textarea ? 'textarea' : 'input');
    input.name = name;
    if (!options.textarea) input.type = options.type || 'text';
    input.value = value ?? '';
    for (const key of ['required', 'maxLength', 'min', 'max', 'step', 'rows', 'placeholder']) if (options[key] !== undefined) input[key] = options[key];
    wrap.append(input);
    return wrap;
  }
  function selectField(label, name, value, choices) {
    const wrap = node('label', null, 'field-label');
    wrap.append(node('span', label));
    const select = node('select');
    select.name = name;
    for (const [key, text] of choices) { const option = node('option', text); option.value = key; select.append(option); }
    select.value = value;
    wrap.append(select);
    return wrap;
  }
  function visibleField(item) {
    const wrap = node('label', null, 'checkbox-field');
    const input = node('input'); input.type = 'checkbox'; input.name = 'visible'; input.checked = item.visible;
    wrap.append(input, node('span', '在产品展厅中展示'));
    return wrap;
  }
  function imageField(item, choices) {
    const wrap = node('div', null, 'image-picker');
    const preview = image(item.image, '当前选择的图片', '');
    const right = node('div');
    const selectWrap = selectField('展示图片', 'image', item.image, choices);
    selectWrap.querySelector('select').addEventListener('change', (event) => {
      if (allowedImages.has(event.target.value)) preview.src = `/${event.target.value}`;
    });
    right.append(selectWrap, node('p', '仅可选择已有画册图片。', 'field-hint'));
    wrap.append(preview, right);
    return wrap;
  }
  function editorChanged(editor) { return editor.baseline !== JSON.stringify([...new FormData(editor.form).entries()]); }
  function closeEditor() {
    const editor = state.editor;
    if (!editor || editor.busy) return;
    if (editorChanged(editor) && !window.confirm('当前修改尚未保存，确定放弃并关闭吗？')) return;
    dialog.close();
  }
  function makeEditor(title, kicker, subtitle, saveLabel = '保存修改') {
    const opener = state.editor?.opener || document.activeElement;
    const form = node('form', null, 'editor-form');
    const header = node('div', null, 'editor-header');
    const heading = node('div');
    const h2 = node('h2', title); h2.id = 'editor-title';
    heading.append(node('p', kicker, 'eyebrow'), h2, node('p', subtitle, 'editor-subtitle'));
    const close = button('×', 'close-button', closeEditor); close.setAttribute('aria-label', '关闭编辑窗口');
    header.append(heading, close);
    const body = node('div', null, 'editor-body');
    const fields = node('fieldset', null, 'editor-fields');
    const error = node('div', null, 'form-error'); error.setAttribute('role', 'alert'); error.hidden = true;
    body.append(fields, error);
    const footer = node('div', null, 'editor-footer');
    const note = node('span', '保存后才会更新内容。');
    const actions = node('div');
    const cancel = button('取消', 'button button-quiet', closeEditor);
    const save = node('button', saveLabel, 'button button-dark'); save.type = 'submit';
    actions.append(cancel, save); footer.append(note, actions);
    form.append(header, body, footer);
    $('editor-content').replaceChildren(form);
    const editor = { form, fields, error, close, cancel, save, note, body, busy: false, baseline: '', opener, saveLabel };
    state.editor = editor;
    return editor;
  }
  function showEditor(editor, saveHandler) {
    editor.baseline = JSON.stringify([...new FormData(editor.form).entries()]);
    editor.form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (editor.busy || !editor.form.reportValidity()) return;
      const values = new FormData(editor.form);
      editor.error.hidden = true;
      setEditorBusy(editor, true);
      try { await saveHandler(values, editor); }
      catch (error) {
        if (![401, 403].includes(error.status)) { editor.error.replaceChildren(node('p', error.message)); editor.error.hidden = false; editor.error.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      } finally { setEditorBusy(editor, false); }
    });
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => { editor.form.querySelector('input,select,textarea,button')?.focus({ preventScroll: true }); });
  }
  function setEditorBusy(editor, busy) {
    editor.busy = busy;
    editor.fields.disabled = busy;
    editor.close.disabled = busy;
    editor.cancel.disabled = busy;
    editor.save.disabled = busy;
    editor.save.textContent = busy ? '正在保存…' : editor.saveLabel;
    editor.form.setAttribute('aria-busy', String(busy));
  }
  function savedEditor(editor, message) {
    editor.baseline = JSON.stringify([...new FormData(editor.form).entries()]);
    dialog.close();
    showNotice(message);
  }
  function openProduct(item) {
    const editor = makeEditor(item.title, 'EDIT PRODUCT / 产品系列', `产品 ID：${item.id}`);
    editor.fields.append(imageField(item, productImages));
    const row = node('div', null, 'field-row');
    row.append(field('系列名称', 'title', item.title, { required: true, maxLength: 100 }), field('英文短标题', 'kicker', item.kicker, { required: true, maxLength: 160 }));
    editor.fields.append(row, field('系列介绍', 'description', item.description, { textarea: true, rows: 4, required: true, maxLength: 1500 }), field('图片说明', 'alt', item.alt, { required: true, maxLength: 240 }));
    const details = node('div', null, 'details-fields');
    details.append(node('p', '规格与信息', 'form-group-title'));
    item.details.forEach(([label, value], index) => {
      const detailRow = node('div', null, 'field-row');
      detailRow.append(field(`信息 ${index + 1} · 标题`, `detailLabel${index}`, label, { required: true, maxLength: 80 }), field(`信息 ${index + 1} · 内容`, `detailValue${index}`, value, { required: true, maxLength: 250 }));
      details.append(detailRow);
    });
    editor.fields.append(details, selectField('按钮目标', 'action', item.action, productActions), field('按钮文字', 'actionLabel', item.actionLabel, { required: true, maxLength: 100 }));
    const order = node('div', null, 'field-row');
    order.append(field('展示排序（数字越小越靠前）', 'sortOrder', item.sortOrder, { type: 'number', step: 1, min: 0, max: 10000, required: true }), visibleField(item));
    editor.fields.append(order, node('p', '修改产品参数时，请以原始画册与报告为准。', 'editor-note'));
    showEditor(editor, async (values) => {
      const next = { ...item, title: values.get('title').trim(), kicker: values.get('kicker').trim(), description: values.get('description').trim(), alt: values.get('alt').trim(), image: values.get('image'), action: values.get('action'), actionLabel: values.get('actionLabel').trim(), details: item.details.map((_, index) => [values.get(`detailLabel${index}`).trim(), values.get(`detailValue${index}`).trim()]), visible: values.has('visible'), sortOrder: Number(values.get('sortOrder')) };
      const data = await api(`/api/admin/products/${encodeURIComponent(item.id)}`, { method: 'PUT', body: JSON.stringify(next) });
      state.catalog.products = state.catalog.products.map((product) => product.id === item.id ? data.item : product);
      renderCatalog(); savedEditor(editor, '产品系列已保存，展厅内容已更新。');
    });
  }
  function openSwatch(item) {
    const editor = makeEditor(item.name, 'EDIT SPC FINISH / 饰面花色', `花色 ID：${item.id} · SPC 石晶墙板`);
    editor.fields.append(imageField(item, swatchImages));
    const names = node('div', null, 'field-row');
    names.append(field('花色名称', 'name', item.name, { required: true, maxLength: 100 }), field('花色编号（可留空）', 'code', item.code, { maxLength: 80 }));
    const meta = node('div', null, 'field-row');
    meta.append(selectField('花色分类', 'category', item.category, Object.entries(categoryLabels)), field('画册页码（1–11）', 'page', item.page, { type: 'number', required: true, min: 1, max: 11, step: 1 }));
    const order = node('div', null, 'field-row');
    order.append(field('展示排序（数字越小越靠前）', 'sortOrder', item.sortOrder, { type: 'number', required: true, min: 0, max: 10000, step: 1 }), visibleField(item));
    editor.fields.append(names, meta, order, node('p', '此花色记录属于 SPC 石晶墙板系列。隐藏后将不再出现在前台花色库中，已有询盘保留提交时的选样名称。', 'editor-note'));
    showEditor(editor, async (values) => {
      const next = { ...item, name: values.get('name').trim(), code: values.get('code').trim() || null, category: values.get('category'), image: values.get('image'), page: Number(values.get('page')), sortOrder: Number(values.get('sortOrder')), visible: values.has('visible') };
      const data = await api(`/api/admin/swatches/${encodeURIComponent(item.id)}`, { method: 'PUT', body: JSON.stringify(next) });
      state.catalog.swatches = state.catalog.swatches.map((swatch) => swatch.id === item.id ? data.item : swatch);
      renderCatalog(); savedEditor(editor, 'SPC 花色已保存，展厅内容已更新。');
    });
  }
  function openInquiry(item) {
    const editor = makeEditor(`${item.name}的询盘`, 'INQUIRY DETAILS / 商务询盘', `提交于 ${date(item.createdAt)} · 版本 ${item.version}`, '保存处理记录');
    editor.note.textContent = '保存处理记录不会自动发送邮件。';
    const details = node('dl', null, 'inquiry-details');
    for (const [label, value] of [['客户姓名', item.name], ['电子邮箱', item.email], ['公司 / 机构', item.company || '未填写'], ['国家 / 地区', item.country || '未填写'], ['项目类型', projectLabels[item.projectType] || '其他项目'], ['最近更新', date(item.updatedAt)]]) {
      const div = node('div'); div.append(node('dt', label), node('dd', value)); details.append(div);
    }
    const message = node('section', null, 'inquiry-content-section');
    message.append(node('h3', '项目需求'), node('p', item.message, 'inquiry-message'));
    const swatches = node('section', null, 'inquiry-content-section'); swatches.append(node('h3', `选样清单 · ${item.selectedSwatches.length} 款`));
    const tags = node('div', null, 'selected-swatches');
    if (item.selectedSwatches.length) for (const swatch of item.selectedSwatches) tags.append(node('span', swatch.name, 'sample-tag'));
    else tags.append(node('p', '本次未选择具体花色。', 'field-hint'));
    swatches.append(tags);
    const editing = node('section', null, 'inquiry-edit-section editor-fields');
    editing.append(selectField('处理状态', 'status', item.status, Object.entries(statusLabels)), field('内部备注', 'notes', item.notes || '', { textarea: true, rows: 5, maxLength: 3000, placeholder: '记录沟通进展、报价事项或下一步安排…' }));
    const count = node('p', `${(item.notes || '').length} / 3000`, 'character-count');
    editing.querySelector('textarea').addEventListener('input', (event) => { count.textContent = `${event.target.value.length} / 3000`; }); editing.append(count);
    editor.fields.append(details, message, swatches, editing);
    showEditor(editor, async (values) => {
      let data;
      try {
        data = await api(`/api/admin/inquiries/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: JSON.stringify({ status: values.get('status'), notes: values.get('notes'), version: item.version }) });
      } catch (error) {
        if (error.status !== 409) throw error;
        editor.error.replaceChildren(node('p', '这条询盘已在其他窗口更新。你的修改尚未保存，请先载入最新版本，再确认状态和备注。'));
        const reload = button('载入最新版本', 'button button-outline button-small', async () => {
          if (editor.busy) return;
          if (!window.confirm('载入最新版本会替换当前未保存的状态和备注，是否继续？')) return;
          setEditorBusy(editor, true); reload.disabled = true; editor.save.textContent = '正在读取…';
          try {
            const latest = await api(`/api/admin/inquiries/${encodeURIComponent(item.id)}`);
            openInquiry(latest.inquiry);
            showNotice('已载入最新版本，请核对后再保存。');
          } catch (refreshError) {
            if (![401, 403].includes(refreshError.status)) { editor.error.prepend(node('p', refreshError.message)); }
          } finally { setEditorBusy(editor, false); reload.disabled = false; }
        });
        editor.error.append(reload, node('p', '提示：载入前可先复制需要保留的备注。', 'field-hint'));
        editor.error.hidden = false;
        editor.error.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return;
      }
      item = data.inquiry;
      savedEditor(editor, '询盘处理状态与备注已保存。');
      await loadInquiries();
    });
  }
  function fillSettings(settings) {
    const form = $('settings-form');
    for (const key of ['brandName', 'heroTitle', 'heroSubtitle', 'email']) form.elements.namedItem(key).value = settings[key] || '';
    for (const key of ['instagram', 'facebook', 'tiktok', 'whatsapp']) form.elements.namedItem(key).value = settings.socials[key] || '';
    $('settings-fields').disabled = false;
    state.settingsDirty = false;
    $('settings-save-note').textContent = '仅在点击保存后更新公开内容。';
  }
  function validSocial(value, platform) {
    if (!value) return true;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
      if (platform === 'whatsapp') return ['wa.me', 'api.whatsapp.com'].includes(url.hostname);
      const host = `${platform}.com`;
      return url.hostname === host || url.hostname.endsWith(`.${host}`);
    } catch { return false; }
  }
  async function saveSettings(event) {
    event.preventDefault();
    if (state.settingsSaving || !state.catalog) return;
    const form = $('settings-form');
    for (const key of ['instagram', 'facebook', 'tiktok', 'whatsapp']) {
      const input = form.elements.namedItem(key);
      input.setCustomValidity(validSocial(input.value.trim(), key) ? '' : `请输入 ${key === 'whatsapp' ? 'wa.me 或 api.whatsapp.com' : `${key}.com`} 的 HTTPS 链接，或留空。`);
    }
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const settings = { brandName: values.get('brandName').trim(), heroTitle: values.get('heroTitle').trim(), heroSubtitle: values.get('heroSubtitle').trim(), email: values.get('email').trim(), socials: {} };
    for (const key of ['instagram', 'facebook', 'tiktok', 'whatsapp']) settings.socials[key] = values.get(key).trim();
    state.settingsSaving = true;
    $('settings-fields').disabled = true;
    $('settings-save').textContent = '正在保存…';
    $('settings-error').hidden = true;
    try {
      const data = await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) });
      state.catalog.settings = data.settings;
      fillSettings(data.settings); renderCatalog();
      $('settings-save-note').textContent = `已保存 · ${new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`;
      showNotice('站点设置已保存。留空的联系方式会保持隐藏。');
    } catch (error) {
      if (![401, 403].includes(error.status)) { $('settings-error').textContent = error.message; $('settings-error').hidden = false; }
    } finally { state.settingsSaving = false; $('settings-fields').disabled = false; $('settings-save').textContent = '保存站点设置 ↗'; }
  }
  async function refreshCurrent() {
    const el = $('refresh-button');
    if (el.disabled || state.settingsSaving) return;
    if (state.panel === 'settings' && state.settingsDirty) {
      if (!window.confirm('刷新将替换尚未保存的站点设置，是否继续？')) return;
      state.settingsDirty = false;
    }
    el.disabled = true;
    try {
      await loadSession();
      if (state.panel === 'inquiries') await loadInquiries();
      else if (state.panel === 'overview') await Promise.all([loadCatalog(), loadInquiries()]);
      else await loadCatalog();
    } catch (error) { if (![401, 403].includes(error.status)) showNotice(error.message, true); }
    finally { el.disabled = false; }
  }

  document.querySelectorAll('[data-panel]').forEach((el) => el.addEventListener('click', () => activatePanel(el.dataset.panel)));
  document.querySelectorAll('[data-open-panel]').forEach((el) => el.addEventListener('click', () => activatePanel(el.dataset.openPanel)));
  $('access-retry').addEventListener('click', initialize);
  $('notice-close').addEventListener('click', () => { $('notice').hidden = true; });
  $('refresh-button').addEventListener('click', refreshCurrent);
  $('inquiry-filters').addEventListener('submit', (event) => { event.preventDefault(); applyFilters(); });
  $('inquiry-status').addEventListener('change', applyFilters);
  $('inquiry-search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(applyFilters, 350); });
  $('inquiry-reset').addEventListener('click', () => { $('inquiry-search').value = ''; $('inquiry-status').value = 'all'; applyFilters(); });
  $('previous-page').addEventListener('click', () => { if (!state.inquiriesLoading && state.filters.page > 1) { state.filters.page -= 1; void loadInquiries(); } });
  $('next-page').addEventListener('click', () => { if (!state.inquiriesLoading && state.filters.page < Math.ceil(state.total / state.pageSize)) { state.filters.page += 1; void loadInquiries(); } });
  $('export-button').addEventListener('click', exportCSV);
  $('swatch-search').addEventListener('input', renderSwatches);
  $('swatch-category').addEventListener('change', renderSwatches);
  $('swatch-visibility').addEventListener('change', renderSwatches);
  $('settings-form').addEventListener('submit', saveSettings);
  $('settings-form').addEventListener('input', (event) => {
    event.target.setCustomValidity?.(''); state.settingsDirty = true;
    $('settings-save-note').textContent = '有尚未保存的修改。';
  });
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeEditor(); });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeEditor();
  });
  dialog.addEventListener('close', () => {
    const editor = state.editor; state.editor = null;
    if (editor?.opener?.isConnected) editor.opener.focus({ preventScroll: true });
  });
  window.addEventListener('beforeunload', (event) => {
    if (state.settingsDirty || (state.editor && editorChanged(state.editor))) { event.preventDefault(); event.returnValue = ''; }
  });
  void initialize();
})();
