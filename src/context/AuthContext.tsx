import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { mockDb } from '../services/mockDatabase';

const GUEST_USER: User = {
    uid: 'GUEST',
    email: 'guest@demo.com',
    displayName: '訪客',
    emailVerified: true,
    isAnonymous: true,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => { },
    getIdToken: async () => '',
    getIdTokenResult: async () => ({} as any),
    reload: async () => { },
    toJSON: () => ({}),
    phoneNumber: null,
    providerId: 'guest',
    photoURL: null
};

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
    loginAsGuest: () => void;
    isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(() => {
        return sessionStorage.getItem('isGuest') === 'true';
    });

    useEffect(() => {
        let unsubscribe = () => { };

        if (isGuest) {
            setUser(GUEST_USER);
            setLoading(false);
        } else {
            unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
                setUser(firebaseUser);
                setLoading(false);
            });
        }

        return () => unsubscribe();
    }, [isGuest]);

    const loginAsGuest = () => {
        sessionStorage.setItem('isGuest', 'true');
        setIsGuest(true);
        mockDb.reset(); // Reset mock DB on new guest login
    };

    const logout = async () => {
        if (isGuest) {
            sessionStorage.removeItem('isGuest');
            setIsGuest(false);
            setUser(null);
            // Optionally reload to clear any other in-memory states if needed
            // window.location.reload(); 
        } else {
            await signOut(auth);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout, loginAsGuest, isGuest }}>
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
