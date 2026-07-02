// background.js - con soporte para listas activas
let currentRules = null;

async function loadRules() {
  try {
    const url = browser.runtime.getURL('assets/rules.json');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rules = await response.json();
    console.log(`[Engine] rules.json cargado: ${rules.length} reglas`);
    return rules;
  } catch (e) {
    console.error('[Engine] Error cargando rules.json:', e);
    browser.action.setBadgeText({ text: '!' });
    browser.action.setBadgeBackgroundColor({ color: '#d32f2f' });
    return null;
  }
}

async function loadMetadata() {
  try {
    const url = browser.runtime.getURL('assets/metadata.json');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (e) {
    console.error('[Engine] Error cargando metadata.json:', e);
    return null;
  }
}

async function loadFilterLists() {
  try {
    const url = browser.runtime.getURL('assets/lists.json');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (e) {
    console.error('[Engine] Error cargando lists.json:', e);
    return [];
  }
}

async function applyDNR(rules) {
  try {
    const old = await browser.declarativeNetRequest.getDynamicRules();
    const oldIds = old.map(r => r.id);
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldIds,
      addRules: rules
    });
    console.log(`[DNR] Aplicadas ${rules.length} reglas`);
    return rules.length;
  } catch (e) {
    console.error('[DNR] Error:', e);
    return 0;
  }
}

function updateBadge(count) {
  const text = count > 0 ? String(count) : '';
  browser.action.setBadgeText({ text });
  browser.action.setBadgeBackgroundColor({ color: '#0060df' });
  browser.action.setBadgeTextColor({ color: '#ffffff' });
}

// Escuchar mensajes desde la página de opciones
browser.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === 'refreshRules') {
    console.log('[Engine] Recargando reglas por solicitud del usuario');
    // Aquí podrías volver a ejecutar build.js o recargar rules.json
    // Como build.js es externo, simplemente volvemos a cargar y aplicar
    const rules = await loadRules();
    if (rules && rules.length) {
      const count = await applyDNR(rules);
      updateBadge(count);
      const metadata = await loadMetadata();
      await browser.storage.local.set({ rulesCount: count, metadata: metadata || {} });
      return { success: true, count };
    }
    return { success: false };
  }
});

async function init() {
  console.log('[Engine] Service worker iniciado');

  const rules = await loadRules();
  if (!rules || !rules.length) {
    console.error('[Engine] No se pudieron cargar reglas');
    await browser.storage.local.set({ rulesCount: 0, metadata: null, filterLists: [] });
    return;
  }

  const count = await applyDNR(rules);
  updateBadge(count);

  const metadata = await loadMetadata();
  const filterLists = await loadFilterLists();

  await browser.storage.local.set({
    rulesCount: count,
    metadata: metadata || {},
    filterLists: filterLists || []
  });

  console.log('[Engine] Extensión lista con ' + count + ' reglas');
}

init();
