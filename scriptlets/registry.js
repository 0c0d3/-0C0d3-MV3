// scriptlets/registry.js
export const SCRIPTLETS = {
  'remove-youtube-ads': function() {
    try {
      const origParse = JSON.parse;
      if (origParse && !origParse.__adb_original) {
        JSON.parse = function(text, reviver) {
          const obj = origParse(text, reviver);
          if (obj && typeof obj === 'object') {
            const adProps = ['adPlacements','playerAds','adSlots','adBreak','linearAds','adParams','adInfo','skippableAds'];
            function prune(o) {
              if (!o || typeof o !== 'object') return;
              for (const key of Object.keys(o)) {
                if (adProps.includes(key)) delete o[key];
                else if (typeof o[key] === 'object') prune(o[key]);
              }
            }
            prune(obj);
          }
          return obj;
        };
        JSON.parse.__adb_original = true;
      }
    } catch(e) {}
  },
  'block-ad-fetch': function() {
    try {
      const origFetch = window.fetch;
      if (origFetch && !origFetch.__adb_original) {
        window.fetch = function(url, ...args) {
          const urlStr = typeof url === 'string' ? url : url?.url || '';
          if (urlStr.includes('get_video_info') || urlStr.includes('ad_break') || urlStr.includes('pagead')) {
            return Promise.reject(new Error('Blocked'));
          }
          return origFetch.apply(this, [url, ...args]);
        };
        window.fetch.__adb_original = true;
      }
    } catch(e) {}
  },
  'remove-reddit-login': function() {
    function clean() {
      const selectors = ['div[role="dialog"]','._2SdH','._1hI6','[data-testid="login-prompt"]','.login-prompt'];
      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach(el => {
          if (el.textContent.includes('Continue with Google') || el.textContent.includes('Usa tu Cuenta de Google')) {
            el.remove();
          }
        });
      }
    }
    clean();
    setInterval(clean, 2000);
  }
};