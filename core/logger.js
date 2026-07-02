// core/logger.js

export class Logger {
  constructor(prefix) {
    this.prefix = prefix;
  }

  log(...args) {
    console.log(`[${this.prefix}]`, ...args);
  }

  warn(...args) {
    console.warn(`[${this.prefix}]`, ...args);
  }

  error(...args) {
    console.error(`[${this.prefix}]`, ...args);
  }
}