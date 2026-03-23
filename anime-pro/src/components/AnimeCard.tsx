import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, ThumbsUp, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const id = anime.id;

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
        zIndex: isHovered ? 100 : 1
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleDetailClick}
    >
      <motion.img 
        src={imageUrl} 
        alt={title}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '4px'
        }}
        whileHover={{ scale: 1.05 }}
      />
      
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
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'relative', height: '140px' }}>
              <img 
                src={imageUrl} 
                alt={title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(to top, var(--net-card-bg) 0%, transparent 50%)'
              }} />
            </div>

            <div style={{ padding: '0.8rem' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button 
                  onClick={handlePlayClick}
                  className="btn-primary"
                  style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, justifyContent: 'center' }}
                >
                  <Play fill="black" size={16} />
                </button>
                <button style={{ border: '2px solid rgba(255,255,255,0.4)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Plus size={16} />
                </button>
                <button style={{ border: '2px solid rgba(255,255,255,0.4)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <ThumbsUp size={16} />
                </button>
                <button 
                  onClick={handleDetailClick}
                  style={{ marginLeft: 'auto', border: '2px solid rgba(255,255,255,0.4)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
                >
                  <ChevronDown size={18} />
                </button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: '#46d369', fontWeight: 700, fontSize: '0.85rem' }}>98% Match</span>
                <span style={{ border: '1px solid rgba(255,255,255,0.4)', padding: '0 5px', fontSize: '0.65rem', color: 'white', borderRadius: '2px' }}>HD</span>
                {anime.isDub && <span className="bg-red" style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '2px', fontWeight: 700 }}>DUB</span>}
              </div>
              
              <h4 className="line-clamp-1" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', margin: '4px 0' }}>
                {title}
              </h4>
              
              <div style={{ color: 'var(--net-text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                Action • Sci-Fi • Thriller
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimeCard;
