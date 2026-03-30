import { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download, Shuffle, Repeat, ChevronUp, ChevronDown, Music, ListMusic, X, Disc } from 'lucide-react';
import { songsApi } from '../api/musicApi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioPlayer, formatTime } from '../hooks/useAudioPlayer';

const fadeSlideUp = { initial: { y: 100 }, animate: { y: 0 }, transition: { type: 'spring', stiffness: 300, damping: 30 } };

function PlayPauseButton({ isPlaying, loading, onClick, size = 18, className = "" }) {
  if (loading) {
    return (
      <button disabled className={`bg-hf-gold rounded-full flex items-center justify-center ${className}`}>
        <div className={`border-2 border-hf-bg/30 border-t-hf-bg rounded-full animate-spin`} style={{ width: size, height: size }} />
      </button>
    );
  }
  return (
    <button onClick={onClick} className={`bg-hf-gold hover:bg-hf-gold-hover rounded-full flex items-center justify-center transition-all ${className}`}>
      {isPlaying ? <Pause size={size} className="text-hf-bg" /> : <Play size={size} className="text-hf-bg ml-0.5" />}
    </button>
  );
}

function ProgressBar({ progress, onSeek, className = "" }) {
  return (
    <div className={`h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer group ${className}`} onClick={onSeek}>
      <div className="h-full bg-hf-gold rounded-full group-hover:bg-hf-gold-hover transition-all" style={{ width: `${progress}%` }} />
    </div>
  );
}

function QueuePanel({ playlist, song, setCurrentSong, setIsPlaying, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-full right-4 mb-2 w-80 max-h-80 bg-hf-surface border border-hf-border rounded-xl shadow-2xl overflow-hidden z-50"
      data-testid="queue-panel"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-hf-border">
        <span className="text-sm font-bold text-white">Warteschlange</span>
        <button onClick={onClose} className="text-hf-text-muted hover:text-white"><X size={16} /></button>
      </div>
      <div className="overflow-y-auto max-h-64">
        {playlist.map((s, i) => {
          const isCurrent = s.id === song?.id;
          return (
            <button
              key={s.id}
              onClick={() => { setCurrentSong(s); setIsPlaying(true); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-all ${isCurrent ? 'bg-hf-gold/10' : ''}`}
            >
              <div className="w-6 text-center text-xs text-hf-text-muted">
                {isCurrent ? <Play size={12} className="text-hf-gold mx-auto" /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium truncate ${isCurrent ? 'text-hf-gold' : 'text-white'}`}>{s.title}</div>
                <div className="text-[10px] text-hf-text-muted truncate">{s.artist}</div>
              </div>
              <span className="text-[10px] text-hf-text-muted">{formatTime(s.duration)}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

function MobilePlayer({ song, player, isPlaying, shuffle, setShuffle, repeatMode, setRepeatMode, expanded, setExpanded }) {
  if (!expanded) {
    return (
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-3">
          <PlayPauseButton isPlaying={isPlaying} loading={player.loading} onClick={player.togglePlay} size={16} className="p-2" />
          <div className="flex-1 min-w-0" onClick={() => setExpanded(true)}>
            <div className="text-sm font-semibold text-white truncate">{song.title}</div>
            <div className="text-xs text-hf-text-muted truncate">{song.artist}</div>
          </div>
          <span className="text-xs text-hf-text-muted">{formatTime(player.currentTime)}</span>
          <button onClick={() => setExpanded(true)} className="p-1 text-hf-text-muted"><ChevronUp size={18} /></button>
        </div>
        <ProgressBar progress={player.progress} onSeek={player.handleSeek} className="mt-2" />
      </div>
    );
  }

  return (
    <div className="px-5 py-5 pb-20">
      <div className="flex justify-between mb-6">
        <span className="text-xs text-hf-text-muted uppercase tracking-widest">Wiedergabe</span>
        <button onClick={() => setExpanded(false)} className="text-hf-text-muted"><ChevronDown size={20} /></button>
      </div>
      <div className="w-48 h-48 mx-auto bg-hf-surface rounded-2xl flex items-center justify-center mb-6">
        <Disc size={64} className="text-hf-gold/30" />
      </div>
      <div className="text-center mb-6">
        <div className="text-xl font-bold text-white">{song.title}</div>
        <div className="text-sm text-hf-text-muted">{song.artist}</div>
      </div>
      <div className="mb-4">
        <ProgressBar progress={player.progress} onSeek={player.handleSeek} className="h-1.5" />
        <div className="flex justify-between text-xs text-hf-text-muted mt-1.5">
          <span>{formatTime(player.currentTime)}</span>
          <span>{formatTime(player.duration)}</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-6 mb-6">
        <button onClick={() => setShuffle(!shuffle)} className={`p-2 rounded-full transition-all ${shuffle ? 'text-hf-gold' : 'text-hf-text-muted'}`}><Shuffle size={18} /></button>
        <button onClick={player.handlePrev} className="p-3 hover:bg-white/5 rounded-full"><SkipBack size={22} className="text-white" /></button>
        <PlayPauseButton isPlaying={isPlaying} loading={player.loading} onClick={player.togglePlay} size={24} className="p-4" />
        <button onClick={player.handleNext} className="p-3 hover:bg-white/5 rounded-full"><SkipForward size={22} className="text-white" /></button>
        <RepeatButton repeatMode={repeatMode} setRepeatMode={setRepeatMode} size={18} />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={player.toggleMute} className="text-hf-text-muted">{player.isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <input type="range" min="0" max="1" step="0.01" value={player.isMuted ? 0 : player.volume} onChange={e => { player.setVolume(parseFloat(e.target.value)); }} className="flex-1" />
        <button onClick={() => songsApi.download(song.id, song.filename)} className="text-hf-text-muted hover:text-white"><Download size={18} /></button>
      </div>
    </div>
  );
}

function RepeatButton({ repeatMode, setRepeatMode, size = 16 }) {
  const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
  return (
    <button
      onClick={() => setRepeatMode(nextMode)}
      className={`p-1.5 rounded-full relative transition-all ${repeatMode !== 'off' ? 'text-hf-gold' : 'text-hf-text-muted hover:text-white'}`}
      data-testid="repeat-button"
    >
      <Repeat size={size} />
      {repeatMode === 'one' && <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-hf-gold">1</span>}
    </button>
  );
}

export default function PlayerBar({ song, playlist, isPlaying, setIsPlaying, setCurrentSong, shuffle, setShuffle, repeatMode, setRepeatMode }) {
  const [expanded, setExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  const player = useAudioPlayer({ song, playlist, isPlaying, setIsPlaying, setCurrentSong, shuffle, repeatMode });

  if (!song) return null;

  return (
    <>
      <audio ref={player.audioRef} />
      <motion.div
        className="fixed bottom-0 left-0 right-0 md:left-64 bg-hf-bg/80 backdrop-blur-2xl border-t border-hf-gold/20 z-50"
        {...fadeSlideUp}
        data-testid="audio-player"
      >
        {/* Mobile */}
        <div className="md:hidden">
          <MobilePlayer
            song={song} player={player} isPlaying={isPlaying}
            shuffle={shuffle} setShuffle={setShuffle}
            repeatMode={repeatMode} setRepeatMode={setRepeatMode}
            expanded={expanded} setExpanded={setExpanded}
          />
        </div>

        {/* Desktop */}
        <div className="hidden md:block">
          <div className="px-6 py-3">
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* Song info */}
              <div className="col-span-3 flex items-center gap-3">
                <div className="w-12 h-12 bg-hf-surface rounded-lg flex items-center justify-center flex-shrink-0">
                  <Disc size={20} className="text-hf-gold/30" />
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
                  <button onClick={player.handlePrev} className="p-2 hover:bg-white/5 rounded-full transition-all" data-testid="player-previous"><SkipBack size={18} className="text-white" /></button>
                  <PlayPauseButton isPlaying={isPlaying} loading={player.loading} onClick={player.togglePlay} size={18} className="p-3" />
                  <button onClick={player.handleNext} className="p-2 hover:bg-white/5 rounded-full transition-all" data-testid="player-next"><SkipForward size={18} className="text-white" /></button>
                  <RepeatButton repeatMode={repeatMode} setRepeatMode={setRepeatMode} />
                </div>
                <div className="w-full flex items-center gap-2">
                  <span className="text-xs text-hf-text-muted w-10 text-right">{formatTime(player.currentTime)}</span>
                  <ProgressBar progress={player.progress} onSeek={player.handleSeek} className="flex-1" />
                  <span className="text-xs text-hf-text-muted w-10">{formatTime(player.duration)}</span>
                </div>
              </div>

              {/* Volume + queue + download */}
              <div className="col-span-3 flex items-center justify-end gap-3">
                <button onClick={() => setShowQueue(!showQueue)} className={`p-2 transition-all rounded-full ${showQueue ? 'text-hf-gold' : 'text-hf-text-muted hover:text-white'}`} data-testid="queue-button"><ListMusic size={16} /></button>
                <button onClick={() => songsApi.download(song.id, song.filename)} className="p-2 text-hf-text-muted hover:text-white transition-all" data-testid="player-download"><Download size={16} /></button>
                <button onClick={player.toggleMute} className="text-hf-text-muted hover:text-white transition-all">{player.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
                <input type="range" min="0" max="1" step="0.01" value={player.isMuted ? 0 : player.volume} onChange={e => { player.setVolume(parseFloat(e.target.value)); }} className="w-24" />
              </div>
            </div>
          </div>
        </div>

        {/* Queue Panel */}
        <AnimatePresence>
          {showQueue && (
            <QueuePanel
              playlist={playlist} song={song}
              setCurrentSong={setCurrentSong} setIsPlaying={setIsPlaying}
              onClose={() => setShowQueue(false)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
