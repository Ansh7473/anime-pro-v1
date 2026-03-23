import { useEffect, useState } from 'react';
import { animeAPI, normalize } from '../api/client';
import AnimeCard from '../components/AnimeCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const TABS = [
  { id: 'recently-updated', label: 'All' },
  { id: 'subbed-anime',     label: 'Subbed' },
  { id: 'dubbed-anime',     label: 'Dubbed' },
];

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
        const res = await animeAPI.getCategory(tab, page);
        const data = res.data?.data;
        setAnimes((data?.results || data?.animes || []).map(normalize));
        setHasNextPage(data?.hasNextPage || false);
      } catch (err) {
        console.error('Failed to fetch latest episodes', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEpisodes();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tab, page]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } }
  };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div style={{ backgroundColor: 'var(--net-bg)', minHeight: '100vh', padding: '100px 4% 4rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <Clock className="text-red" size={28} />
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Latest Episodes</h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setPage(1); }}
              style={{
                padding: '0.5rem 1.2rem',
                borderRadius: '20px',
                fontSize: '0.9rem',
                color: tab === t.id ? 'white' : 'var(--net-text-muted)',
                backgroundColor: tab === t.id ? 'var(--net-red)' : 'rgba(255,255,255,0.05)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontWeight: 600
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            style={{ width: '40px', height: '40px', border: '3px solid var(--net-red)', borderTopColor: 'transparent', borderRadius: '50%' }} />
        </div>
      ) : (
        <>
          <motion.div variants={containerVariants} initial="hidden" animate="show"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem 1rem' }}>
            <AnimatePresence mode="popLayout">
              {animes.map((anime) => (
                <motion.div key={anime.id} variants={itemVariants}>
                  <AnimeCard anime={anime} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {animes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--net-text-muted)' }}>No episodes found.</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', marginTop: '4rem' }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="glass"
              style={{ padding: '0.75rem', borderRadius: '50%', opacity: page === 1 ? 0.3 : 1, cursor: page === 1 ? 'default' : 'pointer' }}>
              <ChevronLeft size={24} />
            </button>
            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Page {page}</span>
            <button disabled={!hasNextPage} onClick={() => setPage(p => p + 1)} className="glass"
              style={{ padding: '0.75rem', borderRadius: '50%', opacity: !hasNextPage ? 0.3 : 1, cursor: !hasNextPage ? 'default' : 'pointer' }}>
              <ChevronRight size={24} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LatestEpisodes;
