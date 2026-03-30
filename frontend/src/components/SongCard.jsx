import { useState } from 'react';
import { Play, Download, Trash2, Edit2, Heart, X } from 'lucide-react';
import { deleteSong, downloadSong, updateSong, toggleLike } from '../api/musicApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const SongCard = ({ song, onPlay, onUpdate, onRemove, showRemove = false }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    title: song.title,
    artist: song.artist,
    album: song.album,
    genre: song.genre,
    year: song.year || ''
  });
  const [likes, setLikes] = useState(song.likes || 0);
  
  const handleDelete = async () => {
    if (window.confirm('Track wirklich löschen?')) {
      try {
        await deleteSong(song.id);
        if (onUpdate) onUpdate();
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
      }
    }
  };
  
  const handleDownload = async () => {
    try {
      await downloadSong(song.id, song.filename);
    } catch (error) {
      console.error('Fehler beim Download:', error);
    }
  };
  
  const handleUpdate = async () => {
    try {
      const updatePayload = {};
      if (editData.title !== song.title) updatePayload.title = editData.title;
      if (editData.artist !== song.artist) updatePayload.artist = editData.artist;
      if (editData.album !== song.album) updatePayload.album = editData.album;
      if (editData.genre !== song.genre) updatePayload.genre = editData.genre;
      if (editData.year !== song.year) updatePayload.year = editData.year ? parseInt(editData.year) : null;
      
      if (Object.keys(updatePayload).length > 0) {
        await updateSong(song.id, updatePayload);
        if (onUpdate) onUpdate();
      }
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
    }
  };
  
  const handleLike = async () => {
    try {
      const result = await toggleLike(song.id);
      setLikes(result.likes);
    } catch (error) {
      console.error('Fehler beim Liken:', error);
    }
  };
  
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <>
      <div className="bg-black/50 border border-military-green/30 p-4 glow-border group" data-testid={`song-card-${song.id}`}>
        {/* Cover/Icon */}
        <div className="relative mb-4">
          <div className="w-full aspect-square bg-military-green/10 border border-military-green/30 flex items-center justify-center">
            <span className="text-6xl">🎵</span>
          </div>
          <button
            onClick={() => onPlay(song)}
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            data-testid={`play-song-${song.id}`}
          >
            <div className="w-16 h-16 bg-military-green/30 border border-military-green rounded-full flex items-center justify-center hover:bg-military-green/50 transition">
              <Play className="w-8 h-8 text-military-green ml-1" />
            </div>
          </button>
        </div>
        
        {/* Info */}
        <div className="mb-3">
          <h3 className="text-military-green font-mono font-bold truncate mb-1">{song.title}</h3>
          <p className="text-military-green/60 font-mono text-sm truncate">{song.artist}</p>
          {song.album && song.album !== 'Unbekannt' && (
            <p className="text-military-green/40 font-mono text-xs truncate">{song.album}</p>
          )}
        </div>
        
        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-military-green/60 font-mono mb-3">
          <span>{formatDuration(song.duration)}</span>
          <span>{song.genre !== 'Unbekannt' ? song.genre : ''}</span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between border-t border-military-green/20 pt-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleLike}
              className="p-1.5 hover:bg-military-green/10 rounded transition"
              data-testid={`like-song-${song.id}`}
            >
              <Heart className="w-4 h-4 text-military-green" />
            </button>
            <span className="text-xs text-military-green/60 font-mono">{likes}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={handleDownload}
              className="p-1.5 hover:bg-military-green/10 rounded transition"
              title="Download"
              data-testid={`download-song-${song.id}`}
            >
              <Download className="w-4 h-4 text-military-green" />
            </button>
            <button
              onClick={() => setIsEditDialogOpen(true)}
              className="p-1.5 hover:bg-military-green/10 rounded transition"
              title="Bearbeiten"
              data-testid={`edit-song-${song.id}`}
            >
              <Edit2 className="w-4 h-4 text-military-green" />
            </button>
            {showRemove ? (
              <button
                onClick={onRemove}
                className="p-1.5 hover:bg-red-900/30 rounded transition"
                title="Entfernen"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            ) : (
              <button
                onClick={handleDelete}
                className="p-1.5 hover:bg-red-900/30 rounded transition"
                title="Löschen"
                data-testid={`delete-song-${song.id}`}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-black border-military-green/50">
          <DialogHeader>
            <DialogTitle className="text-military-green font-mono text-xl">METADATEN BEARBEITEN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-military-green/80 font-mono">TITEL</Label>
              <Input
                value={editData.title}
                onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                className="bg-black/50 border-military-green/30 text-military-green font-mono"
              />
            </div>
            <div>
              <Label className="text-military-green/80 font-mono">KÜNSTLER</Label>
              <Input
                value={editData.artist}
                onChange={(e) => setEditData(prev => ({ ...prev, artist: e.target.value }))}
                className="bg-black/50 border-military-green/30 text-military-green font-mono"
              />
            </div>
            <div>
              <Label className="text-military-green/80 font-mono">ALBUM</Label>
              <Input
                value={editData.album}
                onChange={(e) => setEditData(prev => ({ ...prev, album: e.target.value }))}
                className="bg-black/50 border-military-green/30 text-military-green font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-military-green/80 font-mono">GENRE</Label>
                <Input
                  value={editData.genre}
                  onChange={(e) => setEditData(prev => ({ ...prev, genre: e.target.value }))}
                  className="bg-black/50 border-military-green/30 text-military-green font-mono"
                />
              </div>
              <div>
                <Label className="text-military-green/80 font-mono">JAHR</Label>
                <Input
                  type="number"
                  value={editData.year}
                  onChange={(e) => setEditData(prev => ({ ...prev, year: e.target.value }))}
                  className="bg-black/50 border-military-green/30 text-military-green font-mono"
                />
              </div>
            </div>
            <Button
              onClick={handleUpdate}
              className="w-full bg-military-green/20 border border-military-green/50 text-military-green hover:bg-military-green/30 font-mono"
            >
              SPEICHERN
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SongCard;