import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './contexts/LanguageContext';
import { useUserPreferences } from './contexts/UserPreferencesContext';
import VideoPlayer from './components/VideoPlayer';
import Breadcrumb from './components/Breadcrumb';
import { isTmdbEnabled, getSeriesDetailsByName, getSeasonDetails, getBackdropUrl, getPosterUrl, extractYear } from './services/tmdb';
import { rewriteImageUrl } from './utils/urlRewriter';

export default function SeriesDetail({ seriesId, userData, onBack, onTabChange }) {
  const { t } = useLanguage();
  const { isLiked, isDisliked, isInWatchlist, toggleLike, toggleDislike, toggleWatchlist } = useUserPreferences();
  const [seriesInfo, setSeriesInfo] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentEpisode, setCurrentEpisode] = useState(null);

  // TMDB Data
  const [tmdbData, setTmdbData] = useState(null);
  const [tmdbSeasonData, setTmdbSeasonData] = useState({});

  // Fetch TMDB data for series
  const fetchTmdbData = async (seriesInfo) => {
    try {
      // Extract series name and year from seriesInfo
      const seriesName = seriesInfo.name || seriesInfo.title;
      const year = seriesInfo.year || extractYear(seriesInfo.releaseDate);

      console.log(`[SeriesDetail] Fetching TMDB data for: ${seriesName} (${year || 'no year'})`);

      // Get series details from TMDB
      const tmdbSeries = await getSeriesDetailsByName(seriesName, year, t.langCode);

      if (tmdbSeries) {
        console.log('[SeriesDetail] TMDB data fetched successfully:', tmdbSeries);
        setTmdbData(tmdbSeries);

        // Fetch season data for each season
        if (tmdbSeries.seasons) {
          tmdbSeries.seasons.forEach(async (season) => {
            if (season.season_number > 0) { // Skip special seasons (0)
              const seasonData = await getSeasonDetails(tmdbSeries.id, season.season_number, t.langCode);
              if (seasonData) {
                setTmdbSeasonData(prev => ({
                  ...prev,
                  [season.season_number]: seasonData
                }));
              }
            }
          });
        }
      } else {
        console.log('[SeriesDetail] No TMDB match found for:', seriesName);
      }
    } catch (error) {
      console.error('[SeriesDetail] Error fetching TMDB data:', error);
    }
  };

  // Load series info
  useEffect(() => {
    const loadSeriesInfo = async () => {
      if (!seriesId || !userData) return;

      setIsLoading(true);
      setError(null);

      try {
        // Try XStreamCodes player_api.php format
        const playerApiUrl = '/api/player_api.php';

        const response = await axios.get(playerApiUrl, {
          params: {
            username: userData.username,
            password: userData.password,
            action: 'get_series_info',
            series_id: seriesId
          }
        });

        console.log('[SeriesDetail] API response:', response.data);
        console.log('[SeriesDetail] Series info:', response.data?.info);
        console.log('[SeriesDetail] Available image fields:', {
          backdrop_path: response.data?.info?.backdrop_path,
          cover: response.data?.info?.cover,
          cover_big: response.data?.info?.cover_big,
          movie_image: response.data?.info?.movie_image
        });

        if (response.data?.info && response.data?.episodes) {
          setSeriesInfo(response.data);

          // Select first season by default
          const seasons = Object.keys(response.data.episodes).sort((a, b) => parseInt(a) - parseInt(b));
          if (seasons.length > 0) {
            setSelectedSeason(seasons[0]);
            // Log first episode to see available image fields
            const firstEpisode = response.data.episodes[seasons[0]]?.[0];
            console.log('[SeriesDetail] First episode sample:', firstEpisode);
            console.log('[SeriesDetail] Episode image fields:', {
              movie_image: firstEpisode?.movie_image,
              'info.movie_image': firstEpisode?.info?.movie_image,
              cover_big: firstEpisode?.cover_big,
              'info.cover_big': firstEpisode?.info?.cover_big,
              cover: firstEpisode?.cover,
              'info.cover': firstEpisode?.info?.cover
            });
          }

          // Fetch TMDB data if enabled
          if (isTmdbEnabled()) {
            console.log('[SeriesDetail] TMDB is enabled, fetching data...');
            fetchTmdbData(response.data.info);
          }
        } else {
          throw new Error('Keine Serien-Informationen gefunden');
        }
      } catch (err) {
        console.error('Error loading series info:', err);
        setError(err.message || 'Fehler beim Laden der Serie');
      } finally {
        setIsLoading(false);
      }
    };

    loadSeriesInfo();
  }, [seriesId, userData]);

  // Build episode stream URL
  const buildEpisodeUrl = (episodeId) => {
    if (!userData) return null;

    const { username, password } = userData;

    // Use proxy for CORS - XStreamCodes format
    return `/api/series/${username}/${password}/${episodeId}.mkv`;
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
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            Zurück
          </button>
        </div>
      </div>
    );
  }

  const seasons = seriesInfo ? Object.keys(seriesInfo.episodes).sort((a, b) => parseInt(a) - parseInt(b)) : [];
  const episodes = selectedSeason && seriesInfo ? seriesInfo.episodes[selectedSeason] : [];

  // Build breadcrumb
  const breadcrumbItems = [
    { label: t.nav.series, onClick: onBack },
    { label: seriesInfo?.info?.name || 'Loading...' }
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <Breadcrumb items={breadcrumbItems} onHomeClick={onTabChange} />
      </div>

      {/* Hero Banner */}
      {seriesInfo?.info && (
        <div className="relative w-full h-[70vh] mb-8 overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            {/* Try multiple image sources with fallback */}
            {(() => {
              // Prefer TMDB backdrop if available
              let imageUrl = null;

              if (tmdbData?.backdrop_path) {
                imageUrl = getBackdropUrl(tmdbData.backdrop_path, 'w1280');
                console.log('[SeriesDetail] Using TMDB backdrop:', imageUrl);
              } else {
                // Fallback to local server images
                const imageSources = [
                  seriesInfo.info.backdrop_path?.[0],
                  seriesInfo.info.backdrop_path,
                  seriesInfo.info.cover_big,
                  seriesInfo.info.cover,
                  seriesInfo.info.movie_image
                ];

                for (const source of imageSources) {
                  imageUrl = rewriteImageUrl(source);
                  if (imageUrl) break;
                }
              }

              return imageUrl ? (
                <img
                  src={imageUrl}
                  alt={seriesInfo.info.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.log('[SeriesDetail] Header image failed to load:', e.target.src);
                    e.target.style.display = 'none';
                  }}
                />
              ) : null;
            })()}
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-transparent to-transparent"></div>
          </div>

          {/* Content */}
          <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col justify-end pb-12">
            {/* Series Title */}
            <h1 className="text-6xl font-bold mb-4 drop-shadow-lg" style={{fontFamily: 'Outfit, sans-serif'}}>
              {seriesInfo.info.name}
            </h1>

            {/* Metadata */}
            <div className="flex items-center space-x-4 mb-4">
              {seriesInfo.info.releaseDate && (
                <span className="text-slate-300">{new Date(seriesInfo.info.releaseDate).getFullYear()}</span>
              )}
              {seriesInfo.info.genre && (
                <span className="text-slate-300">{seriesInfo.info.genre}</span>
              )}
              {seasons.length > 0 && (
                <span className="text-slate-300">{seasons.length} Sezon</span>
              )}
              {seriesInfo.info.rating && (
                <div className="flex items-center space-x-1">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-white font-medium">{seriesInfo.info.rating}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {seriesInfo.info.plot && (
              <p className="text-slate-300 max-w-2xl mb-6 line-clamp-3">
                {seriesInfo.info.plot}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  // Auto-start with Season 1, Episode 1
                  if (seasons.length > 0) {
                    const firstSeason = seasons[0];
                    const firstSeasonEpisodes = seriesInfo.episodes[firstSeason];
                    if (firstSeasonEpisodes && firstSeasonEpisodes.length > 0) {
                      const firstEpisode = firstSeasonEpisodes[0];
                      const episodeName = firstEpisode.title || `Episode 1`;
                      const url = buildEpisodeUrl(firstEpisode.id);
                      if (url) {
                        setCurrentEpisode({ ...firstEpisode, url, name: episodeName });
                      }
                    }
                  }
                }}
                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-lg transition-all flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <span>{t.series.startWatching}</span>
              </button>

              <button
                onClick={() => toggleLike(seriesId, 'series')}
                className={`p-3 backdrop-blur-sm rounded-lg transition-all ${
                  isLiked(seriesId, 'series')
                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                    : 'bg-slate-800/50 text-white hover:bg-slate-700/50'
                }`}
                title={t.series.like || 'Gefällt mir'}
              >
                <svg className="w-5 h-5" fill={isLiked(seriesId, 'series') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>

              <button
                onClick={() => toggleDislike(seriesId, 'series')}
                className={`p-3 backdrop-blur-sm rounded-lg transition-all ${
                  isDisliked(seriesId, 'series')
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-slate-800/50 text-white hover:bg-slate-700/50'
                }`}
                title={t.series.dislike || 'Gefällt mir nicht'}
              >
                <svg className="w-5 h-5" fill={isDisliked(seriesId, 'series') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
              </button>

              <button
                onClick={() => toggleWatchlist(seriesId, 'series')}
                className={`p-3 backdrop-blur-sm rounded-lg transition-all ${
                  isInWatchlist(seriesId, 'series')
                    ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                    : 'bg-slate-800/50 text-white hover:bg-slate-700/50'
                }`}
                title={t.series.addToWatchlist || 'Zur Merkliste hinzufügen'}
              >
                <svg className="w-5 h-5" fill={isInWatchlist(seriesId, 'series') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6">

      {/* Tabs: Episodes, Cast, Extras */}
      <div className="flex items-center space-x-6 border-b border-slate-800 mb-6">
        <button className="px-4 py-3 text-white border-b-2 border-white font-medium">
          {t.series.episodes}
        </button>
        <button className="px-4 py-3 text-slate-400 hover:text-white border-b-2 border-transparent font-medium">
          {t.series.similarContent}
        </button>
        <button className="px-4 py-3 text-slate-400 hover:text-white border-b-2 border-transparent font-medium">
          {t.series.cast}
        </button>
        <button className="px-4 py-3 text-slate-400 hover:text-white border-b-2 border-transparent font-medium">
          {t.series.extras}
        </button>
      </div>

      {/* Season Selector */}
      <div className="flex items-center space-x-2 mb-6 overflow-x-auto">
        {seasons.map((season) => (
          <button
            key={season}
            onClick={() => setSelectedSeason(season)}
            className={`px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedSeason === season
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800/30 text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            {season}. Sezon
          </button>
        ))}
      </div>

      {/* Episodes List */}
      <div className="space-y-4">
        {episodes.map((episode, index) => {
          const episodeNumber = index + 1;
          const episodeName = episode.title || `Episode ${episodeNumber}`;
          const duration = episode.info?.duration ? `${Math.floor(parseInt(episode.info.duration) / 60)} dk` : '';

          return (
            <div
              key={episode.id}
              onClick={() => {
                const url = buildEpisodeUrl(episode.id);
                if (url) {
                  setCurrentEpisode({ ...episode, url, name: episodeName });
                }
              }}
              className="flex items-start space-x-4 p-4 bg-slate-900/30 hover:bg-slate-800/50 rounded-xl border border-slate-800/30 hover:border-slate-700/50 cursor-pointer transition-all group"
            >
              {/* Episode Thumbnail */}
              <div className="w-48 h-28 bg-slate-800 rounded-lg flex-shrink-0 overflow-hidden relative">
                {/* Try multiple image sources with priority order */}
                {(() => {
                  let episodeImageUrl = null;

                  // Try TMDB episode still first
                  if (tmdbSeasonData[selectedSeason]?.episodes) {
                    const tmdbEpisode = tmdbSeasonData[selectedSeason].episodes.find(
                      ep => ep.episode_number === episodeNumber
                    );
                    if (tmdbEpisode?.still_path) {
                      episodeImageUrl = getBackdropUrl(tmdbEpisode.still_path, 'w300');
                      console.log(`[SeriesDetail] Using TMDB episode still for S${selectedSeason}E${episodeNumber}:`, episodeImageUrl);
                    }
                  }

                  // Fallback to local server images
                  if (!episodeImageUrl) {
                    const episodeImageSources = [
                      episode.info?.movie_image,
                      episode.movie_image,
                      episode.info?.cover_big,
                      episode.cover_big,
                      episode.info?.cover,
                      episode.cover,
                      seriesInfo?.info?.backdrop_path?.[0],
                      seriesInfo?.info?.backdrop_path,
                      seriesInfo?.info?.cover_big,
                      seriesInfo?.info?.cover
                    ];

                    for (const source of episodeImageSources) {
                      episodeImageUrl = rewriteImageUrl(source);
                      if (episodeImageUrl) break;
                    }
                  }

                  return episodeImageUrl ? (
                    <img
                      src={episodeImageUrl}
                      alt={episodeName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : null;
                })()}
                {/* Fallback placeholder - always render underneath */}
                <div className="absolute inset-0 items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 flex -z-10">
                  <svg className="w-16 h-16 text-slate-700" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                {/* Play overlay on hover */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>

              {/* Episode Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white group-hover:text-red-400 transition-colors">
                    {episodeNumber}. Bölüm: {episodeName}
                  </h3>
                  {duration && (
                    <span className="text-sm text-slate-500 flex-shrink-0 ml-4">
                      {duration}
                    </span>
                  )}
                </div>
                {episode.info?.plot && (
                  <p className="text-sm text-slate-400 line-clamp-2">
                    {episode.info.plot}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Video Player Modal */}
      {currentEpisode && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                {currentEpisode.name}
              </h2>
              <button
                onClick={() => setCurrentEpisode(null)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <VideoPlayer
                src={currentEpisode.url}
                poster={currentEpisode.info?.movie_image}
                autoplay={true}
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
