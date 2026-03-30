import { useState, useEffect } from 'react';
import { songsApi } from '../api/musicApi';
import { Heart, Play, Music } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Favoriten({ playSong }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    songsApi.getLiked().then(r => setSongs(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const formatDuration = (s) => {
    if (!s) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const handleUnlike = async (song) => {
    await songsApi.toggleLike(song.id);
    setSongs(prev => prev.filter(s => s.id !== song.id));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight" data-testid="favorites-title">
          <Heart size={28} className="inline text-hf-gold mr-2 fill-hf-gold" />
          Favoriten
        </h1>
        <p className="text-hf-text-muted mt-2">{songs.length} Lieblingssongs</p>
      </div>

      {songs.length > 0 && (
        <button
          onClick={() => playSong(songs[0], songs)}
          className="bg-hf-gold hover:bg-hf-gold-hover text-hf-bg font-bold px-8 py-3 rounded-full text-sm transition-all flex items-center gap-2"
          data-testid="play-favorites-button"
        >
          <Play size={18} /> Alle abspielen
        </button>
      )}

      {loading && <div className="text-hf-text-muted text-center py-12">Laden...</div>}

      <div className="space-y-1">
        {songs.map((song, i) => (
          <div key={song.id} className="group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer" data-testid={`fav-track-${song.id}`}>
            <div className="w-8 text-center text-sm text-hf-text-muted group-hover:hidden">{i + 1}</div>
            <button onClick={() => playSong(song, songs)} className="w-8 text-center hidden group-hover:block">
              <Play size={16} className="text-hf-gold mx-auto" />
            </button>
            <div className="w-10 h-10 bg-hf-surface rounded-lg flex items-center justify-center flex-shrink-0">
              <Music size={16} className="text-hf-border" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{song.title}</div>
              <div className="text-xs text-hf-text-muted truncate">{song.artist}</div>
            </div>
            <div className="text-xs text-hf-text-muted w-12 text-right">{formatDuration(song.duration)}</div>
            <button onClick={() => handleUnlike(song)} className="p-1.5 transition-opacity" data-testid={`unfav-${song.id}`}>
              <Heart size={16} className="fill-hf-gold text-hf-gold" />
            </button>
          </div>
        ))}
      </div>

      {!loading && songs.length === 0 && (
        <div className="text-center py-16">
          <Heart size={48} className="text-hf-border mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Keine Favoriten</h3>
          <p className="text-hf-text-muted text-sm">Markiere Songs mit dem Herz-Symbol als Favoriten</p>
        </div>
      )}
    </motion.div>
  );
}
