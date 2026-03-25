import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Chrome, Github } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { signIn, signUp, signInWithGoogle, signInWithGitHub } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error } = isLogin
                ? await signIn(email, password)
                : await signUp(email, password, username);

            if (error) {
                setError(error.message);
            } else {
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);
        const { error } = await signInWithGoogle();
        if (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    const handleGitHubSignIn = async () => {
        setError('');
        setLoading(true);
        const { error } = await signInWithGitHub();
        if (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
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
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: 'var(--net-card-bg)',
                            borderRadius: '16px',
                            padding: '2.5rem',
                            width: '100%',
                            maxWidth: '420px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        }}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--net-text-muted)',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                borderRadius: '50%',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--net-text-muted)';
                            }}
                        >
                            <X size={20} />
                        </button>

                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <h2
                                style={{
                                    fontSize: '1.75rem',
                                    fontWeight: 700,
                                    marginBottom: '0.5rem',
                                    color: 'white',
                                    margin: 0,
                                }}
                            >
                                {isLogin ? 'Welcome Back' : 'Create Account'}
                            </h2>
                            <p style={{
                                color: 'var(--net-text-muted)',
                                fontSize: '0.95rem',
                                margin: 0
                            }}>
                                {isLogin ? 'Sign in to continue watching' : 'Join AnimePRO today'}
                            </p>
                        </div>

                        {/* Social Login Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '0.875rem',
                                    backgroundColor: 'white',
                                    color: 'black',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.2)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <Chrome size={20} />
                                Continue with Google
                            </button>

                            <button
                                onClick={handleGitHubSignIn}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '0.875rem',
                                    backgroundColor: '#24292e',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(36, 41, 46, 0.4)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <Github size={20} />
                                Continue with GitHub
                            </button>
                        </div>

                        {/* Divider */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                marginBottom: '1.5rem',
                            }}
                        >
                            <div
                                style={{
                                    flex: 1,
                                    height: '1px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                }}
                            />
                            <span style={{ color: 'var(--net-text-muted)', fontSize: '0.875rem' }}>
                                or
                            </span>
                            <div
                                style={{
                                    flex: 1,
                                    height: '1px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                }}
                            />
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {!isLogin && (
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            color: 'var(--net-text-muted)',
                                            fontSize: '0.875rem',
                                            marginBottom: '0.5rem',
                                            fontWeight: 500,
                                        }}
                                    >
                                        Username
                                    </label>
                                    <div
                                        style={{
                                            position: 'relative',
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <User
                                            size={18}
                                            style={{
                                                position: 'absolute',
                                                left: '1rem',
                                                color: 'var(--net-text-muted)',
                                                pointerEvents: 'none',
                                            }}
                                        />
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="Enter username"
                                            style={{
                                                width: '100%',
                                                padding: '0.875rem 1rem 0.875rem 3rem',
                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '1rem',
                                                outline: 'none',
                                                transition: 'all 0.2s',
                                                boxSizing: 'border-box',
                                            }}
                                            onFocus={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--net-red)';
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                                            }}
                                            onBlur={(e) => {
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        color: 'var(--net-text-muted)',
                                        fontSize: '0.875rem',
                                        marginBottom: '0.5rem',
                                        fontWeight: 500,
                                    }}
                                >
                                    Email
                                </label>
                                <div
                                    style={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Mail
                                        size={18}
                                        style={{
                                            position: 'absolute',
                                            left: '1rem',
                                            color: 'var(--net-text-muted)',
                                            pointerEvents: 'none',
                                        }}
                                    />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter email"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem 0.875rem 3rem',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            boxSizing: 'border-box',
                                        }}
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--net-red)';
                                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        color: 'var(--net-text-muted)',
                                        fontSize: '0.875rem',
                                        marginBottom: '0.5rem',
                                        fontWeight: 500,
                                    }}
                                >
                                    Password
                                </label>
                                <div
                                    style={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Lock
                                        size={18}
                                        style={{
                                            position: 'absolute',
                                            left: '1rem',
                                            color: 'var(--net-text-muted)',
                                            pointerEvents: 'none',
                                        }}
                                    />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem 0.875rem 3rem',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            boxSizing: 'border-box',
                                        }}
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--net-red)';
                                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div
                                    style={{
                                        padding: '0.75rem',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '8px',
                                        color: '#ef4444',
                                        fontSize: '0.875rem',
                                    }}
                                >
                                    {error}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '0.875rem',
                                    backgroundColor: 'var(--net-red)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    marginTop: '0.5rem',
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.4)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
                            </button>
                        </form>

                        {/* Toggle Login/Signup */}
                        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                            <p style={{ color: 'var(--net-text-muted)', fontSize: '0.875rem', margin: 0 }}>
                                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsLogin(!isLogin);
                                        setError('');
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--net-red)',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        padding: 0,
                                        textDecoration: 'underline',
                                    }}
                                >
                                    {isLogin ? 'Sign Up' : 'Sign In'}
                                </button>
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
