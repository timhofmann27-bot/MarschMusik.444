import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { playlistsApi } from '../api/musicApi';
import { Play, ArrowLeft, Clock, Disc, User, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeIn = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

const formatDuration = (s) => {
  if (!s) return '0:00';
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};

export default function SharedPlaylistPage({ playSong }) {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await playlistsApi.getShared(shareId);
      setPlaylist(data);
    } catch {
      setError('Diese Playlist ist nicht mehr verfuegbar.');
    }
  }, [shareId]);

  useEffect(() => { load(); }, [load]);

  const totalDuration = (playlist?.songs || []).reduce((acc, s) => acc + (s.duration || 0), 0);

  if (error) {
    return (
      <motion.div {...fadeIn} className="text-center py-20">
        <Share2 size={48} className="text-hf-border mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Nicht verfuegbar</h2>
        <p className="text-hf-text-muted text-sm mb-6">{error}</p>
        <button onClick={() => navigate('/')} className="bg-hf-gold hover:bg-hf-gold-hover text-hf-bg font-bold px-6 py-2.5 rounded-full text-sm transition-all">
          Zum Dashboard
        </button>
      </motion.div>
    );
  }

  if (!playlist) return <div className="text-hf-text-muted text-center py-12">Laden...</div>;

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <div className="flex items-start gap-3 sm:gap-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/5 transition-all mt-1" data-testid="shared-back-button">
          <ArrowLeft size={20} className="text-hf-text-muted" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Share2 size={14} className="text-hf-gold" />
            <span className="text-xs font-semibold text-hf-gold uppercase tracking-widest">Geteilte Playlist</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight truncate" data-testid="shared-playlist-title">{playlist.name}</h1>
          {playlist.description && <p className="text-hf-text-muted mt-1 text-sm truncate">{playlist.description}</p>}
          <div className="flex items-center gap-3 mt-2 text-xs text-hf-text-muted">
            <span className="flex items-center gap-1"><User size={12} /> {playlist.owner_name}</span>
            <span>&middot;</span>
            <span>{playlist.songs?.length || 0} Songs</span>
            <span>&middot;</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {Math.floor(totalDuration / 60)} Min.</span>
          </div>
        </div>
      </div>

      {playlist.songs?.length > 0 && (
        <button
          onClick={() => playSong(playlist.songs[0], playlist.songs)}
          className="bg-hf-gold hover:bg-hf-gold-hover text-hf-bg font-bold px-8 py-3 rounded-full text-sm transition-all flex items-center gap-2"
          data-testid="shared-play-all"
        >
          <Play size={18} /> Alle abspielen
        </button>
      )}

      <div className="space-y-1">
        {(playlist.songs || []).map((song, i) => (
          <div key={song.id} className="group flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer" data-testid={`shared-track-${song.id}`}>
            <div className="w-6 sm:w-8 text-center text-sm text-hf-text-muted hidden sm:block">{i + 1}</div>
            <button onClick={() => playSong(song, playlist.songs)} className="w-8 flex-shrink-0 text-center">
              <Play size={14} className="text-hf-text-muted group-hover:text-hf-gold mx-auto transition-colors" />
            </button>
            <div className="w-10 h-10 bg-hf-surface rounded-lg items-center justify-center flex-shrink-0 hidden sm:flex">
              <Disc size={18} className="text-hf-gold/25" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{song.title}</div>
              <div className="text-xs text-hf-text-muted truncate">{song.artist}</div>
            </div>
            <div className="text-xs text-hf-text-muted w-10 sm:w-12 text-right flex-shrink-0">{formatDuration(song.duration)}</div>
          </div>
        ))}
        {(!playlist.songs || playlist.songs.length === 0) && (
          <div className="text-center py-12 text-hf-text-muted">Noch keine Songs in dieser Playlist</div>
        )}
      </div>
    </motion.div>
  );
}
