import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, ThumbsUp, ChevronDown, Eye, Star, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AnimeCardProps {
  anime: any;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime }) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const timeoutRef = useRef<any>(null);

  const imageUrl = anime.poster || anime.image || '';
  const title = anime.title || 'Unknown Title';
  const titleEnglish = anime.title_english || '';
  const id = anime.id;
  const score = anime.rating || anime.score || 0;
  const episodes = anime.episodes || 0;
  const synopsis = anime.synopsis || '';
  const genres = anime.genres || [];
  const studios = anime.studios || [];

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setIsHovered(true), 400);
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleDetailClick}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '2/3',
        cursor: 'pointer',
        flexShrink: 0,
        zIndex: isHovered ? 100 : 1,
      }}
    >
      {/* ── Base Card ─────────────────────── */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '14px',
        overflow: 'hidden',
        backgroundColor: '#111',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'rgba(255,255,255,0.10)',
        boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        ...(isHovered && {
          borderColor: 'rgba(229,9,20,0.5)',
          boxShadow: '0 0 0 1px rgba(229,9,20,0.3), 0 12px 40px rgba(0,0,0,0.8)',
        })
      }}>
        <motion.img
          src={imageUrl}
          alt={title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
          whileHover={{ scale: 1.06 }}
          transition={{ duration: 0.4 }}
          onError={(e) => {
            e.currentTarget.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'%3E%3Crect fill='%23111' width='300' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23444' font-size='14' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E`;
          }}
        />

        {/* Score pill – top left */}
        {score > 0 && (
          <div style={{
            position: 'absolute', top: '10px', left: '10px',
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(251,191,36,0.4)',
            borderRadius: '20px',
            padding: '3px 8px',
            fontSize: '0.72rem', fontWeight: 800, color: '#fbbf24',
          }}>
            <Star size={10} fill="#fbbf24" />
            {Number(score).toFixed(1)}
          </div>
        )}

        {/* HD badge – top right */}
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          background: 'rgba(229,9,20,0.85)',
          backdropFilter: 'blur(8px)',
          borderRadius: '6px',
          padding: '3px 7px',
          fontSize: '0.65rem', fontWeight: 900, color: 'white', letterSpacing: '0.5px'
        }}>
          HD
        </div>

        {/* Title overlay at bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '40px 12px 12px',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.95))',
        }}>
          <p className="line-clamp-2" style={{
            color: 'white', fontSize: '0.88rem', fontWeight: 700,
            margin: '0 0 5px', lineHeight: '1.3',
            textShadow: '0 2px 6px rgba(0,0,0,0.7)'
          }}>
            {title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {episodes > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem', fontWeight: 600 }}>
                <Eye size={10} /> {episodes} Eps
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Hover Popup ───────────────────── */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 6 }}
            animate={{ opacity: 1, scale: 1.22, y: -24 }}
            exit={{ opacity: 0, scale: 0.88, y: 6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute',
              top: 0, left: '-10%',
              width: '120%',
              background: 'rgba(18,18,18,0.97)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(229,9,20,0.2)',
              zIndex: 110,
              overflow: 'hidden',
            }}
          >
            {/* Poster */}
            <div style={{ position: 'relative', height: '145px', backgroundColor: '#0d0d0d' }}>
              <img
                src={imageUrl}
                alt={title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(18,18,18,0.98) 0%, transparent 55%)'
              }} />
            </div>

            {/* Content */}
            <div style={{ padding: '10px 12px 14px' }}>
              {/* Action row */}
              <div style={{ display: 'flex', gap: '7px', marginBottom: '11px', alignItems: 'center' }}>
                <motion.button
                  whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.92 }}
                  onClick={handlePlayClick}
                  style={{
                    borderRadius: '50%', width: '34px', height: '34px',
                    backgroundColor: '#E50914', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(229,9,20,0.4)',
                  }}
                >
                  <Play fill="white" color="white" size={15} style={{ marginLeft: '2px' }} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.12, backgroundColor: 'rgba(255,255,255,0.18)' }}
                  style={{ borderRadius: '50%', width: '34px', height: '34px', backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
                >
                  <Plus size={15} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.12, backgroundColor: 'rgba(255,255,255,0.18)' }}
                  style={{ borderRadius: '50%', width: '34px', height: '34px', backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
                >
                  <ThumbsUp size={15} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.12, backgroundColor: 'rgba(255,255,255,0.18)' }}
                  onClick={handleDetailClick}
                  style={{ marginLeft: 'auto', borderRadius: '50%', width: '34px', height: '34px', backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
                >
                  <ChevronDown size={17} />
                </motion.button>
              </div>

              {/* Meta row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px', flexWrap: 'wrap' }}>
                {score > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 800 }}>
                    <Star size={11} fill="#fbbf24" /> {Number(score).toFixed(1)}
                  </span>
                )}
                {episodes > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', fontWeight: 600 }}>
                    <Eye size={10} /> {episodes} EPS
                  </span>
                )}
                <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, background: 'rgba(229,9,20,0.15)', border: '1px solid rgba(229,9,20,0.35)', color: '#E50914' }}>HD</span>
                {anime.isDub && <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, background: 'rgba(156,39,176,0.15)', border: '1px solid rgba(156,39,176,0.4)', color: '#CE93D8' }}>DUB</span>}
              </div>

              {/* Title */}
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white', margin: '0 0 4px', lineHeight: 1.3 }} className="line-clamp-1">
                {title}
              </h4>
              {titleEnglish && titleEnglish !== title && (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', margin: '0 0 7px' }} className="line-clamp-1">{titleEnglish}</p>
              )}

              {/* Genre chips */}
              {genres.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                  {genres.slice(0, 3).map((genre: any) => {
                    const name = typeof genre === 'string' ? genre : genre.name;
                    return (
                      <span key={name} style={{
                        fontSize: '0.62rem', padding: '2px 7px', borderRadius: '20px',
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: 'rgba(255,255,255,0.7)', fontWeight: 600
                      }}>{name}</span>
                    );
                  })}
                </div>
              )}

              {/* Synopsis snippet */}
              {synopsis && (
                <p className="line-clamp-2" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', margin: 0, lineHeight: 1.5 }}>
                  {synopsis}
                </p>
              )}

              {/* Studio */}
              {studios.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', marginTop: '7px' }}>
                  <Clock size={10} />
                  {studios.slice(0, 2).map((s: any) => typeof s === 'string' ? s : s.name).join(', ')}
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
