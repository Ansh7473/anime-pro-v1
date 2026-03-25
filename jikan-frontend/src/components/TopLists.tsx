import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface TopListItem {
  id: string;
  title: string;
  poster: string;
  type: string;
  episodes: string | number;
  duration: string;
  score: string | number;
  members?: string | number;
}

interface TopListProps {
  title: string;
  items: any[]; // Accept any array since Jikan data structure varies
}

const TopListColumn: React.FC<TopListProps> = ({ title, items }) => {
  const navigate = useNavigate();

  // Map Jikan data to expected format
  const mappedItems = items.map(item => ({
    id: item.id || item.mal_id?.toString() || 'unknown',
    title: item.title || item.name || 'Unknown Title',
    title_english: item.title_english || '',
    poster: item.poster || item.images?.jpg?.image_url || item.image_url || '',
    type: item.type || 'TV',
    episodes: item.episodes || 'N/A',
    duration: item.duration || '24 min',
    score: item.score || item.rating || 'N/A',
    members: item.members || item.favorites || 0,
    genres: item.genres || [],
    source: item.source || 'Unknown',
    studios: item.studios || [],
    synopsis: item.synopsis || ''
  }));

  return (
    <div className="top-list-column">
      <h3 className="section-title" style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#00bfff' }}>
        {title}
      </h3>
      <div className="top-list-items" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {mappedItems.map((item, idx) => (
          <motion.div
            key={item.id + idx}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
            onClick={() => navigate(`/anime/${item.id}`)}
            style={{
              display: 'flex',
              gap: '1rem',
              padding: '0.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img
                src={item.poster}
                alt={item.title}
                style={{ width: '60px', height: '85px', objectFit: 'cover', borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60x85?text=No+Image';
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h4 style={{
                margin: 0,
                fontSize: '0.95rem',
                color: 'var(--net-text)',
                fontWeight: 600,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: '1.3'
              }}>
                {item.title}
              </h4>
              {item.title_english && item.title_english !== item.title && (
                <p style={{
                  margin: '2px 0 0 0',
                  fontSize: '0.75rem',
                  color: 'var(--net-text-muted)',
                  fontStyle: 'italic',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {item.title_english}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--net-text-muted)', flexWrap: 'wrap' }}>
                <span>{item.type}</span>
                <span>•</span>
                <span>E {item.episodes}</span>
                <span>•</span>
                <span>{item.duration}</span>
                {item.source && item.source !== 'Unknown' && (
                  <>
                    <span>•</span>
                    <span>{item.source}</span>
                  </>
                )}
                {item.score !== 'N/A' && (
                  <>
                    <span>•</span>
                    <span style={{ color: '#46d369', fontWeight: 700 }}>★ {item.score}</span>
                  </>
                )}
              </div>
              {item.genres && item.genres.length > 0 && (
                <div style={{
                  marginTop: '0.3rem',
                  fontSize: '0.7rem',
                  color: 'var(--net-text-muted)',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {item.genres.slice(0, 3).join(' • ')}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      <button
        className="view-more-btn"
        style={{
          marginTop: '1.5rem',
          width: '100%',
          padding: '0.5rem',
          backgroundColor: 'transparent',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'var(--net-text-muted)',
          fontSize: '0.8rem',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}
      >
        View More <span style={{ fontSize: '1rem' }}>›</span>
      </button>
    </div>
  );
};

interface TopListsContainerProps {
  airing: TopListItem[];
  popular: TopListItem[];
  completed: TopListItem[];
}

const TopLists: React.FC<TopListsContainerProps> = ({ airing, popular, completed }) => {
  return (
    <div className="top-lists-container" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '2rem',
      padding: '2rem 4%',
      backgroundColor: 'rgba(20,20,20,0.5)',
      borderRadius: '12px',
      margin: '2rem 4%',
      border: '1px solid rgba(255,255,255,0.05)'
    }}>
      <TopListColumn title="Top Airing!" items={airing} />
      <TopListColumn title="Most Popular" items={popular} />
      <TopListColumn title="Completed Series" items={completed} />
    </div>
  );
};

export default TopLists;
