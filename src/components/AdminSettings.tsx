import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { initializeFirestoreData, migrateLocalStorageToFirebase } from '../utils/dataMigration';

const AdminSettings: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useFirebaseAuth();
    const { exportSettings, updateExportSettings } = useAppContext();
    const [formData, setFormData] = useState(exportSettings);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setFormData(exportSettings);
    }, [exportSettings]);

    const handleSave = () => {
        updateExportSettings(formData);
        setMessage('✅ 設定已儲存！');
        setTimeout(() => setMessage(''), 2000);
    };

    const handleInitialize = async () => {
        if (!user) return;
        if (!window.confirm('確定要寫入預設資料嗎？這不會刪除現有資料。')) return;

        setLoading(true);
        setMessage('正在初始化資料...');
        try {
            await initializeFirestoreData(user.uid);
            setMessage('✅ 初始化成功！');
        } catch (error: any) {
            setMessage(`❌ 錯誤: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleMigrate = async () => {
        if (!user) return;
        if (!window.confirm('確定要從此裝置遷移資料到雲端嗎？')) return;

        setLoading(true);
        setMessage('正在遷移資料...');
        try {
            await migrateLocalStorageToFirebase(user.uid);
            setMessage('✅ 遷移成功！');
        } catch (error: any) {
            setMessage(`❌ 錯誤: ${error.message}`);
        } finally {
            setLoading(false);
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
                <h1 className="text-lg font-bold flex-1 text-center pr-8">系統設定 (Admin)</h1>
            </div>

            <div className="p-4 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>🚀</span> Google Apps Script 設定
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                        請輸入部署好的 Google Apps Script 網頁應用程式網址 (Web App URL)。
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Script URL</label>
                            <input
                                type="text"
                                value={formData.scriptUrl}
                                onChange={e => setFormData({ ...formData, scriptUrl: e.target.value })}
                                placeholder="https://script.google.com/macros/s/..."
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={handleSave}
                            className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition-colors shadow-sm active:scale-[0.98]"
                        >
                            儲存設定
                        </button>
                    </div>

                    {message && (
                        <div className={`mt-4 text-center text-sm font-medium py-2 rounded-lg ${message.includes('❌') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            {message}
                        </div>
                    )}
                </div>

                {/* Data Management Section moved from Settings */}
                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>🗄️</span> 資料庫管理 (開發用)
                    </h2>

                    <div className="space-y-4">
                        <button
                            onClick={handleInitialize}
                            disabled={loading}
                            className="w-full bg-gray-50 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-100 transition-colors text-left group disabled:opacity-50"
                        >
                            <div className="w-10 h-10 bg-yellow-50 rounded-full flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                ⚡️
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900">初始化預設資料</h3>
                                <p className="text-xs text-gray-500">寫入系統預設分類到 Firebase</p>
                            </div>
                        </button>

                        <button
                            onClick={handleMigrate}
                            disabled={loading}
                            className="w-full bg-gray-50 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-100 transition-colors text-left group disabled:opacity-50"
                        >
                            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                📤
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900">遷移本地資料</h3>
                                <p className="text-xs text-gray-500">將當前裝置的 LocalStorage 資料上傳到雲端</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default AdminSettings;
