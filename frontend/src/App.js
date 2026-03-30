import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Bibliothek from './pages/Bibliothek';
import Hochladen from './pages/Hochladen';
import Playlists from './pages/Playlists';
import PlaylistDetailPage from './pages/PlaylistDetailPage';
import Favoriten from './pages/Favoriten';
import Suche from './pages/Suche';
import Profil from './pages/Profil';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import PlayerBar from './components/AudioPlayer';
import { Toaster } from './components/ui/sonner';
import { useNavigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-hf-bg flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-hf-gold/30 border-t-hf-gold rounded-full animate-spin" />
    </div>
  );
  if (user === false) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const [currentSong, setCurrentSong] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const navigate = useNavigate();

  const playSong = (song, songList) => {
    setCurrentSong(song);
    setPlaylist(songList || [song]);
    setIsPlaying(true);
  };

  const playPlaylist = (plId) => {
    navigate(`/playlists/${plId}`);
  };

  if (loading) return (
    <div className="min-h-screen bg-hf-bg flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-hf-gold/30 border-t-hf-gold rounded-full animate-spin" />
    </div>
  );

  if (user === false) {
    return (
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-hf-bg">
      <Sidebar />
      <main className={`md:ml-64 px-4 md:px-8 py-6 ${currentSong ? 'pb-36 md:pb-28' : 'pb-20 md:pb-8'}`}>
        <Routes>
          <Route path="/" element={<Dashboard playSong={playSong} playPlaylist={playPlaylist} />} />
          <Route path="/bibliothek" element={<Bibliothek playSong={playSong} />} />
          <Route path="/hochladen" element={<Hochladen />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/playlists/:id" element={<PlaylistDetailPage playSong={playSong} />} />
          <Route path="/favoriten" element={<Favoriten playSong={playSong} />} />
          <Route path="/suche" element={<Suche playSong={playSong} />} />
          <Route path="/profil" element={<Profil />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <MobileNav />
      <PlayerBar
        song={currentSong}
        playlist={playlist}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        setCurrentSong={setCurrentSong}
        shuffle={shuffle}
        setShuffle={setShuffle}
        repeatMode={repeatMode}
        setRepeatMode={setRepeatMode}
      />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#0C111C',
            border: '1px solid rgba(197, 160, 89, 0.2)',
            color: '#FFFFFF',
            fontFamily: 'Outfit, sans-serif',
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
