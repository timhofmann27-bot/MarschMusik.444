import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CommandCenter from "./pages/CommandCenter";
import Arsenal from "./pages/Arsenal";
import UploadStation from "./pages/UploadStation";
import MissionBriefings from "./pages/MissionBriefings";
import PlaylistDetail from "./pages/PlaylistDetail";
import Navigation from "./components/Navigation";
import AudioPlayer from "./components/AudioPlayer";

function App() {
  const [currentSong, setCurrentSong] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="App min-h-screen bg-military-dark text-military-green">
      <BrowserRouter>
        <Navigation />
        <div className="pb-32">
          <Routes>
            <Route path="/" element={<CommandCenter setCurrentSong={setCurrentSong} setPlaylist={setPlaylist} setIsPlaying={setIsPlaying} />} />
            <Route path="/arsenal" element={<Arsenal setCurrentSong={setCurrentSong} setPlaylist={setPlaylist} setIsPlaying={setIsPlaying} />} />
            <Route path="/upload" element={<UploadStation />} />
            <Route path="/missions" element={<MissionBriefings />} />
            <Route path="/missions/:id" element={<PlaylistDetail setCurrentSong={setCurrentSong} setPlaylist={setPlaylist} setIsPlaying={setIsPlaying} />} />
          </Routes>
        </div>
        {currentSong && (
          <AudioPlayer 
            song={currentSong} 
            playlist={playlist}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            setCurrentSong={setCurrentSong}
          />
        )}
      </BrowserRouter>
    </div>
  );
}

export default App;