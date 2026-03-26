import { useEffect, useState } from 'react';
import { animeAPI, normalize } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageSkeleton } from '../components/Skeleton';

const toDateStr = (d: Date) => d.toISOString().split('T')[0];

const buildDateOptions = () => {
  const opts = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    opts.push({
      date: toDateStr(d),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      sub: i <= 1 ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }
  return opts;
};

const Schedule = () => {
  const dateOptions = buildDateOptions();
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].date);
  const [scheduledAnimes, setScheduledAnimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const res = await animeAPI.getSchedule(selectedDate);
        const rawData = res.data?.data || [];
        const data = rawData.map((item: any) => {
          const normalized = normalize(item);
          const broadcastTime = item.broadcast?.time || '';
          let displayTime = '';
          if (broadcastTime) {
            const [hours, minutes] = broadcastTime.split(':');
            const hourNum = parseInt(hours, 10);
            const ampm = hourNum >= 12 ? 'PM' : 'AM';
            const displayHour = hourNum % 12 || 12;
            displayTime = `${displayHour}:${minutes} ${ampm}`;
          }
          return {
            ...normalized,
            name: normalized.title,
            time: displayTime,
            episode: item.episodes || '?',
            day: item.broadcast?.day || '',
          };
        });
        setScheduledAnimes(data);
      } catch (err) {
        console.error('Failed to fetch schedule', err);
        setScheduledAnimes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [selectedDate]);

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
        padding: '120px 4% 3rem',
        background: 'linear-gradient(180deg, rgba(20,184,166,0.1) 0%, transparent 100%)',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 60% 30%, rgba(20,184,166,0.07) 0%, transparent 55%)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '1600px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '0.5rem' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(20,184,166,0.4)'
            }}>
              <Calendar size={22} color="white" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(20,184,166,0.8)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>ANIME PRO</p>
              <h1 style={{ fontSize: '2.4rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                Release Schedule
              </h1>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.25)', borderRadius: '50px' }}>
              <Clock size={13} color="#14b8a6" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#14b8a6' }}>AIRING NOW</span>
            </div>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem', margin: '0.5rem 0 2rem', paddingLeft: '62px' }}>
            Track when your favorite anime air this week
          </p>

          {/* Date selector */}
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
            {dateOptions.map((opt, i) => (
              <motion.button
                key={opt.date}
                onClick={() => setSelectedDate(opt.date)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                style={{
                  padding: '10px 18px',
                  borderRadius: '14px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  border: '1px solid ' + (selectedDate === opt.date ? 'rgba(20,184,166,0.6)' : 'rgba(255,255,255,0.08)'),
                  background: selectedDate === opt.date
                    ? 'linear-gradient(135deg, #14b8a6, #06b6d4)'
                    : i === 0 ? 'rgba(20,184,166,0.06)' : 'rgba(255,255,255,0.03)',
                  color: 'white',
                  boxShadow: selectedDate === opt.date ? '0 4px 16px rgba(20,184,166,0.3)' : 'none',
                  transition: 'border 0.2s, background 0.2s',
                  minWidth: '72px'
                }}
              >
                <span style={{ fontSize: '0.82rem', opacity: selectedDate === opt.date ? 1 : 0.6 }}>{opt.label}</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 600 }}>{opt.sub}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 4% 5rem', maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(20,184,166,0.4), rgba(255,255,255,0.05), transparent)', marginBottom: '2.5rem' }} />

        {loading ? (
          <PageSkeleton />
        ) : scheduledAnimes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '5rem', color: 'rgba(255,255,255,0.3)' }}
          >
            <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontSize: '1.1rem' }}>No anime scheduled for this day.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.5 }}>Try a different day</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDate}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px'
              }}
            >
              {scheduledAnimes.map((anime: any, i: number) => (
                <motion.div
                  key={anime.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                >
                  <Link
                    to={`/anime/${anime.id}`}
                    style={{ textDecoration: 'none', display: 'block' }}
                  >
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      padding: '16px',
                      borderRadius: '18px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(10px)',
                      transition: '0.3s',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      {/* Left glow accent */}
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: 'linear-gradient(#14b8a6, #06b6d4)', borderRadius: '3px 0 0 3px' }} />

                      {/* Poster */}
                      <div style={{ width: '72px', height: '100px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                        <img
                          src={anime.poster}
                          alt={anime.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/72/100?grayscale'; }}
                        />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px', minWidth: 0 }}>
                        <h3 style={{
                          fontSize: '0.95rem', fontWeight: 700, color: 'white', margin: 0,
                          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                        }}>
                          {anime.name}
                        </h3>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                          {anime.time && (
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '5px',
                              padding: '3px 10px', borderRadius: '50px',
                              background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.25)'
                            }}>
                              <Clock size={11} color="#14b8a6" />
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#14b8a6' }}>{anime.time}</span>
                            </div>
                          )}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '3px 10px', borderRadius: '50px',
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)'
                          }}>
                            <Play size={10} fill="white" color="white" />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{anime.episode} eps</span>
                          </div>
                          {anime.rating > 0 && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24' }}>★ {Number(anime.rating).toFixed(1)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};

export default Schedule;
