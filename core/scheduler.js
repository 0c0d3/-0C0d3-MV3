// core/scheduler.js

export class Scheduler {
  constructor(intervalMinutes, callback) {
    this.interval = intervalMinutes;
    this.callback = callback;
    this.alarmName = 'updateFilters';
  }

  start() {
    browser.alarms.create(this.alarmName, { periodInMinutes: this.interval });
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === this.alarmName) {
        this.callback();
      }
    });
  }

  stop() {
    browser.alarms.clear(this.alarmName);
  }
}