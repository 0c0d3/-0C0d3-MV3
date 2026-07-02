// network/network-engine.js

export class NetworkEngine {
  constructor(data) {
    this.index = data || {};
  }

  toDNR() {
    const rules = [];
    let id = 1;
    const MAX_RULES = 4500;

    for (const [domain, entry] of Object.entries(this.index)) {
      if (id >= MAX_RULES) break;
      const types = Array.from(entry.types || new Set(['script', 'image', 'xmlhttprequest']));
      const resourceTypes = types.filter(t => 
        ['script','image','stylesheet','font','media','subdocument','object','ping','websocket','xmlhttprequest'].includes(t)
      );
      if (!resourceTypes.length) continue;
      rules.push({
        id: id++,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: `||${domain}^`,
          resourceTypes: resourceTypes
        }
      });
    }

    // Añadir reglas de alta prioridad
    const HIGH_PRIORITY = ['doubleclick.net', 'googleadservices.com', 'googlesyndication.com'];
    for (const domain of HIGH_PRIORITY) {
      rules.push({
        id: id++,
        priority: 2,
        action: { type: 'block' },
        condition: {
          urlFilter: `||${domain}^`,
          resourceTypes: ['script', 'image', 'xmlhttprequest', 'sub_frame']
        }
      });
    }

    return rules;
  }

  match(hostname) {
    // Retornar reglas de red para este dominio (no se usan directamente en content script)
    const result = [];
    for (const [domain, entry] of Object.entries(this.index)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        result.push(entry);
      }
    }
    return result;
  }
}