import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './contexts/LanguageContext';
import VideoPlayer from './components/VideoPlayer';

export default function Movies({ userData }) {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMovie, setCurrentMovie] = useState(null);
  const [player, setPlayer] = useState(null);
  const [shouldAutoFullscreen, setShouldAutoFullscreen] = useState(false);

  // Build M3U Playlist URL
  const buildPlaylistUrl = () => {
    const serverSettings = localStorage.getItem('adminServerSettings');
    if (!serverSettings || !userData) return null;

    const { serverUrl, port } = JSON.parse(serverSettings);
    const { username, password } = userData;

    let baseUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://' + baseUrl;
    }

    const fullUrl = port
      ? `${baseUrl}:${port}/playlist/${username}/${password}/m3u_plus?output=hls`
      : `${baseUrl}/playlist/${username}/${password}/m3u_plus?output=hls`;

    return fullUrl;
  };

  // Parse M3U Playlist
  const parseM3U = (m3uText) => {
    const lines = m3uText.split('\n');
    const items = [];
    let currentItem = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        currentItem = {};

        const xuiIdMatch = line.match(/xui-id="([^"]+)"/);
        if (xuiIdMatch) currentItem.xui_id = xuiIdMatch[1];

        const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
        if (tvgIdMatch) currentItem.tvg_id = tvgIdMatch[1];

        const tvgNameMatch = line.match(/tvg-name="([^"]+)"/);
        if (tvgNameMatch) currentItem.tvg_name = tvgNameMatch[1];

        const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
        if (tvgLogoMatch) currentItem.tvg_logo = tvgLogoMatch[1];

        const groupTitleMatch = line.match(/group-title="([^"]+)"/);
        if (groupTitleMatch) currentItem.group_title = groupTitleMatch[1];

        const nameMatch = line.match(/,(.+)$/);
        if (nameMatch) currentItem.name = nameMatch[1].trim();

      } else if (line && !line.startsWith('#') && currentItem) {
        currentItem.url = line;
        items.push(currentItem);
        currentItem = null;
      }
    }

    return items;
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

        // Filter for movies (VOD items - URLs ending with video extensions)
        const movieItems = allItems.filter(item => {
          const url = item.url.toLowerCase();
          return url.includes('.mp4') || url.includes('.mkv') || url.includes('.avi') ||
                 url.includes('.mov') || url.includes('.flv') || url.includes('.wmv');
        });

        // Extract unique categories from movies
        const categoryMap = new Map();
        movieItems.forEach(movie => {
          if (movie.group_title && !categoryMap.has(movie.group_title)) {
            categoryMap.set(movie.group_title, {
              category_id: movie.group_title,
              category_name: movie.group_title
            });
          }
        });

        const categoriesList = Array.from(categoryMap.values());

        // Add "All Movies" at the beginning
        setCategories([
          { category_id: null, category_name: t.movies.allMovies },
          ...categoriesList
        ]);

        setMovies(movieItems);

      } catch (error) {
        console.error('Error loading M3U playlist:', error);
        setError(error.message || 'Failed to load playlist');
      } finally {
        setIsLoading(false);
      }
    };

    loadPlaylist();
  }, [userData, t]);

  // Auto fullscreen when player is ready
  useEffect(() => {
    if (player && shouldAutoFullscreen) {
      // Small delay to ensure player is fully initialized
      const timeout = setTimeout(() => {
        try {
          if (player.requestFullscreen) {
            player.requestFullscreen();
          } else if (player.el_ && player.el_.requestFullscreen) {
            player.el_.requestFullscreen();
          }
        } catch (error) {
          console.error('Fullscreen request failed:', error);
          // Fallback to panel view if fullscreen fails
          setShouldAutoFullscreen(false);
        }
      }, 300);

      // Fallback: if fullscreen doesn't activate within 2 seconds, show panel
      const fallbackTimeout = setTimeout(() => {
        const isFullscreen = !!(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        );

        if (!isFullscreen && shouldAutoFullscreen) {
          console.log('Fullscreen did not activate, falling back to panel view');
          setShouldAutoFullscreen(false);
        }
      }, 2000);

      return () => {
        clearTimeout(timeout);
        clearTimeout(fallbackTimeout);
      };
    }
  }, [player, shouldAutoFullscreen]);

  // Close video player when exiting fullscreen (only if auto-fullscreen was active)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      // If we exit fullscreen and a movie is playing with auto-fullscreen, close the player
      if (!isFullscreen && currentMovie && shouldAutoFullscreen) {
        setCurrentMovie(null);
        setShouldAutoFullscreen(false);
        if (player) {
          player.pause();
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [currentMovie, player, shouldAutoFullscreen]);

  // Filter movies by category and search query
  const filteredMovies = movies.filter(movie => {
    const matchesSearch = movie.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         movie.tvg_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === null || movie.group_title === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Count movies per category
  const getCategoryCount = (categoryId) => {
    if (categoryId === null) return movies.length;
    return movies.filter(m => m.group_title === categoryId).length;
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
      <div className={`${currentMovie ? 'w-64' : 'w-80'} bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/30 overflow-hidden flex flex-col transition-all duration-300`}>
        <div className="p-4 border-b border-slate-800/50">
          <h2 className="text-lg font-bold text-white flex items-center" style={{fontFamily: 'Outfit, sans-serif'}}>
            <span className="text-2xl mr-2">🎬</span>
            {t.movies.categories}
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

      {/* Movies Content */}
      <div className={`${currentMovie ? 'w-96' : 'flex-1'} bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/30 overflow-hidden flex flex-col transition-all duration-300`}>
        {/* Search Header */}
        <div className="p-4 border-b border-slate-800/50">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.movies.searchPlaceholder}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 pl-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Movies Grid */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {filteredMovies.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
              <p className="font-medium text-lg">{t.movies.noResults}</p>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredMovies.map((movie, index) => (
                <div
                  key={movie.xui_id || index}
                  onClick={() => {
                    setCurrentMovie(movie);
                    setShouldAutoFullscreen(true);
                  }}
                  className="group relative bg-slate-900/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-800/30 hover:border-red-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/10 cursor-pointer"
                >
                  {/* Poster */}
                  <div className="aspect-[2/3] bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center relative overflow-hidden">
                    {movie.tvg_logo ? (
                      <img
                        src={movie.tvg_logo}
                        alt={movie.name || movie.tvg_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={movie.tvg_logo ? 'hidden absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-600/20 flex items-center justify-center' : 'absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-600/20 flex items-center justify-center'}>
                      <svg className="w-16 h-16 text-slate-700 group-hover:text-red-500 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm mb-1 truncate group-hover:text-red-400 transition-colors">
                      {movie.name || movie.tvg_name}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 truncate">
                      {movie.group_title || ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3 border-t border-slate-800/50 bg-slate-900/30">
          <p className="text-xs text-slate-500 text-center">
            {filteredMovies.length} {t.movies.moviesShowing}
          </p>
        </div>
      </div>

      {/* Hidden VideoPlayer for auto-fullscreen */}
      {currentMovie && shouldAutoFullscreen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 99999 }}>
          <VideoPlayer
            src={currentMovie.url}
            poster={currentMovie.tvg_logo}
            autoplay={true}
            onReady={(playerInstance) => {
              setPlayer(playerInstance);
            }}
          />
        </div>
      )}

      {/* Video Player Panel - Visible when NOT in auto-fullscreen mode */}
      {currentMovie && !shouldAutoFullscreen && (
        <div className="flex-1 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/30 overflow-hidden flex flex-col">
          {/* Player Header */}
          <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {currentMovie.tvg_logo && (
                <img
                  src={currentMovie.tvg_logo}
                  alt={currentMovie.name}
                  className="w-12 h-12 rounded-lg object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <div>
                <h2 className="text-lg font-bold text-white" style={{fontFamily: 'Outfit, sans-serif'}}>
                  {currentMovie.name || currentMovie.tvg_name}
                </h2>
                <p className="text-sm text-slate-400">{currentMovie.group_title}</p>
              </div>
            </div>
            <button
              onClick={() => setCurrentMovie(null)}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
              title="Close player"
            >
              <svg className="w-6 h-6 text-slate-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Video Player Content */}
          <div className="p-4 space-y-4">
            {/* Video Player */}
            <div className="bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <VideoPlayer
                src={currentMovie.url}
                poster={currentMovie.tvg_logo}
                autoplay={true}
                onReady={(playerInstance) => {
                  setPlayer(playerInstance);
                }}
              />
            </div>

            {/* Movie Information */}
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30 p-4">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t.movies.title || 'Film-Informationen'}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{t.movies.title || 'Titel'}</p>
                  <p className="text-sm text-white">{currentMovie.name || currentMovie.tvg_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">{t.movies.categories || 'Kategorie'}</p>
                  <p className="text-sm text-white">{currentMovie.group_title || 'N/A'}</p>
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
