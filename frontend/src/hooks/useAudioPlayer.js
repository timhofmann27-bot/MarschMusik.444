import { useState, useEffect, useRef, useCallback } from 'react';
import { songsApi, historyApi } from '../api/musicApi';

const SEEK_REWIND_THRESHOLD = 3; // seconds before rewinding to start

export function useAudioPlayer({ song, playlist, isPlaying, setIsPlaying, setCurrentSong, shuffle, repeatMode }) {
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const audioRef = useRef(null);
  const trackedRef = useRef(null);

  const handleNext = useCallback(() => {
    if (!playlist?.length || !song) return;
    const idx = playlist.findIndex(s => s.id === song.id);
    if (shuffle) {
      const next = Math.floor(Math.random() * playlist.length);
      setCurrentSong(playlist[next]);
      setIsPlaying(true);
    } else if (idx < playlist.length - 1) {
      setCurrentSong(playlist[idx + 1]);
      setIsPlaying(true);
    } else if (repeatMode === 'all') {
      setCurrentSong(playlist[0]);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [playlist, song, shuffle, repeatMode, setCurrentSong, setIsPlaying]);

  const handlePrev = useCallback(() => {
    if (!playlist?.length || !song) return;
    if (audioRef.current && audioRef.current.currentTime > SEEK_REWIND_THRESHOLD) {
      audioRef.current.currentTime = 0;
      return;
    }
    const idx = playlist.findIndex(s => s.id === song.id);
    if (idx > 0) {
      setCurrentSong(playlist[idx - 1]);
      setIsPlaying(true);
    }
  }, [playlist, song, setCurrentSong, setIsPlaying]);

  // Load + play song
  useEffect(() => {
    if (!audioRef.current || !song) return;
    const audio = audioRef.current;
    audio.src = songsApi.streamUrl(song.id);
    audio.volume = isMuted ? 0 : volume;
    setLoading(true);

    const onLoaded = () => {
      setDuration(audio.duration);
      setLoading(false);
      if (isPlaying && interacted) audio.play().catch(() => setIsPlaying(false));
    };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      if (repeatMode === 'one') { audio.currentTime = 0; audio.play(); }
      else handleNext();
    };
    const onPlay = () => setInteracted(true);

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
    };
  }, [song, handleNext, isPlaying, isMuted, volume, interacted, repeatMode, setIsPlaying]);

  // Play/pause sync
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.play().catch(() => setIsPlaying(false));
    else audioRef.current.pause();
  }, [isPlaying, setIsPlaying]);

  // Volume sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // History tracking
  useEffect(() => {
    if (song && isPlaying && song.id !== trackedRef.current) {
      trackedRef.current = song.id;
      historyApi.add(song.id).catch(() => {});
    }
  }, [song, isPlaying]);

  const togglePlay = useCallback(() => {
    setInteracted(true);
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  const handleSeek = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    if (audioRef.current) {
      audioRef.current.currentTime = pct * duration;
      setCurrentTime(pct * duration);
    }
  }, [duration]);

  const toggleMute = useCallback(() => setIsMuted(m => !m), []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return {
    audioRef, volume, setVolume, isMuted, toggleMute,
    currentTime, duration, loading, progress,
    togglePlay, handleSeek, handleNext, handlePrev,
  };
}

export function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}
