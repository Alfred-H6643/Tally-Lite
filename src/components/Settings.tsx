import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { initializeFirestoreData, migrateLocalStorageToFirebase } from '../utils/dataMigration';

const Settings: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useFirebaseAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const settingsItems = [
        {
            id: 'categories',
            title: '分類設定',
            icon: '🏷️',
            path: '/settings/categories',
            description: '管理收入與費用分類及子分類'
        },
        {
            id: 'budgets',
            title: '預算設定',
            icon: '💰',
            path: '/settings/budgets',
            description: '設定各年度分類預算'
        },
        {
            id: 'projects',
            title: '專案標籤設定',
            icon: '📂',
            path: '/settings/projects',
            description: '管理專案標籤'
        },
    ];

    const handleInitializeData = async () => {
        if (!user || !confirm('這將會在資料庫中建立預設的分類與子分類。確定要執行嗎？')) return;
        setLoading(true);
        setMessage('');
        try {
            const result = await initializeFirestoreData(user.uid);
            setMessage(`成功初始化 ${result.count} 筆資料！`);
        } catch (error) {
            console.error(error);
            setMessage('初始化失敗，請查看 Console');
        } finally {
            setLoading(false);
        }
    };

    const handleMigrateData = async () => {
        if (!user || !confirm('這將會把您瀏覽器中的 LocalStorage 資料上傳到資料庫。確定要執行嗎？')) return;
        setLoading(true);
        setMessage('');
        try {
            const result = await migrateLocalStorageToFirebase(user.uid);
            setMessage(`成功遷移 ${result.count} 筆資料！`);
        } catch (error) {
            console.error(error);
            setMessage('遷移失敗，請查看 Console');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full bg-gray-50"
        >
            {/* Header */}
            <div className="bg-white p-4 shadow-sm z-10 flex items-center">
                <button onClick={() => navigate('/')} className="mr-4 text-gray-500 text-xl" style={{ fontVariant: 'normal' }}>
                    ↩︎
                </button>
                <h1 className="text-lg font-bold flex-1 text-center pr-8">設定</h1>
            </div>

            {/* Settings List */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                    {settingsItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                        >
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-xl">
                                {item.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900">{item.title}</h3>
                                <p className="text-xs text-gray-500">{item.description}</p>
                            </div>
                            <span className="text-gray-400">→</span>
                        </button>
                    ))}
                </div>

                {/* Data Management Section (Temporary for Migration) */}
                <div className="mt-8">
                    <h3 className="text-sm font-bold text-gray-500 mb-3 px-1 uppercase">資料庫管理 (開發用)</h3>
                    <div className="space-y-3">
                        <button
                            onClick={handleInitializeData}
                            disabled={loading}
                            className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                        >
                            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-xl">
                                ⚡️
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900">初始化預設資料</h3>
                                <p className="text-xs text-gray-500">寫入系統預設分類到 Firebase</p>
                            </div>
                        </button>

                        <button
                            onClick={handleMigrateData}
                            disabled={loading}
                            className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                        >
                            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-xl">
                                📤
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900">遷移本地資料</h3>
                                <p className="text-xs text-gray-500">上傳 LocalStorage 資料到 Firebase</p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Status Message */}
                {message && (
                    <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-xl text-sm text-center">
                        {message}
                    </div>
                )}

                {/* User Info */}
                {user && (
                    <div className="mt-8 text-center text-xs text-gray-400">
                        Logged in as: {user.email}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default Settings;
