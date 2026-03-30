import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Music as MusicIcon } from 'lucide-react';
import { getPlaylist, getSongs, addSongToPlaylist, removeSongFromPlaylist, getSong } from '../api/musicApi';
import SongCard from '../components/SongCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const PlaylistDetail = ({ setCurrentSong, setPlaylist, setIsPlaying }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlistData, setPlaylistData] = useState(null);
  const [songs, setSongs] = useState([]);
  const [allSongs, setAllSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  useEffect(() => {
    loadData();
  }, [id]);
  
  const loadData = async () => {
    try {
      const [playlist, allSongsData] = await Promise.all([
        getPlaylist(id),
        getSongs()
      ]);
      
      setPlaylistData(playlist);
      setAllSongs(allSongsData);
      
      // Load songs in playlist
      const playlistSongs = await Promise.all(
        (playlist.song_ids || []).map(songId => getSong(songId).catch(() => null))
      );
      setSongs(playlistSongs.filter(s => s !== null));
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddSong = async (songId) => {
    try {
      await addSongToPlaylist(id, songId);
      await loadData();
      setSearchQuery('');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Fehler beim Hinzufügen:', error);
      alert(error.response?.data?.detail || 'Fehler beim Hinzufügen');
    }
  };
  
  const handleRemoveSong = async (songId) => {
    try {
      await removeSongFromPlaylist(id, songId);
      await loadData();
    } catch (error) {
      console.error('Fehler beim Entfernen:', error);
    }
  };
  
  const filteredSongs = allSongs.filter(song => 
    !playlistData?.song_ids?.includes(song.id) &&
    (song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     song.artist.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-military-green text-xl font-mono">LADE MISSION...</div>
      </div>
    );
  }
  
  if (!playlistData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-military-green font-mono">MISSION NICHT GEFUNDEN</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 military-grid" data-testid="playlist-detail">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/missions')}
          className="flex items-center space-x-2 text-military-green/60 hover:text-military-green transition mb-4 font-mono"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ZURÜCK</span>
        </button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-military-green terminal-text mb-2 tracking-wider">
              {playlistData.name}
            </h1>
            {playlistData.description && (
              <p className="text-military-green/60 font-mono mb-2">{playlistData.description}</p>
            )}
            <p className="text-military-green/60 font-mono">{songs.length} TRACKS</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button className="px-6 py-3 bg-military-green/20 border border-military-green/50 text-military-green hover:bg-military-green/30 transition font-mono tracking-wider flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>TRACK HINZUFÜGEN</span>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-black border-military-green/50 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-military-green font-mono text-xl">TRACK ZUR MISSION HINZUFÜGEN</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SUCHEN..."
                  className="bg-black/50 border-military-green/30 text-military-green font-mono mb-4"
                />
                <ScrollArea className="h-[400px]">
                  {filteredSongs.length === 0 ? (
                    <div className="text-center py-8">
                      <MusicIcon className="w-12 h-12 text-military-green/30 mx-auto mb-3" />
                      <p className="text-military-green/60 font-mono">KEINE TRACKS VERFÜGBAR</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredSongs.map((song) => (
                        <div
                          key={song.id}
                          onClick={() => handleAddSong(song.id)}
                          className="flex items-center justify-between p-3 bg-black/30 border border-military-green/20 hover:bg-military-green/10 cursor-pointer transition"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-military-green font-mono truncate">{song.title}</p>
                            <p className="text-xs text-military-green/60 font-mono truncate">{song.artist}</p>
                          </div>
                          <Plus className="w-4 h-4 text-military-green flex-shrink-0 ml-2" />
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Songs */}
      {songs.length === 0 ? (
        <div className="bg-black/50 border border-military-green/30 p-12 text-center">
          <MusicIcon className="w-16 h-16 text-military-green/30 mx-auto mb-4" />
          <p className="text-military-green/60 font-mono">KEINE TRACKS IN DIESER MISSION</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {songs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              onPlay={(song) => {
                setCurrentSong(song);
                setPlaylist(songs);
                setIsPlaying(true);
              }}
              onRemove={() => handleRemoveSong(song.id)}
              showRemove
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaylistDetail;