import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { format, parseISO, addMonths, subMonths, isSameMonth } from 'date-fns';
import type { Transaction } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

import MonthPicker from './MonthPicker';

const Dashboard: React.FC = () => {
    const { transactions, categories, openModal, deleteTransaction } = useAppContext();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

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
            return t.type === 'income' ? acc + t.amount : acc - t.amount;
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
            groups[dateStr].total += t.type === 'income' ? t.amount : -t.amount;
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
                    <button className="w-8 h-8 flex items-center justify-center text-gray-400">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>

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
                                    <span className="text-[#E3B873] font-bold text-sm">
                                        ${total.toLocaleString()}
                                    </span>
                                </div>

                                {/* Transactions */}
                                <div className="border-l-4 border-[#E0D0B0]">
                                    {trans.map((t, index) => {
                                        const category = categories.find(c => c.id === t.categoryId);
                                        const isIncome = t.type === 'income';

                                        return (
                                            <div key={t.id} className="relative overflow-hidden group mb-[1px]">
                                                {/* Background Delete Button */}
                                                <div className="absolute inset-0 bg-red-500 flex items-center justify-end px-4 z-0">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm('Delete this transaction?')) {
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
                                                    dragElastic={0.1}
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
                                                        <div className="text-gray-700 font-bold text-base truncate">
                                                            {category?.name}
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
