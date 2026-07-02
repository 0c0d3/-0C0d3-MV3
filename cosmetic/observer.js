// cosmetics/observer.js
// Content script - observa mutaciones y reaplica selectores

(function() {
  if (window.top !== window) return;

  let styleElement = null;
  let currentSelectors = [];
  let observer = null;

  function apply(selectors) {
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
      styleElement.id = 'adb-cosmetic-observer';
      document.documentElement.appendChild(styleElement);
    }
    const css = selectors.map(s => `${s} { display: none !important; }`).join('\n');
    styleElement.textContent = css;
    currentSelectors = selectors;
  }

  function observe() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      if (currentSelectors.length && styleElement) {
        // Reaplicar si se perdió el estilo
        if (!styleElement.parentNode) {
          document.documentElement.appendChild(styleElement);
          const css = currentSelectors.map(s => `${s} { display: none !important; }`).join('\n');
          styleElement.textContent = css;
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  browser.runtime.onMessage.addListener(msg => {
    if (msg.type === 'applyCosmetics' && msg.selectors) {
      apply(msg.selectors);
      observe();
    }
    if (msg.type === 'clearCosmetics' && msg.styleId === 'adb-cosmetic-observer') {
      apply([]);
      if (observer) observer.disconnect();
    }
  });

  // Cargar selectores guardados para esta pestaña
  browser.storage.local.get('adb-cosmetics-' + (window.top === window ? 0 : 'iframe')).then(data => {
    const key = 'adb-cosmetics-' + (window.top === window ? 0 : 'iframe');
    if (data[key]) {
      apply(data[key]);
      observe();
    }
  });

  observe();
})();