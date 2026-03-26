import { useEffect, useState } from 'react';
import { animeAPI, normalize } from '../api/client';
import AnimeCard from '../components/AnimeCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { PageSkeleton } from '../components/Skeleton';

const TABS = [
  { id: 'recently-updated', label: 'All Episodes', icon: '🌐' },
  { id: 'subbed-anime', label: 'Subbed', icon: '🇯🇵' },
  { id: 'dubbed-anime', label: 'Dubbed', icon: '🎙' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 260, damping: 22 } }
};

const LatestEpisodes = () => {
  const [animes, setAnimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('recently-updated');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    const fetchEpisodes = async () => {
      setLoading(true);
      try {
        let res;
        if (tab === 'dubbed-anime') {
          res = await animeAPI.getTopAnime('movie', page, 20);
        } else {
          res = await animeAPI.getTopAnime('tv', page, 20);
        }
        setAnimes((res.data?.data || []).map(normalize));
        setHasNextPage(res.data?.pagination?.has_next_page || false);
      } catch (err) {
        console.error('Failed to fetch latest episodes', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEpisodes();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tab, page]);

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
        background: 'linear-gradient(180deg, rgba(229,9,20,0.12) 0%, transparent 100%)',
      }}>
        {/* Animated grid decoration */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(229,9,20,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(229,9,20,0.04) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '1600px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '0.5rem' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #e50914, #ff4444)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(229,9,20,0.4)'
            }}>
              <Clock size={22} color="white" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(229,9,20,0.8)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>ANIME PRO</p>
              <h1 style={{ fontSize: '2.4rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                Latest Episodes
              </h1>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.2)', borderRadius: '50px' }}>
              <Zap size={13} color="#e50914" fill="#e50914" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#e50914' }}>LIVE</span>
            </div>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem', margin: '0.5rem 0 2rem', paddingLeft: '62px' }}>
            Freshest episodes updated daily
          </p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {TABS.map(t => (
              <motion.button
                key={t.id}
                onClick={() => { setTab(t.id); setPage(1); }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                style={{
                  padding: '10px 22px',
                  borderRadius: '50px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid ' + (tab === t.id ? 'rgba(229,9,20,0.6)' : 'rgba(255,255,255,0.1)'),
                  background: tab === t.id
                    ? 'linear-gradient(135deg, #e50914, #ff4444)'
                    : 'rgba(255,255,255,0.04)',
                  color: 'white',
                  boxShadow: tab === t.id ? '0 4px 20px rgba(229,9,20,0.35)' : 'none',
                  transition: 'border 0.2s, background 0.2s'
                }}
              >
                {t.icon} {t.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 4% 5rem', maxWidth: '1600px', margin: '0 auto' }}>
        {/* Divider */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(229,9,20,0.4), rgba(255,255,255,0.05), transparent)', marginBottom: '2.5rem' }} />

        {loading ? (
          <PageSkeleton />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab + page}
              variants={containerVariants}
              initial="hidden"
              animate="show"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(100px, 22vw, 160px), 1fr))',
                gap: 'clamp(0.75rem, 2vw, 2rem) clamp(0.5rem, 1.5vw, 1.5rem)'
              }}
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
            <Clock size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontSize: '1.1rem' }}>No episodes found.</p>
          </div>
        )}

        {/* Pagination */}
        {!loading && animes.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '4rem' }}>
            <motion.button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              whileHover={page > 1 ? { scale: 1.05 } : {}}
              whileTap={page > 1 ? { scale: 0.95 } : {}}
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

            <div style={{
              padding: '10px 24px', borderRadius: '50px',
              background: 'rgba(229,9,20,0.12)', border: '1px solid rgba(229,9,20,0.25)',
              fontWeight: 800, fontSize: '0.95rem', color: '#e50914'
            }}>
              Page {page}
            </div>

            <motion.button
              disabled={!hasNextPage}
              onClick={() => setPage(p => p + 1)}
              whileHover={hasNextPage ? { scale: 1.05 } : {}}
              whileTap={hasNextPage ? { scale: 0.95 } : {}}
              style={{
                padding: '12px 24px', borderRadius: '50px', fontWeight: 700, fontSize: '0.9rem',
                background: hasNextPage ? 'linear-gradient(135deg, #e50914, #ff4444)' : 'rgba(255,255,255,0.03)',
                border: '1px solid ' + (hasNextPage ? 'rgba(229,9,20,0.5)' : 'rgba(255,255,255,0.1)'),
                color: hasNextPage ? 'white' : 'rgba(255,255,255,0.2)',
                cursor: hasNextPage ? 'pointer' : 'default',
                boxShadow: hasNextPage ? '0 4px 16px rgba(229,9,20,0.3)' : 'none',
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

export default LatestEpisodes;
