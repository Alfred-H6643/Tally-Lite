import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import type { Transaction } from '../types';
import CategorySubcategoryPicker from './CategorySubcategoryPicker';
import ConfirmDialog from './ConfirmDialog';

const BatchReclassify: React.FC = () => {
    const navigate = useNavigate();
    const { transactions, categories, subcategories, projectTags, batchUpdateTransactions } = useAppContext();

    // Search filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
    const [selectedProjectTagId, setSelectedProjectTagId] = useState('');

    // Results state
    const [searchResults, setSearchResults] = useState<Transaction[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Execution state
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [targetCategory, setTargetCategory] = useState('');
    const [targetSubcategory, setTargetSubcategory] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionResult, setExecutionResult] = useState<{ success: boolean; count: number } | null>(null);

    // Get available subcategories based on selected category
    const availableSubcategories = useMemo(() => {
        if (!selectedCategoryId) return [];
        return subcategories.filter(s => s.parentId === selectedCategoryId);
    }, [selectedCategoryId, subcategories]);

    const handleSearch = () => {
        let filtered = [...transactions];

        // Date range filter
        if (startDate) {
            const start = new Date(startDate);
            filtered = filtered.filter(t => new Date(t.date) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(t => new Date(t.date) <= end);
        }

        // Category filter
        if (selectedCategoryId) {
            filtered = filtered.filter(t => t.categoryId === selectedCategoryId);
        }

        // Subcategory filter
        if (selectedSubcategoryId) {
            const selectedSubcategory = subcategories.find(s => s.id === selectedSubcategoryId);

            // Special handling for "未分類" - include orphaned transactions
            if (selectedSubcategory && selectedSubcategory.name === '未分類') {
                filtered = filtered.filter(t => {
                    // Include if it matches the selected uncategorized subcategory
                    if (t.subcategoryId === selectedSubcategoryId) return true;

                    // Or if it's an orphaned transaction (subcategoryId doesn't exist)
                    const subExists = subcategories.some(s => s.id === t.subcategoryId);
                    if (!subExists && t.categoryId === selectedCategoryId) return true;

                    return false;
                });
            } else {
                // Normal subcategory filtering
                filtered = filtered.filter(t => t.subcategoryId === selectedSubcategoryId);
            }
        }

        // Project tag filter
        if (selectedProjectTagId) {
            filtered = filtered.filter(t => t.tags && t.tags.includes(selectedProjectTagId));
        }

        setSearchResults(filtered);
        setHasSearched(true);
        setSelectedIds(new Set());
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === searchResults.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(searchResults.map(t => t.id)));
        }
    };

    const handlePickerSelect = (categoryId: string, subcategoryId: string) => {
        setTargetCategory(categoryId);
        setTargetSubcategory(subcategoryId);
        setIsPickerOpen(false);
        setIsConfirmOpen(true);
    };

    const handleConfirmExecute = async () => {
        setIsConfirmOpen(false);
        setIsExecuting(true);

        try {
            const updates = Array.from(selectedIds).map(id => ({
                id,
                data: { categoryId: targetCategory, subcategoryId: targetSubcategory }
            }));

            await batchUpdateTransactions(updates);

            // Show success result instead of immediate navigation
            setIsExecuting(false);
            setExecutionResult({ success: true, count: selectedIds.size });
        } catch (error) {
            console.error('Batch update failed:', error);
            setIsExecuting(false);
            setExecutionResult({ success: false, count: selectedIds.size });
        }
    };

    const handleResultComplete = () => {
        navigate('/settings');
    };

    const targetCategoryName = categories.find(c => c.id === targetCategory)?.name;
    const targetSubcategoryName = subcategories.find(s => s.id === targetSubcategory)?.name;

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
                <button onClick={() => navigate('/settings')} className="mr-4 text-gray-500 text-xl" style={{ fontVariant: 'normal' }}>
                    ↩︎
                </button>
                <h1 className="text-lg font-bold flex-1 text-center pr-8">批次變更交易分類</h1>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-24">
                {/* Search Section */}
                <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
                    <h2 className="text-sm font-bold text-gray-700 mb-3">搜尋條件</h2>

                    {/* Date Range */}
                    <div className="space-y-2 mb-3">
                        <label className="text-xs text-gray-500 block">日期範圍</label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            />
                            <span className="flex items-center text-gray-400">~</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-2 mb-3">
                        <label className="text-xs text-gray-500 block">分類</label>
                        <select
                            value={selectedCategoryId}
                            onChange={(e) => {
                                setSelectedCategoryId(e.target.value);
                                setSelectedSubcategoryId(''); // Reset subcategory when category changes
                            }}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                            <option value="">全部</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Subcategory */}
                    <div className="space-y-2 mb-3">
                        <label className="text-xs text-gray-500 block">子分類</label>
                        <select
                            value={selectedSubcategoryId}
                            onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            disabled={!selectedCategoryId}
                        >
                            <option value="">全部</option>
                            {availableSubcategories.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Project Tag */}
                    <div className="space-y-2 mb-4">
                        <label className="text-xs text-gray-500 block">專案標籤</label>
                        <select
                            value={selectedProjectTagId}
                            onChange={(e) => setSelectedProjectTagId(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                            <option value="">全部</option>
                            {projectTags.map(tag => (
                                <option key={tag.id} value={tag.id}>🏷️ {tag.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search Button */}
                    <button
                        onClick={handleSearch}
                        className="w-full py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 active:scale-[0.98] transition-all"
                    >
                        搜尋
                    </button>
                </div>

                {/* Results Section */}
                {hasSearched && (
                    <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold text-gray-700">
                                搜尋結果 ({searchResults.length} 筆)
                            </h2>
                            {searchResults.length > 0 && (
                                <button
                                    onClick={handleSelectAll}
                                    className="text-xs text-blue-600 font-bold"
                                >
                                    {selectedIds.size === searchResults.length ? '全部取消' : '全選'}
                                </button>
                            )}
                        </div>

                        {searchResults.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <span className="text-4xl mb-2 block">🔍</span>
                                <span className="text-sm">沒有符合條件的交易</span>
                            </div>
                        ) : (
                            <div className="space-y-1 max-h-80 overflow-y-auto">
                                {searchResults.map(t => {
                                    const category = categories.find(c => c.id === t.categoryId);
                                    const subcategory = subcategories.find(s => s.id === t.subcategoryId);
                                    const isSelected = selectedIds.has(t.id);

                                    return (
                                        <div
                                            key={t.id}
                                            onClick={() => toggleSelect(t.id)}
                                            className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                                        >
                                            {/* Checkbox */}
                                            <div className="mr-3 flex items-center justify-center shrink-0">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                                    {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                </div>
                                            </div>

                                            {/* Icon */}
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-lg mr-3 shrink-0"
                                                style={{ backgroundColor: category?.color ? `${category.color}20` : '#eee', color: category?.color }}
                                            >
                                                {category?.icon}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-gray-700 truncate">
                                                        {(!subcategory || subcategory.name === '未分類') ? category?.name : subcategory.name}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {format(new Date(t.date), 'MM/dd')}
                                                    </span>
                                                </div>
                                                {t.note && (
                                                    <div className="text-xs text-gray-400 truncate">{t.note}</div>
                                                )}
                                            </div>

                                            {/* Amount */}
                                            <div className={`font-bold text-sm ml-2 ${t.type === 'income' ? 'text-green-500' : 'text-amber-600'}`}>
                                                {t.type === 'income' ? '+' : ''}${t.amount.toLocaleString()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Action Section */}
                {selectedIds.size > 0 && (
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="text-xs text-gray-500">已選擇</div>
                                <div className="text-2xl font-black text-blue-600">{selectedIds.size} <span className="text-xs font-bold text-gray-400">筆交易</span></div>
                            </div>
                            <button
                                onClick={() => setIsPickerOpen(true)}
                                className="px-6 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 active:scale-[0.98] transition-all shadow-lg shadow-blue-200"
                            >
                                選擇目標分類
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Category Picker */}
            <CategorySubcategoryPicker
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onSelect={handlePickerSelect}
                title="選擇目標分類"
            />

            {/* Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmExecute}
                title="確認批次變更"
                message={`確定要將 ${selectedIds.size} 筆交易移動到「${targetCategoryName} > ${targetSubcategoryName}」嗎？`}
                type="info"
                hideIcon={true}
            />

            {/* Loading & Result Overlay */}
            {(isExecuting || executionResult) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 flex flex-col items-center max-w-sm mx-4">
                        {isExecuting ? (
                            <>
                                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                                <div className="text-gray-700 font-bold">處理中...</div>
                                <div className="text-gray-400 text-sm mt-1">正在更新 {selectedIds.size} 筆交易</div>
                            </>
                        ) : executionResult && (
                            <>
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${executionResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
                                    {executionResult.success ? (
                                        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                </div>
                                <div className={`text-xl font-bold mb-2 ${executionResult.success ? 'text-green-700' : 'text-red-700'}`}>
                                    {executionResult.success ? '變更完成！' : '變更失敗'}
                                </div>
                                <div className="text-gray-600 text-sm mb-6 text-center">
                                    {executionResult.success
                                        ? `已成功變更 ${executionResult.count} 筆交易分類`
                                        : `變更 ${executionResult.count} 筆交易時發生錯誤`
                                    }
                                </div>
                                <button
                                    onClick={handleResultComplete}
                                    className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 active:scale-[0.98] transition-all"
                                >
                                    完成
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default BatchReclassify;
