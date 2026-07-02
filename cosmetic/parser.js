// cosmetics/parser.js
// Especializado en reglas cosméticas, reutiliza el parser general

import { FilterParser } from '../engine/parser.js';

export class CosmeticParser {
  constructor() {
    this.parser = new FilterParser();
  }

  parseLines(texts) {
    const map = new Map(); // dominio -> [selector, ...]
    for (const text of texts) {
      for (const line of text.split('\n')) {
        const rule = this.parser.parseLine(line);
        if (rule && rule.type === 'cosmetic') {
          const domains = rule.domains;
          for (const domain of domains) {
            if (!map.has(domain)) map.set(domain, []);
            if (!map.get(domain).includes(rule.selector)) {
              map.get(domain).push(rule.selector);
            }
          }
        }
      }
    }
    return map;
  }
}