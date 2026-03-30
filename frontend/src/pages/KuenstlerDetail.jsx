import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { artistsApi, songsApi } from '../api/musicApi';
import { Play, ArrowLeft, Music, Heart, User } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeIn = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

const formatDuration = (s) => {
  if (!s) return '0:00';
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};

export default function KuenstlerDetail({ playSong }) {
  const { name } = useParams();
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSongs = useCallback(async () => {
    try {
      const { data } = await artistsApi.getSongs(decodeURIComponent(name));
      setSongs(data);
    } catch {
      navigate('/bibliothek');
    } finally {
      setLoading(false);
    }
  }, [name, navigate]);

  useEffect(() => { loadSongs(); }, [loadSongs]);

  const handleLike = async (song) => {
    const { data } = await songsApi.toggleLike(song.id);
    setSongs(prev => prev.map(s => s.id === song.id ? { ...s, is_liked: data.is_liked } : s));
  };

  const decodedName = decodeURIComponent(name);
  const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0);

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <div className="flex items-center gap-5">
        <button onClick={() => navigate('/bibliothek')} className="p-2 rounded-xl hover:bg-white/5 transition-all" data-testid="artist-back-button">
          <ArrowLeft size={20} className="text-hf-text-muted" />
        </button>
        <div className="w-20 h-20 bg-hf-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
          <User size={36} className="text-hf-gold" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight" data-testid="artist-name">{decodedName}</h1>
          <p className="text-hf-text-muted text-sm mt-1">{songs.length} Songs &middot; {Math.floor(totalDuration / 60)} Min.</p>
        </div>
      </div>

      {songs.length > 0 && (
        <button onClick={() => playSong(songs[0], songs)} className="bg-hf-gold hover:bg-hf-gold-hover text-hf-bg font-bold px-8 py-3 rounded-full text-sm transition-all flex items-center gap-2" data-testid="artist-play-all">
          <Play size={18} /> Alle abspielen
        </button>
      )}

      {loading && <div className="text-hf-text-muted text-center py-12">Laden...</div>}

      <div className="space-y-1">
        {songs.map((song, i) => (
          <div key={song.id} className="group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer" data-testid={`artist-track-${song.id}`}>
            <div className="w-8 text-center text-sm text-hf-text-muted group-hover:hidden">{i + 1}</div>
            <button onClick={() => playSong(song, songs)} className="w-8 text-center hidden group-hover:block">
              <Play size={16} className="text-hf-gold mx-auto" />
            </button>
            <div className="w-10 h-10 bg-hf-surface rounded-lg flex items-center justify-center flex-shrink-0">
              <Music size={16} className="text-hf-border" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{song.title}</div>
              <div className="text-xs text-hf-text-muted truncate">{song.album}</div>
            </div>
            <button onClick={() => handleLike(song)} className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Heart size={16} className={song.is_liked ? 'fill-hf-gold text-hf-gold' : 'text-hf-text-muted hover:text-white'} />
            </button>
            <div className="text-xs text-hf-text-muted w-12 text-right">{formatDuration(song.duration)}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
