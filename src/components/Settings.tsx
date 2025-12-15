import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { useAppContext } from '../context/AppContext';
import { initializeFirestoreData, migrateLocalStorageToFirebase } from '../utils/dataMigration';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction, TransactionType } from '../types';

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
            // Note: This migration reads from LocalStorage, so it is independent of the AppContext transaction filter.
            // It uploads data that might have been created offline.
            const result = await migrateLocalStorageToFirebase(user.uid);
            setMessage(`成功遷移 ${result.count} 筆資料！`);
        } catch (error) {
            console.error(error);
            setMessage('遷移失敗，請查看 Console');
        } finally {
            setLoading(false);
        }
    };

    const { categories, subcategories, projectTags, addTransaction } = useAppContext();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDownloadTemplate = () => {
        // 1. Define Headers
        const headers = ['Date', 'Type', 'Category', 'Subcategory', 'Amount', 'Currency', 'Note', 'Project Tags'];

        // 2. Create Sample Row (Optional, maybe leave empty for user to fill)
        // Let's leave empty as per "Template" concept, or provide one example row?
        // User request: "provide list... for user to fill". 
        // Best practice: Headers + Reference Data at bottom.

        let csvContent = headers.join(',') + '\n';

        // Add a few example rows to guide the user (as per design doc example)
        csvContent += `2025-12-01,expense,食物,午餐,120,TWD,牛肉麵,\n`;
        csvContent += `2025-12-05,income,薪水,,50000,TWD,十一月薪資,\n`;

        // 3. Append Reference Data
        csvContent += `\n\n=== REFERENCE DATA (SYSTEM IGNORES BELOW) ===\n`;

        // Categories & Subcategories
        csvContent += `\n[Categories & Subcategories]\n`;
        csvContent += `Category,Subcategory\n`;

        // Sort for easier reading
        const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

        sortedCategories.forEach(cat => {
            const catSubs = subcategories.filter(s => s.parentId === cat.id);
            if (catSubs.length === 0) {
                csvContent += `${cat.name},\n`;
            } else {
                catSubs.forEach(sub => {
                    csvContent += `${cat.name},${sub.name}\n`;
                });
            }
        });

        // Project Tags
        csvContent += `\n[Project Tags]\n`;
        csvContent += `Tag Name\n`;
        projectTags.forEach(tag => {
            csvContent += `${tag.name}\n`;
        });

        // 4. Create Blob with BOM for UTF-8 Excel compatibility
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

        // 5. Trigger Download
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'transaction_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset file input value so same file can be selected again
        event.target.value = '';

        setLoading(true);
        setMessage(`正在解析 ${file.name}...`);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            complete: async (results) => {
                try {
                    await processImportedData(results.data, file.name);
                } catch (err: any) {
                    console.error("Import error", err);
                    setMessage(`匯入失敗 (${file.name}): ${err.message}`);
                } finally {
                    setLoading(false);
                }
            },
            error: (err) => {
                console.error("CSV Parse Error", err);
                setMessage(`CSV 解析錯誤 (${file.name}): ${err.message}`);
                setLoading(false);
            }
        });
    };

    const processImportedData = async (rows: any[], fileName: string) => {
        // 1. Validate Row Count
        // PapaParse might verify header row vs data row, but let's check length
        // Filter out "REFERENCE DATA" rows if user didn't delete them, although our instruction says "SYSTEM IGNORES BELOW"
        // We can stop processing if we hit a row where any key contains "===" or similar, or just try to parse valid ones.
        // Simple check: Filter rows where 'Date' exists and looks like a date.

        const validRows: any[] = [];
        for (const row of rows) {
            // Stop if we hit the Reference Data marker (approximate check)
            if (Object.values(row).some((val: any) => typeof val === 'string' && val.includes('=== REFERENCE DATA'))) {
                break;
            }
            // Basic validation: Must have Date, Type, Amount, Category
            if (row['Date'] && row['Type'] && row['Amount'] && row['Category']) {
                validRows.push(row);
            }
        }

        if (validRows.length === 0) {
            throw new Error('找不到有效資料或是檔案格式錯誤。請確保使用正確的範本。');
        }

        if (validRows.length > 500) {
            throw new Error(`單次匯入限制 500 筆交易 (目前: ${validRows.length} 筆)。請分割檔案後再試。`);
        }

        let successCount = 0;
        let failCount = 0;

        for (const row of validRows) {
            try {
                // Parse Basic Fields
                const dateStr = row['Date']; // YYYY-MM-DD
                const amount = parseFloat(row['Amount']);
                const type = row['Type'].toLowerCase().trim() as TransactionType;

                if (isNaN(amount)) throw new Error(`Invalid amount`);
                if (type !== 'expense' && type !== 'income') throw new Error(`Invalid type: ${type}`);

                // Map Category
                const catName = row['Category'].trim();
                const matchedCategory = categories.find(c => c.name === catName);
                if (!matchedCategory) {
                    // Skip or Error? Design doc says: "Reject row"
                    throw new Error(`Category not found: ${catName}`);
                }

                // Map Subcategory
                let subId = '';
                const subName = row['Subcategory']?.trim();
                if (subName) {
                    const matchedSub = subcategories.find(s => s.parentId === matchedCategory.id && s.name === subName);
                    if (matchedSub) {
                        subId = matchedSub.id;
                    } else {
                        // Fallback to 'Uncategorized' if exists
                        const uncategorized = subcategories.find(s => s.parentId === matchedCategory.id && s.name === 'Uncategorized');
                        subId = uncategorized?.id || '';
                    }
                } else {
                    // No subcategory provided, try Uncategorized
                    const uncategorized = subcategories.find(s => s.parentId === matchedCategory.id && s.name === 'Uncategorized');
                    subId = uncategorized?.id || '';
                }

                // Map Project Tags
                const tagIds: string[] = [];
                const tagNamesStr = row['Project Tags'];
                if (tagNamesStr) {
                    const tagNames = tagNamesStr.split(',').map((t: string) => t.trim()).filter((t: string) => t);
                    tagNames.forEach((tagName: string) => {
                        const matchedTag = projectTags.find(p => p.name === tagName);
                        if (matchedTag) {
                            tagIds.push(matchedTag.id);
                        }
                    });
                }

                const transaction: Transaction = {
                    id: uuidv4(),
                    date: new Date(dateStr),
                    amount: Math.abs(amount), // Ensure positive
                    type,
                    categoryId: matchedCategory.id,
                    subcategoryId: subId,
                    tags: tagIds,
                    note: row['Note'] || '',
                    currency: row['Currency'] || 'TWD',
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                addTransaction(transaction);
                successCount++;

            } catch (err) {
                console.warn("Skipping row", row, err);
                failCount++;
            }
        }

        setMessage(`匯入完成 (${fileName})！成功: ${successCount} 筆，失敗/略過: ${failCount} 筆。`);
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
            <div className="flex-1 overflow-y-auto p-4 pb-24">
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

                {/* Import / Export Section */}
                <div className="mt-8">
                    <h3 className="text-sm font-bold text-gray-500 mb-3 px-1 uppercase">資料匯入/匯出</h3>
                    <div className="space-y-3">
                        <button
                            onClick={handleDownloadTemplate}
                            className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                        >
                            <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-xl">
                                📥
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900">下載 CSV 匯入範本</h3>
                                <p className="text-xs text-gray-500">包含現有分類與標籤清單</p>
                            </div>
                        </button>

                        {/* Import Button */}
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <button
                            onClick={handleImportClick}
                            disabled={loading}
                            className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                        >
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-xl">
                                📤
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900">匯入交易記錄 (CSV)</h3>
                                <p className="text-xs text-gray-500">支援 UTF-8 格式，單次上限 500 筆</p>
                            </div>
                        </button>
                    </div>
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
