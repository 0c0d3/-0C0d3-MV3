#!/usr/bin/env node
// build.js – 0c0d3 Adblocker 3.0.6 (Firefox MV3)
// Estrategia: webRequest bloqueante + DNR + Cosmetic

import { writeFileSync, mkdirSync, createWriteStream, existsSync, readFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';
import archiver from 'archiver';
import fetch from 'node-fetch';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MAX_STATIC_RULES = 30000;
const MAX_TOTAL_RULES  = 150000;

const DEFAULT_LISTS = [
  { id: 'easylist',              name: 'EasyList',              url: 'https://easylist.to/easylist/easylist.txt' },
  { id: 'easyprivacy',           name: 'EasyPrivacy',           url: 'https://easylist.to/easylist/easyprivacy.txt' },
  { id: 'adguard_base',          name: 'AdGuard Base',          url: 'https://filters.adtidy.org/extension/ublock/filters/2_optimized.txt' },
  { id: 'adguard_spyware',       name: 'AdGuard Spyware',       url: 'https://filters.adtidy.org/extension/ublock/filters/3_optimized.txt' },
  { id: 'adguard_social',        name: 'AdGuard Social',        url: 'https://filters.adtidy.org/extension/ublock/filters/4_optimized.txt' },
  { id: 'adguard_annoy',         name: 'AdGuard Annoyances',    url: 'https://filters.adtidy.org/extension/ublock/filters/14_optimized.txt' },
  { id: 'adguard_mobile',        name: 'AdGuard Mobile',        url: 'https://filters.adtidy.org/extension/ublock/filters/11_optimized.txt' },
  { id: 'adguard_trackparam',    name: 'AdGuard Track Param',   url: 'https://filters.adtidy.org/extension/ublock/filters/17_optimized.txt' },
  { id: 'ublock_filters',        name: 'uBlock Filters',        url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt' },
  { id: 'ublock_badware',        name: 'uBlock Badware',        url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt' },
  { id: 'ublock_privacy',        name: 'uBlock Privacy',        url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt' },
  { id: 'ublock_resource_abuse', name: 'uBlock Resource Abuse', url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resource-abuse.txt' },
  { id: 'ublock_unbreak',        name: 'uBlock Unbreak',        url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt' },
  { id: 'ublock_quick_fixes',    name: 'uBlock Quick Fixes',    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt' },
  { id: 'ublock_annoy',          name: 'uBlock Annoyances',     url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances.txt' },
  { id: 'ublock_annoy_cookies',  name: 'uBlock Cookie Notices', url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances-cookies.txt' },
  { id: 'ublock_annoy_others',   name: 'uBlock Others',         url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances-others.txt' },
  { id: 'fanboy_annoy',          name: 'Fanboy Annoyances',     url: 'https://easylist.to/easylist/fanboy-annoyance.txt' },
  { id: 'fanboy_social',         name: 'Fanboy Social',         url: 'https://easylist.to/easylist/fanboy-social.txt' },
  { id: 'fanboy_cookie',         name: 'Fanboy Cookie',         url: 'https://secure.fanboy.co.nz/fanboy-cookie.txt' },
  { id: 'pgl_yoyo',              name: 'Yoyo.org',              url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=nohtml' },
  { id: 'clear_urls',            name: 'ClearURLs',             url: 'https://raw.githubusercontent.com/DandelionSprout/adfilt/master/ClearURLs%20for%20uBo/clear_urls_uboified.txt' },
  { id: 'idcac',                 name: "I Don't Care Cookies",  url: 'https://www.i-dont-care-about-cookies.eu/abp/' },
  { id: 'antipaywall',           name: 'Anti Paywall',          url: 'https://raw.githubusercontent.com/liamengland1/miscfilters/master/antipaywall.txt' },
  { id: 'hagezi_pro',            name: 'HaGezi Pro',            url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/pro.txt' },
  { id: 'hagezi_tif',            name: 'HaGezi Threat Intel',   url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/tif.medium.txt' },
  { id: 'oisd_small',            name: 'OISD Small',            url: 'https://small.oisd.nl/' },
  { id: 'd3host',                name: 'D3Ward Hosts',          url: 'https://raw.githubusercontent.com/d3ward/toolz/master/src/d3host.txt' },
  { id: 'adguard_antiadblock',   name: 'AdGuard Anti-Adblock',  url: 'https://raw.githubusercontent.com/AdguardTeam/AdguardFilters/refs/heads/master/AnnoyancesFilter/Popups/sections/antiadblock.txt' },
  { id: 'admiral_domains',       name: 'Admiral Domains',       url: 'https://raw.githubusercontent.com/LanikSJ/ubo-filters/main/filters/getadmiral-domains.txt' },
];

// ============================================================
//  DESCARGA
// ============================================================
async function downloadAllLists() {
  const listsDir = join(__dirname, 'lists');
  mkdirSync(listsDir, { recursive: true });
  let ok = 0, fail = 0;
  for (const list of DEFAULT_LISTS) {
    const filePath = join(listsDir, list.id + '.txt');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(list.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      writeFileSync(filePath, text, 'utf-8');
      ok++;
      process.stdout.write('  ✓ ' + list.name + '\n');
    } catch (e) {
      clearTimeout(timer);
      fail++;
      process.stdout.write('  ✗ ' + list.name + ': ' + e.message + '\n');
    }
  }
  console.log('\nDescargas: ' + ok + ' OK, ' + fail + ' fallidas\n');
}

// ============================================================
//  HELPERS
// ============================================================
const isASCII = s => /^[\x00-\x7F]*$/.test(s);

function makeOpts() {
  return {
    types: [], excludedTypes: [],
    domains: [], excludedDomains: [],
    thirdParty: null, important: false, exception: false,
    unsupported: false, isRegex: false, matchCase: false,
  };
}

function parseScriptletArgs(str) {
  const args = [];
  let current = '';
  let inQuote = false, quoteChar = '', depth = 0, inRegex = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inQuote) {
      if (ch === '\\' && i + 1 < str.length) { current += str[++i]; continue; }
      if (ch === quoteChar) { inQuote = false; continue; }
      current += ch;
    } else if (inRegex) {
      if (ch === '/' && i > 0 && str[i-1] === '\\') { current += ch; } // escaped \/ inside regex
      else if (ch === '/') { inRegex = false; current += ch; }
      else { current += ch; }
    } else if (ch === '\\') {
      if (i + 1 < str.length) { current += str[++i]; }
    } else if (ch === '"' || ch === "'") {
      inQuote = true; quoteChar = ch;
    } else if (ch === '/') {
      inRegex = true; current += ch;
    } else if (ch === '(' || ch === '[' || ch === '{') { depth++; current += ch; }
    else if (ch === ')' || ch === ']' || ch === '}') { if (depth > 0) depth--; current += ch; }
    else if (ch === ',' && depth === 0) { args.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

// ============================================================
//  PARSER ABP
// ============================================================
function parseABPLine(rawLine) {
  const line = rawLine.trim();
  if (!line || line.startsWith('!') || line.startsWith('[Adblock')) return null;

  // Cosméticos: ##  #@#  #?#  #$#  #%#
  const cosmMatch = line.match(/^([^#]*?)(#\@?\??\$?%?\#)(.+)$/);
  if (cosmMatch) {
    const domainsRaw = cosmMatch[1];
    const sep        = cosmMatch[2];
    const body       = cosmMatch[3].trim();
    const isException  = sep.includes('@');
    const isScriptlet  = sep.includes('$') || sep.includes('%');
    if (isException) return null;
    if (isScriptlet) {
      // #%#//scriptlet("name", "arg1", "arg2")
      // #$#scriptlet("name", "arg1")
      const slMatch = body.match(/^\/\/scriptlet\((.+)\)$/);
      if (!slMatch) return null;
      const slArgs = parseScriptletArgs(slMatch[1]);
      if (!slArgs.length) return null;
      const domains = domainsRaw
        ? domainsRaw.split(',').map(d => d.trim().toLowerCase()).filter(Boolean)
        : ['*'];
      return { type: 'scriptlet', domains, scriptletName: slArgs[0], args: slArgs.slice(1) };
    }
    // uBO format: ##+js(scriptlet, arg1, arg2, ...)
    if (/^\+js\(/.test(body)) {
      const inner = body.slice(4, -1);
      const slArgs = parseScriptletArgs(inner);
      if (!slArgs.length) return null;
      const domains = domainsRaw
        ? domainsRaw.split(',').map(d => d.trim().toLowerCase()).filter(Boolean)
        : ['*'];
      return { type: 'scriptlet', domains, scriptletName: slArgs[0], args: slArgs.slice(1) };
    }
    if (/:has-text\(|:matches-css|:xpath\(|:contains\(|:min-text-length|:upward\(|:remove\(|:watch-attr\(|:matches-path\(/.test(body)) return null;
    if (!isASCII(body)) return null;
    const domains = domainsRaw
      ? domainsRaw.split(',').map(d => d.trim().toLowerCase()).filter(Boolean)
      : ['*'];
    return { type: 'cosmetic', domains, selector: body };
  }

  // Formato hosts: 0.0.0.0 dominio  o  127.0.0.1 dominio
  if (/^(0\.0\.0\.0|127\.0\.0\.1)\s+/.test(line)) {
    const d = line.split(/\s+/)[1];
    if (d && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d) && !/^(localhost|local|broadcasthost)$/i.test(d)) {
      return { type: 'network', pattern: '||' + d.toLowerCase() + '^', options: makeOpts() };
    }
    return null;
  }

  // Dominio puro suelto
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(line)) {
    return { type: 'network', pattern: '||' + line.toLowerCase() + '^', options: makeOpts() };
  }

  // Regla de red ABP
  let isException = false;
  let pattern     = line;
  let optionsStr  = '';

  if (line.startsWith('/') && line.lastIndexOf('/') > 0) {
    const last = line.lastIndexOf('/');
    if (last > 0 && line[last + 1] === '$') {
      pattern    = line.substring(0, last + 1);
      optionsStr = line.substring(last + 2);
    }
  } else {
    const dollarIdx = line.lastIndexOf('$');
    if (dollarIdx > 0) {
      pattern    = line.substring(0, dollarIdx);
      optionsStr = line.substring(dollarIdx + 1);
    }
  }

  if (pattern.startsWith('@@')) { isException = true; pattern = pattern.substring(2); }
  if (!pattern || pattern === '*') return null;

  const opts = makeOpts();
  opts.exception = isException;

  if (optionsStr) {
    for (const rawOpt of optionsStr.split(',')) {
      const clean  = rawOpt.trim();
      const negate = clean.startsWith('~');
      const base   = negate ? clean.substring(1) : clean;
      const eqIdx  = base.indexOf('=');
      const key    = eqIdx >= 0 ? base.substring(0, eqIdx) : base;
      const val    = eqIdx >= 0 ? base.substring(eqIdx + 1) : '';

      switch (key) {
        case 'script': case 'image': case 'stylesheet': case 'object':
        case 'font':   case 'media': case 'websocket':  case 'ping': case 'other':
          (negate ? opts.excludedTypes : opts.types).push(key); break;
        case 'xmlhttprequest': case 'xhr':
          (negate ? opts.excludedTypes : opts.types).push('xmlhttprequest'); break;
        case 'subdocument':
          (negate ? opts.excludedTypes : opts.types).push('sub_frame'); break;
        case 'document':
          (negate ? opts.excludedTypes : opts.types).push('main_frame'); break;
        case 'popup': case 'popunder':
          (negate ? opts.excludedTypes : opts.types).push('main_frame'); break;
        case 'third-party': case '3p':
          opts.thirdParty = !negate; break;
        case 'first-party': case '1p':
          opts.thirdParty = negate; break;
        case 'domain': case 'from':
          if (val) for (const d of val.split('|')) {
            if (d.startsWith('~')) opts.excludedDomains.push(d.substring(1).toLowerCase());
            else if (d)            opts.domains.push(d.toLowerCase());
          }
          break;
        case 'important':  opts.important = true; break;
        case 'match-case': opts.matchCase = true; break;
        case 'all': break;
        case 'redirect': case 'redirect-rule': case 'csp':    case 'removeparam':
        case 'rewrite':  case 'replace':       case 'empty':  case 'badfilter':
        case 'generichide': case 'elemhide':   case 'genericblock':
        case 'inline-script': case 'inline-font': case 'jsonprune':
        case 'method':   case 'header':       case 'permissions': case 'urltransform':
        case 'noop':     case 'to':           case 'app':     case 'denyallow':
        case 'strict1p': case 'strict3p':
          opts.unsupported = true; break;
        default: break;
      }
    }
  }

  if (opts.unsupported) return null;
  if (pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 2) {
    opts.isRegex = true;
  }
  return { type: 'network', pattern, options: opts };
}

// ============================================================
//  EXTRACCIÓN DE HOSTNAME
// ============================================================
function extractHostname(pattern) {
  const m = pattern.match(/^\|\|([a-z0-9.-]+\.[a-z]{2,})(\^|\/|$)/i);
  if (m) return m[1].toLowerCase();
  return null;
}

// ============================================================
//  DNR BUILDER
// ============================================================
const URL_FILTER_RE = /^[A-Za-z0-9\-._~:/?#\[\]@!$&'()+,;=%*|^]+$/;
const DOMAIN_RE     = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

function buildDNRule(parsed, id) {
  const { pattern, options } = parsed;
  if (!isASCII(pattern) || options.isRegex) return null;

  let uf = pattern.replace(/\s/g, '');
  if (!uf || uf.length < 3 || uf.length > 500) return null;
  if (uf === '*' || uf === '^' || uf === '||' || uf === '|') return null;
  if (uf.startsWith('||*') || uf.startsWith('|*')) return null;
  if (!URL_FILTER_RE.test(uf)) return null;

  const condition = { urlFilter: uf };
  if (!options.matchCase) condition.isUrlFilterCaseSensitive = false;
  if (options.types.length)         condition.resourceTypes         = [...new Set(options.types)];
  if (options.excludedTypes.length) condition.excludedResourceTypes = [...new Set(options.excludedTypes)];
  if (options.domains.length) {
    const v = options.domains.filter(d => DOMAIN_RE.test(d)).slice(0, 200);
    if (v.length) condition.initiatorDomains = v;
  }
  if (options.excludedDomains.length) {
    const v = options.excludedDomains.filter(d => DOMAIN_RE.test(d)).slice(0, 200);
    if (v.length) condition.excludedInitiatorDomains = v;
  }
  if (options.thirdParty === true)       condition.domainType = 'thirdParty';
  else if (options.thirdParty === false) condition.domainType = 'firstParty';

  if (!condition.resourceTypes && !condition.excludedResourceTypes) {
    condition.resourceTypes = [
      'script', 'image', 'stylesheet', 'object', 'xmlhttprequest',
      'sub_frame', 'media', 'font', 'websocket', 'ping', 'other',
    ];
  }

  const priority = options.important ? 100000 : (options.exception ? 10000 : 1000);
  return {
    id,
    priority,
    action:    { type: options.exception ? 'allow' : 'block' },
    condition,
  };
}

// ============================================================
//  GENERACIÓN DE REGLAS
// ============================================================
async function generateAll() {
  const listsDir = join(__dirname, 'lists');
  const extPath  = join(__dirname, 'extension');
  mkdirSync(extPath, { recursive: true });

  let globalId = 1, totalRules = 0, totalCosm = 0, totalHosts = 0, totalScriptlets = 0;
  const blockedHosts = new Set();
  const allowedHosts = new Set();
  const cosmetics    = {};
  const scriptlets   = {};
  const rulesets     = {};
  const stats        = {};

  for (const list of DEFAULT_LISTS) {
    const filePath = join(listsDir, list.id + '.txt');
    if (!existsSync(filePath)) { console.warn('  ✗ ' + list.id + ' no encontrado'); continue; }
    const lines = readFileSync(filePath, 'utf-8').split('\n');
    let hosts = 0, r = 0, c = 0, s = 0;

    for (const line of lines) {
      const parsed = parseABPLine(line);
      if (!parsed) { s++; continue; }

      if (parsed.type === 'scriptlet') {
        for (const d of parsed.domains) {
          if (!scriptlets[d]) scriptlets[d] = [];
          scriptlets[d].push({ name: parsed.scriptletName, args: parsed.args });
        }
        totalScriptlets++; continue;
      }

      if (parsed.type === 'cosmetic') {
        if (!isASCII(parsed.selector)) { s++; continue; }
        for (const d of parsed.domains) {
          if (!cosmetics[d]) cosmetics[d] = new Set();
          cosmetics[d].add(parsed.selector);
        }
        c++;
      } else {
        const host     = extractHostname(parsed.pattern);
        const isSimple = host &&
          parsed.options.types.length === 0 &&
          parsed.options.excludedTypes.length === 0 &&
          parsed.options.domains.length === 0 &&
          parsed.options.excludedDomains.length === 0 &&
          parsed.options.thirdParty === null;

        if (isSimple) {
          if (parsed.options.exception) allowedHosts.add(host);
          else                          blockedHosts.add(host);
          hosts++; continue;
        }

        if (totalRules >= MAX_TOTAL_RULES) { s++; continue; }
        const rule = buildDNRule(parsed, globalId);
        if (!rule) { s++; continue; }
        const idx = Math.floor(totalRules / MAX_STATIC_RULES);
        if (!rulesets[idx]) rulesets[idx] = [];
        rulesets[idx].push(rule);
        globalId++; totalRules++; r++;
      }
    }

    stats[list.id] = { hosts, rules: r, cosm: c, skip: s };
    totalHosts += hosts; totalCosm += c;
    console.log('  📋 ' + list.name.padEnd(28) +
      ' hosts:' + String(hosts).padStart(6) +
      ' dnr:'   + String(r).padStart(5) +
      ' cosm:'  + String(c).padStart(5) +
      ' skip:'  + String(s).padStart(6));
  }

  for (const h of allowedHosts) blockedHosts.delete(h);

  // ── Chunked JSON writer (AMO limit: ~4MB per file) ──────────
  const CHUNK_MAX = 3.5 * 1024 * 1024;
  function writeChunked(name, data) {
    const files = [];
    function flush(outName, chunk) {
      const p = join(extPath, outName);
      writeFileSync(p, JSON.stringify(chunk));
      files.push(outName);
    }
    const json = JSON.stringify(data);
    if (json.length <= CHUNK_MAX) {
      flush(name + '.json', data);
      return files;
    }
    if (Array.isArray(data)) {
      const n = Math.ceil(data.length / Math.ceil(json.length / CHUNK_MAX));
      for (let i = 0; i < data.length; i += n) {
        flush((files.length === 0 ? name : name + '_' + files.length) + '.json', data.slice(i, i + n));
      }
    } else {
      const keys = Object.keys(data);
      let cur = {}, curSize = 2;
      for (const k of keys) {
        const v = data[k];
        const pair = JSON.stringify(k) + ':' + JSON.stringify(v);
        const add = pair.length + (Object.keys(cur).length > 0 ? 1 : 0);
        if (curSize + add > CHUNK_MAX && Object.keys(cur).length > 0) {
          flush((files.length === 0 ? name : name + '_' + files.length) + '.json', cur);
          cur = {}; curSize = 2;
        }
        cur[k] = v;
        curSize += add;
      }
      if (Object.keys(cur).length) {
        flush((files.length === 0 ? name : name + '_' + files.length) + '.json', cur);
      }
    }
    return files;
  }

  const dataFiles = { hosts: [], cosmetics: [], scriptlets: [] };

  // hosts.json: { blocked: [...], allowed: [...] }
  {
    const blocked = [...blockedHosts];
    const allowed = [...allowedHosts];
    const full = JSON.stringify({ blocked, allowed });
    if (full.length <= CHUNK_MAX) {
      writeFileSync(join(extPath, 'hosts.json'), full);
      dataFiles.hosts = ['hosts.json'];
    } else {
      const suffix = JSON.stringify(allowed);
      const prefixLen = '{"blocked":['.length;
      const suffixLen = '],"allowed":'.length + suffix.length + '}'.length;
      const overhead = prefixLen + suffixLen;
      const MAX = CHUNK_MAX - 512 * 1024;
      let i = 0, idx = 0;
      const total = blocked.length;
      while (i < total) {
        let j = i + 1, size = overhead;
        while (j < total) {
          size += blocked[j].length + 3;
          if (size > MAX) break;
          j++;
        }
        const name = (idx === 0 ? 'hosts.json' : 'hosts_' + idx + '.json');
        writeFileSync(join(extPath, name), JSON.stringify({ blocked: blocked.slice(i, j), allowed }));
        dataFiles.hosts.push(name);
        i = j; idx++;
      }
    }
  }

  // cosmetics.json
  const cosmOut = {};
  for (const d in cosmetics) cosmOut[d] = [...cosmetics[d]];
  dataFiles.cosmetics = writeChunked('cosmetics', cosmOut);

  // scriptlets.json
  const slOut = {};
  for (const d in scriptlets) slOut[d] = scriptlets[d];
  dataFiles.scriptlets = writeChunked('scriptlets', slOut);

  // Remove block rules that break YouTube (googlevideo.com/initplayback)
  for (const idx in rulesets) {
    rulesets[idx] = rulesets[idx].filter(rule => {
      if (rule.action?.type === 'block' && rule.condition?.urlFilter?.includes('googlevideo.com/initplayback')) return false;
      return true;
    });
  }

  // Write rulesets, splitting into chunks <4MB
  const dnrRules = []; // { id, path, rules }
  for (const idx in rulesets) {
    const arr = rulesets[idx];
    const json = JSON.stringify(arr);
    if (json.length <= CHUNK_MAX) {
      writeFileSync(join(extPath, 'ruleset_' + idx + '.json'), json);
      dnrRules.push({ id: 'ruleset_' + idx, path: 'ruleset_' + idx + '.json', rules: arr.length });
    } else {
      const n = Math.ceil(arr.length / Math.ceil(json.length / CHUNK_MAX));
      for (let i = 0; i < arr.length; i += n) {
        const chunk = arr.slice(i, i + n);
        const sub = i === 0 ? '' : '_' + (i / n);
        const file = 'ruleset_' + idx + sub + '.json';
        writeFileSync(join(extPath, file), JSON.stringify(chunk));
        dnrRules.push({ id: 'ruleset_' + idx + sub, path: file, rules: chunk.length });
      }
    }
  }

  writeFileSync(
    join(extPath, 'meta.json'),
    JSON.stringify(DEFAULT_LISTS.map(l => ({ id: l.id, name: l.name, stats: stats[l.id] || null })))
  );

  console.log('\n  📊 Hosts bloqueados : ' + blockedHosts.size.toLocaleString());
  console.log('  📊 Excepciones      : ' + allowedHosts.size.toLocaleString());
  console.log('  📊 Reglas DNR       : ' + totalRules.toLocaleString() + ' (' + dnrRules.length + ' rulesets)');
  console.log('  📊 Cosmetics        : ' + totalCosm.toLocaleString() +
    ' selectores en ' + Object.keys(cosmOut).length + ' dominios');
  console.log('  📊 Scriptlets       : ' + totalScriptlets +
    ' reglas en ' + Object.keys(slOut).length + ' dominios');

  return { dnrCount: dnrRules.length, hostCount: blockedHosts.size, dataFiles, dnrRules };
}

// ============================================================
//  ARCHIVOS DE LA EXTENSIÓN
// ============================================================
const bgJS = `const api = browser;

// ── Dominios siempre permitidos (CDNs de contenido que filtros podrían bloquear)
//     isBlockedUrl(url) se evalúa ANTES, así que anuncios con patrón igual se bloquean.
//     youtube.com NO está aquí — así que sus requests pasan por isBlockedHost. ───
const WHITELISTED = new Set([
  'v.redd.it','i.redd.it','preview.redd.it','gateway.reddit.com',
  'redditstatic.com','redditmedia.com','reddituploads.com',
  'googlevideo.com','ytimg.com','i.ytimg.com',
  'yt3.ggpht.com','yt3.googleusercontent.com','youtube-nocookie.com',
  'youtubei.googleapis.com',
]);

function isWhitelisted(host) {
  if (!host) return false;
  if (WHITELISTED.has(host)) return true;
  const parts = host.split('.');
  for (let i = 1; i < parts.length; i++) {
    if (WHITELISTED.has(parts.slice(i).join('.'))) return true;
  }
  return false;
}

// ── Patrones de URL bloqueados (anuncios, tracking, anti-adblock) ─────────────
const BLOCK_URL_RES = [
  /googlesyndication\\.com/i,
  /doubleclick\\.net/i,
  /googleadservices\\.com/i,
  /adservice\\.google\\./i,
  /2mdn\\.net/i,
  /\\/pagead\\//i,
  /youtube\\.com\\/api\\/stats\\/ads/i,
  /youtube\\.com\\/ptracking/i,
  /youtube\\.com\\/get_midroll/i,
  /youtube\\.com\\/pagead\\//i,
  /googlevideo\\.com.*[?&]oad=/i,
  /fuckadblock/i,
  /blockadblock/i,
  /detectadblock/i,
  /adblockanalytics/i,
  /taboola\\.com/i,
  /outbrain\\.com/i,
  /adnxs\\.com/i,
  /criteo\\.com/i,
  /amazon-adsystem\\.com/i,
  /moatads\\.com/i,
  /scorecardresearch\\.com/i,
  /quantserve\\.com/i,
  /pubmatic\\.com/i,
  /rubiconproject\\.com/i,
  /openx\\.net/i,
  /adform\\.net/i,
  /ad-delivery\\.net/i,
  /adtech\\.us/i,
  /adsrvr\\.org/i,
  /\\/ads\\?/i,
  /\\/ads\\//i,
  /\\/ads\\.js/i,
  /\\/pagead\\.js/i,
  /\\/ad\\?/i,
  /\\/ad\\//i,
  /\\/advert/i,
  /\\/sponsor/i,
  /events\\.reddit\\.com/i,
  /events\\.redditmedia\\.com/i,
  /ads-api\\.twitter\\.com/i,
  /ads\\.pinterest\\.com/i,
  /ads\\.tiktok\\.com/i,
  /adser\\./i,
  /adtech\\./i,
  /adzerk\\./i,
  /360yield\\./i,
  /amazon-adsystem\\./i,
  /criteo\\./i,
  /pubmatic\\./i,
  /adnxs\\./i,
  /outbrain\\./i,
  /taboola\\./i,
  /advertising\\./i,
  /adservice\\./i,
  /html-load\\.com/i,
  /slimesupplies\\.net/i,
  /error-report\\.com/i,
  /cxense\\.com/i,
  /onetrust\\.com/i,
  /jsstore\\./i,
  /geo-info\\.js/i,
  /connatix\\.com/i,
  /pmc\\.com.*harmony/i,
  /tinypass\\./i,
  /piano\\.io/i,
  /permutive\\.com/i,
  /sourcepoint\\./i,
  /cmp\\./i,
  /blogherads\\./i,
  /googletagmanager\\.com/i,
  /getadmiral\\.com/i,
  /admiralcdn\\.com/i,
  /admiralcdnstaging\\.com/i,
  /admiralexternal\\.com/i,
  /admlcdn\\.com/i,
  /eventexistence\\.com/i,
  /merequartz\\.com/i,
  /succeedscene\\.com/i,
  /admiral\\.help/i,
  /admiral\\.network/i,
  /admiral\\.support/i,
  /admiral\\.website/i,
  /testadmiral\\.com/i,
  /copyrightaccesscontrols\\.com/i,
  /levenlabs\\.com/i,
  /pixel\\.facebook\\.com/i,
];

function isBlockedUrl(url) {
  if (!url) return false;
  for (let i = 0; i < BLOCK_URL_RES.length; i++) {
    if (BLOCK_URL_RES[i].test(url)) return true;
  }
  return false;
}

// ── Listas para actualización en tiempo real (30 listas) ───────────────────────
const UPDATE_LISTS = [
  { id: 'easylist',              url: 'https://easylist.to/easylist/easylist.txt' },
  { id: 'easyprivacy',           url: 'https://easylist.to/easylist/easyprivacy.txt' },
  { id: 'adguard_base',          url: 'https://filters.adtidy.org/extension/ublock/filters/2_optimized.txt' },
  { id: 'adguard_spyware',       url: 'https://filters.adtidy.org/extension/ublock/filters/3_optimized.txt' },
  { id: 'adguard_social',        url: 'https://filters.adtidy.org/extension/ublock/filters/4_optimized.txt' },
  { id: 'adguard_annoy',         url: 'https://filters.adtidy.org/extension/ublock/filters/14_optimized.txt' },
  { id: 'adguard_mobile',        url: 'https://filters.adtidy.org/extension/ublock/filters/11_optimized.txt' },
  { id: 'adguard_trackparam',    url: 'https://filters.adtidy.org/extension/ublock/filters/17_optimized.txt' },
  { id: 'ublock_filters',        url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt' },
  { id: 'ublock_badware',        url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt' },
  { id: 'ublock_privacy',        url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt' },
  { id: 'ublock_resource_abuse', url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resource-abuse.txt' },
  { id: 'ublock_unbreak',        url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt' },
  { id: 'ublock_quick_fixes',    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt' },
  { id: 'ublock_annoy',          url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances.txt' },
  { id: 'ublock_annoy_cookies',  url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances-cookies.txt' },
  { id: 'ublock_annoy_others',   url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances-others.txt' },
  { id: 'fanboy_annoy',          url: 'https://easylist.to/easylist/fanboy-annoyance.txt' },
  { id: 'fanboy_social',         url: 'https://easylist.to/easylist/fanboy-social.txt' },
  { id: 'fanboy_cookie',         url: 'https://secure.fanboy.co.nz/fanboy-cookie.txt' },
  { id: 'pgl_yoyo',              url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=nohtml' },
  { id: 'clear_urls',            url: 'https://raw.githubusercontent.com/DandelionSprout/adfilt/master/ClearURLs%20for%20uBo/clear_urls_uboified.txt' },
  { id: 'idcac',                 url: 'https://www.i-dont-care-about-cookies.eu/abp/' },
  { id: 'antipaywall',           url: 'https://raw.githubusercontent.com/liamengland1/miscfilters/master/antipaywall.txt' },
  { id: 'hagezi_pro',            url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/pro.txt' },
  { id: 'hagezi_tif',            url: 'https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/tif.medium.txt' },
  { id: 'oisd_small',            url: 'https://small.oisd.nl/' },
  { id: 'd3host',                url: 'https://raw.githubusercontent.com/d3ward/toolz/master/src/d3host.txt' },
  { id: 'adguard_antiadblock',   url: 'https://raw.githubusercontent.com/AdguardTeam/AdguardFilters/refs/heads/master/AnnoyancesFilter/Popups/sections/antiadblock.txt' },
  { id: 'admiral_domains',       url: 'https://raw.githubusercontent.com/LanikSJ/ubo-filters/main/filters/getadmiral-domains.txt' },
];

let BLOCKED          = new Set();
let ALLOWED          = new Set();
let cosmetics        = null;
let scriptletStore  = null;
let meta             = [];
let stats            = { blocked: 0, sessionBlocked: 0 };
let updateInProgress = false;
let lastUpdateTime   = null;

// ── Parser liviano (solo reglas de host) ──────────────────────────────────────
function isValidDomain(d) {
  return /^[a-z0-9][a-z0-9.-]*\\.[a-z]{2,}$/.test(d);
}

function parseHostLine(raw) {
  const line = raw.trim();
  if (!line || line[0] === '!' || line[0] === '#' || line[0] === '[') return null;
  // Excepción: @@||domain^
  if (line.startsWith('@@||')) {
    const end = line.indexOf('^', 4);
    if (end < 5) return null;
    const d = line.slice(4, end).toLowerCase();
    return isValidDomain(d) ? { host: d, exception: true } : null;
  }
  // Bloqueo: ||domain^
  if (line.startsWith('||')) {
    const end = line.indexOf('^', 2);
    if (end < 3) return null;
    const opts = line.slice(end + 1);
    if (opts && /redirect|csp|removeparam|rewrite|replace/.test(opts)) return null;
    const d = line.slice(2, end).toLowerCase();
    return isValidDomain(d) ? { host: d, exception: false } : null;
  }
  // Formato hosts: 0.0.0.0 domain  o  127.0.0.1 domain
  if (line.startsWith('0.0.0.0 ') || line.startsWith('127.0.0.1 ')) {
    const parts = line.split(/\\s+/);
    const d = (parts[1] || '').toLowerCase();
    if (d && isValidDomain(d) && d !== 'localhost' && d !== 'local' && d !== 'broadcasthost')
      return { host: d, exception: false };
    return null;
  }
  // Dominio suelto
  const lo = line.toLowerCase();
  return isValidDomain(lo) ? { host: lo, exception: false } : null;
}

// ── Parser liviano de reglas cosméticas ─────────────────────────────────────────
function parseCosmeticLine(raw) {
  const line = raw.trim();
  if (!line || line[0] === '!' || line[0] === '[') return null;
  // ##selector  #@#selector  #?#selector  #$#selector  #%#//scriptlet  ##+js
  // example.com##selector  (domain-prefixed variants)
  if (line.indexOf('#') < 0) return null;
  const cosmMatch = line.match(/^([^#]*?)(#@?\\??\\$?%?#)(.+)$/);
  if (!cosmMatch) return null;
  const domainsRaw = cosmMatch[1];
  const sep        = cosmMatch[2];
  const body       = cosmMatch[3].trim();
  if (!body) return null;
  // Skip exceptions
  if (sep === '#@#' || sep === '#@$#') return null;
  // Parse domains
  const rawDoms = domainsRaw
    ? domainsRaw.split(',').map(d => d.replace(/^~/, '').trim().toLowerCase()).filter(Boolean)
    : ['*'];
  // Scriptlet: #%#//scriptlet("name", "arg1", ...)
  if (sep === '#%#') {
    const slMatch = body.match(/^\\/\\/scriptlet\\((.+)\\)$/);
    if (slMatch) {
      const args = [];
      let cur = '', inStr = false, quoteChar = '', escape = false;
      for (const ch of slMatch[1]) {
        if (escape) { cur += ch; escape = false; continue; }
        if (ch === '\\\\') { cur += ch; continue; }
        if (inStr) {
          if (ch === '\\\\' && quoteChar === '"') { escape = true; continue; }
          if (ch === quoteChar) { args.push(cur.trim()); cur = ''; inStr = false; }
          else cur += ch;
        } else {
          if (ch === '"' || ch === "'") { inStr = true; quoteChar = ch; }
          else if (ch === ',') continue;
        }
      }
      if (cur.trim() && inStr) args.push(cur.trim());
      if (args.length > 0) return rawDoms.map(d => ({ type: 'scriptlet', domain: d, name: args[0], args }));
    }
    return null;
  }
  // Scriptlet: ##+js(name, args...)
  if (sep === '##' && line.indexOf('##+js(') >= 0) {
    const jsMatch = body.match(/^\\+js\\((.+)\\)$/);
    if (jsMatch) {
      const args = [];
      let cur = '', inStr = false, quoteChar = '';
      for (const ch of jsMatch[1]) {
        if (inStr) {
          if (ch === quoteChar) { args.push(cur); cur = ''; inStr = false; }
          else cur += ch;
        } else {
          if (ch === '"' || ch === "'") { inStr = true; quoteChar = ch; }
          else if (ch === ',') continue;
          else cur += ch;
        }
      }
      if (cur) args.push(cur);
      if (args.length > 0) return rawDoms.map(d => ({ type: 'scriptlet', domain: d, name: args[0], args }));
    }
    return null;
  }
  // Cosmetic (element hiding)
  return rawDoms.map(d => ({ type: 'cosmetic', domain: d, selector: body }));
}

// ── Actualización de listas (hosts + cosmetics + scriptlets) ──────────────────
async function fetchAndUpdateLists() {
  if (updateInProgress) return { ok: false, reason: 'already_running' };
  updateInProgress = true;
  const newBlocked   = new Set();
  const newAllowed   = new Set();
  const newCosmetics = {};
  const newScriptlets = {};
  let okCount = 0, failCount = 0;

  try {
    for (const list of UPDATE_LISTS) {
      try {
        const ctrl = new AbortController();
        const t    = setTimeout(() => ctrl.abort(), 30000);
        const res  = await fetch(list.url, {
          signal: ctrl.signal,
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        clearTimeout(t);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        for (const line of text.split('\\n')) {
          const p = parseHostLine(line);
          if (p) {
            if (p.exception) newAllowed.add(p.host);
            else             newBlocked.add(p.host);
            continue;
          }
          const c = parseCosmeticLine(line);
          if (c) {
            for (const item of c) {
              if (item.type === 'cosmetic') {
                if (!newCosmetics[item.domain]) newCosmetics[item.domain] = new Set();
                newCosmetics[item.domain].add(item.selector);
              } else if (item.type === 'scriptlet') {
                if (!newScriptlets[item.domain]) newScriptlets[item.domain] = [];
                newScriptlets[item.domain].push({ name: item.name, args: item.args.slice(1) });
              }
            }
          }
        }
        okCount++;
      } catch (e) {
        failCount++;
        console.warn('[0c0d3] Fallo lista ' + list.id + ':', e.message);
      }
    }

    if (okCount === 0) {
      console.warn('[0c0d3] Ninguna lista descargada; se conservan las listas actuales.');
      return { ok: false, reason: 'all_lists_failed', listOk: 0, listFail: failCount };
    }

    for (const h of newAllowed) newBlocked.delete(h);
    BLOCKED        = newBlocked;
    ALLOWED        = newAllowed;
    cosmetics      = {};
    for (const d in newCosmetics) cosmetics[d] = [...newCosmetics[d]];
    scriptletStore = {};
    for (const d in newScriptlets) scriptletStore[d] = newScriptlets[d];
    lastUpdateTime = Date.now();

    await api.storage.local.set({
      runtimeBlocked: [...newBlocked],
      runtimeAllowed: [...newAllowed],
      lastUpdateTime: lastUpdateTime,
    });

    console.log('[0c0d3] Actualización completa · ' + BLOCKED.size + ' hosts · ' + Object.keys(cosmetics).length + ' cosm domains (' + okCount + ' OK, ' + failCount + ' fallos)');
    return { ok: true, blocked: BLOCKED.size, cosmeticDomains: Object.keys(cosmetics).length, listOk: okCount, listFail: failCount };
  } catch (e) {
    console.error('[0c0d3] Error de actualización:', e);
    return { ok: false, reason: e.message };
  } finally {
    updateInProgress = false;
  }
}

// ── Carga chunked JSON (soporta hosts.json + hosts_1.json, etc.) ──────────────
async function loadChunks(basename) {
  const chunks = [];
  let idx = 0;
  while (true) {
    const name = idx === 0 ? basename + '.json' : basename + '_' + idx + '.json';
    try {
      const r = await fetch(api.runtime.getURL(name));
      if (!r.ok) break;
      chunks.push(await r.json());
    } catch { break; }
    idx++;
    if (idx > 50) break;
  }
  return chunks;
}

// ── Carga inicial ─────────────────────────────────────────────────────────────
async function loadData() {
  try {
    const [hostsChunks, cosmChunks, slChunks, metaResp, saved] = await Promise.all([
      loadChunks('hosts'),
      loadChunks('cosmetics'),
      loadChunks('scriptlets'),
      fetch(api.runtime.getURL('meta.json')),
      api.storage.local.get(['totalBlocked', 'runtimeBlocked', 'runtimeAllowed', 'lastUpdateTime']),
    ]);
    meta = await metaResp.json();
    stats.blocked   = saved.totalBlocked || 0;
    lastUpdateTime  = saved.lastUpdateTime || null;

    if (saved.runtimeBlocked && saved.runtimeBlocked.length) {
      BLOCKED = new Set(saved.runtimeBlocked);
      ALLOWED = new Set(saved.runtimeAllowed || []);
      console.log('[0c0d3] Listas runtime cargadas · ' + BLOCKED.size + ' hosts');
    } else {
      BLOCKED = new Set();
      ALLOWED = new Set();
      for (const chunk of hostsChunks) {
        for (const h of chunk.blocked) BLOCKED.add(h);
        for (const h of chunk.allowed) ALLOWED.add(h);
      }
      console.log('[0c0d3] Listas bundled cargadas · ' + BLOCKED.size + ' hosts');
    }
    cosmetics = {};
    for (const c of cosmChunks) Object.assign(cosmetics, c);
    scriptletStore = {};
    for (const s of slChunks) Object.assign(scriptletStore, s);
    console.log('[0c0d3] Ready · ' + BLOCKED.size + ' hosts · ' + Object.keys(cosmetics).length + ' cosm domains');
  } catch (e) {
    console.error('[0c0d3] Error de carga:', e);
  }
}

function isBlockedHost(host) {
  if (!host) return false;
  if (ALLOWED.has(host)) return false;
  if (BLOCKED.has(host)) return true;
  const parts = host.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const sub = parts.slice(i).join('.');
    if (ALLOWED.has(sub)) return false;
    if (BLOCKED.has(sub)) return true;
  }
  return false;
}

function extractHost(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch (e) { return null; }
}

// ── webRequest ────────────────────────────────────────────────────────────────
function cancelRequest() {
  stats.blocked++;
  stats.sessionBlocked++;
  if (stats.blocked % 25 === 0) api.storage.local.set({ totalBlocked: stats.blocked });
  return { cancel: true };
}

api.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.type === 'main_frame') return {};
    const url  = details.url;

    const host = extractHost(url);
    if (!host) return {};
    if (isBlockedUrl(url)) return cancelRequest();
    if (isWhitelisted(host)) return {};
    if (isBlockedHost(host)) return cancelRequest();
    return {};
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);

// YouTube ads handled by content script fetch wrapping (more reliable than StreamFilter)

// ── Auto-actualización cada hora ──────────────────────────────────────────────
api.alarms.create('hourlyUpdate', { periodInMinutes: 60 });
api.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'hourlyUpdate') {
    console.log('[0c0d3] Auto-actualización iniciada...');
    fetchAndUpdateLists();
  }
});

// ── Mensajes ──────────────────────────────────────────────────────────────────
api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.action === 'updateLists') {
      const result = await fetchAndUpdateLists();
      sendResponse(result);
      return;
    }
    if (msg.action === 'getCosmeticData') {
      const host   = (msg.hostname || '').toLowerCase();
      const result = {};
      if (cosmetics) {
        if (cosmetics['*'])  result['*']  = cosmetics['*'];
        if (cosmetics[host]) result[host] = cosmetics[host];
        const parts = host.split('.');
        for (let i = 1; i < parts.length - 1; i++) {
          const pd = parts.slice(i).join('.');
          if (cosmetics[pd]) result[pd] = cosmetics[pd];
        }
      }
      sendResponse({ ok: true, cosmetics: result });
      return;
    }
    if (msg.action === 'getScriptletData') {
      const host   = (msg.hostname || '').toLowerCase();
      const result = [];
      if (scriptletStore) {
        if (scriptletStore['*']) result.push.apply(result, scriptletStore['*']);
        if (scriptletStore[host]) result.push.apply(result, scriptletStore[host]);
        const parts = host.split('.');
        for (let i = 1; i < parts.length - 1; i++) {
          const pd = parts.slice(i).join('.');
          if (scriptletStore[pd]) result.push.apply(result, scriptletStore[pd]);
        }
      }
      sendResponse({ ok: true, scriptlets: result });
      return;
    }
    if (msg.action === 'getState') {
      sendResponse({
        enabled:          true,
        totalBlocked:     stats.blocked,
        sessionBlocked:   stats.sessionBlocked,
        hostCount:        BLOCKED.size,
        cosmeticDomains:  cosmetics ? Object.keys(cosmetics).length : 0,
        lists:            meta.length,
        updateInProgress: updateInProgress,
        lastUpdateTime:   lastUpdateTime,
      });
      return;
    }
    sendResponse({ ok: false });
  })();
  return true;
});

loadData();`;

const contentJS = `(async function () {
  const api      = browser;
  const hostname = location.hostname.toLowerCase();
  const isYT     = /(^|\\.)youtube\\.com$|^youtu\\.be$/.test(hostname);

  // ── Scriptlet injection (universal, con soporte CSP nonce) ───────────────────
  function injectScriptText(code) {
    try {
      var el = document.createElement('script');
      // Extract nonce from existing scripts (bypasses CSP on strict nonce-based policies)
      var nonce = '';
      try {
        var existing = document.querySelector('script[nonce]');
        if (existing) nonce = existing.nonce || existing.getAttribute('nonce') || '';
      } catch (e) {}
      if (nonce) el.setAttribute('nonce', nonce);
      el.textContent = code;
      el.setAttribute('data-0c0d3', '');
      (document.head || document.documentElement).appendChild(el);
      el.remove();
    } catch (e) {}
  }

  // Override page globals directly via wrappedJSObject (bypasses CSP nonce restrictions in Firefox)
  try {
    if (window.wrappedJSObject) {
      var w = window.wrappedJSObject;
      var pd = { configurable:true, enumerable:true, get:function(){return({})}, set:function(){} };
      Object.defineProperty(w, 'pmcHarmony', pd);
      Object.defineProperty(w, 'pmcAds', pd);
      Object.defineProperty(w, '_pmc', pd);
      Object.defineProperty(w, 'pmcAdManager', pd);
    }
  } catch(e) {}
  // Fallback: inject via script element (works on pages without CSP nonce)
  try {
    var el = document.createElement('script');
    el.textContent = '(function(){try{var d={configurable:true,enumerable:true,get:function(){return{}},set:function(){}};Object.defineProperty(window,"pmcHarmony",d);Object.defineProperty(window,"pmcAds",d);Object.defineProperty(window,"_pmc",d);Object.defineProperty(window,"pmcAdManager",d)}catch(e){}})();';
    (document.head || document.documentElement).appendChild(el);
    el.remove();
  } catch(e) {}

  // ── DOM intercept: block overlay popups at insertion time (synced, before render) ──
  var popupHosts = /rollingstone|variety|billboard|thewrap|pewresearch|npr|wired/i;
  if (popupHosts.test(hostname)) {
    // Intercept via DOMNodeInserted (fires synchronously during node insertion)
    document.addEventListener('DOMNodeInserted', function(e) {
      try {
        var node = e.target;
        if (!node || node.nodeType !== 1) return;
        var tag = node.tagName || '';
        if (tag === 'DIV' || tag === 'SECTION' || tag === 'ASIDE' || tag === 'IFRAME') {
          // Check inline style for fixed positioning
          var style = node.getAttribute('style') || '';
          if (/position:\s*fixed/i.test(style) || /z-?index:\s*[5-9]\d{2,}/i.test(style)) {
            node.style.setProperty('display', 'none', 'important');
            setTimeout(function(){ try { node.remove(); } catch(e){} }, 0);
            return;
          }
          // Check computed style (more reliable but slower - only for iframes)
          if (tag === 'IFRAME') {
            var src = node.getAttribute('src') || '';
            if (/connatix|tinypass|piano|html-load|slimesupplies/.test(src)) {
              node.style.setProperty('display', 'none', 'important');
              setTimeout(function(){ try { node.remove(); } catch(e){} }, 0);
            }
          }
        }
      } catch(ex) {}
    }, false);
  }

  // Immediate YouTube anti-ad trap (via script injection, sincrono, antes de cualquier script de página)
  if (isYT) {
    injectScriptText('(function(){' +
      // ytInitialPlayerResponse setter trap (prune ads at assignment)
      'var _v;Object.defineProperty(window,"ytInitialPlayerResponse",{' +
      'configurable:true,enumerable:true,' +
      'get:function(){return _v;},' +
      'set:function(v){' +
        'if(v&&typeof v==="object"){try{delete v.adPlacements}catch(e){v.adPlacements=undefined}' +
        'try{delete v.playerAds}catch(e){v.playerAds=undefined}' +
        'try{delete v.adSlots}catch(e){v.adSlots=undefined}' +
        'try{delete v.legacyImportant}catch(e){v.legacyImportant=undefined}' +
        'if(v.playerResponse){try{delete v.playerResponse.adPlacements}catch(e){v.playerResponse.adPlacements=undefined}' +
        'try{delete v.playerResponse.playerAds}catch(e){v.playerResponse.playerAds=undefined}' +
        'try{delete v.playerResponse.adSlots}catch(e){v.playerResponse.adSlots=undefined}}}' +
        '_v=v;' +
      '}});' +
      // Prune helper: lightweight, removes ad properties from any object
      'function _p(o){if(!o||typeof o!=="object")return;' +
      '["adPlacements","playerAds","adSlots","legacyImportant","auxiliaryUi"].forEach(function(k){try{delete o[k]}catch(e){o[k]=undefined}});' +
      'if(o.playerResponse){["adPlacements","playerAds","adSlots"].forEach(function(k){try{delete o.playerResponse[k]}catch(e){o.playerResponse[k]=undefined}})}}' +
      // fetch Proxy: intercept youtubei API responses; zero overhead for non-matching URLs
      'self.fetch=new Proxy(self.fetch,{apply:function(t,_,a){var u=(typeof a[0]==="string"?a[0]:(a[0]&&a[0].url)||"");' +
      'if(u.indexOf("youtubei/v1/player")<0&&u.indexOf("youtubei/v1/browse")<0)' +
      'return Reflect.apply(t,_,a);' +
      'return Reflect.apply(t,_,a).then(function(r){' +
      'return r.clone().json().then(function(d){_p(d);' +
      'return Response.json(d,{status:r.status,statusText:r.statusText,headers:r.headers})' +
      '}).catch(function(){return r})})}});' +
      // XMLHttpRequest subclass: cache-prunes on first access, returns cached on subsequent
      'self.XMLHttpRequest=class extends self.XMLHttpRequest{' +
      'open(){this.__u=arguments[1];return super.open.apply(this,arguments)}' +
      'get response(){var v=super.response;' +
      'if(!this.__u||this.__u.indexOf("youtubei/v1/")<0)return v;' +
      'if(this.__c!==undefined){if(this.__c==="__OBJ__")return v;return this.__c}' +
      'try{if(typeof v==="string"){var o=JSON.parse(v);_p(o);this.__c=JSON.stringify(o);return this.__c}' +
      'if(typeof v==="object"&&v!==null){_p(v);this.__c="__OBJ__";return v}}catch(e){}' +
      'this.__c="__OBJ__";return v}' +
      'get responseText(){var v;try{v=super.responseText}catch(e){return}' +
      'if(!this.__u||this.__u.indexOf("youtubei/v1/")<0)return v;' +
      'if(this.__c!==undefined){if(this.__c==="__OBJ__")try{return super.responseText}catch(e){return};return this.__c}' +
      'try{var o=JSON.parse(v);_p(o);this.__c=JSON.stringify(o);return this.__c}catch(e){}return v}};' +
      // CSS injection + MutationObserver as safety net
      'var _st=document.createElement("style");_st.textContent=' +
      '"ytd-ad-slot-renderer,ytd-promoted-video-renderer,ytd-display-ad-renderer,"+' +
      '"ytd-compact-promoted-video-renderer,ytd-promoted-sparkles-web-renderer,"+' +
      '"ytd-in-feed-ad-renderer,ytd-mealbar-promo-renderer,#masthead-ad,"+' +
      '".ytp-ad-module,.video-ads,.ytp-ad-overlay-container{display:none!important}";' +
      '(document.head||document.documentElement).appendChild(_st);' +
      'new MutationObserver(function(m){for(var i=0;i<m.length;i++){' +
      'for(var j=0;j<(m[i].addedNodes||[]).length;j++){' +
      'var n=m[i].addedNodes[j];if(n.nodeType===1){var t=(n.tagName||"").toLowerCase();' +
      'if(/^(ytd-ad|ytd-promoted|ytd-display|ytd-in-feed|ytd-mealbar)/.test(t)||' +
      'n.id==="masthead-ad"||(n.classList&&(n.classList.contains("ytp-ad-module")||n.classList.contains("video-ads"))))' +
      'n.style.setProperty("display","none","important")}}}).observe(document.documentElement,{childList:true,subtree:true});' +
    '})();');

    // Fallback: scriptlet-based pruning una vez que la librería esté cargada
    function ytFallback() {
      injectScriptText('(function(){' +
        'var _yts=setInterval(function(){try{var l=window.__0c0d3_scriptlets;if(!l)return;clearInterval(_yts);' +
          'l["set-constant"]("ytInitialPlayerResponse.adPlacements","undefined");' +
          'l["set-constant"]("ytInitialPlayerResponse.adSlots","undefined");' +
          'l["set-constant"]("ytInitialPlayerResponse.playerAds","undefined");' +
          'l["json-prune"]("playerResponse.adPlacements playerResponse.playerAds playerResponse.adSlots adPlacements playerAds adSlots legacyImportant");' +
          'l["json-prune-fetch-response"]("playerResponse.adPlacements playerResponse.playerAds playerResponse.adSlots adPlacements playerAds adSlots","","","youtubei/v1/player");' +
          'l["json-prune-fetch-response"]("auxiliaryUi adPlacements playerAds adSlots","","","youtubei/v1/next");' +
          'l["json-prune-xhr-response"]("playerResponse.adPlacements playerResponse.playerAds playerResponse.adSlots adPlacements playerAds adSlots","","","youtubei/v1/player");' +
          'l["json-prune-xhr-response"]("auxiliaryUi adPlacements playerAds adSlots","","","youtubei/v1/next");' +
        '}catch(e){}},10);' +
      '})();');
    }
    try { ytFallback(); } catch(e) {};
  }

  async function loadScriptlets() {
    try {
      var resp = await api.runtime.sendMessage({ action: 'getScriptletData', hostname });
      if (!resp || !resp.ok || !resp.scriptlets || !resp.scriptlets.length) return;
      for (var i = 0; i < resp.scriptlets.length; i++) {
        var sl = resp.scriptlets[i];
        var code = '(function() { try { var lib = window.__0c0d3_scriptlets; if (!lib) return; var fn = lib["' +
          sl.name.replace(/"/g, '\\"') + '"]; if (fn) fn.apply(null, ' + JSON.stringify(sl.args) + '); } catch(e) {} })();';
        injectScriptText(code);
      }
    } catch (e) {}
  }
  // Also load dynamic scriptlets from background (non-blocking, adds extra rules)
  loadScriptlets();

  // ── Load scriptlet library ───────────────────────────────────────────────────
  (function loadLib() {
    try {
      var el = document.createElement('script');
      el.textContent = \`(function() {
        'use strict';
        var _sl = window.__0c0d3_scriptlets;
        if (_sl) return;
        _sl = {};
        _sl['abort-on-property-read'] = function(prop) {
          var parts = prop.split('.');
          var obj = window;
          for (var i = 0; i < parts.length - 1; i++) {
            if (obj[parts[i]] === undefined) obj[parts[i]] = {};
            obj = obj[parts[i]];
          }
          var last = parts[parts.length - 1];
          var val = obj[last];
          Object.defineProperty(obj, last, { configurable: true, enumerable: true, get: function() { throw new ReferenceError('aborted'); }, set: function(v) { val = v; } });
        };
        _sl['abort-on-property-write'] = function(prop) {
          var parts = prop.split('.');
          var obj = window;
          for (var i = 0; i < parts.length - 1; i++) {
            if (obj[parts[i]] === undefined) obj[parts[i]] = {};
            obj = obj[parts[i]];
          }
          var last = parts[parts.length - 1];
          var val;
          Object.defineProperty(obj, last, { configurable: true, enumerable: true, get: function() { return val; }, set: function(v) { throw new ReferenceError('aborted'); } });
        };
        _sl['abort-current-script'] = function(trigger) {
          var stack = new Error().stack || '';
          if (stack.indexOf(trigger) >= 0) throw new ReferenceError('aborted');
        };
        _sl['set-constant'] = function(prop, value) {
          var parts = prop.split('.');
          var obj = window;
          for (var i = 0; i < parts.length - 1; i++) {
            if (obj[parts[i]] === undefined) obj[parts[i]] = {};
            obj = obj[parts[i]];
          }
          var parsed;
          if (value === 'undefined') parsed = undefined;
          else if (value === 'null') parsed = null;
          else if (value === 'true') parsed = true;
          else if (value === 'false') parsed = false;
          else if (value === '""' || value === "''" || value === 'emptyStr') parsed = '';
          else if (value === '0') parsed = 0;
          else if (value === 'noopFunc' || value === 'noopCallback') parsed = function(){};
          else if (value === 'trueFunc') parsed = function(){ return true; };
          else if (value === 'falseFunc') parsed = function(){ return false; };
          else if (/^-?\\\\d+$/.test(value)) parsed = parseInt(value, 10);
          else parsed = value;
          try { Object.defineProperty(obj, parts[parts.length - 1], { configurable: true, enumerable: true, get: function() { return parsed; }, set: function() {} }); }
          catch(e) { obj[parts[parts.length - 1]] = parsed; }
        };
        _sl['noeval'] = function() {
          window.eval = function(s) { throw new Error('eval blocked'); };
          window.eval.toString = function() { return 'function eval() { [native code] }'; };
        };
        _sl['nowoif'] = function() {
          window.open = function() { return null; };
          window.open.toString = function() { return 'function open() { [native code] }'; };
        };
        _sl['prevent-addEventListener'] = function(type, handler) {
          var orig = EventTarget.prototype.addEventListener;
          EventTarget.prototype.addEventListener = function(t, fn, opts) {
            if (t === type || (type && t && t.indexOf(type) >= 0)) return undefined;
            return orig.call(this, t, fn, opts);
          };
        };
        _sl['remove-attr'] = function(selector, attr) {
          if (!attr) { attr = selector; selector = undefined; }
          var els = selector ? document.querySelectorAll(selector) : document.querySelectorAll('[' + attr + ']');
          els.forEach(function(el) { el.removeAttribute(attr); });
          new MutationObserver(function() {
            document.querySelectorAll(selector || '[' + attr + ']').forEach(function(el) { el.removeAttribute(attr); });
          }).observe(document.documentElement, { childList: true, subtree: true });
        };
        _sl['remove-class'] = function(selector, clazz) {
          if (!clazz) { clazz = selector; selector = undefined; }
          var els = selector ? document.querySelectorAll(selector) : document.querySelectorAll('.' + clazz.split(/\\\\s+/).join('.'));
          els.forEach(function(el) { el.classList.remove(clazz); });
          new MutationObserver(function() {
            (selector ? document.querySelectorAll(selector) : document.querySelectorAll('.' + clazz.split(/\\\\s+/).join('.')))
              .forEach(function(el) { el.classList.remove(clazz); });
          }).observe(document.documentElement, { childList: true, subtree: true });
        };
        function toRegExp(s) {
          if (!s || typeof s !== 'string') return null;
          if (s.length > 1 && s[0] === '/' && s.lastIndexOf('/') > 0) {
            var li = s.lastIndexOf('/');
            try { return new RegExp(s.slice(1, li), s.slice(li + 1)); } catch(e) { return null; }
          }
          return null;
        }
        function delPath(o, path) {
          var p = path.split('.');
          var c = o;
          for (var i = 0; i < p.length - 1; i++) { if (!c || typeof c !== 'object') return; c = c[p[i]]; }
          if (c && typeof c === 'object') delete c[p[p.length - 1]];
        }
        _sl['json-prune'] = function(needle, prune) {
          var _parse = JSON.parse;
          JSON.parse = function(str) {
            try {
              var obj = _parse.call(this, str);
              if (obj && typeof obj === 'object') {
                if (prune) { var a = prune.split(/\\s+/); for (var i = 0; i < a.length; i++) delPath(obj, a[i]); }
                if (needle) { var a = needle.split(/\\s+/); for (var i = 0; i < a.length; i++) delPath(obj, a[i]); }
              }
              return obj;
            } catch(e) { return _parse.call(this, str); }
          };
        };
        _sl['json-prune-fetch-response'] = function(needle, prune, propsToMatch, urlPattern) {
          if (!window.fetch) return;
          var re = toRegExp(urlPattern), _fetch = window.fetch;
          if (propsToMatch === 'propsToMatch') propsToMatch = needle;
          if (propsToMatch === 'propsToMatchAll') propsToMatch = needle;
          function hasProps(o) {
            if (!propsToMatch) return true;
            var a = propsToMatch.split(/\\s+/);
            for (var i = 0; i < a.length; i++) { if (o[a[i]] === undefined) return false; }
            return true;
          }
          window.fetch = function(url, init) {
            return _fetch.call(this, url, init).then(function(r) {
              var u = typeof url === 'string' ? url : (url && url.url) || '';
              if (re && !re.test(u)) return r;
              var _json = r.json.bind(r);
              r.json = function() {
                return _json().then(function(obj) {
                  if (!hasProps(obj)) return obj;
                  if (prune) { var a = prune.split(/\\s+/); for (var i = 0; i < a.length; i++) delPath(obj, a[i]); }
                  if (needle) { var a = needle.split(/\\s+/); for (var i = 0; i < a.length; i++) delPath(obj, a[i]); }
                  return obj;
                });
              };
              return r;
            });
          };
        };
        _sl['json-prune-xhr-response'] = function(needle, prune, propsToMatch, urlPattern) {
          var re = toRegExp(urlPattern);
          if (propsToMatch === 'propsToMatch') propsToMatch = needle;
          if (propsToMatch === 'propsToMatchAll') propsToMatch = needle;
          function hasProps(o) {
            if (!propsToMatch) return true;
            var a = propsToMatch.split(/\\s+/);
            for (var i = 0; i < a.length; i++) { if (o[a[i]] === undefined) return false; }
            return true;
          }
          var _open = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function(m, u) { this.__url = u; return _open.apply(this, arguments); };
          var _send = XMLHttpRequest.prototype.send;
          XMLHttpRequest.prototype.send = function(b) {
            if (this.__url && (!re || re.test(this.__url))) {
              var x = this;
              x.addEventListener('readystatechange', function() {
                if (x.readyState !== 4) return;
                try {
                  var t = x.responseText;
                  if (!t) return;
                  var obj = JSON.parse(t);
                  if (!hasProps(obj)) return;
                  if (prune) { var a = prune.split(/\\s+/); for (var i = 0; i < a.length; i++) delPath(obj, a[i]); }
                  if (needle) { var a = needle.split(/\\s+/); for (var i = 0; i < a.length; i++) delPath(obj, a[i]); }
                  Object.defineProperty(x, 'responseText', { get: function() { return JSON.stringify(obj); } });
                } catch(e) {}
              });
            }
            return _send.apply(this, arguments);
          };
        };
        _sl['trusted-replace-xhr-response'] = function(pattern, replacement, urlPattern) {
          var re = toRegExp(urlPattern), p = pattern;
          var pre = typeof p === 'string' && p.length > 1 && p[0] === '/' && p.lastIndexOf('/') > 0 ? toRegExp(p) : p;
          var _open = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function(m, u) { this.__url = u; return _open.apply(this, arguments); };
          var _send = XMLHttpRequest.prototype.send;
          XMLHttpRequest.prototype.send = function(b) {
            if (this.__url && (!re || re.test(this.__url))) {
              var x = this;
              x.addEventListener('readystatechange', function() {
                if (x.readyState !== 4) return;
                try {
                  var t = x.responseText;
                  if (!t || (typeof pre === 'string' && t.indexOf(pre) === -1)) return;
                  var mod = t.replace(pre, replacement);
                  if (mod !== t) Object.defineProperty(x, 'responseText', { get: function() { return mod; } });
                } catch(e) {}
              });
            }
            return _send.apply(this, arguments);
          };
        };
        _sl['trusted-replace-fetch-response'] = function(pattern, replacement, urlPattern) {
          if (!window.fetch) return;
          var re = toRegExp(urlPattern), p = pattern;
          var pre = typeof p === 'string' && p.length > 1 && p[0] === '/' && p.lastIndexOf('/') > 0 ? toRegExp(p) : p;
          var _fetch = window.fetch;
          window.fetch = function(url, init) {
            return _fetch.call(this, url, init).then(function(r) {
              var u = typeof url === 'string' ? url : (url && url.url) || '';
              if (re && !re.test(u)) return r;
              var _text = r.text.bind(r);
              r.text = function() {
                return _text().then(function(t) {
                  if (typeof pre === 'string' && t.indexOf(pre) === -1) return t;
                  return t.replace(pre, replacement);
                });
              };
              r.json = function() {
                return _text().then(function(t) {
                  if (typeof pre === 'string' && t.indexOf(pre) === -1) return JSON.parse(t);
                  return JSON.parse(t.replace(pre, replacement));
                });
              };
              return r;
            });
          };
        };
        _sl['nano-stb'] = function(needle, delay, boost) {
          var orig = window.setTimeout;
          function shouldBlock(fn) {
            if (typeof fn !== 'function') return false;
            if (!needle || needle === 'undefined' || needle === '') return true;
            var s = fn.toString();
            if (needle === '[native code]') return s.indexOf('[native code]') === -1;
            return s.indexOf(needle) !== -1;
          }
          window.setTimeout = function(fn, ms) {
            if (delay && ms === parseInt(delay, 10) && shouldBlock(fn)) return undefined;
            if (boost && ms > 0 && ms < parseFloat(boost)) return orig.call(this, fn, 0);
            return orig.call(this, fn, ms);
          };
        };
        _sl['adjust-setTimeout'] = _sl['nano-stb'];
        _sl['prevent-xhr'] = function(urlPattern) {
          var orig = window.XMLHttpRequest.prototype.open;
          window.XMLHttpRequest.prototype.open = function(method, url) {
            if (urlPattern && url && url.indexOf(urlPattern) >= 0) return undefined;
            return orig.apply(this, arguments);
          };
        };
        _sl['prevent-fetch'] = function(urlPattern) {
          var orig = window.fetch;
          window.fetch = function(url, opts) {
            var u = typeof url === 'string' ? url : (url && url.url) || '';
            if (urlPattern && u.indexOf(urlPattern) >= 0) return Promise.resolve(new Response('', { status: 200 }));
            return orig.apply(this, arguments);
          };
        };
        _sl['setTimeout-defuser'] = function(delay) {
          var orig = window.setTimeout;
          window.setTimeout = function(fn, ms) {
            if (delay && ms === parseInt(delay, 10)) return undefined;
            if (!delay && ms > 0 && ms < 1001) return undefined;
            return orig.call(this, fn, ms);
          };
        };
        _sl['hide-if-contains'] = function(selector, text) {
          function hide() {
            document.querySelectorAll(selector).forEach(function(el) {
              if (el.textContent.toLowerCase().indexOf(text.toLowerCase()) >= 0) el.style.display = 'none';
            });
          }
          hide();
          new MutationObserver(hide).observe(document.documentElement, { childList: true, subtree: true });
        };
        _sl['no-setTimeout-if'] = function(pattern, delay) {
          var orig = window.setTimeout;
          window.setTimeout = function(fn, ms) {
            if (typeof fn === 'function') {
              var s = fn.toString();
              if (delay && ms === parseInt(delay, 10) && s.indexOf(pattern) >= 0) return undefined;
              if (!delay && ms > 0 && s.indexOf(pattern) >= 0) return undefined;
            }
            return orig.call(this, fn, ms);
          };
        };
        _sl['no-xhr-if'] = function(urlPattern) {
          var re = null;
          if (urlPattern && urlPattern.length > 1 && urlPattern[0] === '/' && urlPattern.lastIndexOf('/') > 0) {
            var li = urlPattern.lastIndexOf('/');
            try { re = new RegExp(urlPattern.slice(1, li), urlPattern.slice(li + 1)); } catch(e) {}
          }
          var _open = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function(m, u) {
            var url = u || '';
            if (re && re.test(url) || !re && urlPattern && url.indexOf(urlPattern) >= 0) return undefined;
            return _open.apply(this, arguments);
          };
        };
        _sl['rmnt'] = function(selector, needle) {
          function rm() {
            document.querySelectorAll(selector || 'script').forEach(function(el) {
              if (el.textContent.indexOf(needle) >= 0) el.remove();
            });
          }
          rm();
        };
        window.__0c0d3_scriptlets = _sl;
})();\`;
      el.setAttribute('data-0c0d3-lib', '');
      (document.head || document.documentElement).appendChild(el);
      el.remove();
    } catch (e) {}
  })();

  var style    = document.createElement('style');
  style.id       = 'x0c0d3-styles';

  var GENERIC = \`
  .fc-ab-root,.fc-dialog-overlay,#detect-modal,.adblock-overlay,.adblock-popup,.anti-adblock,
  .tp-modal,.tp-backdrop,.admiral-overlay,.admiral-popup,#fuckAdBlock,.ad-blocker-message,
  .blockadblock-modal,.adblock-notification,.adblock-detected,.adblock-warning,
  [class*="adblock-detect"],[class*="adblockDetect"],[id*="adblock-detect"],
  [class*="anti-adblock"],[id*="anti-adblock"],[class*="AntiAdblock"],
  .fc-consent-root,.fc-dialog-container,.fc-message-root,
  .adblock-modal,.adblock-dialog,.blocker-modal,.blocker-overlay,#adblockModal,
  .ad-block-modal,#ad-block-dialog,#adblock-layer,#adblock-wall,
  #piano-paywall,.tp-modal-wrapper,.tp-modal-overlay,.tp-piano-modal,
  ytd-ad-slot-renderer,ytd-display-ad-renderer,ytd-in-feed-ad-layout-renderer,
  ytd-promoted-video-renderer,ytd-promoted-sparkles-web-renderer,
  ytd-companion-ad-renderer,ytd-action-companion-ad-renderer,ytd-banner-promo-renderer,
  ytd-statement-banner-renderer,ytd-merchandise-shelf-renderer,ytd-search-pyv-renderer,
  ytd-video-masthead-ad-v3-renderer,ytd-primetime-promo-renderer,ytd-ad-slot-renderer,
  ytd-ad-slot-shape,ytd-in-feed-ad-frame-renderer,
  ytd-pivot-bar-renderer[is-ad],ytd-ad-slot[is-ad],
  ytd-rich-section-renderer:has(ytd-ad-slot-renderer),
  ytd-rich-section-renderer:has(ytd-ad-slot-shape),
  ytd-rich-section-renderer:has(ytd-display-ad-renderer),
  ytd-rich-section-renderer:has(ytd-promoted-video-renderer),
  ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
  ytd-rich-item-renderer:has(ytd-ad-slot-shape),
  ytd-item-section-renderer:has(ytd-ad-slot-renderer),
  ytd-item-section-renderer:has(ytd-ad-slot-shape),
  .ytp-ad-overlay-container,.ytp-ad-image-overlay,.ytp-ad-player-overlay,.ytp-ad-module,
  .ytp-ad-text-overlay,.ytp-ad-progress,.ytp-ad-preview-container,.video-ads,
  .ytp-ad-skip-button-container,.ytp-ad-visit-advertiser-button,.ytp-ad-survey,
  .ytp-ad-player-overlay-layout,.ytp-ad-progress-list,.ytp-ad-button,.ytp-ad-button-link,
  .ytp-ad-clickable,.ytp-ad-hover-text-button,
  .ytp-visit-advertiser-link,[class*="ytp-visit-advertiser"],[class*="ytp-ad-button"],
  [id^="google_ads_"],[id^="div-gpt-ad"],
  [class*="advertisement"],[class*="Advertisement"],[class*="sponsored"],[class*="Sponsored"],[class*="promoted"]:not([class*="promoted-trend"]),
  [aria-label*="Sponsored"],[aria-label*="sponsored"],[aria-label*="Ads"],[aria-label*="promoted"],
  [data-ad-slot],[data-ad-client],[data-ad-format],[data-ad-unit],[data-testid*="promoted"],[data-sponsored],[data-ad],
  ins.adsbygoogle,.adsbygoogle,.ad-container,.ad-wrapper,.ad-banner,.ad-slot,.ad-unit,
  .ad-box,.ad__wrapper,.ad__container,.ad-slot--,.dfp-ad,.advertisement--,
  [id^="dfp-"],div[id^="ad-slot"],div[id^="ad-container"],
  ytd-badge-supported-renderer,[is-ad],[class*="ytd-ad"],
  ytd-video-ad,ytd-ad-container,ytd-video-ad-player-overlay,
   .html5-video-player.ad-showing video,.html5-video-player.ad-interrupting video,
   #movie_player.x0c0d3-ad-active,ytd-player.x0c0d3-ad-active,
   .ytp-ad-persistent-progress-bar-container,.ytp-ad-persistent-progress-bar,
   .tp-modal,.tp-backdrop,.tp-container,.tp-piano-modal,#tinypass_overlay,
  .piano-overlay,.piano-modal,.piano-container,
  [id*="tinypass"],[class*="tinypass"],
  [id*="piano"],[class*="piano"],
  [data-piano],[data-tinypass],
  [id*="permutive"],[class*="permutive"],
  [id*="sourcepoint"],[class*="sourcepoint"],
  #sp_message_iframe,.sp_veil,.sp_choice,.sp_overlay,
  .fc-chooser,.fc-dialog,.fc-sticky,
  .iab-splash,.consent-box,.consent-wall,
  [id*="consent"][style*="fixed"],[class*="consent"][style*="fixed"]
  { display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;height:0!important;max-height:0!important;overflow:hidden!important; }\`;

  (document.head || document.documentElement).appendChild(style);
  style.textContent = GENERIC;

  // Protect our style element from being removed by YouTube
  (function protectStyle() {
    var target = document.documentElement || document.body;
    if (!target) { setTimeout(protectStyle, 50); return; }
    var obs = new MutationObserver(function() {
      if (!document.getElementById('x0c0d3-styles')) {
        try {
          var s = document.createElement('style');
          s.id = 'x0c0d3-styles';
          s.textContent = GENERIC;
          (document.head || document.documentElement).appendChild(s);
        } catch(e) {}
      }
    });
    obs.observe(target, { childList: true, subtree: true });
  })();

  // In-page ad detector for YouTube (runs in page context, unaffected by content script issues)
  if (isYT) {
    injectScriptText('(function(){' +
      'function skipAd(){try{' +
        'var e=document.getElementById("movie_player");if(!e)return;' +
        'var v=e.querySelector("video");' +
        'if(e.classList.contains("ad-showing")||e.classList.contains("ad-interrupting")){' +
          'if(v){v.muted=true;v.playbackRate=16;' +
            'if(v.duration&&v.duration>0&&v.duration<120){var r=v.duration-v.currentTime;if(r>0.5)v.currentTime=v.duration-0.3}' +
          '}' +
          'var s=document.querySelector(".ytp-ad-skip-button,.ytp-skip-ad-button,.ytp-ad-skip-button-modern,.ytp-ad-skip-button-slot,.ytp-ad-skip-button-container button");' +
          'if(s)s.click();' +
        '}else{' +
          'if(v&&v.playbackRate>1){v.muted=false;v.playbackRate=1}' +
        '}' +
      '}catch(e){}}' +
      // MutationObserver: instant reaction when ad class is added
      'var obs=new MutationObserver(function(muts){' +
        'for(var i=0;i<muts.length;i++){' +
          'if(muts[i].type==="attributes"&&(muts[i].attributeName==="class")){skipAd();break}' +
        '}' +
      '});' +
      'function watch(){try{' +
        'var p=document.getElementById("movie_player");if(!p){setTimeout(watch,50);return}' +
        'obs.observe(p,{attributes:true,attributeFilter:["class"]});' +
        'skipAd();' +
      '}catch(e){}}' +
      'watch();' +
      'setInterval(skipAd,250);' + // fallback poll
    '})();');
  }

  let customCSS = '';
  try {
    var resp = await Promise.race([
      api.runtime.sendMessage({ action: 'getCosmeticData', hostname }),
      new Promise(function(r) { setTimeout(r, 2000); })
    ]);
    if (resp && resp.ok && resp.cosmetics) {
      const parts = [];
      for (const d in resp.cosmetics) {
        const sels = resp.cosmetics[d];
        if (Array.isArray(sels) && sels.length) {
          for (let i = 0; i < sels.length; i += 250) {
            parts.push(sels.slice(i, i + 250).join(',') + '{display:none!important;}');
          }
        }
      }
      customCSS = parts.join('\\n');
    }
  } catch (e) {}

  style.textContent = GENERIC + '\\n' + customCSS;

  document.addEventListener('error', function(e) {
    var t = e.target;
    if (t && t.src && t !== document.documentElement && t !== document.body && !t.closest('#x0c0d3-styles')) {
      var src = t.src || '';
      if (/ads?\.|doubleclick|googlesyndication|adnxs|taboola|outbrain|criteo|pubmatic|rubicon|adservice|adserver/.test(src)) {
        t.remove();
      }
    }
  }, true);

  const AD_IFRAME_SEL =
    'iframe[src*="ads"],iframe[src*="doubleclick"],iframe[src*="googlesyndication"],' +
    'iframe[src*="adnxs"],iframe[src*="taboola"],iframe[src*="outbrain"],' +
    'iframe[src*="criteo"],iframe[src*="pubmatic"],iframe[src*="rubicon"],' +
    'iframe[src*="adservice"],iframe[src*="adserver"],iframe[src*="adzerk"],' +
    'iframe[src*="360yield"],iframe[src*="amazon-adsystem"],iframe[src*="advertising"]';

  const ANTI_ADBLOCK_SEL =
    '.fc-ab-root,.fc-dialog-overlay,.adblock-overlay,.adblock-popup,.anti-adblock,' +
    '.tp-modal,.tp-backdrop,.admiral-overlay,.admiral-popup,#fuckAdBlock,' +
    '.blockadblock-modal,.adblock-notification,.adblock-detected,.adblock-warning,' +
    '[class*="adblock-detect"],[class*="anti-adblock"],[id*="anti-adblock"],' +
    '.fc-consent-root,.fc-dialog-container,' +
    '.adblock-modal,.adblock-dialog,.blocker-modal,.blocker-overlay,#adblockModal,' +
    '.ad-block-modal,#ad-block-dialog,#adblock-layer,#adblock-wall,' +
    '#piano-paywall,.tp-modal-wrapper,.tp-modal-overlay,.tp-piano-modal,' +
    '.tp-modal,.tp-backdrop,.tp-container,#tinypass_overlay,' +
    '.piano-overlay,.piano-modal,.piano-container,' +
    '[id*="tinypass"],[class*="tinypass"],[id*="piano"],[class*="piano"],' +
    '[data-piano],[data-tinypass],' +
    '[id*="permutive"],[class*="permutive"],' +
    '#sp_message_iframe,.sp_veil,.sp_choice,.sp_overlay';

  var ytAdActive = false;

  function ytCheckAd() {
    if (!isYT) return;
    try {
      var player = document.querySelector('.html5-video-player, ytd-player');
      var video = player ? player.querySelector('video') : null;
      var hasAdClass = player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'));
      var adEl = document.querySelector('.ytp-ad-player-overlay, .ytp-ad-module, .video-ads, .ytp-ad-image-overlay, .ytp-ad-survey, .ytp-ad-player-overlay-layout, .ytp-ad-text-overlay, .ytp-ad-preview-container, .ytp-ad-button, .ytp-ad-button-link, .ytp-ad-clickable, .ytp-ad-hover-text-button, .ytp-visit-advertiser-link, [class*="ytp-visit-advertiser"], [class*="ytp-ad-button"]');
      var hasAd = !!adEl;
      if (hasAd || hasAdClass) {
        if (!ytAdActive) {
          ytAdActive = true;
          if (video) { video.muted = true; video.playbackRate = 16; }
          ytRemoveAdElements();
        }
        if (video && video.duration && video.duration > 0 && video.duration < 120) {
          var remaining = video.duration - video.currentTime;
          if (remaining > 0.5) video.currentTime = video.duration - 0.3;
        }
        var skip = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot, .ytp-ad-skip-button-container button');
        if (skip) skip.click();
      } else if (ytAdActive) {
        ytAdActive = false;
        if (video) { video.muted = false; video.playbackRate = 1; }
      }
    } catch (e) {}
  }

  function ytRemoveAdElements() {
    if (!isYT) return;
    try {
      document.querySelectorAll('ytd-ad-slot-renderer,ytd-display-ad-renderer,ytd-in-feed-ad-layout-renderer,ytd-companion-ad-renderer,ytd-action-companion-ad-renderer,ytd-ad-slot-shape,ytd-promoted-video-renderer,ytd-promoted-sparkles-web-renderer,ytd-banner-promo-renderer,ytd-statement-banner-renderer,ytd-video-masthead-ad-v3-renderer,ytd-merchandise-shelf-renderer,ytd-in-feed-ad-frame-renderer,ytd-rich-section-renderer:has(ytd-ad-slot-renderer),ytd-rich-section-renderer:has(ytd-ad-slot-shape),ytd-rich-section-renderer:has(ytd-display-ad-renderer),ytd-rich-section-renderer:has(ytd-promoted-video-renderer),ytd-rich-item-renderer:has(ytd-ad-slot-renderer),ytd-rich-item-renderer:has(ytd-ad-slot-shape),ytd-item-section-renderer:has(ytd-ad-slot-renderer),ytd-item-section-renderer:has(ytd-ad-slot-shape),ytd-item-section-renderer:has(ytd-display-ad-renderer),ytd-video-ad,ytd-ad-container,[is-ad],[class*="ytd-ad"]').forEach(function(e) { e.remove(); });
      // Remove in-player ad overlay elements directly
      document.querySelectorAll('.ytp-ad-button,.ytp-ad-button-link,.ytp-ad-clickable,.ytp-ad-hover-text-button,.ytp-visit-advertiser-link,[class*="ytp-visit-advertiser"],[class*="ytp-ad-button"],.ytp-ad-player-overlay,.ytp-ad-module,.ytp-ad-image-overlay,.ytp-ad-survey,.ytp-ad-text-overlay,.ytp-ad-preview-container,.ytp-ad-overlay-container,.ytp-ad-persistent-progress-bar-container,.ytp-ad-persistent-progress-bar').forEach(function(e) { e.remove(); });
    } catch (e) {}
  }

  function scanPage() {
    try {
      var html = document.documentElement;
      if (!html) return;
      document.querySelectorAll(AD_IFRAME_SEL).forEach(function(e) { e.remove(); });
      document.querySelectorAll('img[src*="ads"],img[src*="doubleclick"],img[src*="adservice"],img[src*="adserver"],img[src*="pixel"],object[src*="ads"],embed[src*="ads"]').forEach(function(e) { e.remove(); });
      document.querySelectorAll('a[href*="ads."],a[href*="doubleclick"],div[id^="ad-"]').forEach(function(e) { e.remove(); });
      document.querySelectorAll(ANTI_ADBLOCK_SEL).forEach(function(e) {
        e.remove();
      });
      document.querySelectorAll('body > div,body > section,body > aside').forEach(function(el) {
        var cs = getComputedStyle(el);
        var txt = (el.textContent || '').toLowerCase();
        if (/adblock|bloqueador|blocker|disable|adblocker|ad.block|allowlist|whitelist|allow ads|please allow|ad blocker|adblocker|whitelist us|harmony/.test(txt)) {
          if (cs.position === 'fixed' || cs.position === 'sticky') el.remove();
        }
        // On known anti-adblock sites, also remove large fixed overlays regardless of text
        if (/rollingstone|variety|billboard/.test(hostname) && (cs.position === 'fixed' || cs.position === 'sticky')) {
          var z = parseInt(cs.zIndex, 10);
          if (!isNaN(z) && z > 100 && el.offsetHeight > window.innerHeight * 0.4) {
            el.remove();
          }
        }
      });
      document.querySelectorAll('div[style*="z-index"],div[style*="z-Index"],div[style*="Z-INDEX"],div[style*="position"][style*="fixed"],div[style*="position"][style*="sticky"],section[style*="fixed"],aside[style*="fixed"]').forEach(function(el) {
        var txt = (el.textContent || '').toLowerCase();
        if (/adblock|bloqueador|blocker|disable|adblocker|ad.block|allowlist|whitelist|allow ads|please allow|harmony/.test(txt)) {
          el.remove();
        }
      });
      document.querySelectorAll('[class*="pmc-"],[class*="harmony"],[id*="harmony"],[data-pmc]').forEach(function(el) {
        el.remove();
      });
      ytRemoveAdElements();
    } catch (e) {}
  }

  function sweep() { scanPage(); ytCheckAd(); }
  sweep();
  if (isYT) {
    setInterval(ytCheckAd, 100);
    setInterval(ytRemoveAdElements, 1000);
    setTimeout(ytCheckAd, 1);
    setTimeout(ytCheckAd, 10);
    setTimeout(ytCheckAd, 50);
  }
  setInterval(scanPage, 3000);
  new MutationObserver(function(muts) {
    var relevant = false;
    for (var i = 0; i < muts.length; i++) {
      var t = muts[i].target;
      if (t && t.nodeType === 1) {
        var tag = t.tagName || '';
        if (tag === 'SCRIPT' || tag === 'IFRAME' || tag === 'IMG') { relevant = true; break; }
        if (tag === 'DIV' || tag === 'SPAN' || tag === 'A') { relevant = true; break; }
        if (isYT && (tag.indexOf('YT') === 0 || tag.indexOf('ytd-') === 0)) { relevant = true; break; }
      }
    }
    if (!relevant) return;
    scanPage();
    if (isYT) { ytCheckAd(); ytRemoveAdElements(); }
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'id', 'src', 'data-ad'] });
})();`;

const bgHTML = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script src="background.js"><\/script></body></html>';

const popupHTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,sans-serif;}
body{width:320px;background:#0a0a0a;color:#fff;}
header{padding:16px;border-bottom:1px solid #222;display:flex;align-items:center;gap:10px;}
.logo{width:34px;height:34px;background:#000;border:2px solid #fff;border-radius:50%;
      display:flex;align-items:center;justify-content:center;font-weight:900;font-size:17px;}
h1{font-size:15px;letter-spacing:1px;}
.ver{color:#666;font-size:11px;margin-left:auto;}
.content{padding:16px;}
.stat{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #1a1a1a;font-size:13px;}
.stat span:last-child{color:#4ade80;font-weight:600;}
.update-row{padding:14px 0 2px;}
.btn{width:100%;padding:9px;background:#1a1a1a;color:#fff;border:1px solid #333;
     border-radius:6px;font-size:13px;cursor:pointer;letter-spacing:.5px;transition:background .15s;}
.btn:hover:not(:disabled){background:#252525;}
.btn:disabled{opacity:.45;cursor:default;}
.last-update{text-align:center;color:#555;font-size:11px;margin-top:8px;}
@keyframes spin{to{transform:rotate(360deg)}}
.spinner{display:inline-block;width:11px;height:11px;border:2px solid #444;
         border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;
         vertical-align:middle;margin-right:6px;}
</style></head><body>
<header><div class="logo">0</div><h1>0c0d3</h1><span class="ver">v3.0.6</span></header>
<div class="content">
  <div class="stat"><span>Estado</span><span id="state">…</span></div>
  <div class="stat"><span>Bloqueos totales</span><span id="total">…</span></div>
  <div class="stat"><span>Esta sesión</span><span id="session">…</span></div>
  <div class="stat"><span>Hosts en lista</span><span id="hosts">…</span></div>
  <div class="stat"><span>Dominios cosmetic</span><span id="cosm">…</span></div>
  <div class="stat"><span>Listas activas</span><span id="lists">…</span></div>
  <div class="update-row">
    <button class="btn" id="updateBtn">Actualizar listas ahora</button>
    <div class="last-update" id="lastUpdate"></div>
  </div>
</div>
<script src="popup.js"><\/script>
</body></html>`;

const popupJS = `const api = browser;

function fmtTime(ts) {
  if (!ts) return 'Nunca';
  const d = new Date(ts);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function refreshState() {
  try {
    const s = await api.runtime.sendMessage({ action: 'getState' });
    document.getElementById('state').textContent   = s.enabled ? '\\u2713 Activo' : 'Inactivo';
    document.getElementById('total').textContent   = (s.totalBlocked    || 0).toLocaleString();
    document.getElementById('session').textContent = (s.sessionBlocked  || 0).toLocaleString();
    document.getElementById('hosts').textContent   = (s.hostCount       || 0).toLocaleString();
    document.getElementById('cosm').textContent    = (s.cosmeticDomains || 0).toLocaleString();
    document.getElementById('lists').textContent   = s.lists || 0;
    document.getElementById('lastUpdate').textContent =
      '\\u00daLtima actualización: ' + fmtTime(s.lastUpdateTime);
    const btn = document.getElementById('updateBtn');
    if (s.updateInProgress) {
      btn.disabled   = true;
      btn.innerHTML  = '<span class="spinner"></span>Actualizando\\u2026';
    } else {
      btn.disabled   = false;
      btn.textContent = 'Actualizar listas ahora';
    }
  } catch (e) { console.error(e); }
}

document.getElementById('updateBtn').addEventListener('click', async () => {
  const btn = document.getElementById('updateBtn');
  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span>Actualizando\\u2026';
  try {
    const result = await api.runtime.sendMessage({ action: 'updateLists' });
    if (result && result.ok) {
      document.getElementById('hosts').textContent = (result.blocked || 0).toLocaleString();
      if (result.cosmeticDomains !== undefined)
        document.getElementById('cosm').textContent = result.cosmeticDomains.toLocaleString();
    }
  } catch (e) { console.error(e); }
  await refreshState();
});

refreshState();`;

const optHTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:system-ui;max-width:700px;margin:40px auto;padding:20px;background:#0a0a0a;color:#eee;}
h1{color:#fff;margin-bottom:12px;}p{line-height:1.6;}
</style></head><body>
<h1>0c0d3 v3.0.6</h1>
<p>0c0d3 Adblocker &mdash; Firefox MV3.</p>
<p>Parser ABP completo con soporte de DNR, cosmetic filtering y bloqueo por webRequest.</p>
</body></html>`;

// ============================================================
//  MANIFEST (Firefox MV3)
// ============================================================
function manifestJSON(dnrCount, dataFiles, dnrRules) {
  const rr = (dnrRules || []).map(r => ({ id: r.id, enabled: true, path: r.path }));
  return {
    manifest_version: 3,
    name:             '0c0d3',
    version:          '3.0.6',
    description:      '0c0d3 Adblocker',
    browser_specific_settings: {
      gecko: { id: 'nan@nan.gov', strict_min_version: '128.0', data_collection_permissions: { required: ["none"] } },
    },
    permissions: ['storage', 'webRequest', 'webRequestBlocking', 'declarativeNetRequest', 'alarms'],
    host_permissions: ['<all_urls>'],
    background: { scripts: ['background.js'] },
    action: {
      default_title: '0c0d3',
      default_popup: 'popup.html',
      default_icon:  { 48: 'icon.png', 128: 'icon.png' },
    },
    options_ui: { page: 'options.html' },
    content_scripts: [{
      matches:    ['<all_urls>'],
      js:         ['content.js'],
      run_at:     'document_start',
      all_frames: true,
    }],
    web_accessible_resources: [{
      resources: (dataFiles ? [...dataFiles.hosts, ...dataFiles.cosmetics, ...dataFiles.scriptlets] : []).concat(['meta.json']),
      matches:   ['<all_urls>'],
    }],
    declarative_net_request: { rule_resources: rr },
    icons: { 48: 'icon.png', 128: 'icon.png' },
  };
}

// ============================================================
//  ICONO PNG (sin dependencias externas)
// ============================================================
function generateIconPNG() {
  const size   = 128;
  const pixels = Buffer.alloc(size * size * 4);

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0; pixels[i + 3] = 255;
  }

  const cx = size / 2, cy = size / 2;
  const rxOut = 34, ryOut = 46, rxIn = 18, ryIn = 28;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx    = x - cx, dy = y - cy;
      const outer = (dx * dx) / (rxOut * rxOut) + (dy * dy) / (ryOut * ryOut);
      const inner = (dx * dx) / (rxIn  * rxIn)  + (dy * dy) / (ryIn  * ryIn);
      if (outer <= 1 && inner >= 1) {
        const idx = (y * size + x) * 4;
        pixels[idx] = 255; pixels[idx + 1] = 255; pixels[idx + 2] = 255;
      }
    }
  }

  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const IHDR = Buffer.alloc(13);
  IHDR.writeUInt32BE(size, 0); IHDR.writeUInt32BE(size, 4);
  IHDR[8] = 8; IHDR[9] = 6;

  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0;
    pixels.copy(raw, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const compressed = deflateSync(raw, { level: 9 });

  function crc32(data) {
    const tbl = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      tbl[n] = c;
    }
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) crc = tbl[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len   = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type);
    const crc   = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeB, data])), 0);
    return Buffer.concat([len, typeB, data, crc]);
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', IHDR),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ============================================================
//  BUILD
// ============================================================
async function build() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   0c0d3 Adblocker · v3.0.6 (Firefox)   ║');
  console.log('╚════════════════════════════════════════╝\n');

  const extPath = join(__dirname, 'extension');
  if (existsSync(extPath)) rmSync(extPath, { recursive: true, force: true });

  console.log('Descargando ' + DEFAULT_LISTS.length + ' listas...');
  await downloadAllLists();

  console.log('Procesando reglas...');
  const { dnrCount, dataFiles, dnrRules } = await generateAll();

  console.log('\nEscribiendo archivos de la extensión...');
  mkdirSync(extPath, { recursive: true });
  writeFileSync(join(extPath, 'manifest.json'), JSON.stringify(manifestJSON(dnrCount, dataFiles, dnrRules), null, 2));
  writeFileSync(join(extPath, 'background.html'), bgHTML);
  writeFileSync(join(extPath, 'background.js'),   bgJS);
  writeFileSync(join(extPath, 'content.js'),      contentJS);
  writeFileSync(join(extPath, 'popup.html'),       popupHTML);
  writeFileSync(join(extPath, 'popup.js'),         popupJS);
  writeFileSync(join(extPath, 'options.html'),     optHTML);
  writeFileSync(join(extPath, 'icon.png'),         generateIconPNG());

  console.log('Empaquetando XPI...');
  const xpi = join(__dirname, '0c0d3-3.0.6.xpi');
  if (existsSync(xpi)) rmSync(xpi);
  const out = createWriteStream(xpi);
  const arc = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    out.on('close', () => {
      const mb = (arc.pointer() / 1024 / 1024).toFixed(2);
      console.log('\n✅ 0c0d3-3.0.6.xpi (' + mb + ' MB) listo.');
      console.log('\nInstalación en Firefox:');
      console.log('  1. Abre about:debugging#/runtime/this-firefox');
      console.log('  2. Haz clic en "Cargar complemento temporal..."');
      console.log('  3. Selecciona el archivo 0c0d3-3.0.6.xpi\n');
      console.log('Para instalación permanente, firma el XPI en addons.mozilla.org.\n');
      resolve();
    });
    arc.on('error', reject);
    arc.pipe(out);
    arc.directory(extPath, '');
    arc.finalize();
  });
}

build().catch(e => { console.error(e); process.exit(1); });