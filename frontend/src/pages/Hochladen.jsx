import { useState, useCallback } from 'react';
import { songsApi } from '../api/musicApi';
import { Upload, Music, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';

export default function Hochladen() {
  const [uploads, setUploads] = useState([]);

  const onDrop = useCallback((accepted) => {
    accepted.forEach(file => {
      const id = Date.now() + Math.random();
      setUploads(prev => [...prev, { id, file, progress: 0, status: 'uploading', name: file.name }]);

      const formData = new FormData();
      formData.append('file', file);

      songsApi.upload(formData, (progress) => {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, progress } : u));
      }).then(() => {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'done', progress: 100 } : u));
        toast.success(`"${file.name}" hochgeladen!`);
      }).catch(() => {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'error' } : u));
        toast.error(`Fehler bei "${file.name}"`);
      });
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.flac', '.ogg', '.wav', '.m4a'] },
    multiple: true,
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight" data-testid="upload-title">Hochladen</h1>
      <p className="text-hf-text-muted">Lade deine Musik hoch. Unterstuetzte Formate: MP3, FLAC, OGG, WAV, M4A</p>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragActive ? 'border-hf-gold bg-hf-gold/10' : 'border-hf-border hover:border-hf-gold/50 hover:bg-hf-surface'
        }`}
        data-testid="upload-dropzone"
      >
        <input {...getInputProps()} data-testid="upload-input" />
        <Upload size={48} className={`mx-auto mb-4 ${isDragActive ? 'text-hf-gold' : 'text-hf-border'}`} />
        <p className="text-white font-semibold mb-1">
          {isDragActive ? 'Dateien hier ablegen...' : 'Dateien hierher ziehen'}
        </p>
        <p className="text-hf-text-muted text-sm">oder klicken zum Auswaehlen</p>
      </div>

      {/* Upload List */}
      <AnimatePresence>
        {uploads.map(u => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-hf-surface border border-hf-border rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-hf-bg flex items-center justify-center flex-shrink-0">
                {u.status === 'done' ? <CheckCircle size={18} className="text-green-400" /> :
                 u.status === 'error' ? <AlertCircle size={18} className="text-red-400" /> :
                 <Music size={18} className="text-hf-gold" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{u.name}</div>
                <div className="text-xs text-hf-text-muted">
                  {u.status === 'done' ? 'Erfolgreich hochgeladen' :
                   u.status === 'error' ? 'Fehler beim Hochladen' :
                   `${u.progress}%`}
                </div>
              </div>
            </div>
            {u.status === 'uploading' && (
              <div className="mt-3 h-1.5 bg-hf-bg rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-hf-gold rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${u.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
