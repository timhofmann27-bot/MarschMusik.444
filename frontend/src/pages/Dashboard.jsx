import { useState, useEffect, useCallback } from 'react';
import { songsApi, playlistsApi, statsApi, historyApi } from '../api/musicApi';
import { useAuth } from '../context/AuthContext';
import { Play, Music, ListMusic, HardDrive, Heart, Clock, Disc } from 'lucide-react';
import { motion } from 'framer-motion';
import WeeklyStatsCard from '../components/WeeklyStatsCard';

const fadeIn = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

const formatDuration = (s) => {
  if (!s) return '0:00';
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};

export default function Dashboard({ playSong, playPlaylist }) {
  const { user } = useAuth();
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [stats, setStats] = useState(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);

  useEffect(() => {
    songsApi.getAll().then(r => setSongs(r.data.slice(0, 8))).catch(() => {});
    playlistsApi.getAll().then(r => setPlaylists(r.data.slice(0, 6))).catch(() => {});
    statsApi.get().then(r => setStats(r.data)).catch(() => {});
    historyApi.getAll(6).then(r => setRecentlyPlayed(r.data)).catch(() => {});
  }, []);

  return (
    <motion.div {...fadeIn} className="space-y-8">
      <div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white" data-testid="dashboard-greeting">
          Willkommen, <span className="text-hf-gold">{user?.username}</span>
        </h1>
        <p className="text-hf-text-muted mt-2">Deine private Musikwelt wartet auf dich.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Music, label: 'Songs', value: stats.total_songs },
            { icon: ListMusic, label: 'Playlists', value: stats.total_playlists },
            { icon: HardDrive, label: 'Speicher', value: `${stats.total_storage_mb} MB` },
            { icon: Heart, label: 'Favoriten', value: stats.liked_songs },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-hf-surface rounded-xl p-5 border border-hf-border hover:border-hf-gold/20 transition-all duration-300" data-testid={`stat-${label.toLowerCase()}`}>
              <Icon size={20} className="text-hf-gold mb-2" />
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-hf-text-muted uppercase tracking-widest mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* "Jetzt hören" - Weekly Stats */}
      <WeeklyStatsCard />

      {recentlyPlayed.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock size={20} className="text-hf-gold" /> Zuletzt gehoert
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentlyPlayed.map((song) => (
              <button
                key={song.id}
                onClick={() => playSong(song, recentlyPlayed)}
                className="group flex items-center gap-3 bg-hf-surface hover:bg-hf-surface-hover border border-hf-border rounded-xl p-3 text-left transition-all duration-300"
                data-testid={`recent-${song.id}`}
              >
                <div className="w-12 h-12 bg-hf-bg rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                  <Disc size={20} className="text-hf-gold/20" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                    <Play size={14} className="text-hf-gold" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate">{song.title}</div>
                  <div className="text-xs text-hf-text-muted truncate">{song.artist}</div>
                </div>
                <div className="text-xs text-hf-text-muted">{song.play_count}x</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {songs.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Zuletzt hinzugefuegt</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {songs.map((song) => (
              <button
                key={song.id}
                onClick={() => playSong(song, songs)}
                className="group bg-hf-surface hover:bg-hf-surface-hover border border-hf-border rounded-xl p-4 text-left transition-all duration-300 hover:shadow-lg hover:shadow-hf-gold/5"
                data-testid={`song-card-${song.id}`}
              >
                <div className="w-full aspect-square bg-hf-bg rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                  <Disc size={40} className="text-hf-gold/20" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                    <div className="w-12 h-12 bg-hf-gold rounded-full flex items-center justify-center shadow-lg">
                      <Play size={20} className="text-hf-bg ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="truncate text-sm font-semibold text-white">{song.title}</div>
                <div className="truncate text-xs text-hf-text-muted mt-0.5">{song.artist} &middot; {formatDuration(song.duration)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {playlists.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Deine Playlists</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => playPlaylist(pl.id)}
                className="group bg-hf-surface hover:bg-hf-surface-hover border border-hf-border rounded-xl p-4 text-left transition-all duration-300"
                data-testid={`playlist-card-${pl.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-hf-gold/20 to-hf-gold/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ListMusic size={24} className="text-hf-gold" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate">{pl.name}</div>
                    <div className="text-xs text-hf-text-muted">{pl.song_ids?.length || 0} Songs</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {songs.length === 0 && (
        <div className="text-center py-16">
          <Music size={48} className="text-hf-border mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Noch keine Musik</h3>
          <p className="text-hf-text-muted text-sm">Lade deine ersten Songs hoch, um loszulegen!</p>
        </div>
      )}
    </motion.div>
  );
}
