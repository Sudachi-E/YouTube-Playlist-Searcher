function isMainYouTubeHost() {
    return location.hostname === 'www.youtube.com'
}

if (isMainYouTubeHost()) {

const SUPPORT_EMAIL = 'contact.sudotronics@gmail.com';

(function setupDiagnostics() {
    function waitForBody(fn) {
        if (document.body) return fn();
        const mo = new MutationObserver(() => { if (document.body) { mo.disconnect(); fn(); } });
        mo.observe(document.documentElement, { childList: true });
    }
    waitForBody(() => {
        // Track data-searching changes
        new MutationObserver((muts) => {
            for (const m of muts) {
                if (m.attributeName === 'data-searching') {
                    console.log('[YPS-DIAG] body[data-searching] changed', {
                        value: document.body.getAttribute('data-searching'),
                        stack: new Error().stack.split('\n').slice(1, 6).join(' | '),
                    });
                }
            }
        }).observe(document.body, { attributes: true, attributeFilter: ['data-searching'] });

        // Track video attr changes: style, data-match, AND class (YouTube likely uses classes to hide)
        const videoSel = 'yt-lockup-view-model, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer';
        new MutationObserver((muts) => {
            for (const m of muts) {
                const t = m.target;
                if (!t.matches?.(videoSel)) continue;
                if (m.type === 'attributes') {
                    console.log('[YPS-DIAG] video attr', {
                        attr: m.attributeName,
                        display: t.style.display || '(none)',
                        class: t.className?.toString().slice(0, 80) || '',
                        dataMatch: t.getAttribute('data-match'),
                        title: (t.querySelector('#video-title, a#video-title, .ytLockupMetadataViewModelTitle')?.textContent || '').slice(0, 50),
                        stack: new Error().stack.split('\n').slice(1, 4).join(' | '),
                    });
                }
            }
        }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style', 'data-match', 'class'] });

        // Track video removals from DOM
        new MutationObserver((muts) => {
            for (const m of muts) {
                if (m.type !== 'childList') continue;
                for (const removed of m.removedNodes) {
                    if (removed.nodeType !== 1) continue;
                    if (removed.matches?.(videoSel)) {
                        console.log('[YPS-DIAG] video REMOVED from DOM', {
                            title: (removed.querySelector('#video-title, a#video-title, .ytLockupMetadataViewModelTitle')?.textContent || '').slice(0, 50),
                            parent: removed.parentElement?.tagName || '(detached)',
                            stack: new Error().stack.split('\n').slice(1, 4).join(' | '),
                        });
                    }
                }
            }
        }).observe(document.body, { childList: true, subtree: true });

        console.log('[YPS-DIAG] diagnostic observers installed');

        // Catches pre-existing hidden state
        let lastTotal = 0;
        setInterval(() => {
            const sel = 'yt-lockup-view-model, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer';
            const videos = document.querySelectorAll(sel);
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
            console.log('[YPS-DIAG] video state', {
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
                    videoCount: b.querySelectorAll(sel).length,
                })),
            });
        }, 2000);
    });
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
        console.log('Applied theme to container:', container);
    }
    if (modal) {
        modal.setAttribute('data-theme', theme);
        console.log('Applied theme to modal:', modal);
    } else {
        console.log('Modal not found when applying theme');
    }
    if (channelDialog) {
        channelDialog.setAttribute('data-theme', theme);
        console.log('Applied theme to channel dialog:', channelDialog);
    }
    if (supportModal) {
        supportModal.setAttribute('data-theme', theme);
        console.log('Applied theme to support modal:', supportModal);
    }
}

function initThemeDetection() {
    // Initial theme detection
    const currentTheme = detectYouTubeTheme();
    applyThemeToExtension(currentTheme);
    
    // Watches for theme changes
    const observer = new MutationObserver((mutations) => {
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
    observer.observe(document.documentElement, { 
        attributes: true, 
        attributeFilter: ['dark', 'class'] 
    });
    observer.observe(document.body, { 
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

function debugPlaylistState(label) {
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

function getVideoItems() {
    // Support both old and new YouTube layouts
    // Filter out YouTube's offscreen cached containers that have no real content
    const allItems = document.querySelectorAll('yt-lockup-view-model, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer');
    return Array.from(allItems).filter(el => {
        return el.querySelector('#video-title, a#video-title, yt-formatted-string#video-title, .ytLockupMetadataViewModelTitle');
    });
}

function getTitleText(video) {
    const titleEl = video.querySelector('.ytLockupMetadataViewModelTitle');
    return (titleEl?.textContent || '').toLowerCase();
}

function getChannelNameText(video) {
    const channelEl = video.querySelector('.ytAttributedStringLink[href^="/@"]');
    return (channelEl?.textContent || '').trim();
}

const videoMetaCache = new WeakMap();

function computeVideoMeta(video) {
    const titleLower = getTitleText(video);
    const channelLower = getChannelNameText(video).toLowerCase();
    
    // Views count
    let viewsCount = 0;
    const viewsEl = video.querySelector('.ytContentMetadataViewModelMetadataText[role="text"]');
    if (viewsEl && /views?/i.test(viewsEl.textContent)) {
        viewsCount = parseViewCount(viewsEl.textContent);
    }
    
    // Year/date extraction
    let yearStr = '';
    const dateEl = Array.from(video.querySelectorAll('.ytContentMetadataViewModelMetadataText')).find(el =>
        /(\d{4})|(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i.test(el.textContent)
    );
    if (dateEl) {
        const m = dateEl.textContent.trim().match(/(\d{4})|(\d+)\s+years?\s+ago/i);
        if (m) {
            const currentYear = new Date().getFullYear();
            const y = m[1] ? parseInt(m[1]) : currentYear - parseInt(m[2]);
            yearStr = String(y);
        }
    }
    
    // Duration extraction
    let durationSec = 0;
    const durationEl = video.querySelector('.ytThumbnailBadgeViewModelHost .ytBadgeShapeText');
    if (durationEl) {
        const durationText = durationEl.textContent.trim();
        const match = durationText.match(/\d{1,2}:\d{2}(?::\d{2})?/);
        if (match) {
            durationSec = parseDuration(match[0]);
        }
    }
    
    return { titleLower, channelLower, viewsCount, yearStr, durationSec };
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
        yearStr: current.yearStr || cached.yearStr,
        durationSec: current.durationSec || cached.durationSec,
    };
    videoMetaCache.set(video, updated);
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
                        <span class="support-version">v1.0.9</span>
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

    // Get all visible (matching) videos
    const visibleVideos = Array.from(getVideoItems())
        .filter(video => video.style.display !== 'none');

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
function updateYearFilter() {
    const yearFilter = document.querySelector('#year-filter');
    if (!yearFilter) return;

    // Store current selection
    const currentSelection = yearFilter.value;

    // Get all videos
    const videos = getVideoItems();
    
    // Get unique years using the same metadata extraction as videoMatchesSearch
    const years = new Set();
    videos.forEach(video => {
        const meta = getVideoMeta(video);
        if (meta.yearStr) {
            years.add(meta.yearStr);
        }
    });

    // Sort years in descending order (newest first)
    const sortedYears = Array.from(years).sort((a, b) => b - a);

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

    // Restore previous selection if it still exists
    if (currentSelection && Array.from(yearFilter.options).some(opt => opt.value === currentSelection)) {
        yearFilter.value = currentSelection;
    }
}

// Helper function to parse view count
function parseViewCount(viewText) {
    if (!viewText) return 0;
    
    // Remove 'views' and any commas, then trim
    viewText = viewText.toLowerCase().replace(/views|,/g, '').trim();
    
    // Handle different formats
    if (viewText.includes('k')) {
        return parseFloat(viewText) * 1000;
    } else if (viewText.includes('m')) {
        return parseFloat(viewText) * 1000000;
    } else if (viewText.includes('b')) {
        return parseFloat(viewText) * 1000000000;
    }
    
    return parseInt(viewText) || 0;
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

// Function to load saved filter groups from storage
function loadFilterGroups() {
    const savedGroups = localStorage.getItem('youtubePlaylistFilterGroups');
    return savedGroups ? JSON.parse(savedGroups) : {
        keywords: [],
        channels: []
    };
}

// Function to save filter groups to storage
function saveFilterGroups(groups) {
    localStorage.setItem('youtubePlaylistFilterGroups', JSON.stringify(groups));
}

// Function to create a new filter group
function createFilterGroup(type, name, items) {
    const groups = loadFilterGroups();
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
    groups[type] = groups[type].filter(group => group.id !== id);
    saveFilterGroups(groups);
    renderFilterGroups();
    handleSearch(); // Refresh search results
}

// Function to toggle a filter group
function toggleFilterGroup(type, id) {
    const groups = loadFilterGroups();
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
                        <input type="checkbox" value="${channel}" 
                            ${selectedChannels.includes(channel) ? 'checked' : ''}>
                        <span>${channel}</span>
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
    const group = groups[type].find(g => g.id === id);
    if (!group) return;
    
    // Prompt for new name, pre-filled with current name
    const newName = prompt('Enter new group name:', group.name);
    if (!newName) return;
    
    let newItems = [];
    if (type === 'channels') {
        try {
            newItems = await createChannelSelectionDialog(group.items);
            if (!newItems || newItems.length === 0) return;
        } catch {
            return; // Dialog was cancelled
        }
    } else {
        const newItemsStr = prompt('Enter items (comma-separated):', group.items.join(', '));
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
            <div class="filter-group" data-group-id="${group.id}" data-group-type="keywords">
                <div class="filter-group-header">
                    <span class="filter-group-name">${group.name}</span>
                    <div class="filter-group-actions">
                        <button class="toggle-group-button ${group.active ? 'active' : ''}">
                            ${group.active ? 'Active' : 'Inactive'}
                        </button>
                        <button class="edit-group-button">Edit</button>
                        <button class="delete-group-button">Delete</button>
                    </div>
                </div>
                <div class="filter-group-items">
                    ${group.items.map(item => `<span class="filter-item">${item}</span>`).join('')}
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
            <div class="filter-group" data-group-id="${group.id}" data-group-type="channels">
                <div class="filter-group-header">
                    <span class="filter-group-name">${group.name}</span>
                    <div class="filter-group-actions">
                        <button class="toggle-group-button ${group.active ? 'active' : ''}">
                            ${group.active ? 'Active' : 'Inactive'}
                        </button>
                        <button class="edit-group-button">Edit</button>
                        <button class="delete-group-button">Delete</button>
                    </div>
                </div>
                <div class="filter-group-items">
                    ${group.items.map(item => `<span class="filter-item">${item}</span>`).join('')}
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

// Modified videoMatchesSearch function to include group filters
function videoMatchesSearch(video, searchTerm) {
    const meta = getVideoMeta(video);
    const title = meta.titleLower;
    const channelName = meta.channelLower;
    
    // Check existing filters first
    const selectedChannel = document.querySelector('#channel-filter')?.value || '';
    const selectedYear = document.querySelector('#year-filter')?.value || '';
    const selectedViews = document.querySelector('#views-filter')?.value || '';
    const selectedDuration = document.querySelector('#duration-filter')?.value || '';
    
    // Apply existing filter checks
    if (selectedChannel && channelName.toLowerCase() !== selectedChannel.toLowerCase()) {
        return false;
    }
    
    if (selectedYear) {
        if (!meta.yearStr || meta.yearStr !== selectedYear) return false;
    }
    
    if (selectedViews) {
        const [minViews, maxViews] = selectedViews.split('-').map(v => v === 'up' ? Infinity : parseInt(v));
        if (meta.viewsCount < minViews || meta.viewsCount >= maxViews) return false;
    }

    if (selectedDuration) {
        const [minDuration, maxDuration] = selectedDuration.split('-').map(d => d === 'up' ? Infinity : parseInt(d));
        if (meta.durationSec === 0) return false;
        if (meta.durationSec < minDuration || meta.durationSec >= maxDuration) return false;
    }
    
    // Apply group filters
    const groups = loadFilterGroups();
    
    // Check keyword groups
    const activeKeywordGroups = groups.keywords.filter(g => g.active);
    if (activeKeywordGroups.length > 0) {
        const matchesAnyKeywordGroup = activeKeywordGroups.some(group => 
            group.items.some(keyword => 
                title.includes(keyword.toLowerCase()) || 
                channelName.toLowerCase().includes(keyword.toLowerCase())
            )
        );
        if (!matchesAnyKeywordGroup) return false;
    }
    
    // Check channel groups
    const activeChannelGroups = groups.channels.filter(g => g.active);
    if (activeChannelGroups.length > 0) {
        const matchesAnyChannelGroup = activeChannelGroups.some(group =>
            group.items.some(channel => 
                channelName.toLowerCase() === channel.toLowerCase()
            )
        );
        if (!matchesAnyChannelGroup) return false;
    }
    
    // If no search term, only apply filters
    if (!searchTerm.trim()) {
        return true;
    }

    const searchTitle = document.querySelector('#search-title')?.checked;
    const searchChannel = document.querySelector('#search-channel')?.checked;
    
    // If neither checkbox is checked, treat as both checked
    if (!searchTitle && !searchChannel) {
        return title.includes(searchTerm) || channelName.toLowerCase().includes(searchTerm);
    }
    
    return (searchTitle && title.includes(searchTerm)) || 
           (searchChannel && channelName.toLowerCase().includes(searchTerm));
}

// Function to handle the search
async function handleSearch() {
    const searchTerm = document.querySelector('#playlist-search-input')?.value.toLowerCase() || '';
    const videoItems = Array.from(getVideoItems());
    const playFilteredButton = document.querySelector('#play-filtered-button');
    const selectedChannel = document.querySelector('#channel-filter')?.value || '';
    const selectedYear = document.querySelector('#year-filter')?.value || '';
    const selectedViews = document.querySelector('#views-filter')?.value || '';
    const selectedDuration = document.querySelector('#duration-filter')?.value || '';
    let matchCount = 0;

    // Determine if any filter is active
    const isFiltering = searchTerm || selectedChannel || selectedYear || selectedViews || selectedDuration || hasActiveFilters();

    // Mark the document as actively searching for CSS-based hiding
    // Using document.body ensures all video items (including lazy-loaded ones) are covered
    console.log('[YPS-DIAG] handleSearch', { isFiltering, videoCount: videoItems.length, stack: new Error().stack.split('\n').slice(1, 4).join(' | ') });
    if (isFiltering) {
        document.body.setAttribute('data-searching', 'true');
    } else {
        document.body.removeAttribute('data-searching');
    }

    // Apply visibility synchronously in one pass — no async gaps for YouTube to interfere
    for (let i = 0; i < videoItems.length; i++) {
        const item = videoItems[i];
        try {
            if (videoMatchesSearch(item, searchTerm)) {
                item.setAttribute('data-match', 'true');
                item.style.removeProperty('display');
                matchCount++;
            } else {
                item.setAttribute('data-match', 'false');
                item.style.setProperty('display', 'none', 'important');
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
            const searchTitle = document.querySelector('#search-title')?.checked;
            const searchChannel = document.querySelector('#search-channel')?.checked;
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
}

// Debounce function to limit how often a function can be called
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

// Function to check if there are any active filters or search terms
function hasActiveFilters() {
    const searchTerm = document.querySelector('#playlist-search-input')?.value.trim() || '';
    const channelFilter = document.querySelector('#channel-filter')?.value || '';
    const yearFilter = document.querySelector('#year-filter')?.value || '';
    const viewsFilter = document.querySelector('#views-filter')?.value || '';
    const durationFilter = document.querySelector('#duration-filter')?.value || '';
    
    // Check for active group filters
    const groups = loadFilterGroups();
    const hasActiveKeywordGroup = groups.keywords.some(g => g.active);
    const hasActiveChannelGroup = groups.channels.some(g => g.active);
    
    return searchTerm !== '' || 
           channelFilter !== '' || 
           yearFilter !== '' || 
           viewsFilter !== '' || 
           durationFilter !== '' ||
           hasActiveKeywordGroup ||
           hasActiveChannelGroup;
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

// Function to auto-scroll and search
async function autoScrollAndSearch() {
    const searchTerm = document.querySelector('#playlist-search-input')?.value.toLowerCase() || '';
    const totalCount = getPlaylistTotalCount();
    let currentCount = getVideoItems().length;
    let noNewVideosCount = 0;
    let lastCount = currentCount;
    let matchCount = 0;
    
    // Disable the auto-scroll toggle button while searching
    const autoScrollToggle = document.querySelector('#auto-scroll-toggle');
    if (autoScrollToggle) {
        autoScrollToggle.disabled = true;
        autoScrollToggle.textContent = 'Auto-Scroll: Searching...';
    }

    try {
        // Count current matches
        getVideoItems().forEach(video => {
            if (video.style.display !== 'none') {
                matchCount++;
            }
        });

        // Keep scrolling until we've loaded all videos or found enough matches
        while ((!totalCount || currentCount < totalCount) && noNewVideosCount < 3) {
            // Stop if we've navigated away from the playlist page
            if (!isPlaylistPage()) break;

            // Scroll to bottom
            window.scrollTo(0, document.documentElement.scrollHeight);
            
            // Wait for new videos to load
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update counts
            currentCount = getVideoItems().length;
            
            // Check if we got new videos
            if (currentCount === lastCount) {
                noNewVideosCount++;
            } else {
                noNewVideosCount = 0;
                // Update filters and search results
                updateChannelFilter();
                updateYearFilter();
                handleSearch();

                // Count new matches
                matchCount = 0;
                getVideoItems().forEach(video => {
                    if (video.style.display !== 'none') {
                        matchCount++;
                    }
                });
            }
            
            lastCount = currentCount;
        }
    } finally {
        // Re-enable the button and restore its text when done
        if (autoScrollToggle) {
            autoScrollToggle.disabled = false;
            autoScrollToggle.textContent = `Auto-Scroll: ${isAutoScrollEnabled ? 'On' : 'Off'}`;
        }
    }
}

// Function to add scroll event listener
function addScrollListener() {
    let scheduled = false;
    window.addEventListener('scroll', () => {
        if (!isPlaylistPage()) return;
        if (scheduled) return;
        scheduled = true;
        setTimeout(() => {
            handleSearch();
            updateChannelFilter();
            updateYearFilter();
            scheduled = false;
        }, 100);
    });
}

// Function to initialize the extension
function init() {
    console.log('[YPS] init', {
        href: location.href,
        playlistPage: isPlaylistPage(),
        settled: isRouteSettled(),
        ready: isPlaylistContentReady(),
        hasContainer: Boolean(document.querySelector('#playlist-search-container')),
    });

    if (!isPlaylistPage()) return;

    // Remove any existing search interfaces
    const existingSearches = document.querySelectorAll('#playlist-search-wrapper, #playlist-search-container, #group-filters-modal, #support-modal');
    existingSearches.forEach(element => element.remove());

    // Create new interface
    createSearchInterface();

    // Add mutation observer for dynamically loaded videos using modern selectors
    const videoItems = document.querySelectorAll('yt-lockup-view-model, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer');
    if (videoItems.length > 0) {
        const firstRealVideo = Array.from(videoItems).find(v => {
            return v.querySelector('#video-title, a#video-title, yt-formatted-string#video-title, .ytLockupMetadataViewModelTitle');
        });
        if (firstRealVideo) {
            let parent = firstRealVideo.parentElement;
            for (let i = 0; i < 10; i++) {
                if (!parent || parent.id || parent.tagName.startsWith('YTD-') || 
                    parent.classList.contains('style-scope')) break;
                parent = parent.parentElement;
            }
            const videosContainer = parent || firstRealVideo.parentElement;
            const observer = new MutationObserver((mutations) => {
                const searchTerm = document.querySelector('#playlist-search-input')?.value.toLowerCase() || '';
                if (!searchTerm) return;
                const newVideos = [];
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType !== 1) return;
                            if (node.matches && node.matches('yt-lockup-view-model, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer')) {
                                newVideos.push(node);
                            }
                        });
                    }
                });
                if (newVideos.length) {
                    newVideos.forEach(item => {
                        try {
                            getVideoMeta(item);
                            const isMatch = videoMatchesSearch(item, searchTerm);
                            if (!isMatch) {
                                item.style.display = 'none';
                            }
                        } catch (error) {
                            console.error('Error processing new video:', error);
                        }
                    });
                    handleSearch();
                }
            });
            observer.observe(videosContainer, { childList: true, subtree: true });
            activeObservers.push(observer);
        }
    }
}

// Function to check if the search interface needs to be initialized
function checkAndInitialize() {
    debugPlaylistState('checkAndInitialize');
    console.log('[YPS] checkAndInitialize', {
        href: location.href,
        playlistPage: isPlaylistPage(),
        settled: isRouteSettled(),
        ready: isPlaylistContentReady(),
        hasContainer: Boolean(document.querySelector('#playlist-search-container')),
    });

    if (!isPlaylistPage()) return;

    const searchContainer = document.querySelector('#playlist-search-container');

    if (searchContainer) {
        const wrapper = document.querySelector('#playlist-search-wrapper');
        if (wrapper && wrapper.parentElement) {
            const videosNearby = wrapper.parentElement.querySelectorAll('yt-lockup-view-model, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer');
            if (videosNearby.length > 0) {
                console.log('[YPS] checkAndInitialize skip: existing container valid');
                return;
            }
        }
    }

    console.log('[YPS] checkAndInitialize call init');
    init();
}

let activeObservers = [];
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
    console.log('[YPS-DIAG] resetPlaylistUi called', { observersDisconnected: activeObservers.length, stack: new Error().stack.split('\n').slice(1, 5).join(' | ') });
    activeObservers.forEach(obs => { try { obs.disconnect(); } catch(e) {} });
    activeObservers = [];
    deactivateFilterGroups();
    document.querySelectorAll('#playlist-search-wrapper, #playlist-search-container, #group-filters-modal, #support-modal').forEach(el => el.remove());
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

function scheduleImmediatePlaylistCheck() {
    clearMountTimer();
    mountTimer = setTimeout(checkAndInitialize, 0);
}

function schedulePlaylistFallback() {
    setTimeout(() => {
        if (!document.querySelector('#playlist-search-container') && isPlaylistPage()) {
            init();
        }
    }, 2000);
}

function tryMountPlaylistUi() {
    debugPlaylistState('tryMountPlaylistUi');
    console.log('[YPS] tryMountPlaylistUi', {
        href: location.href,
        playlistPage: isPlaylistPage(),
        settled: isRouteSettled(),
        ready: isPlaylistContentReady(),
        hasContainer: Boolean(document.querySelector('#playlist-search-container')),
    });

    if (!isPlaylistPage()) {
        resetPlaylistUi();
        return;
    }

    checkAndInitialize();
}

function onRouteStart() {
    console.log('[YPS] onRouteStart', { href: location.href, playlistPage: isPlaylistPage(), settled: isRouteSettled() });
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
    console.log('[YPS] onRouteSettled', { href: location.href, playlistPage: isPlaylistPage(), settled: isRouteSettled() });
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
        console.log('[YPS] history.pushState', { href: location.href, url: args[2] || null });
        watchLocationChange();
        return result;
    };

    history.replaceState = function (...args) {
        const result = originalReplaceState(...args);
        console.log('[YPS] history.replaceState', { href: location.href, args: args[2] || null });
        watchLocationChange();
        return result;
    };

    window.addEventListener('popstate', () => {
        console.log('[YPS] popstate', { href: location.href });
        watchLocationChange();
    });
}

// Initialize only after YouTube settles on playlist route.
initThemeDetection();
patchHistoryMethods();
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

// Watch for YouTube replacing the content area during SPA navigation.
// When the content is swapped, the wrapper is destroyed — detect this
// and re-mount on the new content. (this was a pain to figure out)
(function watchForContentReplacement() {
    const contentArea = document.querySelector('#page-manager') || document.querySelector('ytd-app');
    if (!contentArea) {
        setTimeout(watchForContentReplacement, 1000);
        return;
    }
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
        if (!isPlaylistPage()) return;
        // Debounce: wait for YouTube to finish rendering
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (!document.querySelector('#playlist-search-wrapper') && isPlaylistPage()) {
                console.log('[YPS] content replaced, re-mounting', { href: location.href });
                schedulePlaylistMount(500);
            }
        }, 500);
    });
    observer.observe(contentArea, { childList: true, subtree: true });
})();
window.addEventListener('DOMContentLoaded', () => {
    if (isPlaylistPage()) {
        console.log('[YPS] DOMContentLoaded playlist', { href: location.href });
        schedulePlaylistMount(800);
    }
});
setTimeout(() => {
    if (isPlaylistPage()) {
        console.log('[YPS] delayed mount 700', { href: location.href });
        schedulePlaylistMount(800);
    }
}, 700);
setTimeout(() => {
    if (isPlaylistPage()) {
        console.log('[YPS] delayed mount 2000', { href: location.href });
        schedulePlaylistMount(800);
    }
}, 2000);
setTimeout(() => {
    if (isPlaylistPage()) {
        console.log('[YPS] delayed mount 4000', { href: location.href });
        schedulePlaylistMount(800);
    }
}, 4000);

// Guard direct init attempt after startup.
if (isPlaylistPage()) {
    console.log('[YPS] startup mount', { href: location.href });
    schedulePlaylistMount(800);
}

// Function to get total playlist count
function getPlaylistTotalCount() {
    const countText = document.querySelector('ytd-playlist-sidebar-primary-info-renderer #stats .byline-item:first-child')?.textContent
        || document.querySelector('ytd-playlist-header-renderer #stats .byline-item:first-child')?.textContent
        || document.querySelector('#stats.ytd-playlist-sidebar-primary-info-renderer .byline-item')?.textContent;
    if (countText) {
        const match = countText.match(/\d+/);
        return match ? parseInt(match[0]) : null;
    }
    return null;
}

// Function to create and insert the search interface
function createSearchInterface() {
    console.log('[YPS] createSearchInterface start', {
        href: location.href,
        playlistPage: isPlaylistPage(),
        settled: isRouteSettled(),
        ready: isPlaylistContentReady(),
    });

    if (document.querySelector('#playlist-search-container')) {
        console.log('[YPS] createSearchInterface bail: container exists', { href: location.href });
        return;
    }

    const checkForPlaylistContent = setInterval(() => {
        console.log('[YPS] createSearchInterface poll', {
            href: location.href,
            playlistPage: isPlaylistPage(),
            settled: isRouteSettled(),
            ready: isPlaylistContentReady(),
            videoCount: document.querySelectorAll('yt-lockup-view-model, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer').length,
            hasWrapper: Boolean(document.querySelector('#playlist-search-wrapper')),
            hasContainer: Boolean(document.querySelector('#playlist-search-container')),
        });

        if (!isPlaylistPage() || !isRouteSettled()) return;

        const videoItems = document.querySelectorAll('yt-lockup-view-model, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer');
        if (videoItems.length === 0) {
            console.log('[YPS] createSearchInterface bail: no video items', { href: location.href });
            return;
        }

        const firstRealVideo = Array.from(videoItems).find(video =>
            video.querySelector('#video-title, a#video-title, yt-formatted-string#video-title, .ytLockupMetadataViewModelTitle')
        );
        if (!firstRealVideo) {
            console.log('[YPS] createSearchInterface bail: no real video', { href: location.href });
            return;
        }

        if (document.querySelector('#playlist-search-container')) {
            console.log('[YPS] createSearchInterface bail: container already mounted', { href: location.href });
            return;
        }

        const rectFor = (el) => {
            const rect = el?.getBoundingClientRect?.();
            return rect ? {
                top: Math.round(rect.top),
                left: Math.round(rect.left),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
            } : null;
        };

        const videoParent = firstRealVideo.parentElement;
        if (!videoParent) return;

        let insertTarget = null;
        let candidate = firstRealVideo;
        for (let i = 0; i < 20 && candidate; i++) {
            const rect = candidate.getBoundingClientRect();
            if (rect.width >= 400 && rect.height > 0) {
                insertTarget = candidate;
                break;
            }
            candidate = candidate.parentElement;
        }
        if (!insertTarget) insertTarget = videoParent;

        if (insertTarget?.tagName === 'YTD-PAGE-MANAGER') {
            const visibleBrowse = document.querySelector('ytd-browse[page-subtype="playlist"]');
            if (visibleBrowse) {
                // Find the first real video INSIDE the visible browse (not the old hidden one)
                const allVideoItems = visibleBrowse.querySelectorAll('yt-lockup-view-model, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer');
                const visibleFirstVideo = Array.from(allVideoItems).find(v =>
                    v.querySelector('#video-title, a#video-title, yt-formatted-string#video-title, .ytLockupMetadataViewModelTitle')
                );
                if (visibleFirstVideo) {
                    insertTarget = visibleFirstVideo;
                } else {
                    insertTarget = visibleBrowse;
                }
            }
        }

        clearInterval(checkForPlaylistContent);
        document.querySelector('#playlist-search-wrapper')?.remove();
        document.querySelector('#group-filters-modal')?.remove();
        document.querySelector('#support-modal')?.remove();

        const wrapper = document.createElement('div');
        wrapper.id = 'playlist-search-wrapper';
        wrapper.setAttribute('data-yps-mounted', 'true');
        wrapper.appendChild(createSearchElement());
        const container = wrapper.querySelector('#playlist-search-container');
        if (container) container.setAttribute('data-yps-mounted', 'true');

        wrapper.style.cssText = 'background: transparent !important; position: relative !important; display: block !important; visibility: visible !important; opacity: 1 !important; min-height: 50px !important; margin-top: 12px !important; width: 100% !important; max-width: none !important; clear: both !important; box-sizing: border-box !important; overflow: visible !important;';
        if (container) {
            container.style.cssText = 'position: relative !important; display: flex !important; visibility: visible !important; opacity: 1 !important; min-height: 50px !important; width: 100% !important; max-width: none !important; box-sizing: border-box !important;';
        }

        const videoSelector = 'yt-lockup-view-model, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer';
        if (insertTarget?.matches?.(videoSelector)) {
            insertTarget.insertAdjacentElement('beforebegin', wrapper);
        } else {
            insertTarget.prepend(wrapper);
        }
        if (!wrapper.isConnected) {
            // Fallback: prepend into the video parent container
            videoParent.insertBefore(wrapper, videoParent.firstChild);
        }

        // Move modals to body so they escape YouTube's stacking context
        const modalInContainer = document.querySelector('#group-filters-modal');
        if (modalInContainer) {
            document.body.appendChild(modalInContainer);
        }
        const supportModalInContainer = document.querySelector('#support-modal');
        if (supportModalInContainer) {
            document.body.appendChild(supportModalInContainer);
        }

        console.log('[YPS] createSearchInterface insert ok', { href: location.href, target: insertTarget?.tagName || null });
        debugPlaylistState('createSearchInterface after insert');
        addSearchEventListeners();
        console.log('[YPS] createSearchInterface listeners added', { href: location.href });
        debugPlaylistState('createSearchInterface after listeners');
        const wrapperAfterInsert = document.querySelector('#playlist-search-wrapper');
        const containerAfterInsert = document.querySelector('#playlist-search-container');
        console.log('[YPS] createSearchInterface inserted nodes', {
            wrapperHtml: wrapperAfterInsert ? wrapperAfterInsert.outerHTML.slice(0, 200) : null,
            containerHtml: containerAfterInsert ? containerAfterInsert.outerHTML.slice(0, 200) : null,
        });
        setTimeout(() => {
            const currentWrapper = document.querySelector('#playlist-search-wrapper');
            const currentContainer = document.querySelector('#playlist-search-container');
            console.log('[YPS] createSearchInterface 100ms snapshot', {
                wrapperExists: Boolean(currentWrapper),
                containerExists: Boolean(currentContainer),
                wrapperHtml: currentWrapper ? currentWrapper.outerHTML.slice(0, 200) : null,
                containerHtml: currentContainer ? currentContainer.outerHTML.slice(0, 200) : null,
            });
        }, 100);
        setTimeout(() => {
            const currentWrapper = document.querySelector('#playlist-search-wrapper');
            const currentContainer = document.querySelector('#playlist-search-container');
            console.log('[YPS] createSearchInterface 500ms snapshot', {
                wrapperExists: Boolean(currentWrapper),
                containerExists: Boolean(currentContainer),
                wrapperHtml: currentWrapper ? currentWrapper.outerHTML.slice(0, 200) : null,
                containerHtml: currentContainer ? currentContainer.outerHTML.slice(0, 200) : null,
            });
        }, 500);
        setTimeout(() => {
            const currentWrapper = document.querySelector('#playlist-search-wrapper');
            const currentContainer = document.querySelector('#playlist-search-container');
            console.log('[YPS] createSearchInterface 1000ms snapshot', {
                wrapperExists: Boolean(currentWrapper),
                containerExists: Boolean(currentContainer),
                wrapperHtml: currentWrapper ? currentWrapper.outerHTML.slice(0, 200) : null,
                containerHtml: currentContainer ? currentContainer.outerHTML.slice(0, 200) : null,
            });
        }, 1000);

        const newVideoObserver = new MutationObserver((mutations) => {
            // Only re-run search when the user is actively filtering
            // otherwise touching data-match on every mutation disrupts
            // YouTube's own rendering / virtual-scroll pipeline.
            if (!hasActiveFilters()) return;
            const hasVideoAdds = mutations.some(m =>
                m.type === 'childList' && Array.from(m.addedNodes || []).some(n => {
                    if (n.nodeType !== 1) return false;
                    if (n.matches?.('yt-lockup-view-model, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer')) return true;
                    return n.querySelector?.('yt-lockup-view-model, ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer');
                })
            );
            if (!hasVideoAdds) return;
            console.log('[YPS] createSearchInterface mutation (video added, filters active)', { href: location.href });
            handleSearch();
        });

        newVideoObserver.observe(document.body, { childList: true, subtree: true });
        activeObservers.push(newVideoObserver);
        console.log('[YPS] createSearchInterface observer attached', { href: location.href });
        debugPlaylistState('createSearchInterface observer attached');

        setTimeout(() => debugPlaylistState('createSearchInterface 1s later'), 1000);
        setTimeout(() => debugPlaylistState('createSearchInterface 3s later'), 3000);
        setTimeout(() => {
            if (!document.querySelector('#playlist-search-container')) {
                console.log('[YPS] createSearchInterface container missing after 5s', { href: location.href });
            }
        }, 5000);
        setTimeout(() => {
            if (document.querySelector('#playlist-search-wrapper') && !document.querySelector('#playlist-search-container')) {
                console.log('[YPS] wrapper exists but container missing', { href: location.href });
            }
        }, 5000);
        setTimeout(() => {
            if (!document.querySelector('#playlist-search-wrapper')) {
                console.log('[YPS] wrapper removed after mount', { href: location.href });
            }
        }, 5000);
        setTimeout(() => {
            const wrapper = document.querySelector('#playlist-search-wrapper');
            if (wrapper) {
                console.log('[YPS] wrapper parent check', {
                    href: location.href,
                    parent: wrapper.parentElement?.tagName || null,
                    connected: wrapper.isConnected,
                    display: getComputedStyle(wrapper).display,
                    visibility: getComputedStyle(wrapper).visibility,
                    opacity: getComputedStyle(wrapper).opacity,
                });
            }
        }, 5000);
        setTimeout(() => {
            const container = document.querySelector('#playlist-search-container');
            if (container) {
                console.log('[YPS] container style check', {
                    href: location.href,
                    parent: container.parentElement?.tagName || null,
                    connected: container.isConnected,
                    display: getComputedStyle(container).display,
                    visibility: getComputedStyle(container).visibility,
                    opacity: getComputedStyle(container).opacity,
                });
            }
        }, 5000);
        setTimeout(() => debugPlaylistState('createSearchInterface 5s later'), 5000);
        setTimeout(() => {
            if (!document.body.contains(document.querySelector('#playlist-search-wrapper'))) {
                console.log('[YPS] wrapper no longer contained in body', { href: location.href });
            }
        }, 5000);
        setTimeout(() => {
            if (document.querySelector('#playlist-search-wrapper')) {
                console.log('[YPS] wrapper still present after 5s', { href: location.href });
            }
        }, 5000);

        setTimeout(() => {
            updateChannelFilter();
            updateYearFilter();
        }, 1000);
    }, 500);

    setTimeout(() => {
        const targetStillVisible = Boolean(
            document.querySelector('ytd-playlist-video-list-renderer')?.getBoundingClientRect?.().height > 0 ||
            document.querySelector('ytd-playlist-header-renderer')?.getBoundingClientRect?.().height > 0 ||
            document.querySelector('ytd-playlist-sidebar-primary-info-renderer')?.getBoundingClientRect?.().height > 0
        );
        if (!targetStillVisible && isPlaylistPage()) {
            console.log('[YPS] createSearchInterface timeout: target never became visible', { href: location.href });
        }
        clearInterval(checkForPlaylistContent);
    }, 30000);
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
        item.style.removeProperty('display');
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
