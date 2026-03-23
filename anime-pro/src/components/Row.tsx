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
    <div className="row-container" style={{ marginBottom: '2.5rem', position: 'relative' }}>
      <h2 style={{ 
        fontSize: '1.4rem', 
        fontWeight: 700, 
        color: 'white', 
        marginBottom: '0.75rem', 
        paddingLeft: '4%',
        letterSpacing: '-0.02em'
      }}>
        {title}
      </h2>
      
      <div style={{ position: 'relative' }} className="group">
        {showLeftArrow && (
          <button 
            onClick={() => handleScroll('left')}
            style={{
              position: 'absolute',
              top: 0, bottom: 0, left: 0,
              width: '4%',
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white',
              backdropFilter: 'blur(4px)',
              borderTopRightRadius: '4px',
              borderBottomRightRadius: '4px'
            }}
          >
            <ChevronLeft size={40} />
          </button>
        )}
        
        <div 
          ref={rowRef}
          onScroll={onScroll}
          style={{
            display: 'flex',
            overflowX: 'auto',
            overflowY: 'hidden',
            gap: '12px',
            padding: '10px 4%',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollBehavior: 'smooth'
          }}
          className="hide-scrollbar"
        >
          {items.map((item, idx) => (
            <motion.div
              key={item.id || idx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
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
              width: '4%',
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white',
              backdropFilter: 'blur(4px)',
              borderTopLeftRadius: '4px',
              borderBottomLeftRadius: '4px'
            }}
          >
            <ChevronRight size={40} />
          </button>
        )}
      </div>
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .row-container select-none {
          user-select: none;
        }
      `}</style>
    </div>
  );
};

export default Row;
