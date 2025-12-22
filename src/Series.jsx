import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './contexts/LanguageContext';
import VideoPlayer from './components/VideoPlayer';

export default function Series({ userData }) {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [series, setSeries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Multi-view states
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'seasons' | 'episodes'
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [seriesDetails, setSeriesDetails] = useState(null);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [player, setPlayer] = useState(null);

  // Build API URL
  const buildApiUrl = () => {
    const serverSettings = localStorage.getItem('adminServerSettings');
    if (!serverSettings || !userData) return null;

    const { serverUrl, port, accessCode } = JSON.parse(serverSettings);

    if (import.meta.env.DEV) {
      return `/api/${accessCode}/`;
    }

    let baseUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;

    // Support relative URLs (starting with /) for proxy setup
    if (baseUrl.startsWith('/')) {
      return `${baseUrl}/${accessCode}/`;
    }

    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://' + baseUrl;
    }

    // AUTOMATIC PROXY: Use proxy for cross-origin requests or Mixed Content
    const isPageHttps = window.location.protocol === 'https:';
    const isServerHttp = baseUrl.startsWith('http://');

    // Check if server is on different origin (domain/port)
    const serverUrlObj = new URL(port ? `${baseUrl}:${port}` : baseUrl);
    const currentOrigin = window.location.origin;
    const serverOrigin = serverUrlObj.origin;
    const isCrossOrigin = currentOrigin !== serverOrigin;

    // Use proxy if: (1) HTTPS→HTTP (Mixed Content) OR (2) Cross-Origin (CORS)
    if ((isPageHttps && isServerHttp) || isCrossOrigin) {
      const reason = isPageHttps && isServerHttp ? 'Mixed Content' : 'CORS';
      console.log(`🔒 [Series] ${reason} detected - using /api/ proxy for ${serverOrigin}`);
      return `/api/${accessCode}/`;
    }

    return port ? `${baseUrl}:${port}/${accessCode}/` : `${baseUrl}/${accessCode}/`;
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

        // Rewrite /images/ URLs
        if (urlObj.pathname.startsWith('/images/')) {
          const rewrittenUrl = urlObj.pathname + urlObj.search + urlObj.hash;
          console.log(`🔄 [Series] Rewriting image URL: ${url} → ${rewrittenUrl}`);
          return rewrittenUrl;
        }

        // Rewrite /play/ URLs (for episodes)
        if (urlObj.pathname.startsWith('/play/')) {
          const rewrittenUrl = urlObj.pathname + urlObj.search + urlObj.hash;
          console.log(`🔄 [Series] Rewriting stream URL: ${url} → ${rewrittenUrl}`);
          return rewrittenUrl;
        }
      } catch (e) {
        console.error('Error rewriting URL:', e);
      }
    }

    return url;
  };

  // Load series details (seasons and episodes)
  const loadSeriesDetails = async (seriesId) => {
    try {
      const apiUrl = buildApiUrl();
      if (!apiUrl) return;

      const serverSettings = JSON.parse(localStorage.getItem('adminServerSettings'));

      const response = await axios.get(apiUrl, {
        params: {
          api_key: serverSettings.apiKey,
          action: 'get_series_info',
          series_id: seriesId
        },
        timeout: 10000
      });

      if (response.data && response.data.status === 'STATUS_SUCCESS') {
        const details = response.data.data;

        // Process episodes and rewrite cover/backdrop URLs
        if (details.episodes) {
          Object.keys(details.episodes).forEach(seasonNum => {
            details.episodes[seasonNum] = details.episodes[seasonNum].map(episode => ({
              ...episode,
              info: {
                ...episode.info,
                movie_image: episode.info?.movie_image ? rewriteUrlForProxy(episode.info.movie_image) : null
              }
            }));
          });
        }

        // Rewrite info cover/backdrop
        if (details.info) {
          details.info.cover = details.info.cover ? rewriteUrlForProxy(details.info.cover) : null;
          details.info.backdrop_path = details.info.backdrop_path ? rewriteUrlForProxy(details.info.backdrop_path) : null;
        }

        setSeriesDetails(details);
      }
    } catch (error) {
      console.error('Error loading series details:', error);
    }
  };

  // Load categories and series from API
  useEffect(() => {
    const loadData = async () => {
      if (!userData) {
        setError('No user data available');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const apiUrl = buildApiUrl();
        if (!apiUrl) {
          setError('Server nicht konfiguriert');
          setIsLoading(false);
          return;
        }

        const serverSettings = JSON.parse(localStorage.getItem('adminServerSettings'));

        // Load series categories
        const categoriesResponse = await axios.get(apiUrl, {
          params: {
            api_key: serverSettings.apiKey,
            action: 'get_series_categories'
          },
          timeout: 10000
        });

        if (categoriesResponse.data && categoriesResponse.data.status === 'STATUS_SUCCESS') {
          const cats = categoriesResponse.data.data || [];
          setCategories([
            { category_id: null, category_name: t.series.allSeries, parent_id: 0 },
            ...cats
          ]);
        }

        // Load series
        const seriesResponse = await axios.get(apiUrl, {
          params: {
            api_key: serverSettings.apiKey,
            action: 'get_series'
          },
          timeout: 10000
        });

        if (seriesResponse.data && seriesResponse.data.status === 'STATUS_SUCCESS') {
          const seriesData = seriesResponse.data.data || [];
          // Rewrite cover image URLs to use proxy
          const seriesWithRewrittenUrls = seriesData.map(show => ({
            ...show,
            cover: show.cover ? rewriteUrlForProxy(show.cover) : show.cover
          }));
          setSeries(seriesWithRewrittenUrls);
        }

      } catch (error) {
        console.error('Error loading series data:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userData, t]);

  // Filter series by category and search query
  const filteredSeries = series.filter(show => {
    const matchesSearch = show.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === null || show.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Count series per category
  const getCategoryCount = (categoryId) => {
    if (categoryId === null) return series.length;
    return series.filter(s => s.category_id === categoryId).length;
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
      <div className="w-80 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/30 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800/50">
          <h2 className="text-lg font-bold text-white flex items-center" style={{fontFamily: 'Outfit, sans-serif'}}>
            <span className="text-2xl mr-2">📺</span>
            {t.series.categories}
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

      {/* Series Content */}
      <div className="flex-1 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/30 overflow-hidden flex flex-col">
        {/* Header with Back Button */}
        <div className="p-4 border-b border-slate-800/50">
          {viewMode !== 'grid' && (
            <button
              onClick={() => {
                if (viewMode === 'episodes') {
                  setViewMode('seasons');
                  setSelectedSeason(null);
                } else if (viewMode === 'seasons') {
                  setViewMode('grid');
                  setSelectedSeries(null);
                  setSeriesDetails(null);
                }
              }}
              className="mb-3 flex items-center text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {viewMode === 'episodes' ? 'Back to Seasons' : 'Back to Series'}
            </button>
          )}

          {viewMode === 'grid' ? (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.series.searchPlaceholder}
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 pl-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all"
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          ) : viewMode === 'seasons' && selectedSeries ? (
            <div>
              <h2 className="text-2xl font-bold text-white">{selectedSeries.name}</h2>
              {seriesDetails?.info?.plot && (
                <p className="text-sm text-slate-400 mt-2 line-clamp-2">{seriesDetails.info.plot}</p>
              )}
            </div>
          ) : viewMode === 'episodes' && selectedSeason ? (
            <div>
              <h2 className="text-2xl font-bold text-white">{selectedSeries?.name} - Season {selectedSeason}</h2>
            </div>
          ) : null}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {viewMode === 'grid' && (filteredSeries.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="font-medium text-lg">{t.series.noResults}</p>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredSeries.map((show) => (
                <div
                  key={show.series_id}
                  onClick={async () => {
                    setSelectedSeries(show);
                    await loadSeriesDetails(show.series_id);
                    setViewMode('seasons');
                  }}
                  className="group relative bg-slate-900/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-800/30 hover:border-red-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/10 cursor-pointer"
                >
                  {/* Poster */}
                  <div className="aspect-[2/3] bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center relative overflow-hidden">
                    {show.cover ? (
                      <img
                        src={show.cover}
                        alt={show.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={show.cover ? 'hidden absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-600/20 flex items-center justify-center' : 'absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-600/20 flex items-center justify-center'}>
                      <svg className="w-16 h-16 text-slate-700 group-hover:text-red-500 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    {/* Season Badge */}
                    {show.episode_run_time && (
                      <div className="absolute top-2 right-2 bg-red-500/90 text-white text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-sm">
                        {show.episode_run_time} {t.series.season || 'Season'}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm mb-1 truncate group-hover:text-red-400 transition-colors">
                      {show.name}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      {show.releaseDate && <span>{show.releaseDate}</span>}
                      {show.rating && (
                        <>
                          <span>•</span>
                          <span>⭐ {show.rating}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 truncate">
                      {categories.find(c => c.category_id === show.category_id)?.category_name || ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Seasons View */}
          {viewMode === 'seasons' && seriesDetails && seriesDetails.episodes && (
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.keys(seriesDetails.episodes).sort((a, b) => parseInt(a) - parseInt(b)).map(seasonNum => (
                <div
                  key={seasonNum}
                  onClick={() => {
                    setSelectedSeason(seasonNum);
                    setViewMode('episodes');
                  }}
                  className="group relative bg-slate-900/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-800/30 hover:border-red-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/10 cursor-pointer p-6"
                >
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">{seasonNum}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Season {seasonNum}</h3>
                    <p className="text-sm text-slate-400">{seriesDetails.episodes[seasonNum].length} Episodes</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Episodes View */}
          {viewMode === 'episodes' && selectedSeason && seriesDetails?.episodes?.[selectedSeason] && (
            <div className="p-4 space-y-3">
              {seriesDetails.episodes[selectedSeason].map((episode, index) => {
                const serverSettings = JSON.parse(localStorage.getItem('adminServerSettings') || '{}');
                const { username, password } = userData || {};
                const episodeUrl = rewriteUrlForProxy(
                  `${serverSettings.serverUrl}:${serverSettings.port || 80}/series/${username}/${password}/${episode.id}.${episode.container_extension || 'mkv'}`
                );

                return (
                  <div
                    key={episode.id || index}
                    onClick={() => setCurrentEpisode({...episode, url: episodeUrl})}
                    className="group bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/30 hover:border-red-500/50 transition-all duration-300 hover:shadow-lg cursor-pointer overflow-hidden"
                  >
                    <div className="flex gap-4 p-4">
                      {/* Episode Thumbnail */}
                      <div className="flex-shrink-0 w-40 h-24 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden relative">
                        {episode.info?.movie_image ? (
                          <img
                            src={episode.info.movie_image}
                            alt={episode.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-slate-700" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>

                      {/* Episode Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="text-xs font-semibold text-red-400">Episode {episode.episode_num}</span>
                            <h4 className="text-base font-semibold text-white group-hover:text-red-400 transition-colors truncate">
                              {episode.title}
                            </h4>
                          </div>
                          {episode.info?.duration && (
                            <span className="text-xs text-slate-500 ml-2">{episode.info.duration}</span>
                          )}
                        </div>
                        {episode.info?.plot && (
                          <p className="text-sm text-slate-400 line-clamp-2">{episode.info.plot}</p>
                        )}
                        {episode.info?.rating && (
                          <div className="mt-2 flex items-center text-xs text-slate-500">
                            <span>⭐ {episode.info.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        {viewMode === 'grid' && (
          <div className="p-3 border-t border-slate-800/50 bg-slate-900/30">
            <p className="text-xs text-slate-500 text-center">
              {filteredSeries.length} {t.series.seriesShowing}
            </p>
          </div>
        )}
      </div>

      {/* Video Player for Episodes */}
      {currentEpisode && (
        <div className="flex-1 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/30 overflow-hidden flex flex-col">
          {/* Player Header */}
          <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">{currentEpisode.title}</h3>
              <p className="text-sm text-slate-400">
                {selectedSeries?.name} - Season {selectedSeason} Episode {currentEpisode.episode_num}
              </p>
            </div>
            <button
              onClick={() => setCurrentEpisode(null)}
              className="ml-4 p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-slate-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Video Player */}
          <div className="flex-1 bg-black flex items-center justify-center">
            <VideoPlayer
              src={currentEpisode.url}
              poster={currentEpisode.info?.movie_image}
              autoplay={true}
              onReady={(playerInstance) => setPlayer(playerInstance)}
            />
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
