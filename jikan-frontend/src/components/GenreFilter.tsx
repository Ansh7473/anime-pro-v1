import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronDown } from 'lucide-react';

interface GenreFilterProps {
    genres: string[];
    selectedGenres: string[];
    onGenreToggle: (genre: string) => void;
    onClearAll: () => void;
}

const GenreFilter: React.FC<GenreFilterProps> = ({
    genres,
    selectedGenres,
    onGenreToggle,
    onClearAll
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const popularGenres = [
        'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
        'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life',
        'Sports', 'Supernatural', 'Thriller'
    ];

    const displayGenres = genres.length > 0 ? genres : popularGenres;

    return (
        <div style={{ position: 'relative', zIndex: 100 }}>
            {/* Filter Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1.2rem',
                    backgroundColor: selectedGenres.length > 0 ? 'rgba(229, 9, 20, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    border: selectedGenres.length > 0 ? '1px solid rgba(229, 9, 20, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                }}
            >
                <Filter size={16} />
                <span>Genres</span>
                {selectedGenres.length > 0 && (
                    <span style={{
                        backgroundColor: '#E50914',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                    }}>
                        {selectedGenres.length}
                    </span>
                )}
                <ChevronDown
                    size={16}
                    style={{
                        transition: 'transform 0.3s ease',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                />
            </motion.button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 0.5rem)',
                            left: 0,
                            backgroundColor: '#1a1a1a',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            padding: '1rem',
                            minWidth: '300px',
                            maxWidth: '400px',
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                            backdropFilter: 'blur(12px)'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem',
                            paddingBottom: '0.75rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                            <h3 style={{
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                color: 'white',
                                margin: 0
                            }}>
                                Filter by Genre
                            </h3>
                            {selectedGenres.length > 0 && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onClearAll}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        padding: '0.3rem 0.6rem',
                                        backgroundColor: 'rgba(229, 9, 20, 0.2)',
                                        border: '1px solid rgba(229, 9, 20, 0.3)',
                                        color: '#E50914',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <X size={12} />
                                    Clear All
                                </motion.button>
                            )}
                        </div>

                        {/* Genre Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                            gap: '0.5rem',
                            maxHeight: '300px',
                            overflowY: 'auto',
                            paddingRight: '0.5rem'
                        }}>
                            {displayGenres.map((genre) => {
                                const isSelected = selectedGenres.includes(genre);
                                return (
                                    <motion.button
                                        key={genre}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => onGenreToggle(genre)}
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            backgroundColor: isSelected ? 'rgba(229, 9, 20, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                            border: isSelected ? '1px solid rgba(229, 9, 20, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                                            color: isSelected ? '#E50914' : '#a3a3a3',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            fontWeight: isSelected ? 600 : 400,
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            textAlign: 'left'
                                        }}
                                    >
                                        {genre}
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Selected Genres Preview */}
                        {selectedGenres.length > 0 && (
                            <div style={{
                                marginTop: '1rem',
                                paddingTop: '0.75rem',
                                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                                <p style={{
                                    fontSize: '0.75rem',
                                    color: '#a3a3a3',
                                    marginBottom: '0.5rem'
                                }}>
                                    Selected: {selectedGenres.join(', ')}
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Genre Chips Component for inline display
export const GenreChips: React.FC<{
    genres: string[];
    selectedGenres: string[];
    onGenreToggle: (genre: string) => void;
    maxDisplay?: number;
}> = ({ genres, selectedGenres, onGenreToggle, maxDisplay = 8 }) => {
    const [showAll, setShowAll] = useState(false);
    const displayGenres = showAll ? genres : genres.slice(0, maxDisplay);

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {displayGenres.map((genre) => {
                const isSelected = selectedGenres.includes(genre);
                return (
                    <motion.button
                        key={genre}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onGenreToggle(genre)}
                        style={{
                            padding: '0.4rem 0.8rem',
                            backgroundColor: isSelected ? 'rgba(229, 9, 20, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: isSelected ? '1px solid rgba(229, 9, 20, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                            color: isSelected ? '#E50914' : '#a3a3a3',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: isSelected ? 600 : 400,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {genre}
                    </motion.button>
                );
            })}
            {genres.length > maxDisplay && !showAll && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAll(true)}
                    style={{
                        padding: '0.4rem 0.8rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#a3a3a3',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 400,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                >
                    +{genres.length - maxDisplay} more
                </motion.button>
            )}
            {showAll && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAll(false)}
                    style={{
                        padding: '0.4rem 0.8rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#a3a3a3',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 400,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                >
                    Show less
                </motion.button>
            )}
        </div>
    );
};

export default GenreFilter;
