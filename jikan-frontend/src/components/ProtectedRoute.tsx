import { useState } from 'react';
import { Lock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { motion } from 'framer-motion';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const { user, loading } = useAuth();
    const [authModalOpen, setAuthModalOpen] = useState(false);

    if (loading) {
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                    backgroundColor: 'var(--net-bg)',
                }}
            >
                <div className="spinner" />
            </div>
        );
    }

    if (!user) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                    backgroundColor: 'var(--net-bg)',
                    padding: '2rem',
                    textAlign: 'center',
                    gap: '1.25rem',
                }}
            >
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(229,9,20,0.12)', border: '1px solid rgba(229,9,20,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={32} style={{ color: 'var(--net-red)' }} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>Sign In Required</h2>
                <p style={{ color: 'var(--net-text-muted)', maxWidth: '340px', fontSize: '1rem', margin: 0 }}>
                    You need to be signed in to access this page.
                </p>
                <button
                    onClick={() => setAuthModalOpen(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.75rem 2rem', borderRadius: '10px',
                        backgroundColor: 'var(--net-red)', border: 'none',
                        color: 'white', fontWeight: 700, fontSize: '1rem',
                        cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--net-red-hover)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--net-red)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    <User size={18} /> Sign In
                </button>
                <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
            </motion.div>
        );
    }

    return <>{children}</>;
};
