// build.js – 0c0d3 Ad-Blocker 9.7.0 (estable, con RuleParser línea por línea)
import { writeFileSync, mkdirSync, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import sharp from 'sharp';
import archiver from 'archiver';
import { RuleParser } from '@adguard/agtree';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ================================================================
// 1. CONFIGURACIÓN
// ================================================================
const MAX_TOTAL_RULES = 30000;  // Límite para Firefox (30k)
const RULES_PER_RULESET = 30800;       // Tamaño de cada ruleset (ajústalo: 10000, 15000, etc.)
const MAX_CHUNK_SIZE = 300 * 1024;
const MAX_DOMAINS_PER_CHUNK = 50;
// ================================================================
// 2. LISTAS DE FILTROS
// ================================================================
const sources = [
  { url: 'https://easylist.to/easylist/easylist.txt', category: 'anuncios' },
  { url: 'https://easylist.to/easylist/easyprivacy.txt', category: 'privacidad' },
  { url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=nohtml', category: 'anuncios' },
  { url: 'https://filters.adtidy.org/extension/ublock/filters/2_optimized.txt', category: 'anuncios' },
  { url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt', category: 'youtube' },
  { url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances.txt', category: 'molestias' },
  { url: 'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_14_Annoyances/filter.txt', category: 'molestias' },
  { url: 'https://easylist.to/easylist/fanboy-annoyance.txt', category: 'molestias' },
  { url: 'https://easylist.to/easylist/fanboy-social.txt', category: 'social' },
  { url: 'https://secure.fanboy.co.nz/fanboy-cookie.txt', category: 'molestias' },
  { url: 'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_3_Spyware/filter.txt', category: 'privacidad' },
  { url: 'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_17_TrackParam/filter.txt', category: 'privacidad' },
  { url: 'https://raw.githubusercontent.com/yokoffing/filterlists/refs/heads/main/privacy_essentials.txt', category: 'privacidad' },
  { url: 'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_4_Social/filter.txt', category: 'social' },
  { url: 'https://raw.githubusercontent.com/DandelionSprout/adfilt/refs/heads/master/LegitimateURLShortener.txt', category: 'limpieza' },
  { url: 'https://raw.githubusercontent.com/DandelionSprout/adfilt/refs/heads/master/ClearURLs%20for%20uBo/clear_urls_uboified.txt', category: 'limpieza' },
  { url: 'https://filters.adtidy.org/extension/ublock/filters/11_optimized.txt', category: 'moviles' },
  { url: 'https://easylist-downloads.adblockplus.org/antiadblockfilters.txt', category: 'antiadblock' },
  { url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/refs/heads/main/adblock/pro.mini.txt', category: 'seguridad' },
  { url: 'https://raw.githubusercontent.com/iam-py-test/uBlock-combo/main/list.txt', category: 'otros' },
  { url: 'https://raw.githubusercontent.com/Kees1958/W3C_annual_most_used_survey_blocklist/refs/heads/master/EU_US_uBol_most_common_ad%2Btracking_networks.txt', category: 'anuncios' },
  { url: 'https://raw.githubusercontent.com/Kees1958/W3C_annual_most_used_survey_blocklist/refs/heads/master/EU_US_MV3_most_common_ad%2Btracking_networks.txt', category: 'anuncios' },
  { url: 'https://raw.githubusercontent.com/Kees1958/W3C_annual_most_used_survey_blocklist/refs/heads/master/Personal_Blocklist.txt', category: 'seguridad' },
  { url: 'https://raw.githubusercontent.com/Kees1958/W3C_annual_most_used_survey_blocklist/refs/heads/master/EU-US_URL_tracking_parameters.txt', category: 'limpieza' },
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

// ================================================================
// 3. UTILIDADES (sin cambios)
// ================================================================
function toPunycode(domain) {
  if (!domain) return domain;
  try {
    if (/^[a-zA-Z0-9.-]+$/.test(domain)) return domain;
    const url = new URL(`http://${domain}`);
    return url.hostname;
  } catch {
    return domain;
  }
}

function isRe2Compatible(regexStr) {
  const unsupported = [
    /\(\?<=/, /\(\?<!/, /\(\?<[!=]/, /\\K/, /\\R/, /\(\*/, /\[[^\]]*:[^\]]*\]/,
    /\(\?=/, /\(\?!/
  ];
  for (const re of unsupported) {
    if (re.test(regexStr)) return false;
  }
  try {
    new RegExp(regexStr);
    return true;
  } catch {
    return false;
  }
}

function getPatternValue(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.value !== undefined && node.value !== null) return String(node.value);
  if (node.pattern) {
    if (typeof node.pattern === 'string') return node.pattern;
    if (node.pattern.value !== undefined) return String(node.pattern.value);
  }
  return '';
}

function extractOptions(node) {
  const opts = {
    thirdParty: null, firstParty: null, domains: [], types: [],
    important: false, badfilter: false,
    document: false, subdocument: false, script: false, image: false,
    stylesheet: false, object: false, xmlhttprequest: false, media: false,
    font: false, websocket: false, ping: false, cspReport: false,
    other: false, webbundle: false, webtransport: false, speculative: false,
    matchCase: false, noMatchCase: false, popup: false, noPopup: false,
    elemHide: false, noElemHide: false, genericHide: false,
    collapse: false, noCollapse: false
  };
  const modifiers = node.modifiers?.children || [];
  if (Array.isArray(modifiers)) {
    for (const mod of modifiers) {
      const modValue = mod.modifier?.value || mod.modifier || '';
      const modName = String(modValue).toLowerCase();
      const val = mod.value || '';
      switch (modName) {
        case 'third-party': opts.thirdParty = true; break;
        case '~third-party': opts.thirdParty = false; break;
        case 'first-party': opts.firstParty = true; break;
        case '~first-party': opts.firstParty = false; break;
        case 'domain':
          if (Array.isArray(val)) opts.domains = val.filter(Boolean);
          else if (val) opts.domains = String(val).split('|').filter(Boolean);
          break;
        case 'important': opts.important = true; break;
        case 'badfilter': opts.badfilter = true; break;
        case 'document': opts.document = true; break;
        case 'subdocument': opts.subdocument = true; break;
        case 'script': opts.script = true; break;
        case 'image': opts.image = true; break;
        case 'stylesheet': opts.stylesheet = true; break;
        case 'object': opts.object = true; break;
        case 'xmlhttprequest': opts.xmlhttprequest = true; break;
        case 'media': opts.media = true; break;
        case 'font': opts.font = true; break;
        case 'websocket': opts.websocket = true; break;
        case 'ping': opts.ping = true; break;
        case 'csp_report': opts.cspReport = true; break;
        case 'other': opts.other = true; break;
        case 'webbundle': opts.webbundle = true; break;
        case 'webtransport': opts.webtransport = true; break;
        case 'speculative': opts.speculative = true; break;
        case 'match-case': opts.matchCase = true; break;
        case '~match-case': opts.noMatchCase = true; break;
        case 'popup': opts.popup = true; break;
        case '~popup': opts.noPopup = true; break;
        case 'elemhide': opts.elemHide = true; break;
        case '~elemhide': opts.noElemHide = true; break;
        case 'generichide': opts.genericHide = true; break;
        case 'collapse': opts.collapse = true; break;
        case '~collapse': opts.noCollapse = true; break;
      }
    }
  }
  return opts;
}

// ================================================================
// 4. PARSER COMPLETO (extrae redes, excepciones, cosméticos y scriptlets)
// ================================================================
function parseList(content) {
  const lines = content.split('\n');
  const networks = [];
  const exceptions = [];
  const cosmetics = {};
  const scriptlets = {};

  function extractDomains(node) {
    if (!node) return ['*'];
    if (Array.isArray(node)) {
      return node.map(d => String(d).trim()).filter(Boolean);
    }
    if (node.type === 'DomainList' && Array.isArray(node.children)) {
      const domains = [];
      for (const child of node.children) {
        if (child.type === 'Domain') {
          const val = child.value || '';
          const isException = child.exception === true;
          domains.push(isException ? '~' + val : val);
        }
      }
      return domains.length ? domains : ['*'];
    }
    try {
      const arr = JSON.parse(JSON.stringify(node));
      if (Array.isArray(arr)) return arr.map(String).filter(Boolean);
    } catch {}
    return ['*'];
  }

  function extractSelector(ast, line) {
    if (ast.raws && ast.raws.selector) return ast.raws.selector;
    if (ast.body && ast.body.selectorList) {
      if (ast.body.selectorList.type === 'Value' && ast.body.selectorList.value) {
        return ast.body.selectorList.value;
      }
      if (typeof ast.body.selectorList === 'string') return ast.body.selectorList;
    }
    if (ast.body && ast.body.type === 'CssSelector' && ast.body.selector) {
      return ast.body.selector;
    }
    if (ast.body && ast.body.value) return ast.body.value;
    if (typeof ast.body === 'string') return ast.body;
    const match = line.match(/(?:##|#@#)(.*)/);
    if (match) return match[1];
    return '';
  }

  function extractScriptlet(ast) {
    let name = '', args = [];
    if (ast.raws && ast.raws.scriptlet) {
      const raw = ast.raws.scriptlet;
      const match = raw.match(/^\+\s*js\s*\(\s*([^,\s]+)\s*,?\s*(.*?)\s*\)$/);
      if (match) {
        name = match[1];
        args = match[2] ? match[2].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')) : [];
        return { name, args };
      }
    }
    if (ast.body && ast.body.type === 'ScriptletInjectionRuleBody' && Array.isArray(ast.body.children)) {
      for (const child of ast.body.children) {
        if (child.type === 'ParameterList' && Array.isArray(child.children)) {
          const params = child.children;
          if (params.length > 0) {
            const nameNode = params[0];
            if (nameNode && nameNode.type === 'Value') {
              name = nameNode.value || '';
            }
            for (let i = 1; i < params.length; i++) {
              const argNode = params[i];
              if (argNode && argNode.type === 'Value') {
                let arg = argNode.value || '';
                arg = arg.replace(/^['"]|['"]$/g, '');
                args.push(arg);
              }
            }
          }
          break;
        }
      }
      if (name) return { name, args };
    }
    if (ast.body && ast.body.name) {
      name = ast.body.name.value || ast.body.name;
      args = (ast.body.args || []).map(a => {
        let val = a.value || a.text || String(a);
        return val.replace(/^['"]|['"]$/g, '');
      });
      return { name, args };
    }
    if (typeof ast.body === 'string') {
      const match = ast.body.match(/^\+\s*js\s*\(\s*([^,\s]+)\s*,?\s*(.*?)\s*\)$/);
      if (match) {
        name = match[1];
        args = match[2] ? match[2].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')) : [];
        return { name, args };
      }
    }
    return null;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('#')) continue;

    try {
      const ast = RuleParser.parse(trimmed);
      if (!ast) continue;

      const ruleType = ast.type || '';
      const isException = ast.exception === true;
      const domains = extractDomains(ast.domains);

      // Cosmética
      if (ruleType === 'ElementHidingRule' || ruleType === 'CosmeticRule' || ruleType === 'ElemHideRule') {
        const selector = extractSelector(ast, trimmed);
        if (selector) {
          for (const domain of domains) {
            if (!cosmetics[domain]) cosmetics[domain] = [];
            cosmetics[domain].push({ selector, exception: isException });
          }
          continue;
        }
        console.warn(`⚠️  No se pudo extraer selector en: "${trimmed.substring(0, 80)}..."`);
        continue;
      }

      // Inyección CSS
      if (ruleType === 'CssInjectionRule') {
        const rawSelector = extractSelector(ast, trimmed);
        if (rawSelector) {
          const cleanSelector = rawSelector.replace(/:style\(.*\)$/, '').trim();
          if (cleanSelector) {
            for (const domain of domains) {
              if (!cosmetics[domain]) cosmetics[domain] = [];
              cosmetics[domain].push({ selector: cleanSelector, exception: isException });
            }
          }
        }
        continue;
      }

      // Filtrado HTML (ignorar)
      if (ruleType === 'HtmlFilteringRule') continue;

      // Scriptlets
      if (ruleType === 'ScriptletInjectionRule' || ruleType === 'ScriptletRule') {
        const scriptlet = extractScriptlet(ast);
        if (scriptlet && scriptlet.name) {
          for (const domain of domains) {
            if (!scriptlets[domain]) scriptlets[domain] = [];
            scriptlets[domain].push({ name: scriptlet.name, args: scriptlet.args });
          }
          continue;
        }
        console.warn(`⚠️  No se pudo extraer scriptlet en: "${trimmed.substring(0, 80)}..."`);
        continue;
      }

      // Reglas de red
      if (ruleType === 'NetworkRule' || ast.pattern) {
        let pattern = getPatternValue(ast);
        if (!pattern && ast.pattern) pattern = getPatternValue(ast.pattern);
        if (pattern) {
          const options = extractOptions(ast);
          const isRegex = pattern.startsWith('/') && pattern.endsWith('/');
          const rule = { pattern, options, isRegex };
          if (isException) exceptions.push(rule);
          else networks.push(rule);
          continue;
        }
        continue;
      }

      if (ruleType === 'AgentCommentRule') continue;
      console.warn(`⚠️  No clasificada: "${trimmed.substring(0, 80)}..." (type: ${ruleType})`);

    } catch (e) {
      console.warn(`⚠️  Error parseando línea: "${trimmed.substring(0, 80)}..." -> ${e.message}`);
    }
  }

  return { networks, exceptions, cosmetics, scriptlets };
}

// ================================================================
// 5. DESCARGA PARALELA
// ================================================================
async function downloadAll() {
  const results = [];
  const concurrency = 5;
  const queue = [...sources];
  const inProgress = new Set();

  async function worker() {
    while (queue.length > 0) {
      const src = queue.shift();
      if (!src) break;
      inProgress.add(src.url);
      try {
        console.log(`⬇️  Descargando: ${src.url} (${inProgress.size}/${sources.length})`);
        const response = await axios.get(src.url, {
          timeout: 60000,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Node.js)' }
        });
        if (response.data.length === 0) throw new Error('Respuesta vacía');
        results.push({ ...src, content: response.data });
      } catch (err) {
        console.error(`   ❌ Error en ${src.url}: ${err.message}`);
      }
      inProgress.delete(src.url);
    }
  }

  const workers = Array(Math.min(concurrency, sources.length)).fill().map(() => worker());
  await Promise.all(workers);
  return results;
}

// ================================================================
// 6. CONVERSIÓN ABP → DNR
// ================================================================
function convertPatternToDNR(pattern, isRegex) {
  if (isRegex) {
    const regexStr = pattern.slice(1, -1);
    if (!isRe2Compatible(regexStr)) return null;
    return { regexFilter: regexStr };
  }
  let cleaned = pattern.replace(/\s/g, '');
  if (!cleaned || cleaned.length < 2) return null;

  if (/[^\x00-\x7F]/.test(cleaned)) {
    const domainMatch = cleaned.match(/^\|\|([^\/\^]+)/);
    if (domainMatch) {
      const domain = domainMatch[1];
      const puny = toPunycode(domain);
      if (puny && puny !== domain) cleaned = cleaned.replace(domain, puny);
      else return null;
    } else return null;
  }

  if (cleaned.startsWith('||*') || cleaned.includes('||*')) return null;
  if (cleaned.startsWith('/') && !cleaned.endsWith('/')) return null;
  if (cleaned === '*' || cleaned === '^*' || cleaned === '^') return null;

  let urlFilter = cleaned;
  if (/^\|\|[a-zA-Z0-9.-]+\^$/.test(cleaned)) {
    urlFilter = cleaned.slice(0, -1);
  }
  if (/^\|\|[a-zA-Z0-9.-]+\^\/.+/.test(cleaned)) {
    urlFilter = cleaned.replace('^/', '/');
  }
  if (/^\|https?:\/\//.test(cleaned)) {
    urlFilter = cleaned.slice(1);
  }

  return { urlFilter };
}

// ================================================================
// 7. GENERACIÓN DE RULESETS (respeta MAX_TOTAL_RULES)
// ================================================================
function generateRulesets(networks, exceptions) {
  const MAX_TOTAL = MAX_TOTAL_RULES;
  const NEVER_BLOCK = ['googlevideo.com', 'ytimg.com', 'youtubei.googleapis.com'];

  // Filtrar badfilter
  const badfilterSet = new Set();
  for (const rule of networks) {
    if (rule.options.badfilter) {
      const key = rule.pattern + '|' + JSON.stringify({ ...rule.options, badfilter: false });
      badfilterSet.add(key);
    }
  }
  const filteredNetworks = networks.filter(r => {
    const key = r.pattern + '|' + JSON.stringify({ ...r.options, badfilter: false });
    return !badfilterSet.has(key);
  });

  const SUPPORTED_TYPES = ['script', 'image', 'stylesheet', 'object', 'xmlhttprequest',
    'sub_frame', 'main_frame', 'media', 'font', 'websocket', 'ping', 'csp_report'];

  function buildCondition(rule, isException) {
    const { pattern, options, isRegex } = rule;
    if (!pattern) return null;

    // 1. NEVER_BLOCK (dominios esenciales)
    for (const never of NEVER_BLOCK) {
      if (pattern.includes(never)) return null;
    }

    // 2. Excluir rutas esenciales de YouTube SOLO si son exactas
    const YOUTUBE_ESSENTIAL = [
      'googlevideo.com/videoplayback',
      'youtube.com/playlist',
      'youtube.com/watch',
      'youtube.com/youtubei/v1/player',
      'youtube.com/youtubei/v1/get_watch'
    ];
    if (!isRegex) {
      for (const essential of YOUTUBE_ESSENTIAL) {
        // Solo excluir si el patrón es exactamente ||essential o ^essential
        if (pattern === '||' + essential || pattern === '^' + essential || pattern === essential) {
          return null;
        }
      }
    } else {
      const regexStr = pattern.slice(1, -1);
      for (const essential of YOUTUBE_ESSENTIAL) {
        const escaped = essential.replace(/\./g, '\\.');
        // Solo excluir si la regex es exactamente la ruta esencial
        if (regexStr === escaped || regexStr === '^' + escaped || regexStr === '||' + escaped) {
          return null;
        }
      }
    }

    // 3. Convertir patrón a DNR
    const patternResult = convertPatternToDNR(pattern, isRegex);
    if (!patternResult) return null;

    const condition = {
      isUrlFilterCaseSensitive: options.matchCase || false
    };
    if (patternResult.regexFilter) condition.regexFilter = patternResult.regexFilter;
    else if (patternResult.urlFilter) condition.urlFilter = patternResult.urlFilter;
    else return null;

    // 4. Tipos de recurso
    const types = [];
    if (options.script) types.push('script');
    if (options.image) types.push('image');
    if (options.stylesheet) types.push('stylesheet');
    if (options.object) types.push('object');
    if (options.xmlhttprequest) types.push('xmlhttprequest');
    if (options.subdocument) types.push('sub_frame');
    if (options.document) types.push('main_frame');
    if (options.media) types.push('media');
    if (options.font) types.push('font');
    if (options.websocket) types.push('websocket');
    if (options.ping) types.push('ping');
    if (options.cspReport) types.push('csp_report');
    const filteredTypes = types.filter(t => SUPPORTED_TYPES.includes(t));
    if (filteredTypes.length > 0) condition.resourceTypes = filteredTypes;

    // 5. Dominios (initiatorDomains / excludedInitiatorDomains)
    const domains = options.domains || [];
    if (domains.length > 0) {
      const include = [], exclude = [];
      for (const d of domains) {
        const clean = d.startsWith('~') ? d.slice(1) : d;
        let puny = clean;
        if (/[^\x00-\x7F]/.test(clean)) { puny = toPunycode(clean); if (!puny) continue; }
        if (d.startsWith('~')) exclude.push(puny);
        else include.push(puny);
      }
      if (include.length > 0) condition.initiatorDomains = include;
      if (exclude.length > 0) condition.excludedInitiatorDomains = exclude;
    }

    return condition;
  }

  // 1. Bloqueos (priority 1 o 3)
  const blockRules = [];
  let id = 1;
  for (const rule of filteredNetworks) {
    const condition = buildCondition(rule, false);
    if (condition) {
      const priority = rule.options.important ? 3 : 1;
      blockRules.push({ id: id++, priority, action: { type: 'block' }, condition });
    }
  }

  // --- AÑADIR REGLAS MANUALES PARA ANUNCIOS DE YOUTUBE (prioridad alta) ---
  const YOUTUBE_ADS = [
    'pagead2.googlesyndication.com',
    'doubleclick.net',
    'googleads.g.doubleclick.net',
    'static.doubleclick.net',
    'www.googleadservices.com',
    'adservice.google.com',
    'googleadsserving.cn',
    'googlesyndication.com'
  ];
  for (const adDomain of YOUTUBE_ADS) {
    blockRules.push({
      id: id++,
      priority: 3, // prioridad alta para asegurar bloqueo
      action: { type: 'block' },
      condition: {
        urlFilter: '||' + adDomain + '^',
        isUrlFilterCaseSensitive: false,
        resourceTypes: ['script', 'image', 'xmlhttprequest', 'sub_frame']
      }
    });
  }
  console.log(`[generateRulesets] Añadidas ${YOUTUBE_ADS.length} reglas manuales para anuncios de YouTube`);

  // 2. Excepciones (priority 10)
  const allowRules = [];
  for (const ex of exceptions) {
    const condition = buildCondition(ex, true);
    if (condition) {
      allowRules.push({ id: id++, priority: 10, action: { type: 'allow' }, condition });
    }
  }

  // 3. Combinar: bloqueos primero, luego excepciones
  const combined = [...blockRules, ...allowRules];

  // 4. Truncar al límite global
  const limited = combined.slice(0, MAX_TOTAL);

  // 5. Reasignar IDs
  limited.forEach((rule, index) => { rule.id = index + 1; });

  // 6. Dividir en rulesets
  const rulesets = [];
  for (let i = 0; i < limited.length; i += RULES_PER_RULESET) {
    rulesets.push(limited.slice(i, i + RULES_PER_RULESET));
  }

  console.log(`[generateRulesets] Total reglas (antes de truncar): ${combined.length}`);
  console.log(`[generateRulesets] Total reglas (después de truncar): ${limited.length}`);
  console.log(`[generateRulesets] Rulesets generados: ${rulesets.length}`);

  return { rulesets, totalRules: limited.length };
}

// ================================================================
// 8. RUNTIME DE SCRIPTLETS (corregido)
// ================================================================
function generateScriptletRuntime() {
  return `// 0c0d3 Scriptlet Runtime v9.7
window.__0c0d3Runtime = window.__0c0d3Runtime || {};
const runtime = {
  set: function(obj, prop, value) {
    try {
      const parts = prop.split('.');
      let target = obj;
      for (let i=0; i<parts.length-1; i++) {
        if (target[parts[i]] === undefined) target[parts[i]] = {};
        target = target[parts[i]];
      }
      target[parts[parts.length-1]] = value;
      return true;
    } catch(e) { return false; }
  },
  "set-constant": function(prop, value) {
    return this.set(window, prop, value);
  },
  "abort-on-property-read": function(obj, prop) {
    try {
      const parts = prop.split('.');
      let target = obj;
      for (let i=0; i<parts.length-1; i++) {
        if (target[parts[i]] === undefined) return false;
        target = target[parts[i]];
      }
      const last = parts[parts.length-1];
      Object.defineProperty(target, last, {
        get: function() { throw new Error('Aborted'); },
        set: undefined,
        configurable: true,
        enumerable: true
      });
      return true;
    } catch(e) { return false; }
  },
  "abort-on-property-write": function(obj, prop) {
    try {
      const parts = prop.split('.');
      let target = obj;
      for (let i=0; i<parts.length-1; i++) {
        if (target[parts[i]] === undefined) return false;
        target = target[parts[i]];
      }
      const last = parts[parts.length-1];
      Object.defineProperty(target, last, {
        get: function() { return undefined; },
        set: function() { throw new Error('Aborted'); },
        configurable: true,
        enumerable: true
      });
      return true;
    } catch(e) { return false; }
  },
  "abort-current-inline-script": function(obj, prop) {
    try {
      const parts = prop.split('.');
      let target = obj;
      for (let i=0; i<parts.length-1; i++) {
        if (target[parts[i]] === undefined) return false;
        target = target[parts[i]];
      }
      const last = parts[parts.length-1];
      Object.defineProperty(target, last, {
        get: function() { return function() {}; },
        set: function() {},
        configurable: true,
        enumerable: true
      });
      return true;
    } catch(e) { return false; }
  },
  "json-prune": function(obj, prop) {
    try {
      const parts = prop.split('.');
      let target = obj;
      for (let i=0; i<parts.length-1; i++) {
        if (target[parts[i]] === undefined) return false;
        target = target[parts[i]];
      }
      delete target[parts[parts.length-1]];
      return true;
    } catch(e) { return false; }
  },
  "prevent-fetch": function(urlPattern) {
    try {
      const origFetch = window.fetch;
      window.fetch = function(url, options) {
        if (typeof url === "string" && url.includes(urlPattern)) {
          return Promise.resolve(new Response("", { status: 404 }));
        }
        return origFetch.call(this, url, options);
      };
      return true;
    } catch(e) { return false; }
  },
  "prevent-xhr": function(urlPattern) {
    try {
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        this._abort = false;
        if (typeof url === "string" && url.includes(urlPattern)) {
          this._abort = true;
        }
        return origOpen.call(this, method, url, async, user, password);
      };
      XMLHttpRequest.prototype.send = function(body) {
        if (this._abort) {
          this.abort();
          return;
        }
        return origSend.call(this, body);
      };
      return true;
    } catch(e) { return false; }
  },
  "trusted-remove-element": function(selector) {
    try {
      const el = document.querySelector(selector);
      if (el) { el.remove(); return true; }
      return false;
    } catch(e) { return false; }
  },
  "remove-attr": function(selector, attr) {
    try {
      document.querySelectorAll(selector).forEach(el => el.removeAttribute(attr));
      return true;
    } catch(e) { return false; }
  },
  "remove-class": function(selector, cls) {
    try {
      document.querySelectorAll(selector).forEach(el => el.classList.remove(cls));
      return true;
    } catch(e) { return false; }
  },
  "trusted-set-cookie": function(name, value, options) {
    try {
      let cookie = name + "=" + value + "; path=/";
      if (options) cookie += "; " + options;
      document.cookie = cookie;
      return true;
    } catch(e) { return false; }
  },
  "no-fetch-if": function(urlPattern) { return this["prevent-fetch"](urlPattern); },
  "no-xhr-if": function(urlPattern) { return this["prevent-xhr"](urlPattern); },
  "window-close-if": function(condition) {
    try {
      const fn = new Function("return " + condition);
      if (fn()) window.close();
      return true;
    } catch(e) { return false; }
  }
};
Object.assign(window.__0c0d3Runtime, runtime);
window.__runtime = window.__0c0d3Runtime;`;
}

// ================================================================
// 9. CONTENT SCRIPT (versión limpia, solo envía mensajes al background)
// ================================================================
function generateContentScript() {
  return `// content.js – 0c0d3 v9.7
(function() {
  const api = (typeof browser !== "undefined") ? browser : (typeof chrome !== "undefined") ? chrome : null;
  if (!api) {
    console.warn("0c0d3: No se encontró API del navegador");
    return;
  }

  let cosmeticData = null;
  let scriptletData = null;
  let cacheKey = null;
  let observer = null;
  let debounceTimer = null;
  let previousHash = 0;

  async function loadData() {
    const hostname = window.location.hostname.toLowerCase();
    const key = hostname.charAt(0).toLowerCase();

    if (cacheKey === key && cosmeticData) return true;

    try {
      const idxResp = await fetch(api.runtime.getURL("cosmetic-index.json"));
      if (!idxResp.ok) throw new Error("Failed to fetch index: " + idxResp.status);
      const idx = await idxResp.json();

      let chunkFiles = idx[key] || idx["default"];
      if (!chunkFiles) {
        console.warn("0c0d3: No chunk files found for key:", key);
        return false;
      }
      if (!Array.isArray(chunkFiles)) chunkFiles = [chunkFiles];

      cosmeticData = {};
      scriptletData = {};

      for (const file of chunkFiles) {
        const chunkResp = await fetch(api.runtime.getURL("cosmetic/" + file));
        if (!chunkResp.ok) {
          console.warn("0c0d3: Failed to fetch " + file + ": " + chunkResp.status);
          continue;
        }
        const chunk = await chunkResp.json();
        Object.assign(cosmeticData, chunk.cosmetics || {});
        Object.assign(scriptletData, chunk.scriptlets || {});
      }

      cacheKey = key;
      console.log("0c0d3: Datos cargados para " + hostname + " - " + Object.keys(cosmeticData).length + " dominios cosméticos, " + Object.keys(scriptletData).length + " con scriptlets");
      return true;
    } catch(e) {
      console.warn("0c0d3: Error cargando datos", e);
      return false;
    }
  }

  function getSelectors() {
    if (!cosmeticData) return [];
    const hostname = window.location.hostname.toLowerCase();
    let selectors = [];
    let exceptions = new Set();

    for (const domain in cosmeticData) {
      if (domain === "*" || hostname === domain || hostname.endsWith("." + domain)) {
        const items = cosmeticData[domain];
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.exception && item.selector) {
              exceptions.add(item.selector);
            } else if (item.selector && !exceptions.has(item.selector)) {
              selectors.push(item.selector);
            }
          }
        }
      }
    }

    return selectors.filter(function(s) { return !exceptions.has(s); });
  }

  function applyCosmetics() {
    var selectors = getSelectors();

    document.querySelectorAll("style[id^=\\"_0c0d3_css_\\"]").forEach(function(style) { style.remove(); });

    if (selectors.length === 0) {
      previousHash = 0;
      return;
    }

    var h = 0;
    for (var i = 0; i < selectors.length; i++) {
      h = ((h << 5) - h) + selectors[i].length;
      h |= 0;
    }

    if (h === previousHash) return;
    previousHash = h;

    var BLOCK_SIZE = 5000;
    var blocks = [];
    for (var i = 0; i < selectors.length; i += BLOCK_SIZE) {
      blocks.push(selectors.slice(i, i + BLOCK_SIZE));
    }

    for (var b = 0; b < blocks.length; b++) {
      var style = document.createElement("style");
      style.id = "_0c0d3_css_" + b;
      var css = "";
      for (var j = 0; j < blocks[b].length; j++) {
        css += blocks[b][j] + " { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }\\n";
      }
      style.textContent = css;
      (document.head || document.documentElement || document.body).appendChild(style);
    }

    console.log("🎨 0c0d3: Aplicados " + selectors.length + " selectores en " + window.location.hostname);
  }

  function sendScriptletsToBackground() {
    if (!scriptletData) return;

    var hostname = window.location.hostname.toLowerCase();
    var scriptletCalls = [];

    for (var domain in scriptletData) {
      if (domain === "*" || hostname === domain || hostname.endsWith("." + domain)) {
        var scripts = scriptletData[domain];
        if (Array.isArray(scripts)) {
          for (var k = 0; k < scripts.length; k++) {
            scriptletCalls.push(scripts[k]);
          }
        }
      }
    }

    if (scriptletCalls.length === 0) {
      console.log("0c0d3: No scriptlets para " + hostname);
      return;
    }

    console.log("0c0d3: Enviando " + scriptletCalls.length + " scriptlets para " + hostname + " al background");
    api.runtime.sendMessage({
      action: "injectScriptlets",
      calls: scriptletCalls
    }).then(function(response) {
      if (response && response.ok) {
        console.log("0c0d3: Scriptlets inyectados correctamente en " + hostname);
      } else {
        console.warn("0c0d3: Error inyectando scriptlets en " + hostname, response);
      }
    }).catch(function(e) {
      console.warn("0c0d3: Error enviando scriptlets al background", e);
    });
  }

  function debouncedApply() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() { applyCosmetics(); }, 300);
  }

  async function init() {
    var loaded = await loadData();
    if (!loaded) return;
    try {
      applyCosmetics();
      sendScriptletsToBackground();

      if (observer) observer.disconnect();
      observer = new MutationObserver(debouncedApply);
      observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    } catch(e) {
      console.error("0c0d3: Error en init:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() { init(); });
  } else {
    init();
  }
})();`;
}

// ================================================================
// 10. DIVISIÓN DE CHUNKS COSMÉTICOS (incluye scriptlets)
// ================================================================
function splitCosmeticData(cosmetics, scriptlets) {
  const chunks = {};
  const index = {};
  const domains = Object.keys(cosmetics).filter(d => d && d.length > 0);

  const groups = {};
  for (const domain of domains) {
    let key = domain === '*' ? 'default' : domain.charAt(0).toLowerCase();
    if (!key || !/^[a-z0-9]$/.test(key)) {
      key = 'other';
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(domain);
  }

  for (const key of Object.keys(groups)) {
    const domainList = groups[key];
    const entries = domainList.map(domain => [domain, cosmetics[domain]]);
    const subChunks = [];
    let currentChunk = {};
    let currentSize = 0;
    let currentCount = 0;
    for (let e = 0; e < entries.length; e++) {
      const domain = entries[e][0];
      const selectors = entries[e][1];
      const entryStr = JSON.stringify({ [domain]: selectors });
      const size = Buffer.byteLength(entryStr, 'utf8');
      if ((currentSize + size > MAX_CHUNK_SIZE || currentCount >= MAX_DOMAINS_PER_CHUNK) && Object.keys(currentChunk).length > 0) {
        subChunks.push(currentChunk);
        currentChunk = {};
        currentSize = 0;
        currentCount = 0;
      }
      currentChunk[domain] = selectors;
      currentSize += size;
      currentCount++;
    }
    if (Object.keys(currentChunk).length > 0) subChunks.push(currentChunk);

    const scriptletEntries = {};
    for (const domain of domainList) {
      if (scriptlets[domain]) scriptletEntries[domain] = scriptlets[domain];
    }

    const safeKey = key.replace(/[^a-zA-Z0-9]/g, '_');
    if (subChunks.length === 1) {
      const fileName = `cosmetic_${safeKey}.json`;
      chunks[fileName] = { cosmetics: subChunks[0], scriptlets: scriptletEntries };
      index[key] = fileName;
    } else {
      const fileNames = [];
      for (let i = 0; i < subChunks.length; i++) {
        const fileName = `cosmetic_${safeKey}_${i}.json`;
        chunks[fileName] = { cosmetics: subChunks[i], scriptlets: scriptletEntries };
        fileNames.push(fileName);
      }
      index[key] = fileNames;
    }
  }
  return { chunks, index };
}

// ================================================================
// 11. ICONO, POPUP, OPTIONS
// ================================================================
async function generateIconBuffer() {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">' +
    '<rect width="48" height="48" rx="8" fill="#1e90ff"/>' +
    '<path d="M24 8 L8 16 L8 32 L24 40 L40 32 L40 16 Z" fill="white" opacity="0.9"/>' +
    '<text x="24" y="30" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1e90ff" text-anchor="middle">AB</text>' +
    '</svg>';
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

function generatePopupHTML(totalNetwork, totalExceptions, totalCosmetic, totalScriptlets, version) {
  const dateStr = new Date(version).toLocaleString();
  return '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>0c0d3</title>\n' +
    '<style>\n' +
    'body { width: 320px; font-family: "Segoe UI", sans-serif; padding: 12px; background: #f0f2f5; margin: 0; }\n' +
    'h1 { font-size: 16px; margin: 0 0 10px 0; color: #1e293b; display: flex; align-items: center; gap: 8px; }\n' +
    'h1 span { background: #1e90ff; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; }\n' +
    '.controls { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }\n' +
    '.controls label { font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 4px; }\n' +
    '#reloadBtn { background: #3b82f6; color: #fff; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }\n' +
    '#reloadBtn:hover { background: #2563eb; }\n' +
    '#status { background: #fff; padding: 8px 12px; border-radius: 6px; font-size: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }\n' +
    '#status p { margin: 2px 0; }\n' +
    '</style>\n' +
    '</head>\n<body>\n' +
    '<h1>🛡️ 0c0d3 <span>v3.0.3</span></h1>\n' +
    '<div class="controls">\n' +
    '<label><input type="checkbox" id="enableToggle" checked> Activar</label>\n' +
    '<button id="reloadBtn">🔄 Actualizar</button>\n' +
    '</div>\n' +
    '<div id="status">\n' +
    '<p>Red: <span id="totalNetwork">' + totalNetwork + '</span> reglas</p>\n' +
    '<p>Excepciones: <span id="totalExceptions">' + totalExceptions + '</span></p>\n' +
    '<p>Cosmética: <span id="totalCosmetic">' + totalCosmetic + '</span> selectores</p>\n' +
    '<p>Scriptlets: <span id="totalScriptlets">' + totalScriptlets + '</span></p>\n' +
    '<p>Última: <span id="lastUpdate">' + dateStr + '</span></p>\n' +
    '</div>\n' +
    '<script>\n' +
    'const api = (typeof browser !== "undefined") ? browser : chrome;\n' +
    'async function loadState() {\n' +
    '  try {\n' +
    '    const state = await api.runtime.sendMessage({ action: "getState" });\n' +
    '    document.getElementById("enableToggle").checked = state.enabled !== false;\n' +
    '    document.getElementById("totalNetwork").textContent = state.totalNetwork || 0;\n' +
    '    document.getElementById("totalExceptions").textContent = state.totalExceptions || 0;\n' +
    '    document.getElementById("totalCosmetic").textContent = state.totalCosmetic || 0;\n' +
    '    document.getElementById("totalScriptlets").textContent = state.totalScriptlets || 0;\n' +
    '    document.getElementById("lastUpdate").textContent = state.lastUpdate || "Nunca";\n' +
    '  } catch (e) { console.error("Error cargando estado:", e); }\n' +
    '}\n' +
    'document.getElementById("reloadBtn").addEventListener("click", async function() {\n' +
    '  const btn = document.getElementById("reloadBtn");\n' +
    '  btn.textContent = "⏳ ...";\n' +
    '  btn.disabled = true;\n' +
    '  try {\n' +
    '    await api.runtime.sendMessage({ action: "reloadFilters" });\n' +
    '    await loadState();\n' +
    '    const tabs = await api.tabs.query({ active: true, currentWindow: true });\n' +
    '    if (tabs[0]) await api.tabs.reload(tabs[0].id);\n' +
    '  } catch (e) { console.error("Error recargando:", e); }\n' +
    '  btn.textContent = "🔄 Actualizar";\n' +
    '  btn.disabled = false;\n' +
    '});\n' +
    'document.getElementById("enableToggle").addEventListener("change", async function(e) {\n' +
    '  try {\n' +
    '    await api.runtime.sendMessage({ action: "toggle", enabled: e.target.checked });\n' +
    '  } catch (err) { console.error("Error cambiando estado:", err); }\n' +
    '});\n' +
    'loadState();\n' +
    '</script>\n' +
    '</body></html>';
}

function generateOptionsHTML() {
  return '<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"><title>0c0d3 - Opciones</title>\n' +
    '<style>\n' +
    'body { font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background: #f0f2f5; }\n' +
    'h1 { color: #1e293b; }\n' +
    '.card { background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 12px; }\n' +
    'button { background: #3b82f6; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }\n' +
    'button:hover { background: #2563eb; }\n' +
    '</style>\n' +
    '</head>\n<body>\n' +
    '<h1>⚙️ 0c0d3 - Opciones</h1>\n' +
    '<div class="card"><h3>Estado</h3>\n' +
    '<p>Bloqueador activo: <span id="status">Cargando...</span></p>\n' +
    '<button id="toggleBtn">Cambiar estado</button>\n' +
    '</div>\n' +
    '<div class="card"><h3>Estadísticas</h3>\n' +
    '<p>Reglas de red: <span id="totalNetwork">-</span></p>\n' +
    '<p>Excepciones: <span id="totalExceptions">-</span></p>\n' +
    '<p>Selectores cosméticos: <span id="totalCosmetic">-</span></p>\n' +
    '<p>Scriptlets: <span id="totalScriptlets">-</span></p>\n' +
    '</div>\n' +
    '<script>\n' +
    'const api = (typeof browser !== "undefined") ? browser : chrome;\n' +
    'async function loadState() {\n' +
    '  const state = await api.runtime.sendMessage({ action: "getState" });\n' +
    '  document.getElementById("status").textContent = state.enabled ? "✅ Activo" : "❌ Inactivo";\n' +
    '  document.getElementById("totalNetwork").textContent = state.totalNetwork || 0;\n' +
    '  document.getElementById("totalExceptions").textContent = state.totalExceptions || 0;\n' +
    '  document.getElementById("totalCosmetic").textContent = state.totalCosmetic || 0;\n' +
    '  document.getElementById("totalScriptlets").textContent = state.totalScriptlets || 0;\n' +
    '}\n' +
    'document.getElementById("toggleBtn").addEventListener("click", async function() {\n' +
    '  const state = await api.runtime.sendMessage({ action: "getState" });\n' +
    '  await api.runtime.sendMessage({ action: "toggle", enabled: !state.enabled });\n' +
    '  await loadState();\n' +
    '});\n' +
    'loadState();\n' +
    '</script>\n' +
    '</body></html>';
}

// ================================================================
// 12. FUNCIÓN PRINCIPAL BUILD
// ================================================================
async function build() {
  console.log('🚀 Construyendo 0c0d3 Ad-Blocker 3.0.3 para Firefox MV3\n');

  const allNetworks = [], allExceptions = [], allCosmetics = {}, allScriptlets = {};

  // 1. Descargar listas
  const downloads = await downloadAll();

  // 2. Parsear cada lista
  for (const dl of downloads) {
    if (!dl.content) continue;
    const { networks, exceptions, cosmetics, scriptlets } = parseList(dl.content);
    for (const n of networks) allNetworks.push(n);
    for (const e of exceptions) allExceptions.push(e);
    for (const [domain, selectors] of Object.entries(cosmetics)) {
      if (!allCosmetics[domain]) allCosmetics[domain] = [];
      for (const sel of selectors) allCosmetics[domain].push(sel);
    }
    for (const [domain, scrs] of Object.entries(scriptlets)) {
      if (!allScriptlets[domain]) allScriptlets[domain] = [];
      for (const scr of scrs) allScriptlets[domain].push(scr);
    }
    console.log('   ✅ ' + networks.length + ' redes, ' + exceptions.length + ' excepciones, ' +
      Object.values(cosmetics).reduce((a, b) => a + b.length, 0) + ' cosméticas, ' +
      Object.values(scriptlets).reduce((a, b) => a + b.length, 0) + ' scriptlets (' + dl.category + ')');
  }

  // 3. Deduplicar
  const networkMap = new Map();
  for (const rule of allNetworks) {
    const key = rule.pattern + '|' + JSON.stringify(rule.options) + '|' + rule.isRegex;
    if (!networkMap.has(key)) networkMap.set(key, rule);
  }
  const uniqueNetworks = Array.from(networkMap.values());

  const exceptionMap = new Map();
  for (const ex of allExceptions) {
    const key = ex.pattern + '|' + JSON.stringify(ex.options) + '|' + ex.isRegex;
    if (!exceptionMap.has(key)) exceptionMap.set(key, ex);
  }
  const uniqueExceptions = Array.from(exceptionMap.values());

  const cosmeticDeduplicated = {};
  for (const [domain, selectors] of Object.entries(allCosmetics)) {
    const unique = [];
    const seen = new Set();
    for (const sel of selectors) {
      const key = sel.selector + '|' + sel.exception;
      if (!seen.has(key)) { seen.add(key); unique.push(sel); }
    }
    if (unique.length) cosmeticDeduplicated[domain] = unique;
  }

  const scriptletDeduplicated = {};
  for (const [domain, scrs] of Object.entries(allScriptlets)) {
    const unique = [];
    const seen = new Set();
    for (const scr of scrs) {
      const key = JSON.stringify(scr);
      if (!seen.has(key)) { seen.add(key); unique.push(scr); }
    }
    if (unique.length) scriptletDeduplicated[domain] = unique;
  }

  const totalNetwork = uniqueNetworks.length;
  const totalExceptions = uniqueExceptions.length;
  const totalCosmetic = Object.values(cosmeticDeduplicated).reduce((a, b) => a + b.length, 0);
  const totalScriptlets = Object.values(scriptletDeduplicated).reduce((a, b) => a + b.length, 0);

  console.log('\n📊 Totales: ' + totalNetwork + ' reglas de red, ' + totalExceptions + ' excepciones, ' +
    totalCosmetic + ' selectores cosméticos, ' + totalScriptlets + ' scriptlets');

  // 4. Generar rulesets DNR
  const { rulesets, totalRules } = generateRulesets(uniqueNetworks, uniqueExceptions);
  console.log('   📦 Generados ' + rulesets.length + ' rulesets con ' + totalRules + ' reglas totales');

  const extPath = join(__dirname, 'extension');
  mkdirSync(extPath, { recursive: true });

  const rulesDir = join(extPath, 'rules');
  mkdirSync(rulesDir, { recursive: true });
  const ruleResources = [];
  for (let i = 0; i < rulesets.length; i++) {
    const id = 'ruleset_' + (i + 1);
    const path = 'rules/' + id + '.json';
    const validRules = rulesets[i].filter(r => {
      const hasId = r.id && typeof r.id === 'number';
      const hasPriority = r.priority && typeof r.priority === 'number';
      const hasAction = r.action && r.action.type && ['block', 'allow'].includes(r.action.type);
      const hasCondition = r.condition && (r.condition.urlFilter || r.condition.regexFilter);
      return hasId && hasPriority && hasAction && hasCondition;
    });
    if (validRules.length === 0) {
      console.warn('   ⚠️  ' + path + ' no tiene reglas válidas, omitiendo');
      continue;
    }
    writeFileSync(join(rulesDir, id + '.json'), JSON.stringify(validRules));
    ruleResources.push({ id, enabled: true, path });
    console.log('   📄 Escrito ' + path + ' con ' + validRules.length + ' reglas válidas');
  }

  // 5. Dividir cosméticos y scriptlets en chunks
  const { chunks, index } = splitCosmeticData(cosmeticDeduplicated, scriptletDeduplicated);

  const cosmeticDir = join(extPath, 'cosmetic');
  mkdirSync(cosmeticDir, { recursive: true });
  for (const [fileName, data] of Object.entries(chunks)) {
    writeFileSync(join(cosmeticDir, fileName), JSON.stringify(data));
  }
  writeFileSync(join(extPath, 'cosmetic-index.json'), JSON.stringify(index));
  console.log('   📦 Generados ' + Object.keys(chunks).length + ' chunks cosméticos');

  // 6. Runtime y content script
  const runtimeScript = generateScriptletRuntime();
  writeFileSync(join(extPath, 'runtime.js'), runtimeScript);

  const contentScript = generateContentScript(); // ahora es una función
  const contentDir = join(extPath, 'content');
  mkdirSync(contentDir, { recursive: true });
  writeFileSync(join(contentDir, 'content.js'), contentScript);

  // 7. Popup, icono, opciones
  const popupPath = join(extPath, 'popup');
  mkdirSync(popupPath, { recursive: true });
  writeFileSync(join(popupPath, 'popup.html'), generatePopupHTML(totalNetwork, totalExceptions, totalCosmetic, totalScriptlets, Date.now()));

  const iconPath = join(extPath, 'icons');
  mkdirSync(iconPath, { recursive: true });
  const iconBuffer = await generateIconBuffer();
  writeFileSync(join(iconPath, 'icon.png'), iconBuffer);

  writeFileSync(join(extPath, 'options.html'), generateOptionsHTML());

  // 8. MANIFEST
  const manifest = {
    manifest_version: 3,
    name: '0c0d3',
    version: '3.0.3',
    description: '0c0d3 Ad-Blocker',
    permissions: [
      'declarativeNetRequest',
      'storage',
      'tabs',
      'scripting',
      'webNavigation'
    ],
    host_permissions: ['<all_urls>'],
    background: {
      scripts: ['background.js']
    },
    action: {
      default_title: '0c0d3',
      default_icon: { '48': 'icons/icon.png' },
      default_popup: 'popup/popup.html'
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true
    },
    content_scripts: [{
      matches: ['<all_urls>'],
      js: ['content/content.js'],
      run_at: 'document_start',
      all_frames: true
    }],
    declarative_net_request: {
      rule_resources: ruleResources
    },
    web_accessible_resources: [{
      resources: ['runtime.js', 'cosmetic/*.json', 'cosmetic-index.json'],
      matches: ['<all_urls>']
    }],
    icons: { '48': 'icons/icon.png' },
    browser_specific_settings: {
      gecko: {
        id: '{bb6f4d85-3cea-4bb4-8599-be8362e09673}',
        strict_min_version: '109.0'
      }
    }
  };
  writeFileSync(join(extPath, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // 9. BACKGROUND.JS
  const ruleIds = ruleResources.map(r => r.id);

  const bgCode = `
// background.js – 0c0d3 v3.0.3 (completo con inyección automática de runtime y scriptlets)
const api = (typeof browser !== "undefined") ? browser : chrome;

let enabled = true;
const runtimeInjected = new Set();
const cosmeticInjected = new Set();

const RULE_IDS = ${JSON.stringify(ruleIds)};

async function loadState() {
  try {
    const result = await api.storage.local.get("enabled");
    if (result.enabled !== undefined) enabled = result.enabled;
  } catch(e) { console.warn("loadState error:", e); }
}

async function saveState() {
  try { await api.storage.local.set({ enabled }); } catch(e) { console.warn("saveState error:", e); }
}

async function applyState() {
  try {
    console.log("[Background] Aplicando estado. Habilitando rulesets:", RULE_IDS);
    await api.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enabled ? RULE_IDS : [],
      disableRulesetIds: enabled ? [] : RULE_IDS,
    });
    const enabledRulesets = await api.declarativeNetRequest.getEnabledRulesets();
    console.log("[Background] Rulesets habilitados:", enabledRulesets);
  } catch (e) {
    console.error("[Background] Error al habilitar rulesets:", e);
  }
}

// --- Cosméticos y scriptlets ---
let cosmeticIndex = null;
const chunkCache = {};

async function loadCosmeticIndex() {
  if (cosmeticIndex) return cosmeticIndex;
  const url = api.runtime.getURL("cosmetic-index.json");
  const resp = await fetch(url);
  cosmeticIndex = resp.ok ? await resp.json() : {};
  console.log("[Background] Índice cosmético cargado:", Object.keys(cosmeticIndex).length, "claves");
  return cosmeticIndex;
}

async function loadChunkFile(filename) {
  if (chunkCache[filename]) return chunkCache[filename];
  const url = api.runtime.getURL("cosmetic/" + filename);
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json();
  chunkCache[filename] = data;
  return data;
}

async function getDomainData(hostname) {
  const index = await loadCosmeticIndex();
  let files = [];

  if (index[hostname]) files = files.concat(index[hostname]);
  const parts = hostname.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join(".");
    if (index[parent]) files = files.concat(index[parent]);
  }
  if (index["*"]) files = files.concat(index["*"]);

  files = [...new Set(files)];

  const selectors = [];
  const scriptlets = [];

  for (const file of files) {
    const data = await loadChunkFile(file);
    if (!data) continue;

    const domainSelectors = data.cosmetics?.[hostname] || data.cosmetics?.["*"] || [];
    for (const sel of domainSelectors) {
      if (!selectors.includes(sel)) selectors.push(sel);
    }

    const domainScriptlets = data.scriptlets?.[hostname] || data.scriptlets?.["*"] || [];
    for (const scr of domainScriptlets) {
      if (!scriptlets.some(s => s.name === scr.name && JSON.stringify(s.args) === JSON.stringify(scr.args))) {
        scriptlets.push(scr);
      }
    }
  }

  return { selectors, scriptlets };
}

async function injectCosmetics(tabId, hostname) {
  const key = tabId + "|" + hostname;
  if (cosmeticInjected.has(key)) {
    console.log("[Cosmetic] Ya inyectados en", hostname, ", saltando");
    return;
  }
  const { selectors } = await getDomainData(hostname);
  if (selectors.length > 0) {
    const css = selectors.map(s => s + " { display: none !important; }").join("\\n");
    try {
      await api.scripting.insertCSS({
        target: { tabId: tabId },
        css: css,
        origin: "USER"
      });
      cosmeticInjected.add(key);
      console.log("[Cosmetic] Inyectados " + selectors.length + " selectores en " + hostname);
    } catch (e) {
      console.error("[Cosmetic] Error inyectando en " + hostname + ":", e);
    }
  }
}

async function injectScriptlets(tabId, hostname) {
  const { scriptlets } = await getDomainData(hostname);
  if (scriptlets.length === 0) return;

  try {
    let needsRuntime = true;
    if (runtimeInjected.has(tabId)) {
      try {
        const [result] = await api.scripting.executeScript({
          target: { tabId: tabId, allFrames: false },
          func: () => typeof window.__0c0d3Runtime !== "undefined"
        });
        if (result?.result === true) needsRuntime = false;
        else runtimeInjected.delete(tabId);
      } catch (e) {
        runtimeInjected.delete(tabId);
      }
    }

    if (needsRuntime) {
      console.log(\`[Background] Inyectando runtime.js en tab \${tabId}\`);
      try {
        await api.scripting.executeScript({
          target: { tabId: tabId, allFrames: true },
          files: ["runtime.js"]
        });
        runtimeInjected.add(tabId);
        console.log(\`[Background] runtime.js inyectado correctamente en tab \${tabId}\`);
      } catch (e) {
        console.error(\`[Background] Error inyectando runtime.js:\`, e);
        return;
      }
    }

    const isYouTube = hostname.includes('youtube.com');
    const attempts = isYouTube ? 5 : 1;
    const delay = isYouTube ? 1500 : 0;

    for (let attempt = 0; attempt < attempts; attempt++) {
      await api.scripting.executeScript({
        target: { tabId: tabId, allFrames: true },
        func: function(scriptlets) {
          const runtime = window.__0c0d3Runtime;
          if (!runtime) {
            console.warn("[Scriptlet] runtime no encontrado");
            return;
          }
          for (const call of scriptlets) {
            try {
              const fn = runtime[call.name];
              if (typeof fn === "function") {
                if (call.name === "json-prune") {
                  const [objPath, propPath] = call.args;
                  const obj = objPath === "window" ? window : window[objPath];
                  if (obj && propPath) {
                    fn(obj, propPath);
                    console.log("[Scriptlet] json-prune ejecutado en", objPath, propPath);
                  }
                } else {
                  fn.apply(null, call.args || []);
                  console.log("[Scriptlet] Ejecutado", call.name);
                }
              }
            } catch(e) {
              console.warn("[Scriptlet] Error en", call.name, ":", e);
            }
          }
        },
        args: [scriptlets]
      });
      if (attempt < attempts - 1) {
        await new Promise(r => setTimeout(r, delay));
      }
    }
    console.log(\`[Background] Scriptlets inyectados en \${hostname}\`);
  } catch (e) {
    console.error(\`[Background] Error inyectando scriptlets en \${hostname}:\`, e);
  }
}

api.webNavigation.onCommitted.addListener(details => {
  if (details.frameId === 0 && details.url.startsWith("http")) {
    const hostname = new URL(details.url).hostname;
    const tabId = details.tabId;
    cosmeticInjected.delete(tabId + "|" + hostname);
    if (details.transitionType !== "link" && details.transitionType !== "auto_subframe") {
      runtimeInjected.delete(tabId);
    }
    injectCosmetics(tabId, hostname);
    injectScriptlets(tabId, hostname);
  }
});

api.tabs.query({}).then(tabs => {
  for (const tab of tabs) {
    if (tab.url && tab.url.startsWith("http")) {
      const hostname = new URL(tab.url).hostname;
      injectCosmetics(tab.id, hostname);
      injectScriptlets(tab.id, hostname);
    }
  }
});

api.runtime.onMessage.addListener(async function(msg, sender) {
  if (msg.action === "getState") {
    return {
      enabled: enabled,
      totalNetwork: ${totalNetwork},
      totalExceptions: ${totalExceptions},
      totalCosmetic: ${totalCosmetic},
      totalScriptlets: ${totalScriptlets},
      lastUpdate: new Date(${Date.now()}).toLocaleString(),
      stats: []
    };
  }
  if (msg.action === "toggle") {
    enabled = msg.enabled;
    await saveState();
    await applyState();
    return { enabled: enabled };
  }
  if (msg.action === "reloadFilters") {
    await api.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: [],
      disableRulesetIds: RULE_IDS,
    });
    await api.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: RULE_IDS,
      disableRulesetIds: [],
    });
    return { ok: true };
  }
  if (msg.action === "injectScriptlets") {
    return { ok: true };
  }
});

loadState().then(function() { applyState(); });
console.log("🛡️ 0c0d3 Ad-Blocker 3.0.3 Iniciado");
`;

  writeFileSync(join(extPath, 'background.js'), bgCode);

  // 10. Empaquetar en XPI
  const xpiPath = join(__dirname, '0c0d3.xpi');
  const output = createWriteStream(xpiPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log('\n✅ XPI generado: ' + xpiPath);
    console.log('📦 Tamaño del XPI: ' + sizeMB + ' MB');
    console.log('➡️  Sube este archivo .xpi a Mozilla Add-ons');
  });

  archive.on('error', (err) => { throw err; });
  archive.pipe(output);
  archive.directory(extPath, false);
  await archive.finalize();

  console.log('\n✅ Construcción completada.');
  console.log('📁 Extensión MV3 lista en: ' + extPath);
  console.log('📊 Red: ' + totalNetwork + ' reglas, Excepciones: ' + totalExceptions + ', Cosmética: ' + totalCosmetic + ', Scriptlets: ' + totalScriptlets);
  console.log('📦 Rulesets: ' + ruleResources.length + ' (' + RULES_PER_RULESET + ' reglas por ruleset)');
  console.log('🖼️  Icono generado correctamente');
}

build().catch(console.error);