import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './contexts/LanguageContext';
import MovieDetail from './MovieDetail';
import Breadcrumb from './components/Breadcrumb';
import CategoryTabsContainer from './components/CategoryTabsContainer';
import { isTmdbEnabled, getMovieDetailsByName, getPosterUrl, extractYear } from './services/tmdb';
import { rewriteImageUrl } from './utils/urlRewriter';

export default function Movies({ userData, isActive, initialSelectedMovieId, initialSelectedCategory, onTabChange }) {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState(initialSelectedCategory || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [movies, setMovies] = useState([]);
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // TMDB Data Cache - Map of movie name -> TMDB poster URL
  const [tmdbPosterCache, setTmdbPosterCache] = useState({});

  // Handle initial selected movie from props (e.g., from Profile watchlist)
  useEffect(() => {
    if (initialSelectedMovieId) {
      setSelectedMovieId(initialSelectedMovieId);
    }
  }, [initialSelectedMovieId]);

  // Handle initial selected category from props (e.g., from Header submenu)
  useEffect(() => {
    if (initialSelectedCategory !== undefined) {
      console.log('[Movies] Setting category from Header:', initialSelectedCategory);
      setSelectedCategory(initialSelectedCategory);
    }
  }, [initialSelectedCategory]);

  // Load movies from M3U playlist - Only when tab is active
  useEffect(() => {
    // Only load if active and not yet loaded
    if (!isActive || hasLoaded) {
      console.log('[Movies] Skipping load - isActive:', isActive, 'hasLoaded:', hasLoaded);
      return;
    }

    const loadData = async () => {
      if (!userData) {
        console.error('[Movies] No user data available');
        return;
      }

      console.log('[Movies] Loading VOD data from API - Tab activated');
      setIsLoading(true);
      setError(null);

      try {
        const playerApiUrl = '/api/player_api.php';

        // Load VOD categories
        const categoriesRes = await axios.get(playerApiUrl, {
          params: {
            username: userData.username,
            password: userData.password,
            action: 'get_vod_categories'
          }
        });

        console.log('[Movies] Categories API response:', categoriesRes.data);

        // Load VOD streams from API (like series)
        const vodRes = await axios.get(playerApiUrl, {
          params: {
            username: userData.username,
            password: userData.password,
            action: 'get_vod_streams'
          }
        });

        console.log('[Movies] VOD API response:', Array.isArray(vodRes.data) ? `Array with ${vodRes.data.length} items` : vodRes.data);

        if (!Array.isArray(vodRes.data)) {
          console.error('[Movies] Unexpected API response format');
          setError('Fehler beim Laden der Filme');
          return;
        }

        const movieItems = vodRes.data;
        console.log('[Movies] Total movies from API:', movieItems.length);

        // Create a category name to ID mapping from categories
        const categoryNameToId = new Map();
        if (Array.isArray(categoriesRes.data)) {
          categoriesRes.data.forEach(cat => {
            if (cat.category_name && cat.category_id) {
              categoryNameToId.set(cat.category_name.toLowerCase().trim(), cat.category_id);
            }
          });
        }

        // Deduplicate by name AND collect all genres for each movie
        const uniqueMoviesMap = new Map();
        movieItems.forEach(movie => {
          const normalizedName = movie.name?.toLowerCase().trim();
          if (!normalizedName) return;

          if (!uniqueMoviesMap.has(normalizedName)) {
            // Parse genre field to get all genres (like series)
            const genreCategories = [];
            const genreCategoryNames = [];

            if (movie.genre) {
              // Split by comma and parse each genre
              const genres = movie.genre.split(',').map(g => g.trim());
              genres.forEach(genre => {
                const genreLower = genre.toLowerCase();
                const categoryId = categoryNameToId.get(genreLower);
                if (categoryId && !genreCategories.includes(categoryId)) {
                  genreCategories.push(categoryId);
                  // Capitalize first letter for display
                  const capitalizedGenre = genre.charAt(0).toUpperCase() + genre.slice(1);
                  genreCategoryNames.push(capitalizedGenre);
                }
              });
            }

            // If no genres found from parsing, use the category_name from the movie
            const allCategories = genreCategories.length > 0
              ? genreCategories
              : (movie.category_name ? [movie.category_name] : []);

            const allCategoryNames = genreCategoryNames.length > 0
              ? genreCategoryNames
              : (movie.category_name ? [movie.category_name] : []);

            // First occurrence - create movie with categories array
            uniqueMoviesMap.set(normalizedName, {
              ...movie,
              categories: allCategories,
              category_names: allCategoryNames
            });
          } else {
            const existing = uniqueMoviesMap.get(normalizedName);
            // Add category if not already present
            if (movie.category_id && !existing.categories.includes(movie.category_id)) {
              existing.categories.push(movie.category_id);
            }
            if (movie.category_name && !existing.category_names.includes(movie.category_name)) {
              existing.category_names.push(movie.category_name);
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
        console.log('[Movies] Unique movies after deduplication:', uniqueMovies.length);

        // Debug: Check if movies have ratings
        const moviesWithRatings = uniqueMovies.filter(m => m.rating);
        console.log('[Movies] Movies with ratings:', moviesWithRatings.length, '/', uniqueMovies.length);
        if (uniqueMovies.length > 0) {
          console.log('[Movies] Sample movie data:', {
            name: uniqueMovies[0].name,
            rating: uniqueMovies[0].rating,
            allFields: Object.keys(uniqueMovies[0])
          });
        }

        // Set categories from API
        if (Array.isArray(categoriesRes.data)) {
          const allCategories = [
            { category_id: null, category_name: t.movies.allMovies },
            ...categoriesRes.data
          ];
          console.log('[Movies] Categories loaded:', allCategories.length);
          setCategories(allCategories);
        } else {
          setCategories([{ category_id: null, category_name: t.movies.allMovies }]);
        }

        setMovies(uniqueMovies);

        // Mark as loaded AFTER data is set
        setHasLoaded(true);

      } catch (err) {
        console.error('[Movies] Error loading VOD data:', err);
        setError(err.message || 'Fehler beim Laden der Filme');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isActive, hasLoaded, userData, t]);

  // Get poster URL - prefer TMDB if available
  const getMoviePoster = (movie) => {
    // Check TMDB cache first
    if (tmdbPosterCache[movie.name]) {
      return tmdbPosterCache[movie.name];
    }

    // Return local poster with URL rewriting for proxy
    const localPoster = movie.stream_icon || movie.cover;
    return rewriteImageUrl(localPoster);
  };

  // Lazily fetch TMDB poster for a movie
  const fetchTmdbPoster = async (movie) => {
    if (!isTmdbEnabled()) return;
    if (tmdbPosterCache[movie.name]) return; // Already cached

    try {
      const year = extractYear(movie.added) || null;
      const tmdbMovie = await getMovieDetailsByName(movie.name, year, t.langCode);

      if (tmdbMovie?.poster_path) {
        const posterUrl = getPosterUrl(tmdbMovie.poster_path, 'w500');
        setTmdbPosterCache(prev => ({
          ...prev,
          [movie.name]: posterUrl
        }));
      }
    } catch (error) {
      console.error('[Movies] Error fetching TMDB poster:', error);
    }
  };

  // Filter movies by category and search query
  const filteredMovies = movies.filter(movie => {
    const matchesSearch = movie.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === null || movie.categories?.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  // Count movies per category
  const getCategoryCount = (categoryId) => {
    if (categoryId === null) return movies.length;
    return movies.filter(m => m.categories?.includes(categoryId)).length;
  };

  // If a movie is selected, show MovieDetail
  if (selectedMovieId) {
    const selectedMovie = movies.find(m => m.stream_id === selectedMovieId);
    return (
      <MovieDetail
        movieId={selectedMovieId}
        movieCategory={null}
        userData={userData}
        onBack={() => setSelectedMovieId(null)}
        onTabChange={onTabChange}
      />
    );
  }

  if (isLoading || !hasLoaded) {
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

  // Build breadcrumb items
  const selectedCategoryObj = categories.find(c => c.category_id === selectedCategory);
  const hasSelectedCategory = selectedCategoryObj && selectedCategoryObj.category_id !== null;

  const breadcrumbItems = [
    {
      label: t.nav.movies,
      // Make it clickable if a category is selected (to go back to "All Movies")
      ...(hasSelectedCategory ? { onClick: () => setSelectedCategory(null) } : {})
    }
  ];

  // Add category if selected
  if (hasSelectedCategory) {
    breadcrumbItems.push({ label: selectedCategoryObj.category_name });
  }

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} onHomeClick={onTabChange} />

      {/* Category Tabs */}
      <CategoryTabsContainer
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Movies Grid */}
      <div>
        {filteredMovies.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            <p className="font-medium text-lg">{t.movies.noResults}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 pb-8">
            {filteredMovies.map((movie, index) => {
              return (
                <div
                  key={movie.stream_id || index}
                  onClick={() => setSelectedMovieId(movie.stream_id)}
                  className="group cursor-pointer"
                >
                  {/* Poster */}
                  <div className="relative aspect-[2/3] bg-slate-800 rounded-lg overflow-hidden mb-2">
                    {(() => {
                      const posterUrl = getMoviePoster(movie);
                      // Lazily fetch TMDB poster if enabled
                      if (isTmdbEnabled() && !tmdbPosterCache[movie.name]) {
                        fetchTmdbPoster(movie);
                      }
                      return posterUrl ? (
                        <img
                          src={posterUrl}
                          alt={movie.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null;
                    })()}
                    <div className={movie.stream_icon ? 'hidden absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-600/20 flex items-center justify-center' : 'absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-600/20 flex items-center justify-center'}>
                      <svg className="w-16 h-16 text-slate-700 group-hover:text-red-500 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Rating Badge - Bottom Right */}
                    {movie.rating && (
                      <div className="absolute bottom-2 right-2 z-10 flex items-center bg-black/80 backdrop-blur-sm px-2 py-1 rounded">
                        <svg className="w-3 h-3 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-xs text-yellow-500 font-bold">{parseFloat(movie.rating).toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <h3 className="text-sm font-medium text-white line-clamp-2 group-hover:text-red-400 transition-colors mb-1">
                    {movie.name}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    {movie.category_names?.join(', ') || movie.genre || ''}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
