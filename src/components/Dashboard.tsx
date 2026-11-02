import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { format, parseISO, addMonths, subMonths, isSameMonth, startOfMonth, endOfMonth, isToday } from 'date-fns';
import type { Category, ProjectTag, Subcategory, Transaction } from '../types';
import { motion } from 'framer-motion';

import MonthPicker from './MonthPicker';
import DateScrubber from './DateScrubber';
import { convertAmountToTWD, formatAmount } from '../utils/currency';
import { createdAtOrder } from '../utils/transactionOrder';

// --- Memoized Components ---

interface DateHeaderProps {
    dateStr: string;
    income: number;
    expense: number;
    isNoSpend: boolean;
    onAddClick: (dateStr: string) => void;
    onToggleNoSpend: (dateStr: string, marked: boolean) => void;
}

const DateHeader = React.memo(({ dateStr, income, expense, isNoSpend, onAddClick, onToggleNoSpend }: DateHeaderProps) => {
    const handleAdd = useCallback(() => {
        onAddClick(dateStr);
    }, [onAddClick, dateStr]);

    return (
        <div className="flex flex-col relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between py-2 pl-4 pr-3 bg-stone-100 border-b border-gray-100 mb-[1px]">
                <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium flex items-center gap-2 ${isToday(parseISO(dateStr)) ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                        {format(parseISO(dateStr), 'yyyy/MM/dd')}
                    </span>
                    <button
                        onClick={handleAdd}
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-[#E3B873] hover:text-white transition-colors"
                    >
                        <span className="text-sm font-bold leading-none">+</span>
                    </button>
                    {/* 支出為 0 的日子可標記「確認沒有花費」，用來和忘了記帳區分 */}
                    {expense === 0 && (
                        <button
                            onClick={() => onToggleNoSpend(dateStr, !isNoSpend)}
                            aria-label="標記這天沒有花費"
                            aria-pressed={isNoSpend}
                            className={`relative ml-1 w-5 h-5 flex items-center justify-center rounded-full border transition-colors before:absolute before:-inset-2 ${isNoSpend
                                ? 'bg-gray-700 border-gray-700 text-white'
                                : 'border-gray-300 text-gray-400'
                                }`}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </button>
                    )}
                    {isToday(parseISO(dateStr)) && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500">
                            <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.62.829.799 1.654 1.38 2.274 1.765a11.255 11.255 0 001.056.581c.01.002.016.002.016.002s.11.02.308-.066l.002-.001.006-.003.018-.008zM10 13a4 4 0 100-8 4 4 0 000 8z" clipRule="evenodd" />
                        </svg>
                    )}
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
    category?: Category;
    subcategory?: Subcategory;
    projectTag?: ProjectTag | null;
    isLast: boolean;
    onEditClick: (t: Transaction) => void;
}

const TransactionItem = React.memo(({ t, category, subcategory, projectTag, isLast, onEditClick }: TransactionItemProps) => {
    const isIncome = t.type === 'income';

    const handleEdit = useCallback(() => {
        onEditClick(t);
    }, [t, onEditClick]);

    return (
        <div className="relative overflow-hidden group mb-[1px]">
            <div
                id={`transaction-${t.id}`}
                className={`relative z-10 flex items-center px-4 py-3 bg-[#F9F9F9] ${!isLast ? 'border-b border-gray-100' : ''}`}
                onClick={handleEdit}
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
                            {(!subcategory || subcategory.name === '未分類') ? category?.name : subcategory.name}
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
                <div className={`ml-2 shrink-0 text-right ${isIncome ? 'text-green-500' : 'text-[#E3B873]'}`}>
                    <div className="font-bold text-base">
                        {isIncome ? '+' : ''}{formatAmount(t.amount, t.currency)}
                    </div>
                    {t.currency && t.currency !== 'TWD' && (
                        <div className="text-[10px] text-gray-400 font-normal">
                            ≈ ${convertAmountToTWD(t.amount, t.currency).toLocaleString()}
                        </div>
                    )}
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
        noSpendDates,
        setNoSpendDate,
        userProfile,
        openModal,
        setTransactionFilter,
        lastModifiedTransactionId,
        clearLastModifiedTransactionId
    } = useAppContext();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // --- ID Map Lookups for Efficiency (O(1) instead of O(N)) ---
    const categoryMap = useMemo(() => {
        const map = new Map<string, Category>();
        categories.forEach(c => map.set(c.id, c));
        return map;
    }, [categories]);

    const subcategoryMap = useMemo(() => {
        const map = new Map<string, Subcategory>();
        subcategories.forEach(s => map.set(s.id, s));
        return map;
    }, [subcategories]);

    const projectTagMap = useMemo(() => {
        const map = new Map<string, ProjectTag>();
        projectTags.forEach(p => map.set(p.id, p));
        return map;
    }, [projectTags]);

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
    const groupedTransactions = useMemo(() => {
        const groups: { [key: string]: { transactions: Transaction[]; income: number; expense: number } } = {};

        // 1. Fill with actual transactions
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

        // 2. If "Show Empty Days" is enabled, backfill missing days
        if (userProfile.showEmptyDays) {
            const now = new Date();
            const viewStart = startOfMonth(currentMonth);
            // End date is effectively min(endOfMonth(currentMonth), today)
            // But we only want to show empty days if they have passed or are today.
            // If viewing a previous month, show all days? "Show days without expenses" usually implies "daily log" feel.
            // Requirement: "date must be <= today"

            const viewEnd = endOfMonth(currentMonth);

            // Iterate from day 1 to end of month
            const iter = new Date(viewStart);
            while (iter <= viewEnd) {
                // Stop if date is in the future relative to "now" (today)
                // Need to compare dates without time component
                if (iter > now) break;

                const dateStr = format(iter, 'yyyy-MM-dd');
                if (!groups[dateStr]) {
                    // Create empty group
                    groups[dateStr] = { transactions: [], income: 0, expense: 0 };
                }

                // Move to next day
                iter.setDate(iter.getDate() + 1);
            }
        }

        // 3. Sort within each day by creation time (newest first) — see createdAtOrder.
        Object.values(groups).forEach(group => {
            group.transactions.sort((a, b) => createdAtOrder(b) - createdAtOrder(a));
        });

        // Sort dates descending
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [monthlyTransactions, userProfile.showEmptyDays, currentMonth]);

    const listRef = useRef<HTMLDivElement>(null);

    // 標記過「沒有花費」的日子之後有了支出，標記就失效；之後支出刪掉也回到未確認
    useEffect(() => {
        groupedTransactions.forEach(([dateStr, group]) => {
            if (group.expense > 0 && noSpendDates.has(dateStr)) {
                setNoSpendDate(dateStr, false);
            }
        });
    }, [groupedTransactions, noSpendDates, setNoSpendDate]);

    const datesWithRecords = useMemo(
        () => new Set(groupedTransactions.filter(([, group]) => group.transactions.length > 0).map(([dateStr]) => dateStr)),
        [groupedTransactions]
    );

    // 跳到指定日期；該日不在清單上（未來日期或隱藏空白日）時跳到最接近的日期
    const handleJumpToDate = useCallback((dateStr: string) => {
        const list = listRef.current;
        if (!list || groupedTransactions.length === 0) return;

        const target = parseISO(dateStr).getTime();
        const [closestDate] = groupedTransactions.reduce((closest, group) =>
            Math.abs(parseISO(group[0]).getTime() - target) < Math.abs(parseISO(closest[0]).getTime() - target) ? group : closest
        );

        const element = document.getElementById(`date-${closestDate}`);
        if (element) {
            list.scrollTop += element.getBoundingClientRect().top - list.getBoundingClientRect().top;
        }
    }, [groupedTransactions]);

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
                <div className="flex items-center relative h-10">
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

                    {/* Center: Date Pill - Absolutely positioned */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-gray-100 rounded-full px-1 py-1">
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

                    {/* Right: Monthly Totals - Fixed width to prevent layout shift */}
                    <div className="ml-auto flex flex-col items-end text-xs min-w-[90px]">
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
            <div className="relative flex-1 min-h-0">
                {groupedTransactions.length > 0 && (
                    <DateScrubber
                        month={currentMonth}
                        datesWithRecords={datesWithRecords}
                        onSelect={handleJumpToDate}
                    />
                )}

                <div ref={listRef} className="h-full overflow-y-auto pl-6 pr-4 pb-24 pt-2">
                    {groupedTransactions.map(([dateStr, { transactions: trans, income, expense }]) => (
                        <div key={dateStr} id={`date-${dateStr}`} className="mb-1">
                            <DateHeader
                                dateStr={dateStr}
                                income={income}
                                expense={expense}
                                isNoSpend={noSpendDates.has(dateStr)}
                                onAddClick={handleAddForDate}
                                onToggleNoSpend={setNoSpendDate}
                            />

                            <div className="">
                                {trans.map((t, index) => {
                                    const category = categoryMap.get(t.categoryId);
                                    const subcategory = subcategoryMap.get(t.subcategoryId);

                                    // Project Tag (Show only the first one)
                                    const projectTagId = t.tags && t.tags.length > 0 ? t.tags[0] : null;
                                    const projectTag = projectTagId ? projectTagMap.get(projectTagId) : null;

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
