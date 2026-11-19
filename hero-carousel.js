(() => {
  'use strict';
  const t = (value, vars) => window.SoyaI18n ? window.SoyaI18n.t(value, vars) : String(value ?? '');
  const root = document.querySelector('[data-hero-carousel]');
  if (!root) return;

  const slides = Array.from(root.querySelectorAll('[data-hero-slide]'));
  const series = root.querySelector('[data-hero-series]');
  const seriesLink = root.querySelector('[data-hero-series-link]');
  const caption = root.querySelector('[data-hero-caption]');
  if (!slides.length || !series || !seriesLink || !caption) return;

  const loaded = new Map();
  const pending = new Map();
  let nextIndex = 0;
  let timer = null;
  let busy = false;
  let onScreen = true;
  let pageActive = true;
  let hasFocus = false;
  let hoveringLink = false;
  let displayedIndex = -1;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  root.classList.add('is-enhanced');
  function stopTimer() {
    if (timer !== null) { clearTimeout(timer); timer = null; }
  }
  function canRotate() {
    return pageActive && !document.hidden && onScreen && !hasFocus && !hoveringLink && (!motion.matches || displayedIndex < 0);
  }
  function schedule() {
    stopTimer();
    if (!canRotate() || busy || slides.length < 2) return;
    timer = setTimeout(() => { timer = null; void advance(); }, 6000);
  }
  function localImage(path) {
    if (typeof path !== 'string' || !/^\/keep\/assets\/[a-zA-Z0-9._-]+\.(?:webp|jpg|jpeg|png)$/.test(path)) return null;
    try { return new URL(path, window.location.origin).href; } catch { return null; }
  }
  function requestImage(path, priority) {
    const source = localImage(path);
    if (!source) return Promise.resolve(false);
    return new Promise(resolve => {
      let image = null;
      let timeout = null;
      let finished = false;
      function finish(ok) {
        if (finished) return;
        finished = true;
        if (timeout !== null) clearTimeout(timeout);
        if (image) {
          image.onload = null;
          image.onerror = null;
          if (!ok) image.removeAttribute('src');
        }
        resolve(ok);
      }
      try {
        image = new Image();
        image.decoding = 'async';
        image.fetchPriority = priority;
        image.onload = () => finish(image.naturalWidth > 0);
        image.onerror = () => finish(false);
        timeout = setTimeout(() => finish(false), 10000);
        image.src = source;
      } catch { finish(false); }
    });
  }
  function loadSlide(index) {
    if (loaded.has(index)) return Promise.resolve(loaded.get(index));
    if (pending.has(index)) return pending.get(index);
    const promise = (async () => {
      const image = slides[index].querySelector('img');
      if (!image) return null;
      const original = image.dataset.heroSrc;
      const fallback = image.dataset.heroFallback;
      let result = null;
      if (await requestImage(original, index === 0 ? 'high' : 'auto')) result = { src: original, fallback: false };
      else if (await requestImage(fallback, 'auto')) result = { src: fallback, fallback: true };
      if (result) loaded.set(index, result);
      return result;
    })().catch(() => null).finally(() => pending.delete(index));
    pending.set(index, promise);
    return promise;
  }
  function showSlide(index, result) {
    displayedIndex = index;
    const active = slides[index];
    const image = active.querySelector('img');
    image.src = result.src;
    image.classList.toggle('is-fallback', result.fallback);
    image.alt = t(result.fallback ? active.dataset.heroFallbackAlt : active.dataset.heroAlt);
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === index);
      slide.setAttribute('aria-hidden', String(i !== index));
    });
    root.dataset.feature = active.dataset.feature;
    series.textContent = t(active.dataset.heroTitle);
    seriesLink.href = active.dataset.heroLink;
    if (active.dataset.heroDocument) {
      seriesLink.dataset.document = active.dataset.heroDocument;
      seriesLink.dataset.documentPage = active.dataset.heroPage;
    } else {
      delete seriesLink.dataset.document;
      delete seriesLink.dataset.documentPage;
    }
    seriesLink.setAttribute('aria-label', t(`查看${active.dataset.heroTitle}产品系列`));
    caption.textContent = t(result.fallback ? '产品画册样图 · 颜色与质感以实物为准' : '产品展示图 · 基于画册样图制作');
  }
  async function advance() {
    if (busy || !canRotate()) return;
    busy = true;
    stopTimer();
    try {
      // Try the next available image, keeping the current image visible while loading.
      for (let attempt = 0; attempt < slides.length; attempt++) {
        if (!canRotate()) return;
        const target = nextIndex;
        nextIndex = (target + 1) % slides.length;
        const result = await loadSlide(target);
        if (!canRotate()) { nextIndex = target; return; }
        if (!result) continue;
        showSlide(target, result);
        // Warm one upcoming image without changing the visible slide.
        if (!motion.matches) void loadSlide(nextIndex);
        return;
      }
    } catch {
      // An unavailable or malformed slide must not stop the remaining sequence.
    } finally {
      busy = false;
      schedule();
    }
  }

  document.addEventListener('visibilitychange', schedule);
  root.addEventListener('focusin', () => { hasFocus = true; stopTimer(); });
  root.addEventListener('focusout', event => {
    hasFocus = root.contains(event.relatedTarget);
    schedule();
  });
  seriesLink.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') { hoveringLink = true; stopTimer(); }
  });
  seriesLink.addEventListener('pointerleave', () => { hoveringLink = false; schedule(); });
  motion.addEventListener('change', schedule);
  window.addEventListener('pagehide', () => { pageActive = false; stopTimer(); });
  window.addEventListener('pageshow', () => { pageActive = true; schedule(); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { onScreen = entries[0].isIntersecting; schedule(); }, { threshold: 0 });
    observer.observe(root);
  }
  void advance();
})();
