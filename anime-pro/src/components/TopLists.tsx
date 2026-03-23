import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface TopListItem {
  title: string;
  slug: string;
  poster: string;
  type: string;
  episodes: string | number;
  duration: string;
  score: string | number;
  members?: string | number;
}

interface TopListProps {
  title: string;
  items: TopListItem[];
}

const TopListColumn: React.FC<TopListProps> = ({ title, items }) => {
  const navigate = useNavigate();

  return (
    <div className="top-list-column">
      <h3 className="section-title" style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#00bfff' }}>
        {title}
      </h3>
      <div className="top-list-items" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {items.map((item, idx) => (
          <motion.div
            key={item.slug + idx}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
            onClick={() => navigate(`/info/${item.slug}`)}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--net-text-muted)' }}>
                <span>{item.type}</span>
                <span>•</span>
                <span>E {item.episodes}</span>
                <span>•</span>
                <span>{item.duration}</span>
                {item.score !== 'N/A' && (
                  <>
                    <span>•</span>
                    <span style={{ color: 'var(--net-red)', fontWeight: 700 }}>★ {item.score}</span>
                  </>
                )}
              </div>
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
