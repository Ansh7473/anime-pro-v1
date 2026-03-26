import { useEffect, useState } from 'react';
import HeroBanner from '../components/HeroBanner';
import Row from '../components/Row';
import { animeAPI, normalize, hianimeAPI, normalizeHianime } from '../api/client';
import { motion } from 'framer-motion';
import TopLists from '../components/TopLists';
import { HeroBannerSkeleton, RowSkeleton } from '../components/Skeleton';
import ContinueWatching from '../components/ContinueWatching';

const Home = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [topLists, setTopLists] = useState<any>(null);
  const [spotlight, setSpotlight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [continueWatching, setContinueWatching] = useState<any[]>([]);

  // Load continue watching from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('continueWatching');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setContinueWatching(parsed);
      } catch (e) {
        console.error('Failed to parse continue watching data', e);
      }
    }
  }, []);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        console.log('Fetching home data...');

        // Fetch Jikan and HiAnime data simultaneously
        const [homeRes, seasonalRes, upcomingRes, spotlightRes, topAiringRes] = await Promise.allSettled([
          animeAPI.getHome(),
          animeAPI.getCurrentSeasonalAnime(),
          animeAPI.getUpcomingSeasonalAnime(),
          hianimeAPI.getSpotlight(),
          hianimeAPI.getTopAiring(1),
        ]);

        const data: any = homeRes.status === 'fulfilled' ? (homeRes.value.data?.data || {}) : {};
        const featured: any[] = data.featured || [];

        // Process HiAnime spotlight
        let hianimeSpotlight: any[] = [];
        if (spotlightRes.status === 'fulfilled') {
          hianimeSpotlight = (spotlightRes.value.data?.spotlightAnimes || []).map(normalizeHianime);
        }

        // Process HiAnime top airing
        let hianimeTopAiring: any[] = [];
        if (topAiringRes.status === 'fulfilled') {
          hianimeTopAiring = (topAiringRes.value.data?.results || []).map(normalizeHianime);
        }

        const normalizeItem = (item: any) => normalize(item);

        const trendingGlobal = (data.trendingGlobal || []).map(normalizeItem);
        const topAnime = (data.topAnime || []).map(normalizeItem);
        const recommendations = (data.recommendations || []).map(normalizeItem);
        const latest = (data.latest || []).map(normalizeItem);
        const tvShows = (data.tvShows || []).map(normalizeItem);
        const movies = (data.movies || []).map(normalizeItem);
        const todaySchedule = (data.todaySchedule || []).map(normalizeItem);

        // Process seasonal and upcoming anime
        const seasonalData = seasonalRes.status === 'fulfilled'
          ? (seasonalRes.value.data?.data || [])
          : [];
        const upcomingData = upcomingRes.status === 'fulfilled'
          ? (upcomingRes.value.data?.data || [])
          : [];

        setTopLists({
          airing: (data.topAiring || []).map(normalizeItem),
          popular: (data.mostPopular || []).map(normalizeItem),
          completed: (data.topCompleted || []).map(normalizeItem)
        });

        const built: any[] = [];

        // Prioritize HiAnime spotlight at the top
        if (hianimeSpotlight.length > 0) built.push({ title: '🔥 Spotlight Anime', items: hianimeSpotlight });
        if (hianimeTopAiring.length > 0) built.push({ title: '📡 Top Airing Now', items: hianimeTopAiring });

        if (trendingGlobal.length > 0) built.push({ title: 'Trending Worldwide', items: trendingGlobal });
        if (latest.length > 0) built.push({ title: 'Latest Episodes', items: latest });
        if (tvShows.length > 0) built.push({ title: 'TV Shows', items: tvShows });
        if (movies.length > 0) built.push({ title: 'Movies', items: movies });
        if (todaySchedule.length > 0) built.push({ title: "Today's Release Schedule", items: todaySchedule });

        if (seasonalData.length > 0) built.push({ title: 'Current Season Anime', items: seasonalData.map(normalizeItem) });
        if (upcomingData.length > 0) built.push({ title: 'Upcoming Anime', items: upcomingData.map(normalizeItem) });

        if (featured.length > 0) built.push({ title: 'Trending Hindi Dubbed', items: featured.map(normalizeItem).slice(0, 5) });
        if (topAnime.length > 0) built.push({ title: 'Top Rated Global', items: topAnime });
        if (recommendations.length > 0) built.push({ title: 'Recommended for You', items: recommendations });

        setSections(built);

        // Use HiAnime spotlight for hero banner if available
        const heroAnime = hianimeSpotlight[0] || (featured[0] ? normalize(featured[0]) : null) || (latest[0] ? normalize(latest[0]) : null);
        setSpotlight(heroAnime);

      } catch (err: any) {
        console.error('Failed to fetch home data', err);
        setError(`Could not load home page: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        style={{ backgroundColor: 'var(--net-bg)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', padding: '2rem', textAlign: 'center' }}
      >
        <p style={{ color: 'var(--net-red)', fontSize: '1.2rem', fontWeight: 700 }}>⚠ API Error</p>
        <p style={{ color: 'var(--net-text-muted)', maxWidth: '500px' }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary" style={{ marginTop: '1rem' }}>Retry</button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{ backgroundColor: 'var(--net-bg)', minHeight: '100vh', paddingBottom: '4rem' }}
    >
      {loading ? (
        <div>
          <HeroBannerSkeleton />
          <div style={{ marginTop: '-120px', position: 'relative', zIndex: 10, padding: '0 4%' }}>
            <RowSkeleton itemCount={6} />
            <RowSkeleton itemCount={6} />
            <RowSkeleton itemCount={6} />
          </div>
        </div>
      ) : (
        <>
          <HeroBanner anime={spotlight} animeList={sections[0]?.items?.slice(0, 5)} />

          <div style={{ marginTop: '-120px', position: 'relative', zIndex: 10 }}>
            {/* Continue Watching Section */}
            {continueWatching.length > 0 && (
              <ContinueWatching
                items={continueWatching}
                onRemove={(animeId) => {
                  const updated = continueWatching.filter((item: any) => item.animeId !== animeId);
                  setContinueWatching(updated);
                  localStorage.setItem('continueWatching', JSON.stringify(updated));
                }}
              />
            )}
            {sections.length > 0 ? (
              <>
                {/* Render all regular rows */}
                {sections.map((section, idx) => (
                  <motion.div
                    key={section.title + idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                  >
                    <Row
                      title={section.title}
                      items={section.items}
                      isLargeRow={idx === 0}
                    />
                  </motion.div>
                ))}

                {/* Render Top Lists (Column style) at the bottom */}
                {topLists && (topLists.airing.length > 0 || topLists.popular.length > 0 || topLists.completed.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: sections.length * 0.1 }}
                  >
                    <TopLists
                      airing={topLists.airing}
                      popular={topLists.popular}
                      completed={topLists.completed}
                    />
                  </motion.div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--net-text-muted)' }}>
                No content available. Check that TatakaiAPI is running.
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default Home;
