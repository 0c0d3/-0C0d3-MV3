// engine/cache.js
// Gestión de caché y persistencia en storage.local

export class FilterCache {
  constructor() {
    this.STORAGE_KEY = 'filterEngineData';
    this._data = null;
  }

  async load() {
    if (this._data) return this._data;
    try {
      const result = await browser.storage.local.get(this.STORAGE_KEY);
      if (result && result[this.STORAGE_KEY]) {
        this._data = result[this.STORAGE_KEY];
        return this._data;
      }
    } catch (e) {
      console.warn('Cache load error:', e);
    }
    this._data = this.getDefault();
    return this._data;
  }

  async save(data) {
    this._data = data;
    try {
      await browser.storage.local.set({ [this.STORAGE_KEY]: data });
    } catch (e) {
      console.warn('Cache save error:', e);
    }
  }

  getDefault() {
    return {
      version: 1,
      network: {},
      cosmetic: {},
      scriptlet: {},
      exception: {},
      redirect: {},
      csp: {},
      removeparam: {},
      html: {},
      lastUpdate: null
    };
  }

  async clear() {
    this._data = null;
    try {
      await browser.storage.local.remove(this.STORAGE_KEY);
    } catch (e) {
      console.warn('Cache clear error:', e);
    }
  }
}