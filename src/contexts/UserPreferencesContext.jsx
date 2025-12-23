import React, { createContext, useContext, useState, useEffect } from 'react';

const UserPreferencesContext = createContext();

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  }
  return context;
}

export function UserPreferencesProvider({ children }) {
  const [likes, setLikes] = useState([]);
  const [dislikes, setDislikes] = useState([]);
  const [watchlist, setWatchlist] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedLikes = localStorage.getItem('tesla_tv_likes');
      const savedDislikes = localStorage.getItem('tesla_tv_dislikes');
      const savedWatchlist = localStorage.getItem('tesla_tv_watchlist');

      if (savedLikes) setLikes(JSON.parse(savedLikes));
      if (savedDislikes) setDislikes(JSON.parse(savedDislikes));
      if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('tesla_tv_likes', JSON.stringify(likes));
  }, [likes]);

  useEffect(() => {
    localStorage.setItem('tesla_tv_dislikes', JSON.stringify(dislikes));
  }, [dislikes]);

  useEffect(() => {
    localStorage.setItem('tesla_tv_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  // Toggle Like
  const toggleLike = (itemId, itemType) => {
    const key = `${itemType}_${itemId}`;

    setLikes(prev => {
      if (prev.includes(key)) {
        return prev.filter(id => id !== key);
      } else {
        // Remove from dislikes if it was there
        setDislikes(prevDislikes => prevDislikes.filter(id => id !== key));
        return [...prev, key];
      }
    });
  };

  // Toggle Dislike
  const toggleDislike = (itemId, itemType) => {
    const key = `${itemType}_${itemId}`;

    setDislikes(prev => {
      if (prev.includes(key)) {
        return prev.filter(id => id !== key);
      } else {
        // Remove from likes if it was there
        setLikes(prevLikes => prevLikes.filter(id => id !== key));
        return [...prev, key];
      }
    });
  };

  // Toggle Watchlist
  const toggleWatchlist = (itemId, itemType) => {
    const key = `${itemType}_${itemId}`;

    setWatchlist(prev => {
      if (prev.includes(key)) {
        return prev.filter(id => id !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  // Check functions
  const isLiked = (itemId, itemType) => {
    const key = `${itemType}_${itemId}`;
    return likes.includes(key);
  };

  const isDisliked = (itemId, itemType) => {
    const key = `${itemType}_${itemId}`;
    return dislikes.includes(key);
  };

  const isInWatchlist = (itemId, itemType) => {
    const key = `${itemType}_${itemId}`;
    return watchlist.includes(key);
  };

  const value = {
    likes,
    dislikes,
    watchlist,
    toggleLike,
    toggleDislike,
    toggleWatchlist,
    isLiked,
    isDisliked,
    isInWatchlist
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}
