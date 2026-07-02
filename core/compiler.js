// core/compiler.js
export class FilterCompiler {
  constructor() {
    this.network = new Map();
    this.cosmetic = new Map();
    this.scriptlet = new Map();
    this.exceptions = new Map();
    this.procedural = new Map();
  }

  compile(parsedRules) {
    this.network.clear();
    this.cosmetic.clear();
    this.scriptlet.clear();
    this.exceptions.clear();
    this.procedural.clear();
    for (const rule of parsedRules) {
      if (!rule) continue;
      switch (rule.type) {
        case 'network': this._addNetwork(rule); break;
        case 'cosmetic': this._addCosmetic(rule); break;
        case 'scriptlet': this._addScriptlet(rule); break;
      }
    }
    return { network: this.network, cosmetic: this.cosmetic, scriptlet: this.scriptlet, exceptions: this.exceptions, procedural: this.procedural };
  }

  _addNetwork(rule) {
    const domains = rule.domains || ['*'];
    for (const d of domains) {
      if (!this.network.has(d)) this.network.set(d, []);
      this.network.get(d).push({ urlFilter: rule.urlFilter, resourceTypes: rule.resourceTypes, modifiers: rule.modifiers, isException: rule.isException || false, raw: rule.raw });
      if (rule.isException) {
        if (!this.exceptions.has(d)) this.exceptions.set(d, []);
        this.exceptions.get(d).push(rule);
      }
    }
  }

  _addCosmetic(rule) {
    const domains = rule.domains;
    for (const d of domains) {
      if (rule.isProcedural) {
        if (!this.procedural.has(d)) this.procedural.set(d, []);
        this.procedural.get(d).push(rule);
      } else {
        if (!this.cosmetic.has(d)) this.cosmetic.set(d, []);
        this.cosmetic.get(d).push(rule);
        if (rule.isException) {
          if (!this.exceptions.has(d)) this.exceptions.set(d, []);
          this.exceptions.get(d).push(rule);
        }
      }
    }
  }

  _addScriptlet(rule) {
    const domains = rule.domains;
    for (const d of domains) {
      if (!this.scriptlet.has(d)) this.scriptlet.set(d, []);
      this.scriptlet.get(d).push({ name: rule.name, args: rule.args, raw: rule.raw });
    }
  }
}