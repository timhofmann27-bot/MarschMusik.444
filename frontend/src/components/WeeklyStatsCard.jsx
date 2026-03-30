import { useState, useEffect } from 'react';
import { statsApi } from '../api/musicApi';
import { Headphones, TrendingUp, Music, Disc, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

function AnimatedCounter({ value, suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 1200;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      current = Math.min(current + increment, value);
      setDisplay(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display);
  return <span>{formatted}{suffix}</span>;
}

function ProgressRing({ percent, size = 40, stroke = 3, color = '#C5A059' }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={color} strokeWidth={stroke} fill="none"
        strokeLinecap="round"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        strokeDasharray={circumference}
      />
    </svg>
  );
}

export default function WeeklyStatsCard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsApi.weekly()
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (!stats?.has_data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-hf-surface via-hf-surface to-hf-bg border border-hf-border p-6"
        data-testid="weekly-stats-empty"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-hf-gold/10 flex items-center justify-center">
            <Headphones size={24} className="text-hf-gold/50" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Jetzt hoeren</h3>
            <p className="text-sm text-hf-text-muted mt-0.5">Hoere deine erste Stunde, um Stats zu sehen</p>
          </div>
        </div>
      </motion.div>
    );
  }

  const maxPlays = stats.top_songs.length > 0 ? stats.top_songs[0].play_count : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative overflow-hidden rounded-2xl border border-hf-gold/15"
      data-testid="weekly-stats-card"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-hf-gold/8 via-hf-surface to-hf-bg" />
      <div className="absolute top-0 right-0 w-48 h-48 bg-hf-gold/5 rounded-full blur-3xl -translate-y-12 translate-x-12" />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-hf-gold/15 flex items-center justify-center">
              <Headphones size={20} className="text-hf-gold" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Jetzt hoeren</h3>
              <p className="text-xs text-hf-text-muted">Diese Woche</p>
            </div>
          </div>
          {stats.new_discoveries > 0 && (
            <div className="flex items-center gap-1.5 bg-hf-gold/10 rounded-full px-3 py-1.5" data-testid="new-discoveries-badge">
              <Sparkles size={12} className="text-hf-gold" />
              <span className="text-xs font-semibold text-hf-gold">{stats.new_discoveries} Neu entdeckt</span>
            </div>
          )}
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center" data-testid="metric-plays">
            <div className="text-2xl font-bold text-white">
              <AnimatedCounter value={stats.total_plays} />
            </div>
            <div className="text-[10px] text-hf-text-muted uppercase tracking-widest mt-1">Wiedergaben</div>
          </div>
          <div className="text-center" data-testid="metric-minutes">
            <div className="text-2xl font-bold text-hf-gold">
              <AnimatedCounter value={stats.total_minutes} decimals={0} />
            </div>
            <div className="text-[10px] text-hf-text-muted uppercase tracking-widest mt-1">Minuten</div>
          </div>
          <div className="text-center" data-testid="metric-songs">
            <div className="text-2xl font-bold text-white">
              <AnimatedCounter value={stats.unique_songs} />
            </div>
            <div className="text-[10px] text-hf-text-muted uppercase tracking-widest mt-1">Songs</div>
          </div>
        </div>

        {/* Top Songs with Progress Rings */}
        {stats.top_songs.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-hf-gold" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">Top Songs</span>
            </div>
            <div className="space-y-2">
              {stats.top_songs.map((song, i) => {
                const percent = (song.play_count / maxPlays) * 100;
                return (
                  <div key={song.id} className="flex items-center gap-3 py-1.5" data-testid={`weekly-top-song-${i}`}>
                    <ProgressRing percent={percent} size={36} stroke={3} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{song.title}</div>
                      <div className="text-[11px] text-hf-text-muted truncate">{song.artist}</div>
                    </div>
                    <div className="text-sm font-bold text-hf-gold">{song.play_count}x</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Artists */}
        {stats.top_artists.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Music size={14} className="text-hf-gold" />
              <span className="text-xs font-bold text-white uppercase tracking-widest">Top Kuenstler</span>
            </div>
            <div className="flex gap-2">
              {stats.top_artists.map((artist) => (
                <div key={artist.name} className="flex-1 bg-white/[0.03] rounded-xl p-3 text-center border border-white/5" data-testid={`weekly-top-artist-${artist.name}`}>
                  <div className="w-8 h-8 bg-hf-gold/10 rounded-full flex items-center justify-center mx-auto mb-1.5">
                    <Disc size={14} className="text-hf-gold" />
                  </div>
                  <div className="text-xs font-semibold text-white truncate">{artist.name}</div>
                  <div className="text-[10px] text-hf-text-muted">{artist.play_count}x</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
