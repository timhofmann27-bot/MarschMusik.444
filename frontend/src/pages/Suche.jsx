import { useState, useCallback, useEffect } from 'react';
import { searchApi } from '../api/musicApi';
import { Search as SearchIcon, Play, Music, ListMusic, User, Disc } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDebounce } from 'use-debounce';

const fadeIn = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

const formatDuration = (s) => {
  if (!s) return '0:00';
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};

export default function Suche({ playSong }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 300);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults(null); return; }
    setLoading(true);
    searchApi.search(debouncedQuery)
      .then(r => setResults(r.data))
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const hasResults = results && (results.songs?.length || results.artists?.length || results.playlists?.length);

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight" data-testid="search-title">Suche</h1>

      <div className="relative">
        <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-hf-text-muted" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-hf-surface border border-hf-border rounded-full pl-12 pr-4 py-3.5 text-white placeholder-hf-text-muted/50 focus:border-hf-gold focus:ring-1 focus:ring-hf-gold outline-none text-sm"
          placeholder="Songs, Kuenstler, Alben oder Playlists suchen..."
          data-testid="search-input"
          autoFocus
        />
      </div>

      {loading && <div className="text-hf-text-muted text-center py-8">Suche...</div>}

      {results && !loading && (
        <div className="space-y-8">
          {results.songs?.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Music size={18} className="text-hf-gold" /> Songs</h2>
              <div className="space-y-1">
                {results.songs.map(song => (
                  <button
                    key={song.id}
                    onClick={() => playSong(song, results.songs)}
                    className="w-full group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-left"
                    data-testid={`search-song-${song.id}`}
                  >
                    <div className="w-10 h-10 bg-hf-surface rounded-lg flex items-center justify-center flex-shrink-0">
                      <Disc size={16} className="text-hf-gold/25 opacity-100 group-hover:opacity-0 transition-opacity" />
                      <Play size={14} className="text-hf-gold absolute opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{song.title}</div>
                      <div className="text-xs text-hf-text-muted truncate">{song.artist}</div>
                    </div>
                    <div className="text-xs text-hf-text-muted">{formatDuration(song.duration)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.artists?.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><User size={18} className="text-hf-gold" /> Kuenstler</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {results.artists.map(a => (
                  <div key={a.name} className="bg-hf-surface border border-hf-border rounded-xl p-4 text-center hover:bg-hf-surface-hover transition-all">
                    <div className="w-12 h-12 bg-hf-gold/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <User size={20} className="text-hf-gold" />
                    </div>
                    <div className="text-sm font-medium text-white truncate">{a.name}</div>
                    <div className="text-xs text-hf-text-muted">{a.song_count} Songs</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.playlists?.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><ListMusic size={18} className="text-hf-gold" /> Playlists</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.playlists.map(pl => (
                  <div key={pl.id} className="bg-hf-surface border border-hf-border rounded-xl p-4 hover:bg-hf-surface-hover transition-all">
                    <div className="font-medium text-white">{pl.name}</div>
                    <div className="text-xs text-hf-text-muted">{pl.song_ids?.length || 0} Songs</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasResults && (
            <div className="text-center py-12 text-hf-text-muted">Keine Ergebnisse fuer &quot;{query}&quot;</div>
          )}
        </div>
      )}

      {!results && !loading && (
        <div className="text-center py-16">
          <SearchIcon size={48} className="text-hf-border mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Durchsuche deine Musikwelt</h3>
          <p className="text-hf-text-muted text-sm">Finde Songs, Kuenstler, Alben und Playlists</p>
        </div>
      )}
    </motion.div>
  );
}
