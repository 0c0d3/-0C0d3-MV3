// engine/matcher.js
// Motor de coincidencia rápido usando Map por dominio

export class FilterMatcher {
  constructor(compiledData) {
    this.network = compiledData.network || new Map();
    this.cosmetic = compiledData.cosmetic || new Map();
    this.scriptlet = compiledData.scriptlet || new Map();
    this.exception = compiledData.exception || new Map();
    this.redirect = compiledData.redirect || new Map();
    this.csp = compiledData.csp || new Map();
    this.removeparam = compiledData.removeparam || new Map();
    this.html = compiledData.html || new Map();

    // Caché de dominios
    this._cache = new Map();
  }

  getDomainRules(hostname) {
    if (this._cache.has(hostname)) return this._cache.get(hostname);
    const rules = {
      network: [],
      cosmetic: [],
      scriptlet: [],
      exception: [],
      redirect: [],
      csp: [],
      removeparam: [],
      html: []
    };

    // Buscar en todos los índices por coincidencia de dominio (exacta o subdominio)
    const domains = this.getAllMatchingDomains(hostname);
    for (const domain of domains) {
      const net = this.network.get(domain);
      if (net) rules.network.push(net);
      const cos = this.cosmetic.get(domain);
      if (cos) rules.cosmetic.push(cos);
      const scr = this.scriptlet.get(domain);
      if (scr) rules.scriptlet.push(scr);
      const exc = this.exception.get(domain);
      if (exc) rules.exception.push(exc);
      const red = this.redirect.get(domain);
      if (red) rules.redirect.push(red);
      const cspRules = this.csp.get(domain);
      if (cspRules) rules.csp.push(cspRules);
      const rmp = this.removeparam.get(domain);
      if (rmp) rules.removeparam.push(rmp);
      const htmlRules = this.html.get(domain);
      if (htmlRules) rules.html.push(htmlRules);
    }

    this._cache.set(hostname, rules);
    return rules;
  }

  getAllMatchingDomains(hostname) {
    const parts = hostname.split('.');
    const domains = [];
    for (let i = 0; i < parts.length - 1; i++) {
      const d = parts.slice(i).join('.');
      if (this.network.has(d) || this.cosmetic.has(d) || this.scriptlet.has(d) ||
          this.exception.has(d) || this.redirect.has(d) || this.csp.has(d) ||
          this.removeparam.has(d) || this.html.has(d)) {
        domains.push(d);
      }
    }
    // Añadir el dominio completo
    if (domains.indexOf(hostname) === -1 && 
        (this.network.has(hostname) || this.cosmetic.has(hostname) || this.scriptlet.has(hostname))) {
      domains.push(hostname);
    }
    return domains;
  }

  getNetworkRules(hostname) {
    return this.getDomainRules(hostname).network;
  }

  getCosmeticSelectors(hostname) {
    const rules = this.getDomainRules(hostname);
    const selectors = [];
    for (const cos of rules.cosmetic) {
      if (Array.isArray(cos)) {
        for (const item of cos) {
          if (!item.isException && !item.isProcedural) {
            selectors.push(item.selector);
          }
        }
      }
    }
    return selectors;
  }

  getScriptlets(hostname) {
    const rules = this.getDomainRules(hostname);
    const scriptlets = [];
    for (const scr of rules.scriptlet) {
      if (Array.isArray(scr)) {
        scriptlets.push(...scr);
      }
    }
    return scriptlets;
  }

  clearCache() {
    this._cache.clear();
  }
}