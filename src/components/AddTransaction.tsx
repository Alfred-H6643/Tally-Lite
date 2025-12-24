import React, { useState, useEffect } from 'react';
import NumberPad from './NumberPad';
import { useAppContext } from '../context/AppContext';
import type { Transaction, TransactionType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, subDays } from 'date-fns';

interface AddTransactionProps {
    onClose: () => void;
    initialTransaction?: Transaction;
}

const ITEMS_PER_PAGE = 10;

const AddTransaction: React.FC<AddTransactionProps> = ({ onClose, initialTransaction }) => {
    const {
        addTransaction,
        updateTransaction,
        deleteTransaction,
        categories,
        subcategories,
        projectTags,
        initialDate,
        addSubcategory
    } = useAppContext();

    // Initialize State from initialTransaction or default
    const [amount, setAmount] = useState(initialTransaction ? initialTransaction.amount.toString() : '0');

    // Selection State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initialTransaction?.categoryId || null);
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(initialTransaction?.subcategoryId || null);
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(initialTransaction?.tags || []);

    // UI State
    const [note, setNote] = useState(initialTransaction?.note || '');
    const [type, setType] = useState<TransactionType>(initialTransaction?.type || 'expense');
    const [date, setDate] = useState(() => {
        if (initialTransaction) return format(new Date(initialTransaction.date), 'yyyy-MM-dd');
        if (initialDate) return format(initialDate, 'yyyy-MM-dd');
        return new Date().toISOString().split('T')[0];
    });

    const handlePrevDay = () => {
        const currentDate = new Date(date);
        setDate(format(subDays(currentDate, 1), 'yyyy-MM-dd'));
    };

    const handleNextDay = () => {
        const currentDate = new Date(date);
        setDate(format(addDays(currentDate, 1), 'yyyy-MM-dd'));
    };
    const [showProjectSelector, setShowProjectSelector] = useState(false);

    // Currency State
    const [currency, setCurrency] = useState(initialTransaction?.currency || 'TWD');

    // Grid State
    const [viewMode, setViewMode] = useState<'categories' | 'subcategories'>('categories');
    const [page, setPage] = useState(0);

    // Subcategory Creation State
    const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
    const [newSubcategoryName, setNewSubcategoryName] = useState('');

    const handleNumberClick = (num: string) => {
        // Map 'plus'/'minus' to symbols
        const val = num === 'plus' ? '+' : num === 'minus' ? '-' : num;

        if (amount === '0' && val !== '.') {
            // Don't append operator to 0 if it's the first char, unless it's minus(?) - simplicity: replace 0
            // But if input is '+', "0+" is weird. Let's allow replacing 0 with number, or appending operator to valid number.
            if (val === '+' || val === '-') {
                setAmount(prev => prev + val);
            } else {
                setAmount(val);
            }
        } else {
            // Prevent multiple dots in specific number segment is hard with simple string, simplified check:
            // Just prevent double operators or multiple dots in sequence for now.
            const lastChar = amount.slice(-1);
            const isOperator = (char: string) => char === '+' || char === '-';

            if (val === '.') {
                // simple check: if last char is dot or operator, ignore
                if (lastChar === '.' || isOperator(lastChar)) return;
                // strict check: find last operator, check if dot exists after it
                const parts = amount.split(/[\+\-]/);
                const currentNum = parts[parts.length - 1];
                if (currentNum.includes('.')) return;
            }

            if (isOperator(val)) {
                if (isOperator(lastChar)) return; // Don't allow ++ or +-
                if (lastChar === '.') return; // Don't allow .+
            }

            setAmount((prev) => prev + val);
        }
    };

    const handleDelete = () => {
        setAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    };

    const handleConfirm = () => {
        // 1. Check if it needs calculation
        if (amount.includes('+') || amount.includes('-')) {
            try {
                // Safe evaluation
                // Remove trailing operators
                let expr = amount;
                if (['+', '-', '.'].includes(expr.slice(-1))) {
                    expr = expr.slice(0, -1);
                }

                // Function to safely evaluate math expression string "100+20-5"
                // const result = new Function('return ' + expr)(); // eval-like, maybe too risky? 
                // Let's implement simple parser since we only have + and -

                // Split by operators but keep them
                // const parts = expr.split(/([\+\-])/);
                // Actually, let's just use a simple reducer approach

                // Better approach: replace sub-expressions
                // Or simply:
                const result = expr.split('+').reduce((sum, term) => {
                    return sum + term.split('-').reduce((subSum, subTerm, idx) => {
                        const val = parseFloat(subTerm) || 0;
                        return idx === 0 ? subSum + val : subSum - val;
                    }, 0);
                }, 0);

                // Round to reasonable decimals (e.g. 2)
                const finalVal = Math.round(result * 100) / 100;
                setAmount(finalVal.toString());
                return; // Stop here to let user see result
            } catch (e) {
                console.error("Calculation error", e);
                return;
            }
        }

        if (!selectedCategoryId) {
            alert('Please select a category');
            return;
        }

        const val = parseFloat(amount);
        if (val === 0) return;

        const transactionData = {
            id: initialTransaction ? initialTransaction.id : uuidv4(),
            amount: val,
            currency: currency,
            categoryId: selectedCategoryId,
            subcategoryId: selectedSubcategoryId || '',
            tags: selectedProjectIds,
            date: new Date(date),
            note,
            type,
            createdAt: initialTransaction ? initialTransaction.createdAt : new Date(),
            updatedAt: new Date(),
        };

        if (initialTransaction) {
            updateTransaction(transactionData);
        } else {
            addTransaction(transactionData);
        }

        onClose();
    };

    const toggleProject = (projectId: string) => {
        setSelectedProjectIds(prev =>
            prev.includes(projectId) ? prev.filter(p => p !== projectId) : [...prev, projectId]
        );
    };

    const handleAddSubcategory = () => {
        if (!newSubcategoryName.trim() || !selectedCategoryId) return;

        const newSubcategoryData = {
            id: uuidv4(),
            name: newSubcategoryName.trim(),
            parentId: selectedCategoryId,
            order: (subcategories.filter(s => s.parentId === selectedCategoryId).length + 1),
            isHidden: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        addSubcategory(newSubcategoryData);

        // Auto select new subcategory
        setSelectedSubcategoryId(newSubcategoryData.id);

        // Close modal
        setIsCreatingSubcategory(false);
        setNewSubcategoryName('');
    };


    // Keyboard Support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if user is typing in the note input
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key >= '0' && e.key <= '9') {
                handleNumberClick(e.key);
            } else if (e.key === '.') {
                handleNumberClick('.');
            } else if (e.key === '+') {
                handleNumberClick('plus');
            } else if (e.key === '-') {
                handleNumberClick('minus');
            } else if (e.key === 'Backspace') {
                handleDelete();
            } else if (e.key === 'Enter') {
                handleConfirm();
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [amount, note]); // Dependencies for closure values if needed, though mostly using functional updates or stable refs is better. 
    // handleNumberClick uses amount, so we strictly need it in deps, or use functional updates everywhere.
    // handleNumberClick ALREADY uses setAmount(prev => ...), except for the validation logic.
    // The validation logic (isOperator etc) uses 'amount' state. So we need 'amount' in dependency array.


    // Filtered Content Logic
    const currentCategories = categories
        .filter((c) => !c.isHidden) // Show all visible categories
        .sort((a, b) => {
            // Sort by Type first (Expense -> Income)
            if (a.type !== b.type) {
                return a.type === 'expense' ? -1 : 1;
            }
            // Then by Order
            return (a.order || 0) - (b.order || 0);
        });

    const totalPages = Math.ceil(currentCategories.length / ITEMS_PER_PAGE);
    const visibleCategories = currentCategories.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

    const currentSubcategories = selectedCategoryId
        ? subcategories.filter((s) => s.parentId === selectedCategoryId)
        : [];

    return (
        <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-50 flex flex-col bg-gray-50 overflow-hidden"
        >
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-2 bg-white border-b border-gray-100 shrink-0 relative">
                {/* Left Slot: Close Button */}
                <div className="flex-1 flex justify-start">
                    <button onClick={onClose} className="p-2 -ml-2 text-gray-400 active:bg-gray-100 rounded-full transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Center Slot: Date Picker Overlay */}
                <div className="flex items-center bg-gray-100 rounded-full px-1 py-1">
                    <button
                        onClick={handlePrevDay}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>

                    <div
                        className="relative cursor-pointer px-2 min-w-[100px] text-center"
                        onClick={() => {
                            const input = document.getElementById('date-trigger') as HTMLInputElement;
                            if (input && 'showPicker' in HTMLInputElement.prototype) {
                                try {
                                    input.showPicker();
                                } catch (e) {
                                    console.warn('showPicker failed', e);
                                }
                            }
                        }}
                    >
                        <div className="text-sm font-bold text-gray-600 flex items-center justify-center gap-1 pointer-events-none relative z-10">
                            {format(new Date(date), 'yyyy/MM/dd')}
                        </div>
                        <input
                            id="date-trigger"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 appearance-none bottom-0 top-0 left-0 right-0"
                            style={{
                                WebkitAppearance: 'none',
                                display: 'block'
                            }}
                        />
                    </div>

                    <button
                        onClick={handleNextDay}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>

                {/* Right Slot: Trash Button / Spacer */}
                <div className="flex-1 flex justify-end">
                    {initialTransaction ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // 使用 setTimeout 避免 confirm 視窗與動畫或事件循環衝突
                                setTimeout(() => {
                                    if (window.confirm('確定要刪除這筆交易嗎？')) {
                                        deleteTransaction(initialTransaction.id);
                                        onClose();
                                    }
                                }, 10);
                            }}
                            className="p-2 text-red-500 active:bg-red-50 rounded-full transition-colors"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                            </svg>
                        </button>
                    ) : (
                        <div className="w-10"></div>
                    )}
                </div>
            </div>


            {/* Amount & Project Button */}
            <div className="bg-white px-6 py-2 flex justify-between items-center shrink-0 z-10">
                <div className="flex flex-col items-center gap-1">
                    <div className="relative">
                        <button
                            onClick={() => setShowProjectSelector(!showProjectSelector)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm transition-all duration-200 ${selectedProjectIds.length > 0
                                ? 'bg-blue-500 shadow-blue-200'
                                : 'bg-gray-300'
                                }`}
                        >
                            <span className="text-xl">🏷️</span>
                        </button>
                        {selectedProjectIds.length > 0 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                                <span className="text-[9px] font-bold text-white">{selectedProjectIds.length}</span>
                            </div>
                        )}
                    </div>
                    <span className={`text-[10px] font-medium transition-colors ${selectedProjectIds.length > 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                        {selectedProjectIds.length > 0 ? '已選擇' : '專案標籤'}
                    </span>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-gray-400 text-sm font-medium">{currency}</span>
                    <div className="text-5xl font-medium text-gray-800 tracking-tight">
                        ${amount}
                    </div>
                </div>
            </div>

            {/* Project Tags List (Blue Box Position) - Collapsible */}
            <AnimatePresence>
                {showProjectSelector && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-white px-4 overflow-hidden shrink-0 border-b border-gray-50"
                    >
                        <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 scrollbar-hide">
                            {projectTags
                                .filter(p => p.status === 'active')
                                .sort((a, b) => a.order - b.order)
                                .map(project => (
                                    <button
                                        key={project.id}
                                        onClick={() => toggleProject(project.id)}
                                        className={`px-4 py-1.5 rounded-2xl text-xs font-medium whitespace-nowrap transition-all border ${selectedProjectIds.includes(project.id)
                                            ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                                            : 'bg-white text-gray-500 border-gray-200'
                                            }`}
                                    >
                                        {project.name}
                                    </button>
                                ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Category Grid / Subcategories - No Animation for Speed */}
            <div className="bg-white relative flex flex-col pt-2 shrink-0">
                {viewMode === 'categories' ? (
                    <div className="flex flex-col">
                        {/* Categories Grid (Swipeable) */}
                        <motion.div
                            key={page}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            onDragEnd={(_, { offset }) => {
                                const swipe = offset.x;
                                if (swipe < -50 && page < totalPages - 1) {
                                    setPage(p => p + 1);
                                } else if (swipe > 50 && page > 0) {
                                    setPage(p => p - 1);
                                }
                            }}
                            className="grid grid-cols-5 gap-y-4 px-4 py-2 min-h-[160px] touch-pan-y"
                        >
                            {visibleCategories.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => {
                                        setSelectedCategoryId(c.id);
                                        setType(c.type); // Auto-set transaction type based on category
                                        // Auto-select 'Uncategorized' if exists, else first
                                        const subs = subcategories.filter(s => s.parentId === c.id);
                                        const uncategorized = subs.find(s => s.name === 'Uncategorized') || subs[0];
                                        setSelectedSubcategoryId(uncategorized?.id || null);
                                        setViewMode('subcategories');
                                    }}
                                    className="flex flex-col items-center gap-1 active:opacity-70 transition-opacity"
                                >
                                    <div
                                        className="w-11 h-11 rounded-full flex items-center justify-center text-xl"
                                        style={{ backgroundColor: `${c.color}20`, color: c.color }}
                                    >
                                        <span className="">
                                            {c.icon}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-medium truncate w-full text-center text-gray-600">
                                        {c.name}
                                    </span>
                                </button>
                            ))}
                        </motion.div>
                    </div>
                ) : (
                    <div className="p-4">
                        <div className="grid grid-cols-5 gap-y-4 min-h-[160px]">
                            {/* Back Button */}
                            <button
                                onClick={() => setViewMode('categories')}
                                className="flex flex-col items-center gap-1 active:opacity-70 transition-opacity"
                            >
                                <div className="w-11 h-11 rounded-full flex items-center justify-center bg-gray-100 text-gray-500">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
                                    </svg>
                                </div>
                                <span className="text-[10px] font-medium text-gray-500">
                                    返回
                                </span>
                            </button>

                            {/* Subcategories */}
                            {currentSubcategories.map((sub) => (
                                <button
                                    key={sub.id}
                                    onClick={() => setSelectedSubcategoryId(sub.id)}
                                    className="flex flex-col items-center gap-1 active:opacity-70 transition-opacity"
                                >
                                    <div
                                        className={`w-11 h-11 rounded-full flex items-center justify-center text-base transition-all ${selectedSubcategoryId === sub.id
                                            ? 'shadow-lg ring-2 ring-offset-1'
                                            : ''
                                            }`}
                                        style={{
                                            backgroundColor: selectedSubcategoryId === sub.id ? '#666' : '#f3f4f6',
                                            color: selectedSubcategoryId === sub.id ? 'white' : '#4b5563'
                                        }}
                                    >
                                        {sub.name.charAt(0)}
                                    </div>
                                    <span className={`text-[10px] font-medium truncate w-full text-center ${selectedSubcategoryId === sub.id ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                                        {sub.name}
                                    </span>
                                </button>
                            ))}

                            {/* Add Subcategory Button */}
                            <button
                                onClick={() => setIsCreatingSubcategory(true)}
                                className="flex flex-col items-center gap-1 active:opacity-70 transition-opacity"
                            >
                                <div className="w-11 h-11 rounded-full flex items-center justify-center bg-gray-100 text-blue-500 border-2 border-dashed border-blue-300">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </div>
                                <span className="text-[10px] font-medium text-blue-500">
                                    新增
                                </span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination Dots (Green Box Position - Below Grid) */}
            {viewMode === 'categories' && totalPages > 1 && (
                <div className="flex justify-center gap-1.5 py-3 bg-white shrink-0">
                    {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setPage(i)}
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${page === i ? 'bg-gray-600' : 'bg-gray-200'}`}
                        />
                    ))}
                </div>
            )}

            {/* Note Input (With more whitespace above) */}
            <div className="bg-white flex flex-col gap-2 pb-4 pt-1 shrink-0">
                <div className="px-4 flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center text-gray-400">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </div>
                    <input
                        type="text"
                        placeholder="點選以編輯註記 (Click to edit note)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="flex-1 bg-transparent text-base text-gray-600 placeholder-gray-400 outline-none h-8"
                    />
                </div>
            </div>

            {/* Flexible Whitespace */}
            <div className="flex-1 bg-gray-50" />

            {/* Subcategory Creation Modal */}
            <AnimatePresence>
                {isCreatingSubcategory && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl p-4 w-full max-w-xs shadow-xl"
                        >
                            <h3 className="text-lg font-bold mb-4 text-center">新增子分類</h3>
                            <input
                                type="text"
                                value={newSubcategoryName}
                                onChange={(e) => setNewSubcategoryName(e.target.value)}
                                placeholder="輸入子分類名稱"
                                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-base mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setIsCreatingSubcategory(false);
                                        setNewSubcategoryName('');
                                    }}
                                    className="flex-1 h-10 rounded-xl bg-gray-100 text-gray-600 font-medium"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleAddSubcategory}
                                    disabled={!newSubcategoryName.trim()}
                                    className="flex-1 h-10 rounded-xl bg-blue-500 text-white font-medium disabled:opacity-50 disabled:bg-gray-300"
                                >
                                    新增
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Number Pad */}
            <div className="shrink-0 bg-[#1C1C1E]">
                <NumberPad
                    onNumberClick={handleNumberClick}
                    onDelete={handleDelete}
                    onConfirm={handleConfirm}
                    currency={currency}
                    onCurrencyChange={setCurrency}
                />
            </div>
        </motion.div>
    );
};

export default AddTransaction;
