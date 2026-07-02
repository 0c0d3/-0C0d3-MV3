// filters/compiler.js

export class FilterCompiler {
  compile(parsed) {
    const network = new Map();
    const cosmetic = new Map();
    const scriptlets = new Map();
    const exceptions = new Map();

    for (const rule of parsed) {
      if (!rule) continue;
      switch (rule.type) {
        case 'network':
          this.compileNetwork(rule, network);
          break;
        case 'cosmetic':
          this.compileCosmetic(rule, cosmetic);
          break;
        case 'scriptlet':
          this.compileScriptlet(rule, scriptlets);
          break;
        case 'exception':
          this.compileException(rule, exceptions);
          break;
        default:
          break;
      }
    }

    // Convertir Maps a objetos para serialización
    return {
      network: this.mapToObject(network),
      cosmetic: this.mapToObject(cosmetic),
      scriptlets: this.mapToObject(scriptlets),
      exceptions: this.mapToObject(exceptions)
    };
  }

  compileNetwork(rule, map) {
    const domain = this.extractDomain(rule.pattern);
    if (!domain) return;
    if (!map.has(domain)) map.set(domain, { types: new Set(), modifiers: new Set() });
    const entry = map.get(domain);
    for (const type of rule.resourceTypes || []) entry.types.add(type);
    for (const mod of rule.modifiers || []) entry.modifiers.add(mod);
  }

  compileCosmetic(rule, map) {
    const domains = rule.domains || ['*'];
    for (const domain of domains) {
      if (domain === '*') continue;
      if (!map.has(domain)) map.set(domain, []);
      map.get(domain).push({
        selector: rule.selector,
        isException: rule.isException || false,
        isProcedural: rule.isProcedural || false
      });
    }
  }

  compileScriptlet(rule, map) {
    const domains = rule.domains || ['*'];
    for (const domain of domains) {
      if (domain === '*') continue;
      if (!map.has(domain)) map.set(domain, []);
      map.get(domain).push({
        name: rule.name,
        args: rule.args || []
      });
    }
  }

  compileException(rule, map) {
    const domain = this.extractDomain(rule.pattern);
    if (!domain) return;
    if (!map.has(domain)) map.set(domain, []);
    map.get(domain).push({
      pattern: rule.pattern,
      options: rule.options || ''
    });
  }

  extractDomain(pattern) {
    if (pattern.startsWith('||')) {
      const d = pattern.slice(2).split('^')[0];
      if (d && d.includes('.')) return d;
    }
    if (pattern.includes('.') && !pattern.includes('*')) {
      return pattern;
    }
    return null;
  }

  mapToObject(map) {
    const obj = {};
    for (const [key, value] of map.entries()) {
      obj[key] = value;
    }
    return obj;
  }
}