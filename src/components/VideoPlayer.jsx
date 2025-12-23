import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

export default function VideoPlayer({ src, poster, autoplay = true, onReady }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const overlayRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [showPauseButton, setShowPauseButton] = React.useState(false);
  const [pauseButtonOpacity, setPauseButtonOpacity] = React.useState(1);
  const [waitingForSecondClick, setWaitingForSecondClick] = React.useState(false);
  const [exitButtonPulsing, setExitButtonPulsing] = React.useState(true);
  const confirmTimeout = useRef(null);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      const videoElement = document.createElement('video-js');

      videoElement.classList.add('vjs-big-play-centered');
      videoElement.classList.add('vjs-theme-fantasy');

      videoRef.current.appendChild(videoElement);

      // Determine video type from URL
      let videoType = 'video/mp4';
      if (src.includes('.m3u8') || src.includes('/m3u8')) {
        videoType = 'application/x-mpegURL';
      } else if (src.includes('%23.mp4') || src.includes('#.mp4')) {
        videoType = 'video/mp4';
      } else if (src.includes('%23.mkv') || src.includes('#.mkv')) {
        videoType = 'video/mp4';  // MKV plays as MP4 in browser
      }

      console.log('[VideoPlayer] Loading video:', { src, type: videoType });

      const player = playerRef.current = videojs(videoElement, {
        controls: true,
        autoplay: autoplay,
        preload: 'auto',
        fluid: true,
        responsive: true,
        playbackRates: [0.5, 1, 1.5, 2],
        controlBar: {
          volumePanel: {
            inline: false
          }
        },
        html5: {
          vhs: {
            overrideNative: true
          },
          nativeAudioTracks: false,
          nativeVideoTracks: false
        },
        sources: [{
          src: src,
          type: videoType
        }]
      }, () => {
        console.log('[VideoPlayer] Player is ready');

        // Append overlay to player element so it's included in fullscreen
        if (overlayRef.current && player.el()) {
          player.el().appendChild(overlayRef.current);
        }

        // Listen for fullscreen changes
        player.on('fullscreenchange', () => {
          const fullscreenState = player.isFullscreen();
          setIsFullscreen(fullscreenState);

          // Reset pulsing when entering fullscreen
          if (fullscreenState) {
            setExitButtonPulsing(true);
          }
        });

        // Listen for play/pause
        player.on('play', () => {
          setIsPlaying(true);
          setShowPauseButton(false);
          setWaitingForSecondClick(false);
          setPauseButtonOpacity(1);

          // Clear any existing timeout
          if (confirmTimeout.current) {
            clearTimeout(confirmTimeout.current);
          }
        });

        player.on('pause', () => {
          setIsPlaying(false);
          setShowPauseButton(true);
          setWaitingForSecondClick(false);
          setPauseButtonOpacity(1);

          // Clear timeout when paused
          if (confirmTimeout.current) {
            clearTimeout(confirmTimeout.current);
          }
        });

        if (onReady) {
          onReady(player);
        }
      });

      if (poster) {
        player.poster(poster);
      }
    } else {
      // Player exists, just update the source
      const player = playerRef.current;

      player.src({
        src: src,
        type: src.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'
      });

      if (poster) {
        player.poster(poster);
      }

      if (autoplay) {
        player.play().catch(e => {
          console.log('Autoplay failed:', e);
        });
      }
    }
  }, [src, poster, autoplay, onReady]);

  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  // Stop exit button pulsing after 6 seconds (3 pulses at 2s each)
  useEffect(() => {
    if (isFullscreen && exitButtonPulsing) {
      const timeout = setTimeout(() => {
        setExitButtonPulsing(false);
      }, 6000);

      return () => clearTimeout(timeout);
    }
  }, [isFullscreen, exitButtonPulsing]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const exitFullscreen = () => {
    const player = playerRef.current;
    if (player && player.isFullscreen()) {
      player.exitFullscreen();
    }
  };

  const handleButtonClick = (e) => {
    e.preventDefault();
    const player = playerRef.current;
    if (!player) return;

    // If paused, any click will play
    if (player.paused()) {
      player.play();
      return;
    }

    // If playing and waiting for second click, this is the second click - PAUSE
    if (waitingForSecondClick) {
      player.pause();
      setWaitingForSecondClick(false);
      if (confirmTimeout.current) {
        clearTimeout(confirmTimeout.current);
      }
      return;
    }

    // First click while playing - show pause button and wait for confirmation
    setShowPauseButton(true);
    setPauseButtonOpacity(1);
    setWaitingForSecondClick(true);

    // Clear any existing timeout
    if (confirmTimeout.current) {
      clearTimeout(confirmTimeout.current);
    }

    // After 3 seconds, hide the pause button if no second click
    confirmTimeout.current = setTimeout(() => {
      setPauseButtonOpacity(0);
      setTimeout(() => {
        setShowPauseButton(false);
        setWaitingForSecondClick(false);
      }, 1000); // Wait for fade animation to complete
    }, 3000);
  };

  return (
    <div data-vjs-player style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={videoRef} style={{ width: '100%', height: '100%' }} />

      {/* Overlay that will be moved into Video.js player element */}
      <div ref={overlayRef} style={{ pointerEvents: 'none', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        {isFullscreen && (
          <>
            {/* Exit Fullscreen Button */}
            <button
              onClick={exitFullscreen}
              className="exit-fullscreen-btn"
              aria-label="Vollbild beenden"
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                zIndex: 999999,
                background: exitButtonPulsing ? 'rgba(239, 68, 68, 0.85)' : 'rgba(239, 68, 68, 0.6)',
                backdropFilter: 'blur(10px)',
                border: `2px solid ${exitButtonPulsing ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.5)'}`,
                borderRadius: '10px',
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer',
                boxShadow: exitButtonPulsing ? '0 0 20px rgba(239, 68, 68, 0.6)' : '0 4px 12px rgba(0, 0, 0, 0.3)',
                pointerEvents: 'auto',
                opacity: exitButtonPulsing ? 1 : 0.7,
                animation: exitButtonPulsing ? 'pulse-glow 2s ease-in-out infinite' : 'none',
                transition: 'all 0.5s ease'
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Play/Pause Button */}
            {(!isPlaying || (isPlaying && showPauseButton)) && (
              <button
                onClick={handleButtonClick}
                className="play-pause-btn"
                aria-label={isPlaying ? (waitingForSecondClick ? 'Klick erneut zum Pausieren' : 'Pause') : 'Play'}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 999998,
                  background: waitingForSecondClick ? 'rgba(239, 68, 68, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(10px)',
                  border: waitingForSecondClick ? '5px solid rgba(239, 68, 68, 0.9)' : '5px solid rgba(255, 255, 255, 0.8)',
                  borderRadius: '50%',
                  width: '140px',
                  height: '140px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: waitingForSecondClick ? '0 0 40px rgba(239, 68, 68, 0.8)' : '0 0 40px rgba(0, 0, 0, 0.8)',
                  pointerEvents: 'auto',
                  opacity: pauseButtonOpacity,
                  transition: 'opacity 1s ease-out, background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease'
                }}
              >
                {isPlaying ? (
                  // Pause Icon
                  <svg width="70" height="70" viewBox="0 0 24 24" fill="white" stroke="none">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  // Play Icon
                  <svg width="70" height="70" viewBox="0 0 24 24" fill="white" stroke="none">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 30px rgba(239, 68, 68, 0.8), 0 0 60px rgba(239, 68, 68, 0.4);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 40px rgba(239, 68, 68, 1), 0 0 80px rgba(239, 68, 68, 0.6);
            transform: scale(1.05);
          }
        }

        .video-js .vjs-tech {
          object-fit: contain !important;
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: 100% !important;
          height: 100% !important;
        }

        .exit-fullscreen-btn:hover {
          background: rgba(220, 38, 38, 1) !important;
          transform: scale(1.15) !important;
          animation: none !important;
        }

        .exit-fullscreen-btn:active {
          transform: scale(0.9) !important;
        }

        .play-pause-btn:hover {
          background: rgba(255, 255, 255, 0.3) !important;
          border-color: rgba(255, 255, 255, 0.9) !important;
          transform: translate(-50%, -50%) scale(1.1) !important;
        }

        .play-pause-btn:active {
          transform: translate(-50%, -50%) scale(0.95) !important;
        }
      `}</style>
    </div>
  );
}
