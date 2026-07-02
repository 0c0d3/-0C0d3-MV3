// core/parser.js
export class FilterParser {
  parseLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) return null;
    if (trimmed.startsWith('@@')) return this._parseNetwork(trimmed.slice(2), true);
    if (trimmed.includes('##') || trimmed.includes('#@#') || trimmed.includes('#?#') ||
        trimmed.includes('#%#') || trimmed.includes('#$#')) {
      return this._parseCosmetic(trimmed);
    }
    if (trimmed.includes('+js(')) return this._parseScriptlet(trimmed);
    return this._parseNetwork(trimmed, false);
  }

  _parseNetwork(pattern, isException) {
    const parts = pattern.split('$');
    const rulePart = parts[0];
    const optionsPart = parts[1] || '';
    let domain = null;
    let urlFilter = rulePart;
    if (rulePart.startsWith('||')) {
      const d = rulePart.slice(2).split(/[\^\/\?]/)[0];
      if (d && d.includes('.')) { domain = d; urlFilter = `||${d}^`; }
    } else if (rulePart.includes('.')) {
      const d = rulePart.split('/')[0];
      if (d && d.includes('.')) domain = d;
    }
    const options = {};
    const resourceTypes = [];
    let domainOption = null;
    if (optionsPart) {
      for (const opt of optionsPart.split(',')) {
        const [key, value] = opt.split('=');
        options[key] = value || true;
        if (['script','image','stylesheet','font','media','subdocument','object','ping','websocket','xmlhttprequest','other'].includes(key)) {
          resourceTypes.push(key);
        }
        if (key === 'domain') {
          domainOption = value.split('|').map(d => d.trim()).filter(Boolean);
        }
      }
    }
    const finalResourceTypes = resourceTypes.length ? resourceTypes : ['script','image','xmlhttprequest','sub_frame','media'];
    let domains = [];
    if (domainOption) domains = domainOption.filter(d => !d.startsWith('~')).map(d => d);
    else if (domain) domains = [domain];
    else domains = ['*'];
    return { type: 'network', urlFilter, domain, domains, resourceTypes: finalResourceTypes, isException, modifiers: options, raw: trimmed };
  }

  _parseCosmetic(line) {
    const separators = ['##', '#@#', '#?#', '#%#', '#$#'];
    for (const sep of separators) {
      if (line.includes(sep)) {
        const [domainPart, selectorPart] = line.split(sep);
        const domains = domainPart.split(',').map(d => d.trim()).filter(Boolean);
        const selector = selectorPart.trim();
        const isException = sep === '#@#';
        const isProcedural = sep === '#?#' || sep === '#%#' || sep === '#$#';
        return { type: 'cosmetic', domains: domains.length ? domains : ['*'], selector, isException, isProcedural, sep, raw: line };
      }
    }
    return null;
  }

  _parseScriptlet(line) {
    const match = line.match(/\+js\(([^,)]+)(?:,\s*([^)]*))?\)/);
    if (!match) return null;
    const name = match[1].trim();
    const args = match[2] ? match[2].split(',').map(a => a.trim()) : [];
    let domains = ['*'];
    if (line.includes('##')) {
      const [d] = line.split('##');
      if (d && d !== '*') domains = d.split(',').map(x => x.trim()).filter(Boolean);
    }
    return { type: 'scriptlet', domains, name, args, raw: line };
  }
}