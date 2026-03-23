import { useEffect, useState } from 'react';
import HeroBanner from '../components/HeroBanner';
import Row from '../components/Row';
import { animeAPI, normalize } from '../api/client';
import { motion } from 'framer-motion';
import TopLists from '../components/TopLists';

const Home = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [topLists, setTopLists] = useState<any>(null);
  const [spotlight, setSpotlight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const res = await animeAPI.getHome();
        const data = res.data?.data || {};
        const featured = data.featured || [];

        if (featured.length === 0) {
          const searchRes = await animeAPI.search('Popular');
          const results = searchRes.data?.data?.results || [];
          if (results.length > 0) {
            const normalized = results.map(normalize);
            setSections([{ title: 'Popular Hindi Dubbed', items: normalized }]);
            setSpotlight(normalized[0]);
          } else {
            setError('No common anime found. Check TatakaiAPI connection.');
          }
        } else {
          const normalizeItem = (item: any) => normalize(item);
          const trendingGlobal = (data.trendingGlobal || []).map(normalizeItem);
          const topAnime = (data.topAnime || []).map(normalizeItem);
          const recommendations = (data.recommendations || []).map(normalizeItem);
          const latest = (data.latest || []).map(normalizeItem);
          const tvShows = (data.tvShows || []).map(normalizeItem);
          const movies = (data.movies || []).map(normalizeItem);
          const todaySchedule = (data.todaySchedule || []).map(normalizeItem);
          
          setTopLists({
            airing: (data.topAiring || []).map(normalizeItem),
            popular: (data.mostPopular || []).map(normalizeItem),
            completed: (data.topCompleted || []).map(normalizeItem)
          });

          const built: any[] = [];
          
          // 1-5 Row order
          if (trendingGlobal.length > 0) built.push({ title: 'Trending Worldwide (Jikan)', items: trendingGlobal });
          if (latest.length > 0) built.push({ title: 'Latest Episodes', items: latest });
          if (tvShows.length > 0) built.push({ title: 'TV Shows', items: tvShows });
          if (movies.length > 0) built.push({ title: 'Movies', items: movies });
          if (todaySchedule.length > 0) built.push({ title: "Today's Release Schedule", items: todaySchedule });

          // 6-8 Row order
          if (featured.length > 0) built.push({ title: 'Trending Hindi Dubbed', items: featured.map(normalizeItem).slice(0, 5) });
          if (topAnime.length > 0) built.push({ title: 'Top Rated Global (Jikan)', items: topAnime });
          if (recommendations.length > 0) built.push({ title: 'Recommended for You (Jikan)', items: recommendations });

          setSections(built);
          setSpotlight(featured[0] ? normalize(featured[0]) : (latest[0] ? normalize(latest[0]) : null));
        }
      } catch (err: any) {
        console.error('Failed to fetch home data', err);
        setError('Could not load home page. Make sure TatakaiAPI is running.');
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--net-bg)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ width: '40px', height: '40px', border: '3px solid var(--net-red)', borderTopColor: 'transparent', borderRadius: '50%' }} />
        <p style={{ color: 'var(--net-text-muted)', fontSize: '0.9rem' }}>Loading Hindi Dubbed Anime...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: 'var(--net-bg)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--net-red)', fontSize: '1.2rem', fontWeight: 700 }}>⚠ API Error</p>
        <p style={{ color: 'var(--net-text-muted)', maxWidth: '500px' }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary" style={{ marginTop: '1rem' }}>Retry</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} style={{ backgroundColor: 'var(--net-bg)', minHeight: '100vh', paddingBottom: '4rem' }}>
      <HeroBanner anime={spotlight} />

      <div style={{ marginTop: '-120px', position: 'relative', zIndex: 10 }}>
        {sections.length > 0 ? (
          <>
            {/* Render all regular rows */}
            {sections.map((section, idx) => (
              <Row 
                key={section.title + idx} 
                title={section.title} 
                items={section.items} 
                isLargeRow={idx === 0} 
              />
            ))}
            
            {/* Render Top Lists (Column style) at the bottom (below Recommended) */}
            {topLists && (topLists.airing.length > 0 || topLists.popular.length > 0 || topLists.completed.length > 0) && (
              <TopLists 
                airing={topLists.airing} 
                popular={topLists.popular} 
                completed={topLists.completed} 
              />
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--net-text-muted)' }}>
            No content available. Check that TatakaiAPI is running.
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Home;
