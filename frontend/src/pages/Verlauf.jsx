import { useState, useEffect, useCallback } from 'react';
import { historyApi } from '../api/musicApi';
import { Play, Music, Clock, TrendingUp, Award, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeIn = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

const formatDuration = (s) => {
  if (!s) return '0:00';
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};

function formatDate(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < MS_PER_MINUTE) return 'Gerade eben';
  if (diff < MS_PER_HOUR) return `vor ${Math.floor(diff / MS_PER_MINUTE)} Min.`;
  if (diff < MS_PER_DAY) return `vor ${Math.floor(diff / MS_PER_HOUR)} Std.`;
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

export default function Verlauf({ playSong }) {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('recent');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [histRes, statsRes] = await Promise.all([historyApi.getAll(50), historyApi.getStats()]);
      setHistory(histRes.data);
      setStats(statsRes.data);
    } catch {
      /* network error */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight" data-testid="history-title">
        <Clock size={28} className="inline text-hf-gold mr-2" />
        Verlauf
      </h1>

      <div className="flex gap-2">
        {[
          { id: 'recent', label: 'Zuletzt gehoert' },
          { id: 'stats', label: 'Statistiken' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-hf-gold text-hf-bg' : 'bg-white/5 text-hf-text-muted hover:text-white hover:bg-white/10'
            }`}
            data-testid={`history-tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-hf-text-muted text-center py-12">Laden...</div>}

      {tab === 'recent' && !loading && (
        <div className="space-y-1">
          {history.map((song) => (
            <div key={`${song.id}-${song.played_at}`} className="group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer" data-testid={`history-track-${song.id}`}>
              <button onClick={() => playSong(song, history)} className="w-8 text-center">
                <Play size={16} className="text-hf-text-muted group-hover:text-hf-gold mx-auto transition-colors" />
              </button>
              <div className="w-10 h-10 bg-hf-surface rounded-lg flex items-center justify-center flex-shrink-0">
                <Music size={16} className="text-hf-border" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{song.title}</div>
                <div className="text-xs text-hf-text-muted truncate">{song.artist}</div>
              </div>
              <div className="text-xs text-hf-text-muted hidden sm:block">{song.play_count}x</div>
              <div className="text-xs text-hf-text-muted">{formatDate(song.played_at)}</div>
              <div className="text-xs text-hf-text-muted w-12 text-right">{formatDuration(song.duration)}</div>
            </div>
          ))}
          {history.length === 0 && (
            <div className="text-center py-16">
              <Clock size={48} className="text-hf-border mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Noch nichts gehoert</h3>
              <p className="text-hf-text-muted text-sm">Spiele Songs ab, um deinen Verlauf zu fuellen</p>
            </div>
          )}
        </div>
      )}

      {tab === 'stats' && !loading && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-hf-surface border border-hf-border rounded-xl p-5">
              <BarChart3 size={20} className="text-hf-gold mb-2" />
              <div className="text-2xl font-bold text-white">{stats.total_plays}</div>
              <div className="text-xs text-hf-text-muted uppercase tracking-widest mt-1">Wiedergaben</div>
            </div>
            <div className="bg-hf-surface border border-hf-border rounded-xl p-5">
              <Music size={20} className="text-hf-gold mb-2" />
              <div className="text-2xl font-bold text-white">{stats.unique_songs}</div>
              <div className="text-xs text-hf-text-muted uppercase tracking-widest mt-1">Verschiedene Songs</div>
            </div>
          </div>

          {stats.top_songs?.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <TrendingUp size={18} className="text-hf-gold" /> Meistgehoert
              </h2>
              <div className="space-y-2">
                {stats.top_songs.map((s, i) => (
                  <div key={`${s.title}-${s.artist}`} className="flex items-center gap-4 px-4 py-3 bg-hf-surface rounded-xl">
                    <div className="w-8 h-8 bg-hf-gold/10 rounded-full flex items-center justify-center text-sm font-bold text-hf-gold">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{s.title}</div>
                      <div className="text-xs text-hf-text-muted truncate">{s.artist}</div>
                    </div>
                    <div className="text-sm font-semibold text-hf-gold">{s.play_count}x</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.top_artists?.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Award size={18} className="text-hf-gold" /> Top Kuenstler
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {stats.top_artists.map((a) => (
                  <div key={a.name} className="bg-hf-surface border border-hf-border rounded-xl p-4 text-center">
                    <div className="text-sm font-semibold text-white">{a.name}</div>
                    <div className="text-xs text-hf-gold mt-1">{a.plays} Wiedergaben</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!stats.top_songs?.length && (
            <div className="text-center py-12 text-hf-text-muted">Noch keine Statistiken vorhanden</div>
          )}
        </div>
      )}
    </motion.div>
  );
}
