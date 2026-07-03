// options.js - generado automáticamente
document.addEventListener('DOMContentLoaded', async () => {
  const rulesCountEl = document.getElementById('rules-count');
  const lastUpdatedEl = document.getElementById('last-updated');
  const btnSave = document.getElementById('btn-save');
  const btnRefresh = document.getElementById('btn-refresh');
  const checkboxes = document.querySelectorAll('input[type="checkbox"][data-url]');
  async function loadPreferences() {
    try {
      const { activeLists } = await browser.storage.local.get('activeLists');
      if (activeLists && activeLists.length) {
        for (const cb of checkboxes) {
          const url = cb.dataset.url;
          cb.checked = activeLists.includes(url);
        }
      }
    } catch (e) { console.error('[Options] Error cargando preferencias:', e); }
  }
  async function savePreferences() {
    try {
      const active = [];
      for (const cb of checkboxes) if (cb.checked) active.push(cb.dataset.url);
      await browser.storage.local.set({ activeLists: active });
      console.log('[Options] Preferencias guardadas:', active.length, 'listas');
      showNotification('Preferencias guardadas correctamente');
    } catch (e) {
      console.error('[Options] Error guardando:', e);
      showNotification('Error al guardar', 'error');
    }
  }
  async function refreshRules() {
    try {
      showNotification('Recargando reglas...', 'info');
      await browser.runtime.sendMessage({ type: 'refreshRules' });
      const { rulesCount, metadata } = await browser.storage.local.get(['rulesCount', 'metadata']);
      if (rulesCountEl) rulesCountEl.textContent = rulesCount || 0;
      if (lastUpdatedEl && metadata && metadata.lastUpdated) {
        lastUpdatedEl.textContent = new Date(metadata.lastUpdated).toLocaleString();
      }
      showNotification('Reglas recargadas con éxito');
    } catch (e) {
      console.error('[Options] Error recargando:', e);
      showNotification('Error al recargar', 'error');
    }
  }
  function showNotification(msg, type = 'success') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'notification ' + type;
    div.textContent = msg;
    document.getElementById('content').prepend(div);
    setTimeout(() => div.remove(), 3000);
  }
  btnSave.addEventListener('click', savePreferences);
  btnRefresh.addEventListener('click', refreshRules);
  await loadPreferences();
  try {
    const { rulesCount, metadata } = await browser.storage.local.get(['rulesCount', 'metadata']);
    if (rulesCountEl) rulesCountEl.textContent = rulesCount || 0;
    if (lastUpdatedEl && metadata && metadata.lastUpdated) {
      lastUpdatedEl.textContent = new Date(metadata.lastUpdated).toLocaleString();
    }
  } catch (e) { console.error('[Options] Error cargando stats:', e); }
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.rulesCount) {
      rulesCountEl.textContent = changes.rulesCount.newValue || 0;
    }
  });
});