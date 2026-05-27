import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Lobby from './components/Lobby';
import Game from './components/Game';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/solo" element={<Game isSolo />} />
        <Route path="/game/:roomCode" element={<Game />} />
      </Routes>
    </BrowserRouter>
  );
}
