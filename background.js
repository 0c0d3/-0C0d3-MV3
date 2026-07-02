// background.js - Usa import directo (ES Modules)

// ─── IMPORTAR MÓDULOS ──────────────────────────────────────────
import { FilterParser } from './core/parser.js';
import { FilterCompiler } from './core/compiler.js';
import { FilterMatcher } from './core/matcher.js';
import { CompilerCache } from './core/cache.js';
import { DNRBuilder } from './network/dnr-builder.js';
import { CosmeticInjector } from './cosmetic/injector.js';
import { SCRIPTLETS } from './scriptlets/registry.js';

// ─── TODAS LAS LISTAS ──────────────────────────────────────────
const LISTS = [
  // === BLOQUEO PRINCIPAL ===
  'https://easylist.to/easylist/easylist.txt',
  'https://easylist.to/easylist/easyprivacy.txt',
  'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=nohtml',
  'https://filters.adtidy.org/extension/ublock/filters/2_optimized.txt',
  
   // ─── LISTAS PARA BLOQUEAR WIDGETS DE TERCEROS ──────────────
 // ─── REDES SOCIALES (CORREGIDO) ──────────────────────────────
  'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_4_Social/filter.txt',
  
  // ─── COOKIES (ALTERNATIVA) ──────────────────────────────────
  'https://raw.githubusercontent.com/thedoggybrad/easylist-mirror/main/easycookie.txt',
  'https://easylist-downloads.adblockplus.org/easylist-cookie.txt',  // EasyList Cookie List
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances.txt', // uBlock Filters – Annoyances
  'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_14_Annoyances/filter.txt', // AdGuard Annoyances
  'https://raw.githubusercontent.com/yokoffing/filterlists/refs/heads/main/privacy_essentials.txt', // Yokoffing Privacy Essentials (Opcional, muy estricto)
 
  // ─── LISTAS PARA REDES SOCIALES ──────────────────────────────
  'https://cdn.jsdelivr.net/gh/BevizLaszlo/UBlock-Filters-for-Social-Media@latest/filterlist.txt',
  'https://easylist-downloads.adblockplus.org/fanboy-social.txt',

  // === PRIVACIDAD Y RASTREO ===
  'https://raw.githubusercontent.com/yokoffing/filterlists/refs/heads/main/privacy_essentials.txt',
  'https://raw.githubusercontent.com/yokoffing/filterlists/refs/heads/main/click2load.txt',
  'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_3_Spyware/filter.txt',
  'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_17_TrackParam/filter.txt',

  // === LIMPIEZA DE URLS ===
  'https://raw.githubusercontent.com/DandelionSprout/adfilt/refs/heads/master/LegitimateURLShortener.txt',
  'https://raw.githubusercontent.com/DandelionSprout/adfilt/refs/heads/master/ClearURLs%20for%20uBo/clear_urls_uboified.txt',

  // === MOLESTIAS (ANNOYANCES) ===
  'https://easylist.to/easylist/fanboy-annoyance.txt',
  'https://easylist.to/easylist/fanboy-social.txt',
  'https://easylist-downloads.adblockplus.org/easylist-cookie.txt',
  'https://raw.githubusercontent.com/yokoffing/filterlists/refs/heads/main/annoyance_list.txt',
  'https://filters.adtidy.org/extension/ublock/filters/14_optimized.txt', // AdGuard Annoyances (optimizado)
  'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_18_Cookies/filter.txt',
  'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_19_Popups/filter.txt',
  'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_20_Social/filter.txt',

  // === MÓVILES ===
  'https://filters.adtidy.org/extension/ublock/filters/11_optimized.txt',

  // === REDES SOCIALES ===
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/facebook.txt',
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/twitter.txt',
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/reddit.txt',

  // === ANTI-ADBLOCK Y PAYWALLS ===
  'https://easylist-downloads.adblockplus.org/antiadblockfilters.txt',
  'https://raw.githubusercontent.com/liamengland1/miscfilters/refs/heads/master/antipaywall.txt',
  'https://gitflic.ru/project/magnolia1234/bypass-paywalls-clean-filters/blob/raw?file=bpc-paywall-filter.txt',

  // === LIMPIEZA ADICIONAL ===
  'https://raw.githubusercontent.com/yokoffing/filterlists/refs/heads/main/block_third_party_fonts.txt',
  'https://raw.githubusercontent.com/DandelionSprout/adfilt/refs/heads/master/BrowseWebsitesWithoutLoggingIn.txt',
  'https://raw.githubusercontent.com/yokoffing/filterlists/refs/heads/main/youtube_clear_view.txt',

  // === SEGURIDAD / MALWARE ===
  'https://raw.githubusercontent.com/DandelionSprout/adfilt/master/cleaning/Dandelion%20Sprout%27s%20Anti-Malware%20List.txt',
  'https://raw.githubusercontent.com/hagezi/dns-blocklists/refs/heads/main/adblock/pro.mini.txt',
  'https://raw.githubusercontent.com/cbuijs/hagezi/refs/heads/main/combo/alt-suggested/domains.top-n',
  'https://raw.githubusercontent.com/iam-py-test/uBlock-combo/main/list.txt',

  // === LISTAS ULTRA ESPECÍFICAS ===
  'https://raw.githubusercontent.com/jnaklaas/blocklists/refs/heads/main/blocklists/google-ultra-strict.txt',

  // === NOTIFICACIONES ===
  'https://easylist.to/easylist/fanboy-notifications.txt',
  'https://raw.githubusercontent.com/jartf/ublock-lists/main/YouTube/anti-adblock-bypass.txt',
  'https://raw.githubusercontent.com/HyunseungLee-Travis/custom-brave-filter/main/youtube.txt',
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt'
];

const SAFE_DOMAINS = new Set([
  'googlevideo.com', 'ytimg.com', 'youtube.com', 'youtu.be',
  'ggpht.com', 'twitter.com', 'x.com', 'facebook.com',
  'reddit.com', 'redd.it', 'googleapis.com', 'gstatic.com'
]);

// ─── INSTANCIAR CLASES ──────────────────────────────────────
const parser = new FilterParser();
const compiler = new FilterCompiler();
const cache = new CompilerCache();
const dnrBuilder = new DNRBuilder();
let matcher = null;

// ─── EXTRACCIÓN DE DOMINIOS ──────────────────────────────────
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

// ─── EXTRACCIÓN DE SELECTORES COSMÉTICOS ──────────────────
function extractSelectors(texts) {
  const map = new Map();
  for (const text of texts) {
    if (!text) continue;
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (!l || l.startsWith('!') || l.startsWith('[')) continue;
      if (l.includes('##')) {
        const parts = l.split('##');
        if (parts.length !== 2) continue;
        let domainPart = parts[0].trim();
        let selector = parts[1].trim();
        if (!selector || selector.length < 2 || selector.length > 200) continue;
        if (/:has\(|:matches-css\(|\+js/.test(selector)) continue;
        if (domainPart === '*' || domainPart === '') continue;
        const domains = domainPart.split(',').map(d => d.trim()).filter(Boolean);
        for (const domain of domains) {
          if (!map.has(domain)) map.set(domain, []);
          if (!map.get(domain).includes(selector)) map.get(domain).push(selector);
        }
      }
    }
  }
  // Selectores de emergencia para sitios clave
  const emergency = {
    'youtube.com': ['.ytd-display-ad-renderer', '.ytd-promoted-video-renderer', '#player-ads'],
    'reddit.com': ['.promotedlink', '.promoted', '[data-testid="ad-container"]', 'div[role="dialog"]'],
    'cnn.com': ['.ad-container', '.advertisement', '.ad-slot'],
    'clarin.com': ['.publicidad', '.banner-ads', '.adsbygoogle']
  };
  for (const [domain, selectors] of Object.entries(emergency)) {
    if (!map.has(domain)) map.set(domain, []);
    const existing = map.get(domain);
    for (const s of selectors) {
      if (!existing.includes(s)) existing.push(s);
    }
  }
  return map;
}

// ─── CONSTRUIR REGLAS DNR ──────────────────────────────────
function buildRules(domains) {
  const rules = [];
  let id = 1;
  const list = [...new Set(domains)].slice(0, 4500 - 50);
  for (const d of list) {
    if (id >= 4500) break;
    rules.push({
      id: id++,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: `||${d}^`,
        resourceTypes: ['script', 'image', 'xmlhttprequest', 'sub_frame', 'media', 'font']
      }
    });
  }
  const HIGH = ['doubleclick.net', 'googleadservices.com', 'googlesyndication.com', 'pagead2.googlesyndication.com'];
  for (const d of HIGH) {
    rules.push({
      id: id++,
      priority: 2,
      action: { type: 'block' },
      condition: {
        urlFilter: `||${d}^`,
        resourceTypes: ['script', 'image', 'xmlhttprequest', 'sub_frame', 'media']
      }
    });
  }
  rules.push({
    id: 900001,
    priority: 3,
    action: { type: 'block' },
    condition: {
      urlFilter: '*pagead*',
      resourceTypes: ['script'],
      excludedRequestDomains: [...SAFE_DOMAINS]
    }
  });
  console.log(`[DNR] Generadas ${rules.length} reglas`);
  return rules;
}

// ─── APLICAR DNR ────────────────────────────────────────────
async function applyDNR(rules) {
  try {
    const old = await browser.declarativeNetRequest.getDynamicRules();
    const oldIds = old.map(r => r.id);
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldIds,
      addRules: rules
    });
    console.log(`[DNR] Aplicadas ${rules.length} reglas`);
  } catch (e) {
    console.error('[DNR] Error:', e);
  }
}

// ─── FETCH ──────────────────────────────────────────────────
async function fetchText(url) {
  try {
    console.log(`[Fetch] Descargando ${url}`);
    const r = await fetch(url);
    if (!r.ok) { console.warn(`[Fetch] Falló ${url}: ${r.status}`); return null; }
    const text = await r.text();
    console.log(`[Fetch] Descargado ${url} (${text.length} bytes)`);
    return text;
  } catch (e) {
    console.warn(`[Fetch] Error en ${url}:`, e);
    return null;
  }
}

// ─── ACTUALIZAR FILTROS ────────────────────────────────────
async function updateFilters() {
  console.log('[Engine] Iniciando actualización...');
  const texts = await Promise.all(LISTS.map(fetchText));
  const valid = texts.filter(Boolean);
  console.log(`[Engine] Descargadas ${valid.length} de ${LISTS.length} listas`);

  if (!valid.length) {
    console.warn('[Engine] No se descargaron listas, usando emergencia');
    const emergencyRules = buildRules(['doubleclick.net', 'googlesyndication.com']);
    await applyDNR(emergencyRules);
    return;
  }

  const domains = extractDomains(valid);
  const selectorMap = extractSelectors(valid);
  console.log(`[Engine] Extraídos ${domains.length} dominios, ${selectorMap.size} dominios con cosméticos`);

  const rules = buildRules(domains);
  await applyDNR(rules);

  const selectorArray = Array.from(selectorMap.entries());
  await browser.storage.local.set({ selectorMap: selectorArray, lastUpdated: Date.now() });

  const tabs = await browser.tabs.query({});
  for (const t of tabs) {
    if (!t.id || !t.url) continue;
    try {
      await browser.tabs.sendMessage(t.id, {
        type: 'updateSelectors',
        selectorMap: selectorArray
      });
    } catch {}
  }
  console.log('[Engine] Filtros actualizados correctamente');
}

// ─── INYECTAR COSMÉTICOS AL NAVEGAR ──────────────────────
browser.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const data = await browser.storage.local.get('selectorMap');
  if (data.selectorMap) {
    try {
      await browser.tabs.sendMessage(details.tabId, {
        type: 'updateSelectors',
        selectorMap: data.selectorMap
      });
    } catch {}
  }
});

// ─── INICIO ──────────────────────────────────────────────────
async function init() {
  console.log('[Engine] Service worker iniciado');
  const data = await browser.storage.local.get(['selectorMap', 'lastUpdated']);
  if (data.selectorMap) {
    const tabs = await browser.tabs.query({});
    for (const t of tabs) {
      if (!t.id || !t.url) continue;
      try {
        await browser.tabs.sendMessage(t.id, {
          type: 'updateSelectors',
          selectorMap: data.selectorMap
        });
      } catch {}
    }
  }

  const last = data.lastUpdated || 0;
  if (Date.now() - last > 3600000) {
    await updateFilters();
  } else {
    const rules = buildRules(['doubleclick.net', 'googlesyndication.com']);
    await applyDNR(rules);
  }

  browser.alarms.create('update', { periodInMinutes: 120 });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'update') updateFilters();
  });

  console.log('[Engine] Extensión lista');
}

init();