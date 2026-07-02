// engine/compiler.js
// Compila reglas parseadas en estructuras optimizadas por dominio

export class FilterCompiler {
  constructor() {
    this.networkIndex = new Map();      // dominio -> {types: Set, modifiers: Set}
    this.cosmeticIndex = new Map();     // dominio -> [selector, ...]
    this.scriptletIndex = new Map();    // dominio -> [{name, args}, ...]
    this.exceptionIndex = new Map();    // dominio -> [pattern, ...]
    this.redirectIndex = new Map();     // dominio -> [{pattern, resource}]
    this.cspIndex = new Map();          // dominio -> [{pattern, csp}]
    this.removeParamIndex = new Map();  // dominio -> [{pattern, param}]
    this.htmlIndex = new Map();         // dominio -> [{pattern, flags}]
  }

  compile(parsedRules) {
    // Limpiar índices previos
    this.networkIndex.clear();
    this.cosmeticIndex.clear();
    this.scriptletIndex.clear();
    this.exceptionIndex.clear();
    this.redirectIndex.clear();
    this.cspIndex.clear();
    this.removeParamIndex.clear();
    this.htmlIndex.clear();

    for (const rule of parsedRules) {
      if (!rule) continue;
      switch (rule.type) {
        case 'network':
          this.compileNetwork(rule);
          break;
        case 'cosmetic':
          this.compileCosmetic(rule);
          break;
        case 'scriptlet':
          this.compileScriptlet(rule);
          break;
        case 'exception':
          this.compileException(rule);
          break;
        case 'redirect':
          this.compileRedirect(rule);
          break;
        case 'csp':
          this.compileCSP(rule);
          break;
        case 'removeparam':
          this.compileRemoveParam(rule);
          break;
        case 'html':
          this.compileHtml(rule);
          break;
      }
    }

    return {
      network: this.networkIndex,
      cosmetic: this.cosmeticIndex,
      scriptlet: this.scriptletIndex,
      exception: this.exceptionIndex,
      redirect: this.redirectIndex,
      csp: this.cspIndex,
      removeparam: this.removeParamIndex,
      html: this.htmlIndex
    };
  }

  compileNetwork(rule) {
    // Extraer dominio de ||dominio^ o ||dominio
    const domain = this.extractDomain(rule.pattern);
    if (!domain) return;
    if (!this.networkIndex.has(domain)) {
      this.networkIndex.set(domain, { types: new Set(), modifiers: new Set() });
    }
    const entry = this.networkIndex.get(domain);
    for (const type of rule.resourceTypes) {
      entry.types.add(type);
    }
    for (const mod of rule.modifiers) {
      entry.modifiers.add(mod);
    }
  }

  compileCosmetic(rule) {
    const domains = rule.domains;
    for (const domain of domains) {
      if (!this.cosmeticIndex.has(domain)) {
        this.cosmeticIndex.set(domain, []);
      }
      this.cosmeticIndex.get(domain).push({
        selector: rule.selector,
        isException: rule.isException || false,
        isProcedural: rule.isProcedural || false
      });
    }
  }

  compileScriptlet(rule) {
    const domains = rule.domains;
    for (const domain of domains) {
      if (!this.scriptletIndex.has(domain)) {
        this.scriptletIndex.set(domain, []);
      }
      this.scriptletIndex.get(domain).push({
        name: rule.name,
        args: rule.args
      });
    }
  }

  compileException(rule) {
    const domain = this.extractDomain(rule.pattern);
    if (!domain) return;
    if (!this.exceptionIndex.has(domain)) {
      this.exceptionIndex.set(domain, []);
    }
    this.exceptionIndex.get(domain).push({
      pattern: rule.pattern,
      options: rule.options
    });
  }

  compileRedirect(rule) {
    const domain = this.extractDomain(rule.pattern);
    if (!domain) return;
    if (!this.redirectIndex.has(domain)) {
      this.redirectIndex.set(domain, []);
    }
    this.redirectIndex.get(domain).push({
      pattern: rule.pattern,
      resource: rule.resource
    });
  }

  compileCSP(rule) {
    const domain = this.extractDomain(rule.pattern);
    if (!domain) return;
    if (!this.cspIndex.has(domain)) {
      this.cspIndex.set(domain, []);
    }
    this.cspIndex.get(domain).push({
      pattern: rule.pattern,
      csp: rule.csp
    });
  }

  compileRemoveParam(rule) {
    const domain = this.extractDomain(rule.pattern);
    if (!domain) return;
    if (!this.removeParamIndex.has(domain)) {
      this.removeParamIndex.set(domain, []);
    }
    this.removeParamIndex.get(domain).push({
      pattern: rule.pattern,
      param: rule.param
    });
  }

  compileHtml(rule) {
    const domain = this.extractDomain(rule.pattern);
    if (!domain) return;
    if (!this.htmlIndex.has(domain)) {
      this.htmlIndex.set(domain, []);
    }
    this.htmlIndex.get(domain).push({
      pattern: rule.pattern,
      flags: rule.flags
    });
  }

  extractDomain(pattern) {
    // ||dominio^ -> dominio
    if (pattern.startsWith('||')) {
      const d = pattern.slice(2).split('^')[0];
      if (d && d.includes('.')) return d;
    }
    // ||dominio (sin ^)
    if (pattern.startsWith('||')) {
      const d = pattern.slice(2).split('/')[0];
      if (d && d.includes('.')) return d;
    }
    // .dominio
    if (pattern.startsWith('.')) {
      const d = pattern.slice(1);
      if (d && d.includes('.')) return d;
    }
    // dominio literal
    if (pattern.includes('.') && !pattern.includes('*')) {
      return pattern;
    }
    return null;
  }
}