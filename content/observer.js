// content/observer.js - Carga índices por dominio
(function() {
  if (window.top !== window) return;

  let styleElement = null;
  let currentSelectors = [];
  let observer = null;
  let appliedHostname = '';
  let appliedUrl = '';

  let indexCache = null;
  let fileCache = {};

  async function loadIndex() {
    if (indexCache) return indexCache;
    try {
      const url = browser.runtime.getURL('assets/cosmetic-index.json');
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      indexCache = await resp.json();
      return indexCache;
    } catch (e) {
      console.warn('[Cosmetics] Error cargando índice:', e);
      return {};
    }
  }

  async function loadFile(filename) {
    if (fileCache[filename]) return fileCache[filename];
    try {
      const url = browser.runtime.getURL(`assets/cosmetics/${filename}`);
      const resp = await fetch(url);
      if (!resp.ok) return [];
      const data = await resp.json();
      fileCache[filename] = data;
      return data;
    } catch (e) {
      console.warn(`[Cosmetics] Error cargando ${filename}:`, e);
      return [];
    }
  }

  async function loadSelectorsForDomain(hostname) {
    const index = await loadIndex();
    let files = [];

    // Buscar coincidencia exacta
    if (index[hostname]) files = files.concat(index[hostname]);

    // Buscar dominios padre (sub.example.com -> example.com)
    const parts = hostname.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(i).join('.');
      if (index[parent]) files = files.concat(index[parent]);
    }

    // Si no hay nada, usar reglas globales '*'
    if (files.length === 0 && index['*']) {
      files = files.concat(index['*']);
    }

    if (!files.length) return [];

    const all = [];
    for (const file of files) {
      const selectors = await loadFile(file);
      for (const sel of selectors) {
        if (!all.includes(sel)) all.push(sel);
      }
    }
    return all;
  }

  function applySelectors(selectors) {
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }
    if (!selectors || !selectors.length) {
      currentSelectors = [];
      return;
    }
    styleElement = document.createElement('style');
    styleElement.id = 'adb-cosmetic';
    styleElement.textContent = selectors.map(s => `${s} { display: none !important; }`).join('\n');
    (document.head || document.documentElement).appendChild(styleElement);
    currentSelectors = selectors;
  }

  function startObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      if (currentSelectors.length && styleElement && !styleElement.parentNode) {
        (document.head || document.documentElement).appendChild(styleElement);
      }
    });
    observer.observe(document.head || document.documentElement, { childList: true, subtree: true });
  }

  // SPA detection
  let spaTimeout;
  function handleSPANavigation() {
    clearTimeout(spaTimeout);
    spaTimeout = setTimeout(() => {
      if (location.hostname !== appliedHostname || location.href !== appliedUrl) {
        appliedUrl = '';
        init();
      }
    }, 300);
  }
  window.addEventListener('popstate', handleSPANavigation);
  const _push = history.pushState; history.pushState = function(...a){ _push.apply(this,a); handleSPANavigation(); };
  const _replace = history.replaceState; history.replaceState = function(...a){ _replace.apply(this,a); handleSPANavigation(); };

  async function init() {
    const hostname = location.hostname;
    const url = location.href;
    if (hostname === appliedHostname && url === appliedUrl) return;
    appliedHostname = hostname;
    appliedUrl = url;

    const selectors = await loadSelectorsForDomain(hostname);
    applySelectors(selectors);
    if (selectors.length) startObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
