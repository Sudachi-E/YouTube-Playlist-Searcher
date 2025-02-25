# YouTube Playlist Search Extension

This Chrome extension adds powerful search and filtering functionality to YouTube playlists, making it easier to find and manage videos within large playlists.

## Installation

1. Download or clone this repository to your local machine
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the folder containing the extension files
5. The extension will be installed and ready to use

## Features

### Search Functionality
- Real-time search filtering
- Search in video titles and/or channel names (toggleable via checkboxes)
- Case-insensitive matching for both search terms and channel filtering
- Auto-scrolling to load more videos during search
- Results count display with detailed filter information
- Clear button to reset all filters instantly

### Advanced Filtering
1. **Channel Filter**
   - Filter videos by specific channels
   - Case-insensitive matching (e.g., "Channel Name" matches "channel name")
   - Automatically populated with channels in the playlist
   - Updates dynamically as new videos are loaded
   - Dropdown menu for easy selection

2. **Year Filter**
   - Filter videos by upload year
   - Supports both direct years and "X years ago" format
   - Automatically populated with available years
   - Sorted newest to oldest

3. **Views Filter**
   - Filter by view count ranges:
     - 1B+ views
     - 100M-1B views
     - 10M-100M views
     - 1M-10M views
     - 100K-1M views
     - 10K-100K views
     - 1K-10K views
     - Under 1K views

4. **Duration Filter**
   - Filter videos by length:
     - Under 1 minute
     - 1-5 minutes
     - 5-10 minutes
     - 10-20 minutes
     - 20-30 minutes
     - 30-60 minutes
     - Over 1 hour

### Playback Features
- **Play Filtered**: Create and play a temporary playlist of only the filtered/matching videos
- **Right-Click Support**: Open filtered playlist in new tab via right-click or middle-click
- **Dynamic Updates**: Playlist URL updates automatically as search results change

### User Interface
- Clean, modern design that matches YouTube's aesthetic
- Responsive layout that adapts to different screen sizes
- Works seamlessly with both light and dark themes
- Real-time updates as you type
- Detailed results message showing active filters and match count
- Checkbox controls for search scope (titles/channels)

### Technical Features
- Automatic initialization on playlist pages
- Dynamic video loading detection
- Efficient search with debounced updates
- Preserves YouTube's native functionality
- Handles single-page-application navigation
- Automatic cleanup and reinitialize on page changes

## Usage

1. Navigate to any YouTube playlist page
2. The search interface will appear automatically below the playlist header
3. Use any combination of:
   - Search box to find videos by title or channel name
   - Channel dropdown to filter by specific channels
   - Year dropdown to filter by upload year
   - Views dropdown to filter by view count
   - Duration dropdown to filter by video length
4. Toggle search scope using the checkboxes for titles and channel names
5. Use the "Play Filtered" button to play matching videos:
   - Left-click to play immediately
   - Right-click to open context menu
   - Middle-click to open in new tab
6. Click "Clear" to reset all filters and show all videos

## Notes

- The extension automatically handles YouTube's dynamic loading of videos
- All filters can be used individually or combined for precise results
- The extension preserves YouTube's native styling and theme
- Search and filtering operations are case-insensitive for better usability
- You'll need to create icon files (icon48.png and icon128.png) for the extension or modify the manifest.json to remove the icons section 