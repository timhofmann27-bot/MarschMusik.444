import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download, Shuffle, Repeat, ChevronUp, ChevronDown, Music } from 'lucide-react';
import { songsApi } from '../api/musicApi';
import { motion, AnimatePresence } from 'framer-motion';

const PlayerBar = ({ song, playlist, isPlaying, setIsPlaying, setCurrentSong, shuffle, setShuffle, repeatMode, setRepeatMode }) => {
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const audioRef = useRef(null);

  const handleNext = useCallback(() => {
    if (!playlist?.length || !song) return;
    const idx = playlist.findIndex(s => s.id === song.id);
    if (shuffle) {
      const next = Math.floor(Math.random() * playlist.length);
      setCurrentSong(playlist[next]);
      setIsPlaying(true);
    } else if (idx < playlist.length - 1) {
      setCurrentSong(playlist[idx + 1]);
      setIsPlaying(true);
    } else if (repeatMode === 'all') {
      setCurrentSong(playlist[0]);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [playlist, song, shuffle, repeatMode, setCurrentSong, setIsPlaying]);

  const handlePrev = useCallback(() => {
    if (!playlist?.length || !song) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const idx = playlist.findIndex(s => s.id === song.id);
    if (idx > 0) { setCurrentSong(playlist[idx - 1]); setIsPlaying(true); }
  }, [playlist, song, setCurrentSong, setIsPlaying]);

  useEffect(() => {
    if (!audioRef.current || !song) return;
    const audio = audioRef.current;
    audio.src = songsApi.streamUrl(song.id);
    audio.volume = isMuted ? 0 : volume;
    setLoading(true);

    const onLoaded = () => {
      setDuration(audio.duration);
      setLoading(false);
      if (isPlaying && interacted) audio.play().catch(() => setIsPlaying(false));
    };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      if (repeatMode === 'one') { audio.currentTime = 0; audio.play(); }
      else handleNext();
    };
    const onPlay = () => setInteracted(true);

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    return () => { audio.removeEventListener('loadedmetadata', onLoaded); audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnded); audio.removeEventListener('play', onPlay); };
  }, [song, handleNext, isPlaying, isMuted, volume, interacted, repeatMode]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.play().catch(() => setIsPlaying(false));
    else audioRef.current.pause();
  }, [isPlaying, setIsPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const togglePlay = () => { setInteracted(true); setIsPlaying(!isPlaying); };
  const fmt = (s) => { if (!s || isNaN(s)) return '0:00'; return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`; };
  const handleSeek = (e) => { const rect = e.currentTarget.getBoundingClientRect(); const pct = (e.clientX - rect.left) / rect.width; if (audioRef.current) { audioRef.current.currentTime = pct * duration; setCurrentTime(pct * duration); } };

  if (!song) return null;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <audio ref={audioRef} />
      <motion.div
        className="fixed bottom-0 left-0 right-0 md:left-64 bg-hf-bg/80 backdrop-blur-2xl border-t border-hf-gold/20 z-50"
        initial={{ y: 100 }} animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        data-testid="audio-player"
      >
        {/* Mobile */}
        <div className="md:hidden">
          {!expanded ? (
            <div className="px-3 py-2.5">
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} disabled={loading} className="p-2 bg-hf-gold rounded-full flex-shrink-0" data-testid="mobile-play-pause">
                  {loading ? <div className="w-5 h-5 border-2 border-hf-bg/30 border-t-hf-bg rounded-full animate-spin" /> : isPlaying ? <Pause size={16} className="text-hf-bg" /> : <Play size={16} className="text-hf-bg ml-0.5" />}
                </button>
                <div className="flex-1 min-w-0" onClick={() => setExpanded(true)}>
                  <div className="text-sm font-semibold text-white truncate">{song.title}</div>
                  <div className="text-xs text-hf-text-muted truncate">{song.artist}</div>
                </div>
                <span className="text-xs text-hf-text-muted">{fmt(currentTime)}</span>
                <button onClick={() => setExpanded(true)} className="p-1 text-hf-text-muted"><ChevronUp size={18} /></button>
              </div>
              <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer" onClick={handleSeek}>
                <div className="h-full bg-hf-gold rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <div className="px-5 py-5 pb-20">
              <div className="flex justify-between mb-6">
                <span className="text-xs text-hf-text-muted uppercase tracking-widest">Wiedergabe</span>
                <button onClick={() => setExpanded(false)} className="text-hf-text-muted"><ChevronDown size={20} /></button>
              </div>
              <div className="w-48 h-48 mx-auto bg-hf-surface rounded-2xl flex items-center justify-center mb-6">
                <Music size={64} className="text-hf-gold/30" />
              </div>
              <div className="text-center mb-6">
                <div className="text-xl font-bold text-white">{song.title}</div>
                <div className="text-sm text-hf-text-muted">{song.artist}</div>
              </div>
              <div className="mb-4">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer" onClick={handleSeek}>
                  <div className="h-full bg-hf-gold rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between text-xs text-hf-text-muted mt-1.5"><span>{fmt(currentTime)}</span><span>{fmt(duration)}</span></div>
              </div>
              <div className="flex items-center justify-center gap-6 mb-6">
                <button onClick={() => setShuffle(!shuffle)} className={`p-2 rounded-full transition-all ${shuffle ? 'text-hf-gold' : 'text-hf-text-muted'}`}><Shuffle size={18} /></button>
                <button onClick={handlePrev} className="p-3 hover:bg-white/5 rounded-full"><SkipBack size={22} className="text-white" /></button>
                <button onClick={togglePlay} disabled={loading} className="p-4 bg-hf-gold hover:bg-hf-gold-hover rounded-full transition-all" data-testid="expanded-play-pause">
                  {loading ? <div className="w-7 h-7 border-3 border-hf-bg/30 border-t-hf-bg rounded-full animate-spin" /> : isPlaying ? <Pause size={24} className="text-hf-bg" /> : <Play size={24} className="text-hf-bg ml-0.5" />}
                </button>
                <button onClick={handleNext} className="p-3 hover:bg-white/5 rounded-full"><SkipForward size={22} className="text-white" /></button>
                <button onClick={() => setRepeatMode(repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off')} className={`p-2 rounded-full relative transition-all ${repeatMode !== 'off' ? 'text-hf-gold' : 'text-hf-text-muted'}`}>
                  <Repeat size={18} />
                  {repeatMode === 'one' && <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-hf-gold">1</span>}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsMuted(!isMuted)} className="text-hf-text-muted">{isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
                <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={e => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }} className="flex-1" />
                <button onClick={() => songsApi.download(song.id, song.filename)} className="text-hf-text-muted hover:text-white"><Download size={18} /></button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop */}
        <div className="hidden md:block">
          <div className="px-6 py-3">
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* Song info */}
              <div className="col-span-3 flex items-center gap-3">
                <div className="w-12 h-12 bg-hf-surface rounded-lg flex items-center justify-center flex-shrink-0">
                  <Music size={20} className="text-hf-gold/40" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{song.title}</div>
                  <div className="text-xs text-hf-text-muted truncate">{song.artist}</div>
                </div>
              </div>

              {/* Controls */}
              <div className="col-span-6 flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShuffle(!shuffle)} className={`p-1.5 rounded-full transition-all ${shuffle ? 'text-hf-gold' : 'text-hf-text-muted hover:text-white'}`} data-testid="shuffle-button"><Shuffle size={16} /></button>
                  <button onClick={handlePrev} className="p-2 hover:bg-white/5 rounded-full transition-all" data-testid="player-previous"><SkipBack size={18} className="text-white" /></button>
                  <button onClick={togglePlay} disabled={loading} className="p-3 bg-hf-gold hover:bg-hf-gold-hover rounded-full transition-all" data-testid="player-play-pause">
                    {loading ? <div className="w-5 h-5 border-2 border-hf-bg/30 border-t-hf-bg rounded-full animate-spin" /> : isPlaying ? <Pause size={18} className="text-hf-bg" /> : <Play size={18} className="text-hf-bg ml-0.5" />}
                  </button>
                  <button onClick={handleNext} className="p-2 hover:bg-white/5 rounded-full transition-all" data-testid="player-next"><SkipForward size={18} className="text-white" /></button>
                  <button onClick={() => setRepeatMode(repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off')} className={`p-1.5 rounded-full relative transition-all ${repeatMode !== 'off' ? 'text-hf-gold' : 'text-hf-text-muted hover:text-white'}`} data-testid="repeat-button">
                    <Repeat size={16} />
                    {repeatMode === 'one' && <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-hf-gold">1</span>}
                  </button>
                </div>
                <div className="w-full flex items-center gap-2">
                  <span className="text-xs text-hf-text-muted w-10 text-right">{fmt(currentTime)}</span>
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer group" onClick={handleSeek}>
                    <div className="h-full bg-hf-gold rounded-full group-hover:bg-hf-gold-hover transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs text-hf-text-muted w-10">{fmt(duration)}</span>
                </div>
              </div>

              {/* Volume + download */}
              <div className="col-span-3 flex items-center justify-end gap-3">
                <button onClick={() => songsApi.download(song.id, song.filename)} className="p-2 text-hf-text-muted hover:text-white transition-all" data-testid="player-download"><Download size={16} /></button>
                <button onClick={() => setIsMuted(!isMuted)} className="text-hf-text-muted hover:text-white transition-all">{isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
                <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={e => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }} className="w-24" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default PlayerBar;
