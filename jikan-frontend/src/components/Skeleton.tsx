import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    variant?: 'text' | 'rectangular' | 'circular';
    className?: string;
    style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = '100%', variant = 'rectangular', className = '' }) => {
    const baseStyle = {
        width,
        height,
        backgroundColor: '#1a1a1a',
        borderRadius: variant === 'circular' ? '50%' : variant === 'text' ? '4px' : '8px',
        overflow: 'hidden',
        position: 'relative' as const
    };

    return (
        <motion.div
            className={className}
            style={baseStyle}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        >
            <motion.div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
                    transform: 'translateX(-100%)'
                }}
                animate={{
                    transform: ['translateX(-100%)', 'translateX(100%)']
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear'
                }}
            />
        </motion.div>
    );
};

// Anime Card Skeleton
export const AnimeCardSkeleton: React.FC<{ isLarge?: boolean }> = ({ isLarge = false }) => {
    const cardHeight = isLarge ? '280px' : '160px';
    const cardWidth = isLarge ? '200px' : '120px';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Skeleton width={cardWidth} height={cardHeight} variant="rectangular" />
            <Skeleton width="100%" height="16px" variant="text" />
            <Skeleton width="60%" height="12px" variant="text" />
        </div>
    );
};

// Hero Banner Skeleton
export const HeroBannerSkeleton: React.FC = () => {
    return (
        <div style={{ height: '80vh', backgroundColor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '1400px', padding: '0 4%', display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                    <Skeleton width="60%" height="48px" variant="text" />
                    <Skeleton width="40%" height="24px" variant="text" style={{ marginTop: '1rem' }} />
                    <Skeleton width="80%" height="16px" variant="text" style={{ marginTop: '1rem' }} />
                    <Skeleton width="70%" height="16px" variant="text" style={{ marginTop: '0.5rem' }} />
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <Skeleton width="140px" height="44px" variant="rectangular" />
                        <Skeleton width="140px" height="44px" variant="rectangular" />
                    </div>
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <Skeleton width="300px" height="400px" variant="rectangular" />
                </div>
            </div>
        </div>
    );
};

// Row Skeleton
export const RowSkeleton: React.FC<{ itemCount?: number }> = ({ itemCount = 6 }) => {
    return (
        <div style={{ marginBottom: '2.5rem' }}>
            <Skeleton width="200px" height="28px" variant="text" style={{ marginBottom: '1rem' }} />
            <div style={{ display: 'flex', gap: '0.5rem', overflow: 'hidden' }}>
                {Array.from({ length: itemCount }).map((_, idx) => (
                    <AnimeCardSkeleton key={idx} />
                ))}
            </div>
        </div>
    );
};

// List Item Skeleton
export const ListItemSkeleton: React.FC = () => {
    return (
        <div style={{
            display: 'flex',
            gap: '1rem',
            padding: '1rem',
            backgroundColor: 'rgba(20, 20, 20, 0.7)',
            borderRadius: '8px',
            marginBottom: '0.75rem'
        }}>
            <Skeleton width="60px" height="80px" variant="rectangular" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Skeleton width="70%" height="20px" variant="text" />
                <Skeleton width="40%" height="14px" variant="text" />
                <Skeleton width="90%" height="14px" variant="text" />
            </div>
        </div>
    );
};

// Page Skeleton
export const PageSkeleton: React.FC = () => {
    return (
        <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', padding: '100px 4% 4rem' }}>
            <HeroBannerSkeleton />
            <div style={{ marginTop: '3rem' }}>
                <RowSkeleton itemCount={6} />
                <RowSkeleton itemCount={6} />
                <RowSkeleton itemCount={6} />
            </div>
        </div>
    );
};

export default Skeleton;
