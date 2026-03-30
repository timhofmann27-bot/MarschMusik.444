import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import CommandCenter from "./pages/CommandCenter";
import Arsenal from "./pages/Arsenal";
import UploadStation from "./pages/UploadStation";
import MissionBriefings from "./pages/MissionBriefings";
import PlaylistDetail from "./pages/PlaylistDetail";
import Navigation from "./components/Navigation";
import BottomNavigation from "./components/BottomNavigation";
import AudioPlayer from "./components/AudioPlayer";
import { Toaster } from "./components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";

function AnimatedRoutes({ setCurrentSong, setPlaylist, setIsPlaying }) {
  const location = useLocation();
  
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <CommandCenter setCurrentSong={setCurrentSong} setPlaylist={setPlaylist} setIsPlaying={setIsPlaying} />
          </motion.div>
        } />
        <Route path="/arsenal" element={
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <Arsenal setCurrentSong={setCurrentSong} setPlaylist={setPlaylist} setIsPlaying={setIsPlaying} />
          </motion.div>
        } />
        <Route path="/upload" element={
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <UploadStation />
          </motion.div>
        } />
        <Route path="/missions" element={
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <MissionBriefings />
          </motion.div>
        } />
        <Route path="/missions/:id" element={
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <PlaylistDetail setCurrentSong={setCurrentSong} setPlaylist={setPlaylist} setIsPlaying={setIsPlaying} />
          </motion.div>
        } />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [currentSong, setCurrentSong] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="App min-h-screen bg-military-dark text-military-green">
      <BrowserRouter>
        <Navigation />
        <div className="pb-16 md:pb-32">
          <AnimatedRoutes 
            setCurrentSong={setCurrentSong} 
            setPlaylist={setPlaylist} 
            setIsPlaying={setIsPlaying} 
          />
        </div>
        <BottomNavigation />
        {currentSong && (
          <AudioPlayer 
            song={currentSong} 
            playlist={playlist}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            setCurrentSong={setCurrentSong}
          />
        )}
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: '#0a0a0a',
              border: '1px solid rgba(0, 255, 65, 0.3)',
              color: '#00ff41',
              fontFamily: 'monospace',
            },
          }}
        />
      </BrowserRouter>
    </div>
  );
}

export default App;
