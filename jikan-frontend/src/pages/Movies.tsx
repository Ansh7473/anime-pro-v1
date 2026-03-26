import { useEffect, useState } from 'react';
import { animeAPI, normalize } from '../api/client';
import AnimeCard from '../components/AnimeCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { PageSkeleton } from '../components/Skeleton';

const FILTERS = [
  { id: 'movie', label: 'Movies', icon: '🎬' },
  { id: 'tv', label: 'Series', icon: '📺' },
  { id: 'music', label: 'Music', icon: '🎵' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.055 } }
};
const itemVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 250, damping: 22 } }
};

const Movies = () => {
  const [animes, setAnimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('movie');
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const res = await animeAPI.getTopAnime(filter, page, 20);
        setAnimes((res.data?.data || []).map(normalize));
        setHasNextPage(res.data?.pagination?.has_next_page || false);
      } catch (err) {
        console.error('Failed to fetch movies', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page, filter]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{ backgroundColor: '#050505', minHeight: '100vh', color: 'white' }}
    >
      {/* Hero Header */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        padding: 'clamp(80px, 15vw, 120px) 4% 2rem',
        background: 'linear-gradient(180deg, rgba(251,191,36,0.08) 0%, transparent 100%)',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 70% 40%, rgba(251,191,36,0.06) 0%, transparent 55%)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '1600px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '0.5rem' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(251,191,36,0.4)'
            }}>
              <Film size={22} color="white" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(251,191,36,0.8)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>ANIME PRO</p>
              <h1 style={{ fontSize: '2.4rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                Anime Movies
              </h1>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '50px' }}>
              <Star size={13} color="#fbbf24" fill="#fbbf24" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24' }}>AWARD WINNING</span>
            </div>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem', margin: '0.5rem 0 2rem', paddingLeft: '62px' }}>
            Cinematic masterpieces from Japan and beyond
          </p>

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <motion.button
                key={f.id}
                onClick={() => { setFilter(f.id); setPage(1); }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                style={{
                  padding: '10px 22px',
                  borderRadius: '50px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid ' + (filter === f.id ? 'rgba(251,191,36,0.6)' : 'rgba(255,255,255,0.1)'),
                  background: filter === f.id
                    ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                    : 'rgba(255,255,255,0.04)',
                  color: filter === f.id ? '#000' : 'white',
                  boxShadow: filter === f.id ? '0 4px 20px rgba(251,191,36,0.35)' : 'none',
                  transition: 'border 0.2s, background 0.2s'
                }}
              >
                {f.icon} {f.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 4% 5rem', maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(251,191,36,0.4), rgba(255,255,255,0.05), transparent)', marginBottom: '2.5rem' }} />

        {loading ? (
          <PageSkeleton />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={filter + page}
              variants={containerVariants}
              initial="hidden"
              animate="show"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(100px, 22vw, 160px), 1fr))', gap: 'clamp(0.75rem, 2vw, 2rem) clamp(0.5rem, 1.5vw, 1.5rem))' }}
            >
              {animes.map(anime => (
                <motion.div key={anime.id} variants={itemVariants} whileHover={{ y: -6 }}>
                  <AnimeCard anime={anime} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {!loading && animes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'rgba(255,255,255,0.3)' }}>
            <Film size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p>No movies found.</p>
          </div>
        )}

        {!loading && animes.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '4rem' }}>
            <motion.button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              whileHover={page > 1 ? { scale: 1.05 } : {}}
              style={{
                padding: '12px 24px', borderRadius: '50px', fontWeight: 700, fontSize: '0.9rem',
                background: page === 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: page === 1 ? 'rgba(255,255,255,0.2)' : 'white',
                cursor: page === 1 ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <ChevronLeft size={18} /> Prev
            </motion.button>

            <div style={{ padding: '10px 24px', borderRadius: '50px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', fontWeight: 800, color: '#fbbf24' }}>
              Page {page}
            </div>

            <motion.button
              disabled={!hasNextPage}
              onClick={() => setPage(p => p + 1)}
              whileHover={hasNextPage ? { scale: 1.05 } : {}}
              style={{
                padding: '12px 24px', borderRadius: '50px', fontWeight: 700, fontSize: '0.9rem',
                background: hasNextPage ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : 'rgba(255,255,255,0.03)',
                border: '1px solid ' + (hasNextPage ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.1)'),
                color: hasNextPage ? '#000' : 'rgba(255,255,255,0.2)',
                cursor: hasNextPage ? 'pointer' : 'default',
                boxShadow: hasNextPage ? '0 4px 16px rgba(251,191,36,0.3)' : 'none',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              Next <ChevronRight size={18} />
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Movies;
