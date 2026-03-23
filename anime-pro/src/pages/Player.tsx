import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Play, Subtitles } from 'lucide-react';
import Hls from 'hls.js';
import { animeAPI, normalize } from '../api/client';

const HlsPlayer = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 60, enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) console.error('[HLS Fatal]', data.type, data.details);
      });
      return () => { hls.destroy(); };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.play().catch(() => {});
    }
  }, [src]);

  return (
    <video ref={videoRef} controls autoPlay
      style={{ width: '100%', height: '100%', objectFit: 'contain', outline: 'none', background: 'black' }} />
  );
};

type Category = 'sub' | 'dub';

const Player = () => {
  const { animeId, ep } = useParams<{ animeId: string; ep: string }>();
  const location = useLocation();
  const navigate = useNavigate();

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
          const eps = data.episodes || [];
          setAllEpisodes(eps);
          setAnimeInfo(normalize(data));

          // Get episodeId — prefer state, then find by number
          const stateEpId = (location.state as any)?.episodeId;
          if (stateEpId) {
            setEpisodeId(stateEpId);
          } else {
            const found = eps.find((e: any) => String(e.number) === String(ep));
            if (found) setEpisodeId(found.id);
            else if (eps.length > 0) setEpisodeId(eps[0].id);
          }
        }
      })
      .catch(err => {
        console.error('Failed to load anime info', err);
        setError('Could not load anime info.');
      })
      .finally(() => setLoadingEpisodes(false));
  }, [animeId, ep]);

  // Step 2: Load sources when episodeId is known
  useEffect(() => {
    if (!episodeId) return;
    setLoadingStream(true);
    setStreamUrl('');
    setIsEmbed(false);
    setError('');

    animeAPI.getWatch(episodeId)
      .then(res => {
        const sources: any[] = res.data?.data?.sources || [];
        setAllSources(sources);
        
        // Find best source for current category
        const initialServers = sources.filter(s => s.category?.toLowerCase() === category.toLowerCase());
        const selected = initialServers.length ? initialServers[0] : sources[0];
        
        if (selected) {
          setCategory(selected.category?.toLowerCase() === 'sub' ? 'sub' : 'dub');
          setActiveServer(selected.name);
          setStreamUrl(selected.url);
          setIsEmbed(selected.isEmbed || !selected.url.includes('.m3u8'));
        } else {
          setError('No sources found for this episode.');
        }
      })
      .catch(err => {
        console.error('Watch fetch failed', err);
        setError('Failed to load stream.');
      })
      .finally(() => setLoadingStream(false));
  }, [episodeId]);

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
  const currentServers = category === 'sub' ? subServers : dubServers;
  const title = animeInfo?.title || (animeId || '').replace(/-/g, ' ');

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#050505', position: 'fixed', top: 0, left: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden', color: 'white' }}>
      {/* Background blur */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `url("${animeInfo?.poster}")`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.12, filter: 'blur(80px)', zIndex: 0 }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '15px 4%', background: 'linear-gradient(rgba(0,0,0,0.85), transparent)', flexShrink: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
          <ArrowLeft size={20} /> Back
        </button>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', textTransform: 'capitalize' }}>{title}</h2>
          <span style={{ color: 'var(--net-red)', fontSize: '0.85rem', fontWeight: 700 }}>EPISODE {ep}</span>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', zIndex: 1, position: 'relative', padding: '0 4% 2rem' }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>

          {/* Player section */}
          <div style={{ flex: 2, minWidth: '320px' }}>
            {/* Video */}
            <div style={{ aspectRatio: '16/9', background: 'black', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,1)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {loadingEpisodes || loadingStream ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                  <div className="spinner" />
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                    {loadingEpisodes ? 'Loading episode list...' : 'Fetching stream...'}
                  </span>
                </div>
              ) : error ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', gap: '1rem' }}>
                  <p style={{ color: 'var(--net-red)', fontSize: '1.1rem', fontWeight: 600 }}>{error}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Try a different language or server below.</p>
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
            <div style={{ marginTop: '1.5rem', background: 'rgba(20,20,20,0.6)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Language tabs */}
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ color: 'var(--net-text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                  <Subtitles size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                  Language
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {(['sub', 'dub'] as Category[]).map(lang => (
                    <button key={lang} onClick={() => {
                      const servers = lang === 'sub' ? subServers : dubServers;
                      if (servers.length) handleSourceChange(servers[0].name, lang);
                      else setCategory(lang);
                    }}
                      style={{ padding: '8px 20px', background: category === lang ? 'var(--net-red)' : 'rgba(255,255,255,0.06)', color: 'white', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, border: '1px solid ' + (category === lang ? 'var(--net-red)' : 'rgba(255,255,255,0.1)'), cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s' }}>
                      {lang === 'sub' ? '🇯🇵 Sub' : '🎙 Dub'}
                      {(lang === 'dub' ? dubServers.length : subServers.length) === 0 && <span style={{ opacity: 0.5, marginLeft: '4px', fontSize: '0.7rem' }}>(none)</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Server list */}
              {currentServers.length > 0 && (
                <div>
                  <p style={{ color: 'var(--net-text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Servers</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {currentServers.map((srv: any, i: number) => {
                      const isSelected = activeServer === srv.name;
                      return (
                        <button key={i} onClick={() => handleSourceChange(srv.name, category)}
                          style={{ padding: '8px 18px', background: isSelected ? 'var(--net-red)' : 'rgba(255,255,255,0.06)', color: 'white', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, border: '1px solid ' + (isSelected ? 'var(--net-red)' : 'rgba(255,255,255,0.1)'), cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isSelected && <Play size={12} fill="white" />}
                          {srv.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentServers.length === 0 && (
                <p style={{ color: 'var(--net-text-muted)', fontSize: '0.85rem' }}>
                  No {category} servers available. Try switching language.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar episode list */}
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ background: 'rgba(20,20,20,0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Episodes</h3>
                <p style={{ color: 'var(--net-text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>Now Playing: Ep {ep}</p>
              </div>
              <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', maxHeight: '520px' }} className="custom-scrollbar">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(58px, 1fr))', gap: '8px' }}>
                  {(allEpisodes || []).map((episode: any) => {
                    const isCurrent = String(ep) === String(episode.number);
                    return (
                      <Link key={episode.id || episode.number}
                        to={`/watch/${animeId}/${episode.number}`}
                        state={{ episodeId: episode.id }}
                        title={episode.title || `Episode ${episode.number}`}
                        style={{ aspectRatio: '1/1', background: isCurrent ? 'var(--net-red)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', color: 'white', fontSize: '0.95rem', fontWeight: 700, border: '1px solid ' + (isCurrent ? 'var(--net-red)' : 'rgba(255,255,255,0.1)'), textDecoration: 'none', transition: '0.2s' }}
                        onMouseEnter={e => !isCurrent && (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                        onMouseLeave={e => !isCurrent && (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}>
                        {episode.number}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;
