import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trash2, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QualityBadge } from './Badge';
import { useFavorites } from '../hooks/useFavorites';

const Favorites = () => {
    const { favorites, loading, removeFavorite } = useFavorites();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ backgroundColor: 'var(--net-bg)', minHeight: '100vh', padding: '2rem 4% 4rem' }}
            >
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <div className="spinner" />
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            style={{ backgroundColor: 'var(--net-bg)', minHeight: '100vh', padding: '2rem 4% 4rem' }}
        >
            {/* Header */}
            <header style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <Heart className="text-red" size={28} fill="var(--net-red)" />
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>My Favorites</h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <p style={{ color: 'var(--net-text-muted)', fontSize: '1rem', margin: 0 }}>
                        {favorites.length} {favorites.length === 1 ? 'anime' : 'anime'} in your collection
                    </p>

                    {/* View toggle */}
                    <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                background: viewMode === 'grid' ? 'var(--net-red)' : 'transparent',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                background: viewMode === 'list' ? 'var(--net-red)' : 'transparent',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }}
                        >
                            List
                        </button>
                    </div>
                </div>
            </header>

            {/* Empty state */}
            {favorites.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '16px',
                        border: '1px dashed rgba(255,255,255,0.1)'
                    }}
                >
                    <Heart size={64} style={{ color: 'var(--net-text-muted)', marginBottom: '1.5rem' }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>
                        No favorites yet
                    </h2>
                    <p style={{ color: 'var(--net-text-muted)', fontSize: '1rem', marginBottom: '1.5rem' }}>
                        Start adding anime to your favorites to build your collection
                    </p>
                    <Link
                        to="/"
                        style={{
                            display: 'inline-block',
                            padding: '0.75rem 2rem',
                            background: 'var(--net-red)',
                            color: 'white',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                    >
                        Browse Anime
                    </Link>
                </motion.div>
            ) : (
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={viewMode}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: viewMode === 'grid'
                                ? 'repeat(auto-fill, minmax(180px, 1fr))'
                                : '1fr',
                            gap: viewMode === 'grid' ? '1.5rem' : '1rem'
                        }}
                    >
                        {favorites.map((anime) => (
                            <motion.div
                                key={anime.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    ...(viewMode === 'grid' ? {
                                        aspectRatio: '2/3',
                                        cursor: 'pointer'
                                    } : {
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        alignItems: 'center'
                                    })
                                }}
                            >
                                <Link
                                    to={`/anime/${anime.anime_id}`}
                                    style={{
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        display: viewMode === 'grid' ? 'block' : 'flex',
                                        gap: viewMode === 'list' ? '1.5rem' : '0',
                                        alignItems: 'center',
                                        flex: 1,
                                        height: viewMode === 'grid' ? '100%' : 'auto'
                                    }}
                                >
                                    <img
                                        src={anime.anime_poster}
                                        alt={anime.anime_title}
                                        style={{
                                            width: '100%',
                                            height: viewMode === 'grid' ? '100%' : '120px',
                                            objectFit: 'cover',
                                            ...(viewMode === 'list' ? {
                                                width: '80px',
                                                borderRadius: '8px',
                                                flexShrink: 0
                                            } : {})
                                        }}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://picsum.photos/180/270?grayscale';
                                        }}
                                    />

                                    {viewMode === 'grid' && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'flex-end',
                                            padding: '1rem'
                                        }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <QualityBadge quality="HD" />
                                            </div>

                                            <h3 style={{
                                                fontSize: '0.9rem',
                                                fontWeight: 700,
                                                color: 'white',
                                                margin: '0 0 0.5rem 0',
                                                lineHeight: 1.3,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
                                            }}>
                                                {anime.anime_title}
                                            </h3>

                                            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--net-text-muted)' }}>
                                                <span>Added {formatDate(anime.created_at)}</span>
                                            </div>
                                        </div>
                                    )}

                                    {viewMode === 'list' && (
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                                <QualityBadge quality="HD" />
                                            </div>

                                            <h3 style={{
                                                fontSize: '1.1rem',
                                                fontWeight: 700,
                                                color: 'white',
                                                margin: '0 0 0.5rem 0',
                                                lineHeight: 1.3
                                            }}>
                                                {anime.anime_title}
                                            </h3>

                                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--net-text-muted)', marginBottom: '0.5rem' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Calendar size={14} />
                                                    Added {formatDate(anime.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </Link>

                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        removeFavorite(anime.anime_id);
                                    }}
                                    style={{
                                        position: viewMode === 'grid' ? 'absolute' : 'static',
                                        top: viewMode === 'grid' ? '8px' : 'auto',
                                        right: viewMode === 'grid' ? '8px' : 'auto',
                                        width: viewMode === 'grid' ? '32px' : '40px',
                                        height: viewMode === 'grid' ? '32px' : '40px',
                                        borderRadius: '50%',
                                        backgroundColor: viewMode === 'grid' ? 'rgba(0,0,0,0.7)' : 'rgba(229,9,20,0.1)',
                                        border: viewMode === 'grid' ? 'none' : '1px solid rgba(229,9,20,0.3)',
                                        color: 'var(--net-red)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s',
                                        ...(viewMode === 'list' ? { flexShrink: 0 } : {})
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = viewMode === 'grid'
                                            ? 'rgba(229,9,20,0.8)'
                                            : 'rgba(229,9,20,0.2)';
                                        if (viewMode === 'list') {
                                            e.currentTarget.style.borderColor = 'var(--net-red)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = viewMode === 'grid'
                                            ? 'rgba(0,0,0,0.7)'
                                            : 'rgba(229,9,20,0.1)';
                                        if (viewMode === 'list') {
                                            e.currentTarget.style.borderColor = 'rgba(229,9,20,0.3)';
                                        }
                                    }}
                                >
                                    <Trash2 size={viewMode === 'grid' ? 16 : 18} />
                                </button>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>
            )}
        </motion.div>
    );
};

export default Favorites;
