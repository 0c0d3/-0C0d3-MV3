// scriptlets/runtime.js
// Content script que ejecuta scriptlets registrados

(function() {
  if (window.top !== window) return;

  // Registro de scriptlets (se carga desde background)
  const scriptletRegistry = {};

  browser.runtime.onMessage.addListener(msg => {
    if (msg.type === 'executeScriptlets' && msg.scriptlets) {
      for (const item of msg.scriptlets) {
        if (typeof item === 'string') {
          // Nombre de scriptlet simple
          if (scriptletRegistry[item]) {
            try { scriptletRegistry[item](); } catch(e) {}
          }
        } else if (item.name) {
          const args = item.args || [];
          if (scriptletRegistry[item.name]) {
            try { scriptletRegistry[item.name](...args); } catch(e) {}
          }
        }
      }
    }
  });

  // Registrar scriptlets desde el mensaje inicial
  window.__adb_scriptlets = scriptletRegistry;
})();