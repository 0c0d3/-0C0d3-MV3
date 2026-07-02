// cosmetic/procedural.js
export class ProceduralEngine {
  constructor() {
    this._processed = new WeakSet();
  }

  applyRules(proceduralRules) {
    if (!proceduralRules || !proceduralRules.length) return;

    for (const rule of proceduralRules) {
      if (rule.isException) continue;
      try {
        this._applyProceduralSelector(rule.selector);
      } catch (e) {
        // Ignorar errores en selectores procedurales
      }
    }
  }

  _applyProceduralSelector(selector) {
    // :has() - selecciona elementos que contienen un selector específico
    if (selector.includes(':has(')) {
      const match = selector.match(/(.*?):has\((.*?)\)/);
      if (match) {
        const base = match[1].trim() || '*';
        const inner = match[2].trim();
        const elements = document.querySelectorAll(base);
        for (const el of elements) {
          if (el.querySelector(inner)) {
            el.style.display = 'none';
          }
        }
        return;
      }
    }

    // :upward() - selecciona el primer ancestro que coincide
    if (selector.includes(':upward(')) {
      const match = selector.match(/(.*?):upward\((.*?)\)/);
      if (match) {
        const base = match[1].trim();
        const ancestor = match[2].trim();
        const elements = document.querySelectorAll(base);
        for (const el of elements) {
          const parent = el.closest(ancestor);
          if (parent) parent.style.display = 'none';
        }
        return;
      }
    }

    // :matches-css() - selecciona elementos con un estilo específico
    if (selector.includes(':matches-css(')) {
      const match = selector.match(/(.*?):matches-css\((.*?)\)/);
      if (match) {
        const base = match[1].trim() || '*';
        const cssRule = match[2].trim();
        const [prop, value] = cssRule.split(':').map(s => s.trim());
        const elements = document.querySelectorAll(base);
        for (const el of elements) {
          const style = window.getComputedStyle(el);
          if (style[prop] === value) {
            el.style.display = 'none';
          }
        }
        return;
      }
    }

    // :xpath() - soporte básico para XPath
    if (selector.includes(':xpath(')) {
      const match = selector.match(/:xpath\((.*?)\)/);
      if (match) {
        const xpath = match[1].trim();
        const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0; i < result.snapshotLength; i++) {
          const el = result.snapshotItem(i);
          if (el && el.nodeType === 1) {
            el.style.display = 'none';
          }
        }
        return;
      }
    }

    // :remove() - elimina el elemento
    if (selector.includes(':remove')) {
      const base = selector.replace(':remove', '').trim() || '*';
      const elements = document.querySelectorAll(base);
      for (const el of elements) {
        el.remove();
      }
      return;
    }

    // Fallback: intentar como selector CSS normal
    try {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        el.style.display = 'none';
      }
    } catch (e) {
      // Si falla, ignorar
    }
  }
}