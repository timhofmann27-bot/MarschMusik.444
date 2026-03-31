import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { playlistsApi, songsApi } from '../api/musicApi';
import { Play, ArrowLeft, Trash2, Clock, Plus, X, Disc, Share2, Users, Link2, Copy, Check, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const fadeIn = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

const formatDuration = (s) => {
  if (!s) return '0:00';
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};

export default function PlaylistDetailPage({ playSong }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [allSongs, setAllSongs] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showCollab, setShowCollab] = useState(false);
  const [collabEmail, setCollabEmail] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [copied, setCopied] = useState(false);

  const loadPlaylist = useCallback(async () => {
    try {
      const { data } = await playlistsApi.get(id);
      setPlaylist(data);
    } catch {
      navigate('/playlists');
    }
  }, [id, navigate]);

  useEffect(() => { loadPlaylist(); }, [loadPlaylist]);

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

  const handleToggleShare = async () => {
    try {
      const { data } = await playlistsApi.toggleShare(id);
      setPlaylist(prev => ({ ...prev, ...data }));
      toast.success(data.is_shared ? 'Playlist geteilt!' : 'Teilen deaktiviert');
    } catch { toast.error('Fehler'); }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/shared/${playlist.share_id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link kopiert!');
    setTimeout(() => setCopied(false), 2000);
  };

  const loadCollaborators = async () => {
    try {
      const { data } = await playlistsApi.getCollaborators(id);
      setCollaborators(data);
    } catch { /* ignore */ }
    setShowCollab(true);
  };

  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    if (!collabEmail.trim()) return;
    try {
      const { data } = await playlistsApi.addCollaborator(id, collabEmail.trim());
      toast.success(data.message);
      setCollabEmail('');
      loadCollaborators();
      loadPlaylist();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Fehler');
    }
  };

  const handleRemoveCollaborator = async (email) => {
    try {
      await playlistsApi.removeCollaborator(id, email);
      toast.success('Mitwirkender entfernt');
      loadCollaborators();
      loadPlaylist();
    } catch { toast.error('Fehler'); }
  };

  const totalDuration = (playlist?.songs || []).reduce((acc, s) => acc + (s.duration || 0), 0);
  const isOwner = playlist?.is_owner !== false;
  const canEdit = isOwner || playlist?.is_collaborator;

  if (!playlist) return <div className="text-hf-text-muted text-center py-12">Laden...</div>;

  return (
    <motion.div {...fadeIn} className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-6">
        <button onClick={() => navigate('/playlists')} className="p-2 rounded-xl hover:bg-white/5 transition-all mt-1" data-testid="back-button">
          <ArrowLeft size={20} className="text-hf-text-muted" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight truncate" data-testid="playlist-detail-title">{playlist.name}</h1>
          {playlist.description && <p className="text-hf-text-muted mt-1 text-sm truncate">{playlist.description}</p>}
          <div className="flex items-center gap-3 mt-2 text-xs text-hf-text-muted flex-wrap">
            <span>{playlist.songs?.length || 0} Songs</span>
            <span>&middot;</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {Math.floor(totalDuration / 60)} Min.</span>
            {playlist.is_shared && (
              <>
                <span>&middot;</span>
                <span className="flex items-center gap-1 text-hf-gold"><Share2 size={12} /> Geteilt</span>
              </>
            )}
            {playlist.is_collaborative && (
              <>
                <span>&middot;</span>
                <span className="flex items-center gap-1 text-emerald-400"><Users size={12} /> Kollaborativ</span>
              </>
            )}
            {!isOwner && playlist.owner_name && (
              <>
                <span>&middot;</span>
                <span>von {playlist.owner_name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {playlist.songs?.length > 0 && (
          <button
            onClick={() => playSong(playlist.songs[0], playlist.songs)}
            className="bg-hf-gold hover:bg-hf-gold-hover text-hf-bg font-bold px-6 py-2.5 rounded-full text-sm transition-all flex items-center gap-2"
            data-testid="play-all-button"
          >
            <Play size={16} /> Abspielen
          </button>
        )}
        {canEdit && (
          <button
            onClick={loadAllSongs}
            className="bg-white/5 hover:bg-white/10 text-white font-semibold px-4 py-2.5 rounded-full text-sm transition-all flex items-center gap-2 border border-hf-border"
            data-testid="add-songs-button"
          >
            <Plus size={14} /> <span className="hidden sm:inline">Songs</span> hinzufuegen
          </button>
        )}
        {isOwner && (
          <>
            <button
              onClick={handleToggleShare}
              className={`px-4 py-2.5 rounded-full text-sm transition-all flex items-center gap-2 border font-semibold ${
                playlist.is_shared
                  ? 'bg-hf-gold/10 border-hf-gold/30 text-hf-gold'
                  : 'bg-white/5 border-hf-border text-white hover:bg-white/10'
              }`}
              data-testid="share-toggle-button"
            >
              <Share2 size={14} /> {playlist.is_shared ? 'Geteilt' : 'Teilen'}
            </button>
            <button
              onClick={loadCollaborators}
              className={`px-4 py-2.5 rounded-full text-sm transition-all flex items-center gap-2 border font-semibold ${
                playlist.is_collaborative
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-white/5 border-hf-border text-white hover:bg-white/10'
              }`}
              data-testid="collab-button"
            >
              <Users size={14} /> Mitwirkende
            </button>
          </>
        )}
      </div>

      {/* Share Link Bar */}
      <AnimatePresence>
        {playlist.is_shared && playlist.share_id && isOwner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-hf-gold/5 border border-hf-gold/20 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-xs text-hf-gold mb-2 font-semibold">
              <Link2 size={14} /> Share-Link
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={`${window.location.origin}/shared/${playlist.share_id}`}
                className="flex-1 bg-hf-bg border border-hf-border rounded-lg px-3 py-2 text-sm text-white outline-none"
                data-testid="share-link-input"
              />
              <button
                onClick={handleCopyLink}
                className="bg-hf-gold hover:bg-hf-gold-hover text-hf-bg font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 transition-all"
                data-testid="copy-share-link"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Kopiert' : 'Kopieren'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Song List */}
      <div className="space-y-1">
        {(playlist.songs || []).map((song, i) => (
          <div key={song.id} className="group flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer" data-testid={`pl-track-${song.id}`}>
            <div className="w-6 sm:w-8 text-center text-sm text-hf-text-muted group-hover:hidden hidden sm:block">{i + 1}</div>
            <button onClick={() => playSong(song, playlist.songs)} className="w-6 sm:w-8 text-center hidden group-hover:block" data-testid={`pl-track-play-${song.id}`}>
              <Play size={16} className="text-hf-gold mx-auto" />
            </button>
            <button onClick={() => playSong(song, playlist.songs)} className="sm:hidden w-8 flex-shrink-0 text-center">
              <Play size={14} className="text-hf-text-muted mx-auto" />
            </button>
            <div className="w-10 h-10 bg-hf-surface rounded-lg items-center justify-center flex-shrink-0 hidden sm:flex">
              <Disc size={18} className="text-hf-gold/25" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{song.title}</div>
              <div className="text-xs text-hf-text-muted truncate">{song.artist}</div>
            </div>
            <div className="text-xs text-hf-text-muted w-10 sm:w-12 text-right flex-shrink-0">{formatDuration(song.duration)}</div>
            {canEdit && (
              <button onClick={() => handleRemoveSong(song.id)} className="hidden sm:block opacity-0 group-hover:opacity-100 p-1.5 transition-opacity" data-testid={`pl-remove-${song.id}`}>
                <Trash2 size={14} className="text-hf-text-muted hover:text-red-400" />
              </button>
            )}
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Songs hinzufuegen</h3>
              <button onClick={() => setShowAdd(false)} className="text-hf-text-muted hover:text-white"><X size={18} /></button>
            </div>
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
                    <button onClick={() => handleAddSong(song.id)} className="p-2 bg-hf-gold/10 hover:bg-hf-gold/20 rounded-full transition-all" data-testid={`add-song-${song.id}`}>
                      <Plus size={14} className="text-hf-gold" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Collaborators Modal */}
      {showCollab && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCollab(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-hf-surface border border-hf-border rounded-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Users size={18} className="text-emerald-400" /> Mitwirkende</h3>
              <button onClick={() => setShowCollab(false)} className="text-hf-text-muted hover:text-white"><X size={18} /></button>
            </div>

            <form onSubmit={handleAddCollaborator} className="flex gap-2 mb-4">
              <input
                value={collabEmail}
                onChange={e => setCollabEmail(e.target.value)}
                placeholder="E-Mail eingeben..."
                className="flex-1 bg-hf-bg border border-hf-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-hf-text-muted/50 outline-none focus:border-emerald-500"
                data-testid="collab-email-input"
              />
              <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-1.5 transition-all" data-testid="add-collab-submit">
                <UserPlus size={14} />
              </button>
            </form>

            {collaborators.length === 0 ? (
              <p className="text-hf-text-muted text-sm text-center py-4">Noch keine Mitwirkenden</p>
            ) : (
              <div className="space-y-2">
                {collaborators.map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2 bg-white/[0.03] rounded-xl">
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center">
                      <Users size={14} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{c.username}</div>
                      <div className="text-xs text-hf-text-muted truncate">{c.email}</div>
                    </div>
                    <button onClick={() => handleRemoveCollaborator(c.email)} className="p-1.5 text-hf-text-muted hover:text-red-400 transition-colors" data-testid={`remove-collab-${c.id}`}>
                      <X size={14} />
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
