(() => {
  if (window.top !== window) return;

  const YOUTUBE_SELECTORS = [
    '.ytp-ad-player-overlay',
    '.ytd-display-ad-renderer',
    '.ytd-promoted-video-renderer',
    '.ytd-companion-slot-renderer',
    '.ytd-action-companion-ad-renderer',
    '.ytd-ad-slot-renderer',
    '.video-ads',
    '.ad-showing',
    '.ytp-ad-image-overlay',
    '.ytp-ad-text-overlay',
    '.ytp-ad-simple-ad-badge',
    '.ytp-ad-module',
    '#player-ads',
    '#merch-shelf',
    '#watch7-sidebar-ads'
  ];

  let selectors = [];
  let style = null;

  function applyCosmetics(rules) {
    selectors = [];
    if (window.location.hostname.includes('youtube.com') || window.location.hostname.includes('youtu.be')) {
      selectors.push(...YOUTUBE_SELECTORS);
    }
    for (const raw of rules || []) {
      if (typeof raw !== 'string' || !raw.includes('##')) continue;
      const [, sel] = raw.split('##');
      if (sel) {
        const s = sel.trim();
        if (s === '.ad-container' || s === '.ad' || s === '.ads') continue;
        selectors.push(s);
      }
    }
    if (!selectors.length) return;

    if (!style) {
      style = document.createElement('style');
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = selectors.map(s => `${s} { display: none !important; }`).join('\n');

    const applyToNode = (node) => {
      if (!node || node.nodeType !== 1) return;
      try {
        for (const sel of selectors) {
          if (node.matches && node.matches(sel)) node.style.display = 'none';
          if (node.querySelectorAll) node.querySelectorAll(sel).forEach(el => el.style.display = 'none');
        }
      } catch (e) {}
      if (node.shadowRoot) {
        node.shadowRoot.querySelectorAll('*').forEach(applyToNode);
      }
    };

    requestAnimationFrame(() => {
      document.querySelectorAll(selectors.join(',')).forEach(el => el.style.display = 'none');
    });

    if (!window.__adbObserver) {
      window.__adbObserver = new MutationObserver(muts => {
        for (const mut of muts) for (const n of mut.addedNodes) { if (n.nodeType === 1) applyToNode(n); }
      });
      window.__adbObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  browser.runtime.onMessage.addListener(msg => { if (msg.type === 'applyCosmetics') applyCosmetics(msg.rules || []); });
  browser.storage.local.get('cosmetics').then(data => { if (data.cosmetics) applyCosmetics(data.cosmetics); });
})();