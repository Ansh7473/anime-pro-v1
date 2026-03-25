import React from 'react';
import { motion } from 'framer-motion';
import { Star, Flame, Clock, Award, Play, Hd, Subtitles } from 'lucide-react';

interface BadgeProps {
    type: 'score' | 'trending' | 'new' | 'hd' | 'dub' | 'sub' | 'rating' | 'episodes' | 'duration';
    value?: string | number;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const Badge: React.FC<BadgeProps> = ({ type, value, size = 'md', className = '' }) => {
    const sizeStyles = {
        sm: { padding: '0.25rem 0.5rem', fontSize: '0.7rem', gap: '0.25rem' },
        md: { padding: '0.35rem 0.6rem', fontSize: '0.8rem', gap: '0.35rem' },
        lg: { padding: '0.5rem 0.8rem', fontSize: '0.9rem', gap: '0.5rem' }
    };

    const badgeConfig = {
        score: {
            icon: <Star size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} fill="#FFD700" color="#FFD700" />,
            bgColor: 'rgba(255, 215, 0, 0.15)',
            borderColor: 'rgba(255, 215, 0, 0.3)',
            textColor: '#FFD700'
        },
        trending: {
            icon: <Flame size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} fill="#FF4500" color="#FF4500" />,
            bgColor: 'rgba(255, 69, 0, 0.15)',
            borderColor: 'rgba(255, 69, 0, 0.3)',
            textColor: '#FF4500'
        },
        new: {
            icon: <Clock size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />,
            bgColor: 'rgba(76, 175, 80, 0.15)',
            borderColor: 'rgba(76, 175, 80, 0.3)',
            textColor: '#4CAF50'
        },
        hd: {
            icon: <Hd size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />,
            bgColor: 'rgba(33, 150, 243, 0.15)',
            borderColor: 'rgba(33, 150, 243, 0.3)',
            textColor: '#2196F3'
        },
        dub: {
            icon: <Play size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />,
            bgColor: 'rgba(156, 39, 176, 0.15)',
            borderColor: 'rgba(156, 39, 176, 0.3)',
            textColor: '#9C27B0'
        },
        sub: {
            icon: <Subtitles size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />,
            bgColor: 'rgba(255, 152, 0, 0.15)',
            borderColor: 'rgba(255, 152, 0, 0.3)',
            textColor: '#FF9800'
        },
        rating: {
            icon: <Award size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />,
            bgColor: 'rgba(244, 67, 54, 0.15)',
            borderColor: 'rgba(244, 67, 54, 0.3)',
            textColor: '#F44336'
        },
        episodes: {
            icon: <Play size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />,
            bgColor: 'rgba(96, 125, 139, 0.15)',
            borderColor: 'rgba(96, 125, 139, 0.3)',
            textColor: '#607D8B'
        },
        duration: {
            icon: <Clock size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />,
            bgColor: 'rgba(96, 125, 139, 0.15)',
            borderColor: 'rgba(96, 125, 139, 0.3)',
            textColor: '#607D8B'
        }
    };

    const config = badgeConfig[type];

    return (
        <motion.div
            className={className}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: sizeStyles[size].gap,
                padding: sizeStyles[size].padding,
                fontSize: sizeStyles[size].fontSize,
                fontWeight: 600,
                backgroundColor: config.bgColor,
                border: `1px solid ${config.borderColor}`,
                color: config.textColor,
                borderRadius: '4px',
                backdropFilter: 'blur(4px)',
                transition: 'all 0.3s ease'
            }}
        >
            {config.icon}
            {value && <span>{value}</span>}
        </motion.div>
    );
};

// Score Badge Component
export const ScoreBadge: React.FC<{ score: number; size?: 'sm' | 'md' | 'lg' }> = ({ score, size = 'md' }) => {
    const getScoreColor = (score: number) => {
        if (score >= 8) return { bg: 'rgba(76, 175, 80, 0.15)', border: 'rgba(76, 175, 80, 0.3)', text: '#4CAF50' };
        if (score >= 6) return { bg: 'rgba(255, 193, 7, 0.15)', border: 'rgba(255, 193, 7, 0.3)', text: '#FFC107' };
        if (score >= 4) return { bg: 'rgba(255, 152, 0, 0.15)', border: 'rgba(255, 152, 0, 0.3)', text: '#FF9800' };
        return { bg: 'rgba(244, 67, 54, 0.15)', border: 'rgba(244, 67, 54, 0.3)', text: '#F44336' };
    };

    const colors = getScoreColor(score);

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: size === 'sm' ? '0.25rem' : size === 'md' ? '0.35rem' : '0.5rem',
                padding: size === 'sm' ? '0.25rem 0.5rem' : size === 'md' ? '0.35rem 0.6rem' : '0.5rem 0.8rem',
                fontSize: size === 'sm' ? '0.7rem' : size === 'md' ? '0.8rem' : '0.9rem',
                fontWeight: 700,
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
                color: colors.text,
                borderRadius: '4px',
                backdropFilter: 'blur(4px)'
            }}
        >
            <Star size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} fill={colors.text} color={colors.text} />
            {score.toFixed(1)}
        </motion.div>
    );
};

// Quality Badge Component
export const QualityBadge: React.FC<{ quality: 'HD' | 'FHD' | '4K'; size?: 'sm' | 'md' | 'lg' }> = ({ quality, size = 'md' }) => {
    const qualityConfig = {
        HD: { bg: 'rgba(33, 150, 243, 0.15)', border: 'rgba(33, 150, 243, 0.3)', text: '#2196F3' },
        FHD: { bg: 'rgba(156, 39, 176, 0.15)', border: 'rgba(156, 39, 176, 0.3)', text: '#9C27B0' },
        '4K': { bg: 'rgba(255, 215, 0, 0.15)', border: 'rgba(255, 215, 0, 0.3)', text: '#FFD700' }
    };

    const config = qualityConfig[quality];

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: size === 'sm' ? '0.25rem' : size === 'md' ? '0.35rem' : '0.5rem',
                padding: size === 'sm' ? '0.25rem 0.5rem' : size === 'md' ? '0.35rem 0.6rem' : '0.5rem 0.8rem',
                fontSize: size === 'sm' ? '0.7rem' : size === 'md' ? '0.8rem' : '0.9rem',
                fontWeight: 700,
                backgroundColor: config.bg,
                border: `1px solid ${config.border}`,
                color: config.text,
                borderRadius: '4px',
                backdropFilter: 'blur(4px)'
            }}
        >
            <Hd size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />
            {quality}
        </motion.div>
    );
};

// Status Badge Component
export const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' | 'lg' }> = ({ status, size = 'md' }) => {
    // Normalize status to match expected values
    const normalizedStatus = status?.toLowerCase() || '';

    const statusConfig: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
        airing: { bg: 'rgba(76, 175, 80, 0.15)', border: 'rgba(76, 175, 80, 0.3)', text: '#4CAF50', icon: <Play size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} /> },
        completed: { bg: 'rgba(33, 150, 243, 0.15)', border: 'rgba(33, 150, 243, 0.3)', text: '#2196F3', icon: <Award size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} /> },
        upcoming: { bg: 'rgba(255, 152, 0, 0.15)', border: 'rgba(255, 152, 0, 0.3)', text: '#FF9800', icon: <Clock size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} /> },
        discontinued: { bg: 'rgba(244, 67, 54, 0.15)', border: 'rgba(244, 67, 54, 0.3)', text: '#F44336', icon: <Clock size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} /> },
        // Handle Jikan API status values
        'currently airing': { bg: 'rgba(76, 175, 80, 0.15)', border: 'rgba(76, 175, 80, 0.3)', text: '#4CAF50', icon: <Play size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} /> },
        'finished airing': { bg: 'rgba(33, 150, 243, 0.15)', border: 'rgba(33, 150, 243, 0.3)', text: '#2196F3', icon: <Award size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} /> },
        'not yet aired': { bg: 'rgba(255, 152, 0, 0.15)', border: 'rgba(255, 152, 0, 0.3)', text: '#FF9800', icon: <Clock size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} /> },
    };

    const config = statusConfig[normalizedStatus] || statusConfig['completed'];

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: size === 'sm' ? '0.25rem' : size === 'md' ? '0.35rem' : '0.5rem',
                padding: size === 'sm' ? '0.25rem 0.5rem' : size === 'md' ? '0.35rem 0.6rem' : '0.5rem 0.8rem',
                fontSize: size === 'sm' ? '0.7rem' : size === 'md' ? '0.8rem' : '0.9rem',
                fontWeight: 600,
                backgroundColor: config.bg,
                border: `1px solid ${config.border}`,
                color: config.text,
                borderRadius: '4px',
                backdropFilter: 'blur(4px)'
            }}
        >
            {config.icon}
            {status}
        </motion.div>
    );
};

export default Badge;
