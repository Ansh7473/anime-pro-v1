import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface User {
    id: string;
    email: string;
    profiles: any[];
    favorites?: any[];
    createdAt?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    currentProfile: {
        id: string;
        name: string;
        avatar: string;
        autoNext: boolean;
        autoSkip: boolean;
        language: string;
        theme: string;
    } | null;
}

const initial: AuthState = {
    user: null,
    token: null,
    currentProfile: null
};

function isExpiredToken(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1] || ''));
        return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
    } catch {
        return true;
    }
}

function getStoredAuth(): AuthState {
    if (!browser) return initial;

    const stored = localStorage.getItem('auth');
    if (!stored) return initial;

    try {
        const parsed = JSON.parse(stored) as AuthState;
        if (!parsed?.token || !parsed?.user || isExpiredToken(parsed.token)) {
            localStorage.removeItem('auth');
            return initial;
        }
        return parsed;
    } catch {
        localStorage.removeItem('auth');
        return initial;
    }
}

export const auth = writable<AuthState>(getStoredAuth());

export const clearAuth = () => {
    auth.set(initial);
    if (browser) localStorage.removeItem('auth');
};

if (browser) {
    auth.subscribe((value) => {
        if (value.token && value.user) {
            localStorage.setItem('auth', JSON.stringify(value));
        } else {
            localStorage.removeItem('auth');
        }
    });
}

export const loginUser = (user: User, token: string) => {
    auth.update((state) => ({
        ...state,
        user,
        token,
        currentProfile: user.profiles?.[0] || null
    }));
};

export const logoutUser = () => {
    clearAuth();
};

export const switchProfile = (profile: any) => {
    auth.update((state) => ({
        ...state,
        currentProfile: profile
    }));
};

export const updateProfile = (profile: any) => {
    auth.update((state) => ({
        ...state,
        currentProfile: profile
    }));
};
