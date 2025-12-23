import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './contexts/LanguageContext';
import Breadcrumb from './components/Breadcrumb';
import { isTmdbEnabled, getMovieDetailsByName, getSeriesDetailsByName, getPosterUrl, extractYear } from './services/tmdb';
import { rewriteImageUrl } from './utils/urlRewriter';

export default function Home({ userData, isActive, onTabChange, onNavigateToSeries, onNavigateToMovie }) {
  const { t } = useLanguage();
  const [topMovies, setTopMovies] = useState([]);
  const [topSeries, setTopSeries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  // TMDB Poster Cache
  const [tmdbPosterCache, setTmdbPosterCache] = useState({});

  useEffect(() => {
    if (!isActive || hasLoaded) return;

    const loadTopContent = async () => {
      if (!userData) return;

      setIsLoading(true);

      try {
        // Load Movies from API (not from playlist to avoid series contamination)
        const playerApiUrl = '/api/player_api.php';
        const vodRes = await axios.get(playerApiUrl, {
          params: {
            username: userData.username,
            password: userData.password,
            action: 'get_vod_streams'
          }
        });

        if (Array.isArray(vodRes.data)) {
          console.log('[Home] Total VOD items from API:', vodRes.data.length);

          // Deduplicate by name AND collect all genres for each movie
          const uniqueMoviesMap = new Map();
          vodRes.data.forEach(movie => {
            const normalizedName = movie.name?.toLowerCase().trim();
            if (!normalizedName) return;

            if (!uniqueMoviesMap.has(normalizedName)) {
              // First occurrence - create movie with categories array
              uniqueMoviesMap.set(normalizedName, {
                ...movie,
                categories: movie.category_name ? [movie.category_name] : []
              });
            } else {
              const existing = uniqueMoviesMap.get(normalizedName);
              // Add category if not already present
              if (movie.category_name && !existing.categories.includes(movie.category_name)) {
                existing.categories.push(movie.category_name);
              }
              // Prefer movies with better images
              if (movie.stream_icon && !existing.stream_icon) {
                existing.stream_icon = movie.stream_icon;
              }
              // Prefer higher stream_id
              if (movie.stream_id > existing.stream_id) {
                existing.stream_id = movie.stream_id;
              }
            }
          });

          const uniqueMovies = Array.from(uniqueMoviesMap.values());
          console.log('[Home] Unique VOD items after deduplication:', uniqueMovies.length);

          // Sort by rating and get top 10
          const sortedMovies = uniqueMovies
            .filter(m => m.stream_icon || m.cover) // Only movies with images
            .sort((a, b) => {
              const ratingA = parseFloat(a.rating) || 0;
              const ratingB = parseFloat(b.rating) || 0;
              return ratingB - ratingA;
            })
            .slice(0, 10);

          console.log('[Home] Top 10 movies:', sortedMovies.length);
          setTopMovies(sortedMovies);
        }

        // Load Series from API
        const seriesRes = await axios.get(playerApiUrl, {
          params: {
            username: userData.username,
            password: userData.password,
            action: 'get_series'
          }
        });

        if (Array.isArray(seriesRes.data)) {
          console.log('[Home] Total series from API:', seriesRes.data.length);

          // Deduplicate by name AND collect all categories for each series
          const uniqueSeriesMap = new Map();
          seriesRes.data.forEach(series => {
            const normalizedName = series.name?.toLowerCase().trim();
            if (!normalizedName) return;

            if (!uniqueSeriesMap.has(normalizedName)) {
              // First occurrence - create series with categories array
              uniqueSeriesMap.set(normalizedName, {
                ...series,
                categories: series.category_id ? [series.category_id] : [],
                category_names: series.category_name ? [series.category_name] : []
              });
            } else {
              const existing = uniqueSeriesMap.get(normalizedName);
              // Add category if not already present
              if (series.category_id && !existing.categories.includes(series.category_id)) {
                existing.categories.push(series.category_id);
              }
              if (series.category_name && !existing.category_names.includes(series.category_name)) {
                existing.category_names.push(series.category_name);
              }
              // Prefer series with better cover
              if (series.cover && !existing.cover) {
                existing.cover = series.cover;
              }
              // Prefer higher series_id
              if (series.series_id > existing.series_id) {
                existing.series_id = series.series_id;
              }
            }
          });

          const uniqueSeries = Array.from(uniqueSeriesMap.values());
          console.log('[Home] Unique series after deduplication:', uniqueSeries.length);

          // Sort by rating and get top 10
          const sortedSeries = uniqueSeries
            .filter(s => s.cover) // Only series with covers
            .sort((a, b) => {
              const ratingA = parseFloat(a.rating) || 0;
              const ratingB = parseFloat(b.rating) || 0;
              return ratingB - ratingA;
            })
            .slice(0, 10);

          console.log('[Home] Top 10 series:', sortedSeries.length);
          setTopSeries(sortedSeries);
        }

        setHasLoaded(true);
      } catch (err) {
        console.error('Error loading top content:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadTopContent();
  }, [isActive, hasLoaded, userData, t]);

  // Get poster URL - prefer TMDB if available
  const getPoster = (item, type) => {
    const cacheKey = `${type}-${item.name}`;
    if (tmdbPosterCache[cacheKey]) {
      return tmdbPosterCache[cacheKey];
    }
    // Apply URL rewriting for proxy
    const localPoster = item.stream_icon || item.cover;
    return rewriteImageUrl(localPoster);
  };

  // Lazily fetch TMDB poster
  const fetchTmdbPoster = async (item, type) => {
    if (!isTmdbEnabled()) return;

    const cacheKey = `${type}-${item.name}`;
    if (tmdbPosterCache[cacheKey]) return;

    try {
      const year = extractYear(item.added || item.releaseDate) || null;
      let tmdbData = null;

      if (type === 'movie') {
        tmdbData = await getMovieDetailsByName(item.name, year, t.langCode);
      } else if (type === 'series') {
        tmdbData = await getSeriesDetailsByName(item.name, year, t.langCode);
      }

      if (tmdbData?.poster_path) {
        const posterUrl = getPosterUrl(tmdbData.poster_path, 'w500');
        setTmdbPosterCache(prev => ({
          ...prev,
          [cacheKey]: posterUrl
        }));
      }
    } catch (error) {
      console.error('[Home] Error fetching TMDB poster:', error);
    }
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

  return (
    <div className="pb-8">
      {/* Import Big Shoulders Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&display=swap');
      `}</style>

      {/* Breadcrumb */}
      <Breadcrumb items={[]} onHomeClick={onTabChange} />

      {/* Top 10 Movies */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold mb-8" style={{fontFamily: 'Outfit, sans-serif'}}>
          {t.home.topMovies || 'Günün Top 10 Filmleri'}
        </h2>
        <div className="relative">
          <div className="flex space-x-4 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pb-4">
            {topMovies.map((movie, index) => (
              <div
                key={movie.stream_id}
                onClick={() => onNavigateToMovie?.(movie.stream_id)}
                className="relative flex-shrink-0 cursor-pointer group w-56"
              >
                {/* Movie Cover */}
                <div className="relative rounded-xl overflow-hidden shadow-2xl group-hover:scale-105 transition-transform">
                  {(() => {
                    const posterUrl = getPoster(movie, 'movie');
                    if (isTmdbEnabled()) {
                      fetchTmdbPoster(movie, 'movie');
                    }
                    return (
                      <img
                        src={posterUrl}
                        alt={movie.name}
                        className="w-full h-80 object-cover"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/300x450/1e293b/64748b?text=No+Image';
                        }}
                      />
                    );
                  })()}

                  {/* Ranking Number - Bottom Left */}
                  <div className="absolute bottom-2 left-2 z-20">
                    <span className="text-7xl font-black leading-none block" style={{
                      fontFamily: '"Big Shoulders Display", "Impact", sans-serif',
                      color: 'rgba(249, 115, 22, 0.35)',
                      WebkitTextStroke: '1.5px rgba(255, 255, 255, 0.9)',
                      textShadow: '0 0 20px rgba(249, 115, 22, 0.5), 3px 3px 8px rgba(0, 0, 0, 0.8)',
                      filter: 'drop-shadow(0 0 12px rgba(249, 115, 22, 0.6))'
                    }}>
                      {index + 1}
                    </span>
                  </div>

                  {/* Rating Badge - Bottom Right */}
                  {movie.rating && (
                    <div className="absolute bottom-2 right-2 z-20 bg-black/70 rounded-md px-2 py-1 flex items-center">
                      <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-yellow-500 text-sm font-bold">{parseFloat(movie.rating).toFixed(1)}</span>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-white font-bold text-base line-clamp-2 mb-1">{movie.name}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 10 Series */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold mb-8" style={{fontFamily: 'Outfit, sans-serif'}}>
          {t.home.topSeries || 'Günün Top 10 Dizileri'}
        </h2>
        <div className="relative">
          <div className="flex space-x-4 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pb-4">
            {topSeries.map((series, index) => (
              <div
                key={series.series_id}
                onClick={() => onNavigateToSeries?.(series.series_id)}
                className="relative flex-shrink-0 cursor-pointer group w-56"
              >
                {/* Series Cover */}
                <div className="relative rounded-xl overflow-hidden shadow-2xl group-hover:scale-105 transition-transform">
                  {(() => {
                    const posterUrl = getPoster(series, 'series');
                    if (isTmdbEnabled()) {
                      fetchTmdbPoster(series, 'series');
                    }
                    return (
                      <img
                        src={posterUrl}
                        alt={series.name}
                        className="w-full h-80 object-cover"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/300x450/1e293b/64748b?text=No+Image';
                        }}
                      />
                    );
                  })()}

                  {/* Ranking Number - Bottom Left */}
                  <div className="absolute bottom-2 left-2 z-20">
                    <span className="text-7xl font-black leading-none block" style={{
                      fontFamily: '"Big Shoulders Display", "Impact", sans-serif',
                      color: 'rgba(249, 115, 22, 0.35)',
                      WebkitTextStroke: '1.5px rgba(255, 255, 255, 0.9)',
                      textShadow: '0 0 20px rgba(249, 115, 22, 0.5), 3px 3px 8px rgba(0, 0, 0, 0.8)',
                      filter: 'drop-shadow(0 0 12px rgba(249, 115, 22, 0.6))'
                    }}>
                      {index + 1}
                    </span>
                  </div>

                  {/* Rating Badge - Bottom Right */}
                  {series.rating && (
                    <div className="absolute bottom-2 right-2 z-20 bg-black/70 rounded-md px-2 py-1 flex items-center">
                      <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-yellow-500 text-sm font-bold">{parseFloat(series.rating).toFixed(1)}</span>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-white font-bold text-base line-clamp-2 mb-1">{series.name}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
