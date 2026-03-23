import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Search from './pages/Search';
import AnimeDetails from './pages/AnimeDetails';
import Player from './pages/Player';
import LatestEpisodes from './pages/LatestEpisodes';
import TVShows from './pages/TVShows';
import Movies from './pages/Movies';
import Schedule from './pages/Schedule';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/latest" element={<LatestEpisodes />} />
            <Route path="/tv-series" element={<TVShows />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/search" element={<Search />} />
            <Route path="/anime/:id" element={<AnimeDetails />} />
            <Route path="/watch/:animeId/:ep" element={<Player />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
