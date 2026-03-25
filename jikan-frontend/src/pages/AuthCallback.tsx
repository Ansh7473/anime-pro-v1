import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        // Handle the OAuth callback
        supabase.auth.onAuthStateChange((event: any, session: any) => {
            if (event === 'SIGNED_IN' || session) {
                // User successfully signed in, redirect to home
                navigate('/', { replace: true });
            }
        });

        // Check for existing session
        supabase.auth.getSession().then(({ data: { session } }: any) => {
            if (session) {
                navigate('/', { replace: true });
            } else {
                // No session, redirect to home
                navigate('/', { replace: true });
            }
        });
    }, [navigate]);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: 'var(--net-bg)',
            color: 'white'
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '4px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 1rem'
                }}></div>
                <p>Signing you in...</p>
            </div>
            <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
