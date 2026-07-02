// filters/downloader.js

export class FilterDownloader {
  constructor(urls) {
    this.urls = urls;
    this.timeout = 15000;
  }

  async downloadAll() {
    const results = await Promise.all(this.urls.map(url => this.downloadOne(url)));
    return results.filter(Boolean);
  }

  async downloadOne(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) return null;
      const text = await response.text();
      if (text.length < 100) return null;
      return text;
    } catch {
      clearTimeout(timer);
      return null;
    }
  }
}