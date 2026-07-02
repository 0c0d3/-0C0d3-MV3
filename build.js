// build.js - Compila reglas, cosméticos y genera página de opciones con categorías
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// === LISTAS DE FILTROS ===
const LISTS = [
  // Anuncios (bloqueo principal)
  { url: 'https://easylist.to/easylist/easylist.txt', category: 'anuncios' },
  { url: 'https://easylist.to/easylist/easyprivacy.txt', category: 'privacidad' },
  { url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=nohtml', category: 'anuncios' },
  { url: 'https://filters.adtidy.org/extension/ublock/filters/2_optimized.txt', category: 'anuncios' },

  // Molestias
  { url: 'https://easylist.to/easylist/fanboy-annoyance.txt', category: 'molestias' },
  { url: 'https://easylist.to/easylist/fanboy-social.txt', category: 'molestias' },
  { url: 'https://filters.adtidy.org/extension/ublock/filters/14_optimized.txt', category: 'molestias' },
  { url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances.txt', category: 'molestias' },

  // Cookies
  { url: 'https://www.i-dont-care-about-cookies.eu/abp/', category: 'molestias' },
  { url: 'https://secure.fanboy.co.nz/fanboy-cookie.txt', category: 'molestias' },

  // Privacidad y rastreo
  { url: 'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_3_Spyware/filter.txt', category: 'privacidad' },
  { url: 'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_17_TrackParam/filter.txt', category: 'privacidad' },
  { url: 'https://raw.githubusercontent.com/yokoffing/filterlists/refs/heads/main/privacy_essentials.txt', category: 'privacidad' },
  { url: 'https://raw.githubusercontent.com/yokoffing/filterlists/refs/heads/main/click2load.txt', category: 'privacidad' },

  // Redes sociales
  { url: 'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_4_Social/filter.txt', category: 'social' },
  { url: 'https://easylist-downloads.adblockplus.org/fanboy-social.txt', category: 'social' },
  { url: 'https://cdn.jsdelivr.net/gh/BevizLaszlo/UBlock-Filters-for-Social-Media@latest/filterlist.txt', category: 'social' },

  // Limpieza de URLs
  { url: 'https://raw.githubusercontent.com/DandelionSprout/adfilt/refs/heads/master/LegitimateURLShortener.txt', category: 'limpieza' },
  { url: 'https://raw.githubusercontent.com/DandelionSprout/adfilt/refs/heads/master/ClearURLs%20for%20uBo/clear_urls_uboified.txt', category: 'limpieza' },

  // Móviles
  { url: 'https://filters.adtidy.org/extension/ublock/filters/11_optimized.txt', category: 'moviles' },

  // Anti-adblock
  { url: 'https://easylist-downloads.adblockplus.org/antiadblockfilters.txt', category: 'antiadblock' },
  { url: 'https://raw.githubusercontent.com/reek/anti-adblock-killer/master/anti-adblock-killer-filters.txt', category: 'antiadblock' },

  // Paywalls
  { url: 'https://raw.githubusercontent.com/liamengland1/miscfilters/refs/heads/master/antipaywall.txt', category: 'paywalls' },
  { url: 'https://gitflic.ru/project/magnolia1234/bypass-paywalls-clean-filters/blob/raw?file=bpc-paywall-filter.txt', category: 'paywalls' },

  // YouTube específico
  { url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt', category: 'youtube' },
  { url: 'https://raw.githubusercontent.com/jartf/ublock-lists/main/YouTube/anti-adblock-bypass.txt', category: 'youtube' },

  // Seguridad / Malware
  { url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/refs/heads/main/adblock/pro.mini.txt', category: 'seguridad' },
  { url: 'https://raw.githubusercontent.com/cbuijs/hagezi/refs/heads/main/combo/alt-suggested/domains.top-n', category: 'seguridad' },

  // Otros
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
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
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
// EXTRACCIONES
// ============================================================
function extractDomains(texts) {
  const domains = new Set();
  const regex = /\|\|([a-z0-9.-]+\.[a-z]{2,})(?:\^|$)/gi;
  for (const text of texts) {
    if (!text) continue;
    let match;
    while ((match = regex.exec(text)) !== null) {
      let d = match[1].toLowerCase();
      if (d && d.length > 3 && d.length < 80 && d.includes('.')) {
        let safe = false;
        for (const s of SAFE_DOMAINS) {
          if (d.endsWith('.' + s) || d === s) { safe = true; break; }
        }
        if (!safe) domains.add(d);
      }
    }
  }
  return [...domains];
}

function extractCosmeticSelectors(texts) {
  const map = new Map();
  for (const text of texts) {
    if (!text) continue;
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) continue;
      const match = trimmed.match(/^([a-z0-9.-]+(?:,[a-z0-9.-]+)*)?(?:#@?#|##)(.+)$/i);
      if (match) {
        const domainsPart = match[1] || '';
        const selector = match[2].trim();
        const isException = trimmed.includes('#@#');
        if (selector.includes(':has(') || selector.includes(':upward(') ||
            selector.includes(':matches-css(') || selector.includes(':xpath(')) {
          continue;
        }
        let domains = domainsPart ? domainsPart.split(',').map(d => d.trim()) : ['*'];
        if (!isException) {
          for (const domain of domains) {
            if (!map.has(domain)) map.set(domain, []);
            const list = map.get(domain);
            if (!list.includes(selector) && selector.length < 300 && !selector.includes('{') && !selector.includes('}')) {
              list.push(selector);
            }
          }
        }
      }
    }
  }
  const result = {};
  for (const [domain, selectors] of map) {
    result[domain] = [...new Set(selectors)].slice(0, 1000);
  }
  return result;
}

function buildDNRRules(domains) {
  const rules = [];
  let id = 100000;
  const MAX_RULES = 5000;
  const list = [...new Set(domains)].slice(0, MAX_RULES - 50);
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
  rules.push({
    id: 900001,
    priority: 3,
    action: { type: 'block' },
    condition: { urlFilter: '*pagead*', resourceTypes: ['script', 'xmlhttprequest'] }
  });
  rules.push({
    id: 900002,
    priority: 3,
    action: { type: 'block' },
    condition: { urlFilter: '*ads.js*', resourceTypes: ['script', 'xmlhttprequest'] }
  });
  rules.push({
    id: 900003,
    priority: 3,
    action: { type: 'block' },
    condition: { urlFilter: '*googleads*', resourceTypes: ['script', 'image', 'xmlhttprequest'] }
  });
  return rules;
}

// ============================================================
// GENERAR PÁGINA DE OPCIONES CON CATEGORÍAS
// ============================================================
function generateOptionsHTML(lists, metadata) {
  // Agrupar listas por categoría
  const categories = {};
  for (const item of lists) {
    const cat = item.category || 'otros';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(item.url);
  }

  // Nombres legibles para categorías
  const categoryNames = {
    anuncios: 'Anuncios',
    privacidad: 'Privacidad',
    molestias: 'Molestias',
    social: 'Redes Sociales',
    limpieza: 'Limpieza de URLs',
    moviles: 'Móviles',
    antiadblock: 'Anti-adblock',
    paywalls: 'Paywalls',
    youtube: 'YouTube',
    seguridad: 'Seguridad',
    otros: 'Otros'
  };

  // Generar HTML para cada categoría
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
        </div>
      `;
    }
    categoriesHTML += `
      <div class="category">
        <div class="category-header">
          <span class="category-name">${catName}</span>
          <span class="category-count">${urls.length}</span>
        </div>
        <div class="category-items">${itemsHTML}</div>
      </div>
    `;
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
      <div id="brand">
        <span id="logo">0c0d3</span>
        <span id="version">v3.0</span>
      </div>
      <div id="stats">
        <span id="rules-count">${metadata?.rulesCount || 0}</span>
        <span id="rules-label">reglas activas</span>
      </div>
    </div>

    <div id="content">
      <div id="info-bar">
        <span>Última actualización: <span id="last-updated">${lastUpdated}</span></span>
        <button id="btn-save" class="btn-primary">Guardar cambios</button>
        <button id="btn-refresh" class="btn-secondary">Recargar reglas</button>
      </div>

      <h2>Listas de filtros</h2>
      <p class="subtitle">Selecciona las listas que deseas utilizar. Las reglas se actualizarán al guardar.</p>

      <div id="lists-container">
        ${categoriesHTML}
      </div>
    </div>

    <div id="footer">
      <span>Hecho con ❤️ para Firefox</span>
    </div>
  </div>
  <script src="options.js"></script>
</body>
</html>`;
}

function generateOptionsJS() {
  return `// options.js - generado automáticamente
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Options] Página cargada');

  // Elementos
  const rulesCountEl = document.getElementById('rules-count');
  const lastUpdatedEl = document.getElementById('last-updated');
  const btnSave = document.getElementById('btn-save');
  const btnRefresh = document.getElementById('btn-refresh');
  const checkboxes = document.querySelectorAll('input[type="checkbox"][data-url]');

  // Cargar preferencias guardadas
  async function loadPreferences() {
    try {
      const { activeLists } = await browser.storage.local.get('activeLists');
      if (activeLists && activeLists.length) {
        for (const cb of checkboxes) {
          const url = cb.dataset.url;
          cb.checked = activeLists.includes(url);
        }
      }
    } catch (e) {
      console.error('[Options] Error cargando preferencias:', e);
    }
  }

  // Guardar preferencias
  async function savePreferences() {
    try {
      const active = [];
      for (const cb of checkboxes) {
        if (cb.checked) active.push(cb.dataset.url);
      }
      await browser.storage.local.set({ activeLists: active });
      console.log('[Options] Preferencias guardadas:', active.length, 'listas');
      // Opcional: mostrar notificación
      showNotification('Preferencias guardadas correctamente');
    } catch (e) {
      console.error('[Options] Error guardando:', e);
      showNotification('Error al guardar', 'error');
    }
  }

  // Recargar reglas (pide al background que recompile)
  async function refreshRules() {
    try {
      showNotification('Recargando reglas...', 'info');
      // Enviamos mensaje al background
      await browser.runtime.sendMessage({ type: 'refreshRules' });
      // Esperamos un momento y recargamos los contadores
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

  // Notificaciones simples
  function showNotification(msg, type = 'success') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'notification ' + type;
    div.textContent = msg;
    document.getElementById('content').prepend(div);
    setTimeout(() => div.remove(), 3000);
  }

  // Event listeners
  btnSave.addEventListener('click', savePreferences);
  btnRefresh.addEventListener('click', refreshRules);

  // Cargar preferencias al inicio
  await loadPreferences();

  // Actualizar contador de reglas desde storage
  try {
    const { rulesCount, metadata } = await browser.storage.local.get(['rulesCount', 'metadata']);
    if (rulesCountEl) rulesCountEl.textContent = rulesCount || 0;
    if (lastUpdatedEl && metadata && metadata.lastUpdated) {
      lastUpdatedEl.textContent = new Date(metadata.lastUpdated).toLocaleString();
    }
  } catch (e) {
    console.error('[Options] Error cargando stats:', e);
  }

  // Escuchar cambios de storage para actualizar en tiempo real (desde otras pestañas)
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.rulesCount) {
      rulesCountEl.textContent = changes.rulesCount.newValue || 0;
    }
  });
});`;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('🚀 Compilando reglas DNR, filtros cosméticos y página de opciones...');
  console.log('📥 Descargando listas...');

  // Extraer solo las URLs para descargar
  const urls = LISTS.map(item => item.url);
  const results = [];
  for (const url of urls) {
    console.log(`  ⬇️ ${url.split('/').pop() || url}`);
    try {
      const text = await fetchText(url);
      results.push({ url, text });
    } catch (error) {
      console.warn(`  ⚠️ Falló ${url}: ${error.message}`);
      results.push({ url, text: null });
    }
  }

  const valid = results.filter(r => r.text !== null).map(r => r.text);
  const failed = results.filter(r => r.text === null).map(r => r.url);

  if (failed.length) {
    console.warn(`⚠️ ${failed.length} listas fallaron:`);
    failed.forEach(u => console.warn(`  ❌ ${u}`));
  }

  if (!valid.length) {
    console.error('❌ No se descargó ninguna lista.');
    process.exit(1);
  }

  console.log(`✅ Descargadas ${valid.length} de ${urls.length} listas`);

  console.log('🔍 Extrayendo dominios...');
  const domains = extractDomains(valid);
  console.log(`✅ Extraídos ${domains.length} dominios`);

  console.log('🎨 Extrayendo selectores cosméticos...');
  const cosmeticSelectors = extractCosmeticSelectors(valid);
  const totalSelectors = Object.values(cosmeticSelectors).reduce((acc, arr) => acc + arr.length, 0);
  console.log(`✅ Extraídos selectores para ${Object.keys(cosmeticSelectors).length} dominios (${totalSelectors} selectores)`);

  console.log('⚙️ Construyendo reglas DNR...');
  const rules = buildDNRRules(domains);
  console.log(`✅ Generadas ${rules.length} reglas`);

  // Metadata
  const metadata = {
    rulesCount: rules.length,
    listsCount: urls.length,
    listsLoaded: valid.length,
    domainsCount: domains.length,
    cosmeticDomains: Object.keys(cosmeticSelectors).length,
    cosmeticSelectors: totalSelectors,
    lastUpdated: new Date().toISOString()
  };

  // === GUARDAR ARCHIVOS EN assets/ ===
  const outputDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(path.join(outputDir, 'rules.json'), JSON.stringify(rules, null, 2));
  console.log('✅ rules.json guardado en assets/');

  fs.writeFileSync(path.join(outputDir, 'cosmetics.json'), JSON.stringify(cosmeticSelectors, null, 2));
  console.log('✅ cosmetics.json guardado en assets/');

  fs.writeFileSync(path.join(outputDir, 'lists.json'), JSON.stringify(urls, null, 2));
  console.log('✅ lists.json guardado en assets/');

  fs.writeFileSync(path.join(outputDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  console.log('✅ metadata.json guardado en assets/');

  // === GENERAR options.html, options.js y options.css en la RAÍZ ===
  const rootDir = __dirname;

  // HTML
  const optionsHTML = generateOptionsHTML(LISTS, metadata);
  fs.writeFileSync(path.join(rootDir, 'options.html'), optionsHTML);
  console.log(`✅ options.html generado en ${rootDir}`);

  // JS
  const optionsJS = generateOptionsJS();
  fs.writeFileSync(path.join(rootDir, 'options.js'), optionsJS);
  console.log(`✅ options.js generado en ${rootDir}`);

  // CSS (con diseño propio, sin copiar uBlock)
  const cssPath = path.join(rootDir, 'options.css');
  const customCSS = `/* options.css - diseño original para 0c0d3 */
* { margin:0; padding:0; box-sizing:border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f5f7fa;
  color: #1e293b;
  padding: 20px;
  line-height: 1.6;
}

#container {
  max-width: 1100px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  overflow: hidden;
}

#header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  border-bottom: 2px solid #e9edf2;
  background: #ffffff;
}

#brand {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

#logo {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.5px;
}

#version {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

#stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

#rules-count {
  font-size: 32px;
  font-weight: 700;
  color: #2563eb;
  line-height: 1;
}

#rules-label {
  font-size: 12px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

#content {
  padding: 24px 32px 32px;
}

#info-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 24px;
  border: 1px solid #e9edf2;
}

#info-bar span {
  font-size: 14px;
  color: #475569;
  flex: 1;
}

#info-bar #last-updated {
  font-weight: 600;
  color: #2563eb;
}

.btn-primary, .btn-secondary {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.btn-primary {
  background: #2563eb;
  color: #fff;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-secondary {
  background: #e9edf2;
  color: #1e293b;
}

.btn-secondary:hover {
  background: #d1d5db;
}

h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #0f172a;
}

.subtitle {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 20px;
}

#lists-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category {
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e9edf2;
  overflow: hidden;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e9edf2;
  font-weight: 600;
  color: #0f172a;
}

.category-name {
  font-size: 15px;
}

.category-count {
  font-size: 13px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 10px;
  border-radius: 12px;
}

.category-items {
  padding: 8px 20px 12px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid #f1f5f9;
}

.list-item:last-child {
  border-bottom: none;
}

.list-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #2563eb;
  cursor: pointer;
  flex-shrink: 0;
}

.list-item label {
  font-size: 14px;
  color: #1e293b;
  cursor: pointer;
  flex: 1;
  word-break: break-all;
}

.list-item .list-link {
  color: #94a3b8;
  text-decoration: none;
  font-size: 16px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.2s, color 0.2s;
}

.list-item .list-link:hover {
  background: #e9edf2;
  color: #2563eb;
}

.notification {
  padding: 10px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.notification.error {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fecaca;
}

.notification.info {
  background: #e0f2fe;
  color: #1e40af;
  border-color: #bae6fd;
}

#footer {
  text-align: center;
  padding: 16px 32px;
  border-top: 1px solid #e9edf2;
  font-size: 13px;
  color: #94a3b8;
  background: #fafbfc;
}

/* Responsive */
@media (max-width: 640px) {
  #header { flex-direction: column; align-items: flex-start; gap: 8px; }
  #stats { align-items: flex-start; }
  #info-bar { flex-direction: column; align-items: stretch; }
  .btn-primary, .btn-secondary { width: 100%; text-align: center; }
}`;
  fs.writeFileSync(cssPath, customCSS);
  console.log(`✅ options.css generado en ${rootDir}`);

  console.log('🎉 Compilación completada con éxito!');
  console.log('📌 Recuerda: RECARGA LA EXTENSIÓN en about:debugging');
}

main().catch(console.error);