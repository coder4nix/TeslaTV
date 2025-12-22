import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './contexts/LanguageContext';
import VideoPlayer from './components/VideoPlayer';

export default function LiveTV({ userData }) {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [streams, setStreams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentStream, setCurrentStream] = useState(null);
  const [player, setPlayer] = useState(null);

  // Build M3U Playlist URL
  const buildPlaylistUrl = () => {
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
      console.log(`🔒 [LiveTV] ${reason} detected - using /api/ proxy for ${serverOrigin}`);
      return `/api/playlist/${username}/${password}/m3u_plus?output=hls`;
    }

    const fullUrl = port
      ? `${baseUrl}:${port}/playlist/${username}/${password}/m3u_plus?output=hls`
      : `${baseUrl}/playlist/${username}/${password}/m3u_plus?output=hls`;

    return fullUrl;
  };

  // Rewrite URLs to use proxy for CORS/Mixed Content
  const rewriteUrlForProxy = (url) => {
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

        // Rewrite /play/ URLs
        if (urlObj.pathname.startsWith('/play/')) {
          const rewrittenUrl = urlObj.pathname + urlObj.search + urlObj.hash;
          console.log(`🔄 [LiveTV] Rewriting stream URL: ${url} → ${rewrittenUrl}`);
          return rewrittenUrl;
        }

        // Rewrite /images/ URLs
        if (urlObj.pathname.startsWith('/images/')) {
          const rewrittenUrl = urlObj.pathname + urlObj.search + urlObj.hash;
          console.log(`🔄 [LiveTV] Rewriting image URL: ${url} → ${rewrittenUrl}`);
          return rewrittenUrl;
        }
      } catch (e) {
        console.error('Error rewriting URL:', e);
      }
    }

    return url;
  };

  // Parse M3U Playlist
  const parseM3U = (m3uText) => {
    const lines = m3uText.split('\n');
    const channels = [];
    let currentChannel = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        // Parse channel info
        currentChannel = {};

        // Extract xui-id
        const xuiIdMatch = line.match(/xui-id="([^"]+)"/);
        if (xuiIdMatch) currentChannel.xui_id = xuiIdMatch[1];

        // Extract tvg-id
        const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
        if (tvgIdMatch) currentChannel.tvg_id = tvgIdMatch[1];

        // Extract tvg-name
        const tvgNameMatch = line.match(/tvg-name="([^"]+)"/);
        if (tvgNameMatch) currentChannel.tvg_name = tvgNameMatch[1];

        // Extract tvg-logo
        const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
        if (tvgLogoMatch) {
          const originalLogo = tvgLogoMatch[1];
          currentChannel.tvg_logo = rewriteUrlForProxy(originalLogo);
        }

        // Extract group-title (category)
        const groupTitleMatch = line.match(/group-title="([^"]+)"/);
        if (groupTitleMatch) currentChannel.group_title = groupTitleMatch[1];

        // Extract channel name (after last comma)
        const nameMatch = line.match(/,(.+)$/);
        if (nameMatch) currentChannel.name = nameMatch[1].trim();

      } else if (line && !line.startsWith('#') && currentChannel) {
        // This is the stream URL
        currentChannel.url = rewriteUrlForProxy(line);
        channels.push(currentChannel);
        currentChannel = null;
      }
    }

    return channels;
  };

  // Load M3U Playlist
  useEffect(() => {
    const loadPlaylist = async () => {
      if (!userData) {
        setError('No user data available');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const playlistUrl = buildPlaylistUrl();
        if (!playlistUrl) {
          setError('Server nicht konfiguriert');
          setIsLoading(false);
          return;
        }

        // Load M3U playlist
        const response = await axios.get(playlistUrl, {
          timeout: 15000,
          responseType: 'text'
        });

        // Parse M3U
        const allItems = parseM3U(response.data);

        // Filter for Live TV only (exclude VOD - files ending with video extensions)
        const channels = allItems.filter(item => {
          const url = item.url.toLowerCase();
          // Exclude VOD files (mp4, mkv, avi, etc.)
          return !url.includes('.mp4') && !url.includes('.mkv') && !url.includes('.avi') &&
                 !url.includes('.mov') && !url.includes('.flv') && !url.includes('.wmv');
        });

        // Extract unique categories
        const categoryMap = new Map();
        channels.forEach(channel => {
          if (channel.group_title && !categoryMap.has(channel.group_title)) {
            categoryMap.set(channel.group_title, {
              category_id: channel.group_title,
              category_name: channel.group_title
            });
          }
        });

        const categoriesList = Array.from(categoryMap.values());

        // Add "All Channels" at the beginning
        setCategories([
          { category_id: null, category_name: t.liveTV.allChannels },
          ...categoriesList
        ]);

        setStreams(channels);

      } catch (error) {
        console.error('Error loading M3U playlist:', error);
        setError(error.message || 'Failed to load playlist');
      } finally {
        setIsLoading(false);
      }
    };

    loadPlaylist();
  }, [userData, t]);

  // Filter streams by category and search query
  const filteredStreams = streams.filter(stream => {
    const matchesSearch = stream.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         stream.tvg_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === null || stream.group_title === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Count streams per category
  const getCategoryCount = (categoryId) => {
    if (categoryId === null) return streams.length;
    return streams.filter(s => s.group_title === categoryId).length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)]">
        <div className="text-center text-red-400">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-semibold mb-2">{t.common.error}</p>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4">
      {/* Categories Sidebar */}
      <div className="w-64 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/30 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800/50">
          <h2 className="text-lg font-bold text-white flex items-center" style={{fontFamily: 'Outfit, sans-serif'}}>
            <span className="text-2xl mr-2">📂</span>
            {t.liveTV.categories}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <div className="p-2">
            {categories.map((category) => (
              <button
                key={category.category_id ?? 'all'}
                onClick={() => setSelectedCategory(category.category_id)}
                className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-all duration-200 flex items-center justify-between group ${
                  selectedCategory === category.category_id
                    ? 'bg-red-500/20 text-white border border-red-500/30'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <span className="font-medium">{category.category_name}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  selectedCategory === category.category_id
                    ? 'bg-red-500/30 text-red-300'
                    : 'bg-slate-800/50 text-slate-500 group-hover:bg-slate-700/50 group-hover:text-slate-400'
                }`}>
                  {getCategoryCount(category.category_id)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Channels List */}
      <div className={`${currentStream ? 'w-96' : 'flex-1'} bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/30 overflow-hidden flex flex-col transition-all duration-300`}>
        {/* Search Header */}
        <div className="p-4 border-b border-slate-800/50">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.liveTV.searchPlaceholder}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 pl-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <div className="p-2">
            {filteredStreams.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium">{t.liveTV.noResults}</p>
              </div>
            ) : (
              filteredStreams.map((stream, index) => (
                <button
                  key={stream.xui_id || index}
                  onClick={() => setCurrentStream(stream)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg mb-1 transition-all duration-200 hover:bg-slate-800/50 group cursor-pointer border ${
                    currentStream?.xui_id === stream.xui_id
                      ? 'border-red-500/50 bg-slate-800/50'
                      : 'border-transparent hover:border-red-500/30'
                  }`}
                >
                  {/* Channel Logo */}
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center text-3xl border border-slate-700/50 group-hover:border-red-500/30 transition-all flex-shrink-0 overflow-hidden">
                    {stream.tvg_logo ? (
                      <img
                        src={stream.tvg_logo}
                        alt={stream.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={stream.tvg_logo ? 'hidden' : 'flex'} style={{display: stream.tvg_logo ? 'none' : 'flex'}}>📺</div>
                  </div>

                  {/* Channel Info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white group-hover:text-red-400 transition-colors truncate">
                        {stream.name || stream.tvg_name}
                      </h3>
                      <span className="flex items-center gap-1 bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full border border-red-500/30 flex-shrink-0">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                        {t.liveTV.live || 'LIVE'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                      {stream.group_title || ''}
                    </p>
                  </div>

                  {/* Play Icon */}
                  <div className={`flex-shrink-0 transition-opacity ${currentStream?.xui_id === stream.xui_id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-3 border-t border-slate-800/50 bg-slate-900/30">
          <p className="text-xs text-slate-500 text-center">
            {filteredStreams.length} {t.liveTV.channelsShowing || 'channels'}
          </p>
        </div>
      </div>

      {/* Video Player */}
      {currentStream && (
        <div className="flex-1 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/30 overflow-hidden flex flex-col">
          {/* Player Header */}
          <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {currentStream.tvg_logo && (
                <img
                  src={currentStream.tvg_logo}
                  alt={currentStream.name}
                  className="w-12 h-12 rounded-lg object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <div>
                <h2 className="text-lg font-bold text-white" style={{fontFamily: 'Outfit, sans-serif'}}>
                  {currentStream.name || currentStream.tvg_name}
                </h2>
                <p className="text-sm text-slate-400">{currentStream.group_title}</p>
              </div>
            </div>
            <button
              onClick={() => setCurrentStream(null)}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
              title="Close player"
            >
              <svg className="w-6 h-6 text-slate-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Video Player Container */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <div className="p-4">
              {/* Video Player */}
              <div className="bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <VideoPlayer
                  src={currentStream.url}
                  poster={currentStream.tvg_logo}
                  autoplay={true}
                  onReady={(playerInstance) => {
                    setPlayer(playerInstance);
                  }}
                />
              </div>

              {/* Stream Information */}
              <div className="mt-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30 p-4">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t.liveTV.streamInfo}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Channel ID */}
                  <div>
                    <p className="text-xs text-slate-500 mb-1">{t.liveTV.channelId}</p>
                    <p className="text-sm text-white font-mono">{currentStream.xui_id || currentStream.tvg_id || 'N/A'}</p>
                  </div>

                  {/* EPG */}
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500 mb-1">{t.liveTV.epg}</p>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                      <p className="text-sm text-slate-400 italic">{t.liveTV.noEpgData}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgb(51 65 85);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgb(71 85 105);
        }
      `}</style>
    </div>
  );
}
