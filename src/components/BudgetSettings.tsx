import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import type { Budget, TransactionType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from './ConfirmDialog';

const BudgetSettings: React.FC = () => {
    const {
        categories,
        subcategories,
        budgets,
        addBudget,
        updateBudget,
        deleteBudget,
        copyBudgetsToYear
    } = useAppContext();

    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [activeTab, setActiveTab] = useState<TransactionType>('expense');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit' | 'copy'>('add');
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    const [formCategoryId, setFormCategoryId] = useState('');
    const [formSubcategoryId, setFormSubcategoryId] = useState('');

    const [formAmount, setFormAmount] = useState('0');
    const [budgetInputMode, setBudgetInputMode] = useState<'yearly' | 'monthly'>('yearly');
    const [monthlyInputs, setMonthlyInputs] = useState<string[]>(Array(12).fill('0'));
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{ title: string, message: string, onConfirm: () => void }>({
        title: '',
        message: '',
        onConfirm: () => { }
    });

    // 獲取當前年度的可用年度列表（當前年度 ± 2年）
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        budgets.forEach(b => years.add(b.year));
        // 至少包含當前年度和前後各一年
        for (let y = currentYear - 1; y <= currentYear + 2; y++) {
            years.add(y);
        }
        return Array.from(years).sort((a, b) => a - b);
    }, [budgets, currentYear]);

    // 獲取當前年度和標籤的分類
    const currentTypeCategories = useMemo(() => {
        return categories
            .filter(c => c.type === activeTab && !c.isHidden)
            .sort((a, b) => a.order - b.order);
    }, [categories, activeTab]);

    // 獲取指定分類和年度的預算
    const getBudget = (categoryId: string, subcategoryId?: string): Budget | undefined => {
        return budgets.find(b =>
            b.year === selectedYear &&
            b.categoryId === categoryId &&
            (subcategoryId ? b.subcategoryId === subcategoryId : !b.subcategoryId)
        );
    };

    // 切換分類展開狀態
    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };





    // 打開編輯預算 Modal
    const openEditBudgetModal = (budget: Budget) => {
        setModalMode('edit');
        setFormCategoryId(budget.categoryId || '');
        setFormSubcategoryId(budget.subcategoryId || '');
        setFormAmount(budget.amount.toString());

        if (budget.monthlyAmounts && budget.monthlyAmounts.length === 12) {
            setBudgetInputMode('monthly');
            setMonthlyInputs(budget.monthlyAmounts.map(val => val.toString()));
        } else {
            setBudgetInputMode('yearly');
            // If switching to monthly, we should probably pre-fill with average? 
            // Or just init as 0. Let's init as avg logic in the UI render or useEffect if needed.
            // For now, reset to average of current amount
            const avg = Math.round(budget.amount / 12);
            setMonthlyInputs(Array(12).fill(avg.toString()));
        }

        setEditingBudget(budget);
        setIsModalOpen(true);
    };

    // 打開複製年度預算 Modal
    const openCopyYearModal = () => {
        setModalMode('copy');
        setIsModalOpen(true);
    };

    // 保存預算
    const handleSave = () => {
        let amount = 0;
        let finalMonthlyAmounts: number[] | undefined = undefined;

        if (budgetInputMode === 'yearly') {
            amount = parseFloat(formAmount) || 0;
            if (amount <= 0) {
                alert('預算金額必須大於 0');
                return;
            }
        } else {
            // Monthly Mode
            const months = monthlyInputs.map(v => parseFloat(v) || 0);
            amount = months.reduce((a, b) => a + b, 0);
            if (amount <= 0) {
                alert('預算總額必須大於 0');
                return;
            }
            finalMonthlyAmounts = months;
        }

        if (!formCategoryId) {
            alert('請選擇分類');
            return;
        }


        if (modalMode === 'edit' && editingBudget) {
            updateBudget({
                ...editingBudget,
                amount,
                ...(finalMonthlyAmounts ? { monthlyAmounts: finalMonthlyAmounts } : {}),
                updatedAt: new Date()
            });
        } else {
            addBudget({
                id: uuidv4(),
                year: selectedYear,
                categoryId: formCategoryId,
                ...(formSubcategoryId ? { subcategoryId: formSubcategoryId } : {}),
                amount,
                ...(finalMonthlyAmounts ? { monthlyAmounts: finalMonthlyAmounts } : {}),
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        setIsModalOpen(false);
    };

    // 刪除預算
    const handleDelete = () => {
        if (!editingBudget) return;

        setConfirmConfig({
            title: '刪除預算',
            message: '確定要刪除此預算嗎？',
            onConfirm: () => {
                deleteBudget(editingBudget.id);
                setIsModalOpen(false);
            }
        });
        setIsConfirmOpen(true);
    };

    // 複製年度預算
    const handleCopyYear = (fromYear: number) => {
        if (selectedYear === fromYear) {
            alert('目標年度不能與來源年度相同');
            return;
        }

        // 檢查目標年度是否已有預算
        const existingBudgets = budgets.filter(b => b.year === selectedYear);
        if (existingBudgets.length > 0) {
            setConfirmConfig({
                title: '覆蓋預算',
                message: `${selectedYear} 年已有 ${existingBudgets.length} 筆預算，確定要覆蓋嗎？`,
                onConfirm: () => {
                    // 刪除現有預算
                    existingBudgets.forEach(b => deleteBudget(b.id));
                    copyBudgetsToYear(fromYear, selectedYear);
                    setIsModalOpen(false);
                }
            });
            setIsConfirmOpen(true);
            return;
        }

        copyBudgetsToYear(fromYear, selectedYear);
        setIsModalOpen(false);
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
                <button onClick={() => navigate('/settings')} className="mr-4 text-gray-500 text-xl" style={{ fontVariant: 'normal' }}>
                    ↩︎
                </button>
                <h1 className="text-lg font-bold flex-1 text-center pr-8">預算設定</h1>
            </div>

            {/* Year Selector */}
            <div className="bg-white p-4 shadow-sm z-10 border-t border-gray-100 relative flex items-center justify-center">
                {/* Center: Year Control */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedYear(y => y - 1)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>

                    <span className="text-lg font-bold text-gray-800 tracking-tight">{selectedYear}</span>

                    <button
                        onClick={() => setSelectedYear(y => y + 1)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>

                {/* Right: Copy Button (Lightning Icon) */}
                <button
                    onClick={openCopyYearModal}
                    className="absolute right-4 p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-full transition-all"
                    title="複製其他年度預算"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                </button>
            </div>

            {/* Tab Selector */}
            <div className="bg-white p-2 shadow-sm z-10 border-t border-gray-100">
                <div className="flex p-1 bg-gray-100 rounded-lg">
                    <button
                        onClick={() => setActiveTab('expense')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'expense' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                            }`}
                    >
                        費用
                    </button>
                    <button
                        onClick={() => setActiveTab('income')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'income' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                            }`}
                    >
                        收入
                    </button>
                </div>
            </div>

            {/* Budget List */}
            <div className="flex-1 overflow-y-auto p-4 pb-24">
                <div className="space-y-3">
                    {currentTypeCategories.map(category => {
                        // Calculate aggregated budget for this category
                        const categorySubBudgets = budgets.filter(b =>
                            b.categoryId === category.id &&
                            b.subcategoryId &&
                            b.year === selectedYear
                        );
                        const categoryTotalBudget = categorySubBudgets.reduce((sum, b) => sum + b.amount, 0);

                        const categorySubcategories = subcategories.filter(s => s.parentId === category.id);
                        const isExpanded = expandedCategories.has(category.id);

                        return (
                            <div key={category.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                                {/* Category Row */}
                                <div className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div
                                            className="flex items-center gap-3 flex-1 cursor-pointer"
                                            onClick={() => categorySubcategories.length > 0 && toggleCategory(category.id)}
                                        >
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                                                style={{ backgroundColor: `${category.color}20` }}
                                            >
                                                {category.icon}
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <span className="font-medium text-gray-900">{category.name}</span>
                                                {categoryTotalBudget > 0 ? (
                                                    <span className="text-sm text-green-600 font-medium">
                                                        ${categoryTotalBudget.toLocaleString()} / 年
                                                        <span className="text-gray-400 text-xs ml-2 font-normal">
                                                            (${Math.round(categoryTotalBudget / 12).toLocaleString()} / 月)
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-400">未設定子預算</span>
                                                )}
                                            </div>
                                            {categorySubcategories.length > 0 && (
                                                <motion.div
                                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                                    className="text-gray-400"
                                                >
                                                    ▼
                                                </motion.div>
                                            )}
                                        </div>

                                        {/* Auto-calculated, no edit button for parent */}
                                        <div className="ml-2 px-3 py-1 text-xs text-gray-400 bg-gray-50 rounded-lg">
                                            自動計算
                                        </div>
                                    </div>
                                </div>

                                {/* Subcategories */}
                                <AnimatePresence>
                                    {isExpanded && categorySubcategories.length > 0 && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-gray-100 bg-gray-50"
                                        >
                                            {categorySubcategories.map(sub => {
                                                const subBudget = getBudget(category.id, sub.id);

                                                return (
                                                    <div key={sub.id} className="px-4 py-3 flex items-center justify-between border-b border-gray-100 last:border-b-0">
                                                        <div className="flex-1">
                                                            <span className="text-sm text-gray-700">{sub.name}</span>
                                                            {subBudget ? (
                                                                <div className="text-xs text-green-600 font-medium mt-0.5">
                                                                    ${subBudget.amount.toLocaleString()} / 年
                                                                    <span className="text-gray-400 ml-2 font-normal">
                                                                        (${Math.round(subBudget.amount / 12).toLocaleString()} / 月)
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs text-gray-400 mt-0.5">未設定</div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                if (subBudget) {
                                                                    openEditBudgetModal(subBudget);
                                                                } else {
                                                                    setFormCategoryId(category.id);
                                                                    setFormSubcategoryId(sub.id);
                                                                    setFormAmount('0');
                                                                    setBudgetInputMode('yearly');
                                                                    setMonthlyInputs(Array(12).fill('0'));
                                                                    setModalMode('add');
                                                                    setIsModalOpen(true);
                                                                }
                                                            }}
                                                            className={`px-3 py-1 text-xs rounded-lg ${subBudget
                                                                ? 'text-blue-600 bg-blue-50 border border-blue-100'
                                                                : 'text-gray-600 bg-gray-50 border border-gray-200'
                                                                }`}
                                                        >
                                                            {subBudget ? '編輯' : '設定'}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>

                {currentTypeCategories.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-60 text-gray-300">
                        <span className="text-6xl mb-4 opacity-50">💰</span>
                        <span>暫無分類</span>
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setIsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {modalMode === 'copy' ? (
                                <>
                                    <h3 className="text-lg font-bold mb-4">複製年度預算</h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        選擇要複製的來源年度：
                                    </p>
                                    <div className="space-y-2 mb-6">
                                        {availableYears
                                            .filter(y => y !== selectedYear)
                                            .map(year => (
                                                <button
                                                    key={year}
                                                    onClick={() => handleCopyYear(year)}
                                                    className="w-full py-3 text-left px-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                                                >
                                                    <span className="font-medium">{year} 年</span>
                                                    <span className="text-sm text-gray-500 ml-2">
                                                        ({budgets.filter(b => b.year === year).length} 筆預算)
                                                    </span>
                                                </button>
                                            ))}
                                    </div>
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="w-full py-2 text-gray-600 bg-gray-100 rounded-lg"
                                    >
                                        取消
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-lg font-bold mb-4">
                                        {modalMode === 'edit' ? '編輯預算' : '設定預算'}
                                    </h3>

                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">分類</label>
                                            <div className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-700">
                                                {categories.find(c => c.id === formCategoryId)?.name || '未選擇'}
                                            </div>
                                        </div>

                                        {formSubcategoryId && (
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">子分類</label>
                                                <div className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-700">
                                                    {subcategories.find(s => s.id === formSubcategoryId)?.name || '未選擇'}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                                                <button
                                                    onClick={() => setBudgetInputMode('yearly')}
                                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${budgetInputMode === 'yearly' ? 'bg-white shadow text-gray-900 border border-gray-100' : 'text-gray-500'
                                                        }`}
                                                >
                                                    年度總額
                                                </button>
                                                <button
                                                    onClick={() => setBudgetInputMode('monthly')}
                                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${budgetInputMode === 'monthly' ? 'bg-white shadow text-gray-900 border border-gray-100' : 'text-gray-500'
                                                        }`}
                                                >
                                                    每月細項
                                                </button>
                                            </div>

                                            {budgetInputMode === 'yearly' ? (
                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-1">年度預算金額</label>
                                                    <input
                                                        type="number"
                                                        value={formAmount}
                                                        onChange={(e) => setFormAmount(e.target.value)}
                                                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                        placeholder="0"
                                                        autoFocus
                                                    />
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        平均每月：${Math.round((parseFloat(formAmount) || 0) / 12).toLocaleString()}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                                                        <span className="text-xs text-blue-600">快速填寫</span>
                                                        <button
                                                            onClick={() => setMonthlyInputs(Array(12).fill(monthlyInputs[0] || '0'))}
                                                            className="text-xs bg-white border border-blue-200 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 transition-colors"
                                                        >
                                                            以一月複製到全年
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-y-3 max-h-[300px] overflow-y-auto pr-2">
                                                        {monthlyInputs.map((val, idx) => (
                                                            <div key={idx} className="flex items-center gap-3">
                                                                <label className="text-sm text-gray-500 w-12 font-medium">{idx + 1} 月</label>
                                                                <input
                                                                    type="number"
                                                                    value={val}
                                                                    onChange={e => {
                                                                        const newInputs = [...monthlyInputs];
                                                                        newInputs[idx] = e.target.value;
                                                                        setMonthlyInputs(newInputs);
                                                                    }}
                                                                    className="flex-1 px-3 py-2 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-2">
                                                        <span className="text-sm text-gray-500">年度總計</span>
                                                        <span className="text-lg font-bold text-blue-600 font-mono">
                                                            ${monthlyInputs.reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {modalMode === 'edit' && (
                                            <button
                                                onClick={handleDelete}
                                                className="px-4 py-2 text-red-500 bg-red-50 rounded-lg"
                                            >
                                                刪除
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setIsModalOpen(false)}
                                            className="flex-1 py-2 text-gray-600 bg-gray-100 rounded-lg"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className="flex-1 py-2 text-white bg-blue-500 rounded-lg"
                                        >
                                            儲存
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ConfirmDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
            />
        </motion.div>
    );
};

export default BudgetSettings;
