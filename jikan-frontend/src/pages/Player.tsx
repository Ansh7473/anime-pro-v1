import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Play, Subtitles, Star, Calendar, Clock, TrendingUp, Heart, Share2, Info } from 'lucide-react';
import Hls from 'hls.js';
import { animeAPI } from '../api/client';
import { motion } from 'framer-motion';
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

  // Step 1: Load episode list and info
  useEffect(() => {
    if (!animeId) return;
    setLoadingEpisodes(true);
    animeAPI.getAnime(animeId)
      .then(res => {
        const data = res.data?.data;
        if (data) {
          setAnimeInfo(data);
          // Jikan API doesn't include episodes in the main anime endpoint
          animeAPI.getEpisodes(animeId)
            .then(epRes => {
              const episodes = epRes.data?.data || [];
              setAllEpisodes(episodes);
              setLoadingEpisodes(false);
            })
            .catch(() => setLoadingEpisodes(false));
        }
      })
      .catch(err => {
        console.error('Anime fetch failed', err);
        setLoadingEpisodes(false);
      });

    // Load related anime (commented out as API doesn't support it yet)
    // animeAPI.getRelated(animeId)
    //   .then((res: any) => {
    //     const related = res.data?.data || [];
    //     setRelatedAnime(related.slice(0, 6));
    //   })
    //   .catch(() => { });
  }, [animeId]);

  // Step 2: Set episodeId from URL or location state
  useEffect(() => {
    if (!animeId || !ep) return;
    const stateEpisodeId = location.state?.episodeId;
    const targetEp = allEpisodes.find((e: any) => String(e.number) === String(ep));
    setEpisodeId(stateEpisodeId || targetEp?.id || `${animeId}-${ep}`);
  }, [animeId, ep, allEpisodes, location.state]);

  // Step 3: Fetch streaming sources
  useEffect(() => {
    if (!episodeId || !animeId) return;
    setLoadingStream(true);
    setError('');

    animeAPI.getWatch(episodeId, animeId, ep)
      .then(res => {
        console.log('Streaming response:', res.data);
        // Transform streaming API response to match player's expected format
        const streamingData = res.data?.data;
        let sources: any[] = [];

        if (streamingData && streamingData.sources) {
          // Convert streaming API sources format to player's expected format
          sources = streamingData.sources.map((source: any, index: number) => ({
            name: source.name || `Stream ${index + 1}`,
            url: source.url,
            category: source.category || 'sub', // Default to sub if not provided
            isEmbed: !source.isM3U8, // If M3U8, use HLS player; otherwise use embed
            quality: source.quality || 'auto',
            isM3U8: source.isM3U8 || false,
            isDASH: source.isDASH || false,
          }));
        } else if (res.data?.data?.sources) {
          // Fallback to old format if present
          sources = res.data.data.sources;
        } else if (res.data?.sources) {
          // Another fallback format
          sources = res.data.sources;
        }

        console.log('Processed sources:', sources);
        setAllSources(sources);

        // Find best source for current category
        const initialServers = sources.filter(s => s.category?.toLowerCase() === category.toLowerCase());
        const selected = initialServers.length ? initialServers[0] : sources[0];

        console.log('Selected source:', selected);
        if (selected) {
          const cat = selected.category?.toLowerCase();
          setCategory(cat as Category || 'sub');
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
  }, [episodeId, animeId, ep, category]);

  // Switch server/category
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
      if (isFavorite(animeId)) {
        removeFavorite(animeId);
      } else {
        addFavorite(animeInfo);
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Watch ${title} - Episode ${ep}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share failed:', err);
      }
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
      {/* Background blur */}
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
        background: 'linear-gradient(rgba(0,0,0,0.9), rgba(0,0,0,0.7), transparent)',
        padding: '15px 4%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '1rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '10px 18px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <ArrowLeft size={20} /> Back
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontSize: '1.3rem',
              fontWeight: 800,
              margin: 0,
              letterSpacing: '-0.02em',
              textTransform: 'capitalize',
              background: 'linear-gradient(90deg, #fff, rgba(255,255,255,0.8))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {title}
            </h2>
            <span style={{ color: 'var(--net-red)', fontSize: '0.9rem', fontWeight: 700 }}>
              EPISODE {ep} {currentEpisode?.title && `- ${currentEpisode.title}`}
            </span>
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
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 4% 3rem' }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', maxWidth: '1600px', margin: '0 auto' }}>

          {/* Left Column - Player & Info */}
          <div style={{ flex: 2, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Video Player */}
            <div style={{
              aspectRatio: '16/9',
              background: 'black',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 80px rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {loadingEpisodes || loadingStream ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  background: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)'
                }}>
                  <div className="spinner" style={{ width: '50px', height: '50px', borderWidth: '3px' }} />
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', fontWeight: 500 }}>
                    {loadingEpisodes ? 'Loading episode list...' : 'Fetching stream...'}
                  </span>
                </div>
              ) : error ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '2rem',
                  gap: '1rem',
                  background: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)'
                }}>
                  <Info size={48} style={{ color: 'var(--net-red)' }} />
                  <p style={{ color: 'var(--net-red)', fontSize: '1.2rem', fontWeight: 700 }}>{error}</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Try a different language or server below.</p>
                </div>
              ) : streamUrl ? (
                isEmbed ? (
                  <iframe src={streamUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                ) : (
                  <HlsPlayer key={streamUrl} src={streamUrl} />
                )
              ) : null}
            </div>

            {/* Language + Server Controls */}
            <div style={{
              background: 'rgba(20,20,20,0.8)',
              padding: '1.5rem',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)'
            }}>
              {/* Language tabs */}
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{
                  color: 'var(--net-text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Subtitles size={14} />
                  Language
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {(['sub', 'dub', 'hindi', 'multi'] as Category[]).map(lang => {
                    const servers = lang === 'sub' ? subServers : (lang === 'dub' ? dubServers : (lang === 'hindi' ? hindiServers : multiServers));
                    if (servers.length === 0 && lang !== category) return null;
                    return (
                      <button
                        key={lang}
                        onClick={() => {
                          if (servers.length) handleSourceChange(servers[0].name, lang);
                          else setCategory(lang);
                        }}
                        style={{
                          padding: '10px 24px',
                          background: category === lang ? 'var(--net-red)' : 'rgba(255,255,255,0.08)',
                          color: 'white',
                          borderRadius: '10px',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          border: '1px solid ' + (category === lang ? 'var(--net-red)' : 'rgba(255,255,255,0.15)'),
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          transition: 'all 0.2s',
                          opacity: servers.length ? 1 : 0.4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => servers.length && category !== lang && (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                        onMouseLeave={(e) => servers.length && category !== lang && (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                      >
                        {lang === 'sub' ? '🇯🇵 Sub' : (lang === 'dub' ? '🎙 English' : (lang === 'hindi' ? '🇮🇳 Hindi' : '🌐 Multi'))}
                        {servers.length === 0 && <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>(none)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Server list */}
              {currentServers.length > 0 && (
                <div>
                  <p style={{
                    color: 'var(--net-text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '12px'
                  }}>
                    Servers
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {currentServers.map((srv: any, i: number) => {
                      const isSelected = activeServer === srv.name;
                      return (
                        <button
                          key={i}
                          onClick={() => handleSourceChange(srv.name, category)}
                          style={{
                            padding: '10px 20px',
                            background: isSelected ? 'var(--net-red)' : 'rgba(255,255,255,0.08)',
                            color: 'white',
                            borderRadius: '10px',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            border: '1px solid ' + (isSelected ? 'var(--net-red)' : 'rgba(255,255,255,0.15)'),
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                          onMouseLeave={(e) => !isSelected && (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                        >
                          {isSelected && <Play size={12} fill="white" />}
                          {srv.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentServers.length === 0 && (
                <p style={{ color: 'var(--net-text-muted)', fontSize: '0.9rem' }}>
                  No {category} servers available. Try switching language.
                </p>
              )}
            </div>

            {/* Anime Info Section */}
            {animeInfo && (
              <div style={{
                background: 'rgba(20,20,20,0.8)',
                padding: '2rem',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                gap: '2rem',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  flex: '0 0 200px',
                  aspectRatio: '2/3',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                }}>
                  <img
                    src={animeInfo.poster}
                    alt={animeInfo.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <h2 style={{
                    fontSize: '1.8rem',
                    fontWeight: 800,
                    margin: '0 0 1rem 0',
                    background: 'linear-gradient(90deg, #fff, rgba(255,255,255,0.8))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    {animeInfo.title}
                  </h2>

                  {/* Meta Info */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    {animeInfo.rating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24' }}>
                        <Star size={18} fill="currentColor" />
                        <span style={{ fontWeight: 700 }}>{animeInfo.rating}</span>
                      </div>
                    )}
                    {animeInfo.year && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--net-text-muted)' }}>
                        <Calendar size={18} />
                        <span>{animeInfo.year}</span>
                      </div>
                    )}
                    {animeInfo.episodes && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--net-text-muted)' }}>
                        <TrendingUp size={18} />
                        <span>{animeInfo.episodes} Episodes</span>
                      </div>
                    )}
                    {animeInfo.duration && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--net-text-muted)' }}>
                        <Clock size={18} />
                        <span>{animeInfo.duration}</span>
                      </div>
                    )}
                  </div>

                  {/* Genres */}
                  {animeInfo.genres && animeInfo.genres.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {animeInfo.genres.slice(0, 6).map((genre: any, i: number) => (
                          <span
                            key={i}
                            style={{
                              padding: '6px 14px',
                              background: 'rgba(229, 9, 20, 0.15)',
                              border: '1px solid rgba(229, 9, 20, 0.3)',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: '#ff6b6b'
                            }}
                          >
                            {genre.name || genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <p style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    color: 'rgba(255,255,255,0.7)',
                    lineHeight: '1.7',
                    maxHeight: '150px',
                    overflow: 'auto'
                  }}>
                    {animeInfo.description || animeInfo.synopsis || 'No description available.'}
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Right Column - Episode List */}
          <div style={{ flex: 1, minWidth: '280px', maxWidth: '400px' }}>
            <div style={{
              background: 'rgba(20,20,20,0.8)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              backdropFilter: 'blur(10px)',
              position: 'sticky',
              top: '100px'
            }}>
              <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: 'linear-gradient(180deg, rgba(229,9,20,0.1), transparent)'
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Episodes</h3>
                <p style={{ color: 'var(--net-text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
                  Now Playing: <span style={{ color: 'var(--net-red)', fontWeight: 700 }}>Ep {ep}</span>
                </p>
              </div>
              <div style={{
                flex: 1,
                padding: '1rem',
                overflowY: 'auto',
                maxHeight: 'calc(100vh - 250px)'
              }} className="custom-scrollbar">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                  gap: '10px'
                }}>
                  {(allEpisodes || []).map((episode: any) => {
                    const isCurrent = String(ep) === String(episode.number);
                    return (
                      <Link
                        key={episode.id || episode.number}
                        to={`/watch/${animeId}/${episode.number}`}
                        state={{ episodeId: episode.id }}
                        title={episode.title || `Episode ${episode.number}`}
                        style={{
                          aspectRatio: '1/1',
                          background: isCurrent ? 'var(--net-red)' : 'rgba(255,255,255,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '12px',
                          color: 'white',
                          fontSize: '1rem',
                          fontWeight: 700,
                          border: '1px solid ' + (isCurrent ? 'var(--net-red)' : 'rgba(255,255,255,0.15)'),
                          textDecoration: 'none',
                          transition: 'all 0.2s',
                          position: 'relative'
                        }}
                        onMouseEnter={e => !isCurrent && (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                        onMouseLeave={e => !isCurrent && (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                      >
                        {episode.number}
                        {isCurrent && (
                          <div style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '8px',
                            height: '8px',
                            background: 'white',
                            borderRadius: '50%'
                          }} />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Player;
