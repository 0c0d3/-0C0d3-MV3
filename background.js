// background.js - Service worker para DNR
const STORAGE_KEY = 'dnr_rules_hash';

async function loadRules() {
  try {
    const url = browser.runtime.getURL('assets/rules.jsonx');
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const rules = await resp.json();
    console.log(`[Engine] rules.jsonx cargado: ${rules.length} reglas`);
    return rules;
  } catch (e) {
    console.error('[Engine] Error cargando rules.jsonx:', e);
    browser.action.setBadgeText({ text: '!' });
    browser.action.setBadgeBackgroundColor({ color: '#d32f2f' });
    return null;
  }
}

async function loadMetadata() {
  try {
    const url = browser.runtime.getURL('assets/metadata.json');
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (e) {
    console.error('[Engine] Error cargando metadata:', e);
    return null;
  }
}

async function applyDNR(rules, metadata) {
  try {
    const stored = await browser.storage.local.get(STORAGE_KEY);
    const currentHash = stored[STORAGE_KEY] || null;
    const newHash = metadata?.rulesHash || rules.map(r => r.id).join(',');
    if (currentHash === newHash) {
      console.log('[DNR] Reglas sin cambios');
      return rules.length;
    }
    console.log('[DNR] Actualizando reglas...');
    const old = await browser.declarativeNetRequest.getDynamicRules();
    const oldIds = old.map(r => r.id);
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldIds,
      addRules: rules
    });
    await browser.storage.local.set({ [STORAGE_KEY]: newHash });
    return rules.length;
  } catch (e) {
    console.error('[DNR] Error:', e);
    return 0;
  }
}

function updateBadge(count) {
  const text = count > 0 ? (count > 9999 ? (count/1000).toFixed(1)+'K' : String(count)) : '';
  browser.action.setBadgeText({ text });
  browser.action.setBadgeBackgroundColor({ color: '#0060df' });
}

browser.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === 'refreshRules') {
    const rules = await loadRules();
    const metadata = await loadMetadata();
    if (rules?.length) {
      const count = await applyDNR(rules, metadata);
      updateBadge(count);
      await browser.storage.local.set({ rulesCount: count, metadata: metadata || {} });
      return { success: true, count };
    }
    return { success: false };
  }
});

(async function init() {
  console.log('[Engine] Iniciando...');
  const rules = await loadRules();
  if (!rules?.length) {
    await browser.storage.local.set({ rulesCount: 0, metadata: null });
    return;
  }
  const metadata = await loadMetadata();
  const count = await applyDNR(rules, metadata);
  updateBadge(count);
  await browser.storage.local.set({ rulesCount: count, metadata: metadata || {} });
  console.log('[Engine] Listo con ' + count + ' reglas');
})();
