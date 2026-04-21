'use client';

import { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { Music2, Play, Pause, SkipForward, Search, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MusicPlayerProps {
  videoId: string | null;
  isPlaying: boolean;
  isCreator: boolean;
  onStateChange?: (state: { isPlaying: boolean; currentTime: number }) => void;
  onVideoSelect?: (videoId: string) => void;
  syncTime?: number;
}

export default function MusicPlayer({ 
  videoId, 
  isPlaying, 
  isCreator, 
  onStateChange, 
  onVideoSelect,
  syncTime = 0
}: MusicPlayerProps) {
  const playerRef = useRef<any>(null);
  const [searchInput, setSearchInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Sync state from props (for participants)
  useEffect(() => {
    if (!playerRef.current || isCreator) return;

    const player = playerRef.current;
    if (isPlaying) {
      player.playVideo();
    } else {
      player.pauseVideo();
    }

    // Seek if drift is > 2 seconds
    const currentTime = player.getCurrentTime();
    if (Math.abs(currentTime - syncTime) > 2) {
      player.seekTo(syncTime);
    }
  }, [isPlaying, syncTime, isCreator, videoId]);

  const onReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    if (isPlaying) event.target.playVideo();
  };

  const handleStateChange: YouTubeProps['onStateChange'] = (event) => {
    if (!isCreator || !onStateChange) return;

    const state = event.data;
    const currentTime = event.target.getCurrentTime();

    if (state === YouTube.PlayerState.PLAYING) {
      onStateChange({ isPlaying: true, currentTime });
    } else if (state === YouTube.PlayerState.PAUSED) {
      onStateChange({ isPlaying: false, currentTime });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCreator || !onVideoSelect) return;

    // Detect if it's a full URL or just an ID
    let vid = searchInput.trim();
    if (vid.includes('youtube.com/watch?v=')) {
      vid = vid.split('v=')[1].split('&')[0];
    } else if (vid.includes('youtu.be/')) {
      vid = vid.split('youtu.be/')[1].split('?')[0];
    }
    
    if (vid) {
      onVideoSelect(vid);
      setSearchInput('');
    }
  };

  const opts: YouTubeProps['opts'] = {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 1,
      controls: isCreator ? 1 : 0,
      disablekb: isCreator ? 0 : 1,
      modestbranding: 1,
    },
  };

  return (
    <div className={`fixed bottom-6 left-6 z-50 transition-all duration-500 ${isExpanded ? 'w-80' : 'w-14'}`}>
      <div className="glass rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden">
        {/* Header / Toggle */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-14 flex items-center justify-between px-4 cursor-pointer hover:bg-white/5 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center ${isPlaying ? 'animate-pulse' : ''}`}>
              <Music2 size={14} className="text-black" />
            </div>
            {isExpanded && (
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                {videoId ? (isPlaying ? 'Now Playing' : 'Paused') : 'Room Radio'}
              </span>
            )}
          </div>
          {isExpanded && (
             <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                <ExternalLink size={14} className="text-gray-500" />
             </motion.div>
          )}
        </div>

        {/* Player Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-6 pt-0 space-y-4"
            >
              {isCreator ? (
                <form onSubmit={handleSearch} className="relative">
                  <input 
                    type="text" 
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Paste YouTube Link..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 pr-10 text-xs outline-none focus:border-emerald-500 transition-all font-medium"
                  />
                  <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-500 transition-all">
                    <Search size={16} />
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                     DJ-Mode: Controlled by Host
                   </p>
                </div>
              )}

              {/* Hidden Player */}
              {videoId && (
                <YouTube 
                  videoId={videoId} 
                  opts={opts} 
                  onReady={onReady} 
                  onStateChange={handleStateChange}
                  className="hidden"
                />
              )}

              {videoId ? (
                <div className="space-y-4">
                  <div className="aspect-video w-full rounded-2xl bg-black border border-white/5 overflow-hidden relative">
                    <img 
                      src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} 
                      className="w-full h-full object-cover opacity-50 blur-sm"
                      alt=""
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                       {isPlaying ? <Play className="text-emerald-500 animate-pulse" /> : <Pause className="text-gray-400" />}
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    {isCreator && (
                      <>
                        <button 
                          onClick={() => playerRef.current?.pauseVideo()}
                          className={`p-3 rounded-full hover:bg-white/5 transition-all ${!isPlaying ? 'text-emerald-500 bg-emerald-500/10' : 'text-gray-400'}`}
                        >
                          <Pause size={18} />
                        </button>
                        <button 
                          onClick={() => playerRef.current?.playVideo()}
                          className={`p-3 rounded-full hover:bg-white/5 transition-all ${isPlaying ? 'text-emerald-500 bg-emerald-500/10' : 'text-gray-400'}`}
                        >
                          <Play size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                   <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Music2 className="text-gray-600" />
                   </div>
                   <p className="text-xs text-gray-500 font-medium">Select a lofi track to start the library vibes.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
