(() => {
  if (window.top !== window) return;

  const SCRIPTLETS = {
    'abort-on-property-read': (chain) => { /* … */ },
    'abort-on-property-write': (chain) => { /* … */ },
    'set-constant': (name, value) => { window[name] = value; },
    'json-prune': (chain) => { /* … */ },

    // ── Ahora solo oculta elementos, no toca JSON ──────────────
    'block-youtube-ads': () => {
      const host = window.location.hostname;
      if (!host.includes('youtube.com') && !host.includes('youtu.be')) return;

      const adSelectors = [
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

      function removeAds() {
        for (const sel of adSelectors) {
          document.querySelectorAll(sel).forEach(el => el.remove());
        }
        if (!document.getElementById('adb-style')) {
          const s = document.createElement('style');
          s.id = 'adb-style';
          s.textContent = adSelectors.map(x => `${x}{display:none!important}`).join('');
          (document.head || document.documentElement).appendChild(s);
        }
      }

      removeAds();
      const obs = new MutationObserver(removeAds);
      obs.observe(document.documentElement, { childList: true, subtree: true });
      window.addEventListener('beforeunload', () => obs.disconnect());
    },

    'no-ga': () => { /* … */ }
  };

  function executeScriptlets(rules) {
    for (const rule of rules) {
      if (!rule || !rule.code) continue;
      const domains = rule.domains || ['*'];
      const currentHost = window.location.hostname;
      if (!domains.includes('*') && !domains.some(d => currentHost.includes(d))) continue;

      const [funcName, ...args] = rule.code.split(' ');
      if (SCRIPTLETS[funcName]) {
        try { SCRIPTLETS[funcName](...args); } catch (e) {}
      }
    }
  }

  browser.runtime.onMessage.addListener(msg => { if (msg.type === 'applyScriptlets') executeScriptlets(msg.rules || []); });
  browser.storage.local.get('scriptlets').then(data => { if (data && data.scriptlets) executeScriptlets(data.scriptlets); });
})();