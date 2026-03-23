import { Link } from 'react-router-dom';
import { Play, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeroBannerProps {
  anime: any;
}

const HeroBanner: React.FC<HeroBannerProps> = ({ anime }) => {
  if (!anime) return (
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

  const backgroundImageUrl = anime.poster || anime.image || '';
  const title = anime.title || 'Unknown Title';
  
  return (
    <header style={{
      color: 'white',
      height: '85vh',
      width: '100%',
      backgroundImage: `url("${backgroundImageUrl}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center 20%',
      position: 'relative',
      overflow: 'hidden'
    }}>
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
      
      <div className="container" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 10, paddingTop: '5rem' }}>
        <AnimatePresence mode="wait">
          <motion.div 
            key={anime.id}
            initial={{ opacity: 0, x: -30 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {anime.isDub && (
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
              marginBottom: '1.5rem',
              textShadow: '0 4px 12px rgba(0,0,0,0.5)',
              letterSpacing: '-0.03em'
            }}>
              {title}
            </h1>
            
            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '2rem' }}>
              <Link to={`/watch/${anime.id}/1`}>
                <button className="btn-primary">
                  <Play fill="black" size={24} /> Play Now
                </button>
              </Link>
              <Link to={`/anime/${anime.id}`}>
                <button className="btn-secondary">
                  <Info size={24} /> More Info
                </button>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </header>
  );
};

export default HeroBanner;
