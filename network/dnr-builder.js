// network/dnr-builder.js
export class DNRBuilder {
  constructor() { this.MAX = 4500; }

  build(networkIndex) {
    const rules = [];
    let id = 1;
    const entries = [];
    for (const [domain, rulesList] of networkIndex.entries()) {
      for (const rule of rulesList) {
        if (rule.isException) continue;
        if (!rule.urlFilter || rule.urlFilter.length < 3) continue;
        if (rule.modifiers?.redirect || rule.modifiers?.csp || rule.modifiers?.removeparam) continue;
        const condition = {
          urlFilter: rule.urlFilter,
          resourceTypes: rule.resourceTypes || ['script','image','xmlhttprequest','sub_frame','media']
        };
        if (rule.modifiers?.domain) {
          const domains = rule.modifiers.domain.split('|').map(d => d.trim()).filter(Boolean);
          const included = domains.filter(d => !d.startsWith('~'));
          const excluded = domains.filter(d => d.startsWith('~')).map(d => d.slice(1));
          if (included.length) condition.initiatorDomains = included;
          if (excluded.length) condition.excludedInitiatorDomains = excluded;
        }
        const priority = condition.initiatorDomains ? 2 : 1;
        entries.push({ id: id++, priority, action: { type: 'block' }, condition, raw: rule.raw });
      }
    }
    entries.sort((a, b) => b.priority - a.priority);
    const limited = entries.slice(0, this.MAX);
    for (let i = 0; i < limited.length; i++) limited[i].id = i + 1;
    return limited;
  }
}