import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AnimeCard from './AnimeCard';
import { motion } from 'framer-motion';

interface RowProps {
  title: string;
  items: any[];
  isLargeRow?: boolean;
}

const Row: React.FC<RowProps> = ({ title, items, isLargeRow }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.8;
      const targetScroll = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;

      rowRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  const onScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="row-container" style={{ marginBottom: '2.5rem', position: 'relative', width: '100%' }}>
      <h2 style={{
        fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
        fontWeight: 700,
        color: 'white',
        marginBottom: '0.75rem',
        paddingLeft: 'clamp(1rem, 4vw, 4%)',
        letterSpacing: '-0.02em',
        lineHeight: 1.2
      }}>
        {title}
      </h2>

      <div style={{ position: 'relative', width: '100%' }} className="group">
        {showLeftArrow && (
          <button
            onClick={() => handleScroll('left')}
            style={{
              position: 'absolute',
              top: 0, bottom: 0, left: 0,
              width: 'clamp(40px, 5vw, 60px)',
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white',
              backdropFilter: 'blur(4px)',
              borderTopRightRadius: '4px',
              borderBottomRightRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.7)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)'}
          >
            <ChevronLeft size={32} />
          </button>
        )}

        <div
          ref={rowRef}
          onScroll={onScroll}
          style={{
            display: 'flex',
            overflowX: 'auto',
            overflowY: 'hidden',
            gap: 'clamp(8px, 1.5vw, 12px)',
            padding: '10px clamp(1rem, 4vw, 4%)',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollBehavior: 'smooth',
            width: '100%',
            alignItems: 'stretch'
          }}
          className="hide-scrollbar"
        >
          {items.map((item, idx) => (
            <motion.div
              key={`${item.id}-${idx}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              style={{ flexShrink: 0, width: isLargeRow ? 'clamp(140px, 14vw, 180px)' : 'clamp(115px, 12vw, 155px)' }}
            >
              <AnimeCard anime={item} isLargeRow={isLargeRow} />
            </motion.div>
          ))}
        </div>

        {showRightArrow && (
          <button
            onClick={() => handleScroll('right')}
            style={{
              position: 'absolute',
              top: 0, bottom: 0, right: 0,
              width: 'clamp(40px, 5vw, 60px)',
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white',
              backdropFilter: 'blur(4px)',
              borderTopLeftRadius: '4px',
              borderBottomLeftRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.7)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)'}
          >
            <ChevronRight size={32} />
          </button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .row-container .select-none {
          user-select: none;
        }
        @media (max-width: 480px) {
          .row-container {
            margin-bottom: 1.5rem;
          }
        }
      `}} />
    </div>
  );
};

export default Row;
