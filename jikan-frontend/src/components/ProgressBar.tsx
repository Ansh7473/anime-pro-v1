import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
    progress: number; // 0 to 100
    size?: 'sm' | 'md' | 'lg';
    color?: 'red' | 'green' | 'blue' | 'yellow' | 'purple';
    showLabel?: boolean;
    animated?: boolean;
    className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
    size = 'md',
    color = 'red',
    showLabel = false,
    animated = true,
    className = ''
}) => {
    const sizeStyles = {
        sm: { height: '4px', fontSize: '0.7rem' },
        md: { height: '6px', fontSize: '0.8rem' },
        lg: { height: '8px', fontSize: '0.9rem' }
    };

    const colorStyles = {
        red: { bg: '#E50914', glow: 'rgba(229, 9, 20, 0.3)' },
        green: { bg: '#4CAF50', glow: 'rgba(76, 175, 80, 0.3)' },
        blue: { bg: '#2196F3', glow: 'rgba(33, 150, 243, 0.3)' },
        yellow: { bg: '#FFC107', glow: 'rgba(255, 193, 7, 0.3)' },
        purple: { bg: '#9C27B0', glow: 'rgba(156, 39, 176, 0.3)' }
    };

    const colors = colorStyles[color];
    const sizes = sizeStyles[size];

    return (
        <div className={className} style={{ width: '100%' }}>
            {showLabel && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.25rem',
                    fontSize: sizes.fontSize,
                    color: '#a3a3a3'
                }}>
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                </div>
            )}
            <div style={{
                width: '100%',
                height: sizes.height,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    transition={{ duration: animated ? 0.8 : 0, ease: 'easeOut' }}
                    style={{
                        height: '100%',
                        backgroundColor: colors.bg,
                        borderRadius: '4px',
                        boxShadow: `0 0 10px ${colors.glow}`,
                        position: 'relative'
                    }}
                >
                    {animated && (
                        <motion.div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
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
                    )}
                </motion.div>
            </div>
        </div>
    );
};

// Episode Progress Bar Component
export const EpisodeProgress: React.FC<{
    current: number;
    total: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}> = ({ current, total, size = 'md', showLabel = true }) => {
    const progress = total > 0 ? (current / total) * 100 : 0;

    return (
        <div style={{ width: '100%' }}>
            {showLabel && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.25rem',
                    fontSize: size === 'sm' ? '0.7rem' : size === 'md' ? '0.8rem' : '0.9rem',
                    color: '#a3a3a3'
                }}>
                    <span>Episode {current}</span>
                    <span>{total > 0 ? `${current}/${total}` : 'Ongoing'}</span>
                </div>
            )}
            <ProgressBar progress={progress} size={size} color="red" animated={false} />
        </div>
    );
};

// Circular Progress Component
export const CircularProgress: React.FC<{
    progress: number; // 0 to 100
    size?: number;
    strokeWidth?: number;
    color?: string;
    showLabel?: boolean;
}> = ({ progress, size = 60, strokeWidth = 4, color = '#E50914', showLabel = true }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{
                        strokeDasharray: circumference,
                        filter: `drop-shadow(0 0 4px ${color})`
                    }}
                />
            </svg>
            {showLabel && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: size * 0.25,
                    fontWeight: 700,
                    color: 'white'
                }}>
                    {Math.round(progress)}%
                </div>
            )}
        </div>
    );
};

export default ProgressBar;
