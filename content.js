// Function to check if we're on a playlist page
function isPlaylistPage() {
    return window.location.href.includes('/playlist?list=');
}

// Function to create search interface element
function createSearchElement() {
    const searchContainer = document.createElement('div');
    searchContainer.id = 'playlist-search-container';
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
            <button id="playlist-search-button">Search</button>
            <button id="clear-search-button">Clear</button>
            <a id="play-filtered-button" href="#" style="display: none;">Play Filtered</a>
        </div>
        <div class="search-options">
            <label><input type="checkbox" id="search-title" checked> Search in titles</label>
            <label><input type="checkbox" id="search-channel" checked> Search in channel names</label>
        </div>
        <div id="search-results-count"></div>
    `;
    return searchContainer;
}

// Function to update play filtered button URL
function updatePlayFilteredUrl() {
    const playFilteredButton = document.querySelector('#play-filtered-button');
    if (!playFilteredButton) return;

    // Get all visible (matching) videos
    const visibleVideos = Array.from(document.querySelectorAll('ytd-playlist-video-renderer'))
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
    const link = videoElement.querySelector('a#thumbnail').href;
    const match = link.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
}

// Function to update channel filter dropdown
function updateChannelFilter() {
    const channelFilter = document.querySelector('#channel-filter');
    if (!channelFilter) return;

    // Store current selection
    const currentSelection = channelFilter.value;

    // Get all videos
    const videos = document.querySelectorAll('ytd-playlist-video-renderer');
    
    // Get unique channel names
    const channels = new Set();
    videos.forEach(video => {
        const channelName = video.querySelector('#channel-name a').textContent.trim();
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
    const videos = document.querySelectorAll('ytd-playlist-video-renderer');
    
    // Get unique years
    const years = new Set();
    videos.forEach(video => {
        // Try different selectors for the upload date
        const dateElement = video.querySelector('ytd-video-meta-block #metadata-line span:last-child, #video-info span:last-child');
        if (dateElement) {
            const dateText = dateElement.textContent.trim();
            // Match year patterns like "X years ago" or "2024" or "Jan 1, 2024"
            const yearMatch = dateText.match(/(\d{4})|(\d+)\s+years?\s+ago/);
            if (yearMatch) {
                const currentYear = new Date().getFullYear();
                const year = yearMatch[1] ? 
                    parseInt(yearMatch[1]) : // Direct year match
                    currentYear - parseInt(yearMatch[2]); // "X years ago" format
                years.add(year.toString());
            }
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

// Function to check if video matches search
function videoMatchesSearch(video, searchTerm) {
    const title = video.querySelector('#video-title').textContent.toLowerCase();
    const channelName = video.querySelector('#channel-name a').textContent.toLowerCase().trim();
    const selectedChannel = document.querySelector('#channel-filter').value;
    const selectedYear = document.querySelector('#year-filter').value;
    const selectedViews = document.querySelector('#views-filter').value;
    const selectedDuration = document.querySelector('#duration-filter').value;
    
    // Check channel filter first
    if (selectedChannel && channelName !== selectedChannel.toLowerCase()) {
        return false;
    }
    
    // Check year filter
    if (selectedYear) {
        const dateElement = video.querySelector('ytd-video-meta-block #metadata-line span:last-child, #video-info span:last-child');
        if (dateElement) {
            const dateText = dateElement.textContent.trim();
            const yearMatch = dateText.match(/(\d{4})|(\d+)\s+years?\s+ago/);
            if (yearMatch) {
                const currentYear = new Date().getFullYear();
                const videoYear = yearMatch[1] ? 
                    parseInt(yearMatch[1]) : // Direct year match
                    currentYear - parseInt(yearMatch[2]); // "X years ago" format
                if (videoYear.toString() !== selectedYear) {
                    return false;
                }
            } else {
                return false;
            }
        } else {
            return false;
        }
    }
    
    // Check views filter
    if (selectedViews) {
        const viewsElement = video.querySelector('ytd-video-meta-block #metadata-line span:first-child, #video-info span:first-child');
        if (viewsElement) {
            const viewCount = parseViewCount(viewsElement.textContent);
            const [minViews, maxViews] = selectedViews.split('-').map(v => v === 'up' ? Infinity : parseInt(v));
            if (viewCount < minViews || viewCount >= maxViews) {
                return false;
            }
        } else {
            return false;
        }
    }

    // Check duration filter
    if (selectedDuration) {
        const timeElement = video.querySelector('#text.ytd-thumbnail-overlay-time-status-renderer');
        if (timeElement) {
            const duration = parseDuration(timeElement.textContent.trim());
            const [minDuration, maxDuration] = selectedDuration.split('-').map(d => d === 'up' ? Infinity : parseInt(d));
            if (duration < minDuration || duration >= maxDuration) {
                return false;
            }
        } else {
            return false;
        }
    }
    
    // If no search term, only apply filters
    if (!searchTerm.trim()) {
        return true;
    }

    const searchTitle = document.querySelector('#search-title').checked;
    const searchChannel = document.querySelector('#search-channel').checked;
    
    // If neither checkbox is checked, treat as both checked
    if (!searchTitle && !searchChannel) {
        return title.includes(searchTerm) || channelName.includes(searchTerm);
    }
    
    return (searchTitle && title.includes(searchTerm)) || 
           (searchChannel && channelName.includes(searchTerm));
}

// Function to handle the search
function handleSearch() {
    const searchTerm = document.querySelector('#playlist-search-input')?.value.toLowerCase() || '';
    const videoItems = document.querySelectorAll('ytd-playlist-video-renderer');
    const playFilteredButton = document.querySelector('#play-filtered-button');
    const selectedChannel = document.querySelector('#channel-filter')?.value || '';
    const selectedYear = document.querySelector('#year-filter')?.value || '';
    const selectedViews = document.querySelector('#views-filter')?.value || '';
    const selectedDuration = document.querySelector('#duration-filter')?.value || '';
    let matchCount = 0;

    // Check each video
    videoItems.forEach(item => {
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
    });

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

// Function to add scroll event listener
function addScrollListener() {
    // Debounce the search and channel filter update to prevent too many updates while scrolling
    const debouncedUpdate = debounce(() => {
        updateChannelFilter();
        updateYearFilter();
        handleSearch();
    }, 250);
    
    // Add scroll event listener to the window
    window.addEventListener('scroll', () => {
        // Only update if we're on a playlist page
        if (isPlaylistPage()) {
            debouncedUpdate();
        }
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
    const videosContainer = document.querySelector('#contents.ytd-playlist-video-list-renderer');
    if (videosContainer) {
        const observer = new MutationObserver((mutations) => {
            let needsUpdate = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        // Check if the added node is a video
                        if (node.tagName === 'YTD-PLAYLIST-VIDEO-RENDERER') {
                            try {
                                // Check if it matches current search/filters
                                const searchTerm = document.querySelector('#playlist-search-input')?.value.toLowerCase() || '';
                                if (!videoMatchesSearch(node, searchTerm)) {
                                    node.style.display = 'none';
                                }
                                needsUpdate = true;
                            } catch (error) {
                                console.error('Error processing new video:', error);
                            }
                        }
                    });
                }
            });

            // Update filters and counts if needed
            if (needsUpdate) {
                try {
                    updateChannelFilter();
                    updateYearFilter();
                    handleSearch(); // Update counts and filtered URL
                } catch (error) {
                    console.error('Error updating filters:', error);
                }
            }
        });

        observer.observe(videosContainer, {
            childList: true,
            subtree: true
        });
    }
}

// Initialize when page loads
init();

// Re-initialize when navigation occurs (for single-page-application behavior)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        const wasPlaylist = lastUrl.includes('/playlist?list=');
        const isPlaylist = url.includes('/playlist?list=');
        lastUrl = url;

        if (wasPlaylist && !isPlaylist) {
            // If we're navigating away from a playlist, refresh the page
            window.location.reload();
        } else {
            // Otherwise just reinitialize
            init();
        }
    }
}).observe(document, { subtree: true, childList: true });

// Function to get total playlist count
function getPlaylistTotalCount() {
    const countText = document.querySelector('ytd-playlist-sidebar-primary-info-renderer #stats .byline-item:first-child')?.textContent;
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
        const playlistContent = document.querySelector('ytd-playlist-video-list-renderer');
        const videosContainer = document.querySelector('#contents.ytd-playlist-video-list-renderer');
        
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

// Function to add event listeners to search interface
function addSearchEventListeners() {
    const searchInput = document.querySelector('#playlist-search-input');
    const searchButton = document.querySelector('#playlist-search-button');
    const clearButton = document.querySelector('#clear-search-button');
    const playFilteredButton = document.querySelector('#play-filtered-button');
    const channelFilter = document.querySelector('#channel-filter');
    const yearFilter = document.querySelector('#year-filter');
    const viewsFilter = document.querySelector('#views-filter');
    const durationFilter = document.querySelector('#duration-filter');
    const searchTitle = document.querySelector('#search-title');
    const searchChannel = document.querySelector('#search-channel');
    
    if (searchInput) {
        // Add input event with debounce
        const debouncedSearch = debounce(handleSearch, 300);
        searchInput.addEventListener('input', debouncedSearch);
    }

    if (searchButton) {
        searchButton.addEventListener('click', handleSearch);
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
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

    // Add filter change handlers
    [channelFilter, yearFilter, viewsFilter, durationFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', handleSearch);
        }
    });

    // Add checkbox change handlers
    [searchTitle, searchChannel].forEach(checkbox => {
        if (checkbox) {
            checkbox.addEventListener('change', handleSearch);
        }
    });
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
    
    // Reset input and filters
    if (searchInput) searchInput.value = '';
    if (channelFilter) channelFilter.value = '';
    if (yearFilter) yearFilter.value = '';
    if (viewsFilter) viewsFilter.value = '';
    if (durationFilter) durationFilter.value = '';
    if (searchTitle) searchTitle.checked = true;
    if (searchChannel) searchChannel.checked = true;
    
    // Show all videos
    const videoItems = document.querySelectorAll('ytd-playlist-video-renderer');
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
} 