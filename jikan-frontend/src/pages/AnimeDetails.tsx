import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Plus, ThumbsUp, Heart } from 'lucide-react';
import { animeAPI } from '../api/client';
import { motion } from 'framer-motion';
import Row from '../components/Row';
import { PageSkeleton } from '../components/Skeleton';

const AnimeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [anime, setAnime] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [recommendedAnimes, setRecommendedAnimes] = useState<any[]>([]);
  const [relatedAnimes, setRelatedAnimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  // Check if anime is in favorites
  useEffect(() => {
    if (id) {
      try {
        const saved = localStorage.getItem('favorites');
        if (saved) {
          const favorites = JSON.parse(saved);
          setIsFavorite(favorites.some((fav: any) => fav.id === id));
        }
      } catch (e) {
        console.error('Failed to check favorites', e);
      }
    }
  }, [id]);

  // Toggle favorite
  const toggleFavorite = () => {
    if (!anime) return;

    try {
      const saved = localStorage.getItem('favorites');
      let favorites: any[] = saved ? JSON.parse(saved) : [];

      if (isFavorite) {
        // Remove from favorites
        favorites = favorites.filter((fav: any) => fav.id !== id);
        setIsFavorite(false);
      } else {
        // Add to favorites
        favorites.unshift({
          id: id,
          title: anime.title,
          poster: anime.image,
          rating: parseFloat(anime.metadata.rating?.replace('⭐ ', '').replace('/10', '')) || 0,
          year: anime.metadata.premiered?.split(' ')[1] || 'Unknown',
          episodes: anime.metadata.episodes || 0,
          genres: anime.genres || [],
          addedAt: Date.now()
        });
        setIsFavorite(true);
      }

      localStorage.setItem('favorites', JSON.stringify(favorites));
    } catch (e) {
      console.error('Failed to toggle favorite', e);
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        // Use Jikan API getAnimeById for anime details
        const res = await animeAPI.getAnimeById(id);
        const animeData = res.data?.data;
        if (!animeData) throw new Error('Anime info not found');

        // Map Jikan API data to expected frontend structure
        setAnime({
          id: id,
          title: animeData.title || animeData.title_english || 'Unknown Title',
          description: animeData.synopsis || 'No description available.',
          image: animeData.images?.jpg?.large_image_url || animeData.images?.jpg?.image_url || '',
          banner: animeData.images?.jpg?.large_image_url || animeData.images?.jpg?.image_url || '',
          genres: animeData.genres?.map((g: any) => g.name) || [],
          badges: [],
          metadata: {
            premiered: animeData.aired?.string || 'Unknown',
            duration: animeData.duration || 'Unknown',
            studios: animeData.studios?.map((s: any) => s.name) || [],
            status: animeData.status || 'Unknown',
            rating: animeData.score ? `⭐ ${animeData.score}/10` : 'Not rated',
            episodes: animeData.episodes || 'Unknown',
            type: animeData.type || 'Unknown',
            source: animeData.source || 'Unknown',
          },
          seasons: [],
        });

        // Try to get episodes if available
        try {
          // Initial fetch
          const episodesRes = await animeAPI.getEpisodes(id, 1);
          let allJikanEpisodes = episodesRes.data?.data || [];
          const totalJikanPages = episodesRes.data?.pagination?.last_visible_page || 1;

          // Fetch additional pages if more than 100 episodes exist (max 5 pages for speed)
          if (totalJikanPages > 1) {
            const pagesToFetch = Math.min(totalJikanPages, 5);
            for (let p = 2; p <= pagesToFetch; p++) {
              try {
                const nextRes = await animeAPI.getEpisodes(id, p);
                if (nextRes.data?.data) {
                  allJikanEpisodes = [...allJikanEpisodes, ...nextRes.data.data];
                }
              } catch (e) {
                console.error(`Failed to fetch episode page ${p}`, e);
                break;
              }
            }
          }

          const jikanEpisodes = allJikanEpisodes.map((ep: any, index: number) => ({
            episodeId: ep.mal_id?.toString() || (index + 1).toString(),
            number: ep.mal_id || index + 1,
            title: ep.title || `Episode ${index + 1}`,
            image: ep.images?.jpg?.image_url || '',
            aired: ep.aired || '',
          }));

          setEpisodes(jikanEpisodes);

          // Load rich metadata from Animelok for HD thumbnails and all episodes (>100)
          animeAPI.getEpisodeMetadata(id).then(metaRes => {
            const metadata = metaRes.data?.data?.episodes;
            if (metadata && Array.isArray(metadata)) {
              setEpisodes(currentEps => {
                const epMap = new Map();
                currentEps.forEach(ep => epMap.set(String(ep.number), ep));

                metadata.forEach((m: any) => {
                  const epNumStr = String(m.number);
                  const existing = epMap.get(epNumStr);

                  // Fix broken img.animetsu.cc proxy
                  let imageUrl = m.image || m.img || '';
                  if (imageUrl.startsWith('https://img.animetsu.cc/https://')) {
                    imageUrl = imageUrl.replace('https://img.animetsu.cc/', '');
                  }

                  if (existing) {
                    epMap.set(epNumStr, {
                      ...existing,
                      image: imageUrl || existing.image,
                      title: m.title || m.name || existing.title,
                      description: m.description || '',
                      isFiller: m.isFiller
                    });
                  } else {
                    epMap.set(epNumStr, {
                      episodeId: m.id || m.number.toString(),
                      number: m.number,
                      title: m.title || m.name || `Episode ${m.number}`,
                      image: imageUrl,
                      description: m.description || '',
                      isFiller: m.isFiller || false,
                      aired: m.aired || ''
                    });
                  }
                });

                // Return all sorted episodes
                return Array.from(epMap.values()).sort((a, b) => Number(a.number) - Number(b.number));
              });
            }
          }).catch(() => { });
        } catch (err) {
          console.log('Could not fetch episodes:', err);
          setEpisodes([]);
        }

        // Try to get recommendations
        try {
          const recRes = await animeAPI.getRecommendations(id);
          const recData = recRes.data?.data || [];
          setRecommendedAnimes(recData.slice(0, 10).map((rec: any) => ({
            id: rec.entry?.mal_id?.toString(),
            title: rec.entry?.title || 'Unknown',
            poster: rec.entry?.images?.jpg?.image_url || '',
          })));
        } catch (err) {
          console.log('Could not fetch recommendations:', err);
          setRecommendedAnimes([]);
        }

        setRelatedAnimes([]);
      } catch (err: any) {
        console.error('Failed to fetch anime details', err);
        setError(err.message || 'Failed to load anime details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{ backgroundColor: 'var(--net-bg)', minHeight: '100vh' }}
      >
        <PageSkeleton />
      </motion.div>
    );
  }

  if (error || !anime) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{ paddingTop: '100px', textAlign: 'center', color: 'white', padding: '100px 4%' }}
      >
        <p style={{ color: 'var(--net-red)', fontSize: '1.2rem', fontWeight: 700 }}>⚠ {error || 'Anime not found.'}</p>
        <button onClick={() => window.history.back()} className="btn-secondary" style={{ marginTop: '1.5rem' }}>Go Back</button>
      </motion.div>
    );
  }

  const firstEpId = episodes[0]?.episodeId || '';
  const firstEpNum = episodes[0]?.number || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      style={{ minHeight: '100vh', paddingBottom: '5rem', backgroundColor: 'var(--net-bg)' }}
    >
      {/* Hero Section */}
      <div style={{ height: '80vh', width: '100%', backgroundImage: `url("${anime.image}")`, backgroundSize: 'cover', backgroundPosition: 'center 20%', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(90deg, var(--net-bg) 0%, rgba(10,10,10,0.6) 50%, transparent 100%)', zIndex: 1 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'var(--net-footer-gradient)', zIndex: 2 }} />

        <div className="container" style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', zIndex: 10, paddingTop: '100px' }}>
          <div style={{ display: 'flex', gap: '3rem', alignItems: 'flex-start', width: '100%' }}>
            {/* Poster */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              style={{ width: '280px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', display: 'none' }} className="md-flex">
              <img src={anime.image} alt={anime.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} style={{ flex: 1 }}>
              {/* Badges */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {anime.badges.map((badge: string, i: number) => (
                  <span key={i} style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 10px', fontSize: '0.7rem', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.05em', color: 'white' }}>
                    {badge}
                  </span>
                ))}
              </div>

              <h1 style={{ fontSize: 'min(4.5rem, 10vw)', fontWeight: 900, marginBottom: '1rem', maxWidth: '900px', lineHeight: 1, letterSpacing: '-0.04em', textShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
                {anime.title}
              </h1>

              {/* Meta row */}
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {anime.metadata.premiered && <div style={{ color: 'var(--net-text-muted)', fontWeight: 600 }}>{anime.metadata.premiered}</div>}
                {anime.metadata.duration && <div style={{ color: 'var(--net-text-muted)', fontWeight: 600 }}>{anime.metadata.duration}</div>}
                {anime.metadata.status && <span style={{ background: 'rgba(70,211,105,0.15)', color: '#46d369', padding: '2px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>{anime.metadata.status}</span>}
                {episodes.length > 0 && <span style={{ color: 'var(--net-text-muted)', fontSize: '0.9rem' }}>{episodes.length} Episodes</span>}
              </div>

              {/* Genres */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {anime.genres.map((genre: string) => (
                  <span key={genre} style={{ color: 'white', opacity: 0.8, fontSize: '0.9rem' }}>• {genre}</span>
                ))}
              </div>

              <p className="line-clamp-3" style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#e5e5e5', maxWidth: '750px', marginBottom: '2.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {anime.description}
              </p>

              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <Link to={`/watch/${id}/${firstEpNum}`} state={{ episodeId: firstEpId }}>
                  <button className="btn-primary" style={{ height: '52px', padding: '0 2.5rem', fontSize: '1.1rem' }}>
                    <Play fill="black" size={24} /> Play
                  </button>
                </Link>
                <button
                  onClick={toggleFavorite}
                  style={{
                    border: '2px solid ' + (isFavorite ? 'var(--net-red)' : 'rgba(255,255,255,0.4)'),
                    borderRadius: '50%',
                    width: '52px',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isFavorite ? 'var(--net-red)' : 'white',
                    backgroundColor: isFavorite ? 'rgba(229,9,20,0.1)' : 'rgba(255,255,255,0.1)',
                    transition: '0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = isFavorite ? 'var(--net-red)' : 'white';
                    e.currentTarget.style.backgroundColor = isFavorite ? 'rgba(229,9,20,0.2)' : 'rgba(255,255,255,0.15)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = isFavorite ? 'var(--net-red)' : 'rgba(255,255,255,0.4)';
                    e.currentTarget.style.backgroundColor = isFavorite ? 'rgba(229,9,20,0.1)' : 'rgba(255,255,255,0.1)';
                  }}
                >
                  <Heart size={24} fill={isFavorite ? 'var(--net-red)' : 'none'} />
                </button>
                <button style={{ border: '2px solid rgba(255,255,255,0.4)', borderRadius: '50%', width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', backgroundColor: 'rgba(255,255,255,0.1)', transition: '0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'white')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)')}>
                  <Plus size={26} />
                </button>
                <button style={{ border: '2px solid rgba(255,255,255,0.4)', borderRadius: '50%', width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', backgroundColor: 'rgba(255,255,255,0.1)', transition: '0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'white')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)')}>
                  <ThumbsUp size={24} />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: '2rem' }}>
        {/* Seasons */}
        {anime.seasons.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Seasons</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {anime.seasons.map((season: any) => (
                <Link key={season.id} to={`/anime/${season.id}`}
                  style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '2/3', border: season.isCurrent ? '2px solid var(--net-red)' : '1px solid rgba(255,255,255,0.1)', display: 'block', transition: 'transform 0.3s' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                  <img src={season.poster} alt={season.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))' }}>
                    {season.isCurrent && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--net-red)' }}>CURRENT</span>}
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', marginTop: '2px' }}>{season.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Episodes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Episodes</h3>
          <span style={{ color: 'var(--net-text-muted)' }}>{episodes.length} total</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {episodes.map((ep: any, index: number) => (
            <Link
              key={ep.id || index}
              to={`/watch/${id}/${ep.number}`}
              state={{ episodeId: ep.id }}
              style={{ display: 'flex', alignItems: 'center', padding: '1.25rem', backgroundColor: 'var(--net-bg-lite)', borderRadius: '8px', transition: 'var(--transition)', border: '1px solid transparent', textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--net-card-hover)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--net-bg-lite)'; e.currentTarget.style.borderColor = 'transparent'; }}
            >
              {/* Episode number */}
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--net-text-muted)', width: '40px', textAlign: 'center', flexShrink: 0 }}>
                {ep.number}
              </div>

              {/* Thumbnail */}
              <div style={{ width: '160px', aspectRatio: '16/9', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, marginLeft: '1rem', backgroundColor: '#111' }}>
                <img
                  src={ep.image || anime.image || `https://picsum.photos/seed/${ep.number}/160/90`}
                  alt={ep.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== anime.image) {
                      target.src = anime.image;
                    } else if (!target.src.includes('picsum')) {
                      target.src = `https://picsum.photos/seed/${ep.number}/160/90`;
                    }
                  }}
                />
              </div>

              {/* Info */}
              <div style={{ flex: 1, paddingLeft: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'white' }}>
                    {ep.title || `Episode ${ep.number}`}
                  </h4>
                </div>
                <p style={{ color: 'var(--net-text-muted)', fontSize: '0.85rem' }}>
                  Click to watch Episode {ep.number}
                </p>
              </div>

              <div style={{ opacity: 0.6, flexShrink: 0 }}>
                <Play size={22} />
              </div>
            </Link>
          ))}
          {episodes.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--net-bg-lite)', borderRadius: '12px' }}>
              <p style={{ color: 'var(--net-text-muted)' }}>No episodes found.</p>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {recommendedAnimes.length > 0 && (
          <div style={{ marginTop: '4rem' }}>
            <Row title="You May Also Like" items={recommendedAnimes} />
          </div>
        )}

        {/* Related Anime */}
        {relatedAnimes.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <Row title="Related Anime" items={relatedAnimes} />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AnimeDetails;
