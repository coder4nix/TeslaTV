import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from './contexts/LanguageContext';
import SeriesDetail from './SeriesDetail';
import Breadcrumb from './components/Breadcrumb';
import CategoryTabsContainer from './components/CategoryTabsContainer';
import { rewriteImageUrl } from './utils/urlRewriter';

export default function Series({ userData, isActive, initialSelectedSeriesId, initialSelectedCategory, onTabChange }) {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState(initialSelectedCategory || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [series, setSeries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedSeriesId, setSelectedSeriesId] = useState(initialSelectedSeriesId || null);

  // Update selectedSeriesId when initialSelectedSeriesId changes
  useEffect(() => {
    if (initialSelectedSeriesId) {
      setSelectedSeriesId(initialSelectedSeriesId);
    }
  }, [initialSelectedSeriesId]);

  // Handle initial selected category from props (e.g., from Header submenu)
  useEffect(() => {
    if (initialSelectedCategory !== undefined) {
      console.log('[Series] Setting category from Header:', initialSelectedCategory);
      setSelectedCategory(initialSelectedCategory);
    }
  }, [initialSelectedCategory]);

  // Load series from API
  useEffect(() => {
    if (!isActive || hasLoaded) {
      console.log(`[Series] Skipping load - isActive: ${isActive}, hasLoaded: ${hasLoaded}`);
      return;
    }

    const loadSeries = async () => {
      if (!userData) {
        console.log('[Series] No user data available');
        return;
      }

      console.log('[Series] Loading series - Tab activated');
      setIsLoading(true);
      setError(null);

      try {
        // Try XStreamCodes player_api.php format
        const playerApiUrl = '/api/player_api.php';

        // Load categories
        const categoriesRes = await axios.get(playerApiUrl, {
          params: {
            username: userData.username,
            password: userData.password,
            action: 'get_series_categories'
          }
        });

        console.log('[Series] Categories API response:', categoriesRes.data);
        // XStreamCodes returns array directly for categories
        if (Array.isArray(categoriesRes.data)) {
          console.log('[Series] Loaded categories:', categoriesRes.data.length);
          setCategories([
            { category_id: null, category_name: 'Alle Serien' },
            ...categoriesRes.data
          ]);
        } else {
          console.error('[Series] Unexpected response format:', categoriesRes.data);
          setCategories([{ category_id: null, category_name: 'Alle Serien' }]);
        }

        // Load series
        const seriesRes = await axios.get(playerApiUrl, {
          params: {
            username: userData.username,
            password: userData.password,
            action: 'get_series'
          }
        });

        console.log('[Series] Series API response:', Array.isArray(seriesRes.data) ? `Array with ${seriesRes.data.length} items` : seriesRes.data);

        // Debug: Log first few series to see structure
        if (Array.isArray(seriesRes.data) && seriesRes.data.length > 0) {
          console.log('[Series] Sample series data:', seriesRes.data.slice(0, 3));
        }

        // Create a category name to ID mapping from categories
        const categoryNameToId = new Map();
        categoriesRes.data.forEach(cat => {
          if (cat.category_name && cat.category_id) {
            categoryNameToId.set(cat.category_name.toLowerCase().trim(), cat.category_id);
          }
        });

        // XStreamCodes returns array directly for series
        if (Array.isArray(seriesRes.data)) {
          // Deduplicate by name AND collect all categories for each series
          const uniqueSeriesMap = new Map();
          seriesRes.data.forEach(series => {
            const normalizedName = series.name?.toLowerCase().trim();
            if (!normalizedName) return;

            if (!uniqueSeriesMap.has(normalizedName)) {
              // Parse genre field to get all genres
              const genreCategories = [];
              const genreCategoryNames = [];

              if (series.genre) {
                // Split by comma and parse each genre
                const genres = series.genre.split(',').map(g => g.trim());
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

              // If no genres found from parsing, use the category_id from the series
              const allCategories = genreCategories.length > 0
                ? genreCategories
                : (series.category_id ? [series.category_id] : []);

              const allCategoryNames = genreCategoryNames.length > 0
                ? genreCategoryNames
                : (series.category_name ? [series.category_name] : []);

              // First occurrence - create series with categories array
              uniqueSeriesMap.set(normalizedName, {
                ...series,
                categories: allCategories,
                category_names: allCategoryNames
              });
            } else {
              const existing = uniqueSeriesMap.get(normalizedName);
              console.log('[Series] Duplicate found:', normalizedName, 'existing category_id:', existing.categories, 'new category_id:', series.category_id);
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
          console.log('[Series] Unique series after deduplication:', uniqueSeries.length);

          // Debug: Log Breaking Bad if it exists
          const breakingBad = uniqueSeries.find(s => s.name?.toLowerCase().includes('breaking bad'));
          if (breakingBad) {
            console.log('[Series] Breaking Bad data AFTER genre parsing:', {
              name: breakingBad.name,
              genre: breakingBad.genre,
              categories: breakingBad.categories,
              category_names: breakingBad.category_names,
              categoriesLength: breakingBad.categories.length
            });
          }

          // Debug: Log category mapping
          console.log('[Series] Category name to ID mapping:', Array.from(categoryNameToId.entries()).slice(0, 10));

          setSeries(uniqueSeries);
          console.log('[Series] Loaded series:', uniqueSeries.length);
        } else {
          console.error('[Series] Unexpected series response:', seriesRes.data);
        }

        setHasLoaded(true);
      } catch (err) {
        console.error('[Series] Error loading series:', err);
        setError(err.message || 'Fehler beim Laden der Serien');
      } finally {
        setIsLoading(false);
      }
    };

    loadSeries();
  }, [isActive, hasLoaded, userData]);

  // If a series is selected, show SeriesDetail
  if (selectedSeriesId) {
    return (
      <SeriesDetail
        seriesId={selectedSeriesId}
        userData={userData}
        onBack={() => setSelectedSeriesId(null)}
        onTabChange={onTabChange}
      />
    );
  }

  // Filter series by category and search query
  const filteredSeries = series.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === null || item.categories?.includes(selectedCategory);

    // Debug: Log Breaking Bad filtering
    if (item.name?.toLowerCase().includes('breaking bad') && selectedCategory !== null) {
      console.log('[Series] Filtering Breaking Bad:', {
        name: item.name,
        selectedCategory,
        categories: item.categories,
        includes: item.categories?.includes(selectedCategory),
        matchesCategory
      });
    }

    return matchesSearch && matchesCategory;
  });

  // Count series per category
  const getCategoryCount = (categoryId) => {
    if (categoryId === null) return series.length;
    return series.filter(s => s.categories?.includes(categoryId)).length;
  };

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
      label: t.nav.series,
      // Make it clickable if a category is selected (to go back to "All Series")
      ...(hasSelectedCategory ? { onClick: () => setSelectedCategory(null) } : {})
    }
  ];

  // Add category if selected
  if (hasSelectedCategory) {
    breadcrumbItems.push({ label: selectedCategoryObj.category_name });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} onHomeClick={onTabChange} />

      {/* Category Tabs */}
      <CategoryTabsContainer
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Series Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {filteredSeries.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">Keine Serien gefunden</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 pb-8">
            {filteredSeries.map((item) => (
              <div
                key={item.series_id}
                onClick={() => setSelectedSeriesId(item.series_id)}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[2/3] bg-slate-800 rounded-lg overflow-hidden mb-2">
                  {item.cover && (
                    <img
                      src={rewriteImageUrl(item.cover)}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Rating Badge - Bottom Right */}
                  {item.rating && (
                    <div className="absolute bottom-2 right-2 z-10 flex items-center bg-black/80 backdrop-blur-sm px-2 py-1 rounded">
                      <svg className="w-3 h-3 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs text-yellow-500 font-bold">{parseFloat(item.rating).toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-medium text-white line-clamp-2 group-hover:text-red-400 transition-colors mb-1">
                  {item.name}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {item.category_names?.join(', ') || item.genre || ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
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
