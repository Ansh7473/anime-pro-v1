import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, ChevronLeft, ChevronRight, Calendar, Clock, Tv, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScoreBadge, QualityBadge, StatusBadge } from './Badge';

interface HeroBannerProps {
  anime: any;
  animeList?: any[];
}

const HeroBanner: React.FC<HeroBannerProps> = ({ anime, animeList }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  // Use provided list or create a single-item array
  const animeArray = animeList && animeList.length > 0 ? animeList : (anime ? [anime] : []);

  const currentAnime = animeArray[currentIndex] || anime;

  useEffect(() => {
    if (animeArray.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % animeArray.length);
    }, 8000); // Change every 8 seconds

    return () => clearInterval(interval);
  }, [animeArray.length, isPaused]);

  // Preload images for smooth transitions
  useEffect(() => {
    animeArray.forEach((anime: any, index: number) => {
      const img = new Image();
      const imageUrl = anime.poster || anime.image || '';
      if (imageUrl) {
        img.onload = () => {
          setLoadedImages(prev => new Set(prev).add(index));
        };
        img.src = imageUrl;
      }
    });
  }, [animeArray]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + animeArray.length) % animeArray.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % animeArray.length);
  };

  if (!currentAnime) return (
    <div style={{ height: '80vh', backgroundColor: 'var(--net-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="text-red"
        style={{ fontSize: '2rem', fontWeight: 800 }}
      >
        ANIME PRO
      </motion.div>
    </div>
  );

  const backgroundImageUrl = currentAnime.poster || currentAnime.image || '';
  const title = currentAnime.title || 'Unknown Title';
  const titleEnglish = currentAnime.title_english || '';
  const score = currentAnime.rating || currentAnime.score || 0;
  const episodes = currentAnime.episodes || 0;
  const type = currentAnime.type || 'TV';
  const genres = currentAnime.genres || [];

  return (
    <header
      style={{
        color: 'white',
        height: 'clamp(60vh, 85vh, 90vh)',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '400px'
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: `url("${backgroundImageUrl}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 20%',
            zIndex: 0
          }}
        />
      </AnimatePresence>

      {/* Gradients */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(90deg, rgba(10, 10, 10, 0.9) 0%, rgba(10, 10, 10, 0.5) 40%, transparent 80%)',
        zIndex: 1
      }} />
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: '40%',
        background: 'var(--net-footer-gradient)',
        zIndex: 2
      }} />

      {/* Navigation arrows */}
      {animeArray.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            style={{
              position: 'absolute',
              left: 'clamp(1rem, 4vw, 4%)',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 20,
              backgroundColor: 'rgba(0,0,0,0.5)',
              border: 'none',
              borderRadius: '50%',
              width: 'clamp(36px, 5vw, 48px)',
              height: 'clamp(36px, 5vw, 48px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.8)'}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)'}
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={handleNext}
            style={{
              position: 'absolute',
              right: '4%',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 20,
              backgroundColor: 'rgba(0,0,0,0.5)',
              border: 'none',
              borderRadius: '50%',
              width: 'clamp(36px, 5vw, 48px)',
              height: 'clamp(36px, 5vw, 48px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.8)'}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)'}
          >
            <ChevronRight size={24} />
          </button>

          {/* Dots indicator */}
          <div style={{
            position: 'absolute',
            bottom: '20%',
            left: '4%',
            zIndex: 20,
            display: 'flex',
            gap: '8px'
          }}>
            {animeArray.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                style={{
                  width: idx === currentIndex ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: idx === currentIndex ? 'var(--net-red)' : 'rgba(255,255,255,0.4)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </>
      )}

      <div className="container" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 10, paddingTop: '5rem' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAnime.id || currentIndex}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {currentAnime.isDub && (
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-red"
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  marginBottom: '1rem'
                }}
              >
                HINDI DUBBED
              </motion.span>
            )}

            <h1 className="line-clamp-2" style={{
              fontSize: 'min(5rem, 10vw)',
              fontWeight: 800,
              lineHeight: 1.1,
              maxWidth: '650px',
              marginBottom: currentAnime.synopsis ? '0.5rem' : '1.5rem',
              textShadow: '0 4px 12px rgba(0,0,0,0.5)',
              letterSpacing: '-0.03em'
            }}>
              {title}
            </h1>

            {titleEnglish && titleEnglish !== title && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{
                  fontSize: '1.2rem',
                  color: 'rgba(255,255,255,0.7)',
                  marginBottom: '1rem',
                  fontStyle: 'italic'
                }}
              >
                {titleEnglish}
              </motion.p>
            )}

            {/* Meta info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}
            >
              {score > 0 && <ScoreBadge score={score} size="lg" />}
              <QualityBadge quality="HD" size="lg" />
              {currentAnime.status && <StatusBadge status={currentAnime.status as any} size="lg" />}
              {episodes > 0 && (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  padding: '0.35rem 0.7rem',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '4px'
                }}>
                  <Tv size={16} /> {episodes} Episodes
                </span>
              )}
              {currentAnime.duration && (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '0.85rem',
                  padding: '0.35rem 0.7rem',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: '4px'
                }}>
                  <Clock size={14} /> {currentAnime.duration}
                </span>
              )}
              {currentAnime.year && (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '0.85rem',
                  padding: '0.35rem 0.7rem',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: '4px'
                }}>
                  <Calendar size={14} /> {currentAnime.year}
                </span>
              )}
            </motion.div>

            {/* Genres */}
            {genres.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}
              >
                {genres.slice(0, 4).map((genre: any) => (
                  <span key={typeof genre === 'string' ? genre : genre.name} style={{
                    fontSize: '0.8rem',
                    padding: '0.3rem 0.7rem',
                    backgroundColor: 'rgba(229, 9, 20, 0.2)',
                    border: '1px solid rgba(229, 9, 20, 0.4)',
                    color: '#E50914',
                    borderRadius: '20px',
                    fontWeight: 600
                  }}>
                    {typeof genre === 'string' ? genre : genre.name}
                  </span>
                ))}
              </motion.div>
            )}

            {currentAnime.synopsis && currentAnime.synopsis !== 'No description available.' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="line-clamp-3"
                style={{
                  maxWidth: '600px',
                  fontSize: '1.05rem',
                  color: 'rgba(255,255,255,0.85)',
                  lineHeight: '1.5',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                  marginBottom: '1.5rem',
                  marginTop: '1rem'
                }}
              >
                {currentAnime.synopsis}
              </motion.p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              style={{ display: 'flex', gap: '1.25rem', marginTop: '2rem' }}
            >
              <Link to={`/watch/${currentAnime.id}/1`}>
                <button className="btn-primary">
                  <Play fill="black" size={24} /> Play Now
                </button>
              </Link>
              <Link to={`/anime/${currentAnime.id}`}>
                <button className="btn-secondary">
                  <Info size={24} /> More Info
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </header>
  );
};

export default HeroBanner;
