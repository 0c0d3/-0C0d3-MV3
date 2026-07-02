// cosmetic/injector.js
export class CosmeticInjector {
  constructor(tabId) { this.tabId = tabId; }
  async inject(selectors, proceduralRules = []) {
    if (selectors && selectors.length) {
      const css = selectors.map(s => `${s} { display: none !important; }`).join('\n');
      try { await browser.scripting.insertCSS({ target: { tabId: this.tabId }, css }); }
      catch { try { await browser.tabs.sendMessage(this.tabId, { type: 'applyCosmetics', selectors }); } catch {} }
    }
    if (proceduralRules && proceduralRules.length) {
      try { await browser.tabs.sendMessage(this.tabId, { type: 'applyProcedural', rules: proceduralRules }); } catch {}
    }
  }
}