import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { initializeFirestoreData, migrateLocalStorageToFirebase } from '../utils/dataMigration';
import ConfirmDialog from './ConfirmDialog';

const AdminSettings: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useFirebaseAuth();
    const { exportSettings, updateExportSettings, transactions, subcategories, categories, updateTransaction } = useAppContext();
    const [formData, setFormData] = useState(exportSettings);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{ title: string, message: string, onConfirm: () => void }>({
        title: '',
        message: '',
        onConfirm: () => { }
    });

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

        setConfirmConfig({
            title: '初始化預設資料',
            message: '確定要寫入預設資料嗎？這不會刪除現有資料。',
            onConfirm: async () => {
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
            }
        });
        setIsConfirmOpen(true);
    };

    const handleMigrate = async () => {
        if (!user) return;

        setConfirmConfig({
            title: '遷移本地資料',
            message: '確定要從此裝置遷移資料到雲端嗎？',
            onConfirm: async () => {
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
            }
        });
        setIsConfirmOpen(true);
    };

    const handleRepairOrphans = async () => {
        setConfirmConfig({
            title: '修復孤兒交易',
            message: '這會將所有無效子分類的交易重新歸類到對應分類的「未分類」。確定要執行嗎？',
            onConfirm: async () => {
                setLoading(true);
                setMessage('正在掃描孤兒交易...');

                try {
                    // Find all orphaned transactions
                    const orphanedTransactions = transactions.filter(t => {
                        const subExists = subcategories.some(s => s.id === t.subcategoryId);
                        return !subExists;
                    });

                    if (orphanedTransactions.length === 0) {
                        setMessage('✅ 沒有發現孤兒交易！');
                        setLoading(false);
                        return;
                    }

                    setMessage(`發現 ${orphanedTransactions.length} 筆孤兒交易，正在修復...`);

                    let fixedCount = 0;
                    let failedCount = 0;

                    for (const t of orphanedTransactions) {
                        try {
                            // Find the category
                            const category = categories.find(c => c.id === t.categoryId);
                            if (!category) {
                                failedCount++;
                                continue;
                            }

                            // Find or get uncategorized for this category
                            const uncategorized = subcategories.find(s =>
                                s.parentId === category.id && s.name === '未分類'
                            );

                            if (!uncategorized) {
                                failedCount++;
                                continue;
                            }

                            // Update the transaction
                            await updateTransaction({ ...t, subcategoryId: uncategorized.id });
                            fixedCount++;
                        } catch (error) {
                            console.error('Failed to fix transaction:', t.id, error);
                            failedCount++;
                        }
                    }

                    setMessage(`✅ 修復完成！成功: ${fixedCount} 筆，失敗: ${failedCount} 筆`);
                } catch (error: any) {
                    setMessage(`❌ 錯誤: ${error.message}`);
                } finally {
                    setLoading(false);
                }
            }
        });
        setIsConfirmOpen(true);
    };

    const handleSetRole = async () => {
        const userIdInput = (document.getElementById('roleUserId') as HTMLInputElement)?.value.trim();
        const roleSelect = (document.getElementById('roleType') as HTMLSelectElement)?.value as 'admin' | 'user';

        if (!userIdInput) {
            setMessage('❌ 請輸入用戶 UID');
            return;
        }

        setConfirmConfig({
            title: '設定用戶角色',
            message: `確定要將用戶 ${userIdInput.substring(0, 8)}... 的角色設定為「${roleSelect === 'admin' ? '管理員' : '一般用戶'}」嗎？`,
            onConfirm: async () => {
                await executeSetRole(userIdInput, roleSelect);
            }
        });
        setIsConfirmOpen(true);
    };

    const handleQuickSetRole = async (userId: string, role: 'admin' | 'user') => {
        const displayName = userId === 'ftqQxIbyX6WRhLDhywYmwJ0yKw12' ? '正式帳號' : '開發帳號';
        setConfirmConfig({
            title: '快速設定角色',
            message: `確定要將${displayName}的角色設定為「${role === 'admin' ? '管理員' : '一般用戶'}」嗎？`,
            onConfirm: async () => {
                await executeSetRole(userId, role);
            }
        });
        setIsConfirmOpen(true);
    };

    const executeSetRole = async (userId: string, role: 'admin' | 'user') => {
        setLoading(true);
        setMessage(`正在設定角色...`);

        try {
            const { db } = await import('../services/firebase');
            const { doc, setDoc, getDoc } = await import('firebase/firestore');

            const profileRef = doc(db, `users/${userId}/config/profile`);
            const profileSnap = await getDoc(profileRef);

            if (profileSnap.exists()) {
                // 更新現有 profile
                await setDoc(profileRef, { role }, { merge: true });
                setMessage(`✅ 已成功更新角色為「${role === 'admin' ? '管理員' : '一般用戶'}」`);
            } else {
                // 創建新 profile
                await setDoc(profileRef, {
                    displayName: '使用者',
                    avatar: '👤',
                    role
                });
                setMessage(`✅ 已創建 profile 並設定角色為「${role === 'admin' ? '管理員' : '一般用戶'}」`);
            }
        } catch (error: any) {
            console.error('設定角色失敗:', error);
            setMessage(`❌ 設定失敗: ${error.message}`);
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
                {/* Global Message Display - Moved to top */}
                {message && (
                    <div className={`text-center text-sm font-medium py-3 rounded-xl ${message.includes('❌') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {message}
                    </div>
                )}

                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>🚀</span> Google Apps Script 設定
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                        此設定用於「匯出交易記錄 (CSV)」功能，透過 Email 發送報表。
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

                        <button
                            onClick={handleRepairOrphans}
                            disabled={loading}
                            className="w-full bg-gray-50 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-100 transition-colors text-left group disabled:opacity-50"
                        >
                            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                🔧
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900">修復孤兒交易</h3>
                                <p className="text-xs text-gray-500">將無效子分類的交易歸到「未分類」</p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Role Management Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>🔑</span> 角色管理
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                        手動設定用戶角色。輸入用戶 UID 和角色後點擊設定。
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">用戶 UID</label>
                            <input
                                type="text"
                                placeholder="例如: ftqQxIbyX6WRhLDhywYmwJ0yKw12"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                                id="roleUserId"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                id="roleType"
                            >
                                <option value="user">一般用戶 (user)</option>
                                <option value="admin">管理員 (admin)</option>
                            </select>
                        </div>
                        <button
                            onClick={handleSetRole}
                            disabled={loading}
                            className="w-full bg-indigo-500 text-white font-bold py-3 rounded-xl hover:bg-indigo-600 transition-colors shadow-sm active:scale-[0.98] disabled:opacity-50"
                        >
                            設定角色
                        </button>
                    </div>

                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 font-medium mb-2">快速設定:</p>
                        <div className="space-y-2">
                            <button
                                onClick={() => handleQuickSetRole('ftqQxIbyX6WRhLDhywYmwJ0yKw12', 'user')}
                                disabled={loading}
                                className="w-full text-left px-3 py-2 bg-white rounded-lg text-xs hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                正式帳號 (alfred.mc.hsu@gmail.com) → 一般用戶
                            </button>
                            <button
                                onClick={() => handleQuickSetRole('9HqyWH9f0dSwKAR5yIBUBfx4GFM2', 'admin')}
                                disabled={loading}
                                className="w-full text-left px-3 py-2 bg-white rounded-lg text-xs hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                開發帳號 → 管理員
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                type="warning"
            />
        </motion.div>
    );
};

export default AdminSettings;
