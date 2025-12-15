import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { format, parseISO, addMonths, subMonths, isSameMonth, startOfMonth, endOfMonth } from 'date-fns';
import type { Transaction } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

import MonthPicker from './MonthPicker';
import { convertAmountToTWD } from '../utils/currency';

const Dashboard: React.FC = () => {
    const { transactions, categories, subcategories, projectTags, openModal, deleteTransaction, setTransactionFilter } = useAppContext();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // Sync context filter with local month
    React.useEffect(() => {
        setTransactionFilter({
            start: startOfMonth(currentMonth),
            end: endOfMonth(currentMonth)
        });
    }, [currentMonth, setTransactionFilter]);

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    // Filter transactions for the selected month (show all types)
    const monthlyTransactions = useMemo(() => {
        return transactions.filter((t) => {
            const tDate = new Date(t.date);
            return isSameMonth(tDate, currentMonth);
        });
    }, [transactions, currentMonth]);

    // Calculate total (Net: Income - Expense)
    const totalAmount = useMemo(() => {
        return monthlyTransactions.reduce((acc, t) => {
            const amountTWD = convertAmountToTWD(t.amount, t.currency || 'TWD');
            return t.type === 'income' ? acc + amountTWD : acc - amountTWD;
        }, 0);
    }, [monthlyTransactions]);


    // Group by Date for List
    const groupedTransactions = useMemo(() => {
        const groups: { [key: string]: { transactions: Transaction[]; total: number } } = {};
        monthlyTransactions.forEach((t) => {
            const dateStr = format(new Date(t.date), 'yyyy-MM-dd');
            if (!groups[dateStr]) groups[dateStr] = { transactions: [], total: 0 };
            groups[dateStr].transactions.push(t);
            // Daily total (Net)
            const amountTWD = convertAmountToTWD(t.amount, t.currency || 'TWD');
            groups[dateStr].total += t.type === 'income' ? amountTWD : -amountTWD;
        });
        // Sort dates descending
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [monthlyTransactions]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-screen bg-gray-50"
        >
            {/* Header Area */}
            <div className="bg-white z-10 sticky top-0 px-4 py-3 border-b border-gray-100">
                <div className="flex justify-between items-center relative">
                    {/* Left: Close/Back (Placeholder to match screenshot) */}
                    {/* Left: Empty placeholder to keep layout balanced if needed, or just nothing. 
                        User asked to remove X. Let's leave an empty div if alignment is needed, 
                        BUT the request says "remove/hide". 
                        The header uses 'justify-between'. If I remove left item, Center Date Pill might not be centered relative to screen.
                        However, justify-between with 3 items puts one left, one center, one right.
                        If I remove left, it becomes start-end spread? No, justify-between with 2 items pushes them to edges.
                        Let's check code:
                        <div className="flex justify-between items-center relative">
                           {Left} {Center} {Right}
                        </div>
                        If I remove Left, Center will be on far Left?
                        Wait, Date Pill is NOT absolute center. It's flex item.
                        To keep Date Pill centered-ish or consistent, I should probably keep an invisible spacer or make it hidden.
                        User said "hide or remove".
                        I'll replace it with an invisible div of same size to maintain layout balance if that was the intent,
                        OR just remove.
                        Given "justify-between" on parent line 57, removing the first child will make the Date Pill the first child, so it will go to the LEFT.
                        The Right total amount will go to RIGHT.
                        The user probably wants the Date Pill centered?
                        Actually, looking at the code:
                        Line 57: flex justify-between items-center relative
                        If I remove the first button, we have 2 items. Left=DatePill, Right=Total.
                        DatePill will be on left edge. That might look weird if it was centered before.
                        Let's see the previous code again.
                        It had 3 items: X Button, Date Pill, Total Amount.
                        It was: | X | Date | Total |  (roughly spread)
                        If I replace X with <div className="w-8" /> it keeps the spacing.
                        I'll do that.
                    */}
                    <div className="w-8"></div>

                    {/* Center: Date Pill */}
                    <div className="flex items-center bg-gray-100 rounded-full px-1 py-1">
                        <button onClick={handlePrevMonth} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <button
                            onClick={() => setIsDatePickerOpen(true)}
                            className="text-sm font-bold text-gray-600 px-2 min-w-[80px] text-center"
                        >
                            {format(currentMonth, 'yyyy/MM')}
                        </button>
                        <button onClick={handleNextMonth} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    </div>

                    {/* Right: Total Amount (Net) */}
                    <div className={`font-bold text-lg ${totalAmount >= 0 ? 'text-green-600' : 'text-[#E3B873]'}`}>
                        ${Math.abs(totalAmount).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Transaction List */}
            <div className="flex-1 overflow-y-auto px-4 pb-24 pt-2">
                <AnimatePresence mode='popLayout'>
                    {groupedTransactions.map(([dateStr, { transactions: trans, total }], groupIndex) => (
                        <motion.div
                            key={dateStr}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: groupIndex * 0.05 }}
                            className="mb-1"
                        >
                            {/* Date Header Group */}
                            <div className="flex flex-col">
                                {/* Date Strip & Header */}
                                <div className="flex items-center justify-between py-2 pl-4 pr-2 bg-[#FDFBF7] border-l-4 border-[#E0D0B0] mb-[1px]">
                                    <span className="text-gray-500 text-sm font-medium">
                                        {format(parseISO(dateStr), 'yyyy/MM/dd')}
                                    </span>
                                    <span className={`${total > 0 ? 'text-green-600' : 'text-[#E3B873]'} font-bold text-sm`}>
                                        ${Math.abs(total).toLocaleString()}
                                    </span>
                                </div>

                                {/* Transactions */}
                                <div className="border-l-4 border-[#E0D0B0]">
                                    {trans.map((t, index) => {
                                        const category = categories.find(c => c.id === t.categoryId);
                                        const subcategory = subcategories.find(s => s.id === t.subcategoryId);
                                        const isIncome = t.type === 'income';

                                        // Project Tag (Show only the first one)
                                        const projectTagId = t.tags && t.tags.length > 0 ? t.tags[0] : null;
                                        const projectTag = projectTagId ? projectTags.find(p => p.id === projectTagId) : null;

                                        return (
                                            <div key={t.id} className="relative overflow-hidden group mb-[1px]">
                                                {/* Background Delete Button */}
                                                <div className="absolute inset-0 bg-red-500 flex items-center justify-end px-4 z-0">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm('確定要刪除這筆交易嗎？')) {
                                                                deleteTransaction(t.id);
                                                            }
                                                        }}
                                                        className="text-white font-medium flex items-center gap-1"
                                                    >
                                                        <span>🗑️</span>
                                                        <span className="text-xs">刪除</span>
                                                    </button>
                                                </div>

                                                {/* Foreground Content (Draggable) */}
                                                <motion.div
                                                    drag="x"
                                                    dragConstraints={{ left: -80, right: 0 }}
                                                    dragElastic={{ left: 0.1, right: 0 }}
                                                    onDragEnd={() => {
                                                        // Simple snap logic handled by constraints, but if we want 'swipe to delete' logic:
                                                        // For now, constraints allow revealing the button. User taps button to delete.
                                                    }}
                                                    whileTap={{ cursor: 'grabbing' }}
                                                    onClick={() => openModal(t)}
                                                    className={`relative z-10 flex items-center px-4 py-3 bg-[#F9F9F9] ${index !== trans.length - 1 ? 'border-b border-gray-100' : ''}`}
                                                    style={{ x: 0 }}
                                                >
                                                    {/* Icon */}
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl mr-4 shrink-0 shadow-sm"
                                                        style={{ backgroundColor: category?.color || '#eee' }}
                                                    >
                                                        <span className="text-white drop-shadow-md filter">{category?.icon}</span>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="text-gray-700 font-bold text-base truncate">
                                                                {subcategory?.name || category?.name}
                                                            </span>
                                                            {projectTag && (
                                                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-600 text-[10px] font-medium whitespace-nowrap border border-blue-200 shrink-0">
                                                                    <span>🏷️</span>
                                                                    {projectTag.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {t.note && (
                                                            <div className="text-gray-400 text-xs truncate mt-0.5">
                                                                {t.note}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Amount */}
                                                    <div className={`font-bold text-base ml-2 ${isIncome ? 'text-green-600' : 'text-gray-500'}`}>
                                                        {isIncome ? '+' : ''}${t.amount.toLocaleString()}
                                                    </div>
                                                </motion.div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {groupedTransactions.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-60 text-gray-300">
                        <span className="text-6xl mb-4 opacity-50">📅</span>
                        <span>No records found</span>
                    </div>
                )}
            </div>

            <MonthPicker
                isOpen={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
                currentDate={currentMonth}
                onSelect={setCurrentMonth}
            />
        </motion.div>
    );
};

export default Dashboard;
