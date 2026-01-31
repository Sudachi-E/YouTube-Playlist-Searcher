// YouTube theme detection
function detectYouTubeTheme() {
    // Check for dark theme indicators
    const html = document.documentElement;
    const body = document.body;
    
    // Method 1: Check for dark attribute on html element
    if (html.hasAttribute('dark') || html.getAttribute('dark') === '' || html.getAttribute('dark') === 'true') {
        return 'dark';
    }
    
    // Method 2: Check for dark theme class on body
    if (body.classList.contains('dark-theme') || body.classList.contains('dark')) {
        return 'dark';
    }
    
    // Method 3: Check computed background color of YouTube's main content
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
    
    console.log('Applying theme:', theme); // Debug log
    
    if (container) {
        container.setAttribute('data-theme', theme);
        console.log('Applied theme to container:', container); // Debug log
    }
    if (modal) {
        modal.setAttribute('data-theme', theme);
        console.log('Applied theme to modal:', modal); // Debug log
    } else {
        console.log('Modal not found when applying theme'); // Debug log
    }
    if (channelDialog) {
        channelDialog.setAttribute('data-theme', theme);
        console.log('Applied theme to channel dialog:', channelDialog); // Debug log
    }
}

function initThemeDetection() {
    // Initial theme detection
    const currentTheme = detectYouTubeTheme();
    applyThemeToExtension(currentTheme);
    
    // Watch for theme changes
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
    return window.location.href.includes('/playlist?list=');
}

function getVideoItems() {
    return document.querySelectorAll('ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer');
}

function getTitleText(video) {
    const titleEl = video.querySelector('#video-title')
        || video.querySelector('a#video-title')
        || video.querySelector('yt-formatted-string#video-title');
    return (titleEl?.textContent || '').toLowerCase();
}

function getChannelNameText(video) {
    const channelEl = video.querySelector('ytd-channel-name#channel-name a')
        || video.querySelector('#channel-name a')
        || video.querySelector('a[href^="/@"]');
    return (channelEl?.textContent || '').trim();
}

const videoMetaCache = new WeakMap();

function computeVideoMeta(video) {
    const titleLower = getTitleText(video);
    const channelLower = getChannelNameText(video).toLowerCase();
    const spans = video.querySelectorAll('ytd-video-meta-block #metadata-line span, #video-info span');
    const viewsSpan = Array.from(spans).find(s => /views?/i.test(s.textContent));
    const viewsCount = viewsSpan ? parseViewCount(viewsSpan.textContent) : 0;
    const dateSpan = Array.from(spans).find(s => /(\d{4})|(\d+)\s+years?\s+ago/i.test(s.textContent));
    let yearStr = '';
    if (dateSpan) {
        const m = dateSpan.textContent.trim().match(/(\d{4})|(\d+)\s+years?\s+ago/i);
        if (m) {
            const currentYear = new Date().getFullYear();
            const y = m[1] ? parseInt(m[1]) : currentYear - parseInt(m[2]);
            yearStr = String(y);
        }
    }
    let durationSec = 0;
    const overlay = video.querySelector('ytd-thumbnail-overlay-time-status-renderer');
    if (overlay) {
        const raw = (overlay.textContent || '').trim();
        const match = raw.match(/\d{1,2}:\d{2}(?::\d{2})?/);
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
            <a id="play-filtered-button" href="#" style="display: none;">Play Filtered</a>
        </div>
        <div class="search-options">
            <label><input type="checkbox" id="search-title" checked> Search in titles</label>
            <label><input type="checkbox" id="search-channel" checked> Search in channel names</label>
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
    const linkEl = videoElement.querySelector('a[href*="watch"], a#thumbnail');
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
    
    // Get unique years
    const years = new Set();
    videos.forEach(video => {
        const dateSpans = video.querySelectorAll('ytd-video-meta-block #metadata-line span, #video-info span');
        Array.from(dateSpans).forEach(span => {
            const dateText = span.textContent.trim();
            const yearMatch = dateText.match(/(\d{4})|(\d+)\s+years?\s+ago/);
            if (yearMatch) {
                const currentYear = new Date().getFullYear();
                const year = yearMatch[1] ? parseInt(yearMatch[1]) : currentYear - parseInt(yearMatch[2]);
                years.add(year.toString());
            }
        });
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
        
        // Close if clicking outside the content area
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
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
        console.log('Applied theme to modal on show:', currentTheme); // Debug log
        
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

    const chunkSize = 100;
    for (let start = 0; start < videoItems.length; start += chunkSize) {
        const end = Math.min(start + chunkSize, videoItems.length);
        for (let i = start; i < end; i++) {
            const item = videoItems[i];
            try {
                if (videoMatchesSearch(item, searchTerm)) {
                    item.style.removeProperty('display');
                    matchCount++;
                } else {
                    item.style.display = 'none';
                }
            } catch (error) {
                console.error('Error processing video:', error);
            }
        }
        await new Promise(resolve => requestAnimationFrame(resolve));
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
        requestAnimationFrame(() => {
            handleSearch();
            setTimeout(() => {
                updateChannelFilter();
                updateYearFilter();
            }, 200);
            scheduled = false;
        });
    });
}

// Function to initialize the extension
function init() {
    if (!isPlaylistPage()) return;
    
    // Remove any existing search interfaces
    const existingSearches = document.querySelectorAll('#playlist-search-wrapper, #playlist-search-container');
    existingSearches.forEach(element => element.remove());
    
    // Create new interface
    createSearchInterface();
    
    // Add mutation observer for new videos
    const videosContainer = document.querySelector('#contents.ytd-playlist-video-list-renderer')
        || document.querySelector('#contents.ytd-playlist-panel-renderer')
        || document.querySelector('ytd-playlist-panel-renderer #items');
    if (videosContainer) {
        const observer = new MutationObserver((mutations) => {
            const newVideos = [];
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        const tag = node.tagName;
                        if (tag === 'YTD-PLAYLIST-VIDEO-RENDERER' || tag === 'YTD-PLAYLIST-PANEL-VIDEO-RENDERER') {
                            newVideos.push(node);
                        }
                    });
                }
            });

            if (newVideos.length) {
                const searchTerm = document.querySelector('#playlist-search-input')?.value.toLowerCase() || '';
                newVideos.forEach(item => {
                    try {
                        getVideoMeta(item);
                        if (videoMatchesSearch(item, searchTerm)) {
                            item.style.removeProperty('display');
                        } else {
                            item.style.display = 'none';
                        }
                    } catch (error) {
                        console.error('Error processing new video:', error);
                    }
                });
                updateChannelFilter();
                updateYearFilter();
                handleSearch();
            }
        });

        observer.observe(videosContainer, {
            childList: true,
            subtree: true
        });
    }
}

// Function to check if the search interface needs to be initialized
function checkAndInitialize() {
    // If we're not on a playlist page, don't do anything
    if (!isPlaylistPage()) return;

    // Check if the search interface exists and is properly placed
    const searchContainer = document.querySelector('#playlist-search-container');
    const playlistContent = document.querySelector('ytd-playlist-video-list-renderer')
        || document.querySelector('ytd-playlist-panel-renderer');
    const videosContainer = document.querySelector('#contents.ytd-playlist-video-list-renderer')
        || document.querySelector('#contents.ytd-playlist-panel-renderer')
        || document.querySelector('ytd-playlist-panel-renderer #items');

    // If we're missing any required elements, try to initialize
    if (!searchContainer || !playlistContent || !videosContainer) {
        init();
        return;
    }

    // Check if the search container is in the correct location
    const isCorrectlyPlaced = searchContainer.parentElement?.id === 'playlist-search-wrapper' &&
                             searchContainer.parentElement?.parentElement === playlistContent &&
                             searchContainer.parentElement?.nextElementSibling === videosContainer;

    // If not correctly placed, reinitialize
    if (!isCorrectlyPlaced) {
        init();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme detection
    initThemeDetection();
    
    // Initial check
    checkAndInitialize();

    // Set up a mutation observer for the entire document to catch YouTube's SPA navigation
    const documentObserver = new MutationObserver((mutations) => {
        // Check if we need to initialize after any DOM changes
        checkAndInitialize();
    });

    // Observe the document for any changes that might indicate navigation
    documentObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
});

// Also try to initialize immediately in case DOMContentLoaded has already fired
checkAndInitialize();

// Handle YouTube's navigation events
window.addEventListener('yt-navigate-start', checkAndInitialize);
window.addEventListener('yt-navigate-finish', checkAndInitialize);

// Re-initialize when navigation occurs (for single-page-application behavior)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        checkAndInitialize();
    }
}).observe(document, { subtree: true, childList: true });

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
    // Check if search container already exists anywhere in the document
    if (document.querySelector('#playlist-search-container')) {
        return;
    }

    // Wait for the playlist content to be loaded
    const checkForPlaylistContent = setInterval(() => {
        // Try to find the playlist content area and the videos container
        const playlistContent = document.querySelector('ytd-playlist-video-list-renderer')
            || document.querySelector('ytd-playlist-panel-renderer');
        const videosContainer = document.querySelector('#contents.ytd-playlist-video-list-renderer')
            || document.querySelector('#contents.ytd-playlist-panel-renderer')
            || document.querySelector('ytd-playlist-panel-renderer #items');
        
        // Only proceed if we have both elements and no existing search container
        if (playlistContent && videosContainer && !document.querySelector('#playlist-search-container')) {
            clearInterval(checkForPlaylistContent);
            
            // Remove any existing wrapper
            const existingWrapper = document.querySelector('#playlist-search-wrapper');
            if (existingWrapper) {
                existingWrapper.remove();
            }
            
            const searchContainer = createSearchElement();
            const wrapper = document.createElement('div');
            wrapper.id = 'playlist-search-wrapper';
            wrapper.appendChild(searchContainer);
            
            // Insert before the videos container
            playlistContent.insertBefore(wrapper, videosContainer);
            addSearchEventListeners();
            
            // Update filters after a short delay to ensure videos are loaded
            setTimeout(() => {
                updateChannelFilter();
                updateYearFilter();
            }, 1000);
        }
    }, 500); // Check every 500ms

    // Clear interval after 10 seconds to prevent infinite checking
    setTimeout(() => clearInterval(checkForPlaylistContent), 10000);
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
        item.style.display = '';
    });
    
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
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
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
