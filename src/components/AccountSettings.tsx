import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';

const AVATARS = [
    '🐶', '🐱', '🐭', '🐹', '🐰',
    '🦊', '🐻', '🐼', '🐨', '🐯',
    '🦁', '🐷', '🐸', '🐵', '🐔',
    '🐧', '🐦', '🐥', '🦆', '🦄'
];

const AccountSettings: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useFirebaseAuth();
    const { userProfile, updateUserProfile } = useAppContext();

    const [displayName, setDisplayName] = useState(userProfile.displayName);
    const [selectedAvatar, setSelectedAvatar] = useState(userProfile.avatar);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    const handleSave = async () => {
        if (displayName.length > 15) {
            setMessage('❌ 使用者名稱最多 15 個字');
            return;
        }
        setIsSaving(true);
        try {
            await updateUserProfile({
                displayName,
                avatar: selectedAvatar
            });
            setMessage('✅ 設定已儲存');
            setTimeout(() => setMessage(''), 2000);
        } catch (error) {
            console.error(error);
            setMessage('❌ 儲存失敗');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        if (window.confirm('確定要登出嗎？')) {
            try {
                await logout();
                navigate('/login');
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-full bg-gray-50"
        >
            {/* Header */}
            <div className="bg-white p-4 shadow-sm z-10 flex items-center">
                <button onClick={() => navigate('/settings')} className="mr-4 text-gray-500 text-xl" style={{ fontVariant: 'normal' }}>
                    ↩︎
                </button>
                <h1 className="text-lg font-bold flex-1 text-center pr-8">帳號設定</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
                {/* Profile Section */}
                <div className="relative bg-white rounded-2xl p-6 shadow-sm space-y-6 overflow-hidden">
                    {/* Loading Overlay */}
                    <AnimatePresence>
                        {isSaving && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-3"
                            >
                                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                                <p className="text-sm font-bold text-blue-600">正在儲存...</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-5xl mb-4 border-2 border-white shadow-sm overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50">
                            {selectedAvatar}
                        </div>
                        <p className="text-sm text-gray-500 font-medium">{user?.email}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 px-1">使用者名稱</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="請輸入使用者名稱"
                                maxLength={15}
                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                            <p className="text-[10px] text-gray-400 mt-1 px-1 text-right">{displayName.length}/15</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3 px-1">選擇頭像</label>
                            <div className="grid grid-cols-5 gap-3">
                                {/* Default Silhouette */}
                                <button
                                    onClick={() => setSelectedAvatar('👤')}
                                    className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition-all ${selectedAvatar === '👤'
                                        ? 'bg-blue-500 text-white shadow-md scale-105'
                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                        }`}
                                >
                                    👤
                                </button>
                                {AVATARS.map((avatar) => (
                                    <button
                                        key={avatar}
                                        onClick={() => setSelectedAvatar(avatar)}
                                        className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition-all ${selectedAvatar === avatar
                                            ? 'bg-blue-500 shadow-md scale-105'
                                            : 'bg-gray-50 hover:bg-gray-100'
                                            }`}
                                    >
                                        {avatar}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`w-full bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all ${isSaving ? 'opacity-50' : ''}`}
                        >
                            儲存變更
                        </button>

                        <AnimatePresence>
                            {message && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className={`p-3 rounded-xl text-center text-sm font-bold ${message.includes('✅') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}
                                >
                                    {message}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Logout Button */}
                <div className="px-4">
                    <button
                        onClick={handleLogout}
                        disabled={isSaving}
                        className="w-full bg-red-50 text-red-500 font-bold py-4 rounded-2xl active:bg-red-100 transition-colors disabled:opacity-50"
                    >
                        登出帳號
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default AccountSettings;
