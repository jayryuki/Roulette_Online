import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Game from './components/Game';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Game />} />
        <Route path="/solo" element={<Game isSolo />} />
      </Routes>
    </BrowserRouter>
  );
}
