// cosmetic/cosmetic-engine.js

export class CosmeticEngine {
  constructor(data) {
    this.selectors = data || {};
  }

  getSelectors(hostname) {
    const result = [];
    for (const [domain, selectors] of Object.entries(this.selectors)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        for (const item of selectors) {
          if (!item.isException && !item.isProcedural) {
            result.push(item.selector);
          }
        }
      }
    }
    return [...new Set(result)];
  }

  // Método para serializar selectores a CSS
  toCSS(hostname) {
    const selectors = this.getSelectors(hostname);
    if (!selectors.length) return '';
    return selectors.map(s => `${s} { display: none !important; }`).join('\n');
  }
}