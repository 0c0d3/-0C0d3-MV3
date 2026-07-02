// content/cosmetic-loader.js
// Carga selectores cosméticos desde storage y los aplica en la página

(function() {
  'use strict';
  
  // Solo se ejecuta en el top frame
  if (window.top !== window) return;
  
  let styleElement = null;
  let currentSelectors = [];
  let observer = null;
  let applied = false;
  
  async function loadAndApplyCosmetics() {
    try {
      // Obtener el hostname actual
      const hostname = window.location.hostname;
      
      // Cargar selectores desde storage (cargados por background)
      const { cosmeticsData } = await browser.storage.local.get('cosmeticsData');
      if (!cosmeticsData) {
        console.log('[Cosmetics] No hay datos cosméticos disponibles');
        return;
      }
      
      // Buscar selectores para este dominio
      const selectors = [];
      for (const [domain, sels] of Object.entries(cosmeticsData)) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          selectors.push(...sels);
        }
      }
      
      if (!selectors.length) {
        console.log('[Cosmetics] No hay selectores para', hostname);
        return;
      }
      
      console.log('[Cosmetics] Aplicando', selectors.length, 'selectores en', hostname);
      applySelectors(selectors);
      setupObserver();
      applied = true;
    } catch (e) {
      console.error('[Cosmetics] Error:', e);
    }
  }
  
  function applySelectors(selectors) {
    if (!selectors || !selectors.length) {
      if (styleElement) {
        styleElement.remove();
        styleElement = null;
      }
      currentSelectors = [];
      return;
    }
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'adb-cosmetic-loader';
      document.documentElement.appendChild(styleElement);
    }
    
    // Generar CSS
    const css = selectors.map(s => `${s} { display: none !important; }`).join('\n');
    styleElement.textContent = css;
    currentSelectors = selectors;
  }
  
  function setupObserver() {
    if (observer) observer.disconnect();
    
    observer = new MutationObserver(() => {
      // Reaplicar si el estilo se perdió
      if (currentSelectors.length && styleElement && !styleElement.parentNode) {
        document.documentElement.appendChild(styleElement);
        const css = currentSelectors.map(s => `${s} { display: none !important; }`).join('\n');
        styleElement.textContent = css;
      }
    });
    
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
  
  // Escuchar mensajes para actualizar selectores
  browser.runtime.onMessage.addListener(msg => {
    if (msg.type === 'updateCosmetics' && msg.selectors) {
      applySelectors(msg.selectors);
      if (!observer) setupObserver();
    }
    if (msg.type === 'clearCosmetics') {
      applySelectors([]);
      if (observer) observer.disconnect();
    }
  });
  
  // Ejecutar al cargar la página
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAndApplyCosmetics);
  } else {
    loadAndApplyCosmetics();
  }
})();