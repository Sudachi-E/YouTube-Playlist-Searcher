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
- Search in video titles and/or channel names
- Case-insensitive matching
- Auto-scrolling to load more videos during search
- Results count display

### Advanced Filtering
1. **Channel Filter**
   - Filter videos by specific channels
   - Automatically populated with channels in the playlist
   - Updates as new videos are loaded

2. **Year Filter**
   - Filter videos by upload year
   - Supports both direct years and "X years ago" format
   - Automatically populated with available years

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

### Additional Features
- **Play Filtered**: Play only the filtered/matching videos
- **Clear Button**: Reset all filters with one click
- **Right-Click Support**: Open filtered playlist in new tab
- **Responsive Design**: Works with YouTube's light and dark themes
- **Auto-Updates**: Filters update automatically when new videos load
- **Detailed Results**: Shows comprehensive filter information in results message

## Usage

1. Go to any YouTube playlist page
2. The search interface will appear below the playlist header
3. Use the search box to find videos by title or channel name
4. Use the dropdown filters to narrow down results by:
   - Channel name
   - Upload year
   - View count
   - Video duration
5. Click "Play Filtered" to play only the matching videos
6. Use "Clear" to reset all filters

## Notes

- The extension automatically handles YouTube's dynamic loading of videos
- All filters can be used individually or combined
- The extension preserves YouTube's native styling and theme
- You'll need to create icon files (icon48.png and icon128.png) for the extension or modify the manifest.json to remove the icons section 