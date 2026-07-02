// content/observer.js - Aplica selectores cosméticos con depuración
(function() {
  if (window.top !== window) return;

  let styleElement = null;
  let currentSelectors = [];
  let observer = null;
  let appliedHostname = '';

  // Cargar selectores desde el archivo generado por build.js
  async function loadCosmetics() {
    try {
      const url = browser.runtime.getURL('assets/cosmetics.json');
      const response = await fetch(url);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      return data;
    } catch (e) {
      console.warn('[Cosmetics] No se pudo cargar cosmetics.json:', e);
      return {};
    }
  }

  // Obtener selectores para el dominio actual
  function getSelectorsForDomain(cosmetics, hostname) {
    const result = [];
    for (const [domain, selectors] of Object.entries(cosmetics)) {
      if (domain === '*' || hostname === domain || hostname.endsWith('.' + domain)) {
        result.push(...selectors);
      }
    }
    return [...new Set(result)];
  }

  // Aplicar selectores mediante CSS
  function applySelectors(selectors) {
    if (!selectors || !selectors.length) {
      if (styleElement) {
        styleElement.remove();
        styleElement = null;
      }
      currentSelectors = [];
      console.log('[Cosmetics] Selectores eliminados');
      return;
    }

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'adb-cosmetic-observer';
      document.documentElement.appendChild(styleElement);
    }

    const css = selectors.map(s => `${s} { display: none !important; }`).join('\n');
    styleElement.textContent = css;
    currentSelectors = selectors;
    console.log(`[Cosmetics] Aplicados ${selectors.length} selectores`);
  }

  // Observar cambios en el DOM para reaplicar (por si el estilo se pierde)
  function startObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      if (currentSelectors.length && styleElement && !styleElement.parentNode) {
        document.documentElement.appendChild(styleElement);
        const css = currentSelectors.map(s => `${s} { display: none !important; }`).join('\n');
        styleElement.textContent = css;
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Inicializar
  async function init() {
    const hostname = window.location.hostname;
    if (hostname === appliedHostname) return; // Ya aplicado
    appliedHostname = hostname;

    const cosmetics = await loadCosmetics();
    const selectors = getSelectorsForDomain(cosmetics, hostname);
    if (selectors.length > 0) {
      applySelectors(selectors);
      startObserver();
    } else {
      console.log(`[Cosmetics] No hay selectores para ${hostname}`);
      applySelectors([]);
    }

    // Escuchar mensajes para actualizar selectores (opcional)
    browser.runtime.onMessage.addListener(msg => {
      if (msg.type === 'updateCosmetics' && msg.selectors) {
        applySelectors(msg.selectors);
      }
      if (msg.type === 'clearCosmetics' && msg.styleId === 'adb-cosmetic-observer') {
        applySelectors([]);
        if (observer) observer.disconnect();
      }
    });
  }

  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // También se ejecuta al cambiar de página (SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      appliedHostname = '';
      setTimeout(init, 500);
    }
  }).observe(document, { subtree: true, childList: true });
})();