import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { playlistsApi, songsApi } from '../api/musicApi';
import { Play, ArrowLeft, Music, Heart, Trash2, Clock, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function PlaylistDetailPage({ playSong }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [allSongs, setAllSongs] = useState([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    loadPlaylist();
  }, [id]);

  const loadPlaylist = async () => {
    try {
      const { data } = await playlistsApi.get(id);
      setPlaylist(data);
    } catch { navigate('/playlists'); }
  };

  const loadAllSongs = async () => {
    const { data } = await songsApi.getAll();
    const existing = new Set(playlist?.song_ids || []);
    setAllSongs(data.filter(s => !existing.has(s.id)));
    setShowAdd(true);
  };

  const handleAddSong = async (songId) => {
    try {
      await playlistsApi.addSong(id, songId);
      toast.success('Song hinzugefuegt');
      loadPlaylist();
      setAllSongs(prev => prev.filter(s => s.id !== songId));
    } catch { toast.error('Fehler'); }
  };

  const handleRemoveSong = async (songId) => {
    try {
      await playlistsApi.removeSong(id, songId);
      toast.success('Song entfernt');
      loadPlaylist();
    } catch { toast.error('Fehler'); }
  };

  const formatDuration = (s) => {
    if (!s) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const totalDuration = (playlist?.songs || []).reduce((acc, s) => acc + (s.duration || 0), 0);

  if (!playlist) return <div className="text-hf-text-muted text-center py-12">Laden...</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-6">
        <button onClick={() => navigate('/playlists')} className="p-2 rounded-xl hover:bg-white/5 transition-all mt-1" data-testid="back-button">
          <ArrowLeft size={20} className="text-hf-text-muted" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight" data-testid="playlist-detail-title">{playlist.name}</h1>
          {playlist.description && <p className="text-hf-text-muted mt-1">{playlist.description}</p>}
          <div className="flex items-center gap-3 mt-2 text-xs text-hf-text-muted">
            <span>{playlist.songs?.length || 0} Songs</span>
            <span>&middot;</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {Math.floor(totalDuration / 60)} Min.</span>
          </div>
        </div>
        <button
          onClick={loadAllSongs}
          className="bg-hf-gold hover:bg-hf-gold-hover text-hf-bg font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-all"
          data-testid="add-songs-button"
        >
          <Plus size={14} /> Songs hinzufuegen
        </button>
      </div>

      {/* Play all */}
      {playlist.songs?.length > 0 && (
        <button
          onClick={() => playSong(playlist.songs[0], playlist.songs)}
          className="bg-hf-gold hover:bg-hf-gold-hover text-hf-bg font-bold px-8 py-3 rounded-full text-sm transition-all flex items-center gap-2"
          data-testid="play-all-button"
        >
          <Play size={18} /> Alle abspielen
        </button>
      )}

      {/* Song List */}
      <div className="space-y-1">
        {(playlist.songs || []).map((song, i) => (
          <div key={song.id} className="group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer" data-testid={`pl-track-${song.id}`}>
            <div className="w-8 text-center text-sm text-hf-text-muted group-hover:hidden">{i + 1}</div>
            <button onClick={() => playSong(song, playlist.songs)} className="w-8 text-center hidden group-hover:block" data-testid={`pl-track-play-${song.id}`}>
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
            <button onClick={() => handleRemoveSong(song.id)} className="opacity-0 group-hover:opacity-100 p-1.5 transition-opacity" data-testid={`pl-remove-${song.id}`}>
              <Trash2 size={14} className="text-hf-text-muted hover:text-red-400" />
            </button>
          </div>
        ))}
        {(!playlist.songs || playlist.songs.length === 0) && (
          <div className="text-center py-12 text-hf-text-muted">Noch keine Songs in dieser Playlist</div>
        )}
      </div>

      {/* Add Songs Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-hf-surface border border-hf-border rounded-2xl p-6 max-w-lg w-full max-h-[70vh] overflow-y-auto"
          >
            <h3 className="text-lg font-bold text-white mb-4">Songs hinzufuegen</h3>
            {allSongs.length === 0 ? (
              <p className="text-hf-text-muted text-sm">Keine weiteren Songs verfuegbar</p>
            ) : (
              <div className="space-y-1">
                {allSongs.map(song => (
                  <div key={song.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{song.title}</div>
                      <div className="text-xs text-hf-text-muted">{song.artist}</div>
                    </div>
                    <button
                      onClick={() => handleAddSong(song.id)}
                      className="p-2 bg-hf-gold/10 hover:bg-hf-gold/20 rounded-full transition-all"
                      data-testid={`add-song-${song.id}`}
                    >
                      <Plus size={14} className="text-hf-gold" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
