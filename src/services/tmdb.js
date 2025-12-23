/**
 * TMDB (The Movie Database) API Service
 * Handles all TMDB API interactions for fetching movie/series metadata and images
 */

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

/**
 * Get TMDB API key from localStorage
 */
const getTmdbApiKey = () => {
  try {
    const config = localStorage.getItem('tmdb_config');
    if (config) {
      const parsed = JSON.parse(config);
      return parsed.apiKey;
    }
  } catch (error) {
    console.error('[TMDB] Error getting API key:', error);
  }
  return null;
};

/**
 * Check if TMDB is enabled (API key is configured)
 */
export const isTmdbEnabled = () => {
  return !!getTmdbApiKey();
};

/**
 * Make a request to TMDB API
 */
const tmdbRequest = async (endpoint, params = {}) => {
  const apiKey = getTmdbApiKey();
  if (!apiKey) {
    throw new Error('TMDB API key not configured');
  }

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', apiKey);

  // Add additional parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

/**
 * Search for a TV series by name
 */
export const searchTvSeries = async (query, language = 'en-US') => {
  try {
    const data = await tmdbRequest('/search/tv', { query, language });
    return data.results || [];
  } catch (error) {
    console.error('[TMDB] Error searching TV series:', error);
    return [];
  }
};

/**
 * Search for a movie by name
 */
export const searchMovie = async (query, language = 'en-US') => {
  try {
    const data = await tmdbRequest('/search/movie', { query, language });
    return data.results || [];
  } catch (error) {
    console.error('[TMDB] Error searching movie:', error);
    return [];
  }
};

/**
 * Get detailed information about a TV series
 */
export const getTvSeriesDetails = async (seriesId, language = 'en-US') => {
  try {
    return await tmdbRequest(`/tv/${seriesId}`, { language });
  } catch (error) {
    console.error('[TMDB] Error getting TV series details:', error);
    return null;
  }
};

/**
 * Get season details including episodes
 */
export const getSeasonDetails = async (seriesId, seasonNumber, language = 'en-US') => {
  try {
    return await tmdbRequest(`/tv/${seriesId}/season/${seasonNumber}`, { language });
  } catch (error) {
    console.error('[TMDB] Error getting season details:', error);
    return null;
  }
};

/**
 * Get detailed information about a movie
 */
export const getMovieDetails = async (movieId, language = 'en-US') => {
  try {
    return await tmdbRequest(`/movie/${movieId}`, { language });
  } catch (error) {
    console.error('[TMDB] Error getting movie details:', error);
    return null;
  }
};

/**
 * Get credits (cast and crew) for a TV series
 */
export const getTvSeriesCredits = async (seriesId) => {
  try {
    return await tmdbRequest(`/tv/${seriesId}/credits`);
  } catch (error) {
    console.error('[TMDB] Error getting TV series credits:', error);
    return null;
  }
};

/**
 * Get credits (cast and crew) for a movie
 */
export const getMovieCredits = async (movieId) => {
  try {
    return await tmdbRequest(`/movie/${movieId}/credits`);
  } catch (error) {
    console.error('[TMDB] Error getting movie credits:', error);
    return null;
  }
};

/**
 * Build TMDB image URL
 * @param {string} path - Image path from TMDB API (e.g., "/abc123.jpg")
 * @param {string} size - Image size (poster: w185, w342, w500, w780, original; backdrop: w300, w780, w1280, original)
 */
export const getTmdbImageUrl = (path, size = 'w500') => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
};

/**
 * Get poster URL (optimized for movie/series posters)
 */
export const getPosterUrl = (path, size = 'w500') => {
  return getTmdbImageUrl(path, size);
};

/**
 * Get backdrop URL (optimized for backdrop/hero images)
 */
export const getBackdropUrl = (path, size = 'w1280') => {
  return getTmdbImageUrl(path, size);
};

/**
 * Get profile image URL (for cast/crew photos)
 */
export const getProfileUrl = (path, size = 'w185') => {
  return getTmdbImageUrl(path, size);
};

/**
 * Extract year from date string
 */
export const extractYear = (dateString) => {
  if (!dateString) return null;
  const year = dateString.split('-')[0];
  return year || null;
};

/**
 * Extract year from title and return clean title + year
 * Handles formats like "Avatar (2009)" or "Breaking Bad (2008)"
 */
export const parseTitle = (titleWithYear) => {
  if (!titleWithYear) return { title: '', year: null };

  // Match pattern: "Title (YYYY)" where YYYY is a 4-digit year
  const match = titleWithYear.match(/^(.+?)\s*\((\d{4})\)\s*$/);

  if (match) {
    return {
      title: match[1].trim(),
      year: match[2]
    };
  }

  return {
    title: titleWithYear.trim(),
    year: null
  };
};

/**
 * Find best match for a series/movie by comparing name and year
 */
export const findBestMatch = (results, targetName, targetYear = null) => {
  if (!results || results.length === 0) return null;

  // Normalize function for comparison
  const normalize = (str) => str?.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim() || '';

  const normalizedTarget = normalize(targetName);

  // Calculate score for a single name comparison
  const calculateNameScore = (name) => {
    const normalizedName = normalize(name);
    if (!normalizedName) return 0;

    if (normalizedName === normalizedTarget) {
      return 100; // Exact match
    } else if (normalizedName.includes(normalizedTarget) || normalizedTarget.includes(normalizedName)) {
      return 80; // Partial match
    } else {
      // Word-by-word comparison
      const targetWords = normalizedTarget.split(' ');
      const nameWords = normalizedName.split(' ');
      const matchingWords = targetWords.filter(word => nameWords.includes(word));
      return (matchingWords.length / targetWords.length) * 60;
    }
  };

  let bestMatch = null;
  let bestScore = 0;

  for (const result of results) {
    // Check both localized and original titles
    const localizedName = result.name || result.title || '';
    const originalName = result.original_name || result.original_title || '';

    // Use the best score from either localized or original name
    const localizedScore = calculateNameScore(localizedName);
    const originalScore = calculateNameScore(originalName);
    let score = Math.max(localizedScore, originalScore);

    // Bonus for year match
    if (targetYear) {
      const resultYear = extractYear(result.first_air_date || result.release_date);
      if (resultYear === targetYear) {
        score += 20;
      }
    }

    // Bonus for popularity (higher popularity = more likely correct)
    if (result.popularity) {
      score += Math.min(result.popularity / 100, 10);
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = result;
    }
  }

  // Only return if confidence is reasonable
  return bestScore > 50 ? bestMatch : null;
};

/**
 * Auto-match and get series details by name
 * This is a convenience function that searches and returns the best match
 */
export const getSeriesDetailsByName = async (seriesName, year = null, language = 'en-US') => {
  try {
    // Parse title to extract year if present (e.g., "Breaking Bad (2008)" -> "Breaking Bad", 2008)
    const parsed = parseTitle(seriesName);
    const cleanTitle = parsed.title;
    const extractedYear = parsed.year || year;

    console.log(`[TMDB] Searching for series: "${cleanTitle}"${extractedYear ? ` (${extractedYear})` : ''}`);

    const searchResults = await searchTvSeries(cleanTitle, language);
    const bestMatch = findBestMatch(searchResults, cleanTitle, extractedYear);

    if (!bestMatch) {
      console.log('[TMDB] No match found for:', cleanTitle);
      return null;
    }

    console.log('[TMDB] Best match:', bestMatch.name, `(${extractYear(bestMatch.first_air_date)})`);

    const details = await getTvSeriesDetails(bestMatch.id, language);
    return details;
  } catch (error) {
    console.error('[TMDB] Error getting series details by name:', error);
    return null;
  }
};

/**
 * Auto-match and get movie details by name
 */
export const getMovieDetailsByName = async (movieName, year = null, language = 'en-US') => {
  try {
    // Parse title to extract year if present (e.g., "Avatar (2009)" -> "Avatar", 2009)
    const parsed = parseTitle(movieName);
    const cleanTitle = parsed.title;
    const extractedYear = parsed.year || year;

    console.log(`[TMDB] Searching for movie: "${cleanTitle}"${extractedYear ? ` (${extractedYear})` : ''}`);

    const searchResults = await searchMovie(cleanTitle, language);
    const bestMatch = findBestMatch(searchResults, cleanTitle, extractedYear);

    if (!bestMatch) {
      console.log('[TMDB] No match found for:', cleanTitle);
      return null;
    }

    console.log('[TMDB] Best match:', bestMatch.title, `(${extractYear(bestMatch.release_date)})`);

    const details = await getMovieDetails(bestMatch.id, language);
    return details;
  } catch (error) {
    console.error('[TMDB] Error getting movie details by name:', error);
    return null;
  }
};

/**
 * Test TMDB API connection
 */
export const testTmdbConnection = async () => {
  try {
    const apiKey = getTmdbApiKey();
    if (!apiKey) {
      return { success: false, error: 'No API key configured' };
    }

    // Try to fetch a known movie (The Matrix)
    const response = await fetch(`${TMDB_BASE_URL}/movie/603?api_key=${apiKey}`);

    if (response.ok) {
      const data = await response.json();
      return { success: true, message: 'Connection successful', data };
    } else {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export default {
  isTmdbEnabled,
  searchTvSeries,
  searchMovie,
  getTvSeriesDetails,
  getSeasonDetails,
  getMovieDetails,
  getTvSeriesCredits,
  getMovieCredits,
  getTmdbImageUrl,
  getPosterUrl,
  getBackdropUrl,
  getProfileUrl,
  extractYear,
  parseTitle,
  findBestMatch,
  getSeriesDetailsByName,
  getMovieDetailsByName,
  testTmdbConnection
};
