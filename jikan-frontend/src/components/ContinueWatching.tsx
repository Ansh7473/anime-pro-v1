import React from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EpisodeProgress } from './ProgressBar';

interface ContinueWatchingItem {
    animeId: string;
    animeTitle: string;
    animePoster: string;
    episodeNumber: number;
    episodeTitle: string;
    progress: number;
    lastWatched: number;
    totalEpisodes?: number;
}

interface ContinueWatchingProps {
    items: ContinueWatchingItem[];
    onRemove?: (animeId: string) => void;
}

const ContinueWatching: React.FC<ContinueWatchingProps> = ({ items, onRemove }) => {
    if (items.length === 0) return null;

    const formatTimeAgo = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return `${Math.floor(seconds / 604800)}w ago`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ marginBottom: '2.5rem', padding: '0 4%' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Clock className="text-red" size={24} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Continue Watching</h2>
                </div>
                <span style={{ color: 'var(--net-text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                    {items.length} {items.length === 1 ? 'anime' : 'anime'}
                </span>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.5rem'
            }}>
                {items.map((item, index) => (
                    <motion.div
                        key={item.animeId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        style={{
                            position: 'relative',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            backgroundColor: 'var(--net-bg-lite)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            transition: 'all 0.3s ease'
                        }}
                        whileHover={{
                            transform: 'translateY(-4px)',
                            borderColor: 'rgba(255,255,255,0.15)',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                        }}
                    >
                        {/* Remove button */}
                        {onRemove && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    onRemove(item.animeId);
                                }}
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    zIndex: 10,
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(0,0,0,0.7)',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0,
                                    transition: 'opacity 0.2s'
                                }}
                                className="remove-btn"
                            >
                                <X size={16} />
                            </button>
                        )}

                        <Link
                            to={`/watch/${item.animeId}/${item.episodeNumber}`}
                            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                        >
                            {/* Thumbnail */}
                            <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
                                <img
                                    src={item.animePoster}
                                    alt={item.animeTitle}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        transition: 'transform 0.3s ease'
                                    }}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://picsum.photos/400/225?grayscale';
                                    }}
                                />

                                {/* Play overlay */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0,
                                    transition: 'opacity 0.3s ease'
                                }} className="play-overlay">
                                    <div style={{
                                        width: '56px',
                                        height: '56px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--net-red)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 4px 20px rgba(229,9,20,0.5)'
                                    }}>
                                        <Play fill="white" size={24} style={{ marginLeft: '4px' }} />
                                    </div>
                                </div>

                                {/* Episode badge */}
                                <div style={{
                                    position: 'absolute',
                                    top: '8px',
                                    left: '8px',
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                    color: 'white',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    backdropFilter: 'blur(8px)'
                                }}>
                                    EP {item.episodeNumber}
                                </div>

                                {/* Time ago badge */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '8px',
                                    right: '8px',
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                    color: 'var(--net-text-muted)',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    backdropFilter: 'blur(8px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <Clock size={12} />
                                    {formatTimeAgo(item.lastWatched)}
                                </div>
                            </div>

                            {/* Content */}
                            <div style={{ padding: '1rem' }}>
                                <h3 style={{
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    color: 'white',
                                    margin: '0 0 0.5rem 0',
                                    lineHeight: 1.3,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {item.animeTitle}
                                </h3>

                                <p style={{
                                    fontSize: '0.8rem',
                                    color: 'var(--net-text-muted)',
                                    margin: '0 0 0.75rem 0',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {item.episodeTitle}
                                </p>

                                {/* Progress bar */}
                                <EpisodeProgress
                                    current={item.episodeNumber}
                                    total={item.totalEpisodes || 12}
                                    showLabel
                                />
                            </div>
                        </Link>

                        <style>{`
              .remove-btn {
                opacity: 0 !important;
              }
              .play-overlay {
                opacity: 0 !important;
              }
              a:hover .remove-btn {
                opacity: 1 !important;
              }
              a:hover .play-overlay {
                opacity: 1 !important;
              }
              a:hover img {
                transform: scale(1.05);
              }
            `}</style>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default ContinueWatching;
