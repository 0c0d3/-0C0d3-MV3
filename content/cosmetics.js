// content/cosmetics.js
(function() {
  if (window.top !== window) return;

  let styleElement = null;
  let currentSelectors = [];

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
      styleElement.id = 'engine-cosmetics';
      document.documentElement.appendChild(styleElement);
    }
    const css = selectors.map(s => `${s} { display: none !important; }`).join('\n');
    styleElement.textContent = css;
    currentSelectors = selectors;
  }

  function updateFromMap(selectorMap) {
    const hostname = window.location.hostname;
    let matched = [];
    for (const [domain, selectors] of selectorMap) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        matched = matched.concat(selectors);
      }
    }
    apply([...new Set(matched)]);
  }

  browser.runtime.onMessage.addListener(msg => {
    if (msg.type === 'updateSelectors' && msg.selectorMap) {
      updateFromMap(msg.selectorMap);
    }
  });

  browser.storage.local.get('selectorMap').then(data => {
    if (data.selectorMap) updateFromMap(data.selectorMap);
  });

  let observer = new MutationObserver(() => {
    if (currentSelectors.length && styleElement && !styleElement.parentNode) {
      document.documentElement.appendChild(styleElement);
      const css = currentSelectors.map(s => `${s} { display: none !important; }`).join('\n');
      styleElement.textContent = css;
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();