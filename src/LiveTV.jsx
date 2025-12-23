import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from './contexts/LanguageContext';
import { usePlaylist } from './contexts/PlaylistContext';
import VideoPlayer from './components/VideoPlayer';
import Breadcrumb from './components/Breadcrumb';
import CategoryTabsContainer from './components/CategoryTabsContainer';
import ChannelEpg from './components/ChannelEpg';
import { rewriteImageUrl, rewriteStreamUrl } from './utils/urlRewriter';

export default function LiveTV({ userData, isActive, onTabChange }) {
  const { t } = useLanguage();
  const { loadPlaylist, filterByType, isLoading: playlistLoading, error: playlistError } = usePlaylist();
  const [streams, setStreams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const channelScrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Load playlist - Only when tab is active
  useEffect(() => {
    if (!isActive || hasLoaded) {
      return;
    }

    const loadLiveStreams = async () => {
      if (!userData) {
        return;
      }

      console.log('[LiveTV] Loading live streams');

      try {
        const playlistData = await loadPlaylist(userData);
        if (!playlistData) {
          return;
        }

        const liveChannels = filterByType('live', playlistData);
        console.log('[LiveTV] Filtered live channels:', liveChannels.length);

        // Extract unique categories
        const categoryMap = new Map();
        liveChannels.forEach(channel => {
          if (channel.category_name && !categoryMap.has(channel.category_name)) {
            categoryMap.set(channel.category_name, {
              category_id: channel.category_name,
              category_name: channel.category_name
            });
          }
        });

        const categoriesList = Array.from(categoryMap.values());
        console.log('[LiveTV] Categories:', categoriesList.length);

        // Add "All Channels" at the beginning
        setCategories([
          { category_id: null, category_name: t.liveTV.allChannels },
          ...categoriesList
        ]);

        setStreams(liveChannels);

        // Set first channel as selected
        if (liveChannels.length > 0) {
          setSelectedChannel(liveChannels[0]);
        }

        setHasLoaded(true);
      } catch (error) {
        console.error('[LiveTV] Error loading live streams:', error);
      }
    };

    loadLiveStreams();
  }, [isActive, hasLoaded, userData, t, loadPlaylist, filterByType]);

  // Filter channels by category
  const filteredStreams = streams.filter(stream => {
    const matchesCategory = selectedCategory === null || stream.category_name === selectedCategory;
    return matchesCategory;
  });

  // Get popular/featured channels from filtered list (first 12)
  const popularChannels = filteredStreams.slice(0, 12);

  // Scroll channel row
  const scrollChannels = (direction) => {
    if (channelScrollRef.current) {
      const scrollAmount = 200;
      channelScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Mouse drag scrolling
  const handleMouseDown = (e) => {
    if (!channelScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - channelScrollRef.current.offsetLeft);
    setScrollLeft(channelScrollRef.current.scrollLeft);
    channelScrollRef.current.style.cursor = 'grabbing';
  };

  const handleMouseLeave = () => {
    if (!channelScrollRef.current) return;
    setIsDragging(false);
    channelScrollRef.current.style.cursor = 'grab';
  };

  const handleMouseUp = () => {
    if (!channelScrollRef.current) return;
    setIsDragging(false);
    channelScrollRef.current.style.cursor = 'grab';
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !channelScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - channelScrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed multiplier
    channelScrollRef.current.scrollLeft = scrollLeft - walk;
  };

  if (playlistLoading || (!hasLoaded && isActive)) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (playlistError) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)]">
        <div className="text-center text-red-400">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-semibold mb-2">{t.common.error}</p>
          <p className="text-sm text-slate-500">{playlistError}</p>
        </div>
      </div>
    );
  }

  // Build breadcrumb
  const breadcrumbItems = [
    { label: t.nav.liveTV }
  ];

  return (
    <div className="pb-8">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} onHomeClick={onTabChange} />

      {/* Hero Section */}
      <div className="relative h-[500px] -mx-3 sm:-mx-6 mb-12 overflow-hidden">
        {/* Background Image/Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/95 to-transparent">
          {selectedChannel?.stream_icon && (
            <img
              src={rewriteImageUrl(selectedChannel.stream_icon)}
              alt={selectedChannel.name}
              className="absolute right-0 top-0 h-full w-1/2 object-cover opacity-30"
              style={{
                maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
              }}
            />
          )}
        </div>

        {/* Content */}
        <div className="relative h-full flex flex-col justify-center px-6 sm:px-12 max-w-3xl">
          {/* Channel Logo */}
          {selectedChannel?.stream_icon && (
            <div className="mb-6">
              <img
                src={rewriteImageUrl(selectedChannel.stream_icon)}
                alt={selectedChannel.name}
                className="h-24 w-auto object-contain"
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4" style={{fontFamily: 'Outfit, sans-serif'}}>
            {selectedChannel?.name || t.liveTV.title}
          </h1>

          {/* Badges */}
          <div className="flex items-center gap-3 mb-4">
            {/* Live Badge */}
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              {t.liveTV.live || 'CANLI'}
            </span>

            {/* Category */}
            {selectedChannel?.category_name && (
              <span className="bg-slate-800/80 text-slate-300 text-xs font-medium px-3 py-1.5 rounded border border-slate-700">
                {selectedChannel.category_name}
              </span>
            )}
          </div>

          {/* Description placeholder */}
          <p className="text-slate-300 text-sm sm:text-base mb-6 max-w-2xl line-clamp-3">
            {selectedChannel?.epg_title || 'Live-Übertragung läuft. Erleben Sie die beste Unterhaltung rund um die Uhr.'}
          </p>

          {/* See More Link */}
          <button className="text-slate-400 hover:text-white text-sm mb-6 text-left transition-colors">
            Devamını gör
          </button>

          {/* Watch Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPlayer(true)}
              className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold px-8 py-3.5 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/40"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              {t.liveTV.watchNow || 'Hemen İzle'}
            </button>

            {/* TV Guide & All Channels buttons */}
            <button className="bg-slate-800/50 hover:bg-slate-800 text-white font-medium px-6 py-3.5 rounded-lg transition-all border border-slate-700/50">
              TV Rehberi
            </button>
            <button className="bg-slate-800/50 hover:bg-slate-800 text-white font-medium px-6 py-3.5 rounded-lg transition-all border border-slate-700/50">
              {t.liveTV.allChannels || 'Tüm Kanallar'}
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <CategoryTabsContainer
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Channel Navigation Row */}
      <div className="mb-12 relative py-2">
        {/* Scroll Left Button */}
        <button
          onClick={() => scrollChannels('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-yellow-400 hover:bg-yellow-500 text-slate-900 p-3 rounded-full shadow-xl shadow-yellow-400/20 hover:shadow-yellow-400/40 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Scroll Right Button */}
        <button
          onClick={() => scrollChannels('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-yellow-400 hover:bg-yellow-500 text-slate-900 p-3 rounded-full shadow-xl shadow-yellow-400/20 hover:shadow-yellow-400/40 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Channel Scroll Container */}
        <div
          ref={channelScrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth px-12 py-2 cursor-grab select-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {filteredStreams.slice(0, 20).map((channel) => (
            <button
              key={channel.stream_id}
              onClick={() => setSelectedChannel(channel)}
              className={`flex-shrink-0 w-32 h-32 rounded-2xl overflow-hidden transition-all transform hover:scale-105 bg-slate-800/50 ${
                selectedChannel?.stream_id === channel.stream_id
                  ? 'ring-4 ring-yellow-400 shadow-xl shadow-yellow-400/20'
                  : 'hover:ring-2 hover:ring-slate-600'
              }`}
            >
              {channel.stream_icon ? (
                <img
                  src={rewriteImageUrl(channel.stream_icon)}
                  alt={channel.name}
                  className="w-full h-full object-contain p-2"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-full h-full flex items-center justify-center text-4xl ${channel.stream_icon ? 'hidden' : 'flex'}`}>
                📺
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Popular Content Section */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6" style={{fontFamily: 'Outfit, sans-serif'}}>
          {t.liveTV.currentlyPopular || 'Şuan En Popüler'}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {popularChannels.map((channel) => (
            <button
              key={channel.stream_id}
              onClick={() => {
                setSelectedChannel(channel);
                setShowPlayer(true);
              }}
              className="group relative aspect-video bg-slate-800/50 rounded-xl overflow-hidden hover:ring-2 hover:ring-red-500/50 transition-all"
            >
              {channel.stream_icon ? (
                <img
                  src={rewriteImageUrl(channel.stream_icon)}
                  alt={channel.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-slate-800 to-slate-900 ${channel.stream_icon ? 'hidden' : 'flex'}`}>
                📺
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-sm font-semibold line-clamp-2 mb-1">
                    {channel.name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="text-red-400 text-xs font-bold">{t.liveTV.live || 'LIVE'}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Fullscreen Video Player Modal */}
      {showPlayer && selectedChannel && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Close Button */}
          <button
            onClick={() => setShowPlayer(false)}
            className="absolute top-4 right-4 z-50 bg-slate-900/80 hover:bg-slate-800 text-white p-3 rounded-full backdrop-blur-sm transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Channel Info Overlay */}
          <div className="absolute top-4 left-4 z-50 space-y-4 max-w-md">
            <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                {selectedChannel.stream_icon && (
                  <img
                    src={rewriteImageUrl(selectedChannel.stream_icon)}
                    alt={selectedChannel.name}
                    className="w-12 h-12 rounded-lg object-cover"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
                <div>
                  <h3 className="text-white font-bold text-lg">{selectedChannel.name}</h3>
                  <p className="text-slate-400 text-sm">{selectedChannel.category_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                  {t.liveTV.live || 'LIVE'}
                </span>
              </div>
            </div>

            {/* EPG Info */}
            <ChannelEpg channelName={selectedChannel.name} />
          </div>

          {/* Video Player */}
          <VideoPlayer
            src={rewriteStreamUrl(selectedChannel.url)}
            poster={rewriteImageUrl(selectedChannel.stream_icon)}
            autoplay={true}
            className="w-full h-full"
          />
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
