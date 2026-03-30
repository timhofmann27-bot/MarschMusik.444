import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { songsApi, artistsApi, albumsApi } from '../api/musicApi';
import { Play, Music, User, Disc, Trash2, Heart, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Bibliothek({ playSong }) {
  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [tab, setTab] = useState('songs');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, ar, al] = await Promise.all([songsApi.getAll(), artistsApi.getAll(), albumsApi.getAll()]);
      setSongs(s.data);
      setArtists(ar.data);
      setAlbums(al.data);
    } catch { /* empty */ }
    setLoading(false);
  };

  const fmt = (s) => {
    if (!s) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Song wirklich loeschen?')) return;
    try {
      await songsApi.delete(id);
      setSongs(prev => prev.filter(s => s.id !== id));
      toast.success('Song geloescht');
    } catch { toast.error('Fehler beim Loeschen'); }
  };

  const handleLike = async (song) => {
    try {
      const { data } = await songsApi.toggleLike(song.id);
      setSongs(prev => prev.map(s => s.id === song.id ? { ...s, is_liked: data.is_liked } : s));
    } catch { /* empty */ }
  };

  const tabs = [
    { id: 'songs', label: `Songs (${songs.length})` },
    { id: 'artists', label: `Kuenstler (${artists.length})` },
    { id: 'albums', label: `Alben (${albums.length})` },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight" data-testid="library-title">Bibliothek</h1>

      <div className="flex gap-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-hf-gold text-hf-bg' : 'bg-white/5 text-hf-text-muted hover:text-white hover:bg-white/10'
            }`}
            data-testid={`tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-hf-text-muted text-center py-12">Laden...</div>}

      {/* Songs */}
      {tab === 'songs' && !loading && (
        <div className="space-y-1">
          {songs.length > 0 && (
            <button
              onClick={() => playSong(songs[0], songs)}
              className="bg-hf-gold hover:bg-hf-gold-hover text-hf-bg font-bold px-6 py-2.5 rounded-full text-sm transition-all flex items-center gap-2 mb-4"
              data-testid="play-all-songs"
            >
              <Play size={16} /> Alle abspielen
            </button>
          )}
          {songs.map((song, i) => (
            <div key={song.id} className="group flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-3 rounded-xl hover:bg-white/5 transition-all duration-200 cursor-pointer" data-testid={`track-row-${song.id}`}>
              <div className="w-6 sm:w-8 text-center text-sm text-hf-text-muted group-hover:hidden hidden sm:block">{i + 1}</div>
              <button onClick={() => playSong(song, songs)} className="w-6 sm:w-8 text-center hidden group-hover:block" data-testid={`track-play-${song.id}`}>
                <Play size={16} className="text-hf-gold mx-auto" />
              </button>
              <button onClick={() => playSong(song, songs)} className="sm:hidden w-8 flex-shrink-0 text-center" data-testid={`track-play-mobile-${song.id}`}>
                <Play size={14} className="text-hf-text-muted mx-auto" />
              </button>
              <div className="w-10 h-10 bg-hf-surface rounded-lg items-center justify-center flex-shrink-0 hidden sm:flex">
                <Disc size={18} className="text-hf-gold/25" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{song.title}</div>
                <div className="text-xs text-hf-text-muted truncate">{song.artist}</div>
              </div>
              <div className="text-xs text-hf-text-muted hidden sm:block truncate max-w-[120px]">{song.album}</div>
              <button onClick={() => handleLike(song)} className="p-1.5 hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`like-${song.id}`}>
                <Heart size={16} className={song.is_liked ? 'fill-hf-gold text-hf-gold' : 'text-hf-text-muted hover:text-white'} />
              </button>
              <button onClick={() => songsApi.download(song.id, song.filename)} className="p-1.5 hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`download-${song.id}`}>
                <Download size={14} className="text-hf-text-muted hover:text-white" />
              </button>
              <div className="text-xs text-hf-text-muted w-10 sm:w-12 text-right flex-shrink-0">{fmt(song.duration)}</div>
              <button onClick={() => handleDelete(song.id)} className="p-1.5 hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`delete-${song.id}`}>
                <Trash2 size={14} className="text-hf-text-muted hover:text-red-400" />
              </button>
            </div>
          ))}
          {songs.length === 0 && <div className="text-center py-12 text-hf-text-muted">Noch keine Songs in deiner Bibliothek</div>}
        </div>
      )}

      {/* Artists - now clickable */}
      {tab === 'artists' && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {artists.map(a => (
            <button
              key={a.name}
              onClick={() => navigate(`/kuenstler/${encodeURIComponent(a.name)}`)}
              className="bg-hf-surface hover:bg-hf-surface-hover border border-hf-border rounded-xl p-5 transition-all duration-300 text-center group"
              data-testid={`artist-card-${a.name}`}
            >
              <div className="w-16 h-16 bg-hf-gold/10 group-hover:bg-hf-gold/20 rounded-full flex items-center justify-center mx-auto mb-3 transition-all">
                <User size={24} className="text-hf-gold" />
              </div>
              <div className="font-semibold text-white text-sm truncate">{a.name}</div>
              <div className="text-xs text-hf-text-muted mt-1">{a.song_count} Songs</div>
            </button>
          ))}
          {artists.length === 0 && <div className="col-span-full text-center py-12 text-hf-text-muted">Keine Kuenstler gefunden</div>}
        </div>
      )}

      {/* Albums - now clickable */}
      {tab === 'albums' && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {albums.map(a => (
            <button
              key={`${a.name}-${a.artist}`}
              onClick={() => navigate(`/alben/${encodeURIComponent(a.name)}`)}
              className="bg-hf-surface hover:bg-hf-surface-hover border border-hf-border rounded-xl p-5 transition-all duration-300 text-left group"
              data-testid={`album-card-${a.name}`}
            >
              <div className="w-full aspect-square bg-hf-bg group-hover:bg-hf-gold/5 rounded-lg mb-3 flex items-center justify-center transition-all">
                <Disc size={32} className="text-hf-border group-hover:text-hf-gold/40 transition-colors" />
              </div>
              <div className="font-semibold text-white text-sm truncate">{a.name}</div>
              <div className="text-xs text-hf-text-muted truncate">{a.artist} &middot; {a.song_count} Songs</div>
            </button>
          ))}
          {albums.length === 0 && <div className="col-span-full text-center py-12 text-hf-text-muted">Keine Alben gefunden</div>}
        </div>
      )}
    </motion.div>
  );
}
