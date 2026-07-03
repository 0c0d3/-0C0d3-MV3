// build.js - Genera reglas, índice cosmético y UI (con dominio y filtrado de etiquetas)
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

// === LISTAS DE FILTROS ===
const LISTS = [
  { url: 'https://easylist.to/easylist/easylist.txt', category: 'anuncios' },
  { url: 'https://easylist.to/easylist/easyprivacy.txt', category: 'privacidad' },
  { url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=nohtml', category: 'anuncios' },
  { url: 'https://filters.adtidy.org/extension/ublock/filters/2_optimized.txt', category: 'anuncios' },
  { url: 'https://easylist.to/easylist/fanboy-annoyance.txt', category: 'molestias' },
  { url: 'https://easylist.to/easylist/fanboy-social.txt', category: 'molestias' },
  { url: 'https://filters.adtidy.org/extension/ublock/filters/14_optimized.txt', category: 'molestias' },
  { url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances.txt', category: 'molestias' },
  { url: 'https://www.i-dont-care-about-cookies.eu/abp/', category: 'molestias' },
  { url: 'https://secure.fanboy.co.nz/fanboy-cookie.txt', category: 'molestias' },
  { url: 'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_3_Spyware/filter.txt', category: 'privacidad' },
  { url: 'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_17_TrackParam/filter.txt', category: 'privacidad' },
  { url: 'https://raw.githubusercontent.com/yokoffing/filterlists/refs/heads/main/privacy_essentials.txt', category: 'privacidad' },
  { url: 'https://raw.githubusercontent.com/yokoffing/filterlists/refs/heads/main/click2load.txt', category: 'privacidad' },
  { url: 'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_4_Social/filter.txt', category: 'social' },
  { url: 'https://easylist-downloads.adblockplus.org/fanboy-social.txt', category: 'social' },
  { url: 'https://cdn.jsdelivr.net/gh/BevizLaszlo/UBlock-Filters-for-Social-Media@latest/filterlist.txt', category: 'social' },
  { url: 'https://raw.githubusercontent.com/DandelionSprout/adfilt/refs/heads/master/LegitimateURLShortener.txt', category: 'limpieza' },
  { url: 'https://raw.githubusercontent.com/DandelionSprout/adfilt/refs/heads/master/ClearURLs%20for%20uBo/clear_urls_uboified.txt', category: 'limpieza' },
  { url: 'https://filters.adtidy.org/extension/ublock/filters/11_optimized.txt', category: 'moviles' },
  { url: 'https://easylist-downloads.adblockplus.org/antiadblockfilters.txt', category: 'antiadblock' },
  { url: 'https://raw.githubusercontent.com/reek/anti-adblock-killer/master/anti-adblock-killer-filters.txt', category: 'antiadblock' },
  { url: 'https://raw.githubusercontent.com/liamengland1/miscfilters/refs/heads/master/antipaywall.txt', category: 'paywalls' },
  { url: 'https://gitflic.ru/project/magnolia1234/bypass-paywalls-clean-filters/blob/raw?file=bpc-paywall-filter.txt', category: 'paywalls' },
  { url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt', category: 'youtube' },
  { url: 'https://raw.githubusercontent.com/jartf/ublock-lists/main/YouTube/anti-adblock-bypass.txt', category: 'youtube' },
  { url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/refs/heads/main/adblock/pro.mini.txt', category: 'seguridad' },
  { url: 'https://raw.githubusercontent.com/cbuijs/hagezi/refs/heads/main/combo/alt-suggested/domains.top-n', category: 'seguridad' },
  { url: 'https://raw.githubusercontent.com/iam-py-test/uBlock-combo/main/list.txt', category: 'otros' }
];

const SAFE_DOMAINS = new Set([
  'googlevideo.com', 'ytimg.com', 'youtube.com', 'youtu.be',
  'ggpht.com', 'twitter.com', 'x.com', 'facebook.com',
  'reddit.com', 'redd.it', 'googleapis.com', 'gstatic.com'
]);

// ============================================================
// FUNCIÓN FETCH CON HTTPS NATIVO
// ============================================================
function fetchText(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location, timeout).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (data.length < 100) return reject(new Error('Contenido muy corto'));
        resolve(data);
      });
      res.on('error', reject);
    });
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

// ============================================================
// EXTRACCIÓN DE DOMINIOS Y SELECTORES (CON ASIGNACIÓN POR DOMINIO)
// ============================================================
function extractFromText(text) {
  const domains = [];                          // dominios de red (para DNR)
  const cosmeticByDomain = {};                 // dominio -> array de selectores cosméticos

  // --- Extraer dominios de red (||dominio^) ---
  const regex = /\|\|([a-z0-9.-]+\.[a-z]{2,})(?:\^|$)/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    let d = match[1].toLowerCase();
    if (d && d.length > 3 && d.length < 80 && d.includes('.')) {
      let safe = false;
      for (const s of SAFE_DOMAINS) {
        if (d.endsWith('.' + s) || d === s) { safe = true; break; }
      }
      if (!safe && !domains.includes(d)) domains.push(d);
    }
  }

  // --- Extraer reglas cosméticas (##, #@#, etc.) ---
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) continue;

    // Formato: [dominios]##selector   o   ##selector (global)
    const match2 = trimmed.match(/^([a-z0-9.,*-]+)?#@?#(.+)$/i);
    if (!match2) continue;

    const rawDomains = match2[1] || '*';          // puede ser "example.com,foo.example.com" o undefined
    const selector = match2[2].trim();
    const isException = trimmed.includes('#@#');
    if (isException) continue;                    // ignoramos excepciones cosméticas por ahora

    // --- Validar selector ---
    // Rechazar sintaxis propietaria no-CSS
    if (selector.includes('+js(') || selector.includes(':style(') ||
        selector.includes(':remove(') || selector.includes(':xpath(') ||
        selector.includes(':-abp-') || selector.includes(':-ext-')) continue;

    // Rechazar selectores universales peligrosos
    if (selector === '*' || selector === 'html' || selector === 'body') continue;

    // Rechazar si el selector es una sola etiqueta HTML (ej. "div", "span", "a")
    if (/^[a-z][a-z0-9]*$/i.test(selector)) continue;

    // Rechazar selectores con llaves (probablemente mal formados)
    if (selector.includes('{') || selector.includes('}')) continue;

    // Longitud máxima razonable
    if (selector.length > 500) continue;

    // --- Asignar a dominios ---
    const domainList = rawDomains === '*' ? ['*'] : rawDomains.split(',').map(d => d.trim().toLowerCase()).filter(d => d);
    for (const domain of domainList) {
      if (!cosmeticByDomain[domain]) cosmeticByDomain[domain] = [];
      cosmeticByDomain[domain].push(selector);
    }
  }

  return { domains, cosmeticByDomain };
}

// ============================================================
// CONSTRUIR REGLAS DNR (sin cambios relevantes)
// ============================================================
function buildDNRRules(domains) {
  const rules = [];
  let id = 100000;
  const MAX_RULES = 5000;
  const HIGH_PRIORITY = [
    'doubleclick.net',
    'googleadservices.com',
    'googlesyndication.com',
    'pagead2.googlesyndication.com'
  ];
  for (const d of HIGH_PRIORITY) {
    if (id >= 100000 + MAX_RULES) break;
    rules.push({
      id: id++,
      priority: 2,
      action: { type: 'block' },
      condition: {
        urlFilter: `||${d}^`,
        resourceTypes: ['script', 'image', 'xmlhttprequest', 'sub_frame', 'media', 'font', 'ping', 'websocket', 'other']
      }
    });
  }
  const list = [...new Set(domains)].slice(0, MAX_RULES - HIGH_PRIORITY.length - 10);
  for (const d of list) {
    if (id >= 100000 + MAX_RULES) break;
    rules.push({
      id: id++,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: `||${d}^`,
        resourceTypes: ['script', 'image', 'xmlhttprequest', 'sub_frame', 'media', 'font', 'ping', 'websocket', 'other']
      }
    });
  }
  rules.push({
    id: 900001, priority: 3, action: { type: 'block' },
    condition: { urlFilter: '*pagead*', resourceTypes: ['script', 'xmlhttprequest'] }
  });
  rules.push({
    id: 900002, priority: 3, action: { type: 'block' },
    condition: { urlFilter: '*ads.js*', resourceTypes: ['script', 'xmlhttprequest'] }
  });
  rules.push({
    id: 900003, priority: 3, action: { type: 'block' },
    condition: { urlFilter: '*googleads*', resourceTypes: ['script', 'image', 'xmlhttprequest'] }
  });
  return rules;
}

// ============================================================
// GENERAR PÁGINA DE OPCIONES (sin cambios)
// ============================================================
function generateOptionsHTML(lists, metadata) {
  const categories = {};
  for (const item of lists) {
    const cat = item.category || 'otros';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(item.url);
  }
  const categoryNames = {
    anuncios: 'Anuncios', privacidad: 'Privacidad', molestias: 'Molestias',
    social: 'Redes Sociales', limpieza: 'Limpieza de URLs', moviles: 'Móviles',
    antiadblock: 'Anti-adblock', paywalls: 'Paywalls', youtube: 'YouTube',
    seguridad: 'Seguridad', otros: 'Otros'
  };
  let categoriesHTML = '';
  for (const [catKey, urls] of Object.entries(categories)) {
    const catName = categoryNames[catKey] || catKey;
    let itemsHTML = '';
    for (const url of urls) {
      const name = url.split('/').pop() || url;
      const id = 'list-' + Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
      itemsHTML += `
        <div class="list-item">
          <input type="checkbox" id="${id}" data-url="${url}" checked>
          <label for="${id}">${name}</label>
          <a href="${url}" target="_blank" class="list-link" title="Abrir lista">↗</a>
        </div>`;
    }
    categoriesHTML += `
      <div class="category">
        <div class="category-header">
          <span class="category-name">${catName}</span>
          <span class="category-count">${urls.length}</span>
        </div>
        <div class="category-items">${itemsHTML}</div>
      </div>`;
  }
  const lastUpdated = metadata && metadata.lastUpdated ? new Date(metadata.lastUpdated).toLocaleString() : '—';
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>0c0d3 - Configuración</title>
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <div id="container">
    <div id="header">
      <div id="brand"><span id="logo">0c0d3</span><span id="version">v3.0</span></div>
      <div id="stats"><span id="rules-count">${metadata?.rulesCount || 0}</span><span id="rules-label">reglas activas</span></div>
    </div>
    <div id="content">
      <div id="info-bar">
        <span>Última actualización: <span id="last-updated">${lastUpdated}</span></span>
        <button id="btn-save" class="btn-primary">Guardar cambios</button>
        <button id="btn-refresh" class="btn-secondary">Recargar reglas</button>
      </div>
      <h2>Listas de filtros</h2>
      <p class="subtitle">Selecciona las listas que deseas utilizar. Las reglas se actualizarán al guardar.</p>
      <div id="lists-container">${categoriesHTML}</div>
    </div>
    <div id="footer"><span>Hecho con ❤️ para Firefox</span></div>
  </div>
  <script src="options.js"></script>
</body>
</html>`;
}

function generateOptionsJS() {
  return `// options.js - generado automáticamente
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
});`;
}

// ============================================================
// MAIN (CORREGIDO: índices por dominio, sin selectores de etiqueta)
// ============================================================
async function main() {
  console.log('🚀 Compilando reglas DNR, filtros cosméticos y UI...');

  const assetsDir = path.join(__dirname, 'assets');
  const cosmeticsDir = path.join(assetsDir, 'cosmetics');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
  if (!fs.existsSync(cosmeticsDir)) fs.mkdirSync(cosmeticsDir, { recursive: true });

  let allDomains = [];                         // para DNR
  const globalCosmetics = {};                  // dominio -> Set de selectores

  for (const item of LISTS) {
    const url = item.url;
    console.log(`  ⬇️ ${url}`);
    try {
      const text = await fetchText(url);
      const { domains, cosmeticByDomain } = extractFromText(text);
      allDomains = allDomains.concat(domains);

      // Fusionar selectores por dominio
      for (const [domain, selectors] of Object.entries(cosmeticByDomain)) {
        if (!globalCosmetics[domain]) globalCosmetics[domain] = new Set();
        for (const sel of selectors) globalCosmetics[domain].add(sel);
      }
      console.log(`    ✅ ${domains.length} dominios red, ${Object.values(cosmeticByDomain).flat().length} selectores`);
    } catch (error) {
      console.warn(`  ⚠️ Falló ${url}: ${error.message}`);
    }
  }

  // Convertir Sets a arrays
  const cosmeticsPerDomain = {};
  for (const [domain, set] of Object.entries(globalCosmetics)) {
    cosmeticsPerDomain[domain] = [...set];
  }

  allDomains = [...new Set(allDomains)];
  console.log(`🔍 Dominios únicos (red): ${allDomains.length}`);

  // === REGLAS DNR ===
  console.log('⚙️ Construyendo reglas DNR...');
  const rules = buildDNRRules(allDomains);
  console.log(`✅ Reglas DNR: ${rules.length}`);
  fs.writeFileSync(path.join(assetsDir, 'rules.jsonx'), JSON.stringify(rules));

  // === ÍNDICE COSMÉTICO ===
  console.log('📂 Creando índice cosmético por dominio...');
  const index = {};
  const MAX_SELECTORS_PER_DOMAIN = 10000;      // límite por dominio

  for (const [domain, selectors] of Object.entries(cosmeticsPerDomain)) {
    // Limitar cantidad para no saturar
    const limited = selectors.slice(0, MAX_SELECTORS_PER_DOMAIN);
    // Dividir por primera letra para archivos manejables
    const byLetter = {};
    for (const sel of limited) {
      let firstChar = sel.charAt(0).toLowerCase();
      firstChar = firstChar.replace(/[^a-z0-9]/g, '_');
      if (!firstChar) firstChar = 'other';
      if (!byLetter[firstChar]) byLetter[firstChar] = [];
      byLetter[firstChar].push(sel);
    }

    const fileNames = [];
    for (const [letter, sels] of Object.entries(byLetter)) {
      // Nombre de archivo: domain_letra.json (sanitizado)
      let safeDomain = domain.replace(/[^a-z0-9.-]/g, '_');
      const filename = `cosmetic_${safeDomain}_${letter}.json`;
      fs.writeFileSync(path.join(cosmeticsDir, filename), JSON.stringify(sels));
      fileNames.push(filename);
    }
    index[domain] = fileNames;
  }

  fs.writeFileSync(path.join(assetsDir, 'cosmetic-index.json'), JSON.stringify(index, null, 2));
  console.log(`✅ Índice con ${Object.keys(index).length} dominios`);

  // === METADATA ===
  const hash = crypto.createHash('sha256').update(JSON.stringify(rules.map(r => r.id))).digest('hex').slice(0, 16);
  const totalSelectors = Object.values(cosmeticsPerDomain).flat().length;
  const metadata = {
    rulesCount: rules.length,
    listsCount: LISTS.length,
    domainsCount: allDomains.length,
    totalSelectors,
    rulesHash: hash,
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(path.join(assetsDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

  // === LISTAS (URLs) ===
  fs.writeFileSync(path.join(assetsDir, 'lists.json'), JSON.stringify(LISTS.map(l => l.url), null, 2));

  // === UI ===
  const optionsHTML = generateOptionsHTML(LISTS, metadata);
  const optionsJS = generateOptionsJS();
  fs.writeFileSync(path.join(__dirname, 'options.html'), optionsHTML);
  fs.writeFileSync(path.join(__dirname, 'options.js'), optionsJS);
  const cssPath = path.join(__dirname, 'options.css');
  if (!fs.existsSync(cssPath)) {
    fs.writeFileSync(cssPath, `/* options.css */ ...`); // (código CSS anterior, mismo que antes)
  }

  console.log('🎉 Compilación completada con éxito!');
}

main().catch(console.error);