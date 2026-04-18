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
    currentProfile: any | null;
}

const initial: AuthState = {
    user: null,
    token: null,
    currentProfile: null
};

// Load from localStorage if in browser
const stored = browser ? localStorage.getItem('auth') : null;
const parsed = stored ? JSON.parse(stored) : initial;

export const auth = writable<AuthState>(parsed);

if (browser) {
    auth.subscribe((value) => {
        localStorage.setItem('auth', JSON.stringify(value));
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
    auth.set(initial);
    if (browser) localStorage.removeItem('auth');
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
