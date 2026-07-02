// engine/database.js

import { FilterParser } from './parser.js';
import { FilterCompiler } from './compiler.js';
import { FilterMatcher } from './matcher.js';
import { FilterCache } from './cache.js';

export class FilterDatabase {
  constructor() {
    this.parser = new FilterParser();
    this.compiler = new FilterCompiler();
    this.cache = new FilterCache();
    this.matcher = null;
    this._ready = false;
  }

  async initialize() {
    const cached = await this.cache.load();
    if (cached && cached.lastUpdate) {
      this.matcher = new FilterMatcher({
        network: new Map(Object.entries(cached.network || {})),
        cosmetic: new Map(Object.entries(cached.cosmetic || {})),
        scriptlet: new Map(Object.entries(cached.scriptlet || {})),
        exception: new Map(Object.entries(cached.exception || {})),
        redirect: new Map(Object.entries(cached.redirect || {})),
        csp: new Map(Object.entries(cached.csp || {})),
        removeparam: new Map(Object.entries(cached.removeparam || {})),
        html: new Map(Object.entries(cached.html || {}))
      });
      this._ready = true;
      return true;
    }
    return false;
  }

  async buildFromTexts(texts) {
    const parsedRules = [];
    for (const text of texts) {
      for (const line of text.split('\n')) {
        const rule = this.parser.parseLine(line);
        if (rule) parsedRules.push(rule);
      }
    }

    const compiled = this.compiler.compile(parsedRules);

    const data = {
      version: 1,
      network: this.mapToObject(compiled.network),
      cosmetic: this.mapToObject(compiled.cosmetic),
      scriptlet: this.mapToObject(compiled.scriptlet),
      exception: this.mapToObject(compiled.exception),
      redirect: this.mapToObject(compiled.redirect),
      csp: this.mapToObject(compiled.csp),
      removeparam: this.mapToObject(compiled.removeparam),
      html: this.mapToObject(compiled.html),
      lastUpdate: Date.now()
    };

    await this.cache.save(data);

    this.matcher = new FilterMatcher({
      network: compiled.network,
      cosmetic: compiled.cosmetic,
      scriptlet: compiled.scriptlet,
      exception: compiled.exception,
      redirect: compiled.redirect,
      csp: compiled.csp,
      removeparam: compiled.removeparam,
      html: compiled.html
    });

    this._ready = true;
    return this.matcher;
  }

  mapToObject(map) {
    const obj = {};
    for (const [key, value] of map.entries()) {
      obj[key] = value;
    }
    return obj;
  }

  isReady() { return this._ready && this.matcher !== null; }
  getMatcher() { return this.matcher; }
}