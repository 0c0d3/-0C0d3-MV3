// core/engine.js

import { Scheduler } from './scheduler.js';
import { Cache } from './cache.js';
import { Parser } from './parser.js';
import { Matcher } from './matcher.js';
import { Logger } from './logger.js';
import { NetworkEngine } from '../network/network-engine.js';
import { CosmeticEngine } from '../cosmetic/cosmetic-engine.js';
import { ScriptletEngine } from '../scriptlets/engine.js';
import { FilterCompiler } from '../filters/compiler.js';
import { FilterDownloader } from '../filters/downloader.js';

const logger = new Logger('Engine');
const cache = new Cache();
const parser = new Parser();
const compiler = new FilterCompiler();
const downloader = new FilterDownloader([
  'https://easylist.to/easylist/easylist.txt',
  'https://easylist.to/easylist/easyprivacy.txt',
  'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=nohtml',
  'https://filters.adtidy.org/extension/ublock/filters/2_optimized.txt',
  'https://easylist.to/easylist/fanboy-annoyance.txt',
  'https://easylist-downloads.adblockplus.org/easylist-cookie.txt',
  'https://raw.githubusercontent.com/yokoffing/filterlists/refs/heads/main/youtube_clear_view.txt'
]);

let networkEngine, cosmeticEngine, scriptletEngine, matcher;

async function init() {
  logger.log('Iniciando motor...');

  // 1. Cargar caché compilado
  const compiled = await cache.load('compiled');
  if (compiled) {
    networkEngine = new NetworkEngine(compiled.network);
    cosmeticEngine = new CosmeticEngine(compiled.cosmetic);
    scriptletEngine = new ScriptletEngine(compiled.scriptlets);
    matcher = new Matcher({ network: networkEngine, cosmetic: cosmeticEngine, scriptlet: scriptletEngine });
    logger.log('Motor cargado desde caché');
  } else {
    await rebuild();
  }

  // 2. Programar actualizaciones
  const scheduler = new Scheduler(120, async () => {
    await updateFilters();
  });
  scheduler.start();

  // 3. Escuchar navegación para aplicar reglas
  browser.webNavigation.onCommitted.addListener(async (details) => {
    if (details.frameId !== 0) return;
    const url = new URL(details.url);
    const hostname = url.hostname;
    if (!hostname) return;

    // Obtener reglas para este dominio
    const domainRules = matcher.match(hostname);

    // Aplicar cosméticos
    if (domainRules.cosmetic && domainRules.cosmetic.length) {
      try {
        await browser.tabs.sendMessage(details.tabId, {
          type: 'applyCosmetics',
          selectors: domainRules.cosmetic
        });
      } catch (e) {}
    }

    // Aplicar scriptlets
    if (domainRules.scriptlets && domainRules.scriptlets.length) {
      try {
        await browser.tabs.sendMessage(details.tabId, {
          type: 'applyScriptlets',
          scriptlets: domainRules.scriptlets
        });
      } catch (e) {}
    }
  });

  logger.log('Motor listo');
}

async function rebuild() {
  logger.log('Descargando listas...');
  const texts = await downloader.downloadAll();
  if (!texts || !texts.length) {
    logger.warn('No se pudieron descargar listas');
    return;
  }

  // Parsear
  const parsed = parser.parse(texts);
  // Compilar
  const compiled = compiler.compile(parsed);

  // Guardar en caché
  await cache.save('compiled', compiled);

  // Inicializar motores
  networkEngine = new NetworkEngine(compiled.network);
  cosmeticEngine = new CosmeticEngine(compiled.cosmetic);
  scriptletEngine = new ScriptletEngine(compiled.scriptlets);
  matcher = new Matcher({ network: networkEngine, cosmetic: cosmeticEngine, scriptlet: scriptletEngine });

  // Construir DNR
  const dnrRules = networkEngine.toDNR();
  await applyDNR(dnrRules);

  logger.log('Filtros compilados y aplicados');
}

async function updateFilters() {
  logger.log('Actualizando filtros...');
  const texts = await downloader.downloadAll();
  if (!texts || !texts.length) return;
  const parsed = parser.parse(texts);
  const compiled = compiler.compile(parsed);
  await cache.save('compiled', compiled);
  networkEngine = new NetworkEngine(compiled.network);
  cosmeticEngine = new CosmeticEngine(compiled.cosmetic);
  scriptletEngine = new ScriptletEngine(compiled.scriptlets);
  matcher = new Matcher({ network: networkEngine, cosmetic: cosmeticEngine, scriptlet: scriptletEngine });
  const dnrRules = networkEngine.toDNR();
  await applyDNR(dnrRules);
  logger.log('Filtros actualizados');
}

async function applyDNR(rules) {
  try {
    const old = await browser.declarativeNetRequest.getDynamicRules();
    const oldIds = old.map(r => r.id);
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldIds,
      addRules: rules
    });
    logger.log(`DNR aplicado: ${rules.length} reglas`);
  } catch (e) {
    logger.error('Error aplicando DNR:', e);
  }
}

init();