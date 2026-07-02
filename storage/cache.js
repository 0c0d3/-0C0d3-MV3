// storage/cache.js
export class CompilerCache {
  constructor() {
    this.key = 'compiled_filters';
  }

  async save(data) {
    await browser.storage.local.set({ [this.key]: data });
  }

  async load() {
    const result = await browser.storage.local.get(this.key);
    return result[this.key] || null;
  }

  async clear() {
    await browser.storage.local.remove(this.key);
  }
}