// scriptlets/engine.js

export class ScriptletEngine {
  constructor(data) {
    this.scriptlets = data || {};
    this.registry = new Map();
    this.loadBuiltins();
  }

  loadBuiltins() {
    // Cargar scriptlets desde archivos
    import('./youtube.js').then(m => this.registry.set('youtube', m.default));
    import('./facebook.js').then(m => this.registry.set('facebook', m.default));
    import('./reddit.js').then(m => this.registry.set('reddit', m.default));
    import('./generic.js').then(m => this.registry.set('generic', m.default));
  }

  getScriptlets(hostname) {
    const result = [];
    for (const [domain, items] of Object.entries(this.scriptlets)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        result.push(...items);
      }
    }
    return result;
  }

  execute(hostname) {
    const items = this.getScriptlets(hostname);
    if (!items.length) return;
    for (const item of items) {
      const fn = this.registry.get(item.name);
      if (fn) {
        try { fn(...(item.args || [])); } catch (e) {}
      }
    }
  }
}