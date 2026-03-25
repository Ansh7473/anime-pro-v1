import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, User, X, Loader2, Heart, History as HistoryIcon, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { animeAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();

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
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
  };

  // Debounced search suggestions using Jikan search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const response = await animeAPI.search(searchQuery);
          // Jikan response: { data: { data: [...] } }
          const animes: any[] = response.data?.data || [];
          // Normalize anime objects to ensure they have poster property
          const normalized = animes.map((anime: any) => {
            const poster = anime.images?.jpg?.large_image_url ||
              anime.images?.jpg?.image_url ||
              anime.image_url ||
              '';
            return {
              ...anime,
              id: anime.mal_id?.toString() || anime.id?.toString(),
              title: anime.title || anime.name || 'Unknown Title',
              poster: poster,
            };
          });
          setSuggestions(normalized.slice(0, 6));
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
    }, 300);

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
    navigate(`/anime/${anime.id}`);
    setSearchQuery('');
    setSearchOpen(false);
    setShowSuggestions(false);
  };

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`} style={{
      position: 'fixed', top: 0, width: '100%', height: 'clamp(60px, 8vh, 70px)', padding: '0 clamp(1rem, 4vw, 4%)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      transition: 'var(--transition)',
      backgroundColor: isScrolled ? 'var(--net-bg)' : 'transparent',
      backgroundImage: isScrolled ? 'none' : 'var(--net-gradient)',
      zIndex: 1000,
      maxWidth: '100vw'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(1rem, 3vw, 2.5rem)' }}>
        <Link to="/" style={{ color: 'var(--net-red)', fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', fontWeight: 800, letterSpacing: '-1px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
          ANIME<span style={{ color: 'white' }}>PRO</span>
        </Link>
        <div style={{ gap: 'clamp(0.75rem, 2vw, 1.5rem)', fontSize: 'clamp(0.8rem, 2vw, 0.95rem)', fontWeight: 500, display: window.innerWidth > 768 ? 'flex' : 'none', alignItems: 'center' }}>
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/latest" className="nav-link">Latest</Link>
          <Link to="/tv-series" className="nav-link">TV Shows</Link>
          <Link to="/movies" className="nav-link">Movies</Link>
          <Link to="/schedule" className="nav-link">Schedule</Link>
          <Link to="/favorites" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Heart size={16} fill="var(--net-red)" style={{ color: 'var(--net-red)' }} />
            Favorites
          </Link>
          <Link to="/history" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <HistoryIcon size={16} />
            History
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.75rem, 2vw, 1.5rem)' }}>
        <div ref={searchRef} style={{ position: 'relative' }}>
          <form onSubmit={handleSearch} style={{
            display: 'flex', alignItems: 'center',
            background: searchOpen ? 'rgba(0,0,0,0.85)' : 'transparent',
            border: searchOpen ? '1px solid rgba(255,255,255,0.4)' : 'none',
            padding: searchOpen ? '6px 12px' : '0',
            borderRadius: '4px', transition: 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
            width: searchOpen ? 'clamp(200px, 30vw, 280px)' : '32px'
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
                style={{ zIndex: 1001, position: 'absolute', top: '100%', right: 0, marginTop: '12px', width: '360px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', padding: '8px' }}>
                {suggestions.map(anime => (
                  <div key={anime.id} onClick={() => selectSuggestion(anime)}
                    style={{ display: 'flex', gap: '12px', padding: '10px', cursor: 'pointer', borderRadius: '8px', transition: 'var(--transition)' }}
                    className="suggestion-item"
                    onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.background = 'transparent')}>
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

        {/* User Authentication Section */}
        {user ? (
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--net-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                {user.email?.[0].toUpperCase()}
              </div>
              <ChevronDown size={16} style={{ color: 'white' }} />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="glass"
                  style={{
                    zIndex: 1001,
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '12px',
                    width: '200px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                    padding: '8px',
                  }}
                >
                  <div
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      marginBottom: '8px',
                    }}
                  >
                    <p
                      style={{
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        marginBottom: '2px',
                      }}
                    >
                      {user.user_metadata?.username || user.email?.split('@')[0]}
                    </p>
                    <p
                      style={{
                        color: 'var(--net-text-muted)',
                        fontSize: '0.8rem',
                      }}
                    >
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--net-text-muted)',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--net-text-muted)';
                    }}
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              backgroundColor: 'var(--net-red)',
              border: 'none',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = 'var(--net-red-hover)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = 'var(--net-red)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <User size={18} />
            Sign In
          </button>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </nav>
  );
};

export default Navbar;
