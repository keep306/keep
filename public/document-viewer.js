(() => {
  'use strict';
  const t = (value, vars) => window.SoyaI18n ? window.SoyaI18n.t(value, vars) : String(value ?? '');
  if (window.SoyaDocumentReader) return;

  const known = Object.freeze({
    product: { title: '产品系列画册', pdf: '/documents/product-catalog.pdf' },
    finish: { title: 'SPC 饰面花色画册', pdf: '/documents/finish-catalog.pdf' },
    fire: { title: '碳晶大板燃烧性能检测报告', pdf: '/documents/fire-report.pdf' },
    formaldehyde: { title: '碳晶大板甲醛释放量检测报告', pdf: '/documents/formaldehyde-report.pdf' },
  });
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = t(text);
    return node;
  };
  const button = (text, title, className = '') => {
    const node = el('button', `document-reader__button ${className}`.trim(), text);
    node.type = 'button';
    node.setAttribute('aria-label', t(title));
    node.title = t(title);
    return node;
  };
  const dialog = el('dialog', 'document-reader');
  dialog.id = 'document-reader';
  dialog.setAttribute('aria-labelledby', 'document-reader-title');
  const header = el('header', 'document-reader__header');
  const heading = el('div', 'document-reader__heading');
  heading.append(el('p', 'document-reader__eyebrow', '资料阅读器'));
  const title = el('h2', 'document-reader__title', '产品资料');
  title.id = 'document-reader-title';
  heading.append(title);
  const download = el('a', 'document-reader__download', '查看原版 PDF');
  download.download = '';
  download.hidden = true;
  const close = button('×', '关闭资料阅读器', 'document-reader__close');
  const headerActions = el('div', 'document-reader__header-actions');
  headerActions.append(download, close);
  header.append(heading, headerActions);

  const toolbar = el('div', 'document-reader__toolbar');
  const pageForm = el('form', 'document-reader__pages');
  pageForm.setAttribute('aria-label', t('资料翻页'));
  pageForm.noValidate = true;
  const previous = button('←', '上一页');
  const next = button('→', '下一页');
  const pageLabel = el('label', 'document-reader__page-label', '第');
  const pageInput = el('input', 'document-reader__page-input');
  pageInput.type = 'number';
  pageInput.inputMode = 'numeric';
  pageInput.min = '1';
  pageInput.step = '1';
  pageInput.value = '1';
  pageInput.setAttribute('aria-label', t('跳转至页码'));
  pageLabel.append(pageInput);
  const total = el('span', 'document-reader__page-total', '/ — 页');
  const go = button('前往', '跳转到输入的页码', 'document-reader__go');
  go.type = 'submit';
  pageForm.append(previous, pageLabel, total, next, go);
  const zoomControls = el('div', 'document-reader__zoom-controls');
  const fit = button('适应屏幕', '适应屏幕');
  const fitWidth = button('适应宽度', '适应页面宽度，纵向滚动阅读');
  const zoomOut = button('−', '缩小');
  const zoomIn = button('+', '放大');
  const zoomValue = el('span', 'document-reader__zoom-value', '—');
  zoomValue.setAttribute('aria-label', t('当前缩放比例'));
  zoomControls.append(fit, fitWidth, zoomOut, zoomValue, zoomIn);
  toolbar.append(pageForm, zoomControls);

  const stage = el('div', 'document-reader__stage');
  stage.tabIndex = 0;
  stage.setAttribute('aria-label', t('资料页面，可使用方向键翻页'));
  const figure = el('figure', 'document-reader__figure');
  const message = el('div', 'document-reader__message');
  const messageText = el('p', 'document-reader__message-text', '正在加载资料…');
  messageText.setAttribute('role', 'status');
  messageText.setAttribute('aria-live', 'polite');
  const retry = button('重新加载', '重新加载当前资料', 'document-reader__retry');
  retry.hidden = true;
  message.append(messageText, retry);
  stage.append(figure, message);
  const footer = el('footer', 'document-reader__footer');
  const announcement = el('span', 'document-reader__announcement', '资料内容请以原始文件为准');
  announcement.setAttribute('aria-live', 'polite');
  footer.append(announcement, el('span', 'document-reader__keyboard-hint', '← → 翻页 · Esc 关闭'));
  dialog.append(header, toolbar, stage, footer);
  document.body.append(dialog);

  let manifestPromise = null;
  let state = null;
  let focusBefore = null;
  let generation = 0;
  let opening = 0;
  let image = null;
  let retryAction = null;
  let imageTimeout = null;
  const LOAD_TIMEOUT_MS = 15000;
  const preloads = new Map();

  function safeLocalPath(value, expectedPath) {
    if (typeof value !== 'string') throw new Error('Invalid document asset');
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname !== expectedPath || url.search || url.hash || url.username || url.password) throw new Error('Invalid document asset');
    return url.pathname;
  }
  function validateManifest(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid document manifest');
    const result = Object.create(null);
    for (const id of Object.keys(known)) {
      const item = raw[id];
      if (!item || typeof item !== 'object' || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 200 || !Number.isInteger(item.pageCount) || item.pageCount < 1 || item.pageCount > 200 || !Array.isArray(item.pages) || item.pages.length !== item.pageCount) throw new Error('Invalid document metadata');
      result[id] = {
        title: item.title,
        pdf: safeLocalPath(item.pdf, known[id].pdf),
        pageCount: item.pageCount,
        pages: item.pages.map((page, index) => {
          if (!page || !Number.isInteger(page.width) || !Number.isInteger(page.height) || page.width < 100 || page.width > 8000 || page.height < 100 || page.height > 12000) throw new Error('Invalid page dimensions');
          return { src: safeLocalPath(page.src, `/documents/pages/${id}/page-${String(index + 1).padStart(3, '0')}.webp`), width: page.width, height: page.height };
        }),
      };
    }
    return result;
  }
  function getManifest(force = false) {
    if (force) manifestPromise = null;
    if (!manifestPromise) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
      manifestPromise = fetch('/documents/manifest.json', { credentials: 'same-origin', cache: force ? 'reload' : 'default', signal: controller.signal })
        .then(response => { if (!response.ok) throw new Error('Manifest unavailable'); return response.json(); })
        .then(validateManifest)
        .catch(error => { manifestPromise = null; throw error; })
        .finally(() => clearTimeout(timeout));
    }
    return manifestPromise;
  }
  function clampPage(value, count) {
    const numeric = Number(value);
    return Math.min(count, Math.max(1, Number.isFinite(numeric) ? Math.trunc(numeric) : 1));
  }
  function setMessage(text, error = false) {
    message.hidden = false;
    message.classList.toggle('is-error', error);
    messageText.textContent = t(text);
    retry.hidden = !error;
    stage.setAttribute('aria-busy', String(!error));
  }
  function clearImageTimeout() {
    if (imageTimeout !== null) { clearTimeout(imageTimeout); imageTimeout = null; }
  }
  function clearImage() {
    clearImageTimeout();
    if (image) { image.onload = null; image.onerror = null; image.removeAttribute('src'); image = null; }
    figure.replaceChildren();
  }
  function clearPreloads() {
    for (const preload of preloads.values()) preload.removeAttribute('src');
    preloads.clear();
  }
  function setControls(enabled) {
    for (const control of [previous, next, pageInput, go, fit, fitWidth, zoomOut, zoomIn]) control.disabled = !enabled;
  }
  function updateControls() {
    if (!state?.document) { setControls(false); return; }
    setControls(true);
    previous.disabled = state.page <= 1;
    next.disabled = state.page >= state.document.pageCount;
    pageInput.value = String(state.page);
    pageInput.max = String(state.document.pageCount);
    total.textContent = t(`/ ${state.document.pageCount} 页`);
    fit.setAttribute('aria-pressed', String(state.fit === 'page'));
    fitWidth.setAttribute('aria-pressed', String(state.fit === 'width'));
    zoomOut.disabled = !image || state.scale <= 0.2;
    zoomIn.disabled = !image || state.scale >= 3;
  }
  function applyScale() {
    if (!image || !state?.document || !dialog.open) return;
    const dimensions = state.document.pages[state.page - 1];
    if (state.fit) {
      const widthScale = (stage.clientWidth - 32) / dimensions.width;
      const fitScale = state.fit === 'width' ? widthScale : Math.min(widthScale, (stage.clientHeight - 32) / dimensions.height);
      state.scale = Math.max(0.05, Math.min(fitScale, 1));
    }
    image.style.width = `${Math.max(1, Math.round(dimensions.width * state.scale))}px`;
    image.style.height = 'auto';
    zoomValue.textContent = t(`${Math.round(state.scale * 100)}%`);
    updateControls();
  }
  function preloadAdjacent() {
    if (!state?.document || !dialog.open) return;
    const desired = [state.page - 1, state.page + 1].filter(page => page >= 1 && page <= state.document.pageCount).map(page => state.document.pages[page - 1].src);
    for (const [src, preload] of preloads) if (!desired.includes(src)) { preload.removeAttribute('src'); preloads.delete(src); }
    for (const src of desired) if (!preloads.has(src)) { const preload = new Image(); preload.decoding = 'async'; preload.src = src; preloads.set(src, preload); }
  }
  function showPage(value, forceReload = false) {
    if (!state?.document || !dialog.open) return;
    const token = ++generation;
    state.page = clampPage(value, state.document.pageCount);
    const descriptor = state.document.pages[state.page - 1];
    clearImage();
    updateControls();
    stage.scrollTo({ left: 0, top: 0 });
    setMessage(`正在加载第 ${state.page} 页…`);
    announcement.textContent = t(`${state.document.title} · 第 ${state.page} / ${state.document.pageCount} 页`);
    const current = new Image();
    image = current;
    current.className = 'document-reader__image';
    current.alt = t(`${state.document.title}，第 ${state.page} 页`);
    current.width = descriptor.width;
    current.height = descriptor.height;
    current.decoding = 'async';
    current.draggable = false;
    current.hidden = true;
    current.onload = () => {
      if (token !== generation || !dialog.open) return;
      clearImageTimeout();
      current.hidden = false;
      message.hidden = true;
      stage.setAttribute('aria-busy', 'false');
      retryAction = null;
      applyScale();
      preloadAdjacent();
    };
    const failImage = timedOut => {
      if (token !== generation || !dialog.open) return;
      clearImageTimeout();
      current.onload = null;
      current.onerror = null;
      current.removeAttribute('src');
      setMessage(timedOut ? `第 ${state.page} 页加载超时，请重试。` : `第 ${state.page} 页暂时无法加载，请重试。`, true);
      retryAction = () => showPage(state.page, true);
    };
    current.onerror = () => failImage(false);
    figure.append(current);
    applyScale();
    const source = new URL(descriptor.src, window.location.origin);
    if (forceReload) source.searchParams.set('retry', String(Date.now()));
    imageTimeout = setTimeout(() => failImage(true), LOAD_TIMEOUT_MS);
    current.src = source.href;
  }
  async function loadDocument(id, requestedPage, force = false) {
    const token = ++generation;
    state = { id, page: 1, document: null, fit: window.matchMedia('(max-width: 700px)').matches ? 'width' : 'page', scale: 1 };
    title.textContent = t(known[id]?.title || '产品资料');
    download.hidden = true;
    total.textContent = t('/ — 页');
    pageInput.value = '1';
    zoomValue.textContent = t('—');
    clearImage();
    clearPreloads();
    setControls(false);
    setMessage('正在加载资料…');
    try {
      const documents = await getManifest(force);
      if (token !== generation || !dialog.open) return;
      if (!Object.prototype.hasOwnProperty.call(documents, id)) throw new Error('Unknown document');
      state.document = documents[id];
      title.textContent = t(state.document.title);
      download.href = state.document.pdf;
      download.download = state.document.pdf.split('/').pop();
      download.hidden = false;
      showPage(requestedPage);
    } catch {
      if (token !== generation || !dialog.open) return;
      setMessage('资料暂时无法加载，请检查网络后重试。', true);
      retryAction = () => loadDocument(id, requestedPage, true);
    }
  }
  async function openDocument(id, page = 1, trigger = document.activeElement) {
    const request = ++opening;
    const sourceDialog = trigger instanceof Element ? trigger.closest('dialog[open]') : null;
    let target = trigger instanceof HTMLElement ? trigger : null;
    if (sourceDialog && sourceDialog !== dialog) {
      sourceDialog.close();
      // Allow the source dialog's close handler to restore focus and release its own scroll lock.
      await new Promise(resolve => setTimeout(resolve, 0));
      if (document.activeElement instanceof HTMLElement && !sourceDialog.contains(document.activeElement)) target = document.activeElement;
    }
    if (request !== opening) return;
    if (!dialog.open) {
      focusBefore = target;
      dialog.showModal();
      document.documentElement.classList.add('document-reader-open');
      close.focus({ preventScroll: true });
    }
    await loadDocument(id, page);
  }

  document.addEventListener('click', event => {
    const trigger = event.target instanceof Element ? event.target.closest('[data-document]') : null;
    if (!trigger || trigger.closest('#document-reader') || typeof dialog.showModal !== 'function') return;
    event.preventDefault();
    const id = trigger.getAttribute('data-document') || '';
    void openDocument(id, trigger.getAttribute('data-document-page') || 1, trigger);
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    generation++;
    opening++;
    clearImage();
    clearPreloads();
    state = null;
    retryAction = null;
    document.documentElement.classList.remove('document-reader-open');
    if (focusBefore?.isConnected && !focusBefore.closest('dialog:not([open])')) focusBefore.focus({ preventScroll: true });
    focusBefore = null;
  });
  previous.addEventListener('click', () => showPage(state.page - 1));
  next.addEventListener('click', () => showPage(state.page + 1));
  pageForm.addEventListener('submit', event => { event.preventDefault(); if (state?.document) showPage(pageInput.value); });
  retry.addEventListener('click', () => retryAction?.());
  function setFit(mode) {
    if (!state) return;
    state.fit = mode;
    applyScale();
    stage.scrollTo({ left: 0, top: 0 });
  }
  fit.addEventListener('click', () => setFit('page'));
  fitWidth.addEventListener('click', () => setFit('width'));
  function zoom(multiplier) {
    if (!state || !image) return;
    state.fit = false;
    state.scale = Math.min(3, Math.max(0.2, state.scale * multiplier));
    applyScale();
  }
  zoomOut.addEventListener('click', () => zoom(1 / 1.3));
  zoomIn.addEventListener('click', () => zoom(1.3));
  dialog.addEventListener('keydown', event => {
    if (!state?.document || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); showPage(state.page - 1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); showPage(state.page + 1); }
    else if (event.key === 'Home') { event.preventDefault(); showPage(1); }
    else if (event.key === 'End') { event.preventDefault(); showPage(state.document.pageCount); }
    else if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(1.3); }
    else if (event.key === '-') { event.preventDefault(); zoom(1 / 1.3); }
  });
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => { if (state?.fit) applyScale(); }).observe(stage);
  else window.addEventListener('resize', () => { if (state?.fit) applyScale(); });
  window.SoyaDocumentReader = Object.freeze({ open: openDocument });
})();
