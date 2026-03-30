import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download } from 'lucide-react';
import { downloadSong, streamSong } from '../api/musicApi';
import WaveSurfer from 'wavesurfer.js';

const AudioPlayer = ({ song, playlist, isPlaying, setIsPlaying, setCurrentSong }) => {
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  
  useEffect(() => {
    if (waveformRef.current && song) {
      // Initialize WaveSurfer
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: 'rgba(0, 255, 65, 0.3)',
        progressColor: '#00ff41',
        cursorColor: '#00ff41',
        barWidth: 2,
        barRadius: 3,
        cursorWidth: 1,
        height: 50,
        barGap: 2,
        backend: 'WebAudio',
      });
      
      wavesurfer.current.load(streamSong(song.id));
      
      wavesurfer.current.on('ready', () => {
        setDuration(wavesurfer.current.getDuration());
        wavesurfer.current.setVolume(volume);
        if (isPlaying) {
          wavesurfer.current.play();
        }
      });
      
      wavesurfer.current.on('audioprocess', () => {
        setCurrentTime(wavesurfer.current.getCurrentTime());
      });
      
      wavesurfer.current.on('finish', () => {
        handleNext();
      });
      
      return () => {
        if (wavesurfer.current) {
          wavesurfer.current.destroy();
        }
      };
    }
  }, [song]);
  
  useEffect(() => {
    if (wavesurfer.current) {
      if (isPlaying) {
        wavesurfer.current.play();
      } else {
        wavesurfer.current.pause();
      }
    }
  }, [isPlaying]);
  
  useEffect(() => {
    if (wavesurfer.current) {
      wavesurfer.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);
  
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };
  
  const handleNext = () => {
    const currentIndex = playlist.findIndex(s => s.id === song.id);
    if (currentIndex < playlist.length - 1) {
      setCurrentSong(playlist[currentIndex + 1]);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };
  
  const handlePrevious = () => {
    const currentIndex = playlist.findIndex(s => s.id === song.id);
    if (currentIndex > 0) {
      setCurrentSong(playlist[currentIndex - 1]);
      setIsPlaying(true);
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleDownload = async () => {
    await downloadSong(song.id, song.filename);
  };
  
  if (!song) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-military-green/30 z-50" data-testid="audio-player">
      <div className="container mx-auto px-4 py-3">
        <div className="grid grid-cols-12 gap-4 items-center">
          {/* Song Info */}
          <div className="col-span-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-military-green/10 border border-military-green/30 flex items-center justify-center">
                <span className="text-2xl">🎵</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-military-green truncate">{song.title}</div>
                <div className="text-xs text-military-green/60 truncate">{song.artist}</div>
              </div>
            </div>
          </div>
          
          {/* Controls & Waveform */}
          <div className="col-span-6">
            <div className="flex flex-col items-center space-y-2">
              {/* Control Buttons */}
              <div className="flex items-center space-x-4">
                <button 
                  onClick={handlePrevious}
                  className="p-2 hover:bg-military-green/10 rounded transition"
                  disabled={playlist.findIndex(s => s.id === song.id) === 0}
                  data-testid="player-previous"
                >
                  <SkipBack className="w-5 h-5 text-military-green" />
                </button>
                
                <button 
                  onClick={togglePlayPause}
                  className="p-3 bg-military-green/20 hover:bg-military-green/30 rounded-full transition border border-military-green/50"
                  data-testid="player-play-pause"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-military-green" />
                  ) : (
                    <Play className="w-6 h-6 text-military-green" />
                  )}
                </button>
                
                <button 
                  onClick={handleNext}
                  className="p-2 hover:bg-military-green/10 rounded transition"
                  disabled={playlist.findIndex(s => s.id === song.id) === playlist.length - 1}
                  data-testid="player-next"
                >
                  <SkipForward className="w-5 h-5 text-military-green" />
                </button>
              </div>
              
              {/* Waveform */}
              <div className="w-full">
                <div ref={waveformRef} className="waveform-container" />
                <div className="flex justify-between text-xs text-military-green/60 mt-1 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Volume & Actions */}
          <div className="col-span-3 flex items-center justify-end space-x-4">
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-military-green/10 rounded transition"
              data-testid="player-download"
            >
              <Download className="w-5 h-5 text-military-green" />
            </button>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 hover:bg-military-green/10 rounded transition"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-military-green" />
                ) : (
                  <Volume2 className="w-5 h-5 text-military-green" />
                )}
              </button>
              
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
                className="w-24 h-1 bg-military-green/20 rounded-lg appearance-none cursor-pointer accent-military-green"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;