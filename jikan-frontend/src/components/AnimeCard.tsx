import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, ThumbsUp, ChevronDown, Eye, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ScoreBadge, QualityBadge } from './Badge';

interface AnimeCardProps {
  anime: any;
  isLargeRow?: boolean;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime, isLargeRow }) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const timeoutRef = useRef<any>(null);

  const imageUrl = anime.poster || anime.image || '';
  const title = anime.title || 'Unknown Title';
  const titleEnglish = anime.title_english || '';
  const id = anime.id;
  const score = anime.rating || anime.score || 0;
  const episodes = anime.episodes || 0;
  const synopsis = anime.synopsis || 'No description available.';
  const genres = anime.genres || [];
  const studios = anime.studios || [];

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 400);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsHovered(false);
  };

  const handleDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/anime/${id}`);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/watch/${id}/1`);
  };

  return (
    <div
      className="anime-card-container"
      style={{
        position: 'relative',
        width: isLargeRow ? '160px' : '240px',
        height: isLargeRow ? '240px' : '135px',
        cursor: 'pointer',
        flexShrink: 0,
        zIndex: isHovered ? 100 : 1,
        minWidth: isLargeRow ? '160px' : '240px',
        minHeight: isLargeRow ? '240px' : '135px'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleDetailClick}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#1a1a1a' }}>
        <motion.img
          src={imageUrl}
          alt={title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
            display: 'block'
          }}
          whileHover={{ scale: 1.05 }}
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100%25" height="100%25" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%231a1a1a"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E';
          }}
        />
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '24px 8px 8px 8px',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
          pointerEvents: 'none'
        }}>
          <p className="line-clamp-1" style={{ color: 'white', fontSize: isLargeRow ? '0.9rem' : '0.85rem', fontWeight: 600, margin: 0, textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
            {title}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 0 }}
            animate={{ opacity: 1, scale: 1.25, y: -20 }}
            exit={{ opacity: 0, scale: 0.9, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              backgroundColor: 'var(--net-card-bg)',
              borderRadius: '8px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.8)',
              zIndex: 110,
              overflow: 'hidden',
              minWidth: '240px'
            }}
          >
            <div style={{ position: 'relative', height: '140px', backgroundColor: '#1a1a1a' }}>
              <img
                src={imageUrl}
                alt={title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100%25" height="100%25" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%231a1a1a"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E';
                }}
              />
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(to top, var(--net-card-bg) 0%, transparent 50%)'
              }} />
            </div>

            <div style={{ padding: '0.8rem' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePlayClick}
                  style={{
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    padding: 0,
                    justifyContent: 'center',
                    backgroundColor: '#E50914',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Play fill="white" size={16} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Plus size={16} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <ThumbsUp size={16} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleDetailClick}
                  style={{
                    marginLeft: 'auto',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <ChevronDown size={18} />
                </motion.button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                {score > 0 && <ScoreBadge score={score} size="sm" />}
                {episodes > 0 && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.5rem',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '3px'
                  }}>
                    <Eye size={10} /> {episodes} EPS
                  </span>
                )}
                <QualityBadge quality="HD" size="sm" />
                {anime.isDub && (
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '3px',
                    fontWeight: 700,
                    backgroundColor: 'rgba(156, 39, 176, 0.2)',
                    border: '1px solid rgba(156, 39, 176, 0.4)',
                    color: '#9C27B0'
                  }}>
                    DUB
                  </span>
                )}
              </div>

              <h4 className="line-clamp-1" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', margin: '4px 0' }}>
                {title}
              </h4>

              {titleEnglish && titleEnglish !== title && (
                <p className="line-clamp-1" style={{ color: 'var(--net-text-muted)', fontSize: '0.75rem', margin: '0 0 4px 0' }}>
                  {titleEnglish}
                </p>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                {genres.slice(0, 3).map((genre: any) => (
                  <span key={typeof genre === 'string' ? genre : genre.name} style={{
                    fontSize: '0.65rem',
                    padding: '0.15rem 0.4rem',
                    backgroundColor: 'rgba(229, 9, 20, 0.15)',
                    border: '1px solid rgba(229, 9, 20, 0.3)',
                    color: '#E50914',
                    borderRadius: '3px',
                    fontWeight: 500
                  }}>
                    {typeof genre === 'string' ? genre : genre.name}
                  </span>
                ))}
              </div>

              {synopsis && synopsis !== 'No description available.' && (
                <p className="line-clamp-2" style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.7rem',
                  marginTop: '8px',
                  lineHeight: '1.4',
                  maxHeight: '2.8em',
                  overflow: 'hidden'
                }}>
                  {synopsis}
                </p>
              )}

              {studios.length > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--net-text-muted)',
                  fontSize: '0.65rem',
                  marginTop: '8px'
                }}>
                  <Clock size={10} />
                  Studio: {studios.slice(0, 2).map((s: any) => typeof s === 'string' ? s : s.name).join(', ')}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimeCard;
