// core/matcher.js
export class FilterMatcher {
  constructor(compiled) {
    this.network = compiled.network || new Map();
    this.cosmetic = compiled.cosmetic || new Map();
    this.scriptlet = compiled.scriptlet || new Map();
    this.exceptions = compiled.exceptions || new Map();
    this.procedural = compiled.procedural || new Map();
    this._cache = new Map();
    this._buildIndex();
  }

  _buildIndex() {
    this._index = new Map();
    const allDomains = new Set([...this.network.keys(), ...this.cosmetic.keys(), ...this.scriptlet.keys(), ...this.exceptions.keys(), ...this.procedural.keys()]);
    for (const domain of allDomains) {
      this._index.set(domain, {
        network: this.network.get(domain) || [],
        cosmetic: this.cosmetic.get(domain) || [],
        scriptlet: this.scriptlet.get(domain) || [],
        exceptions: this.exceptions.get(domain) || [],
        procedural: this.procedural.get(domain) || []
      });
    }
  }

  getForDomain(hostname) {
    if (this._cache.has(hostname)) return this._cache.get(hostname);
    const result = { network: [], cosmetic: [], scriptlet: [], exceptions: [], procedural: [] };
    const parts = hostname.split('.');
    for (let i = 0; i < parts.length; i++) {
      const d = parts.slice(i).join('.');
      if (this._index.has(d)) {
        const data = this._index.get(d);
        result.network.push(...data.network);
        result.cosmetic.push(...data.cosmetic);
        result.scriptlet.push(...data.scriptlet);
        result.exceptions.push(...data.exceptions);
        result.procedural.push(...data.procedural);
      }
    }
    if (this._index.has('*')) {
      const data = this._index.get('*');
      result.network.push(...data.network);
      result.cosmetic.push(...data.cosmetic);
      result.scriptlet.push(...data.scriptlet);
      result.exceptions.push(...data.exceptions);
      result.procedural.push(...data.procedural);
    }
    result.network = [...new Set(result.network)];
    result.cosmetic = [...new Set(result.cosmetic)];
    result.scriptlet = [...new Set(result.scriptlet)];
    result.exceptions = [...new Set(result.exceptions)];
    result.procedural = [...new Set(result.procedural)];
    this._cache.set(hostname, result);
    return result;
  }

  getCosmeticSelectors(hostname) {
    const data = this.getForDomain(hostname);
    return data.cosmetic.filter(c => !c.isException && !c.isProcedural).map(c => c.selector);
  }

  getScriptlets(hostname) {
    return this.getForDomain(hostname).scriptlet;
  }

  clearCache() { this._cache.clear(); }
}