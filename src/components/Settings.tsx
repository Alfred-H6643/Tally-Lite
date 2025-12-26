import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { useAppContext } from '../context/AppContext';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction } from '../types';
import ExportModal from './ExportModal';
import BatchDeleteModal from './BatchDeleteModal';

const Settings: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useFirebaseAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

    const settingsItems = [
        {
            id: 'account',
            title: '帳號設定',
            icon: '👤',
            path: '/settings/account',
            description: '個人資料、使用者名稱與登出'
        },
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

    const { categories, subcategories, projectTags, addTransaction } = useAppContext();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDownloadTemplate = () => {
        // Match the order: Date, Type, Category, Subcategory, Note, Tags, Currency, Amount
        const headers = ['Date', 'Type', 'Category', 'Subcategory', 'Note', 'Tags', 'Currency', 'Amount'];

        let csvContent = headers.join(',') + '\n';
        csvContent += `2024-01-01,支出,餐飲,早餐,美味的蛋餅,Food,TWD,80\n`;

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

    const handleExportClick = () => {
        setIsExportModalOpen(true);
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
                    setMessage(`匯入失敗(${file.name}): ${err.message}`);
                } finally {
                    setLoading(false);
                }
            },
            error: (err) => {
                console.error("CSV Parse Error", err);
                setMessage(`CSV 解析錯誤(${file.name}): ${err.message}`);
                setLoading(false);
            }
        });
    };

    const processImportedData = async (rows: any[], fileName: string) => {
        const validRows: any[] = [];
        for (const row of rows) {
            if (Object.values(row).some((val: any) => typeof val === 'string' && val.includes('=== REFERENCE DATA'))) {
                break;
            }
            // Basic validation based on new order: Date, Type, Category, Subcategory, Note, Tags, Currency, Amount
            if (row['Date'] && row['Type'] && row['Amount'] && row['Category']) {
                validRows.push(row);
            }
        }

        if (validRows.length === 0) {
            throw new Error('找不到有效資料或是檔案格式錯誤。請確保使用正確的範本。');
        }

        if (validRows.length > 500) {
            throw new Error(`單次匯入限制 500 筆交易(目前: ${validRows.length} 筆)。請分割檔案後再試。`);
        }

        let successCount = 0;
        let failCount = 0;

        for (const row of validRows) {
            try {
                // Parse Basic Fields
                const dateStr = row['Date']; // YYYY-MM-DD
                const amount = parseFloat(row['Amount']);
                const typeRaw = row['Type'].trim();
                const type = (typeRaw === '收入' || typeRaw === 'income') ? 'income' : 'expense';

                if (isNaN(amount)) throw new Error(`Invalid amount`);

                // Map Category
                const catName = row['Category'].trim();
                const matchedCategory = categories.find(c => c.name === catName);
                if (!matchedCategory) {
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
                        const uncategorized = subcategories.find(s => s.parentId === matchedCategory.id && s.name === 'Uncategorized');
                        subId = uncategorized?.id || '';
                    }
                } else {
                    const uncategorized = subcategories.find(s => s.parentId === matchedCategory.id && s.name === 'Uncategorized');
                    subId = uncategorized?.id || '';
                }

                // Map Tags
                const tagIds: string[] = [];
                const tagNamesStr = row['Tags'] || row['Project Tags'];
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
                    amount: Math.abs(amount),
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

        setMessage(`匯入完成(${fileName})！成功: ${successCount} 筆，失敗 / 略過: ${failCount} 筆。`);
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

                <div className="mt-8">
                    <h3 className="text-sm font-bold text-gray-500 mb-3 px-1 uppercase">
                        資料管理
                    </h3>
                    <div className="space-y-3">
                        <button
                            onClick={handleExportClick}
                            className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                        >
                            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-xl">
                                📤
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900">匯出交易記錄 (CSV)</h3>
                                <p className="text-xs text-gray-500">選擇日期範圍發送至 Email</p>
                            </div>
                        </button>

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
                                📥
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900">匯入交易記錄 (CSV)</h3>
                                <p className="text-xs text-gray-500">支援 UTF-8 格式，單次上限 500 筆</p>
                            </div>
                        </button>

                        <button
                            onClick={() => navigate('/settings/batch-reclassify')}
                            className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                        >
                            <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-xl">
                                🔄
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900">批次變更交易分類</h3>
                                <p className="text-xs text-gray-500">搜尋並批次修改交易的分類</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setIsBatchDeleteModalOpen(true)}
                            className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                        >
                            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-xl">
                                🗑️
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-gray-900">批次刪除交易</h3>
                                <p className="text-xs text-gray-500">按日期區間移除交易記錄</p>
                            </div>
                        </button>
                    </div>
                </div>

                {message && (
                    <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-xl text-sm text-center">
                        {message}
                    </div>
                )}

                {user && (
                    <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
                        <span>Logged in as: {user.email}</span>
                        {user.email === 'alfred.mc.hsu@gmail.com' && (
                            <button
                                onClick={() => navigate('/settings/admin')}
                                className="opacity-40 hover:opacity-100 transition-opacity"
                            >
                                ⚙️
                            </button>
                        )}
                    </div>
                )}
            </div>

            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
            />

            <BatchDeleteModal
                isOpen={isBatchDeleteModalOpen}
                onClose={() => setIsBatchDeleteModalOpen(false)}
            />
        </motion.div>
    );
};

export default Settings;
