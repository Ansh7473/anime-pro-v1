import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, User, X, Loader2, Heart, History as HistoryIcon, LogOut, ChevronDown, Menu, Home, Clock, Film, Tv, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { animeAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setIsScrolled(currentY > 10);
      if (currentY > 80) {
        setIsHidden(currentY > lastScrollY.current);
      } else {
        setIsHidden(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
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

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const response = await animeAPI.search(searchQuery);
          const animes: any[] = response.data?.data || [];
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

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/latest', label: 'Latest', icon: Clock },
    { to: '/tv-series', label: 'TV Shows', icon: Tv },
    { to: '/movies', label: 'Movies', icon: Film },
    { to: '/schedule', label: 'Schedule', icon: Calendar },
    { to: '/favorites', label: 'Favorites', icon: Heart },
    { to: '/history', label: 'History', icon: HistoryIcon },
  ];

  return (
    <>
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`} style={{
        position: 'fixed', top: 0, width: '100%', height: 'clamp(56px, 8vh, 68px)', padding: '0 clamp(1rem, 4vw, 4%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'background 0.3s ease, transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHidden ? 'translateY(-100%)' : 'translateY(0)',
        backgroundColor: isScrolled ? 'var(--net-bg)' : 'transparent',
        backgroundImage: isScrolled ? 'none' : 'var(--net-gradient)',
        zIndex: 1000,
        maxWidth: '100vw'
      }}>
        {/* Left: Logo + Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(1rem, 3vw, 2.5rem)', minWidth: 0 }}>
          <Link to="/" style={{ color: 'var(--net-red)', fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', fontWeight: 800, letterSpacing: '-1px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            ANIME<span style={{ color: 'white' }}>PRO</span>
          </Link>
          {/* Desktop Nav Links */}
          <div className="desktop-nav" style={{ gap: 'clamp(0.75rem, 2vw, 1.5rem)', fontSize: 'clamp(0.8rem, 2vw, 0.92rem)', fontWeight: 500 }}>
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="nav-link"
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  color: location.pathname === link.to ? 'white' : 'var(--net-text-muted)',
                  fontWeight: location.pathname === link.to ? 700 : 500,
                }}
              >
                {(link.to === '/favorites' || link.to === '/history') && (
                  <link.icon size={14} fill={link.to === '/favorites' ? 'var(--net-red)' : 'none'} style={{ color: 'var(--net-red)' }} />
                )}
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Search + User + Mobile Menu Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 2vw, 1rem)', flexShrink: 0 }}>
          {/* Search */}
          <div ref={searchRef} style={{ position: 'relative' }}>
            <form onSubmit={handleSearch} style={{
              display: 'flex', alignItems: 'center',
              background: searchOpen ? 'rgba(0,0,0,0.85)' : 'transparent',
              border: searchOpen ? '1px solid rgba(255,255,255,0.4)' : 'none',
              padding: searchOpen ? '6px 12px' : '0',
              borderRadius: '4px', transition: 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
              width: searchOpen ? 'clamp(160px, 28vw, 260px)' : '32px'
            }}>
              <button type="button" onClick={() => setSearchOpen(!searchOpen)} style={{ color: 'white', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <Search size={20} />
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
                <button onClick={() => setSearchQuery('')} type="button" style={{ color: 'var(--net-text-muted)', flexShrink: 0 }}>
                  {isSearching ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                </button>
              )}
            </form>

            {/* Suggestions dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="glass"
                  style={{ zIndex: 1001, position: 'absolute', top: '100%', right: 0, marginTop: '12px', width: 'clamp(280px, 40vw, 360px)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', padding: '8px' }}>
                  {suggestions.map(anime => (
                    <div key={anime.id} onClick={() => selectSuggestion(anime)}
                      style={{ display: 'flex', gap: '12px', padding: '10px', cursor: 'pointer', borderRadius: '8px', transition: 'var(--transition)' }}
                      className="suggestion-item"
                      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.background = 'transparent')}>
                      <img src={anime.poster} alt={anime.title}
                        style={{ width: '40px', height: '56px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden', justifyContent: 'center' }}>
                        <span className="line-clamp-1" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white' }}>
                          {anime.title}
                        </span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bell (desktop only) */}
          <Bell size={20} className="desktop-only-icon" style={{ color: 'white', cursor: 'pointer' }} />

          {/* User Section */}
          {user ? (
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.4rem', borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; }}
              >
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'var(--net-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>
                  {user.email?.[0].toUpperCase()}
                </div>
                <ChevronDown size={14} style={{ color: 'white' }} className="desktop-only-icon" />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="glass"
                    style={{ zIndex: 1001, position: 'absolute', top: '100%', right: 0, marginTop: '12px', width: '200px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', padding: '8px' }}
                  >
                    <div style={{ padding: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '8px' }}>
                      <p style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}>
                        {user.user_metadata?.username || user.email?.split('@')[0]}
                      </p>
                      <p style={{ color: 'var(--net-text-muted)', fontSize: '0.8rem' }}>{user.email}</p>
                    </div>
                    <Link to="/favorites" onClick={() => setUserMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', color: 'var(--net-text-muted)', borderRadius: '8px', fontSize: '0.9rem' }}
                      onMouseEnter={(e: any) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={(e: any) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--net-text-muted)'; }}>
                      <Heart size={16} /> Favorites
                    </Link>
                    <Link to="/history" onClick={() => setUserMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', color: 'var(--net-text-muted)', borderRadius: '8px', fontSize: '0.9rem' }}
                      onMouseEnter={(e: any) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={(e: any) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--net-text-muted)'; }}>
                      <HistoryIcon size={16} /> History
                    </Link>
                    <button
                      onClick={handleSignOut}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: 'transparent', border: 'none', color: 'var(--net-text-muted)', cursor: 'pointer', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500, transition: 'all 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--net-text-muted)'; }}
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="sign-in-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '8px', backgroundColor: 'var(--net-red)', border: 'none', color: 'white', fontWeight: 600, fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = 'var(--net-red-hover)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = 'var(--net-red)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <User size={16} /><span className="sign-in-text">Sign In</span>
            </button>
          )}

          {/* Hamburger Menu (Mobile only) */}
          <button
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ color: 'white', display: 'none', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer' }}
            aria-label="Open menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 998, backdropFilter: 'blur(4px)' }}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 'min(82vw, 300px)', backgroundColor: '#111', zIndex: 999, padding: '0', overflowY: 'auto', boxShadow: '4px 0 40px rgba(0,0,0,0.6)' }}
            >
              {/* Drawer Header */}
              <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link to="/" style={{ color: 'var(--net-red)', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-1px' }} onClick={() => setMobileMenuOpen(false)}>
                  ANIME<span style={{ color: 'white' }}>PRO</span>
                </Link>
                <button onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--net-text-muted)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', padding: '6px', display: 'flex', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              {/* User info if signed in */}
              {user && (
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'var(--net-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                    {user.email?.[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.user_metadata?.username || user.email?.split('@')[0]}</p>
                    <p style={{ color: 'var(--net-text-muted)', fontSize: '0.75rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                  </div>
                </div>
              )}

              {/* Nav Links */}
              <nav style={{ padding: '0.75rem 0' }}>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.85rem',
                      padding: '0.85rem 1.25rem',
                      color: location.pathname === link.to ? 'white' : 'var(--net-text-muted)',
                      backgroundColor: location.pathname === link.to ? 'rgba(229,9,20,0.12)' : 'transparent',
                      fontWeight: location.pathname === link.to ? 600 : 400,
                      fontSize: '1rem',
                      borderLeft: location.pathname === link.to ? '3px solid var(--net-red)' : '3px solid transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    <link.icon size={18} style={{ color: location.pathname === link.to ? 'var(--net-red)' : 'var(--net-text-muted)', flexShrink: 0 }} />
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Bottom actions */}
              <div style={{ padding: '0.75rem 1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 'auto' }}>
                {user ? (
                  <button
                    onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', backgroundColor: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.25)', color: '#f87171', cursor: 'pointer', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 500 }}
                  >
                    <LogOut size={18} /> Sign Out
                  </button>
                ) : (
                  <button
                    onClick={() => { setAuthModalOpen(true); setMobileMenuOpen(false); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.85rem 1rem', backgroundColor: 'var(--net-red)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 700 }}
                  >
                    <User size={18} /> Sign In
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CSS for responsive navbar */}
      <style>{`
        .desktop-nav {
          display: flex;
          align-items: center;
        }
        .desktop-only-icon {
          display: block;
        }
        .hamburger-btn {
          display: none !important;
        }
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .desktop-only-icon {
            display: none !important;
          }
          .hamburger-btn {
            display: flex !important;
          }
          .sign-in-text {
            display: none;
          }
          .sign-in-btn {
            padding: 0.5rem !important;
            border-radius: 50% !important;
          }
        }
      `}</style>

      {/* Auth Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

export default Navbar;
