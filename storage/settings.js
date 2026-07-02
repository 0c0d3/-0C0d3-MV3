// storage/settings.js

export class Settings {
  constructor() {
    this.defaults = {
      enabled: true,
      updateInterval: 120,
      cosmeticFiltering: true,
      scriptletFiltering: true,
      dnrEnabled: true
    };
  }

  async load() {
    const data = await browser.storage.local.get('settings');
    if (data.settings) {
      return { ...this.defaults, ...data.settings };
    }
    return this.defaults;
  }

  async save(settings) {
    await browser.storage.local.set({ settings });
  }
}