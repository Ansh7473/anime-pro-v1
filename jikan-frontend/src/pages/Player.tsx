import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Play, Subtitles, Star, Heart, Share2, Info, TrendingUp, Flame } from 'lucide-react';
import Hls from 'hls.js';
import { animeAPI, normalize } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useFavorites } from '../hooks/useFavorites';

const HlsPlayer = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 60, enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => { }); });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) console.error('[HLS Fatal]', data.type, data.details);
      });
      return () => { hls.destroy(); };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.play().catch(() => { });
    }
  }, [src]);

  return (
    <video ref={videoRef} controls autoPlay
      style={{ width: '100%', height: '100%', objectFit: 'contain', outline: 'none', background: 'black' }} />
  );
};

type Category = 'sub' | 'dub' | 'hindi' | 'multi';

const Player = () => {
  const { animeId, ep } = useParams<{ animeId: string; ep: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();

  // ── Responsive breakpoint ──────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [allEpisodes, setAllEpisodes] = useState<any[]>([]);
  const [episodeId, setEpisodeId] = useState<string>('');
  const [category, setCategory] = useState<Category>('dub');
  const [allSources, setAllSources] = useState<any[]>([]);
  const [activeServer, setActiveServer] = useState<string>('');
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [isEmbed, setIsEmbed] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [loadingStream, setLoadingStream] = useState(false);
  const [error, setError] = useState('');
  const [animeInfo, setAnimeInfo] = useState<any>(null);
  const [providersUsed, setProvidersUsed] = useState<string>('');
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Step 1: Load episode list and info
  useEffect(() => {
    if (!animeId) return;
    setLoadingEpisodes(true);
    animeAPI.getAnime(animeId)
      .then(res => {
        const data = res.data?.data;
        if (data) {
          setAnimeInfo(normalize(data));
          const fetchEpisodes = async () => {
            try {
              const epRes = await animeAPI.getEpisodes(animeId, 1);
              let episodes = epRes.data?.data || [];
              const totalPages = epRes.data?.pagination?.last_visible_page || 1;

              // Fetch ALL pages so we support unlimited-length series (e.g. One Piece, Naruto)
              if (totalPages > 1) {
                const pageRequests = [];
                for (let page = 2; page <= totalPages; page++) {
                  pageRequests.push(animeAPI.getEpisodes(animeId, page));
                }
                const results = await Promise.all(pageRequests);
                results.forEach(r => {
                  if (r.data?.data) episodes = [...episodes, ...r.data.data];
                });
              }

              const normalizedEps = episodes.map((ep: any, index: number) => ({
                id: ep.mal_id?.toString() || (index + 1).toString(),
                number: ep.mal_id || index + 1,
                title: ep.title || `Episode ${ep.mal_id || index + 1}`,
                image: ep.images?.jpg?.image_url || '',
                aired: ep.aired || '',
              }));

              setAllEpisodes(normalizedEps);
              setLoadingEpisodes(false);

              animeAPI.getEpisodeMetadata(animeId).then(metaRes => {
                const metadata = metaRes.data?.data?.episodes;
                if (metadata && Array.isArray(metadata)) {
                  setAllEpisodes(currentEps => {
                    const epMap = new Map();
                    currentEps.forEach(ep => epMap.set(String(ep.number), ep));

                    metadata.forEach((m: any) => {
                      const epNumStr = String(m.number);
                      const existing = epMap.get(epNumStr);
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
                        });
                      } else {
                        epMap.set(epNumStr, {
                          id: m.id || m.number.toString(),
                          number: m.number,
                          title: m.title || m.name || `Episode ${m.number}`,
                          image: imageUrl,
                          description: m.description || '',
                        });
                      }
                    });
                    return Array.from(epMap.values()).sort((a, b) => Number(a.number) - Number(b.number));
                  });
                }
              }).catch(() => { });

            } catch (err) {
              console.error('Failed to fetch episodes', err);
              setLoadingEpisodes(false);
            }
          };
          fetchEpisodes();

          // Fetch recommendations (after a small delay to not overload queue)
          setTimeout(() => {
            animeAPI.getRecommendations(animeId).then((recRes: any) => {
              const recs = recRes.data?.data || [];
              // Jikan recommendations structure: [{entry: {mal_id, title, images, ...}, votes}]
              const normalized = recs.slice(0, 14).map((r: any) => {
                const entry = r.entry || r;
                return {
                  id: entry.mal_id,
                  title: entry.title,
                  poster: entry.images?.jpg?.large_image_url || entry.images?.jpg?.image_url || '',
                  votes: r.votes || 0,
                };
              });
              setRecommendations(normalized);
            }).catch(() => {});
          }, 2000);
        }
      })
      .catch(err => {
        console.error('Anime fetch failed', err);
        setLoadingEpisodes(false);
      });
  }, [animeId]);

  useEffect(() => {
    if (!animeId || !ep) return;
    const stateEpisodeId = location.state?.episodeId;
    const targetEp = allEpisodes.find((e: any) => String(e.number) === String(ep));
    setEpisodeId(stateEpisodeId || targetEp?.id || `${animeId}-${ep}`);
  }, [animeId, ep, allEpisodes, location.state]);

  useEffect(() => {
    if (!episodeId || !animeId) return;
    setLoadingStream(true);
    setError('');
    // Reset sources so the new episode starts fresh
    setAllSources([]);

    animeAPI.getWatch(episodeId, animeId, ep)
      .then(res => {
        const streamingData = res.data?.data;
        let sources: any[] = [];

        if (streamingData && streamingData.sources) {
          sources = streamingData.sources.map((source: any, index: number) => ({
            name: source.name || `Stream ${index + 1}`,
            url: source.url,
            category: source.category || 'sub',
            isEmbed: !source.isM3U8,
            quality: source.quality || 'auto',
            isM3U8: source.isM3U8 || false,
            isDASH: source.isDASH || false,
            provider: source.provider || 'Unknown',
            language: source.language || (source.category === 'hindi' ? 'Hindi' : (source.category === 'dub' ? 'English' : 'Japanese'))
          }));
        }

        setAllSources(sources);
        if (res.data?.provider) setProvidersUsed(res.data.provider);

        // Auto-select best source: prefer current category, then dub, then any
        const preferred = sources.filter(s => s.category?.toLowerCase() === category.toLowerCase());
        const selected = preferred.length ? preferred[0] : sources[0];

        if (selected) {
          setCategory(selected.category?.toLowerCase() as Category || 'dub');
          setActiveServer(selected.name);
          setStreamUrl(selected.url);
          setIsEmbed(selected.isEmbed || !selected.url.includes('.m3u8'));
        } else {
          setError('No sources found for this episode.');
        }
      })
      .catch(err => {
        console.error('Watch fetch failed', err);
        setError('Failed to load stream. Please try a different server or language.');
      })
      .finally(() => setLoadingStream(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeId, animeId, ep]); // NOTE: `category` intentionally omitted — server switching is handled locally via handleSourceChange

  const handleSourceChange = (srvName: string, cat: Category) => {
    const source = allSources.find(s => s.name === srvName && s.category?.toLowerCase() === cat.toLowerCase());
    if (source) {
      setActiveServer(srvName);
      setCategory(cat);
      setStreamUrl(source.url);
      setIsEmbed(source.isEmbed || !source.url.includes('.m3u8'));
    }
  };

  const subServers = allSources.filter(s => s.category?.toLowerCase() === 'sub');
  const dubServers = allSources.filter(s => s.category?.toLowerCase() === 'dub');
  const hindiServers = allSources.filter(s => s.category?.toLowerCase() === 'hindi');
  const multiServers = allSources.filter(s => s.category?.toLowerCase() === 'multi');

  const currentServers = category === 'sub' ? subServers : (category === 'dub' ? dubServers : (category === 'hindi' ? hindiServers : multiServers));
  const title = animeInfo?.title || (animeId || '').replace(/-/g, ' ');
  const currentEpisode = allEpisodes.find(e => String(e.number) === String(ep));

  const handleFavorite = () => {
    if (animeInfo && animeId) {
      if (isFavorite(animeId)) removeFavorite(animeId);
      else addFavorite(animeInfo);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Watch ${title} - Episode ${ep}`, url: window.location.href });
      } catch (err) { console.log('Share failed:', err); }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ width: '100%', minHeight: '100vh', backgroundColor: '#050505', color: 'white' }}
    >
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url("${animeInfo?.poster}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.08,
        filter: 'blur(100px)',
        zIndex: 0
      }} />

      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(5, 5, 5, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '12px 4%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', maxWidth: '1600px', margin: '0 auto' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.9rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '10px 20px',
              borderRadius: '50px',
              cursor: 'pointer',
              fontWeight: 700,
              transition: '0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.transform = 'translateX(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <ArrowLeft size={18} /> Back
          </button>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              margin: 0,
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'white'
            }}>
              {title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px' }}>
              <span style={{ color: 'var(--net-red)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase' }}>
                Episode {ep}
              </span>
              {currentEpisode?.title && (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 500 }}>
                   • {currentEpisode.title}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleFavorite}
              style={{
                padding: '10px',
                background: animeId && isFavorite(animeId) ? 'var(--net-red)' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Heart size={20} fill={animeId && isFavorite(animeId) ? 'white' : 'none'} />
            </button>
            <button
              onClick={handleShare}
              style={{
                padding: '10px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '2rem 4% 3rem' }}>
        <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap', maxWidth: '1700px', margin: '0 auto' }}>
          
          <div style={{ flex: 1, minWidth: isMobile ? '100%' : '55%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{
              background: 'rgba(15, 15, 15, 0.4)',
              padding: '0.75rem',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 30px 60px rgba(0,0,0,0.5)'
            }}>
              <div style={{ aspectRatio: '16/9', background: 'black', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                {loadingEpisodes || loadingStream ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <div className="spinner" />
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Loading Stream...</span>
                  </div>
                ) : error ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <Info size={40} color="var(--net-red)" />
                    <p style={{ color: 'var(--net-red)', fontWeight: 700 }}>{error}</p>
                  </div>
                ) : streamUrl ? (
                  isEmbed ? (
                    <iframe src={streamUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                  ) : <HlsPlayer key={streamUrl} src={streamUrl} />
                ) : null}
              </div>
            </div>

            <div style={{ background: 'rgba(20,20,20,0.8)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
              {providersUsed && (
                <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Source:</span>
                  <span style={{ color: 'var(--net-red)', fontSize: '0.85rem', fontWeight: 600 }}>{providersUsed}</span>
                </div>
              )}
              
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Subtitles size={14} /> Language
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {(['sub', 'dub', 'hindi', 'multi'] as Category[]).map(lang => {
                    const servers = lang === 'sub' ? subServers : (lang === 'dub' ? dubServers : (lang === 'hindi' ? hindiServers : multiServers));
                    if (servers.length === 0 && lang !== category) return null;
                    return (
                      <button
                        key={lang}
                        onClick={() => servers.length && handleSourceChange(servers[0].name, lang)}
                        style={{ padding: '10px 24px', background: category === lang ? 'var(--net-red)' : 'rgba(255,255,255,0.06)', color: 'white', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 700, border: '1px solid ' + (category === lang ? 'var(--net-red)' : 'rgba(255,255,255,0.1)'), cursor: 'pointer', transition: '0.2s', opacity: servers.length ? 1 : 0.4 }}
                      >
                        {lang.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {currentServers.length > 0 && (
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px' }}>Servers</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {currentServers.map((srv: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => handleSourceChange(srv.name, category)}
                        style={{ padding: '10px 20px', background: activeServer === srv.name ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)', color: 'white', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid ' + (activeServer === srv.name ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)'), cursor: 'pointer', transition: '0.2s' }}
                      >
                         {srv.name} • {srv.quality || 'HD'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {animeInfo && (
              <div style={{ background: 'rgba(20,20,20,0.8)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '0 0 180px', aspectRatio: '2/3', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src={animeInfo.poster} alt={animeInfo.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'white' }}>{animeInfo.title}</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    {animeInfo.rating && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24' }}><Star size={18} fill="currentColor" /><b>{animeInfo.rating}</b></div>}
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{animeInfo.year} • {animeInfo.episodes} Episodes • {animeInfo.duration}</div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.7', maxHeight: '120px', overflow: 'auto' }}>
                    {animeInfo.description || animeInfo.synopsis || 'No description available.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Episode Sidebar ── */}
          <div style={{ width: isMobile ? '100%' : '450px', flexShrink: 0 }}>
            <div style={{
              background: 'rgba(12,12,12,0.98)',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              flexDirection: 'column',
              backdropFilter: 'blur(40px)',
              position: isMobile ? 'relative' : 'sticky',
              top: isMobile ? 'auto' : '90px',
              boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              // Fixed height only on desktop where sticky scrolling works well
              height: isMobile ? 'auto' : 'calc(100vh - 120px)',
              // On mobile, show a max-height so it doesn't take the full screen without scrolling
              maxHeight: isMobile ? '75vh' : 'calc(100vh - 120px)',
            }}>
              <div style={{ padding: '1.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(229,9,20,0.12), transparent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>Episodes</h3>
                  <div style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800 }}>{allEpisodes.length} eps</div>
                </div>
              </div>

              <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }} className="custom-scrollbar">
                {allEpisodes.map((episode: any, idx: number) => {
                  const isCurrent = String(ep) === String(episode.number);
                  return (
                    <motion.div
                      key={episode.id || episode.number}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(idx * 0.02, 0.5) }}
                    >
                    <Link
                      to={`/watch/${animeId}/${episode.number}`}
                      state={{ episodeId: episode.id }}
                      style={{
                        display: 'flex',
                        gap: '14px',
                        padding: isMobile ? '10px' : '12px',
                        background: isCurrent ? 'rgba(229, 9, 20, 0.15)' : 'rgba(255,255,255,0.02)',
                        borderRadius: '20px',
                        border: '1px solid ' + (isCurrent ? 'rgba(229, 9, 20, 0.3)' : 'rgba(255,255,255,0.05)'),
                        textDecoration: 'none',
                        transition: '0.3s'
                      }}
                    >
                      {/* Thumbnail — smaller on mobile */}
                      <div style={{
                        width: isMobile ? '110px' : '180px',
                        aspectRatio: '16/9',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        position: 'relative',
                        background: '#0a0a0a'
                      }}>
                        {episode.image ? (
                          <img src={episode.image} alt={episode.number} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isCurrent ? 0.4 : 1 }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900, color: 'rgba(255,255,255,0.05)' }}>{episode.number}</div>
                        )}
                        <div style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.8)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, color: 'white' }}>EP {episode.number}</div>
                        {isCurrent && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--net-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Play size={18} fill="white" style={{ marginLeft: '3px' }} />
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 1, padding: '4px 0' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isCurrent ? 'var(--net-red)' : 'white', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>{episode.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{episode.aired || 'HD 1080p'}</div>
                      </div>
                    </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ===== RECOMMENDED ANIME SECTION ===== */}
        <AnimatePresence>
          {recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ marginTop: '3rem' }}
            >
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '1.75rem' }}>
                <div style={{ width: '4px', height: '32px', background: 'linear-gradient(#e50914, #ff6b6b)', borderRadius: '2px' }} />
                <Flame size={22} color="#e50914" />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>You May Also Like</h3>
                <div style={{ marginLeft: 'auto', padding: '4px 14px', background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.25)', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, color: '#e50914' }}>
                  {recommendations.length} picks
                </div>
              </div>

              {/* Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '18px' }}>
                {recommendations.map((rec: any, i: number) => (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.35, delay: i * 0.04, ease: 'easeOut' }}
                    whileHover={{ y: -10, scale: 1.05, transition: { duration: 0.2 } }}
                    style={{ cursor: 'pointer' }}
                  >
                    <Link to={`/anime/${rec.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                      {/* Poster */}
                      <div style={{ aspectRatio: '2/3', borderRadius: '14px', overflow: 'hidden', position: 'relative', background: '#111', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', marginBottom: '10px' }}>
                        {rec.poster && <img src={rec.poster} alt={rec.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        {/* Bottom gradient */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }} />
                        {/* Play icon */}
                        <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
                          <Play size={11} fill="white" style={{ marginLeft: '2px' }} />
                        </div>
                        {/* Votes badge */}
                        {rec.votes > 0 && (
                          <div style={{ position: 'absolute', bottom: '8px', left: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 700, color: '#fbbf24' }}>
                            <TrendingUp size={10} /> {rec.votes}
                          </div>
                        )}
                      </div>
                      {/* Title */}
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.88)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4, textAlign: 'center' }}>
                        {rec.title}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Player;
