import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AnimeCard from '../components/AnimeCard';
import { animeAPI, normalize } from '../api/client';
import { motion } from 'framer-motion';

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (!query) return;
      setLoading(true);
      try {
        const res = await animeAPI.search(query);
        const data = res.data?.data;
        setResults((data?.results || []).map(normalize));
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    };
    performSearch();
    window.scrollTo(0, 0);
  }, [query]);

  return (
    <div style={{ backgroundColor: 'var(--net-bg)', minHeight: '100vh', padding: '120px 4% 40px' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>
          Search Results for <span className="text-red">"{query}"</span>
        </h2>
        {results.length > 0 && !loading && (
          <p style={{ color: 'var(--net-text-muted)', marginTop: '0.5rem' }}>Found {results.length} results</p>
        )}
      </header>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            style={{ width: '40px', height: '40px', border: '3px solid var(--net-red)', borderTopColor: 'transparent', borderRadius: '50%' }}
          />
        </div>
      ) : results.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '40px 15px' }}>
          {results.map((item, idx) => (
            <motion.div
              key={item.id + idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <AnimeCard anime={item} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '5rem', color: 'var(--net-text-muted)' }}>
          <p style={{ fontSize: '1.4rem', fontWeight: 600 }}>No results found for "{query}"</p>
          <p style={{ marginTop: '1rem' }}>Try a different spelling or a more general term.</p>
        </div>
      )}
    </div>
  );
};

export default Search;
