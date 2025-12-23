import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const PlaylistContext = createContext();

export function usePlaylist() {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error('usePlaylist must be used within PlaylistProvider');
  }
  return context;
}

export function PlaylistProvider({ children }) {
  const [playlist, setPlaylist] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Build M3U Playlist URL
  const buildPlaylistUrl = useCallback((userData) => {
    const serverSettings = localStorage.getItem('adminServerSettings');
    if (!serverSettings || !userData) return null;

    const { serverUrl, port, accessCode } = JSON.parse(serverSettings);
    const { username, password } = userData;

    let baseUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;

    // Support relative URLs (starting with /) for proxy setup
    if (baseUrl.startsWith('/')) {
      return `${baseUrl}/playlist/${username}/${password}/m3u_plus?output=hls`;
    }

    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://' + baseUrl;
    }

    // AUTOMATIC PROXY: Use proxy for cross-origin requests or Mixed Content
    const isPageHttps = window.location.protocol === 'https:';
    const isServerHttp = baseUrl.startsWith('http://');

    // Check if server is on different origin (domain/port)
    const serverUrl_obj = new URL(port ? `${baseUrl}:${port}` : baseUrl);
    const currentOrigin = window.location.origin;
    const serverOrigin = serverUrl_obj.origin;
    const isCrossOrigin = currentOrigin !== serverOrigin;

    // Use proxy if: (1) HTTPS→HTTP (Mixed Content) OR (2) Cross-Origin (CORS)
    if ((isPageHttps && isServerHttp) || isCrossOrigin) {
      const reason = isPageHttps && isServerHttp ? 'Mixed Content' : 'CORS';
      console.log(`🔒 [PlaylistContext] ${reason} detected - using /api/ proxy for ${serverOrigin}`);
      return `/api/playlist/${username}/${password}/m3u_plus?output=hls`;
    }

    const fullUrl = port
      ? `${baseUrl}:${port}/playlist/${username}/${password}/m3u_plus?output=hls`
      : `${baseUrl}/playlist/${username}/${password}/m3u_plus?output=hls`;

    return fullUrl;
  }, []);

  // Rewrite URLs to use proxy for CORS/Mixed Content
  const rewriteUrlForProxy = useCallback((url) => {
    if (!url) return url;

    const serverSettings = localStorage.getItem('adminServerSettings');
    if (!serverSettings) return url;

    const { serverUrl, port } = JSON.parse(serverSettings);
    let baseUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;

    // Support relative URLs - already using proxy
    if (baseUrl.startsWith('/')) {
      return url;
    }

    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://' + baseUrl;
    }

    // Check if we need proxy
    const isPageHttps = window.location.protocol === 'https:';
    const isServerHttp = baseUrl.startsWith('http://');
    const serverUrlObj = new URL(port ? `${baseUrl}:${port}` : baseUrl);
    const currentOrigin = window.location.origin;
    const serverOrigin = serverUrlObj.origin;
    const isCrossOrigin = currentOrigin !== serverOrigin;

    // If proxy is needed, rewrite URLs
    if ((isPageHttps && isServerHttp) || isCrossOrigin) {
      try {
        const urlObj = new URL(url);

        // Rewrite all IPTV URLs to use /api/ proxy
        if (urlObj.pathname.startsWith('/play/')) {
          return '/api' + urlObj.pathname + urlObj.search + urlObj.hash;
        }

        if (urlObj.pathname.startsWith('/images/')) {
          return '/api' + urlObj.pathname + urlObj.search + urlObj.hash;
        }

        if (urlObj.pathname.startsWith('/live/')) {
          return '/api' + urlObj.pathname + urlObj.search + urlObj.hash;
        }

        if (urlObj.pathname.startsWith('/movie/')) {
          return '/api' + urlObj.pathname + urlObj.search + urlObj.hash;
        }

        if (urlObj.pathname.startsWith('/series/')) {
          return '/api' + urlObj.pathname + urlObj.search + urlObj.hash;
        }
      } catch (e) {
        console.error('Error rewriting URL:', e);
      }
    }

    return url;
  }, []);

  // Parse M3U Playlist
  const parseM3U = useCallback((m3uText) => {
    const lines = m3uText.split('\n');
    const items = [];
    let currentItem = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        // Parse item info
        currentItem = {};

        // Extract xui-id
        const xuiIdMatch = line.match(/xui-id="([^"]+)"/);
        if (xuiIdMatch) currentItem.stream_id = xuiIdMatch[1];

        // Extract tvg-id
        const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
        if (tvgIdMatch) currentItem.tvg_id = tvgIdMatch[1];

        // Extract tvg-name
        const tvgNameMatch = line.match(/tvg-name="([^"]+)"/);
        if (tvgNameMatch) currentItem.name = tvgNameMatch[1];

        // Extract tvg-logo
        const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
        if (tvgLogoMatch) {
          const originalLogo = tvgLogoMatch[1];
          currentItem.stream_icon = rewriteUrlForProxy(originalLogo);
        }

        // Extract group-title (category)
        const groupTitleMatch = line.match(/group-title="([^"]+)"/);
        if (groupTitleMatch) currentItem.category_name = groupTitleMatch[1];

      } else if (line && !line.startsWith('#') && currentItem) {
        // This is the stream URL - rewrite for proxy if needed
        currentItem.url = rewriteUrlForProxy(line);
        items.push(currentItem);
        currentItem = null;
      }
    }

    return items;
  }, [rewriteUrlForProxy]);

  // Load playlist (only once)
  const loadPlaylist = useCallback(async (userData) => {
    // If already loaded, return cached playlist
    if (playlist) {
      console.log('[PlaylistContext] Using cached playlist');
      return playlist;
    }

    // If currently loading, wait for it
    if (isLoading) {
      console.log('[PlaylistContext] Already loading, waiting...');
      return null;
    }

    console.log('[PlaylistContext] Loading playlist for the first time');
    setIsLoading(true);
    setError(null);

    try {
      const playlistUrl = buildPlaylistUrl(userData);
      if (!playlistUrl) {
        throw new Error('Server nicht konfiguriert');
      }

      console.log('[PlaylistContext] Fetching playlist:', playlistUrl);

      // Load complete M3U playlist
      const response = await axios.get(playlistUrl, {
        timeout: 15000,
        responseType: 'text'
      });

      console.log('[PlaylistContext] Playlist response length:', response.data.length);

      // Parse M3U
      const allItems = parseM3U(response.data);
      console.log('[PlaylistContext] Parsed all items:', allItems.length);

      setPlaylist(allItems);
      setIsLoading(false);
      return allItems;
    } catch (err) {
      console.error('[PlaylistContext] Error loading playlist:', err);
      setError(err.message || 'Failed to load playlist');
      setIsLoading(false);
      return null;
    }
  }, [playlist, isLoading, buildPlaylistUrl, parseM3U]);

  // Filter playlist by type
  // Accepts optional playlistData parameter to use instead of state
  const filterByType = useCallback((type, playlistData = null) => {
    const data = playlistData || playlist;
    if (!data) return [];

    // DEBUG: Log first 3 URLs to see their format
    if (data.length > 0 && playlistData) {
      console.log('[PlaylistContext] Sample URLs:', data.slice(0, 3).map(item => item.url));
    }

    switch (type) {
      case 'live':
        // URLs ending with /m3u8 and not containing video file extensions
        return data.filter(item => {
          const url = item.url.toLowerCase();
          return url.includes('/m3u8') &&
                 !url.includes('#.mp4') &&
                 !url.includes('#.mkv') &&
                 !url.includes('#.avi') &&
                 !url.includes('#.mov');
        });

      case 'movies':
        // URLs containing #.mp4
        const movies = data.filter(item => {
          const url = item.url.toLowerCase();
          const isMovie = url.includes('#.mp4');
          return isMovie;
        });
        console.log('[PlaylistContext] Movies filter: found', movies.length, 'out of', data.length, 'items');
        if (movies.length > 0) {
          console.log('[PlaylistContext] Sample movie:', {
            name: movies[0].name,
            url: movies[0].url,
            stream_icon: movies[0].stream_icon
          });
        }
        return movies;

      case 'series':
        // URLs containing #.mkv
        const series = data.filter(item => {
          const url = item.url.toLowerCase();
          const isSeries = url.includes('#.mkv');
          return isSeries;
        });
        console.log('[PlaylistContext] Series filter: found', series.length, 'out of', data.length, 'items');
        return series;

      default:
        return data;
    }
  }, [playlist]);

  const value = {
    playlist,
    isLoading,
    error,
    loadPlaylist,
    filterByType
  };

  return (
    <PlaylistContext.Provider value={value}>
      {children}
    </PlaylistContext.Provider>
  );
}
