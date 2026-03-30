import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { downloadSong, streamSong } from '../api/musicApi';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const AudioPlayer = ({ song, playlist, isPlaying, setIsPlaying, setCurrentSong }) => {
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const audioRef = useRef(null);
  
  const handleNext = useCallback(() => {
    if (!playlist || !song) return;
    const currentIndex = playlist.findIndex(s => s.id === song.id);
    if (currentIndex < playlist.length - 1) {
      setCurrentSong(playlist[currentIndex + 1]);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [playlist, song, setCurrentSong, setIsPlaying]);
  
  const handlePrevious = useCallback(() => {
    if (!playlist || !song) return;
    const currentIndex = playlist.findIndex(s => s.id === song.id);
    if (currentIndex > 0) {
      setCurrentSong(playlist[currentIndex - 1]);
      setIsPlaying(true);
    }
  }, [playlist, song, setCurrentSong, setIsPlaying]);
  
  useEffect(() => {
    if (audioRef.current && song) {
      const audio = audioRef.current;
      audio.src = streamSong(song.id);
      audio.volume = isMuted ? 0 : volume;
      
      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
        setLoading(false);
        if (isPlaying && hasUserInteracted) {
          audio.play().catch(e => {
            toast.error('▶️ Klicke Play um Musik zu hören', {
              duration: 3000,
            });
            setIsPlaying(false);
          });
        }
      };
      
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };
      
      const handleEnded = () => {
        handleNext();
      };
      
      const handleLoadStart = () => {
        setLoading(true);
      };
      
      const handlePlay = () => {
        if (!hasUserInteracted) {
          toast.success('🎵 Musik wird abgespielt!', { duration: 2000 });
        }
        setHasUserInteracted(true);
      };
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('play', handlePlay);
      
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('play', handlePlay);
      };
    }
  }, [song, handleNext, isPlaying, isMuted, volume, hasUserInteracted]);
  
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      if (isPlaying) {
        audio.play().catch(e => {
          if (!hasUserInteracted) {
            toast.info('🎵 Klicke Play um Musik zu starten', {
              duration: 3000,
            });
          }
          setIsPlaying(false);
        });
      } else {
        audio.pause();
      }
    }
  }, [isPlaying, hasUserInteracted, setIsPlaying]);
  
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);
  
  const togglePlayPause = () => {
    setHasUserInteracted(true);
    setIsPlaying(!isPlaying);
  };
  
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };
  
  const handleDownload = async () => {
    await downloadSong(song.id, song.filename);
  };
  
  if (!song) return null;
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isActuallyPlaying = isPlaying && !loading && currentTime > 0;
  
  return (
    <>
      <audio ref={audioRef} />
      <motion.div 
        className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-military-green/30 z-50"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        data-testid="audio-player"
      >
        {/* Playing Indicator */}
        <AnimatePresence>
          {isActuallyPlaying && (
            <motion.div
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-military-green via-green-400 to-military-green"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              style={{ transformOrigin: 'left' }}
            >
              <motion.div
                className="h-full w-full"
                animate={{ x: ['0%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Mobile: Compact View */}
        <div className="md:hidden">
          {!isExpanded ? (
            <div className="px-3 py-2">
              <div className="flex items-center space-x-3">
                <button
                  onClick={togglePlayPause}
                  className="p-2 bg-military-green/20 rounded-full border border-military-green/50 flex-shrink-0 relative"
                  disabled={loading}
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="w-5 h-5 border-2 border-military-green/30 border-t-military-green rounded-full" />
                    </motion.div>
                  ) : isPlaying ? (
                    <>
                      <Pause className="w-5 h-5 text-military-green" />
                      {isActuallyPlaying && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-military-green rounded-full animate-pulse" />
                      )}
                    </>
                  ) : (
                    <Play className="w-5 h-5 text-military-green" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0" onClick={() => setIsExpanded(true)}>
                  <div className="text-sm font-semibold text-military-green truncate flex items-center gap-2">
                    {isActuallyPlaying && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1 h-3 bg-military-green animate-pulse" />
                        <span className="w-1 h-4 bg-military-green animate-pulse" style={{ animationDelay: '0.15s' }} />
                        <span className="w-1 h-3 bg-military-green animate-pulse" style={{ animationDelay: '0.3s' }} />
                      </span>
                    )}
                    {song.title}
                  </div>
                  <div className="text-xs text-military-green/60 truncate">{song.artist}</div>
                </div>
                
                <div className="text-xs text-military-green/60 font-mono flex-shrink-0">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
                
                <button
                  onClick={() => setIsExpanded(true)}
                  className="p-2 text-military-green flex-shrink-0"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mt-2 h-1 bg-military-green/20 rounded-full overflow-hidden cursor-pointer" onClick={handleSeek}>
                <motion.div 
                  className="h-full bg-military-green"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
          ) : (
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-bold text-military-green terminal-text">NOW PLAYING</div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 text-military-green"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <div className="text-lg font-semibold text-military-green mb-1 flex items-center gap-2">
                  {isActuallyPlaying && (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1 h-4 bg-military-green animate-pulse" />
                      <span className="w-1 h-5 bg-military-green animate-pulse" style={{ animationDelay: '0.15s' }} />
                      <span className="w-1 h-4 bg-military-green animate-pulse" style={{ animationDelay: '0.3s' }} />
                    </span>
                  )}
                  {song.title}
                </div>
                <div className="text-sm text-military-green/60">{song.artist}</div>
              </div>
              
              <div className="mb-2">
                <div className="h-2 bg-military-green/20 rounded-full overflow-hidden cursor-pointer" onClick={handleSeek}>
                  <motion.div 
                    className="h-full bg-military-green"
                    style={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                <div className="flex justify-between text-xs text-military-green/60 mt-1 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-center space-x-6 mb-4">
                <button 
                  onClick={handlePrevious}
                  className="p-3 hover:bg-military-green/10 rounded-full transition"
                  disabled={playlist.findIndex(s => s.id === song.id) === 0}
                >
                  <SkipBack className="w-6 h-6 text-military-green" />
                </button>
                
                <button 
                  onClick={togglePlayPause}
                  className="p-4 bg-military-green/20 hover:bg-military-green/30 rounded-full transition border border-military-green/50 relative"
                  disabled={loading}
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="w-8 h-8 border-3 border-military-green/30 border-t-military-green rounded-full" />
                    </motion.div>
                  ) : isPlaying ? (
                    <>
                      <Pause className="w-8 h-8 text-military-green" />
                      {isActuallyPlaying && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-military-green rounded-full animate-pulse" />
                      )}
                    </>
                  ) : (
                    <Play className="w-8 h-8 text-military-green" />
                  )}
                </button>
                
                <button 
                  onClick={handleNext}
                  className="p-3 hover:bg-military-green/10 rounded-full transition"
                  disabled={playlist.findIndex(s => s.id === song.id) === playlist.length - 1}
                >
                  <SkipForward className="w-6 h-6 text-military-green" />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 hover:bg-military-green/10 rounded transition"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-military-green" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-military-green" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      setIsMuted(false);
                    }}
                    className="w-24 h-1 bg-military-green/20 rounded-lg appearance-none cursor-pointer accent-military-green"
                  />
                  <span className="text-xs text-military-green/60 font-mono">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>
                
                <button
                  onClick={handleDownload}
                  className="p-2 hover:bg-military-green/10 rounded transition"
                >
                  <Download className="w-5 h-5 text-military-green" />
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Desktop Player - Similar improvements */}
        <div className="hidden md:block">
          <div className="container mx-auto px-4 py-3">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-military-green/10 border border-military-green/30 flex items-center justify-center flex-shrink-0 relative">
                    <span className="text-2xl">🎵</span>
                    {isActuallyPlaying && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-military-green rounded-full animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-military-green truncate flex items-center gap-2">
                      {isActuallyPlaying && (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-0.5 h-2 bg-military-green animate-pulse" />
                          <span className="w-0.5 h-3 bg-military-green animate-pulse" style={{ animationDelay: '0.15s' }} />
                          <span className="w-0.5 h-2 bg-military-green animate-pulse" style={{ animationDelay: '0.3s' }} />
                        </span>
                      )}
                      {song.title}
                    </div>
                    <div className="text-xs text-military-green/60 truncate">{song.artist}</div>
                  </div>
                </div>
              </div>
              
              <div className="col-span-6">
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={handlePrevious}
                      className="p-2 hover:bg-military-green/10 rounded transition"
                      disabled={playlist.findIndex(s => s.id === song.id) === 0}
                      data-testid="player-previous"
                    >
                      <SkipBack className="w-5 h-5 text-military-green" />
                    </button>
                    
                    <button 
                      onClick={togglePlayPause}
                      className="p-3 bg-military-green/20 hover:bg-military-green/30 rounded-full transition border border-military-green/50 relative"
                      data-testid="player-play-pause"
                      disabled={loading}
                    >
                      {loading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <div className="w-6 h-6 border-2 border-military-green/30 border-t-military-green rounded-full" />
                        </motion.div>
                      ) : isPlaying ? (
                        <>
                          <Pause className="w-6 h-6 text-military-green" />
                          {isActuallyPlaying && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-military-green rounded-full animate-pulse" />
                          )}
                        </>
                      ) : (
                        <Play className="w-6 h-6 text-military-green" />
                      )}
                    </button>
                    
                    <button 
                      onClick={handleNext}
                      className="p-2 hover:bg-military-green/10 rounded transition"
                      disabled={playlist.findIndex(s => s.id === song.id) === playlist.length - 1}
                      data-testid="player-next"
                    >
                      <SkipForward className="w-5 h-5 text-military-green" />
                    </button>
                  </div>
                  
                  <div className="w-full">
                    <div className="h-1 bg-military-green/20 rounded-full overflow-hidden cursor-pointer" onClick={handleSeek}>
                      <motion.div 
                        className="h-full bg-military-green"
                        style={{ width: `${progress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-military-green/60 mt-1 font-mono">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-span-3 flex items-center justify-end space-x-4">
                <button
                  onClick={handleDownload}
                  className="p-2 hover:bg-military-green/10 rounded transition"
                  data-testid="player-download"
                >
                  <Download className="w-5 h-5 text-military-green" />
                </button>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 hover:bg-military-green/10 rounded transition"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-military-green" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-military-green" />
                    )}
                  </button>
                  
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      setIsMuted(false);
                    }}
                    className="w-24 h-1 bg-military-green/20 rounded-lg appearance-none cursor-pointer accent-military-green"
                  />
                  <span className="text-xs text-military-green/60 font-mono min-w-[3ch]">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default AudioPlayer;