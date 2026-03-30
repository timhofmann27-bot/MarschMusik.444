import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle, AlertCircle, Music, X } from 'lucide-react';
import { uploadSong } from '../api/musicApi';
import { useNavigate } from 'react-router-dom';

const UploadStation = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [metadata, setMetadata] = useState({
    title: '',
    artist: '',
    album: '',
    genre: '',
    year: ''
  });
  const navigate = useNavigate();
  
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setCurrentFile(file);
      // Set default title from filename
      setMetadata(prev => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, '')
      }));
    }
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.flac', '.ogg', '.wav', '.m4a', '.mp4']
    },
    maxFiles: 1,
    multiple: false
  });
  
  const handleUpload = async () => {
    if (!currentFile) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', currentFile);
      
      // Only add metadata if provided
      if (metadata.title) formData.append('title', metadata.title);
      if (metadata.artist) formData.append('artist', metadata.artist);
      if (metadata.album) formData.append('album', metadata.album);
      if (metadata.genre) formData.append('genre', metadata.genre);
      if (metadata.year) formData.append('year', metadata.year);
      
      const result = await uploadSong(formData);
      
      setUploadedFiles(prev => [...prev, { ...result, status: 'success' }]);
      setCurrentFile(null);
      setMetadata({
        title: '',
        artist: '',
        album: '',
        genre: '',
        year: ''
      });
    } catch (error) {
      console.error('Upload Fehler:', error);
      setUploadedFiles(prev => [...prev, { 
        filename: currentFile.name, 
        status: 'error',
        error: error.response?.data?.detail || 'Upload fehlgeschlagen'
      }]);
    } finally {
      setUploading(false);
    }
  };
  
  const clearFile = () => {
    setCurrentFile(null);
    setMetadata({
      title: '',
      artist: '',
      album: '',
      genre: '',
      year: ''
    });
  };
  
  return (
    <div className="container mx-auto px-4 py-8 military-grid" data-testid="upload-station">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-military-green terminal-text mb-2 tracking-wider">
          UPLOAD STATION
        </h1>
        <p className="text-military-green/60 font-mono">LADE DEINE MUSIK HOCH</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Zone */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-military-green terminal-text mb-2 tracking-wider">
              DATEI AUSWÄHLEN
            </h2>
          </div>
          
          <div
            {...getRootProps()}
            className={`border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
              isDragActive 
                ? 'border-military-green bg-military-green/10' 
                : currentFile
                ? 'border-military-green/50 bg-military-green/5'
                : 'border-military-green/30 hover:border-military-green/50'
            }`}
          >
            <input {...getInputProps()} />
            {currentFile ? (
              <div className="space-y-4">
                <CheckCircle className="w-16 h-16 text-military-green mx-auto" />
                <div>
                  <p className="text-military-green font-mono mb-1">{currentFile.name}</p>
                  <p className="text-sm text-military-green/60 font-mono">
                    {(currentFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="px-4 py-2 bg-red-900/30 border border-red-500/50 text-red-500 hover:bg-red-900/50 transition font-mono"
                >
                  <X className="w-4 h-4 inline mr-2" />
                  ENTFERNEN
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-16 h-16 text-military-green/50 mx-auto mb-4" />
                <p className="text-military-green font-mono mb-2">
                  {isDragActive ? 'DATEI HIER ABLEGEN' : 'DATEI HIER ABLEGEN ODER KLICKEN'}
                </p>
                <p className="text-sm text-military-green/60 font-mono">
                  MP3, FLAC, OGG, WAV, M4A
                </p>
              </div>
            )}
          </div>
          
          {/* Metadata Editor */}
          {currentFile && (
            <div className="mt-6 bg-black/50 border border-military-green/30 p-6">
              <h3 className="text-lg font-bold text-military-green terminal-text mb-4 tracking-wider">
                METADATEN BEARBEITEN
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-military-green/80 font-mono mb-1">TITEL</label>
                  <input
                    type="text"
                    value={metadata.title}
                    onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-black/50 border border-military-green/30 px-3 py-2 text-military-green font-mono focus:outline-none focus:border-military-green/60"
                    placeholder="Song Titel"
                  />
                </div>
                <div>
                  <label className="block text-sm text-military-green/80 font-mono mb-1">KÜNSTLER</label>
                  <input
                    type="text"
                    value={metadata.artist}
                    onChange={(e) => setMetadata(prev => ({ ...prev, artist: e.target.value }))}
                    className="w-full bg-black/50 border border-military-green/30 px-3 py-2 text-military-green font-mono focus:outline-none focus:border-military-green/60"
                    placeholder="Künstler Name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-military-green/80 font-mono mb-1">ALBUM</label>
                  <input
                    type="text"
                    value={metadata.album}
                    onChange={(e) => setMetadata(prev => ({ ...prev, album: e.target.value }))}
                    className="w-full bg-black/50 border border-military-green/30 px-3 py-2 text-military-green font-mono focus:outline-none focus:border-military-green/60"
                    placeholder="Album Name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-military-green/80 font-mono mb-1">GENRE</label>
                    <input
                      type="text"
                      value={metadata.genre}
                      onChange={(e) => setMetadata(prev => ({ ...prev, genre: e.target.value }))}
                      className="w-full bg-black/50 border border-military-green/30 px-3 py-2 text-military-green font-mono focus:outline-none focus:border-military-green/60"
                      placeholder="Genre"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-military-green/80 font-mono mb-1">JAHR</label>
                    <input
                      type="number"
                      value={metadata.year}
                      onChange={(e) => setMetadata(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full bg-black/50 border border-military-green/30 px-3 py-2 text-military-green font-mono focus:outline-none focus:border-military-green/60"
                      placeholder="2025"
                    />
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleUpload}
                disabled={uploading || !currentFile}
                className="w-full mt-6 px-6 py-3 bg-military-green/20 border border-military-green/50 text-military-green hover:bg-military-green/30 disabled:opacity-50 disabled:cursor-not-allowed transition font-mono tracking-wider"
                data-testid="upload-button"
              >
                {uploading ? 'UPLOADING...' : 'MISSION STARTEN'}
              </button>
            </div>
          )}
        </div>
        
        {/* Upload History */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-military-green terminal-text mb-2 tracking-wider">
              UPLOAD VERLAUF
            </h2>
          </div>
          
          <div className="bg-black/50 border border-military-green/30 p-6">
            {uploadedFiles.length === 0 ? (
              <div className="text-center py-8">
                <Music className="w-12 h-12 text-military-green/30 mx-auto mb-3" />
                <p className="text-military-green/60 font-mono">NOCH KEINE UPLOADS</p>
              </div>
            ) : (
              <div className="space-y-3">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-black/30 border border-military-green/20">
                    {file.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-military-green flex-shrink-0 mt-1" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-military-green font-mono truncate">
                        {file.title || file.filename}
                      </p>
                      {file.artist && file.artist !== 'Unbekannt' && (
                        <p className="text-xs text-military-green/60 font-mono">{file.artist}</p>
                      )}
                      {file.error && (
                        <p className="text-xs text-red-500 font-mono mt-1">{file.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {uploadedFiles.length > 0 && (
              <button
                onClick={() => navigate('/arsenal')}
                className="w-full mt-4 px-4 py-2 bg-military-green/20 border border-military-green/50 text-military-green hover:bg-military-green/30 transition font-mono"
              >
                ZUM ARSENAL
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadStation;