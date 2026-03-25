import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Calendar, Clock, Tv, Film, Heart, Share2, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScoreBadge, StatusBadge, QualityBadge } from './Badge';

interface QuickViewModalProps {
    anime: any;
    isOpen: boolean;
    onClose: () => void;
}

const QuickViewModal: React.FC<QuickViewModalProps> = ({ anime, isOpen, onClose }) => {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!anime) return null;

    const poster = anime.images?.jpg?.large_image_url || anime.poster || '';
    const title = anime.title || anime.name || 'Unknown Title';
    const titleEnglish = anime.title_english || '';
    const score = anime.score || 0;
    const episodes = anime.episodes || '?';
    const type = anime.type || 'TV';
    const status = anime.status || 'Unknown';
    const synopsis = anime.synopsis || 'No description available.';
    const genres = anime.genres?.map((g: any) => g.name) || [];
    const studios = anime.studios?.map((s: any) => s.name) || [];
    const year = anime.year || anime.aired?.string?.split('-')[0] || '?';
    const duration = anime.duration || '? min';
    const members = anime.members || 0;
    const popularity = anime.popularity || 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.85)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 2000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2rem'
                        }}
                    >
                        {/* Modal Content */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                backgroundColor: '#141414',
                                borderRadius: '12px',
                                maxWidth: '900px',
                                width: '100%',
                                maxHeight: '90vh',
                                overflow: 'auto',
                                position: 'relative',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            {/* Close Button */}
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                style={{
                                    position: 'absolute',
                                    top: '1rem',
                                    right: '1rem',
                                    zIndex: 10,
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'white',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <X size={20} />
                            </motion.button>

                            {/* Content */}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {/* Hero Section */}
                                <div style={{
                                    position: 'relative',
                                    height: '300px',
                                    backgroundImage: `url(${poster})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    borderRadius: '12px 12px 0 0'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'linear-gradient(to top, #141414 0%, transparent 100%)',
                                        borderRadius: '12px 12px 0 0'
                                    }} />
                                </div>

                                {/* Main Content */}
                                <div style={{ padding: '2rem' }}>
                                    {/* Title Section */}
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h2 style={{
                                            fontSize: '2rem',
                                            fontWeight: 800,
                                            marginBottom: '0.5rem',
                                            letterSpacing: '-0.02em'
                                        }}>
                                            {title}
                                        </h2>
                                        {titleEnglish && titleEnglish !== title && (
                                            <p style={{
                                                color: '#a3a3a3',
                                                fontSize: '1.1rem',
                                                marginBottom: '1rem'
                                            }}>
                                                {titleEnglish}
                                            </p>
                                        )}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                            <ScoreBadge score={score} size="md" />
                                            <StatusBadge status={status as any} size="md" />
                                            <QualityBadge quality="HD" size="md" />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                                        <Link
                                            to={`/watch/${anime.id}/1`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.75rem 1.5rem',
                                                backgroundColor: '#E50914',
                                                color: 'white',
                                                borderRadius: '6px',
                                                fontWeight: 600,
                                                fontSize: '1rem',
                                                textDecoration: 'none',
                                                transition: 'all 0.3s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'scale(1.05)';
                                                e.currentTarget.style.backgroundColor = '#F40612';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                                e.currentTarget.style.backgroundColor = '#E50914';
                                            }}
                                        >
                                            <Play size={18} fill="white" />
                                            Watch Now
                                        </Link>
                                        <Link
                                            to={`/anime/${anime.id}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.75rem 1.5rem',
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                color: 'white',
                                                borderRadius: '6px',
                                                fontWeight: 600,
                                                fontSize: '1rem',
                                                textDecoration: 'none',
                                                transition: 'all 0.3s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'scale(1.05)';
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                            }}
                                        >
                                            <Info size={18} />
                                            More Details
                                        </Link>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.75rem 1.5rem',
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                color: 'white',
                                                borderRadius: '6px',
                                                fontWeight: 600,
                                                fontSize: '1rem',
                                                border: 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            <Heart size={18} />
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.75rem 1.5rem',
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                color: 'white',
                                                borderRadius: '6px',
                                                fontWeight: 600,
                                                fontSize: '1rem',
                                                border: 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            <Share2 size={18} />
                                        </motion.button>
                                    </div>

                                    {/* Info Grid */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                        gap: '1rem',
                                        marginBottom: '2rem'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Tv size={18} style={{ color: '#a3a3a3' }} />
                                            <span style={{ color: '#a3a3a3' }}>Type:</span>
                                            <span style={{ fontWeight: 500 }}>{type}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={18} style={{ color: '#a3a3a3' }} />
                                            <span style={{ color: '#a3a3a3' }}>Year:</span>
                                            <span style={{ fontWeight: 500 }}>{year}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Clock size={18} style={{ color: '#a3a3a3' }} />
                                            <span style={{ color: '#a3a3a3' }}>Duration:</span>
                                            <span style={{ fontWeight: 500 }}>{duration}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Film size={18} style={{ color: '#a3a3a3' }} />
                                            <span style={{ color: '#a3a3a3' }}>Episodes:</span>
                                            <span style={{ fontWeight: 500 }}>{episodes}</span>
                                        </div>
                                    </div>

                                    {/* Genres */}
                                    {genres.length > 0 && (
                                        <div style={{ marginBottom: '2rem' }}>
                                            <h4 style={{
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                                color: '#a3a3a3',
                                                marginBottom: '0.75rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em'
                                            }}>
                                                Genres
                                            </h4>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {genres.map((genre: string) => (
                                                    <motion.span
                                                        key={genre}
                                                        whileHover={{ scale: 1.05 }}
                                                        style={{
                                                            padding: '0.4rem 0.8rem',
                                                            backgroundColor: 'rgba(229, 9, 20, 0.15)',
                                                            border: '1px solid rgba(229, 9, 20, 0.3)',
                                                            color: '#E50914',
                                                            borderRadius: '4px',
                                                            fontSize: '0.85rem',
                                                            fontWeight: 500,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.3s ease'
                                                        }}
                                                    >
                                                        {genre}
                                                    </motion.span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Studios */}
                                    {studios.length > 0 && (
                                        <div style={{ marginBottom: '2rem' }}>
                                            <h4 style={{
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                                color: '#a3a3a3',
                                                marginBottom: '0.75rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em'
                                            }}>
                                                Studios
                                            </h4>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {studios.map((studio: string) => (
                                                    <motion.span
                                                        key={studio}
                                                        whileHover={{ scale: 1.05 }}
                                                        style={{
                                                            padding: '0.4rem 0.8rem',
                                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                                            color: 'white',
                                                            borderRadius: '4px',
                                                            fontSize: '0.85rem',
                                                            fontWeight: 500,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.3s ease'
                                                        }}
                                                    >
                                                        {studio}
                                                    </motion.span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Synopsis */}
                                    <div style={{ marginBottom: '2rem' }}>
                                        <h4 style={{
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                            color: '#a3a3a3',
                                            marginBottom: '0.75rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            Synopsis
                                        </h4>
                                        <p style={{
                                            color: '#d1d1d1',
                                            lineHeight: '1.7',
                                            fontSize: '0.95rem'
                                        }}>
                                            {synopsis}
                                        </p>
                                    </div>

                                    {/* Stats */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                        gap: '1rem',
                                        padding: '1.5rem',
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: '8px'
                                    }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#E50914' }}>
                                                {score.toFixed(1)}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#a3a3a3' }}>Score</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
                                                {members.toLocaleString()}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#a3a3a3' }}>Members</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
                                                #{popularity}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#a3a3a3' }}>Popularity</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default QuickViewModal;
