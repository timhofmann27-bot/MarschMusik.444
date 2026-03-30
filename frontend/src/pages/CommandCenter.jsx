import { useState, useEffect, useCallback } from 'react';
import { Activity, Music, HardDrive, TrendingUp } from 'lucide-react';
import { getSongs, getStats } from '../api/musicApi';
import SongCard from '../components/SongCard';

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
      // Error handling - silent fail for MVP
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
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-military-green text-lg md:text-xl font-mono">LADE DATEN...</div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 military-grid" data-testid="command-center">
      {/* Header */}
      <div className="mb-4 md:mb-8 scanlines">
        <h1 className="text-2xl md:text-4xl font-bold text-military-green terminal-text mb-1 md:mb-2 tracking-wider">
          KOMMANDO ZENTRALE
        </h1>
        <p className="text-xs md:text-base text-military-green/60 font-mono">SYSTEM STATUS: OPERATIONSBEREIT</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-black/50 border border-military-green/30 p-3 md:p-6 glow-border hud-corner">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <Icon className={`w-6 h-6 md:w-8 md:h-8 ${stat.color}`} />
                <div className="status-led"></div>
              </div>
              <div className="text-xl md:text-3xl font-bold text-military-green font-mono mb-1">
                {stat.value}
              </div>
              <div className="text-xs md:text-sm text-military-green/60 font-mono tracking-wider">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Recent Songs */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-military-green terminal-text mb-3 md:mb-4 tracking-wider">
          KÜRZLICH HINZUGEFÜGT
        </h2>
        {recentSongs.length === 0 ? (
          <div className="bg-black/50 border border-military-green/30 p-8 md:p-12 text-center">
            <Music className="w-12 h-12 md:w-16 md:h-16 text-military-green/30 mx-auto mb-3 md:mb-4" />
            <p className="text-sm md:text-base text-military-green/60 font-mono">KEINE TRACKS VERFÜGBAR</p>
            <p className="text-xs md:text-sm text-military-green/40 font-mono mt-2">LADE MUSIK HOCH UM ZU BEGINNEN</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
            {recentSongs.map((song) => (
              <SongCard 
                key={song.id} 
                song={song} 
                onPlay={(song) => {
                  setCurrentSong(song);
                  setPlaylist(recentSongs);
                  setIsPlaying(true);
                }}
                onUpdate={loadData}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommandCenter;