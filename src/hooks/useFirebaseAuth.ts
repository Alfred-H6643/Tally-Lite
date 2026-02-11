import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '../services/firebase';
// mockDb 不再需要手動呼叫：它在首次建立時會自動載入測試資料

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

export const useFirebaseAuth = () => {
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
        // 不再重置資料：保留訪客在 Demo 中的操作
        // mockDb 在首次建立時會自動載入測試資料（constructor 中呼叫 reset()）
        // 之後訪客的所有操作都會保留，直到清除瀏覽器快取或重新載入頁面
        window.location.reload();
    };

    const logout = async () => {
        if (isGuest) {
            sessionStorage.removeItem('isGuest');
            setIsGuest(false);
            setUser(null);
            window.location.reload();
        } else {
            await signOut(auth);
        }
    };

    return { user, loading, logout, loginAsGuest, isGuest };
};
