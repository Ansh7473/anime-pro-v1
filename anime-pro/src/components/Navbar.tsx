import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, User, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { animeAPI } from '../api/client';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search suggestions using HiAnime search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const response = await animeAPI.search(searchQuery);
          // DesiDubAnime response: { data: { results: [...] } }
          const animes: any[] = response.data?.data?.results || [];
          setSuggestions(animes.slice(0, 6));
          setShowSuggestions(true);
        } catch (error) {
          console.error('Search suggestions failed', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSuggestions(false);
      setSearchOpen(false);
    }
  };

  const selectSuggestion = (anime: any) => {
    navigate(`/anime/${anime.slug || anime.id}`);
    setSearchQuery('');
    setSearchOpen(false);
    setShowSuggestions(false);
  };

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`} style={{
      position: 'fixed', top: 0, width: '100%', height: '70px', padding: '0 4%',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      transition: 'var(--transition)',
      backgroundColor: isScrolled ? 'var(--net-bg)' : 'transparent',
      backgroundImage: isScrolled ? 'none' : 'var(--net-gradient)',
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
        <Link to="/" style={{ color: 'var(--net-red)', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ANIME<span style={{ color: 'white' }}>PRO</span>
        </Link>
        <div style={{ gap: '1.5rem', fontSize: '0.95rem', fontWeight: 500, display: window.innerWidth > 768 ? 'flex' : 'none' }}>
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/latest" className="nav-link">Latest</Link>
          <Link to="/tv-series" className="nav-link">TV Shows</Link>
          <Link to="/movies" className="nav-link">Movies</Link>
          <Link to="/schedule" className="nav-link">Schedule</Link>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div ref={searchRef} style={{ position: 'relative' }}>
          <form onSubmit={handleSearch} style={{
            display: 'flex', alignItems: 'center',
            background: searchOpen ? 'rgba(0,0,0,0.85)' : 'transparent',
            border: searchOpen ? '1px solid rgba(255,255,255,0.4)' : 'none',
            padding: searchOpen ? '6px 12px' : '0',
            borderRadius: '4px', transition: 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
            width: searchOpen ? '280px' : '32px'
          }}>
            <button type="button" onClick={() => setSearchOpen(!searchOpen)} style={{ color: 'white', display: 'flex', alignItems: 'center' }}>
              <Search size={22} />
            </button>
            <AnimatePresence>
              {searchOpen && (
                <motion.input initial={{ width: 0, opacity: 0 }} animate={{ width: '100%', opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                  type="text" placeholder="Search anime..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', marginLeft: '12px', fontSize: '0.9rem', width: '100%' }}
                  autoFocus />
              )}
            </AnimatePresence>
            {searchQuery && searchOpen && (
              <button onClick={() => setSearchQuery('')} type="button" style={{ color: 'var(--net-text-muted)' }}>
                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
              </button>
            )}
          </form>

          {/* Suggestions dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="glass"
                style={{ position: 'absolute', top: '100%', right: 0, marginTop: '12px', width: '360px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', padding: '8px' }}>
                {suggestions.map(anime => (
                  <div key={anime.id} onClick={() => selectSuggestion(anime)}
                    style={{ display: 'flex', gap: '12px', padding: '10px', cursor: 'pointer', borderRadius: '8px', transition: 'var(--transition)' }}
                    className="suggestion-item"
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <img src={anime.poster} alt={anime.title}
                      style={{ width: '48px', height: '68px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                      <span className="line-clamp-1" style={{ fontWeight: 600, fontSize: '0.95rem', color: 'white' }}>
                        {anime.title}
                      </span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Bell size={22} style={{ color: 'white', cursor: 'pointer', display: window.innerWidth > 600 ? 'block' : 'none' }} />
        <div style={{ width: '34px', height: '34px', borderRadius: '4px', backgroundColor: 'var(--net-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <User size={22} style={{ color: 'white' }} />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
