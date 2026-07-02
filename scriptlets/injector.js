// scriptlets/injector.js

export class ScriptletInjector {
  constructor(tabId) {
    this.tabId = tabId;
  }

  async inject(scriptlets) {
    if (!scriptlets || !scriptlets.length) return;
    try {
      await browser.tabs.sendMessage(this.tabId, {
        type: 'executeScriptlets',
        scriptlets: scriptlets
      });
    } catch (e) {
      // Fallback: ejecutar mediante scripting
      const code = scriptlets.map(s => {
        if (typeof s === 'string') {
          return `try { window.__adb_scriptlets['${s}'](); } catch(e) {}`;
        } else {
          const args = (s.args || []).map(a => JSON.stringify(a)).join(',');
          return `try { window.__adb_scriptlets['${s.name}'](${args}); } catch(e) {}`;
        }
      }).join(';');
      try {
        await browser.scripting.executeScript({
          target: { tabId: this.tabId },
          func: (code) => { eval(code); },
          args: [code]
        });
      } catch (e2) {}
    }
  }
}