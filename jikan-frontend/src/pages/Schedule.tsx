import { useEffect, useState } from 'react';
import { animeAPI, normalize } from '../api/client';
import { motion } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageSkeleton } from '../components/Skeleton';

// Format Date object to YYYY-MM-DD
const toDateStr = (d: Date) => d.toISOString().split('T')[0];

// Build a row of 7 selectable dates starting from today
const buildDateOptions = () => {
  const opts = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    opts.push({ date: toDateStr(d), label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) });
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
        // Jikan API returns { data: [...], pagination: {...} }
        const rawData = res.data?.data || [];

        // Map Jikan schedule data to expected format
        const data = rawData.map((item: any) => {
          const normalized = normalize(item);
          // Extract broadcast time from Jikan's broadcast object
          const broadcastTime = item.broadcast?.time || '';
          const broadcastDay = item.broadcast?.day || '';

          // Format time for display
          let displayTime = '';
          if (broadcastTime) {
            // Convert "00:00" format to "12:00 AM" or similar
            const [hours, minutes] = broadcastTime.split(':');
            const hourNum = parseInt(hours, 10);
            const ampm = hourNum >= 12 ? 'PM' : 'AM';
            const displayHour = hourNum % 12 || 12;
            displayTime = `${displayHour}:${minutes} ${ampm}`;
          }

          return {
            ...normalized,
            id: normalized.id,
            name: normalized.title,
            poster: normalized.poster,
            time: displayTime,
            episode: `Episode ${item.episodes || '?'}`,
            // Add day info for debugging
            day: broadcastDay,
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      style={{ backgroundColor: 'var(--net-bg)', minHeight: '100vh', padding: '100px 4% 4rem' }}
    >
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Calendar className="text-red" size={28} />
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Release Schedule</h1>
        </div>

        {/* Date selector */}
        <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
          {dateOptions.map(opt => (
            <button key={opt.date} onClick={() => setSelectedDate(opt.date)}
              style={{
                padding: '0.5rem 1.1rem', borderRadius: '20px', fontSize: '0.85rem', whiteSpace: 'nowrap', fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.25s',
                color: selectedDate === opt.date ? 'white' : 'var(--net-text-muted)',
                backgroundColor: selectedDate === opt.date ? 'var(--net-red)' : 'rgba(255,255,255,0.06)'
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <PageSkeleton />
      ) : scheduledAnimes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--net-text-muted)' }}>
          <p style={{ fontSize: '1.1rem' }}>No anime scheduled for this date.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {scheduledAnimes.map((anime: any) => (
            <motion.div key={anime.id} whileHover={{ scale: 1.02 }} className="glass"
              style={{ display: 'flex', gap: '1rem', padding: '0.85rem', borderRadius: '12px', cursor: 'pointer' }}>
              <Link to={`/anime/${anime.id}`} style={{ display: 'flex', gap: '1rem', textDecoration: 'none', width: '100%' }}>
                <img src={anime.poster} alt={anime.name}
                  style={{ width: '65px', height: '90px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                  onError={e => { (e.target as HTMLImageElement).src = 'https://picsum.photos/65/90?grayscale'; }} />
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.4rem' }}>
                  <h3 className="line-clamp-2" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white' }}>
                    {anime.name}
                  </h3>
                  {anime.time && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--net-red)' }}>
                      <Clock size={13} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{anime.time}</span>
                    </div>
                  )}
                  {anime.episode && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--net-text-muted)', fontWeight: 600 }}>
                      Episode {anime.episode}
                    </span>
                  )}
                  {anime.rating > 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#46d369', fontWeight: 600 }}>
                      ★ {anime.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default Schedule;
