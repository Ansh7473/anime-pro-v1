import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
// Use any for Supabase types if members are missing from the package
type User = any;
type Session = any;
type AuthError = any;
import { supabase } from '../lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string, username?: string) => Promise<{ error: AuthError | null }>;
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signInWithGoogle: () => Promise<{ error: AuthError | null }>;
    signInWithGitHub: () => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }: any) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email: string, password: string, username?: string) => {
        if (!supabase) return { error: { message: 'Auth service unconfigured' } as any };
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username || email.split('@')[0],
                },
            },
        });

        // Create profile in profiles table
        if (!error) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('profiles').insert({
                    id: user.id,
                    email: user.email!,
                    username: username || email.split('@')[0],
                });
            }
        }

        return { error };
    };

    const signIn = async (email: string, password: string) => {
        if (!supabase) return { error: { message: 'Auth service unconfigured' } as any };
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signInWithGoogle = async () => {
        if (!supabase) return { error: { message: 'Auth service unconfigured' } as any };
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        return { error };
    };

    const signInWithGitHub = async () => {
        if (!supabase) return { error: { message: 'Auth service unconfigured' } as any };
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        return { error };
    };

    const signOut = async () => {
        if (!supabase) return { error: { message: 'Auth service unconfigured' } as any };
        const { error } = await supabase.auth.signOut();
        return { error };
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                signUp,
                signIn,
                signInWithGoogle,
                signInWithGitHub,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
