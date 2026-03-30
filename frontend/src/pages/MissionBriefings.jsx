import { useState, useEffect } from 'react';
import { Plus, List as ListIcon } from 'lucide-react';
import { getPlaylists, createPlaylist, deletePlaylist } from '../api/musicApi';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MissionBriefings = () => {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({ name: '', description: '' });
  const navigate = useNavigate();
  
  useEffect(() => {
    loadPlaylists();
  }, []);
  
  const loadPlaylists = async () => {
    try {
      const data = await getPlaylists();
      setPlaylists(data);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreate = async () => {
    if (!newPlaylist.name.trim()) return;
    
    try {
      await createPlaylist(newPlaylist);
      setNewPlaylist({ name: '', description: '' });
      setIsDialogOpen(false);
      loadPlaylists();
    } catch (error) {
      console.error('Fehler beim Erstellen:', error);
    }
  };
  
  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Mission wirklich abbrechen?')) {
      try {
        await deletePlaylist(id);
        loadPlaylists();
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
      }
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-military-green text-lg md:text-xl font-mono">LADE MISSIONEN...</div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 military-grid" data-testid="mission-briefings">
      {/* Header */}
      <div className="mb-4 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-military-green terminal-text mb-1 md:mb-2 tracking-wider">
            MISSION BRIEFINGS
          </h1>
          <p className="text-xs md:text-base text-military-green/60 font-mono">{playlists.length} MISSIONEN AKTIV</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button 
              className="px-4 md:px-6 py-2 md:py-3 bg-military-green/20 border border-military-green/50 text-military-green hover:bg-military-green/30 active:bg-military-green/30 transition font-mono tracking-wider flex items-center justify-center space-x-2 text-sm md:text-base w-full sm:w-auto"
              data-testid="create-playlist-button"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              <span>NEUE MISSION</span>
            </button>
          </DialogTrigger>
          <DialogContent className="bg-black border-military-green/50 w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle className="text-military-green font-mono text-lg md:text-xl">NEUE MISSION ERSTELLEN</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 md:space-y-4 mt-4">
              <div>
                <Label className="text-military-green/80 font-mono text-sm">MISSIONSNAME</Label>
                <Input
                  value={newPlaylist.name}
                  onChange={(e) => setNewPlaylist(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-black/50 border-military-green/30 text-military-green font-mono mt-1"
                  placeholder="Meine Playlist"
                />
              </div>
              <div>
                <Label className="text-military-green/80 font-mono text-sm">BESCHREIBUNG</Label>
                <Textarea
                  value={newPlaylist.description}
                  onChange={(e) => setNewPlaylist(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-black/50 border-military-green/30 text-military-green font-mono mt-1"
                  placeholder="Beschreibung..."
                  rows={3}
                />
              </div>
              <Button
                onClick={handleCreate}
                className="w-full bg-military-green/20 border border-military-green/50 text-military-green hover:bg-military-green/30 font-mono h-11"
                disabled={!newPlaylist.name.trim()}
              >
                MISSION STARTEN
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Playlists Grid */}
      {playlists.length === 0 ? (
        <div className="bg-black/50 border border-military-green/30 p-8 md:p-12 text-center">
          <ListIcon className="w-12 h-12 md:w-16 md:h-16 text-military-green/30 mx-auto mb-3 md:mb-4" />
          <p className="text-sm md:text-base text-military-green/60 font-mono">KEINE MISSIONEN VERFÜGBAR</p>
          <p className="text-xs md:text-sm text-military-green/40 font-mono mt-2">ERSTELLE DEINE ERSTE PLAYLIST</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              onClick={() => navigate(`/missions/${playlist.id}`)}
              className="bg-black/50 border border-military-green/30 p-4 md:p-6 cursor-pointer hover:bg-military-green/5 active:bg-military-green/5 transition glow-border group touch-manipulation"
              data-testid={`playlist-${playlist.id}`}
            >
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <ListIcon className="w-10 h-10 md:w-12 md:h-12 text-military-green/50 group-hover:text-military-green transition" />
                <div className="status-led"></div>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-military-green font-mono mb-2">
                {playlist.name}
              </h3>
              {playlist.description && (
                <p className="text-xs md:text-sm text-military-green/60 font-mono mb-3 line-clamp-2">
                  {playlist.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs md:text-sm text-military-green/60 font-mono">
                <span>{playlist.song_ids?.length || 0} TRACKS</span>
                <button
                  onClick={(e) => handleDelete(playlist.id, e)}
                  className="text-red-500 hover:text-red-400 active:text-red-400 transition py-1 px-2"
                >
                  ABBRECHEN
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MissionBriefings;
