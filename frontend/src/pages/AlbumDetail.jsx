import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { albumsApi, songsApi } from '../api/musicApi';
import { Play, ArrowLeft, Music, Heart, Disc } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AlbumDetail({ playSong }) {
  const { name } = useParams();
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    albumsApi.getSongs(decodeURIComponent(name))
      .then(r => setSongs(r.data))
      .catch(() => navigate('/bibliothek'))
      .finally(() => setLoading(false));
  }, [name, navigate]);

  const formatDuration = (s) => {
    if (!s) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  const artist = songs[0]?.artist || 'Unbekannt';
  const year = songs[0]?.year;

  const handleLike = async (song) => {
    const { data } = await songsApi.toggleLike(song.id);
    setSongs(prev => prev.map(s => s.id === song.id ? { ...s, is_liked: data.is_liked } : s));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-5">
        <button onClick={() => navigate('/bibliothek')} className="p-2 rounded-xl hover:bg-white/5 transition-all" data-testid="album-back-button">
          <ArrowLeft size={20} className="text-hf-text-muted" />
        </button>
        <div className="w-20 h-20 bg-gradient-to-br from-hf-gold/20 to-hf-gold/5 rounded-xl flex items-center justify-center flex-shrink-0">
          <Disc size={36} className="text-hf-gold" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight" data-testid="album-name">{decodeURIComponent(name)}</h1>
          <p className="text-hf-text-muted text-sm mt-1">
            {artist} {year && `· ${year}`} &middot; {songs.length} Songs &middot; {Math.floor(totalDuration / 60)} Min.
          </p>
        </div>
      </div>

      {songs.length > 0 && (
        <button
          onClick={() => playSong(songs[0], songs)}
          className="bg-hf-gold hover:bg-hf-gold-hover text-hf-bg font-bold px-8 py-3 rounded-full text-sm transition-all flex items-center gap-2"
          data-testid="album-play-all"
        >
          <Play size={18} /> Alle abspielen
        </button>
      )}

      {loading && <div className="text-hf-text-muted text-center py-12">Laden...</div>}

      <div className="space-y-1">
        {songs.map((song, i) => (
          <div key={song.id} className="group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer" data-testid={`album-track-${song.id}`}>
            <div className="w-8 text-center text-sm text-hf-text-muted group-hover:hidden">{i + 1}</div>
            <button onClick={() => playSong(song, songs)} className="w-8 text-center hidden group-hover:block">
              <Play size={16} className="text-hf-gold mx-auto" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{song.title}</div>
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
