import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { format, parseISO, addMonths, subMonths, isSameMonth, startOfMonth, endOfMonth, isToday } from 'date-fns';
import type { Transaction } from '../types';
import { motion } from 'framer-motion';

import MonthPicker from './MonthPicker';
import { convertAmountToTWD } from '../utils/currency';

// --- Memoized Components ---

interface DateHeaderProps {
    dateStr: string;
    income: number;
    expense: number;
    onAddClick: (dateStr: string) => void;
}

const DateHeader = React.memo(({ dateStr, income, expense, onAddClick }: DateHeaderProps) => {
    const handleAdd = useCallback(() => {
        onAddClick(dateStr);
    }, [onAddClick, dateStr]);

    return (
        <div className="flex flex-col relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between py-2 pl-4 pr-3 bg-stone-100 border-b border-gray-100 mb-[1px]">
                <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium flex items-center gap-2 ${isToday(parseISO(dateStr)) ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                        {format(parseISO(dateStr), 'yyyy/MM/dd')}
                        {isToday(parseISO(dateStr)) && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500">
                                <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.62.829.799 1.654 1.38 2.274 1.765a11.255 11.255 0 001.056.581c.01.002.016.002.016.002s.11.02.308-.066l.002-.001.006-.003.018-.008zM10 13a4 4 0 100-8 4 4 0 000 8z" clipRule="evenodd" />
                            </svg>
                        )}
                    </span>
                    <button
                        onClick={handleAdd}
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-[#E3B873] hover:text-white transition-colors"
                    >
                        <span className="text-sm font-bold leading-none">+</span>
                    </button>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    {income > 0 && (
                        <span className="text-green-500 font-medium">
                            +${income.toLocaleString()}
                        </span>
                    )}
                    <span className="text-[#E3B873] font-medium">
                        ${expense.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
});

interface TransactionItemProps {
    t: Transaction;
    category: any;
    subcategory: any;
    projectTag: any;
    isLast: boolean;
    onEditClick: (t: Transaction) => void;
}

const TransactionItem = React.memo(({ t, category, subcategory, projectTag, isLast, onEditClick }: TransactionItemProps) => {
    const isIncome = t.type === 'income';

    const handleEdit = useCallback(() => {
        onEditClick(t);
    }, [onEditClick, t]);

    return (
        <div className="relative overflow-hidden group mb-[1px]">
            <div
                id={`transaction-${t.id}`}
                className={`relative z-10 flex items-center px-4 py-3 bg-[#F9F9F9] ${!isLast ? 'border-b border-gray-100' : ''}`}
            >
                {/* Icon */}
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl mr-4 shrink-0 shadow-sm cursor-pointer active:opacity-70 transition-opacity"
                    style={{ backgroundColor: category?.color ? `${category.color}20` : '#eee', color: category?.color }}
                    onClick={handleEdit}
                >
                    <span className="text-xl">{category?.icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 min-w-0">
                        <span
                            className="text-gray-700 font-bold text-base truncate cursor-pointer hover:underline decoration-gray-400 underline-offset-2"
                            onClick={handleEdit}
                        >
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
                <div className={`font-bold text-base ml-2 ${isIncome ? 'text-green-500' : 'text-[#E3B873]'}`}>
                    {isIncome ? '+' : ''}${t.amount.toLocaleString()}
                </div>
            </div>
        </div>
    );
});

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const {
        transactions,
        categories,
        subcategories,
        projectTags,
        userProfile,
        openModal,
        setTransactionFilter,
        lastModifiedTransactionId,
        clearLastModifiedTransactionId
    } = useAppContext();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // Auto-scroll to last modified transaction
    useEffect(() => {
        if (!lastModifiedTransactionId) return;

        const targetTransaction = transactions.find(t => t.id === lastModifiedTransactionId);
        if (!targetTransaction) return;

        const targetDate = new Date(targetTransaction.date);

        // If not in current month, switch month
        if (!isSameMonth(targetDate, currentMonth)) {
            setCurrentMonth(targetDate);
        }

        // Clear the ID immediately so it doesn't trigger again on subsequent mounts/renders
        clearLastModifiedTransactionId();

        // Delay scroll to allow render
        setTimeout(() => {
            const element = document.getElementById(`transaction-${lastModifiedTransactionId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Optional: Add a flash highlight effect
                element.classList.add('bg-yellow-50');
                setTimeout(() => element.classList.remove('bg-yellow-50'), 2000);
            }
        }, 300); // 300ms delay to ensure month switch render or modal close animation
    }, [lastModifiedTransactionId, transactions, currentMonth, clearLastModifiedTransactionId]);

    // Sync context filter with local month
    useEffect(() => {
        setTransactionFilter({
            start: startOfMonth(currentMonth),
            end: endOfMonth(currentMonth)
        });
    }, [currentMonth, setTransactionFilter]);

    const handlePrevMonth = useCallback(() => setCurrentMonth(subMonths(currentMonth, 1)), [currentMonth]);
    const handleNextMonth = useCallback(() => setCurrentMonth(addMonths(currentMonth, 1)), [currentMonth]);

    // Filter transactions for the selected month (show all types)
    const monthlyTransactions = useMemo(() => {
        return transactions.filter((t) => {
            const tDate = new Date(t.date);
            return isSameMonth(tDate, currentMonth);
        });
    }, [transactions, currentMonth]);

    // Calculate total (Net: Income - Expense)
    // Calculate total (Split: Income, Expense, Net)
    const monthlyTotals = useMemo(() => {
        return monthlyTransactions.reduce((acc, t) => {
            const amountTWD = convertAmountToTWD(t.amount, t.currency || 'TWD');
            if (t.type === 'income') {
                acc.income += amountTWD;
            } else {
                acc.expense += amountTWD;
            }
            acc.net = acc.income - acc.expense;
            return acc;
        }, { income: 0, expense: 0, net: 0 });
    }, [monthlyTransactions]);


    // Group by Date for List
    // Group by Date for List
    const groupedTransactions = useMemo(() => {
        const groups: { [key: string]: { transactions: Transaction[]; income: number; expense: number } } = {};
        monthlyTransactions.forEach((t) => {
            const dateStr = format(new Date(t.date), 'yyyy-MM-dd');
            if (!groups[dateStr]) groups[dateStr] = { transactions: [], income: 0, expense: 0 };
            groups[dateStr].transactions.push(t);

            const amountTWD = convertAmountToTWD(t.amount, t.currency || 'TWD');
            if (t.type === 'income') {
                groups[dateStr].income += amountTWD;
            } else {
                groups[dateStr].expense += amountTWD;
            }
        });
        // Sort dates descending
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [monthlyTransactions]);

    const handleEdit = React.useCallback((t: Transaction) => {
        openModal(t);
    }, [openModal]);

    const handleAddForDate = React.useCallback((dateStr: string) => {
        openModal(undefined, parseISO(dateStr));
    }, [openModal]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full bg-gray-50"
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
                    {/* Left: User Avatar & Name */}
                    <div
                        onClick={() => navigate('/settings/account')}
                        className="flex items-center gap-2 cursor-pointer active:opacity-70 transition-opacity"
                    >
                        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-2xl shadow-sm border border-gray-100">
                            {userProfile.avatar}
                        </div>
                        <span className="text-sm font-bold text-gray-700">
                            {userProfile.displayName}
                        </span>
                    </div>

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
                    {/* Right: Total Amount (Split) */}
                    <div className="flex flex-col items-end text-xs">
                        {monthlyTotals.income > 0 && (
                            <div className="text-green-500 font-medium">
                                <span className="text-[10px] text-gray-400 mr-1">收</span>
                                +${Math.abs(monthlyTotals.income).toLocaleString()}
                            </div>
                        )}
                        <div className="text-[#E3B873] font-medium">
                            <span className="text-[10px] text-gray-400 mr-1">支</span>
                            ${Math.abs(monthlyTotals.expense).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction List */}
            <div className="flex-1 overflow-y-auto px-4 pb-24 pt-2">
                {groupedTransactions.map(([dateStr, { transactions: trans, income, expense }]) => (
                    <div key={dateStr} className="mb-1">
                        <DateHeader
                            dateStr={dateStr}
                            income={income}
                            expense={expense}
                            onAddClick={handleAddForDate}
                        />

                        <div className="">
                            {trans.map((t, index) => {
                                const category = categories.find(c => c.id === t.categoryId);
                                const subcategory = subcategories.find(s => s.id === t.subcategoryId);

                                // Project Tag (Show only the first one)
                                const projectTagId = t.tags && t.tags.length > 0 ? t.tags[0] : null;
                                const projectTag = projectTagId ? projectTags.find(p => p.id === projectTagId) : null;

                                return (
                                    <TransactionItem
                                        key={t.id}
                                        t={t}
                                        category={category}
                                        subcategory={subcategory}
                                        projectTag={projectTag}
                                        isLast={index === trans.length - 1}
                                        onEditClick={handleEdit}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}

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
        </motion.div >
    );
};

export default Dashboard;
