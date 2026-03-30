import { useState, useEffect } from 'react';
import { Search, Music } from 'lucide-react';
import { getSongs } from '../api/musicApi';
import SongCard from '../components/SongCard';

const Arsenal = ({ setCurrentSong, setPlaylist, setIsPlaying }) => {
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadSongs();
  }, []);
  
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
  
  const loadSongs = async () => {
    try {
      const data = await getSongs();
      setSongs(data);
      setFilteredSongs(data);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePlay = (song) => {
    setCurrentSong(song);
    setPlaylist(filteredSongs);
    setIsPlaying(true);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-military-green text-xl font-mono">LADE ARSENAL...</div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 military-grid" data-testid="arsenal">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-military-green terminal-text mb-2 tracking-wider">
          MUSIK ARSENAL
        </h1>
        <p className="text-military-green/60 font-mono">{songs.length} TRACKS VERFÜGBAR</p>
      </div>
      
      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-military-green/50" />
          <input
            type="text"
            placeholder="SUCHE NACH TITEL, KÜNSTLER, ALBUM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/50 border border-military-green/30 pl-12 pr-4 py-3 text-military-green placeholder-military-green/30 focus:outline-none focus:border-military-green/60 font-mono"
            data-testid="arsenal-search"
          />
        </div>
      </div>
      
      {/* Songs Grid */}
      {filteredSongs.length === 0 ? (
        <div className="bg-black/50 border border-military-green/30 p-12 text-center">
          <Music className="w-16 h-16 text-military-green/30 mx-auto mb-4" />
          <p className="text-military-green/60 font-mono">
            {search ? 'KEINE TRACKS GEFUNDEN' : 'ARSENAL LEER'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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