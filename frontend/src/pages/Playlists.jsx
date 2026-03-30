import { useState, useEffect } from 'react';
import { playlistsApi } from '../api/musicApi';
import { ListMusic, Plus, Trash2, Lock, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    playlistsApi.getAll().then(r => setPlaylists(r.data)).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const { data } = await playlistsApi.create({ name, description: desc, is_public: isPublic });
      setPlaylists(prev => [...prev, data]);
      setName(''); setDesc(''); setShowCreate(false);
      toast.success('Playlist erstellt!');
    } catch { toast.error('Fehler'); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Playlist wirklich loeschen?')) return;
    try {
      await playlistsApi.delete(id);
      setPlaylists(prev => prev.filter(p => p.id !== id));
      toast.success('Playlist geloescht');
    } catch { toast.error('Fehler'); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight" data-testid="playlists-title">Playlists</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-hf-gold hover:bg-hf-gold-hover text-hf-bg font-bold px-5 py-2.5 rounded-full transition-all flex items-center gap-2 text-sm"
          data-testid="create-playlist-button"
        >
          <Plus size={16} /> Neue Playlist
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleCreate}
          className="bg-hf-surface border border-hf-border rounded-xl p-6 space-y-4"
        >
          <input
            value={name} onChange={e => setName(e.target.value)}
            className="w-full bg-hf-bg border border-hf-border rounded-xl px-4 py-3 text-white placeholder-hf-text-muted/50 focus:border-hf-gold focus:ring-1 focus:ring-hf-gold outline-none"
            placeholder="Playlist-Name" required data-testid="playlist-name-input"
          />
          <input
            value={desc} onChange={e => setDesc(e.target.value)}
            className="w-full bg-hf-bg border border-hf-border rounded-xl px-4 py-3 text-white placeholder-hf-text-muted/50 focus:border-hf-gold focus:ring-1 focus:ring-hf-gold outline-none"
            placeholder="Beschreibung (optional)" data-testid="playlist-desc-input"
          />
          <label className="flex items-center gap-2 text-sm text-hf-text-muted cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="accent-hf-gold" />
            Oeffentliche Playlist
          </label>
          <button type="submit" className="bg-hf-gold hover:bg-hf-gold-hover text-hf-bg font-bold px-6 py-2.5 rounded-full transition-all text-sm" data-testid="playlist-create-submit">
            Erstellen
          </button>
        </motion.form>
      )}

      {/* Playlist Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {playlists.map(pl => (
          <div
            key={pl.id}
            onClick={() => navigate(`/playlists/${pl.id}`)}
            className="group bg-hf-surface hover:bg-hf-surface-hover border border-hf-border rounded-xl p-5 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-hf-gold/5"
            data-testid={`playlist-item-${pl.id}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-14 h-14 bg-gradient-to-br from-hf-gold/20 to-hf-gold/5 rounded-lg flex items-center justify-center">
                <ListMusic size={24} className="text-hf-gold" />
              </div>
              <div className="flex gap-1">
                {pl.is_public ? <Globe size={14} className="text-hf-text-muted" /> : <Lock size={14} className="text-hf-text-muted" />}
                <button onClick={(e) => handleDelete(pl.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all" data-testid={`playlist-delete-${pl.id}`}>
                  <Trash2 size={14} className="text-hf-text-muted hover:text-red-400" />
                </button>
              </div>
            </div>
            <div className="font-semibold text-white truncate">{pl.name}</div>
            <div className="text-xs text-hf-text-muted mt-1">{pl.song_ids?.length || 0} Songs {pl.description && `· ${pl.description}`}</div>
          </div>
        ))}
      </div>

      {playlists.length === 0 && !showCreate && (
        <div className="text-center py-16">
          <ListMusic size={48} className="text-hf-border mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Keine Playlists</h3>
          <p className="text-hf-text-muted text-sm">Erstelle deine erste Playlist!</p>
        </div>
      )}
    </motion.div>
  );
}
