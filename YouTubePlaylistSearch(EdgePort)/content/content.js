function isMainYouTubeHost() {
    return location.hostname === 'www.youtube.com'
}

if (isMainYouTubeHost()) {

const SUPPORT_EMAIL = 'contact.sudotronics@gmail.com';

const VIDEO_ITEM_SELECTOR = 'yt-lockup-view-model, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer';
const VIDEO_TITLE_SELECTOR = '#video-title, a#video-title, yt-formatted-string#video-title, .ytLockupMetadataViewModelTitle';

let diagnostics = null;

(function setupDiagnostics() {
    const videoSel = VIDEO_ITEM_SELECTOR;
    const observers = [];
    let pollTimer = null;
    let lastTotal = 0;
    const LOG_CAP = 200;
    const logCounts = { attr: 0, removed: 0, poll: 0 };
    const log = (bucket, ...args) => {
        if (logCounts[bucket] >= LOG_CAP) return;
        logCounts[bucket]++;
        console.log(...args);
    };

    function stop() {
        while (observers.length) {
            try { observers.pop().disconnect(); } catch (e) {}
        }
        if (pollTimer !== null) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }

    function start() {
        if (observers.length || !document.body) return;

        const track = (obs, options) => {
            obs.observe(document.body, options);
            observers.push(obs);
        };

        // Track data-searching changes
        track(new MutationObserver((muts) => {
            for (const m of muts) {
                if (m.attributeName === 'data-searching') {
                    log('attr', '[YPS-DIAG] body[data-searching] changed', document.body.getAttribute('data-searching'));
                }
            }
        }), { attributes: true, attributeFilter: ['data-searching'] });

        track(new MutationObserver((muts) => {
            for (const m of muts) {
                if (m.type !== 'attributes') continue;
                const t = m.target;
                if (!t.matches?.(videoSel)) continue;
                log('attr', '[YPS-DIAG] video attr', {
                    attr: m.attributeName,
                    display: t.style.display || '(none)',
                    class: t.className?.toString().slice(0, 80) || '',
                    dataMatch: t.getAttribute('data-match'),
                    title: (t.querySelector('#video-title, a#video-title, .ytLockupMetadataViewModelTitle')?.textContent || '').slice(0, 50),
                });
            }
        }), { attributes: true, subtree: true, attributeFilter: ['style', 'data-match', 'class'] });

        // Track video removals from DOM
        track(new MutationObserver((muts) => {
            for (const m of muts) {
                if (m.type !== 'childList') continue;
                for (const removed of m.removedNodes) {
                    if (removed.nodeType !== 1) continue;
                    if (removed.matches?.(videoSel)) {
                        log('removed', '[YPS-DIAG] video REMOVED from DOM', {
                            title: (removed.querySelector('#video-title, a#video-title, .ytLockupMetadataViewModelTitle')?.textContent || '').slice(0, 50),
                            parent: removed.parentElement?.tagName || '(detached)',
                        });
                    }
                }
            }
        }), { childList: true, subtree: true });

        console.log('[YPS-DIAG] diagnostic observers installed');

        // Catches pre-existing hidden state
        pollTimer = setInterval(() => {
            const videos = document.querySelectorAll(videoSel);
            if (videos.length === 0) return;
            const searchData = document.body.getAttribute('data-searching');
            let hiddenByStyle = 0, hiddenByCSSTop = 0, hiddenByCSSParent = 0, visible = 0, noMatchAttr = 0;
            videos.forEach(v => {
                const cs = getComputedStyle(v);
                const dm = v.getAttribute('data-match');
                const styleHidden = v.style.display === 'none';
                if (!dm) noMatchAttr++;
                if (styleHidden) hiddenByStyle++;
                else if (cs.display === 'none') hiddenByCSSTop++;
                else {
                    // Check if any ancestor hides it
                    let p = v.parentElement, ancestorHidden = false;
                    while (p && p !== document.body) {
                        if (getComputedStyle(p).display === 'none') {
                            ancestorHidden = true;
                            // Log first 3 unique hiding ancestors
                            if (hiddenByCSSParent < 3) {
                                console.log('[YPS-DIAG] hiding ancestor', {
                                    tag: p.tagName,
                                    id: p.id || '',
                                    class: p.className?.toString().slice(0, 80) || '',
                                    parentTag: p.parentElement?.tagName || '',
                                });
                            }
                            break;
                        }
                        p = p.parentElement;
                    }
                    if (ancestorHidden) hiddenByCSSParent++;
                    else visible++;
                }
            });
            if (videos.length !== lastTotal) {
                console.log('[YPS-DIAG] video count changed', { from: lastTotal, to: videos.length });
                lastTotal = videos.length;
            }
            log('poll', '[YPS-DIAG] video state', {
                total: videos.length,
                visible,
                hiddenByStyle,
                hiddenByCSSTop,
                hiddenByCSSParent,
                noMatchAttr,
                dataSearching: searchData,
                hasContainer: Boolean(document.querySelector('#playlist-search-container')),
                hasWrapper: Boolean(document.querySelector('#playlist-search-wrapper')),
                browseCount: document.querySelectorAll('ytd-browse').length,
                browseDetails: Array.from(document.querySelectorAll('ytd-browse')).map((b, i) => ({
                    i,
                    display: getComputedStyle(b).display,
                    subtype: b.getAttribute('page-subtype') || '',
                    videoCount: b.querySelectorAll(videoSel).length,
                })),
            });
        }, 2000);
    }

    diagnostics = { start, stop };
})();

function detectYouTubeTheme() {
    const html = document.documentElement;
    const body = document.body;
    
    // Check for dark attribute on html element
    if (html.hasAttribute('dark') || html.getAttribute('dark') === '' || html.getAttribute('dark') === 'true') {
        return 'dark';
    }
    
    // Check for dark theme class on body
    if (body.classList.contains('dark-theme') || body.classList.contains('dark')) {
        return 'dark';
    }
    
    // Check computed background color of YouTube's main content
    const ytdApp = document.querySelector('ytd-app');
    if (ytdApp) {
        const computedStyle = window.getComputedStyle(ytdApp);
        const bgColor = computedStyle.backgroundColor;
        // If background is dark (RGB values are low), it's dark theme
        const rgb = bgColor.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
            const r = parseInt(rgb[0]);
            const g = parseInt(rgb[1]);
            const b = parseInt(rgb[2]);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            if (brightness < 128) {
                return 'dark';
            }
        }
    }
    
    return 'light';
}

function applyThemeToExtension(theme) {
    const container = document.querySelector('#playlist-search-container');
    const modal = document.querySelector('#group-filters-modal');
    const channelDialog = document.querySelector('.channel-selection-dialog');
    const supportModal = document.querySelector('#support-modal');
    
    console.log('Applying theme:', theme);

    if (container) {
        container.setAttribute('data-theme', theme);
        console.log('Applied theme to container: #playlist-search-container');
    }
    if (modal) {
        modal.setAttribute('data-theme', theme);
        console.log('Applied theme to modal: #group-filters-modal');
    }
    if (channelDialog) {
        channelDialog.setAttribute('data-theme', theme);
        console.log('Applied theme to channel dialog: .channel-selection-dialog');
    }
    if (supportModal) {
        supportModal.setAttribute('data-theme', theme);
        console.log('Applied theme to support modal: #support-modal');
    }
}

let themeObserver = null;
function initThemeDetection() {
    // Initial theme detection
    const currentTheme = detectYouTubeTheme();
    applyThemeToExtension(currentTheme);

    if (themeObserver) return;

    // Watches for theme changes
    themeObserver = new MutationObserver((mutations) => {
        let themeChanged = false;

        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' &&
                (mutation.attributeName === 'dark' || mutation.attributeName === 'class')) {
                themeChanged = true;
            }
        });

        if (themeChanged) {
            const newTheme = detectYouTubeTheme();
            applyThemeToExtension(newTheme);
        }
    });

    // Observe changes to html and body elements
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['dark', 'class']
    });
    themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
    });
}

// Function to check if we're on a playlist page
function isPlaylistPage() {
    try {
        const url = new URL(window.location.href);
        const playlistId = url.searchParams.get('list');
        const isYouTube = url.hostname === 'www.youtube.com';
        const isPlaylistPath = url.pathname === '/playlist';

        return isYouTube && Boolean(playlistId) && isPlaylistPath;
    } catch (error) {
        return window.location.href.includes('/playlist?list=');
    }
}

function isPlaylistContentReady() {
    return Boolean(
        document.querySelector('ytd-browse[page-subtype="playlist"]') ||
        document.querySelector('ytd-playlist-header-renderer') ||
        document.querySelector('ytd-playlist-sidebar-primary-info-renderer') ||
        document.querySelector('ytd-playlist-video-list-renderer')
    );
}

const DEBUG_MOUNT = false;

function debugPlaylistState(label) {
    if (!DEBUG_MOUNT) return null;
    const wrapper = document.querySelector('#playlist-search-wrapper');
    const container = document.querySelector('#playlist-search-container');
    const wrapperRect = wrapper ? wrapper.getBoundingClientRect() : null;
    const containerRect = container ? container.getBoundingClientRect() : null;
    const state = {
        href: location.href,
        playlistPage: isPlaylistPage(),
        settled: isRouteSettled(),
        ready: isPlaylistContentReady(),
        hasWrapper: Boolean(wrapper),
        hasContainer: Boolean(container),
        wrapperConnected: Boolean(wrapper?.isConnected),
        wrapperParent: wrapper?.parentElement?.tagName || null,
        wrapperDisplay: wrapper ? getComputedStyle(wrapper).display : null,
        wrapperVisibility: wrapper ? getComputedStyle(wrapper).visibility : null,
        wrapperOpacity: wrapper ? getComputedStyle(wrapper).opacity : null,
        wrapperRect: wrapperRect ? {
            top: Math.round(wrapperRect.top),
            left: Math.round(wrapperRect.left),
            width: Math.round(wrapperRect.width),
            height: Math.round(wrapperRect.height),
        } : null,
        wrapperOffsetParent: wrapper?.offsetParent?.tagName || null,
        containerConnected: Boolean(container?.isConnected),
        containerParent: container?.parentElement?.tagName || null,
        containerDisplay: container ? getComputedStyle(container).display : null,
        containerVisibility: container ? getComputedStyle(container).visibility : null,
        containerOpacity: container ? getComputedStyle(container).opacity : null,
        containerRect: containerRect ? {
            top: Math.round(containerRect.top),
            left: Math.round(containerRect.left),
            width: Math.round(containerRect.width),
            height: Math.round(containerRect.height),
        } : null,
        containerOffsetParent: container?.offsetParent?.tagName || null,
        scrollY: window.scrollY,
        scrollX: window.scrollX,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        bodyChildCount: document.body ? document.body.children.length : null,
    };
    console.log(`[YPS] ${label}`, state);
    console.log(
        `[YPS] ${label} summary ` +
        `wrapper=${state.hasWrapper ? `${state.wrapperParent} ${state.wrapperRect ? `${state.wrapperRect.top},${state.wrapperRect.left} ${state.wrapperRect.width}x${state.wrapperRect.height}` : 'no-rect'}` : 'none'} ` +
        `container=${state.hasContainer ? `${state.containerParent} ${state.containerRect ? `${state.containerRect.top},${state.containerRect.left} ${state.containerRect.width}x${state.containerRect.height}` : 'no-rect'}` : 'none'} ` +
        `display=${state.wrapperDisplay || 'n/a'}/${state.containerDisplay || 'n/a'} ` +
        `vis=${state.wrapperVisibility || 'n/a'}/${state.containerVisibility || 'n/a'} ` +
        `opacity=${state.wrapperOpacity || 'n/a'}/${state.containerOpacity || 'n/a'} ` +
        `offsetParent=${state.wrapperOffsetParent || 'n/a'}/${state.containerOffsetParent || 'n/a'} ` +
        `scroll=${state.scrollX},${state.scrollY} viewport=${state.viewportWidth}x${state.viewportHeight}`
    );
    return state;
}

function getActiveBrowse() {
    const browses = document.querySelectorAll('ytd-browse');
    for (const browse of browses) {
        if (browse.hasAttribute('hidden')) continue;
        if (browse.getAttribute('aria-hidden') === 'true') continue;
        if (getComputedStyle(browse).display === 'none') continue;
        return browse;
    }
    return null;
}

function getPlaylistRows() {
    const scope = getActiveBrowse() || document;
    return scope.querySelectorAll(VIDEO_ITEM_SELECTOR);
}

function getVideoItems() {
    const allItems = getPlaylistRows();
    const candidates = Array.from(allItems).filter(el => {
        if (el.getAttribute('style-type') === 'playlist-video-renderer-style-recommended-video') return false;
        if (!el.querySelector(VIDEO_TITLE_SELECTOR)) return false;
        return true;
    });

    const byId = new Map();
    const withoutId = [];
    const duplicates = [];
    for (const el of candidates) {
        const videoId = getVideoId(el);
        if (!videoId) {
            withoutId.push(el);
            continue;
        }
        const existing = byId.get(videoId);
        if (existing === undefined) {
            byId.set(videoId, el);
        } else {
            duplicates.push([videoId, existing, el]);
        }
    }
    if (duplicates.length) {
        for (const [videoId, existing, el] of duplicates) {
            if (pickPopulatedVideo(existing, el) !== existing) {
                byId.set(videoId, el);
            }
        }
    }

    return Array.from(byId.values()).concat(withoutId);
}

function pickPopulatedVideo(a, b) {
    const aLen = (a.textContent || '').trim().length;
    const bLen = (b.textContent || '').trim().length;
    if (aLen !== bLen) return aLen > bLen ? a : b;
    return a.isConnected ? a : b;
}

function ownsVideoItems(node) {
    for (const child of node.children) {
        if (child.matches?.(VIDEO_ITEM_SELECTOR)) return true;
    }
    return false;
}

function getVideoListContainers() {
    const containers = new Set();
    getPlaylistRows().forEach(item => {
        if (item.parentElement) containers.add(item.parentElement);
    });
    return Array.from(containers);
}

function findPrimaryListAnchor() {
    const rows = Array.from(getPlaylistRows())
        .filter(el => el.querySelector(VIDEO_TITLE_SELECTOR) &&
            el.getAttribute('style-type') !== 'playlist-video-renderer-style-recommended-video');
    if (rows.length === 0) return null;

    const inListRenderer = rows.find(el => el.closest('ytd-playlist-video-list-renderer'));
    if (inListRenderer) return inListRenderer;

    const containers = new Map();
    for (const row of rows) {
        const container = row.parentElement;
        if (container) containers.set(container, (containers.get(container) || 0) + 1);
    }
    if (containers.size === 0) return rows[0];

    let best = null;
    let bestInQueuePanel = false;
    let bestCount = 0;
    for (const [container, count] of containers) {
        const inQueuePanel = Boolean(container.closest('ytd-playlist-panel-renderer'));
        const better = best === null ||
            (inQueuePanel === bestInQueuePanel ? count > bestCount : !inQueuePanel);
        if (better) {
            best = container;
            bestInQueuePanel = inQueuePanel;
            bestCount = count;
        }
    }

    return rows.find(el => el.parentElement === best) || rows[0];
}

function findPanelMountPoint(firstRealVideo) {
    let listContainer = firstRealVideo;
    while (listContainer.parentElement && !ownsVideoItems(listContainer)) {
        listContainer = listContainer.parentElement;
    }
    if (!listContainer.parentElement) return null;

    let listHost = listContainer;
    const parent = listContainer.parentElement;
    if (parent && !ownsVideoItems(parent)) listHost = parent;

    if (listHost.matches?.('ytd-page-manager, ytd-browse, ytd-two-column-browse-results-renderer')) {
        const visibleBrowse = document.querySelector('ytd-browse[page-subtype="playlist"]');
        const column = visibleBrowse?.querySelector('#primary') || listHost.querySelector('#primary');
        if (column && !ownsVideoItems(column)) {
            const header = Array.from(column.children).find(child =>
                child.matches('ytd-playlist-header-renderer, ytd-playlist-sidebar-primary-info-renderer')
            );
            return { parent: column, before: header || column.firstElementChild };
        }
    }

    return { parent: listHost.parentElement, before: listHost };
}

function isGenuineRepeat(first, second) {
    const a = first.getAttribute('index') ?? first.getAttribute('data-index');
    const b = second.getAttribute('index') ?? second.getAttribute('data-index');
    if (a === null || b === null) return false;
    return a !== b;
}

function removeDuplicateVideoNodes() {
    for (const container of getVideoListContainers()) {
        const items = Array.from(container.children)
            .filter(child => child.matches?.(VIDEO_ITEM_SELECTOR));
        if (items.length < 2) continue;

        const last = items[items.length - 1];
        const lastId = getVideoId(last);
        if (!lastId) continue;

        let earlier = null;
        for (let i = items.length - 2; i >= 0; i--) {
            if (getVideoId(items[i]) === lastId) {
                earlier = items[i];
                break;
            }
        }
        if (!earlier) continue;
        if (isGenuineRepeat(earlier, last)) continue;

        last.remove();
    }
}

function getTitleText(video) {
    const titleEl = video.querySelector(VIDEO_TITLE_SELECTOR);
    return (titleEl?.textContent || '').trim().toLowerCase();
}

function getChannelNameText(video) {
    const channelEl = video.querySelector('.ytAttributedStringLink[href^="/@"], #channel-name a, #channel-name yt-formatted-string, ytd-channel-name a');
    return (channelEl?.textContent || '').trim();
}

const videoMetaCache = new WeakMap();

function extractYearFromMetadata(text, now = new Date()) {
    if (!text) return '';

    const rel = text.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s+ago/i);
    if (rel) {
        const amount = parseInt(rel[1], 10);
        const unit = rel[2].toLowerCase();
        if (unit === 'year') return String(now.getFullYear() - amount);

        const date = new Date(now.getTime());
        switch (unit) {
            case 'second':
            case 'minute':
            case 'hour':
            case 'day':
                date.setDate(date.getDate() - amount);
                break;
            case 'week':
                date.setDate(date.getDate() - 7 * amount);
                break;
            case 'month':
                date.setMonth(date.getMonth() - amount);
                break;
        }
        return String(date.getFullYear());
    }

    const abs = text.match(/\b(\d{4})\b/);
    if (abs) {
        const year = parseInt(abs[1], 10);
        if (year >= 1990 && year <= now.getFullYear()) return String(year);
    }

    return '';
}

function extractYearFromDateSource(el, now = new Date()) {
    if (!el) return '';
    const sources = [
        el.textContent,
        el.getAttribute?.('title'),
        el.getAttribute?.('aria-label'),
        el.getAttribute?.('datetime'),
        el.querySelector?.('time')?.getAttribute?.('datetime'),
        el.querySelector?.('time')?.textContent,
    ];
    for (const source of sources) {
        if (!source) continue;
        const year = extractYearFromMetadata(source, now);
        if (year) return year;
    }
    return '';
}

function computeVideoMeta(video) {
    const titleLower = getTitleText(video);
    const channelLower = getChannelNameText(video).toLowerCase();
    
    let viewsCount = 0;
    let viewsKnown = false;
    const metadataTexts = Array.from(video.querySelectorAll(
        '.ytContentMetadataViewModelMetadataText[role="text"], .ytContentMetadataViewModelMetadataText, #metadata-line .inline-metadata-item, #metadata-line span, .metadata-line .inline-metadata-item, .ytLockupMetadataViewModelMetadataText'
    ));

    for (const el of metadataTexts) {
        const sources = [el.textContent, el.getAttribute?.('title'), el.getAttribute?.('aria-label')];
        for (const source of sources) {
            if (!source || !VIEW_KEYWORD_RE.test(source)) continue;
            const parsed = parseViewCount(source);
            if (parsed !== null) {
                viewsCount = parsed;
                viewsKnown = true;
                break;
            }
        }
        if (viewsKnown) break;
    }

    let yearStr = '';
    for (const el of metadataTexts) {
        yearStr = extractYearFromDateSource(el);
        if (yearStr) break;
    }
    if (!yearStr) {
        yearStr = extractYearFromDateSource(video);
    }

    // Duration extraction
    let durationSec = 0;
    const durationEl = Array.from(video.querySelectorAll(
        '.ytThumbnailBadgeViewModelHost .ytBadgeShapeText, ytd-thumbnail-overlay-time-status-renderer .ytBadgeShapeText, ytd-thumbnail-overlay-time-status-renderer #text, #overlays ytd-thumbnail-overlay-time-status-renderer span'
    )).find(el => /\d{1,2}:\d{2}(?::\d{2})?/.test((el.textContent || '').trim()));
    if (durationEl) {
        const durationText = durationEl.textContent.trim();
        const match = durationText.match(/\d{1,2}:\d{2}(?::\d{2})?/);
        if (match) {
            durationSec = parseDuration(match[0]);
        }
    }
    
    return { titleLower, channelLower, viewsCount, viewsKnown, yearStr, durationSec };
}

function getVideoMeta(video) {
    const current = computeVideoMeta(video);
    const cached = videoMetaCache.get(video);
    if (!cached) {
        videoMetaCache.set(video, current);
        return current;
    }
    const updated = {
        titleLower: current.titleLower || cached.titleLower,
        channelLower: current.channelLower || cached.channelLower,
        viewsCount: current.viewsCount || cached.viewsCount,
        viewsKnown: current.viewsKnown || cached.viewsKnown,
        yearStr: current.yearStr || cached.yearStr,
        durationSec: current.durationSec || cached.durationSec,
    };
    if (updated.titleLower !== cached.titleLower ||
        updated.channelLower !== cached.channelLower ||
        updated.viewsCount !== cached.viewsCount ||
        updated.viewsKnown !== cached.viewsKnown ||
        updated.yearStr !== cached.yearStr ||
        updated.durationSec !== cached.durationSec) {
        videoMetaCache.set(video, updated);
    }
    return updated;
}

// Function to create search interface element
function createSearchElement() {
    const searchContainer = document.createElement('div');
    searchContainer.id = 'playlist-search-container';
    
    // Load saved preference before creating the interface
    isAutoScrollEnabled = loadAutoScrollPreference();
    
    searchContainer.innerHTML = `
        <div class="search-box">
            <input type="text" id="playlist-search-input" placeholder="Search in playlist...">
            <select id="channel-filter">
                <option value="">All channels</option>
            </select>
            <select id="year-filter">
                <option value="">All years</option>
            </select>
            <select id="views-filter">
                <option value="">All views</option>
                <option value="1000000000-up">1B+ views</option>
                <option value="100000000-1000000000">100M-1B views</option>
                <option value="10000000-100000000">10M-100M views</option>
                <option value="1000000-10000000">1M-10M views</option>
                <option value="100000-1000000">100K-1M views</option>
                <option value="10000-100000">10K-100K views</option>
                <option value="1000-10000">1K-10K views</option>
                <option value="0-1000">Under 1K views</option>
            </select>
            <select id="duration-filter">
                <option value="">All durations</option>
                <option value="0-60">Under 1 minute</option>
                <option value="60-300">1-5 minutes</option>
                <option value="300-600">5-10 minutes</option>
                <option value="600-1200">10-20 minutes</option>
                <option value="1200-1800">20-30 minutes</option>
                <option value="1800-3600">30-60 minutes</option>
                <option value="3600-up">Over 1 hour</option>
            </select>
            <button id="group-filters-button" class="filter-button">Group Filters</button>
            <button id="auto-scroll-toggle" class="${isAutoScrollEnabled ? 'enabled' : ''}">Auto-Scroll: ${isAutoScrollEnabled ? 'On' : 'Off'}</button>
            <button id="clear-search-button">Clear</button>
            <button id="support-button" class="filter-button">Support</button>
            <a id="play-filtered-button" href="#" style="display: none;">Play Filtered</a>
        </div>
        <div class="search-options">
            <label><input type="checkbox" id="search-title" checked> Search by title</label>
            <label><input type="checkbox" id="search-channel" checked> Search by channel</label>
        </div>
        <div id="search-results-count"></div>
        
        <!-- Group Filters Modal -->
        <div id="group-filters-modal" class="modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Group Filters</h2>
                    <button class="close-button">&times;</button>
                </div>
                <div class="modal-tabs">
                    <button class="tab-button active" data-tab="keywords">Keywords</button>
                    <button class="tab-button" data-tab="channels">Channels</button>
                </div>
                <div class="tab-content" id="keywords-tab">
                    <div class="group-list">
                        <!-- Keyword groups will be populated here -->
                    </div>
                    <button class="add-group-button">Add Keyword Group</button>
                </div>
                <div class="tab-content" id="channels-tab" style="display: none;">
                    <div class="group-list">
                        <!-- Channel groups will be populated here -->
                    </div>
                    <button class="add-group-button">Add Channel Group</button>
                </div>
            </div>
        </div>

        <!-- Support Modal -->
        <div id="support-modal" class="modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header support-modal-header">
                    <h2>Support</h2>
                    <div class="support-modal-meta">
                        <span class="support-version">v1.1.0</span>
                        <button id="support-close-button" class="close-button">&times;</button>
                    </div>
                </div>
                <div class="support-body">
                    <div class="support-section">
                        <h3>Report an Issue</h3>
                        <p>Fill in the form below - your email app will open with your message ready to send.</p>
                        <form id="support-issue-form">
                            <label for="support-subject">Subject</label>
                            <input type="text" id="support-subject" required placeholder="Short summary of the problem">
                            <label for="support-message">Message</label>
                            <textarea id="support-message" rows="5" required placeholder="Describe the issue or feature request... send a image/video of the issue through your email app"></textarea>
                            <button type="submit" id="support-submit-button">Send via Email</button>
                        </form>
                        <div class="support-divider">or</div>
                        <a id="support-github-link" href="https://github.com/Sudachi-E/YouTube-Playlist-Searcher/issues" target="_blank" rel="noopener noreferrer">
                            <svg class="support-github-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                            Report on GitHub
                        </a>
                    </div>
                    <div class="support-section">
                        <h3>Support Development</h3>
                        <p>Enjoying the extension? Consider buying me a coffee!</p>
                        <a id="support-donate-link" href="https://ko-fi.com/SudoTronics" target="_blank" rel="noopener noreferrer">&#9749; Buy me a coffee</a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Apply current theme to the container
    const currentTheme = detectYouTubeTheme();
    searchContainer.setAttribute('data-theme', currentTheme);
    
    return searchContainer;
}

// Function to update play filtered button URL
function updatePlayFilteredUrl() {
    const playFilteredButton = document.querySelector('#play-filtered-button');
    if (!playFilteredButton) return;

    const visibleVideos = Array.from(getVideoItems())
        .filter(video => video.getAttribute('data-match') !== 'false');

    if (visibleVideos.length > 0) {
        // Extract video IDs from visible videos
        const videoIds = visibleVideos
            .map(video => getVideoId(video))
            .filter(id => id !== null);

        if (videoIds.length > 0) {
            // Create a temporary playlist using video IDs
            const playUrl = `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(',')}`;
            playFilteredButton.href = playUrl;
        }
    }
}

// Helper function to get video ID from a playlist item
function getVideoId(videoElement) {
    const linkEl = videoElement.querySelector('a[href*="watch"]');
    const href = linkEl?.href || '';
    const match = href.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
}

// Function to update channel filter dropdown
function updateChannelFilter() {
    const channelFilter = document.querySelector('#channel-filter');
    if (!channelFilter) return;

    // Store current selection
    const currentSelection = channelFilter.value;

    // Get all videos
    const videos = getVideoItems();
    
    // Get unique channel names
    const channels = new Set();
    videos.forEach(video => {
        const channelName = getChannelNameText(video);
        if (channelName) channels.add(channelName);
    });

    // Sort channels alphabetically
    const sortedChannels = Array.from(channels).sort();

    // Same selection-preservation rule as updateYearFilter()
    if (currentSelection && !sortedChannels.includes(currentSelection)) {
        sortedChannels.push(currentSelection);
        sortedChannels.sort();
    }

    // Clear existing options except the first one
    while (channelFilter.options.length > 1) {
        channelFilter.remove(1);
    }

    // Add channel options
    sortedChannels.forEach(channel => {
        const option = document.createElement('option');
        option.value = channel;
        option.textContent = channel;
        channelFilter.appendChild(option);
    });

    // Restore previous selection if it still exists
    if (currentSelection && Array.from(channelFilter.options).some(opt => opt.value === currentSelection)) {
        channelFilter.value = currentSelection;
    }
}

// Function to update year filter dropdown
let lastYearDiag = '';
function updateYearFilter() {
    const yearFilter = document.querySelector('#year-filter');
    if (!yearFilter) return;

    // Store current selection
    const currentSelection = yearFilter.value;

    // Get all videos
    const videos = getVideoItems();

    // Get unique years using the same metadata extraction as videoMatchesSearch
    const years = new Set();
    let withYear = 0;
    const samples = [];
    videos.forEach(video => {
        const meta = getVideoMeta(video);
        if (meta.yearStr) {
            years.add(meta.yearStr);
            withYear++;
        } else if (samples.length < 6) {
            const raw = Array.from(video.querySelectorAll(
                '.ytContentMetadataViewModelMetadataText, #metadata-line .inline-metadata-item, #metadata-line span, .ytLockupMetadataViewModelMetadataText'
            )).map(el => (el.textContent || '').trim()).filter(Boolean);
            samples.push({ id: getVideoId(video), raw });
        }
    });

    const noViewSamples = [];
    let withViews = 0;
    for (const video of videos) {
        const meta = getVideoMeta(video);
        if (meta.viewsKnown) { withViews++; continue; }
        if (noViewSamples.length < 6) {
            const raw = Array.from(video.querySelectorAll(
                '.ytContentMetadataViewModelMetadataText, #metadata-line .inline-metadata-item, #metadata-line span, .ytLockupMetadataViewModelMetadataText'
            )).map(el => (el.textContent || '').trim()).filter(Boolean);
            noViewSamples.push({ id: getVideoId(video), raw });
        }
    }
    const diag = JSON.stringify({
        items: videos.length,
        withYear,
        years: Array.from(years).sort((a, b) => b - a),
        noDateSamples: samples,
        withViews,
        noViewSamples,
    });
    if (diag !== lastYearDiag) {
        lastYearDiag = diag;
        console.log('[YPS-DIAG] yearFilter/views', diag);
    }

    // Sort years in descending order (newest first)
    const sortedYears = Array.from(years).sort((a, b) => b - a);

    if (currentSelection && !sortedYears.includes(currentSelection)) {
        sortedYears.push(currentSelection);
        sortedYears.sort((a, b) => b - a);
    }

    // Clear existing options except the first one
    while (yearFilter.options.length > 1) {
        yearFilter.remove(1);
    }

    // Add year options
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });

    // Restore previous selection
    if (currentSelection && Array.from(yearFilter.options).some(opt => opt.value === currentSelection)) {
        yearFilter.value = currentSelection;
    }
}

const VIEW_KEYWORD_RE = /\b(views?|aufrufe|visualizaciones|vues|visualizzazioni|visualizações)\b/i;

function parseLocalizedNumber(raw) {
    const s = String(raw).replace(/[\s\u00a0\u202f]/g, '');
    if (!s || !/\d/.test(s)) return null;
    if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return parseInt(s.replace(/[.,]/g, ''), 10);
    if (/^\d+[.,]\d{1,2}$/.test(s)) return parseFloat(s.replace(',', '.'));
    const n = parseFloat(s.replace(/[.,]/g, ''));
    return isFinite(n) ? n : null;
}

function parseViewCount(viewText) {
    if (!viewText) return null;
    const text = String(viewText)
        .toLowerCase()
        .replace(/[\u00a0\u202f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const kw = VIEW_KEYWORD_RE.exec(text);
    let segment;
    if (kw) {
        const before = text.slice(0, kw.index);
        if (/\d/.test(before)) {
            segment = before;
            // Drop any relative-date clause that precedes the count.
            const ago = segment.lastIndexOf(' ago');
            if (ago !== -1) segment = segment.slice(ago + 4);
        } else {
            // Count stated after the keyword ("views 1.2M").
            segment = text.slice(kw.index + kw[0].length);
        }
    } else {
        segment = text.split(' ago')[0];
    }

    const m = segment.match(/(\d[\d.,]*)\s*([kmb])?/i);
    if (!m) return null;

    const value = parseLocalizedNumber(m[1]);
    if (value === null) return null;

    const suffix = (m[2] || '').toLowerCase();
    if (suffix === 'k') return value * 1e3;
    if (suffix === 'm') return value * 1e6;
    if (suffix === 'b') return value * 1e9;

    // Spelled-out magnitudes used by some locales.
    if (/\b(thousand|tsd)\b/.test(segment)) return value * 1e3;
    if (/\b(million|mio|mill[oó]n)\b/.test(segment)) return value * 1e6;
    if (/\b(billion|mdrd|milliard)\b/.test(segment)) return value * 1e9;

    return value;
}

// Helper function to parse duration
function parseDuration(durationText) {
    if (!durationText) return 0;
    
    // Convert duration text to seconds
    const parts = durationText.split(':').map(part => parseInt(part));
    if (parts.length === 3) {
        // Hours:Minutes:Seconds format
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        // Minutes:Seconds format
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
        // Seconds only
        return parts[0];
    }
    return 0;
}

// Function to format duration for display
function formatDuration(seconds) {
    if (seconds >= 3600) {
        return `${Math.floor(seconds / 3600)} hour${seconds >= 7200 ? 's' : ''}`;
    } else if (seconds >= 60) {
        return `${Math.floor(seconds / 60)} minute${seconds >= 120 ? 's' : ''}`;
    } else {
        return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
}

let filterGroupsCache = null;

function loadFilterGroups() {
    if (filterGroupsCache) return filterGroupsCache;
    try {
        const raw = localStorage.getItem('youtubePlaylistFilterGroups');
        const parsed = raw ? JSON.parse(raw) : null;
        filterGroupsCache = {
            keywords: Array.isArray(parsed?.keywords) ? parsed.keywords : [],
            channels: Array.isArray(parsed?.channels) ? parsed.channels : [],
        };
    } catch (error) {
        console.error('Error loading filter groups:', error);
        filterGroupsCache = { keywords: [], channels: [] };
    }
    return filterGroupsCache;
}

// Function to save filter groups to storage
function saveFilterGroups(groups) {
    const normalized = {
        keywords: Array.isArray(groups?.keywords) ? groups.keywords : [],
        channels: Array.isArray(groups?.channels) ? groups.channels : [],
    };
    try {
        localStorage.setItem('youtubePlaylistFilterGroups', JSON.stringify(normalized));
    } catch (error) {
        console.error('Error saving filter groups:', error);
    }
    // Keep the cache in step with what was written
    filterGroupsCache = normalized;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Function to create a new filter group
function createFilterGroup(type, name, items) {
    const groups = loadFilterGroups();
    if (!Array.isArray(groups[type])) return;
    groups[type].push({
        id: Date.now(),
        name,
        items,
        active: false
    });
    saveFilterGroups(groups);
    renderFilterGroups();
}

// Function to delete a filter group
function deleteFilterGroup(type, id) {
    const groups = loadFilterGroups();
    if (!Array.isArray(groups[type])) return;
    groups[type] = groups[type].filter(group => group.id !== id);
    saveFilterGroups(groups);
    renderFilterGroups();
    handleSearch(); // Refresh search results
}

// Function to toggle a filter group
function toggleFilterGroup(type, id) {
    const groups = loadFilterGroups();
    if (!Array.isArray(groups[type])) return;
    const group = groups[type].find(g => g.id === id);
    if (group) {
        group.active = !group.active;
        saveFilterGroups(groups);
        renderFilterGroups();
        handleSearch(); // Refresh search results
        
        // Trigger auto-scroll if enabled and filters are active
        const autoScrollToggle = document.querySelector('#auto-scroll-toggle');
        if (isAutoScrollEnabled && !autoScrollToggle?.disabled && hasActiveFilters()) {
            autoScrollAndSearch();
        }
    }
}

// Function to create a channel selection dialog
function createChannelSelectionDialog(selectedChannels = []) {
    const dialog = document.createElement('div');
    dialog.className = 'channel-selection-dialog';
    
    // Get all unique channels from the playlist
    const channels = new Set();
    getVideoItems().forEach(video => {
        const channelName = getChannelNameText(video);
        if (channelName) channels.add(channelName);
    });
    
    const sortedChannels = Array.from(channels).sort();
    
    dialog.innerHTML = `
        <div class="channel-selection-content">
            <div class="channel-selection-header">
                <h3>Select Channels</h3>
                <button class="close-dialog-button">&times;</button>
            </div>
            <div class="channel-selection-search">
                <input type="text" placeholder="Search channels..." class="channel-search-input">
            </div>
            <div class="channel-list">
                    ${sortedChannels.map(channel => `
                    <label class="channel-option">
                        <input type="checkbox" value="${escapeHtml(channel)}" 
                            ${selectedChannels.includes(channel) ? 'checked' : ''}>
                        <span>${escapeHtml(channel)}</span>
                    </label>
                `).join('')}
            </div>
            <div class="channel-selection-actions">
                <button class="confirm-selection-button">Confirm</button>
                <button class="cancel-selection-button">Cancel</button>
            </div>
        </div>
    `;
    
    // Apply current theme to the dialog
    const currentTheme = detectYouTubeTheme();
    dialog.setAttribute('data-theme', currentTheme);
    console.log('Applied theme to channel selection dialog:', currentTheme); // Debug log
    
    document.body.appendChild(dialog);
    
    // Add search functionality
    const searchInput = dialog.querySelector('.channel-search-input');
    const channelOptions = dialog.querySelectorAll('.channel-option');
    
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        channelOptions.forEach(option => {
            const channelName = option.querySelector('span').textContent.toLowerCase();
            option.style.display = channelName.includes(searchTerm) ? '' : 'none';
        });
    });
    
    return new Promise((resolve, reject) => {
        const closeDialog = () => {
            document.body.removeChild(dialog);
            reject();
        };
        
        dialog.querySelector('.close-dialog-button').addEventListener('click', closeDialog);
        dialog.querySelector('.cancel-selection-button').addEventListener('click', closeDialog);
        
        dialog.querySelector('.confirm-selection-button').addEventListener('click', () => {
            const selectedChannels = Array.from(dialog.querySelectorAll('input[type="checkbox"]:checked'))
                .map(checkbox => checkbox.value);
            document.body.removeChild(dialog);
            resolve(selectedChannels);
        });
        
        // Close if clicking outside the content area (only if press began on backdrop)
        let backdropPress = false;
        dialog.addEventListener('mousedown', (e) => {
            backdropPress = (e.target === dialog);
        });
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog && backdropPress) {
                closeDialog();
            }
        });
    });
}

// Function to show the add group dialog
async function showAddGroupDialog(type) {
    const name = prompt('Enter group name:');
    if (!name) return;
    
    let items = [];
    if (type === 'channels') {
        try {
            items = await createChannelSelectionDialog();
            if (!items || items.length === 0) return;
        } catch {
            return; // Dialog was cancelled
        }
    } else {
        const itemsStr = prompt('Enter items (comma-separated):');
        if (!itemsStr) return;
        items = itemsStr.split(',').map(item => item.trim()).filter(item => item);
        if (items.length === 0) return;
    }
    
    createFilterGroup(type, name, items);
}

// Function to edit a filter group
async function editFilterGroup(type, id) {
    const groups = loadFilterGroups();
    if (!Array.isArray(groups[type])) return;
    const group = groups[type].find(g => g.id === id);
    if (!group) return;
    const currentItems = Array.isArray(group.items) ? group.items : [];
    
    // Prompt for new name, pre-filled with current name
    const newName = prompt('Enter new group name:', group.name);
    if (!newName) return;
    
    let newItems = [];
    if (type === 'channels') {
        try {
        newItems = await createChannelSelectionDialog(currentItems);
        if (!newItems || newItems.length === 0) return;
        } catch {
            return; // Dialog was cancelled
        }
    } else {
        const newItemsStr = prompt('Enter items (comma-separated):', currentItems.join(', '));
        if (!newItemsStr) return;
        newItems = newItemsStr.split(',').map(item => item.trim()).filter(item => item);
        if (newItems.length === 0) return;
    }
    
    // Update the group
    group.name = newName;
    group.items = newItems;
    saveFilterGroups(groups);
    renderFilterGroups();
    handleSearch(); // Refresh search results
}

// Function to render filter groups in the modal
function renderFilterGroups() {
    const groups = loadFilterGroups();
    const keywordsList = document.querySelector('#keywords-tab .group-list');
    const channelsList = document.querySelector('#channels-tab .group-list');

    if (keywordsList) {
        keywordsList.innerHTML = groups.keywords.map(group => `
            <div class="filter-group" data-group-id="${escapeHtml(group.id)}" data-group-type="keywords">
                <div class="filter-group-header">
                    <span class="filter-group-name">${escapeHtml(group.name)}</span>
                    <div class="filter-group-actions">
                        <button class="toggle-group-button ${group.active ? 'active' : ''}">
                            ${group.active ? 'Active' : 'Inactive'}
                        </button>
                        <button class="edit-group-button">Edit</button>
                        <button class="delete-group-button">Delete</button>
                    </div>
                </div>
                <div class="filter-group-items">
                    ${(group.items || []).map(item => `<span class="filter-item">${escapeHtml(item)}</span>`).join('')}
                </div>
            </div>
        `).join('');

        // Attach event listeners to keyword group buttons
        keywordsList.querySelectorAll('.filter-group').forEach(groupElement => {
            const groupId = parseInt(groupElement.dataset.groupId);
            const toggleButton = groupElement.querySelector('.toggle-group-button');
            const editButton = groupElement.querySelector('.edit-group-button');
            const deleteButton = groupElement.querySelector('.delete-group-button');

            toggleButton.addEventListener('click', () => {
                toggleFilterGroup('keywords', groupId);
            });

            editButton.addEventListener('click', () => {
                editFilterGroup('keywords', groupId);
            });

            deleteButton.addEventListener('click', () => {
                deleteFilterGroup('keywords', groupId);
            });
        });
    }

    if (channelsList) {
        channelsList.innerHTML = groups.channels.map(group => `
            <div class="filter-group" data-group-id="${escapeHtml(group.id)}" data-group-type="channels">
                <div class="filter-group-header">
                    <span class="filter-group-name">${escapeHtml(group.name)}</span>
                    <div class="filter-group-actions">
                        <button class="toggle-group-button ${group.active ? 'active' : ''}">
                            ${group.active ? 'Active' : 'Inactive'}
                        </button>
                        <button class="edit-group-button">Edit</button>
                        <button class="delete-group-button">Delete</button>
                    </div>
                </div>
                <div class="filter-group-items">
                    ${(group.items || []).map(item => `<span class="filter-item">${escapeHtml(item)}</span>`).join('')}
                </div>
            </div>
        `).join('');

        // Attach event listeners to channel group buttons
        channelsList.querySelectorAll('.filter-group').forEach(groupElement => {
            const groupId = parseInt(groupElement.dataset.groupId);
            const toggleButton = groupElement.querySelector('.toggle-group-button');
            const editButton = groupElement.querySelector('.edit-group-button');
            const deleteButton = groupElement.querySelector('.delete-group-button');

            toggleButton.addEventListener('click', () => {
                toggleFilterGroup('channels', groupId);
            });

            editButton.addEventListener('click', () => {
                editFilterGroup('channels', groupId);
            });

            deleteButton.addEventListener('click', () => {
                deleteFilterGroup('channels', groupId);
            });
        });
    }
}

// Function to show the group filters modal
function showGroupFiltersModal() {
    const modal = document.querySelector('#group-filters-modal');
    if (modal) {
        modal.style.display = 'block';
        
        // Apply current theme to modal when showing it
        const currentTheme = detectYouTubeTheme();
        modal.setAttribute('data-theme', currentTheme);
        console.log('Applied theme to modal on show:', currentTheme);
        
        // Ensure the first tab is visible and active by default
        const firstTab = document.querySelector('.tab-button');
        const firstTabContent = document.querySelector('.tab-content');
        if (firstTab && firstTabContent) {
            firstTab.classList.add('active');
            firstTabContent.style.display = 'block';
        }
        // Render the groups
        renderFilterGroups();
    }
}

// Function to hide the group filters modal
function hideGroupFiltersModal() {
    const modal = document.querySelector('#group-filters-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Function to show the support modal
function showSupportModal() {
    const modal = document.querySelector('#support-modal');
    if (modal) {
        modal.style.display = 'block';
        const currentTheme = detectYouTubeTheme();
        modal.setAttribute('data-theme', currentTheme);
    }
}

// Function to hide the support modal
function hideSupportModal() {
    const modal = document.querySelector('#support-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Function to handle support form submission
function submitSupportIssue(e) {
    e.preventDefault();
    const subject = document.querySelector('#support-subject').value.trim();
    const message = document.querySelector('#support-message').value.trim();
    if (!subject || !message) return;
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[YouTube Playlist Search] ${subject}`)}&body=${encodeURIComponent(message)}`;
    window.location.href = mailto;
}

// Function to add event listeners for the support modal
function addSupportEventListeners() {
    const supportButton = document.querySelector('#support-button');
    const closeButton = document.querySelector('#support-close-button');
    const modal = document.querySelector('#support-modal');
    const form = document.querySelector('#support-issue-form');

    if (supportButton) {
        supportButton.addEventListener('click', showSupportModal);
    }

    if (closeButton) {
        closeButton.addEventListener('click', hideSupportModal);
    }

    if (modal) {
        // Only close if the press began on the backdrop — otherwise a drag-selection
        // that leaves the modal and releases on the backdrop would close it.
        let backdropPress = false;
        modal.addEventListener('mousedown', (e) => {
            backdropPress = (e.target === modal);
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal && backdropPress) {
                hideSupportModal();
            }
        });
    }

    if (form) {
        form.addEventListener('submit', submitSupportIssue);
    }
}

// Function to handle tab switching in the modal
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-button');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    contents.forEach(content => {
        content.style.display = content.id === `${tabName}-tab` ? 'block' : 'none';
    });
}

function readFilterState() {
    const groups = loadFilterGroups();
    const selectedChannel = document.querySelector('#channel-filter')?.value || '';
    const selectedYear = document.querySelector('#year-filter')?.value || '';
    const selectedViews = document.querySelector('#views-filter')?.value || '';
    const selectedDuration = document.querySelector('#duration-filter')?.value || '';
    const searchTerm = document.querySelector('#playlist-search-input')?.value.toLowerCase() || '';
    const viewsRange = parseRangeBounds(selectedViews);
    const durationRange = parseRangeBounds(selectedDuration);

    return {
        searchTerm,
        selectedChannel,
        selectedChannelLower: selectedChannel.toLowerCase(),
        selectedYear,
        selectedViews,
        selectedViewsMin: viewsRange.min,
        selectedViewsMax: viewsRange.max,
        selectedDuration,
        selectedDurationMin: durationRange.min,
        selectedDurationMax: durationRange.max,
        searchTitle: document.querySelector('#search-title')?.checked,
        searchChannel: document.querySelector('#search-channel')?.checked,
        activeKeywordGroups: groups.keywords.filter(g => g.active),
        activeChannelGroups: groups.channels.filter(g => g.active),
    };
}

// Parse a filter select value ("1000-10000" / "3600-up") into numeric bounds.
function parseRangeBounds(value) {
    if (!value) return { min: null, max: null };
    const [rawMin, rawMax] = value.split('-');
    return {
        min: parseInt(rawMin),
        max: rawMax === 'up' ? Infinity : parseInt(rawMax),
    };
}

// Modified videoMatchesSearch function to include group filters
function videoMatchesSearch(video, state) {
    const meta = getVideoMeta(video);
    const title = meta.titleLower;
    const channelName = meta.channelLower;
    const searchTerm = state.searchTerm;

    // Check existing filters first
    if (state.selectedChannel && channelName.toLowerCase() !== state.selectedChannelLower) {
        return false;
    }

    if (state.selectedYear) {
        if (!meta.yearStr || meta.yearStr !== state.selectedYear) return false;
    }

    if (state.selectedViews) {
        if (!meta.viewsKnown) return false;
        if (meta.viewsCount < state.selectedViewsMin || meta.viewsCount >= state.selectedViewsMax) return false;
    }

    if (state.selectedDuration) {
        if (meta.durationSec === 0) return false;
        if (meta.durationSec < state.selectedDurationMin || meta.durationSec >= state.selectedDurationMax) return false;
    }

    // Apply group filters
    if (state.activeKeywordGroups.length > 0) {
        const matchesAnyKeywordGroup = state.activeKeywordGroups.some(group =>
            (group.items || []).some(keyword =>
                title.includes(keyword.toLowerCase()) ||
                channelName.toLowerCase().includes(keyword.toLowerCase())
            )
        );
        if (!matchesAnyKeywordGroup) return false;
    }

    if (state.activeChannelGroups.length > 0) {
        const matchesAnyChannelGroup = state.activeChannelGroups.some(group =>
            (group.items || []).some(channel =>
                channelName.toLowerCase() === channel.toLowerCase()
            )
        );
        if (!matchesAnyChannelGroup) return false;
    }

    // If no search term, only apply filters
    if (!searchTerm.trim()) {
        return true;
    }

    const searchTitle = state.searchTitle;
    const searchChannel = state.searchChannel;

    // If neither checkbox is checked, treat as both checked
    if (!searchTitle && !searchChannel) {
        return title.includes(searchTerm) || channelName.toLowerCase().includes(searchTerm);
    }
    
    return (searchTitle && title.includes(searchTerm)) || 
           (searchChannel && channelName.toLowerCase().includes(searchTerm));
}

function describeGroupItems(groups, maxItems = 6) {
    const seen = new Set();
    const items = [];

    for (const group of groups) {
        for (const item of group.items || []) {
            const value = String(item ?? '').trim();
            if (!value) continue;
            const key = value.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            items.push(value);
        }
    }

    if (items.length === 0) return '';

    const shown = items.slice(0, maxItems).join(', ');
    const remaining = items.length - maxItems;
    return remaining > 0 ? `${shown} +${remaining} more` : shown;
}

// Function to handle the search
function handleSearch() {
    refreshVideoListObserver();
    removeDuplicateVideoNodes();

    const state = readFilterState();
    const searchTerm = state.searchTerm;
    const videoItems = getVideoItems();
    const playFilteredButton = document.querySelector('#play-filtered-button');
    const selectedChannel = state.selectedChannel;
    const selectedYear = state.selectedYear;
    const selectedViews = state.selectedViews;
    const selectedDuration = state.selectedDuration;
    let matchCount = 0;

    // Determines actibe filter
    const isFiltering = Boolean(
        searchTerm || selectedChannel || selectedYear || selectedViews || selectedDuration ||
        state.activeKeywordGroups.length || state.activeChannelGroups.length
    );

    if (isFiltering) {
        document.body.setAttribute('data-searching', 'true');
    } else {
        document.body.removeAttribute('data-searching');
    }

    for (let i = 0; i < videoItems.length; i++) {
        const item = videoItems[i];
        try {
            if (videoMatchesSearch(item, state)) {
                item.setAttribute('data-match', 'true');
                matchCount++;
            } else {
                item.setAttribute('data-match', 'false');
            }
        } catch (error) {
            console.error('Error processing video:', error);
        }
    }

    // Update play filtered button visibility
    if (playFilteredButton) {
        playFilteredButton.style.display = matchCount > 0 ? '' : 'none';
        if (matchCount > 0) {
            updatePlayFilteredUrl();
        }
    }

    // Update results count with more detailed message
    const resultsCount = document.querySelector('#search-results-count');
    if (resultsCount) {
        let message = '';
        let filters = [];
        
        if (state.activeKeywordGroups.length) {
            const keywords = describeGroupItems(state.activeKeywordGroups);
            if (keywords) filters.push(`matching keywords ${keywords}`);
        }
        if (state.activeChannelGroups.length) {
            const channels = describeGroupItems(state.activeChannelGroups);
            if (channels) filters.push(`from channels ${channels}`);
        }

        if (selectedChannel) filters.push(`from ${selectedChannel}`);
        if (selectedYear) filters.push(`from ${selectedYear}`);
        if (selectedViews) {
            const viewRangeText = selectedViews.split('-').map(v => {
                if (v === 'up') return '+';
                return parseInt(v).toLocaleString();
            }).join('-');
            filters.push(`with ${viewRangeText} views`);
        }
        if (selectedDuration) {
            const [minDuration, maxDuration] = selectedDuration.split('-');
            const durationText = maxDuration === 'up' ? 
                `over ${formatDuration(parseInt(minDuration))}` :
                `${formatDuration(parseInt(minDuration))} - ${formatDuration(parseInt(maxDuration))}`;
            filters.push(`duration ${durationText}`);
        }
        
        if (filters.length > 0) {
            message = `Showing ${matchCount} videos ${filters.join(' ')}`;
            if (searchTerm.trim()) {
                message += ` matching "${searchTerm}"`;
            }
        } else if (searchTerm.trim()) {
            const searchTitle = state.searchTitle;
            const searchChannel = state.searchChannel;
            let searchScope = '';
            if (searchTitle && searchChannel) searchScope = 'titles and channel names';
            else if (searchTitle) searchScope = 'titles';
            else if (searchChannel) searchScope = 'channel names';
            else searchScope = 'titles and channel names';
            
            message = `Found ${matchCount} matching videos in ${searchScope} out of ${videoItems.length} total`;
        } else {
            message = `Showing all ${matchCount} videos`;
        }
        resultsCount.textContent = message;
    }

    return matchCount;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add isAutoScrollEnabled variable with default from storage
let isAutoScrollEnabled = false;
let activeAutoScrollRun = 0;
let isAutoScrollRunning = false;

const MAX_SCROLL_STEPS = 400;
const MAX_SCROLL_MS = 120000;

// Function to save auto-scroll preference
function saveAutoScrollPreference(enabled) {
    try {
        localStorage.setItem('youtube-playlist-autoscroll', enabled.toString());
    } catch (error) {
        console.error('Error saving auto-scroll preference:', error);
    }
}

// Function to load auto-scroll preference
function loadAutoScrollPreference() {
    try {
        const saved = localStorage.getItem('youtube-playlist-autoscroll');
        return saved === 'true';
    } catch (error) {
        console.error('Error loading auto-scroll preference:', error);
        return false;
    }
}

// Function to update auto-scroll button state
function updateAutoScrollButton(enabled) {
    const autoScrollToggle = document.querySelector('#auto-scroll-toggle');
    if (autoScrollToggle) {
        isAutoScrollEnabled = enabled;
        autoScrollToggle.textContent = `Auto-Scroll: ${enabled ? 'On' : 'Off'}`;
        autoScrollToggle.classList.toggle('enabled', enabled);
        saveAutoScrollPreference(enabled);
    }
}

function hasActiveFilters() {
    const state = readFilterState();
    return Boolean(
        state.searchTerm.trim() ||
        state.selectedChannel ||
        state.selectedYear ||
        state.selectedViews ||
        state.selectedDuration ||
        state.activeKeywordGroups.length ||
        state.activeChannelGroups.length
    );
}

// Function to add event listeners to search interface
function addSearchEventListeners() {
    addScrollListener();
    const searchInput = document.querySelector('#playlist-search-input');
    const clearButton = document.querySelector('#clear-search-button');
    const playFilteredButton = document.querySelector('#play-filtered-button');
    const channelFilter = document.querySelector('#channel-filter');
    const yearFilter = document.querySelector('#year-filter');
    const viewsFilter = document.querySelector('#views-filter');
    const durationFilter = document.querySelector('#duration-filter');
    const searchTitle = document.querySelector('#search-title');
    const searchChannel = document.querySelector('#search-channel');
    const autoScrollToggle = document.querySelector('#auto-scroll-toggle');
    
    if (searchInput) {
        // Add debounced search with conditional auto-scroll
        const debouncedSearch = debounce(() => {
            handleSearch();
            if (isAutoScrollEnabled && !autoScrollToggle?.disabled && hasActiveFilters()) {
                autoScrollAndSearch();
            }
        }, 300);
        searchInput.addEventListener('input', debouncedSearch);
    }

    if (clearButton) {
        clearButton.addEventListener('click', clearSearch);
    }

    if (playFilteredButton) {
        playFilteredButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = playFilteredButton.href;
        });
    }

    // Add auto-scroll toggle handler
    if (autoScrollToggle) {
        autoScrollToggle.addEventListener('click', () => {
            if (!autoScrollToggle.disabled) {
                const newState = !isAutoScrollEnabled;
                updateAutoScrollButton(newState);
                
                // Only trigger auto-scroll if there are active filters
                if (newState && hasActiveFilters()) {
                    autoScrollAndSearch();
                }
            }
        });
    }

    // Add filter change handlers with conditional auto-scroll (throttled)
    [channelFilter, yearFilter, viewsFilter, durationFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', () => {
                requestAnimationFrame(() => {
                    handleSearch();
                    setTimeout(() => {
                        updateChannelFilter();
                        updateYearFilter();
                    }, 50);
                    if (isAutoScrollEnabled && !autoScrollToggle?.disabled && hasActiveFilters()) {
                        autoScrollAndSearch();
                    }
                });
            });
        }
    });

    // Add checkbox change handlers with conditional auto-scroll
    [searchTitle, searchChannel].forEach(checkbox => {
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                handleSearch();
                if (isAutoScrollEnabled && !autoScrollToggle?.disabled && hasActiveFilters()) {
                    autoScrollAndSearch();
                }
            });
        }
    });

    // Add group filter event listeners
    addGroupFilterEventListeners();

    // Add support modal event listeners
    addSupportEventListeners();
}

// Invalidate any in-flight auto-scroll run without touching the enabled toggle.
function cancelAutoScrollRun() {
    if (!isAutoScrollRunning) return false;
    activeAutoScrollRun++;
    isAutoScrollRunning = false;
    const toggle = document.querySelector('#auto-scroll-toggle');
    if (toggle) {
        toggle.disabled = false;
        toggle.textContent = `Auto-Scroll: ${isAutoScrollEnabled ? 'On' : 'Off'}`;
    }
    return true;
}

// Stop an in-progress scroll loop and flip the enabled state (used by ESC handler)
function stopAutoScroll() {
    cancelAutoScrollRun();
    const newState = !isAutoScrollEnabled;
    updateAutoScrollButton(newState);

    // Only trigger a fresh scroll pass when turning it on with filters active
    if (newState && hasActiveFilters()) {
        autoScrollAndSearch();
    }
}

// Function to auto-scroll and search
async function autoScrollAndSearch() {
    const runId = ++activeAutoScrollRun;
    const isStale = () => runId !== activeAutoScrollRun;
    isAutoScrollRunning = true;

    const totalCount = getPlaylistTotalCount();
    let noNewVisibleCount = 0;

    // Disable the auto-scroll toggle button while searching
    const autoScrollToggle = document.querySelector('#auto-scroll-toggle');
    if (autoScrollToggle) {
        autoScrollToggle.disabled = true;
        autoScrollToggle.textContent = 'Auto-Scroll: Searching...';
    }

    try {
        let loadedCount = getVideoItems().length;
        const startedAt = Date.now();
        let step = 0;
        let lastMatchCount = -1;

        while ((!totalCount || loadedCount < totalCount) && noNewVisibleCount < 3) {
            if (isStale()) break;

            if (step >= MAX_SCROLL_STEPS || Date.now() - startedAt >= MAX_SCROLL_MS) {
                console.warn('[YPS] autoScrollAndSearch: stopped after', step, 'steps /',
                    Math.round((Date.now() - startedAt) / 1000) + 's (limit reached)');
                break;
            }

            // Stops auto scroll when navigated away from the playlist page
            if (!isPlaylistPage()) {
                cancelAutoScrollRun();
                break;
            }

            step++;
            // Scroll to bottom
            window.scrollTo(0, document.documentElement.scrollHeight);

            // Wait for new videos to load
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Bail out during the wait
            if (isStale()) break;

            // Check how many videos YouTube has now rendered in the DOM
            const newLoadedCount = getVideoItems().length;

            if (newLoadedCount === loadedCount) {
                noNewVisibleCount++;
            } else {
                noNewVisibleCount = 0;
                loadedCount = newLoadedCount;
                updateChannelFilter();
                updateYearFilter();
                const matches = handleSearch();
                if (matches > lastMatchCount) lastMatchCount = matches;
                if (autoScrollToggle?.isConnected) {
                    autoScrollToggle.textContent = `Auto-Scroll: Searching… ${lastMatchCount} found`;
                }
            }
        }
    } finally {
        if (!isStale()) {
            isAutoScrollRunning = false;
            if (autoScrollToggle?.isConnected) {
                autoScrollToggle.disabled = false;
                autoScrollToggle.textContent = `Auto-Scroll: ${isAutoScrollEnabled ? 'On' : 'Off'}`;
            }
        }
    }
}

let scrollListenerAttached = false;
let scrollThrottleTimer = null;
function addScrollListener() {
    if (scrollListenerAttached) return;
    scrollListenerAttached = true;

    let scheduled = false;
    window.addEventListener('scroll', () => {
        if (!isPlaylistPage()) return;
        if (scheduled) return;
        scheduled = true;
        scrollThrottleTimer = setTimeout(() => {
            scrollThrottleTimer = null;
            handleSearch();
            updateChannelFilter();
            updateYearFilter();
            scheduled = false;
        }, 100);
    }, { passive: true });
}

let videoListObserver = null;
let observedListContainers = new Set();

function handleVideoListMutations(mutations) {
    if (!hasActiveFilters()) return;
    if (refreshVideoListObserver()) return;

    const hasVideoAdds = mutations.some(m =>
        m.type === 'childList' && Array.from(m.addedNodes || []).some(n =>
            n.nodeType === 1 && n.matches?.(VIDEO_ITEM_SELECTOR)
        )
    );
    if (!hasVideoAdds) return;

    removeDuplicateVideoNodes();
    handleSearch();
}

function refreshVideoListObserver() {
    const containers = getVideoListContainers();
    const unchanged = containers.length === observedListContainers.size &&
        containers.every(c => observedListContainers.has(c));
    if (unchanged) return false;

    if (videoListObserver) {
        try { videoListObserver.disconnect(); } catch (e) {}
        const at = activeObservers.indexOf(videoListObserver);
        if (at !== -1) activeObservers.splice(at, 1);
        videoListObserver = null;
    }
    observedListContainers = new Set(containers);
    if (!containers.length) return true;

    videoListObserver = new MutationObserver(handleVideoListMutations);
    containers.forEach(c => videoListObserver.observe(c, { childList: true }));
    activeObservers.push(videoListObserver);
    return true;
}

function disconnectObservers() {
    activeObservers.forEach(obs => { try { obs.disconnect(); } catch (e) {} });
    activeObservers = [];
    videoListObserver = null;
    observedListContainers = new Set();
    disconnectContentWatcher();
}

// Function to initialize the extension
function init() {
    if (!isPlaylistPage()) return;

    disconnectObservers();
    diagnostics?.start();

    // Remove any existing search interfaces
    const existingSearches = document.querySelectorAll('#playlist-search-wrapper, #playlist-search-container, #group-filters-modal, #support-modal');
    existingSearches.forEach(element => element.remove());
    mountedWrapper = null;

    // Create new interface
    createSearchInterface();
}

// Function to check if the search interface needs to be initialized
function checkAndInitialize() {
    debugPlaylistState('checkAndInitialize');

    if (!isPlaylistPage()) return;

    if (mountedWrapper?.isConnected && mountedWrapper.closest('ytd-browse') === getActiveBrowse()) {
        return;
    }

    init();
}

let activeObservers = [];
let mountedWrapper = null;
let lastRouteChangeAt = 0;
let mountTimer = null;
let cleanupTimer = null;
let lastUrl = location.href;
let historyPatched = false;
function markRouteChange() {
    lastRouteChangeAt = Date.now();
}

function isRouteSettled() {
    return lastRouteChangeAt === 0 || Date.now() - lastRouteChangeAt >= 800;
}

// Function to deactivate all filter groups (used when leaving the playlist page)
function deactivateFilterGroups() {
    const groups = loadFilterGroups();
    let changed = false;
    groups.keywords.forEach(g => { if (g.active) { g.active = false; changed = true; } });
    groups.channels.forEach(g => { if (g.active) { g.active = false; changed = true; } });
    if (changed) saveFilterGroups(groups);
}

function resetPlaylistUi() {
    stopMountPoll();
    disconnectObservers();
    diagnostics?.stop();
    cancelAutoScrollRun();
    deactivateFilterGroups();
    document.querySelectorAll('#playlist-search-wrapper, #playlist-search-container, #group-filters-modal, #support-modal').forEach(el => el.remove());
    mountedWrapper = null;
    document.body.removeAttribute('data-searching');
}

function clearMountTimer() {
    clearTimeout(mountTimer);
    mountTimer = null;
}

function scheduleRouteCleanup() {
    clearTimeout(cleanupTimer);
    cleanupTimer = setTimeout(() => {
        if (!isPlaylistPage()) {
            resetPlaylistUi();
        }
    }, 100);
}

function schedulePlaylistMount(delay = 800) {
    clearMountTimer();
    mountTimer = setTimeout(tryMountPlaylistUi, delay);
}

function tryMountPlaylistUi() {
    if (!isPlaylistPage()) {
        resetPlaylistUi();
        return;
    }

    checkAndInitialize();
}

function onRouteStart() {
    markRouteChange();
    // Only clean up when LEAVING a playlist page.
    // When entering a playlist, NEVER! kill the pending mount timer... EVER!
    if (!isPlaylistPage()) {
        clearMountTimer();
        resetPlaylistUi();
    }
    scheduleRouteCleanup();
}

function onRouteSettled() {
    if (isPlaylistPage()) {
        schedulePlaylistMount(800);
    }
}

function watchLocationChange() {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        onRouteStart();
        onRouteSettled();
    }
}

function patchHistoryMethods() {
    if (historyPatched) return;
    historyPatched = true;

    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = function (...args) {
        const result = originalPushState(...args);
        watchLocationChange();
        return result;
    };

    history.replaceState = function (...args) {
        const result = originalReplaceState(...args);
        watchLocationChange();
        return result;
    };

    window.addEventListener('popstate', watchLocationChange);
}

// Initialize only after YouTube settles on playlist route.
initThemeDetection();
patchHistoryMethods();

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.keyCode === 27) {
        if (isPlaylistPage()) stopAutoScroll();
    }
}, true);

function addDragSuppressionListeners(wrapper) {
    ['pointerdown', 'mousedown', 'touchstart', 'dragstart', 'selectstart'].forEach(evtName => {
        wrapper.addEventListener(evtName, (e) => e.stopPropagation(), true);
    });
}

if (isPlaylistPage()) {
    schedulePlaylistMount(1200);
}

// Also try on load as fallback
window.addEventListener('load', () => {
    initThemeDetection();
    patchHistoryMethods();
    if (isPlaylistPage()) {
        schedulePlaylistMount(800);
    }
});

// Handle YouTube's navigation events
window.addEventListener('yt-navigate-start', onRouteStart);
window.addEventListener('yt-navigate-finish', onRouteSettled);
window.addEventListener('yt-page-data-updated', onRouteSettled);
window.addEventListener('yt-navigate-cache', onRouteSettled);
window.addEventListener('yt-navigate-fail', onRouteStart);
window.addEventListener('hashchange', watchLocationChange);

let contentWatcher = null;
let contentWatcherRetryTimer = null;
let contentWatcherDebounceTimer = null;

function disconnectContentWatcher() {
    if (contentWatcher) {
        try { contentWatcher.disconnect(); } catch (e) {}
        contentWatcher = null;
    }
    if (contentWatcherRetryTimer !== null) {
        clearTimeout(contentWatcherRetryTimer);
        contentWatcherRetryTimer = null;
    }
    if (contentWatcherDebounceTimer !== null) {
        clearTimeout(contentWatcherDebounceTimer);
        contentWatcherDebounceTimer = null;
    }
}

function watchForContentReplacement() {
    if (contentWatcher) return;
    const contentArea = document.querySelector('#page-manager') || document.querySelector('ytd-app');
    if (!contentArea) {
        contentWatcherRetryTimer = setTimeout(watchForContentReplacement, 1000);
        return;
    }
    contentWatcher = new MutationObserver(() => {
        if (!isPlaylistPage()) return;
        // Waits for YouTube to finish rendering
        clearTimeout(contentWatcherDebounceTimer);
        contentWatcherDebounceTimer = setTimeout(() => {
            contentWatcherDebounceTimer = null;
            if (!mountedWrapper?.isConnected && !document.querySelector('#playlist-search-wrapper') && isPlaylistPage()) {
                schedulePlaylistMount(500);
            }
        }, 500);
    });
    contentWatcher.observe(contentArea, { childList: true, subtree: true });
}

function armContentWatcher() {
    if (contentWatcher || contentWatcherRetryTimer !== null) return;
    watchForContentReplacement();
}

window.addEventListener('DOMContentLoaded', () => {
    if (isPlaylistPage()) {
        schedulePlaylistMount(800);
    }
});
setTimeout(() => {
    if (isPlaylistPage()) {
        schedulePlaylistMount(800);
    }
}, 700);
setTimeout(() => {
    if (isPlaylistPage()) {
        schedulePlaylistMount(800);
    }
}, 2000);
setTimeout(() => {
    if (isPlaylistPage()) {
        schedulePlaylistMount(800);
    }
}, 4000);

// Guard direct init attempt after startup.
if (isPlaylistPage()) {
    schedulePlaylistMount(800);
}

// Function to get total playlist count
function getPlaylistTotalCount() {
    const bylines = Array.from(document.querySelectorAll(
        'ytd-playlist-sidebar-primary-info-renderer #stats .byline-item, ' +
        'ytd-playlist-header-renderer #stats .byline-item, ' +
        '#stats.ytd-playlist-sidebar-primary-info-renderer .byline-item'
    ));
    if (bylines.length === 0) return null;

    const withKeyword = bylines.find(el => /video/i.test(el.textContent || ''));
    const countText = (withKeyword || bylines[0])?.textContent || '';

    const localized = countText.replace(/[\s  ]/g, '');
    const m = localized.match(/(\d[\d.,]*)/);
    if (!m) return null;
    const value = parseLocalizedNumber(m[1]);
    return value === null ? null : Math.round(value);
}

let mountPollTimer = null;

function startMountPoll() {
    if (mountPollTimer !== null) return;
    mountPollTimer = setInterval(tryMountPanel, 500);
}

function stopMountPoll() {
    if (mountPollTimer === null) return;
    clearInterval(mountPollTimer);
    mountPollTimer = null;
}

function tryMountPanel() {
    if (!isPlaylistPage()) {
        stopMountPoll();
        resetPlaylistUi();
        return;
    }
    if (document.querySelector('#playlist-search-container')) {
        stopMountPoll();
        return;
    }
    if (!isRouteSettled()) {
        debugPlaylistState('mount poll: route not settled');
        return;
    }

    if (!getActiveBrowse() && document.querySelector('ytd-browse')) {
        debugPlaylistState('mount poll: no visible ytd-browse yet');
        return;
    }

    const firstRealVideo = findPrimaryListAnchor();
    if (!firstRealVideo) {
        debugPlaylistState('mount poll: playlist list not rendered yet');
        return;
    }

    const mountPoint = findPanelMountPoint(firstRealVideo);
    if (!mountPoint) {
        debugPlaylistState('mount poll: no safe mount point beside the list');
        return;
    }

    stopMountPoll();
    if (!mountPanel(mountPoint)) {
        startMountPoll();
    }
}

// Function to create and insert the search interface
function createSearchInterface() {
    if (document.querySelector('#playlist-search-container')) {
        return;
    }

    armContentWatcher();
    startMountPoll();
    tryMountPanel();
}

function mountPanel(mountPoint) {
    if (document.querySelector('#playlist-search-container')) {
        return true;
    }

    document.querySelector('#playlist-search-wrapper')?.remove();
    document.querySelector('#group-filters-modal')?.remove();
    document.querySelector('#support-modal')?.remove();
    mountedWrapper = null;

    const wrapper = document.createElement('div');
    wrapper.id = 'playlist-search-wrapper';
    wrapper.setAttribute('data-yps-mounted', 'true');
    wrapper.setAttribute('draggable', 'false');
    wrapper.appendChild(createSearchElement());
    const container = wrapper.querySelector('#playlist-search-container');
    if (container) container.setAttribute('data-yps-mounted', 'true');

    wrapper.style.cssText = 'background: transparent !important; position: relative !important; display: block !important; visibility: visible !important; opacity: 1 !important; min-height: 50px !important; margin-top: 12px !important; width: 100% !important; max-width: none !important; clear: both !important; box-sizing: border-box !important; overflow: visible !important;';
    if (container) {
        container.style.cssText = 'position: relative !important; display: flex !important; visibility: visible !important; opacity: 1 !important; min-height: 50px !important; width: 100% !important; box-sizing: border-box !important;';
    }

    if (mountPoint.before && mountPoint.before.parentElement === mountPoint.parent) {
        mountPoint.before.insertAdjacentElement('beforebegin', wrapper);
    } else {
        mountPoint.parent.prepend(wrapper);
    }
    if (!wrapper.isConnected) {
        document.body.appendChild(wrapper);
    }
    mountedWrapper = wrapper;

    if (wrapper.getClientRects().length === 0) {
        wrapper.remove();
        mountedWrapper = null;
        return false;
    }

    addDragSuppressionListeners(wrapper);

    // Move modals to body so they escape YouTube's stacking context
    const modalInContainer = document.querySelector('#group-filters-modal');
    if (modalInContainer) {
        document.body.appendChild(modalInContainer);
    }
    const supportModalInContainer = document.querySelector('#support-modal');
    if (supportModalInContainer) {
        document.body.appendChild(supportModalInContainer);
    }

    addSearchEventListeners();

    refreshVideoListObserver();
    getVideoItems().forEach(item => item.style.removeProperty('display'));

    setTimeout(() => {
        updateChannelFilter();
        updateYearFilter();
    }, 1000);

    return true;
}

// Function to clear all search filters
function clearSearch() {
    const searchInput = document.querySelector('#playlist-search-input');
    const channelFilter = document.querySelector('#channel-filter');
    const yearFilter = document.querySelector('#year-filter');
    const viewsFilter = document.querySelector('#views-filter');
    const durationFilter = document.querySelector('#duration-filter');
    const searchTitle = document.querySelector('#search-title');
    const searchChannel = document.querySelector('#search-channel');
    const autoScrollToggle = document.querySelector('#auto-scroll-toggle');
    
    // Reset input and filters
    if (searchInput) searchInput.value = '';
    if (channelFilter) channelFilter.value = '';
    if (yearFilter) yearFilter.value = '';
    if (viewsFilter) viewsFilter.value = '';
    if (durationFilter) durationFilter.value = '';
    if (searchTitle) searchTitle.checked = true;
    if (searchChannel) searchChannel.checked = true;
    
    // Show all videos
    const videoItems = getVideoItems();
    videoItems.forEach(item => {
        item.removeAttribute('data-match');
    });

    // Remove searching state
    document.body.removeAttribute('data-searching');
    
    // Hide play filtered button
    const playFilteredButton = document.querySelector('#play-filtered-button');
    if (playFilteredButton) {
        playFilteredButton.style.display = 'none';
    }
    
    // Update results count
    const resultsCount = document.querySelector('#search-results-count');
    if (resultsCount) {
        resultsCount.textContent = `Showing all ${videoItems.length} videos`;
    }

    // Keep auto-scroll state but update button appearance
    if (autoScrollToggle) {
        updateAutoScrollButton(isAutoScrollEnabled);
    }
}

// Function to add event listeners for group filters
function addGroupFilterEventListeners() {
    const groupFiltersButton = document.querySelector('#group-filters-button');
    const closeButton = document.querySelector('.close-button');
    const modal = document.querySelector('#group-filters-modal');
    const tabButtons = document.querySelectorAll('.tab-button');
    const addGroupButtons = document.querySelectorAll('.add-group-button');
    
    if (groupFiltersButton) {
        groupFiltersButton.addEventListener('click', () => {
            showGroupFiltersModal();
            // Ensure groups are rendered immediately
            renderFilterGroups();
            // Make sure the first tab is active
            const firstTab = document.querySelector('.tab-button');
            if (firstTab) {
                switchTab(firstTab.dataset.tab);
            }
        });
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', hideGroupFiltersModal);
    }
    
    if (modal) {
        // Only close if the press began on the backdrop (see support modal)
        let backdropPress = false;
        modal.addEventListener('mousedown', (e) => {
            backdropPress = (e.target === modal);
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal && backdropPress) {
                hideGroupFiltersModal();
            }
        });
    }
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchTab(button.dataset.tab);
            // Re-render groups when switching tabs
            renderFilterGroups();
        });
    });
    
    addGroupButtons.forEach(button => {
        button.addEventListener('click', () => {
            const type = button.closest('.tab-content').id.replace('-tab', '');
            showAddGroupDialog(type);
        });
    });
}
}
