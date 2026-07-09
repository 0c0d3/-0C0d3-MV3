# 0c0d3 Ad Blocker MV3

<img src="https://i.imgur.com/mAw5qh8.png" width="128" alt="0c0d3 icon">

> **Legal notice**  
> I am not the owner nor do I guarantee the third-party filter lists used in `build.js`.  
> Those lists are the property of their respective authors and are provided as-is.  
> This project's source code is released under the MIT License — see `build.js` header.

## Privacy & Data Collection

**0c0d3 does not collect, transmit, or store any personal data.**

- The extension runs entirely locally. No data is sent to any server by the extension code itself.
- Filter lists are downloaded from third-party maintainers at build time and at runtime (hourly auto-update + manual refresh). Only the list URLs are requested — no browsing data is transmitted.
- The third-party filter lists incorporated may contain domain names, URL patterns, and CSS selectors used solely for local ad and tracker blocking. The maintainers of those lists may collect anonymous usage statistics via their own CDNs; refer to each list's homepage for their privacy practices.
- Network blocking uses Firefox's `webRequest` API with host-based matching and URL pattern checks. No request bodies are read or exfiltrated.


## Third-party filter lists

| # | List | URL | Homepage |
|---|------|-----|----------|
| 1 | EasyList | https://easylist.to/easylist/easylist.txt | https://easylist.to/ |
| 2 | EasyPrivacy | https://easylist.to/easylist/easyprivacy.txt | https://easylist.to/ |
| 3 | AdGuard Base | https://filters.adtidy.org/extension/ublock/filters/2_optimized.txt | https://adguard.com/ |
| 4 | AdGuard Spyware | https://filters.adtidy.org/extension/ublock/filters/3_optimized.txt | https://adguard.com/ |
| 5 | AdGuard Social | https://filters.adtidy.org/extension/ublock/filters/4_optimized.txt | https://adguard.com/ |
| 6 | AdGuard Annoyances | https://filters.adtidy.org/extension/ublock/filters/14_optimized.txt | https://adguard.com/ |
| 7 | AdGuard Mobile | https://filters.adtidy.org/extension/ublock/filters/11_optimized.txt | https://adguard.com/ |
| 8 | AdGuard Track Param | https://filters.adtidy.org/extension/ublock/filters/17_optimized.txt | https://adguard.com/ |
| 9 | uBlock Filters | https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt | https://github.com/uBlockOrigin/uAssets |
| 10 | uBlock Badware | https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt | https://github.com/uBlockOrigin/uAssets |
| 11 | uBlock Privacy | https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt | https://github.com/uBlockOrigin/uAssets |
| 12 | uBlock Resource Abuse | https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resource-abuse.txt | https://github.com/uBlockOrigin/uAssets |
| 13 | uBlock Unbreak | https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt | https://github.com/uBlockOrigin/uAssets |
| 14 | uBlock Quick Fixes | https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt | https://github.com/uBlockOrigin/uAssets |
| 15 | uBlock Annoyances | https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances.txt | https://github.com/uBlockOrigin/uAssets |
| 16 | uBlock Cookie Notices | https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances-cookies.txt | https://github.com/uBlockOrigin/uAssets |
| 17 | uBlock Others | https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances-others.txt | https://github.com/uBlockOrigin/uAssets |
| 18 | Fanboy Annoyances | https://easylist.to/easylist/fanboy-annoyance.txt | https://fanboy.co.nz/ |
| 19 | Fanboy Social | https://easylist.to/easylist/fanboy-social.txt | https://fanboy.co.nz/ |
| 20 | Fanboy Cookie | https://secure.fanboy.co.nz/fanboy-cookie.txt | https://fanboy.co.nz/ |
| 21 | Yoyo.org | https://pgl.yoyo.org/adservers/serverlist.php?hostformat=nohtml | https://pgl.yoyo.org/ |
| 22 | ClearURLs | https://raw.githubusercontent.com/DandelionSprout/adfilt/master/ClearURLs%20for%20uBo/clear_urls_uboified.txt | https://github.com/DandelionSprout/adfilt |
| 23 | I Don't Care Cookies | https://www.i-dont-care-about-cookies.eu/abp/ | https://www.i-dont-care-about-cookies.eu/ |
| 24 | Anti Paywall | https://raw.githubusercontent.com/liamengland1/miscfilters/master/antipaywall.txt | https://github.com/liamengland1/miscfilters |
| 25 | HaGezi Pro | https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/pro.txt | https://github.com/hagezi/dns-blocklists |
| 26 | HaGezi Threat Intel | https://raw.githubusercontent.com/hagezi/dns-blocklists/main/adblock/tif.medium.txt | https://github.com/hagezi/dns-blocklists |
| 27 | OISD Small | https://small.oisd.nl/ | https://oisd.nl/ |
| 28 | D3Ward Hosts | https://raw.githubusercontent.com/d3ward/toolz/master/src/d3host.txt | https://github.com/d3ward/toolz |
| 29 | AdGuard Anti-Adblock | https://raw.githubusercontent.com/AdguardTeam/AdguardFilters/refs/heads/master/AnnoyancesFilter/Popups/sections/antiadblock.txt | https://github.com/AdguardTeam/AdguardFilters |
| 30 | Admiral Domains | https://raw.githubusercontent.com/LanikSJ/ubo-filters/main/filters/getadmiral-domains.txt | https://github.com/LanikSJ/ubo-filters |

## License

The source code in `build.js` and related scripts is MIT License.  
The third-party filter lists listed above are subject to their own licenses.
