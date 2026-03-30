import { useState, useEffect, useCallback } from 'react';
import { Activity, Music, HardDrive, TrendingUp } from 'lucide-react';
import { getSongs, getStats } from '../api/musicApi';
import SongCard from '../components/SongCard';
import SongCardSkeleton from '../components/SongCardSkeleton';
import { motion } from 'framer-motion';
import { fadeInUpVariants, scaleInVariants, ANIMATION_DURATION, STAGGER_DELAY } from '../constants';

const CommandCenter = ({ setCurrentSong, setPlaylist, setIsPlaying }) => {
  const [stats, setStats] = useState(null);
  const [recentSongs, setRecentSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const loadData = useCallback(async () => {
    try {
      const [statsData, songs] = await Promise.all([
        getStats(),
        getSongs()
      ]);
      setStats(statsData);
      setRecentSongs(songs.slice(0, 6));
    } catch (error) {
      // Log error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load data:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const statCards = [
    {
      label: 'TRACKS',
      value: stats?.total_songs || 0,
      icon: Music,
      color: 'text-military-green'
    },
    {
      label: 'MISSIONEN',
      value: stats?.total_playlists || 0,
      icon: Activity,
      color: 'text-military-green'
    },
    {
      label: 'SPEICHER',
      value: `${stats?.total_storage_mb || 0} MB`,
      icon: HardDrive,
      color: 'text-military-green'
    },
    {
      label: 'STATUS',
      value: 'AKTIV',
      icon: TrendingUp,
      color: 'text-military-green'
    },
  ];
  
  return (
    <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 military-grid" data-testid="command-center">
      {/* Header */}
      <motion.div 
        className="mb-4 md:mb-8 scanlines"
        variants={fadeInUpVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: ANIMATION_DURATION }}
      >
        <h1 className="text-2xl md:text-4xl font-bold text-military-green terminal-text mb-1 md:mb-2 tracking-wider">
          KOMMANDO ZENTRALE
        </h1>
        <p className="text-xs md:text-base text-military-green/60 font-mono">SYSTEM STATUS: OPERATIONSBEREIT</p>
      </motion.div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div 
              key={stat.label} 
              className="bg-black/50 border border-military-green/30 p-3 md:p-6 glow-border hud-corner"
              variants={scaleInVariants}
              initial="initial"
              animate="animate"
              transition={{ delay: index * STAGGER_DELAY, duration: ANIMATION_DURATION }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <Icon className={`w-6 h-6 md:w-8 md:h-8 ${stat.color}`} />
                <div className="status-led"></div>
              </div>
              <motion.div 
                className="text-xl md:text-3xl font-bold text-military-green font-mono mb-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.2 }}
              >
                {loading ? '---' : stat.value}
              </motion.div>
              <div className="text-xs md:text-sm text-military-green/60 font-mono tracking-wider">
                {stat.label}
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Recent Songs */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-military-green terminal-text mb-3 md:mb-4 tracking-wider">
          KÜRZLICH HINZUGEFÜGT
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SongCardSkeleton key={i} />
            ))}
          </div>
        ) : recentSongs.length === 0 ? (
          <motion.div 
            className="bg-black/50 border border-military-green/30 p-8 md:p-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Music className="w-12 h-12 md:w-16 md:h-16 text-military-green/30 mx-auto mb-3 md:mb-4" />
            <p className="text-sm md:text-base text-military-green/60 font-mono">KEINE TRACKS VERFÜGBAR</p>
            <p className="text-xs md:text-sm text-military-green/40 font-mono mt-2">LADE MUSIK HOCH UM ZU BEGINNEN</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
            {recentSongs.map((song, index) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <SongCard 
                  song={song} 
                  onPlay={(song) => {
                    setCurrentSong(song);
                    setPlaylist(recentSongs);
                    setIsPlaying(true);
                  }}
                  onUpdate={loadData}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommandCenter;