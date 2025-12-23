import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { usePlaylist } from '../contexts/PlaylistContext';

export default function Profile({ userData, onClose, onNavigate }) {
  const { t } = useLanguage();
  const { watchlist } = useUserPreferences();
  const { loadPlaylist, filterByType } = usePlaylist();
  const [showPassword, setShowPassword] = useState(false);
  const [watchlistItems, setWatchlistItems] = useState([]);

  // Load watchlist items
  useEffect(() => {
    const loadWatchlistItems = async () => {
      if (!watchlist || watchlist.length === 0 || !userData) {
        setWatchlistItems([]);
        return;
      }

      try {
        const items = [];

        // Parse watchlist IDs (format: "type_id")
        const movieIds = watchlist
          .filter(key => key.startsWith('movie_'))
          .map(key => key.replace('movie_', ''));

        const seriesIds = watchlist
          .filter(key => key.startsWith('series_'))
          .map(key => key.replace('series_', ''));

        // Load movies from playlist
        if (movieIds.length > 0) {
          const playlistData = await loadPlaylist(userData);
          if (playlistData) {
            const movies = filterByType('movies', playlistData);
            movieIds.forEach(movieId => {
              const movie = movies.find(m => m.stream_id === movieId);
              if (movie) {
                items.push({
                  id: movieId,
                  type: 'movie',
                  name: movie.name,
                  image: movie.stream_icon || movie.cover,
                  category: movie.category_name
                });
              }
            });
          }
        }

        // Load series from API
        if (seriesIds.length > 0) {
          const playerApiUrl = '/api/player_api.php';
          const response = await axios.get(playerApiUrl, {
            params: {
              username: userData.username,
              password: userData.password,
              action: 'get_series'
            }
          });

          if (Array.isArray(response.data)) {
            seriesIds.forEach(seriesId => {
              const series = response.data.find(s => s.series_id === parseInt(seriesId));
              if (series) {
                items.push({
                  id: seriesId,
                  type: 'series',
                  name: series.name,
                  image: series.cover,
                  category: series.category
                });
              }
            });
          }
        }

        setWatchlistItems(items);
      } catch (error) {
        console.error('[Profile] Error loading watchlist items:', error);
        setWatchlistItems([]);
      }
    };

    loadWatchlistItems();
  }, [watchlist, userData, loadPlaylist, filterByType]);

  // Format expiry date
  const formatExpiryDate = (expDate) => {
    if (!expDate || expDate === null || expDate === '0') {
      return t.header.unlimited;
    }
    const date = new Date(parseInt(expDate) * 1000);
    return date.toLocaleDateString(t.langCode === 'de' ? 'de-DE' : t.langCode === 'en' ? 'en-US' : 'tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Handle item click
  const handleItemClick = (item) => {
    onClose(); // Close profile modal
    if (onNavigate) {
      if (item.type === 'movie') {
        onNavigate('movies', item.id);
      } else if (item.type === 'series') {
        onNavigate('series', item.id);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="relative h-24 bg-gradient-to-r from-red-600 via-red-500 to-orange-500">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Avatar */}
          <div className="absolute -bottom-10 left-6">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-3xl font-bold text-slate-900 border-4 border-slate-900 shadow-lg">
              {userData?.username?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-12">
          {/* User Name */}
          <h1 className="text-2xl font-bold mb-1" style={{fontFamily: 'Outfit, sans-serif'}}>
            {userData?.username}
          </h1>
          <p className="text-slate-400 mb-4 text-sm">{t.profile.title}</p>

          {/* Account Info */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
            <h2 className="text-lg font-bold mb-3 flex items-center" style={{fontFamily: 'Outfit, sans-serif'}}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {t.profile.accountInfo}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Username */}
              <div>
                <p className="text-xs text-slate-500 mb-1">{t.profile.username}</p>
                <p className="text-white font-medium">{userData?.username}</p>
              </div>

              {/* Password */}
              <div className="col-span-2">
                <p className="text-xs text-slate-500 mb-1">{t.profile.password}</p>
                <div className="flex items-center space-x-2">
                  <p className="text-white font-medium font-mono flex-1">
                    {showPassword ? userData?.password : '•'.repeat(userData?.password?.length || 12)}
                  </p>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center space-x-1.5"
                  >
                    {showPassword ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                        <span>{t.profile.hidePassword || 'Verbergen'}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>{t.profile.showPassword || 'Anzeigen'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs text-slate-500 mb-1">{t.profile.status}</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  userData?.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {userData?.status === 'active' ? t.header.statusActive : t.header.statusInactive}
                </span>
              </div>

              {/* Expiry Date */}
              <div>
                <p className="text-xs text-slate-500 mb-1">{t.profile.expiryDate}</p>
                <p className="text-white font-medium">{formatExpiryDate(userData?.expiryDate)}</p>
              </div>
            </div>
          </div>

          {/* Subscription Info */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h2 className="text-lg font-bold mb-3 flex items-center" style={{fontFamily: 'Outfit, sans-serif'}}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {t.profile.subscription}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Max Connections */}
              <div>
                <p className="text-xs text-slate-500 mb-1">{t.profile.maxConnections}</p>
                <p className="text-white font-medium text-xl">{userData?.maxConnections || 1}</p>
              </div>

              {/* Active Connections */}
              <div>
                <p className="text-xs text-slate-500 mb-1">{t.profile.activeConnections}</p>
                <p className="text-white font-medium text-xl">{userData?.activeConnections || 0}</p>
              </div>

              {/* Account Type Badges */}
              <div className="col-span-2 flex items-center gap-2 mt-2">
                {userData?.isTrial && (
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                    {t.profile.trial}
                  </span>
                )}
                {userData?.isRestreamer && (
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium">
                    {t.profile.restreamer}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Watchlist Section */}
          {watchlistItems.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-4 mt-4">
              <h2 className="text-lg font-bold mb-3 flex items-center" style={{fontFamily: 'Outfit, sans-serif'}}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {t.profile.watchlist || 'Merkliste'}
                <span className="ml-2 text-sm text-slate-400">({watchlistItems.length})</span>
              </h2>

              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {watchlistItems.map((item) => (
                  <div
                    key={`${item.type}_${item.id}`}
                    onClick={() => handleItemClick(item)}
                    className="group cursor-pointer bg-slate-900/50 rounded-lg overflow-hidden hover:bg-slate-800/70 hover:ring-2 hover:ring-blue-500/50 transition-all flex items-center"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-16 h-20 flex-shrink-0 bg-slate-800 overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/80x100/1e293b/64748b?text=?';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                          <svg className="w-6 h-6 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 px-3 py-2 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-white line-clamp-1 group-hover:text-blue-400 transition-colors">
                            {item.name}
                          </h3>
                          {item.category && (
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {item.category}
                            </p>
                          )}
                        </div>
                        {/* Type Badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${
                          item.type === 'movie'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {item.type === 'movie' ? 'Film' : 'Serie'}
                        </span>
                      </div>
                    </div>

                    {/* Arrow Icon */}
                    <div className="px-3 text-slate-500 group-hover:text-blue-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>

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
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full mt-4 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            {t.profile.closeProfile}
          </button>
        </div>
      </div>
    </div>
  );
}
