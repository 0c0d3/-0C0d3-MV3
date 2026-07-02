// storage/filters.db.js
// Simula una base de datos usando storage.local con claves separadas

export class FiltersDB {
  constructor() {
    this.prefix = 'filter_db_';
  }

  async get(key) {
    const fullKey = this.prefix + key;
    const result = await browser.storage.local.get(fullKey);
    return result[fullKey] || null;
  }

  async set(key, value) {
    const fullKey = this.prefix + key;
    await browser.storage.local.set({ [fullKey]: value });
  }

  async remove(key) {
    const fullKey = this.prefix + key;
    await browser.storage.local.remove(fullKey);
  }

  async clear() {
    const keys = await browser.storage.local.get(null);
    const toRemove = Object.keys(keys).filter(k => k.startsWith(this.prefix));
    if (toRemove.length) await browser.storage.local.remove(toRemove);
  }
}