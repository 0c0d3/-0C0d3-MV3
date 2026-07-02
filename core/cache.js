// core/cache.js
export class CompilerCache {
  constructor() { this.KEY = 'compiled_engine'; }
  async save(data) { await browser.storage.local.set({ [this.KEY]: data }); }
  async load() { const r = await browser.storage.local.get(this.KEY); return r[this.KEY] || null; }
  async clear() { await browser.storage.local.remove(this.KEY); }
}