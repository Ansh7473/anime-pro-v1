import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Trash2, Clock, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWatchHistory } from '../hooks/useWatchHistory';

const WatchHistory = () => {
    const { watchHistory, loading, removeFromWatchHistory } = useWatchHistory();
    const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

    const clearHistory = () => {
        if (window.confirm('Are you sure you want to clear your entire watch history?')) {
            // Clear all items
            watchHistory.forEach(item => {
                removeFromWatchHistory(item.anime_id);
            });
        }
    };

    const removeItem = (animeId: string) => {
        removeFromWatchHistory(animeId);
    };

    const filterHistory = (items: any[]) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        return items.filter(item => {
            const itemDate = new Date(item.watched_at);
            if (filter === 'today') return itemDate >= today;
            if (filter === 'week') return itemDate >= weekAgo;
            if (filter === 'month') return itemDate >= monthAgo;
            return true;
        });
    };

    const filteredHistory = filterHistory(watchHistory);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
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
                    <History size={28} style={{ color: 'var(--net-red)' }} />
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>Watch History</h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <p style={{ color: 'var(--net-text-muted)', fontSize: '1rem', margin: 0 }}>
                        {filteredHistory.length} {filteredHistory.length === 1 ? 'episode' : 'episodes'} watched
                    </p>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {/* Filter buttons */}
                        <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                            {(['all', 'today', 'week', 'month'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        background: filter === f ? 'var(--net-red)' : 'transparent',
                                        color: 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        textTransform: 'capitalize',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        {watchHistory.length > 0 && (
                            <button
                                onClick={clearHistory}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    background: 'rgba(244, 67, 54, 0.1)',
                                    color: '#F44336',
                                    border: '1px solid rgba(244, 67, 54, 0.3)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(244, 67, 54, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(244, 67, 54, 0.1)';
                                }}
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Empty state */}
            {filteredHistory.length === 0 ? (
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
                    <History size={64} style={{ color: 'var(--net-text-muted)', marginBottom: '1.5rem' }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>
                        No watch history yet
                    </h2>
                    <p style={{ color: 'var(--net-text-muted)', fontSize: '1rem', marginBottom: '1.5rem' }}>
                        Start watching anime to build your history
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
                        key={filter}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '1.5rem'
                        }}
                    >
                        {filteredHistory.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}
                            >
                                <Link
                                    to={`/anime/${item.anime_id}`}
                                    style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                                >
                                    <div style={{ position: 'relative', aspectRatio: '16/9' }}>
                                        <img
                                            src={item.anime_poster}
                                            alt={item.anime_title}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://picsum.photos/320/180?grayscale';
                                            }}
                                        />

                                        {/* Play overlay */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            background: 'rgba(0,0,0,0.5)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: 0,
                                            transition: 'opacity 0.2s'
                                        }}
                                            className="play-overlay"
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLDivElement).style.opacity = '1';
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLDivElement).style.opacity = '0';
                                            }}
                                        >
                                            <div style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '50%',
                                                background: 'var(--net-red)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Play size={28} fill="white" />
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        {item.progress_seconds > 0 && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                height: '3px',
                                                background: 'rgba(0,0,0,0.5)'
                                            }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${item.total_seconds > 0 ? (item.progress_seconds / item.total_seconds) * 100 : 0}%`,
                                                    background: 'var(--net-red)',
                                                    transition: 'width 0.3s'
                                                }} />
                                            </div>
                                        )}

                                        {/* Episode badge */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '8px',
                                            left: '8px',
                                            background: 'rgba(0,0,0,0.8)',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: 'white'
                                        }}>
                                            EP {item.episode_number}
                                        </div>
                                    </div>

                                    <div style={{ padding: '1rem' }}>
                                        <h3 style={{
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            color: 'white',
                                            margin: '0 0 0.5rem 0',
                                            lineHeight: 1.3,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}>
                                            {item.anime_title}
                                        </h3>

                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--net-text-muted)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Clock size={14} />
                                                {formatDate(item.watched_at)}
                                            </span>
                                        </div>
                                    </div>
                                </Link>

                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        removeItem(item.anime_id);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '8px',
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(0,0,0,0.7)',
                                        border: 'none',
                                        color: 'var(--net-red)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: 0,
                                        transition: 'opacity 0.2s'
                                    }}
                                    className="remove-btn"
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.opacity = '1';
                                        e.currentTarget.style.backgroundColor = 'rgba(229,9,20,0.8)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.opacity = '0';
                                        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.7)';
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>
            )}

            <style>{`
                .play-overlay {
                    opacity: 0 !important;
                }
                a:hover .play-overlay {
                    opacity: 1 !important;
                }
                .remove-btn {
                    opacity: 0 !important;
                }
                a:hover .remove-btn {
                    opacity: 1 !important;
                }
            `}</style>
        </motion.div>
    );
};

export default WatchHistory;
