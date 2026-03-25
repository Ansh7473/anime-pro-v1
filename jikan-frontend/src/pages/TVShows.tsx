import { useEffect, useState } from 'react';
import { animeAPI, normalize } from '../api/client';
import AnimeCard from '../components/AnimeCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageSkeleton } from '../components/Skeleton';

const TVShows = () => {
  const [animes, setAnimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    const fetchTVShows = async () => {
      setLoading(true);
      try {
        // Use Jikan API getTopAnime for TV shows
        const res = await animeAPI.getTopAnime('tv', page, 20);
        const data = res.data?.data;
        // Jikan returns data.data array
        setAnimes((data || []).map(normalize));
        // Jikan pagination info
        const pagination = res.data?.pagination;
        setHasNextPage(pagination?.has_next_page || false);
      } catch (err) {
        console.error('Failed to fetch TV shows', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTVShows();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } }
  };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      style={{ backgroundColor: 'var(--net-bg)', minHeight: '100vh', padding: '100px 4% 4rem' }}
    >
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <Tv className="text-red" size={28} />
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>TV Series</h1>
        </div>
      </header>

      {loading ? (
        <PageSkeleton />
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
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--net-text-muted)' }}>No TV shows found.</div>
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
    </motion.div>
  );
};

export default TVShows;
