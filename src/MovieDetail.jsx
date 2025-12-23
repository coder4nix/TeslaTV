import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './contexts/LanguageContext';
import { useUserPreferences } from './contexts/UserPreferencesContext';
import VideoPlayer from './components/VideoPlayer';
import Breadcrumb from './components/Breadcrumb';
import { rewriteImageUrl, rewriteStreamUrl } from './utils/urlRewriter';

export default function MovieDetail({ movieId, movieCategory, userData, onBack, onTabChange }) {
  const { t } = useLanguage();
  const { isLiked, isDisliked, isInWatchlist, toggleLike, toggleDislike, toggleWatchlist } = useUserPreferences();
  const [movieInfo, setMovieInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load movie info
  useEffect(() => {
    const loadMovieInfo = async () => {
      if (!movieId || !userData) return;

      setIsLoading(true);
      setError(null);

      try {
        const playerApiUrl = '/api/player_api.php';
        const response = await axios.get(playerApiUrl, {
          params: {
            username: userData.username,
            password: userData.password,
            action: 'get_vod_info',
            vod_id: movieId
          }
        });

        if (response.data) {
          console.log('[MovieDetail] Movie info:', response.data);
          setMovieInfo(response.data);
        } else {
          setError('Film-Informationen nicht gefunden');
        }
      } catch (err) {
        console.error('[MovieDetail] Error loading movie info:', err);
        setError(err.message || 'Fehler beim Laden der Film-Informationen');
      } finally {
        setIsLoading(false);
      }
    };

    loadMovieInfo();
  }, [movieId, userData]);

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
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Zurück
          </button>
        </div>
      </div>
    );
  }

  const info = movieInfo?.info || {};
  const movie = movieInfo?.movie_data || {};

  // Build breadcrumb
  const breadcrumbItems = [
    {
      label: t.nav.movies,
      onClick: onBack
    }
  ];

  // Add category if available
  if (movieCategory) {
    breadcrumbItems.push({
      label: movieCategory,
      onClick: onBack
    });
  }

  // Add movie name
  breadcrumbItems.push({
    label: info.name || movie.name || 'Film'
  });

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} onHomeClick={onTabChange} />

      {/* Hero Banner */}
      {(info.backdrop_path || movie.stream_icon) && (
        <div className="relative w-full h-[70vh] mb-8 overflow-hidden">
          <img
            src={info.backdrop_path?.[0] || rewriteImageUrl(movie.stream_icon)}
            alt={info.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = rewriteImageUrl(movie.stream_icon) || 'https://via.placeholder.com/1920x1080/1e293b/64748b?text=No+Backdrop';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>

          {/* Movie Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-12">
            <div className="max-w-4xl">
              {/* Title */}
              <h1 className="text-6xl font-black mb-4" style={{fontFamily: 'Outfit, sans-serif'}}>
                {info.name || movie.name}
              </h1>

              {/* Meta Info */}
              <div className="flex items-center space-x-4 mb-6 text-lg">
                {info.releasedate && (
                  <span className="text-slate-300">{new Date(info.releasedate).getFullYear()}</span>
                )}
                {info.rating && (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-yellow-500 font-bold">{parseFloat(info.rating).toFixed(1)}</span>
                  </div>
                )}
                {info.duration && (
                  <span className="text-slate-300">{info.duration}</span>
                )}
                {info.genre && (
                  <span className="text-slate-300">{info.genre}</span>
                )}
              </div>

              {/* Description */}
              {info.plot && (
                <p className="text-slate-300 text-lg mb-8 max-w-3xl line-clamp-3">
                  {info.plot}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsPlaying(true)}
                  className="px-6 sm:px-8 py-2.5 sm:py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-lg transition-all flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <span>{t.series.startWatching || 'Film abspielen'}</span>
                </button>

                <button
                  onClick={() => toggleLike(movieId, 'movie')}
                  className={`p-3 backdrop-blur-sm rounded-lg transition-all ${
                    isLiked(movieId, 'movie')
                      ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                      : 'bg-slate-800/50 text-white hover:bg-slate-700/50'
                  }`}
                  title={t.series.like || 'Gefällt mir'}
                >
                  <svg className="w-5 h-5" fill={isLiked(movieId, 'movie') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                </button>

                <button
                  onClick={() => toggleDislike(movieId, 'movie')}
                  className={`p-3 backdrop-blur-sm rounded-lg transition-all ${
                    isDisliked(movieId, 'movie')
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-slate-800/50 text-white hover:bg-slate-700/50'
                  }`}
                  title={t.series.dislike || 'Gefällt mir nicht'}
                >
                  <svg className="w-5 h-5" fill={isDisliked(movieId, 'movie') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                  </svg>
                </button>

                <button
                  onClick={() => toggleWatchlist(movieId, 'movie')}
                  className={`p-3 backdrop-blur-sm rounded-lg transition-all ${
                    isInWatchlist(movieId, 'movie')
                      ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                      : 'bg-slate-800/50 text-white hover:bg-slate-700/50'
                  }`}
                  title={t.series.addToWatchlist || 'Zur Merkliste hinzufügen'}
                >
                  <svg className="w-5 h-5" fill={isInWatchlist(movieId, 'movie') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Info Section */}
      <div className="max-w-7xl mx-auto px-12 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2">
            {info.plot && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4" style={{fontFamily: 'Outfit, sans-serif'}}>
                  Handlung
                </h2>
                <p className="text-slate-300 leading-relaxed">{info.plot}</p>
              </div>
            )}

            {info.cast && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4" style={{fontFamily: 'Outfit, sans-serif'}}>
                  Besetzung
                </h2>
                <p className="text-slate-300">{info.cast}</p>
              </div>
            )}

            {info.director && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4" style={{fontFamily: 'Outfit, sans-serif'}}>
                  Regie
                </h2>
                <p className="text-slate-300">{info.director}</p>
              </div>
            )}
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-1">
            {movie.stream_icon && (
              <div className="mb-6">
                <img
                  src={rewriteImageUrl(movie.stream_icon)}
                  alt={info.name}
                  className="w-full rounded-xl shadow-2xl"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/300x450/1e293b/64748b?text=No+Poster';
                  }}
                />
              </div>
            )}

            <div className="space-y-4 text-sm">
              {info.releasedate && (
                <div>
                  <span className="text-slate-500">Erscheinungsdatum:</span>
                  <p className="text-white font-medium">{new Date(info.releasedate).toLocaleDateString('de-DE')}</p>
                </div>
              )}
              {info.genre && (
                <div>
                  <span className="text-slate-500">Genre:</span>
                  <p className="text-white font-medium">{info.genre}</p>
                </div>
              )}
              {info.duration && (
                <div>
                  <span className="text-slate-500">Laufzeit:</span>
                  <p className="text-white font-medium">{info.duration}</p>
                </div>
              )}
              {info.country && (
                <div>
                  <span className="text-slate-500">Land:</span>
                  <p className="text-white font-medium">{info.country}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      {isPlaying && movieId && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                {info.name || movie.name || 'Film'}
              </h2>
              <button
                onClick={() => setIsPlaying(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <VideoPlayer
                src={`/api/movie/${userData.username}/${userData.password}/${movieId}.${movie.container_extension || 'mp4'}`}
                poster={info.backdrop_path?.[0] || movie.stream_icon}
                autoplay={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
