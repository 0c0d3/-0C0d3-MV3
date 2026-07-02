// engine/parser.js
// Parser de líneas de filtro ABP/AdGuard
// Reconoce: network, cosmetic, scriptlet, exception, redirect, csp, removeparam, html

export class FilterParser {
  constructor() {
    this.types = {
      NETWORK: 'network',
      COSMETIC: 'cosmetic',
      SCRIPTLET: 'scriptlet',
      EXCEPTION: 'exception',
      REDIRECT: 'redirect',
      CSP: 'csp',
      REMOVEPARAM: 'removeparam',
      HTML: 'html',
      HEADER: 'header'
    };
  }

  parseLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) return null;

    // 1. Excepciones: @@
    if (trimmed.startsWith('@@')) {
      return this.parseException(trimmed.slice(2));
    }

    // 2. Cosméticos: ##, #@#, #?#, #%#, #$#
    if (trimmed.includes('##') || trimmed.includes('#@#') || trimmed.includes('#?#') || 
        trimmed.includes('#%#') || trimmed.includes('#$#')) {
      return this.parseCosmetic(trimmed);
    }

    // 3. Scriptlets: +js(...)
    if (trimmed.includes('+js(')) {
      return this.parseScriptlet(trimmed);
    }

    // 4. Redirect: $redirect
    if (trimmed.includes('$redirect')) {
      return this.parseRedirect(trimmed);
    }

    // 5. CSP: $csp
    if (trimmed.includes('$csp')) {
      return this.parseCSP(trimmed);
    }

    // 6. RemoveParam: $removeparam
    if (trimmed.includes('$removeparam')) {
      return this.parseRemoveParam(trimmed);
    }

    // 7. HTML filtering: $elemhide, $ghide, $generichide
    if (trimmed.includes('$elemhide') || trimmed.includes('$ghide') || trimmed.includes('$generichide')) {
      return this.parseHtmlFilter(trimmed);
    }

    // 8. Network (por defecto)
    return this.parseNetwork(trimmed);
  }

  parseException(line) {
    // @@||dominio^... o @@||dominio^$...
    const parts = line.split('$');
    const pattern = parts[0];
    const options = parts[1] || '';
    return {
      type: 'exception',
      pattern: pattern,
      options: options,
      raw: line
    };
  }

  parseCosmetic(line) {
    // Buscar el separador: ##, #@#, #?#, #%#, #$#
    const separators = ['##', '#@#', '#?#', '#%#', '#$#'];
    for (const sep of separators) {
      if (line.includes(sep)) {
        const [domainPart, selectorPart] = line.split(sep);
        const domains = domainPart.split(',').map(d => d.trim()).filter(Boolean);
        const selector = selectorPart.trim();
        const isException = sep === '#@#';
        const isProcedural = sep === '#?#' || sep === '#%#' || sep === '#$#';
        return {
          type: 'cosmetic',
          domains: domains.length ? domains : ['*'],
          selector: selector,
          isException: isException,
          isProcedural: isProcedural,
          separator: sep,
          raw: line
        };
      }
    }
    return null;
  }

  parseScriptlet(line) {
    // +js(scriptlet-name, arg1, arg2)
    const match = line.match(/\+js\(([^,)]+)(?:,\s*([^)]*))?\)/);
    if (!match) return null;
    const name = match[1].trim();
    const args = match[2] ? match[2].split(',').map(a => a.trim()) : [];
    // Extraer dominio si existe
    let domains = ['*'];
    if (line.includes('##')) {
      const [d] = line.split('##');
      if (d && d !== '*') domains = d.split(',').map(x => x.trim()).filter(Boolean);
    }
    return {
      type: 'scriptlet',
      domains: domains,
      name: name,
      args: args,
      raw: line
    };
  }

  parseRedirect(line) {
    // ||dominio^$redirect=resource
    const parts = line.split('$');
    if (parts.length < 2) return null;
    const options = parts[1];
    const match = options.match(/redirect=([^,]+)/);
    if (!match) return null;
    const pattern = parts[0];
    const resource = match[1];
    return {
      type: 'redirect',
      pattern: pattern,
      resource: resource,
      options: options,
      raw: line
    };
  }

  parseCSP(line) {
    // ||dominio^$csp=...
    const parts = line.split('$');
    if (parts.length < 2) return null;
    const options = parts[1];
    const match = options.match(/csp=([^,]+)/);
    if (!match) return null;
    const pattern = parts[0];
    const csp = match[1];
    return {
      type: 'csp',
      pattern: pattern,
      csp: csp,
      options: options,
      raw: line
    };
  }

  parseRemoveParam(line) {
    // ||dominio^$removeparam=...
    const parts = line.split('$');
    if (parts.length < 2) return null;
    const options = parts[1];
    const match = options.match(/removeparam=([^,]+)/);
    if (!match) return null;
    const pattern = parts[0];
    const param = match[1];
    return {
      type: 'removeparam',
      pattern: pattern,
      param: param,
      options: options,
      raw: line
    };
  }

  parseHtmlFilter(line) {
    // ||dominio^$elemhide,generichide,ghide
    const parts = line.split('$');
    if (parts.length < 2) return null;
    const pattern = parts[0];
    const options = parts[1];
    const flags = options.split(',').filter(o => ['elemhide','generichide','ghide'].includes(o));
    return {
      type: 'html',
      pattern: pattern,
      flags: flags,
      options: options,
      raw: line
    };
  }

  parseNetwork(line) {
    // ||dominio^$script,image
    const parts = line.split('$');
    const pattern = parts[0];
    const options = parts[1] || '';
    const resourceTypes = options.split(',').filter(o => 
      ['script','image','stylesheet','font','media','subdocument','object','ping','websocket','xmlhttprequest','other'].includes(o)
    );
    const modifiers = options.split(',').filter(o => 
      !['script','image','stylesheet','font','media','subdocument','object','ping','websocket','xmlhttprequest','other'].includes(o)
    );
    return {
      type: 'network',
      pattern: pattern,
      resourceTypes: resourceTypes,
      modifiers: modifiers,
      options: options,
      raw: line
    };
  }
}