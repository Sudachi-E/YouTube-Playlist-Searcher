# YouTube Playlist Search Extension

A powerful **Chrome/Firefox/Edge** extension that enhances YouTube playlists with advanced search, filtering, and organization capabilities. Perfect for managing and navigating large playlists efficiently.

## Features

### Core Search & Filter
- **Real-time Search**
  - Instant filtering as you type
  - Search in video titles and/or channel names
  - Case-insensitive matching
  - Clear results count with filter details
  - One-click reset for all filters

### Smart Filtering System
1. **Channel Filter**
   - Dynamic dropdown with all channels in playlist
   - Auto-updates as videos load
   - Case-insensitive matching

2. **Year Filter**
   - Filter by upload year
   - Supports both absolute years and relative dates
   - Auto-populated and sorted

3. **Views Filter**
   - Predefined ranges from "Under 1K" to "1B+"
   - Easy-to-use dropdown selection
   - Covers all common view count ranges

4. **Duration Filter**
   - Ranges from "Under 1 minute" to "Over 1 hour"
   - Quick access to common duration ranges
   - Perfect for finding specific video lengths

### Group Filters
- **Create Custom Filter Groups**
  - Keywords Groups: Filter by multiple terms
  - Channel Groups: Filter by multiple channels
  
- **Modern Channel Selection**
  - Visual checkbox interface
  - Search through available channels
  - Quick multi-select capability
  - Pre-selection when editing groups

- **Group Management**
  - Toggle groups on/off
  - Edit existing groups
  - Delete unwanted groups
  - Persistent storage across sessions

### Smart Auto-Scroll
- Remembers your preference
- Only activates with active filters
- Visual status indication
- Intelligent loading detection
- Automatic pause when complete

### Playback Features
- "Play Filtered" for matching videos
- Creates temporary filtered playlist
- Supports right-click/middle-click
- Dynamic URL updates

## Installation

1. Download/clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the extension folder
6. Ready to use on any YouTube playlist!

## Usage

### Basic Search
1. Go to any YouTube playlist
2. Use the search box to find videos
3. Toggle title/channel name search with checkboxes
4. Clear results with one click

### Using Filters
- **Channel Filter**: Select from available channels
- **Year Filter**: Choose upload year
- **Views Filter**: Select view count range
- **Duration Filter**: Choose video length range

### Group Filters
1. Click "Group Filters"
2. Choose Keywords or Channels tab
3. Click "Add Group"
4. For Keywords:
   - Enter group name
   - Add comma-separated keywords
5. For Channels:
   - Enter group name
   - Use visual selector to choose channels
   - Search to find specific channels
   - Check desired channels
   - Click Confirm
6. Toggle groups as needed

### Auto-Scroll
- Click the Auto-Scroll toggle
- Watch as it loads all playlist videos
- Filter results update automatically
- Setting persists across sessions

### Playing Filtered Results
- Click "Play Filtered" to watch matches
- Opens as a new temporary playlist
- Right-click for more options
- Updates as filters change

## Technical Details

- Built for Chrome using Manifest V3
- Uses local storage for preferences
- Supports YouTube's SPA navigation
- Maintains YouTube's native styling
- Works with both light/dark themes
- Efficient real-time filtering
- Smart resource management

## Requirements

- Google Chrome browser
- YouTube playlist access
- Local storage enabled 
