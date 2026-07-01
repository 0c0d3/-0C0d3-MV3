const DEBUG = false;
const UPDATE_INTERVAL_MINUTES = 60;
const DOMAIN_CACHE_MAX = 15000;
const MAX_DNR_RULES = 4000;

const filterLists = [
  "https://raw.githubusercontent.com/yokoffing/filterlists/refs/heads/main/privacy_essentials.txt",
  "https://raw.githubusercontent.com/hagezi/dns-blocklists/refs/heads/main/adblock/pro.mini.txt",
  "https://raw.githubusercontent.com/yokoffing/filterlists/refs/heads/main/annoyance_list.txt",
  "https://secure.fanboy.co.nz/fanboy-agegate.txt",
  "https://raw.githubusercontent.com/DandelionSprout/adfilt/refs/heads/master/BrowseWebsitesWithoutLoggingIn.txt",
  "https://raw.githubusercontent.com/yokoffing/filterlists/refs/heads/main/youtube_clear_view.txt",
  "https://raw.githubusercontent.com/liamengland1/miscfilters/refs/heads/master/antipaywall.txt",
  "https://raw.githubusercontent.com/DandelionSprout/adfilt/master/YouTubeEvenMorePureVideoExperience.txt",
  "https://raw.githubusercontent.com/hadig/Focus-for-Youtube/master/focus4yt.txt"
];

const EMERGENCY_RULES = {
  domains: ["doubleclick.net", "googlesyndication.com", "googleadservices.com"],
  keywords: ["adunit", "adserver", "pagead", "adsystem", "adservice", "sponsored"],
  cosmetics: [
    "##.ytp-ad-player-overlay",
    "##.ytd-display-ad-renderer",
    "##.ytd-promoted-video-renderer",
    "##.ytp-ad-module"
  ],
  scriptlets: [{ domains: ["*"], code: "block-youtube-ads" }]
};

let keywordIndex = new Map();
let wildcardIndex = new Map();
let shortWildcardRules = [];
let cosmeticRules = [...EMERGENCY_RULES.cosmetics];
let scriptletRules = [...EMERGENCY_RULES.scriptlets];
let hasKeywords = false;
let hasWildcards = false;
let domainCache = new Map();

let circularKeys = new Array(DOMAIN_CACHE_MAX);
let circularIdx = 0;

function log(...args) { if (DEBUG) console.log(...args); }

function toLowerIfNeeded(s) { return s; }

function* linesFromText(text) {
  let start = 0;
  while (true) {
    const end = text.indexOf('\n', start);
    if (end === -1) { if (start < text.length) yield text.substring(start); break; }
    yield text.substring(start, end);
    start = end + 1;
  }
}

function parseLists(textArray) {
  const domainSet = new Set();
  const keywordSet = new Set();
  const wildcardList = [];
  const cosmeticList = [];
  const scriptletList = [];
  const incompatibleOptions = /\b(?:important|redirect|csp|removeparam|rewrite|domain)\b/i;

  for (const text of textArray) {
    for (let line of linesFromText(text)) {
      line = line.trim();
      if (!line) continue;
      if (line.startsWith('<') || line.startsWith('!') || line.startsWith('[') || line.startsWith('@@')) continue;

      if (line.includes('#$#') || line.includes('#%#')) {
        const parts = line.split('#$#');
        if (parts.length === 2) {
          scriptletList.push({ domains: parts[0].split(',').map(d => d.trim()).filter(Boolean), code: parts[1].trim() });
        }
        continue;
      }

      if (line.includes('##') || line.includes('#@#') || line.includes('#?#') || line.includes('#%#')) {
        if (!line.startsWith('!') && !line.startsWith('[')) cosmeticList.push(line);
        continue;
      }

      if (line.includes('$')) {
        const [rule, options] = line.split('$', 2);
        if (incompatibleOptions.test(options)) continue;
        line = rule;
      }

      if (line.startsWith('||')) {
        line = line.slice(2);
        line = line.replace(/\^+$/, '');
        if (line && !line.includes('/') && !line.includes('*') && !line.includes('^')) {
          const domain = line.toLowerCase();
          if (domain.includes('.')) domainSet.add(domain);
        } else if (line) {
          handleComplexRule(line, keywordSet, wildcardList);
        }
      } else {
        line = line.replace(/\^+$/, '').toLowerCase();
        if (line.includes('.')) domainSet.add(line);
        else if (line) handleComplexRule(line, keywordSet, wildcardList);
      }
    }
  }

  const keywords = Array.from(keywordSet).sort((a, b) => b.length - a.length);
  wildcardList.sort((a, b) => b.parts.length - a.parts.length);
  return { domains: Array.from(domainSet), keywords, wildcards: wildcardList, cosmetics: cosmeticList, scriptlets: scriptletList };
}

function handleComplexRule(line, keywordSet, wildcardList) {
  if (line.includes('*')) {
    const parts = line.toLowerCase().split('*').filter(Boolean);
    if (parts.length > 0) wildcardList.push({ parts });
    return;
  }
  const hasCaret = line.includes('^');
  const cleaned = line.replace(/\^/g, '').toLowerCase();
  if (cleaned.length > 1) keywordSet.add(cleaned + (hasCaret ? '\x00' : ''));
}

function buildKeywordIndex(keywords) {
  const idx = new Map();
  for (const kw of keywords) {
    const boundary = kw.endsWith('\x00');
    const realWord = boundary ? kw.slice(0, -1) : kw;
    const prefix = realWord.length >= 4 ? realWord.substring(0, 4) : realWord;
    const key = strToKey(prefix);
    const chars = new Uint16Array(realWord.length);
    for (let i = 0; i < realWord.length; i++) chars[i] = realWord.charCodeAt(i);
    if (!idx.has(key)) idx.set(key, []);
    const entry = { chars, len: chars.length, boundary };
    if (chars.length >= 5) entry.fifthChar = chars[4];
    idx.get(key).push(entry);
  }
  for (const arr of idx.values()) arr.sort((a, b) => b.len - a.len);
  return idx;
}

function buildWildcardIndex(wildcards) {
  const idx = new Map();
  const shortList = [];
  for (const rule of wildcards) {
    const first = rule.parts[0];
    const ruleObj = { parts: rule.parts, firstLen: first.length, len: rule.parts.length };
    if (first.length >= 4) {
      const firstChars = new Uint16Array(first.length);
      for (let i = 0; i < first.length; i++) firstChars[i] = first.charCodeAt(i);
      ruleObj.firstChars = firstChars;
      const key = strToKey(first.substring(0, 4));
      if (!idx.has(key)) idx.set(key, []);
      idx.get(key).push(ruleObj);
    } else {
      shortList.push(ruleObj);
    }
  }
  shortWildcardRules = shortList;
  return idx;
}

function strToKey(s) {
  return (((s.charCodeAt(0)||0)&255)<<24 | ((s.charCodeAt(1)||0)&255)<<16 | ((s.charCodeAt(2)||0)&255)<<8 | ((s.charCodeAt(3)||0)&255))>>>0;
}

function matchAt(str, pos, chars, len) {
  if (pos + len > str.length) return false;
  for (let j = 0; j < len; j++) {
    if (str.charCodeAt(pos + j) !== chars[j]) return false;
  }
  return true;
}

function isABPWordChar(c) {
  return (c >= 48 && c <= 57) || (c >= 97 && c <= 122) || c === 95 || c === 37 || c === 45 || c === 46;
}

function isKeywordBlocked(fullUrlLower) {
  const maxLen = fullUrlLower.length;
  if (maxLen < 3) return false;
  let c0 = fullUrlLower.charCodeAt(0);
  let c1 = fullUrlLower.charCodeAt(1);
  let c2 = fullUrlLower.charCodeAt(2);
  for (let i = 0; i < maxLen - 3; i++) {
    const c3 = fullUrlLower.charCodeAt(i + 3);
    const key = (((c0 & 255) << 24) | ((c1 & 255) << 16) | ((c2 & 255) << 8) | (c3 & 255)) >>> 0;
    c0 = c1; c1 = c2; c2 = c3;
    const entries = keywordIndex.get(key);
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.fifthChar !== undefined && fullUrlLower.charCodeAt(i + 4) !== entry.fifthChar) continue;
      if (matchAt(fullUrlLower, i, entry.chars, entry.len)) {
        if (entry.boundary) {
          const after = i + entry.len;
          if (after >= maxLen || !isABPWordChar(fullUrlLower.charCodeAt(after))) return true;
        } else return true;
      }
    }
  }
  return false;
}

function isWildcardMatch(urlLower) {
  for (const rule of shortWildcardRules) {
    if (urlLower.indexOf(rule.parts[0]) === -1) continue;
    let startPos = 0;
    let matched = true;
    for (const part of rule.parts) {
      const idx = urlLower.indexOf(part, startPos);
      if (idx === -1) { matched = false; break; }
      startPos = idx + part.length;
    }
    if (matched) return true;
  }
  const maxLen = urlLower.length;
  if (maxLen < 3) return false;
  let c0 = urlLower.charCodeAt(0);
  let c1 = urlLower.charCodeAt(1);
  let c2 = urlLower.charCodeAt(2);
  for (let i = 0; i < maxLen - 3; i++) {
    const c3 = urlLower.charCodeAt(i + 3);
    const key = (((c0 & 255) << 24) | ((c1 & 255) << 16) | ((c2 & 255) << 8) | (c3 & 255)) >>> 0;
    c0 = c1; c1 = c2; c2 = c3;
    const candidates = wildcardIndex.get(key);
    if (!candidates) continue;
    for (const rule of candidates) {
      if (rule.firstLen > 4) {
        let matched = true;
        for (let j = 4; j < rule.firstLen; j++) {
          if (urlLower.charCodeAt(i + j) !== rule.firstChars[j]) { matched = false; break; }
        }
        if (!matched) continue;
      }
      const startPos = i + rule.firstLen;
      if (rule.len === 2) {
        if (urlLower.indexOf(rule.parts[1], startPos) !== -1) return true;
      } else if (rule.len > 2) {
        let pos = startPos;
        let ok = true;
        for (let k = 1; k < rule.len; k++) {
          const idx = urlLower.indexOf(rule.parts[k], pos);
          if (idx === -1) { ok = false; break; }
          pos = idx + rule.parts[k].length;
        }
        if (ok) return true;
      } else return true;
    }
  }
  return false;
}

// DNR
function buildDNROnlyDomains(domains) {
  const safeFiltered = domains.filter(d =>
    !d.includes('youtube.com') && !d.includes('googlevideo.com') &&
    !d.includes('ytimg.com') && !d.includes('ggpht.com') &&
    !d.includes('googleapis.com')
  );
  const limited = safeFiltered.slice(0, MAX_DNR_RULES - 1);
  const rules = limited.map((d, i) => ({
    id: i + 1,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: `||${d}^`,
      resourceTypes: ["script", "image", "xmlhttprequest", "sub_frame", "websocket", "font", "media", "ping", "other"]
    }
  }));
  // Regla para eliminar CSP con ID único (999997)
  rules.push({
    id: 999997,
    priority: 1,
    action: { type: "modifyHeaders", responseHeaders: [{ header: "content-security-policy", operation: "remove" }] },
    condition: { urlFilter: "*", resourceTypes: ["main_frame", "sub_frame"] }
  });
  return rules;
}

async function applyDNR(domains) {
  const rules = buildDNROnlyDomains(domains);
  const old = await browser.declarativeNetRequest.getDynamicRules();
  const oldIds = old.map(r => r.id);
  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldIds,
    addRules: rules
  });
}

// Descarga segura
async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-cache", credentials: "omit" });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    clearTimeout(timer);
    return null;
  }
}

// Actualización de filtros
async function updateFilters() {
  try {
    const results = await Promise.allSettled(filterLists.map(url => fetchWithTimeout(url)));
    const textArray = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value)
      .filter(text => text.length > 100 && !text.trimStart().startsWith('<'));

    let domains = [...EMERGENCY_RULES.domains];
    let keywords = [...EMERGENCY_RULES.keywords];
    let wildcards = [];
    let cosmetics = [...EMERGENCY_RULES.cosmetics];
    let scriptlets = [...EMERGENCY_RULES.scriptlets];

    if (textArray.length > 0) {
      const parsed = parseLists(textArray);
      domains = [...new Set([...domains, ...parsed.domains])];
      keywords = [...new Set([...keywords, ...parsed.keywords])];
      wildcards = parsed.wildcards;
      cosmetics = [...new Set([...cosmetics, ...parsed.cosmetics])];
      for (const s of parsed.scriptlets) {
        if (!scriptlets.some(ex => ex.code === s.code)) scriptlets.push(s);
      }
    }

    await applyDNR(domains);

    keywordIndex = buildKeywordIndex(keywords);
    wildcardIndex = buildWildcardIndex(wildcards);
    hasKeywords = keywordIndex.size > 0;
    hasWildcards = wildcardIndex.size > 0 || shortWildcardRules.length > 0;

    cosmeticRules = cosmetics;
    scriptletRules = scriptlets;

    if (!scriptletRules.some(r => r.code === 'block-youtube-ads')) {
      scriptletRules.push({ domains: ['*'], code: 'block-youtube-ads' });
    }

    await browser.storage.local.set({
      keywords: keywords,
      wildcards: wildcards,
      cosmetics: cosmetics,
      scriptlets: scriptletRules,
      lastUpdated: Date.now()
    });

    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        try { await browser.tabs.sendMessage(tab.id, { type: 'applyCosmetics', rules: cosmeticRules }); } catch (e) {}
        try { await browser.tabs.sendMessage(tab.id, { type: 'applyScriptlets', rules: scriptletRules }); } catch (e) {}
      }
    }
  } catch (error) {
    console.error('Error actualizando filtros:', error);
    keywordIndex = buildKeywordIndex(EMERGENCY_RULES.keywords);
    cosmeticRules = EMERGENCY_RULES.cosmetics;
    scriptletRules = EMERGENCY_RULES.scriptlets;
    await applyDNR(EMERGENCY_RULES.domains);
  }
}

// Inicialización
async function init() {
  const data = await browser.storage.local.get(['keywords','wildcards','cosmetics','scriptlets']);
  if (data.keywords && data.wildcards) {
    keywordIndex = buildKeywordIndex(data.keywords);
    wildcardIndex = buildWildcardIndex(data.wildcards);
    hasKeywords = keywordIndex.size > 0;
    hasWildcards = wildcardIndex.size > 0 || shortWildcardRules.length > 0;
    cosmeticRules = data.cosmetics || EMERGENCY_RULES.cosmetics;
    scriptletRules = data.scriptlets || EMERGENCY_RULES.scriptlets;
  } else {
    await updateFilters();
  }

  if (!scriptletRules.some(r => r.code === 'block-youtube-ads')) {
    scriptletRules.push({ domains: ['*'], code: 'block-youtube-ads' });
  }

  browser.alarms.create('fetch_filters', { periodInMinutes: UPDATE_INTERVAL_MINUTES });
  browser.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'fetch_filters') updateFilters();
  });

  browser.webNavigation.onCommitted.addListener(async (details) => {
    if (details.frameId !== 0) return;
    if (cosmeticRules.length > 0) {
      try { await browser.tabs.sendMessage(details.tabId, { type: 'applyCosmetics', rules: cosmeticRules }); } catch (e) {}
    }
    if (scriptletRules.length > 0) {
      try { await browser.tabs.sendMessage(details.tabId, { type: 'applyScriptlets', rules: scriptletRules }); } catch (e) {}
    }
  });

  const BLOCKABLE_TYPES = new Set(["script", "image", "xmlhttprequest", "sub_frame"]);

  browser.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (details.type === "main_frame" || details.type === "stylesheet" ||
          details.type === "font" || details.type === "beacon" ||
          details.type === "ping" || details.type === "websocket" ||
          !BLOCKABLE_TYPES.has(details.type)) {
        return {};
      }

      const hostname = details.url.match(/:\/\/(?:www\.)?([^\/:?#]+)/)?.[1] || '';
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be') ||
          hostname.includes('googlevideo.com') || hostname.includes('ytimg.com') ||
          hostname.includes('ggpht.com') || hostname.includes('googleapis.com')) {
        return {};
      }

      const urlLower = details.url.toLowerCase();
      if (hasKeywords && isKeywordBlocked(urlLower)) {
        return { cancel: true };
      }
      if (hasWildcards && isWildcardMatch(urlLower)) {
        return { cancel: true };
      }

      return {};
    },
    { urls: ["<all_urls>"] },
    ["blocking"]
  );
}

browser.runtime.onInstalled.addListener(init);
browser.runtime.onStartup.addListener(init);
init();