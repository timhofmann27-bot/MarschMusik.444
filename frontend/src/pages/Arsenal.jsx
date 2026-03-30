import { useState, useEffect, useCallback } from 'react';
import { Search, Music } from 'lucide-react';
import { getSongs } from '../api/musicApi';
import SongCard from '../components/SongCard';

const Arsenal = ({ setCurrentSong, setPlaylist, setIsPlaying }) => {
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const loadSongs = useCallback(async () => {
    try {
      const data = await getSongs();
      setSongs(data);
      setFilteredSongs(data);
    } catch (error) {
      // Error handling - silent fail for MVP
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadSongs();
  }, [loadSongs]);
  
  useEffect(() => {
    if (search) {
      const filtered = songs.filter(song => 
        song.title.toLowerCase().includes(search.toLowerCase()) ||
        song.artist.toLowerCase().includes(search.toLowerCase()) ||
        song.album.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredSongs(filtered);
    } else {
      setFilteredSongs(songs);
    }
  }, [search, songs]);
  
  const handlePlay = useCallback((song) => {
    setCurrentSong(song);
    setPlaylist(filteredSongs);
    setIsPlaying(true);
  }, [filteredSongs, setCurrentSong, setPlaylist, setIsPlaying]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-military-green text-lg md:text-xl font-mono">LADE ARSENAL...</div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 military-grid" data-testid="arsenal">
      {/* Header */}
      <div className="mb-4 md:mb-8">
        <h1 className="text-2xl md:text-4xl font-bold text-military-green terminal-text mb-1 md:mb-2 tracking-wider">
          MUSIK ARSENAL
        </h1>
        <p className="text-xs md:text-base text-military-green/60 font-mono">{songs.length} TRACKS VERFÜGBAR</p>
      </div>
      
      {/* Search */}
      <div className="mb-4 md:mb-8">
        <div className="relative max-w-full md:max-w-2xl">
          <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-military-green/50" />
          <input
            type="text"
            placeholder="SUCHEN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/50 border border-military-green/30 pl-10 md:pl-12 pr-3 md:pr-4 py-2 md:py-3 text-sm md:text-base text-military-green placeholder-military-green/30 focus:outline-none focus:border-military-green/60 font-mono"
            data-testid="arsenal-search"
          />
        </div>
      </div>
      
      {/* Songs Grid */}
      {filteredSongs.length === 0 ? (
        <div className="bg-black/50 border border-military-green/30 p-8 md:p-12 text-center">
          <Music className="w-12 h-12 md:w-16 md:h-16 text-military-green/30 mx-auto mb-3 md:mb-4" />
          <p className="text-sm md:text-base text-military-green/60 font-mono">
            {search ? 'KEINE TRACKS GEFUNDEN' : 'ARSENAL LEER'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
          {filteredSongs.map((song) => (
            <SongCard 
              key={song.id} 
              song={song} 
              onPlay={handlePlay}
              onUpdate={loadSongs}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Arsenal;