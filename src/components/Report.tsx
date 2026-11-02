import React, { useMemo, useState, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, addYears, subYears, isWithinInterval, parse, differenceInDays } from 'date-fns';
import { BarChart, Bar, ResponsiveContainer, Cell, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import MonthPicker from './MonthPicker';
import { convertAmountToTWD, formatAmount } from '../utils/currency';
import { compareTransactionsDesc } from '../utils/transactionOrder';
import type { TransactionReportItemProps } from './TransactionReportItem';
import type { Category, ProjectTag, Subcategory, Transaction } from '../types';

type ViewMode = 'month' | 'year' | 'custom';
type TransactionType = 'expense' | 'income' | 'budget';

/**
 * 預算 tab 月視角的「年度進度」資料。
 *
 * 費用 tab 已經回答「這個月花多少、跟本月預算差多少」，所以預算 tab 改為回答
 * 「整年走到現在，進度超前還是落後」——這是費用 tab 給不了的觀點。
 */
interface YTDProgress {
    annualBudget: number;  // 全年預算
    expected: number;      // 到本月為止「應該」花掉的累計預算
    actual: number;        // 到本月為止實際花掉的金額
    balance: number;       // expected - actual，正數為結餘、負數為超支
}

// TypeScript interfaces for chart components
interface ChartDataItem {
    categoryId: string;
    name: string;
    value: number;
    color: string;
    icon: string;
    budget: number | null;
    ytdProgress?: YTDProgress | null;
    currentPeriodExpense?: number;
}

interface CustomYAxisTickProps {
    x?: number;
    y?: number;
    payload?: { value: string };
    chartData: ChartDataItem[];
    totalExpenses: number;
}

interface CustomBarLabelProps {
    x?: string | number;
    y?: string | number;
    width?: string | number;
    height?: string | number;
    value?: unknown; // Recharts can pass various types
    chartData: ChartDataItem[];
}

// Custom Y-axis Tick Component (outside of Report component)
const CustomYAxisTick: React.FC<CustomYAxisTickProps> = ({ x = 0, y = 0, payload, chartData, totalExpenses }) => {
    const item = chartData.find(d => d.name === payload?.value);
    const percentage = item && totalExpenses > 0
        ? Math.round((item.value / totalExpenses) * 100)
        : 0;

    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0}
                y={0}
                dy={4}
                textAnchor="end"
                fill="#666"
                fontSize={12}
            >
                <tspan>{payload?.value}</tspan>
                <tspan fill="#999" fontSize={10}> {percentage}%</tspan>
            </text>
        </g>
    );
};

// Custom Bar Label Component (outside of Report component)
const CustomBarLabel: React.FC<CustomBarLabelProps> = ({ x = 0, y = 0, width = 0, height = 0, value, chartData }) => {
    if (typeof value !== 'number') return null;

    const item = chartData.find(d => d.value === value);
    const budget = item?.budget ?? null;
    const isOverBudget = budget !== null && budget !== undefined && value > budget;
    const color = isOverBudget ? '#EF4444' : '#059669'; // red-500 : green-600

    // Convert to numbers if needed
    const numX = typeof x === 'string' ? parseFloat(x) : x;
    const numY = typeof y === 'string' ? parseFloat(y) : y;
    const numWidth = typeof width === 'string' ? parseFloat(width) : width;
    const numHeight = typeof height === 'string' ? parseFloat(height) : height;

    return (
        <text
            x={numX + numWidth + 8}
            y={numY + numHeight / 2}
            fill={color}
            textAnchor="start"
            dominantBaseline="middle"
            fontSize={12}
            fontWeight="600"
        >
            ${value.toLocaleString()}
        </text>
    );
};

/**
 * 年度預算進度條：長條為 YTD 實際花費佔全年預算的比例，深色直線標出到本月為止
 * 「應該」花到的位置。花超過標記代表進度超前（花太快），長條轉紅。
 */
const YTDProgressBar: React.FC<{ progress: YTDProgress; compact?: boolean }> = ({ progress, compact }) => {
    const { annualBudget, expected, actual, balance } = progress;

    const toPercent = (value: number) =>
        annualBudget > 0 ? Math.max(0, Math.min(100, (value / annualBudget) * 100)) : 0;

    const actualPercent = toPercent(actual);
    const expectedPercent = toPercent(expected);
    const isOverPace = balance < 0;

    return (
        <div className={compact ? 'mt-1.5' : 'mt-2'}>
            <div className={`relative w-full bg-gray-100 rounded-full ${compact ? 'h-1.5' : 'h-2.5'}`}>
                <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all ${isOverPace ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${actualPercent}%` }}
                />
                {/* 應花進度標記 */}
                <div
                    className="absolute -inset-y-0.5 w-0.5 bg-gray-600 rounded-full"
                    style={{ left: `${expectedPercent}%` }}
                    title={`到本月為止應花 $${Math.round(expected).toLocaleString()}`}
                />
            </div>
            <div className={`text-gray-400 mt-1 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                YTD 預計 ${Math.round(expected).toLocaleString()}
                ，實際 ${Math.round(actual).toLocaleString()}
                <span className={isOverPace ? 'text-red-500' : 'text-green-500'}>
                    ，差距 ${Math.abs(Math.round(balance)).toLocaleString()}
                    {expected > 0 && ` (${Math.round((actual / expected) * 100)}%)`}
                </span>
            </div>
        </div>
    );
};

const BUDGET_GRID_CELLS = 12;
const BUDGET_GRID_FULL_CELLS = 10;

/**
 * 預算使用量格狀條：12 格代表 10%～120%，每滿 10% 才填一格（15% 只填 1 格），
 * 120% 以上維持 12 格全滿。花費超過預算時，已填滿的格子轉紅。
 * 第 10、11 格之間的直線標出 100% 的位置。
 */
const BudgetGridBar: React.FC<{ spent: number; budget: number }> = ({ spent, budget }) => {
    const filled = budget > 0
        ? Math.max(0, Math.min(BUDGET_GRID_CELLS, Math.floor((spent * 10) / budget)))
        : spent > 0 ? BUDGET_GRID_CELLS : 0;
    const filledColor = spent > budget ? 'bg-red-500' : 'bg-blue-500';

    return (
        <div className="flex items-center gap-0.5">
            {Array.from({ length: BUDGET_GRID_CELLS }, (_, i) => (
                <React.Fragment key={i}>
                    {i === BUDGET_GRID_FULL_CELLS && <div className="w-0.5 h-3.5 mx-0.5 shrink-0 rounded-full bg-gray-600" />}
                    <div className={`flex-1 h-2 rounded-sm ${i < filled ? filledColor : 'bg-gray-200'}`} />
                </React.Fragment>
            ))}
        </div>
    );
};

/**
 * 子分類的上下順序沿用分類設定頁的 Subcategory.order，而非金額大小。
 */
const bySubcategoryOrder = (
    a: { subcategory: { order?: number } },
    b: { subcategory: { order?: number } }
) => (a.subcategory.order ?? 0) - (b.subcategory.order ?? 0);

// --- Memoized Report List Components ---

/** 分類明細裡的單行交易：日期、備註、金額，資訊密度比搜尋頁的 TransactionReportItem 高。 */
const CompactTransactionRow = React.memo(({ transaction, projectTags, onEditClick }: TransactionReportItemProps) => {
    const handleEdit = React.useCallback(() => {
        onEditClick(transaction);
    }, [onEditClick, transaction]);

    const tagId = transaction.tags?.[0];
    const tag = tagId ? projectTags.find(p => p.id === tagId) : null;

    return (
        <div
            onClick={handleEdit}
            className="flex items-center gap-2 pl-12 pr-4 py-2 text-[13px] text-gray-500 cursor-pointer active:bg-gray-100 transition-colors"
        >
            <span className="w-9 shrink-0 tabular-nums">{format(new Date(transaction.date), 'M/d')}</span>
            <span className="flex-1 min-w-0 truncate">{transaction.note}</span>
            {tag && (
                <span className="shrink-0 max-w-20 truncate px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-600 text-[10px] font-medium">
                    {tag.name}
                </span>
            )}
            <div className="shrink-0 text-right tabular-nums">
                {formatAmount(transaction.amount, transaction.currency)}
                {transaction.currency && transaction.currency !== 'TWD' && (
                    <div className="text-[10px] text-gray-400">
                        ≈ ${convertAmountToTWD(transaction.amount, transaction.currency).toLocaleString()}
                    </div>
                )}
            </div>
        </div>
    );
});

interface SubcategoryReportData {
    subcategory: Subcategory;
    total: number;
    subTransactions: Transaction[];
    hasBudget?: boolean;
    ytdProgress?: YTDProgress | null;
    currentPeriodExpense?: number;
}

interface SubcategoryReportItemProps {
    subcategory: Subcategory;
    total: number;
    subBudget: number | null;
    isExpanded: boolean;
    onToggle: (id: string) => void;
    transactionType: TransactionType;
    subTransactions: Transaction[];
    projectTags: ProjectTag[];
    onEditClick: (t: Transaction) => void;
    ytdProgress: YTDProgress | null;
    currentPeriodExpense?: number;
}

const SubcategoryReportItem = React.memo(({
    subcategory,
    total,
    subBudget,
    isExpanded,
    onToggle,
    transactionType,
    subTransactions,
    projectTags,
    onEditClick,
    ytdProgress,
    currentPeriodExpense
}: SubcategoryReportItemProps) => {
    const subRemaining = subBudget !== null ? subBudget - total : null;
    const usagePercent = subBudget ? Math.round((total / subBudget) * 100) : 0;

    // 分類列本身顯示的是「本期預算/剩餘」；YTD 只在月視角以進度條呈現。
    const showYTDBar = transactionType === 'budget' && ytdProgress !== null;

    const handleToggle = React.useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle(subcategory.id);
    }, [onToggle, subcategory.id]);

    const budgetRemaining = subBudget !== null && currentPeriodExpense !== undefined
        ? subBudget - currentPeriodExpense
        : null;

    return (
        <div>
            {/* Subcategory Header */}
            <div
                className="pl-9 pr-3 py-2.5 active:bg-gray-100 cursor-pointer transition-colors"
                onClick={handleToggle}
            >
                <div className="flex items-baseline gap-2">
                    <span className="flex-1 min-w-0 truncate text-sm text-gray-700">
                        {subcategory.name}
                        {transactionType !== 'budget' && (
                            <span className="ml-2 text-xs text-gray-400">{subTransactions.length} 筆</span>
                        )}
                    </span>
                    {transactionType === 'budget' && budgetRemaining !== null ? (
                        <span className="shrink-0 text-sm text-gray-700 tabular-nums">
                            <span className={`mr-1.5 text-[10px] font-medium ${budgetRemaining >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {budgetRemaining >= 0 ? '剩餘' : '超支'}
                            </span>
                            {Math.abs(budgetRemaining).toLocaleString()}
                        </span>
                    ) : (
                        <span className="shrink-0 text-sm text-gray-700 tabular-nums">{total.toLocaleString()}</span>
                    )}
                </div>

                {subBudget !== null && (
                    <div className="flex items-center justify-between mt-0.5 text-xs text-gray-400">
                        <span>
                            預算: ${subBudget.toLocaleString()}
                            {/* Hide 100% in budget mode */}
                            {transactionType !== 'budget' && (
                                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${usagePercent > 100
                                    ? 'bg-red-100 text-red-600'
                                    : usagePercent === 100
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {usagePercent}%
                                </span>
                            )}
                        </span>
                        {subRemaining !== null && transactionType !== 'budget' && (
                            <span className={subRemaining >= 0 ? 'text-green-500' : 'text-red-500'}>
                                {subRemaining >= 0 ? '剩餘: ' : '超支: '}${Math.abs(subRemaining).toLocaleString()}
                            </span>
                        )}
                    </div>
                )}

                {showYTDBar && <YTDProgressBar progress={ytdProgress} compact />}
            </div>

            {/* Transactions - Hide in Budget Mode */}
            <AnimatePresence>
                {isExpanded && transactionType !== 'budget' && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        {subTransactions.map(transaction => (
                            <CompactTransactionRow
                                key={transaction.id}
                                transaction={transaction}
                                projectTags={projectTags}
                                onEditClick={onEditClick}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

interface CategoryReportItemProps {
    item: ChartDataItem;
    totalValue: number;
    transactionType: TransactionType;
    isExpanded: boolean;
    onToggle: (id: string) => void;
    subcategoryData: SubcategoryReportData[];
    getSubcategoryBudget: (id: string) => number | null;
    expandedSubcategories: Set<string>;
    toggleSubcategory: (id: string) => void;
    projectTags: ProjectTag[];
    onEditClick: (t?: Transaction, date?: Date) => void;
    ytdProgress: YTDProgress | null;
}

const CategoryReportItem = React.memo(({
    item,
    totalValue,
    transactionType,
    isExpanded,
    onToggle,
    subcategoryData,
    getSubcategoryBudget,
    expandedSubcategories,
    toggleSubcategory,
    projectTags,
    onEditClick,
    ytdProgress
}: CategoryReportItemProps) => {
    const budget = item.budget;
    const remaining = budget !== null ? budget - item.value : null;

    const usagePercent = budget ? Math.round((item.value / budget) * 100) : 0;

    // 分類列本身顯示的是「本期預算/剩餘」；YTD 只在月視角以進度條呈現。
    const showYTDBar = transactionType === 'budget' && ytdProgress !== null;

    const handleToggle = useCallback(() => {
        onToggle(item.categoryId);
    }, [onToggle, item.categoryId]);

    const sharePercent = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;
    const budgetRemaining = budget !== null && item.currentPeriodExpense !== undefined
        ? budget - item.currentPeriodExpense
        : null;

    return (
        <div>
            {/* Category Header */}
            <div
                className="px-3 py-3.5 cursor-pointer active:bg-gray-100 transition-colors"
                onClick={handleToggle}
            >
                <div className="flex items-center gap-3">
                    <span className="w-1 h-6 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xl leading-none shrink-0">{item.icon}</span>
                    <span className="flex-1 min-w-0 truncate font-bold text-gray-800">{item.name}</span>
                    {transactionType === 'budget' && budgetRemaining !== null ? (
                        <span className="shrink-0 font-bold text-gray-800 tabular-nums">
                            {/* 與費用 tab 一致：主要數字固定黑色，由標籤負責綠(剩餘)/紅(超支) */}
                            <span className={`mr-1.5 text-xs font-medium ${budgetRemaining >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {budgetRemaining >= 0 ? '剩餘' : '超支'}
                            </span>
                            {Math.abs(budgetRemaining).toLocaleString()}
                        </span>
                    ) : (
                        <>
                            <span className="shrink-0 text-xs text-gray-400 tabular-nums">{sharePercent}%</span>
                            <span className="shrink-0 w-16 text-right font-bold text-gray-800 tabular-nums">{item.value.toLocaleString()}</span>
                        </>
                    )}
                </div>

                {budget !== null && (
                    <div className="flex items-center justify-between mt-2 pl-4 text-xs text-gray-500">
                        <span>
                            預算: ${budget.toLocaleString()}
                            {/* Hide 100% label in budget mode */}
                            {transactionType !== 'budget' && (
                                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${usagePercent > 100
                                    ? 'bg-red-100 text-red-600'
                                    : usagePercent === 100
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {usagePercent}%
                                </span>
                            )}
                        </span>
                        {remaining !== null && transactionType !== 'budget' && (
                            <span className={`font-medium ${remaining >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {remaining >= 0 ? '剩餘: ' : '超支: '}${Math.abs(remaining).toLocaleString()}
                            </span>
                        )}
                    </div>
                )}
                {showYTDBar && <div className="pl-4"><YTDProgressBar progress={ytdProgress} /></div>}
                {budget !== null && transactionType !== 'budget' && (
                    <div className="pl-4 mt-2">
                        <BudgetGridBar spent={item.value} budget={budget} />
                    </div>
                )}
            </div>

            {/* Subcategories */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-gray-50"
                    >
                        {subcategoryData.map(({ subcategory, total, subTransactions }) => (
                            <SubcategoryReportItem
                                key={subcategory.id}
                                subcategory={subcategory}
                                total={total}
                                subBudget={getSubcategoryBudget(subcategory.id)}
                                isExpanded={expandedSubcategories.has(subcategory.id)}
                                onToggle={toggleSubcategory}
                                transactionType={transactionType}
                                subTransactions={subTransactions}
                                projectTags={projectTags}
                                ytdProgress={subcategoryData.find(d => d.subcategory.id === subcategory.id)?.ytdProgress || null}
                                currentPeriodExpense={subcategoryData.find(d => d.subcategory.id === subcategory.id)?.currentPeriodExpense}
                                onEditClick={onEditClick}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});


const Report: React.FC = () => {
    const { transactions, categories, subcategories, projectTags, getBudgetForCategory, getBudgetForSubcategory, openModal, setTransactionFilter } = useAppContext();
    const navigate = useNavigate();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [transactionType, setTransactionType] = useState<TransactionType>('expense');
    const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
        start: format(new Date(), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd'),
    });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // 專案標籤篩選器 state
    const [isProjectFilterOpen, setIsProjectFilterOpen] = useState(false);

    // 分離待套用狀態和已套用狀態
    const [pendingCustomRange, setPendingCustomRange] = useState(customRange);
    const [pendingProjectTags, setPendingProjectTags] = useState<string[]>([]);
    const [appliedCustomRange, setAppliedCustomRange] = useState(customRange);
    const [appliedProjectTags, setAppliedProjectTags] = useState<string[]>([]);

    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());

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

    const closeDatePicker = useCallback(() => setIsDatePickerOpen(false), []);

    /**
     * 分類的上下順序沿用分類設定頁的 Category.order，而非金額大小，讓兩頁看到的
     * 排列一致。圖表與明細清單共用同一個比較函式，不會各自排出不同順序。
     */
    const byCategoryOrder = useCallback(
        (a: { categoryId: string }, b: { categoryId: string }) =>
            (categoryMap.get(a.categoryId)?.order ?? 0) - (categoryMap.get(b.categoryId)?.order ?? 0),
        [categoryMap]
    );

    // Date Range Calculations - 使用 appliedCustomRange 而非 customRange
    const dateRange = useMemo(() => {
        const now = new Date(currentMonth);
        switch (viewMode) {
            case 'month':
                return {
                    start: startOfMonth(now),
                    end: endOfMonth(now),
                    label: format(now, 'yyyy/MM')  // 改為 2025/12 格式
                };

            case 'year':
                return {
                    start: startOfYear(now),
                    end: endOfYear(now),
                    label: format(now, 'yyyy')
                };
            case 'custom':
                return {
                    start: parse(appliedCustomRange.start, 'yyyy-MM-dd', new Date()),
                    end: parse(appliedCustomRange.end, 'yyyy-MM-dd', new Date()),
                    label: 'Custom Range'
                };
        }
    }, [viewMode, currentMonth, appliedCustomRange]);

    // Sync context filter with report range
    // Optimization: Only fetch from year start when in Budget + Month mode for YTD calculation
    React.useEffect(() => {
        if (dateRange) {
            const needsYearData = transactionType === 'budget' && viewMode === 'month';
            const fetchStart = needsYearData ? startOfYear(dateRange.start) : dateRange.start;
            setTransactionFilter({
                start: fetchStart,
                end: dateRange.end
            });
        }
    }, [dateRange, setTransactionFilter, viewMode, transactionType]);

    const handlePrev = () => {
        if (viewMode === 'year') {
            setCurrentMonth(subYears(currentMonth, 1));
        } else {
            setCurrentMonth(subMonths(currentMonth, 1));
        }
    };

    const handleNext = () => {
        if (viewMode === 'year') {
            setCurrentMonth(addYears(currentMonth, 1));
        } else {
            setCurrentMonth(addMonths(currentMonth, 1));
        }
    };

    // Calculate Budget Logic (pro-rated by days) - Using year-based budget system
    // Calculate Budget Logic
    const getCategoryBudget = React.useCallback((categoryId: string) => {
        // 根據報表的日期範圍確定年度 (使用範圍起始日期的年份)
        const year = dateRange.start.getFullYear();

        // 月視角：直接向 Context 索取單月預算（尊重 monthlyAmounts 設定）
        if (viewMode === 'month') {
            const yearlyBudget = getBudgetForCategory(categoryId, year);
            if (yearlyBudget === 0) return null; // 完全沒設預算，不顯示
            const monthIndex = dateRange.start.getMonth();
            return getBudgetForCategory(categoryId, year, monthIndex); // 可能為 0，但仍顯示
        }

        // 其餘視角（年、自訂）索取年度預算再運算
        const yearlyBudget = getBudgetForCategory(categoryId, year);
        if (yearlyBudget === 0) return null;

        if (viewMode === 'year') return yearlyBudget;

        // Custom Mode: Pro-rate by days
        const daysInRange = differenceInDays(dateRange.end, dateRange.start) + 1;
        const dailyBudget = yearlyBudget / 365;
        return Math.round(dailyBudget * daysInRange);
    }, [dateRange, getBudgetForCategory, viewMode]);

    const getSubcategoryBudget = React.useCallback((subcategoryId: string) => {
        // 根據報表的日期範圍確定年度 (使用範圍起始日期的年份)
        const year = dateRange.start.getFullYear();

        // 月視角：直接向 Context 索取單月預算（尊重 monthlyAmounts 設定）
        if (viewMode === 'month') {
            const yearlyBudget = getBudgetForSubcategory(subcategoryId, year);
            if (yearlyBudget === 0) return null; // 完全沒設預算，不顯示
            const monthIndex = dateRange.start.getMonth();
            return getBudgetForSubcategory(subcategoryId, year, monthIndex); // 可能為 0，但仍顯示
        }

        // 其餘視角（年、自訂）索取年度預算再運算
        const yearlyBudget = getBudgetForSubcategory(subcategoryId, year);
        if (yearlyBudget === 0) return null;

        if (viewMode === 'year') return yearlyBudget;

        // Custom Mode: Pro-rate by days
        const daysInRange = differenceInDays(dateRange.end, dateRange.start) + 1;
        const dailyBudget = yearlyBudget / 365;
        return Math.round(dailyBudget * daysInRange);
    }, [dateRange, getBudgetForSubcategory, viewMode]);

    // Get transactions for a specific category or subcategory - 包含專案標籤篩選
    const getRelevantTransactions = React.useCallback((categoryId?: string, subcategoryId?: string) => {
        return transactions.filter(t => {
            const tDate = new Date(t.date);
            const isInRange = isWithinInterval(tDate, { start: dateRange.start, end: dateRange.end });
            const isCorrectType = t.type === transactionType;
            const matchesCategory = categoryId ? t.categoryId === categoryId : true;
            const matchesSubcategory = subcategoryId ? t.subcategoryId === subcategoryId : true;

            // 專案標籤篩選邏輯：只有當有選擇標籤時才過濾
            const matchesProjectTags = appliedProjectTags.length > 0
                ? t.tags && t.tags.some(tag => appliedProjectTags.includes(tag))
                : true;

            return isCorrectType && isInRange && matchesCategory && matchesSubcategory && matchesProjectTags;
        });
    }, [transactions, dateRange, transactionType, appliedProjectTags]);

    const getYTDProgress = React.useCallback((categoryId?: string, subcategoryId?: string): YTDProgress | null => {
        if (viewMode !== 'month' || transactionType !== 'budget') return null;

        const ytdStart = startOfYear(currentMonth);
        const ytdEnd = dateRange.end;

        // 1. Calculate Accumulated Budget
        const year = currentMonth.getFullYear();
        const fullYearBudget = subcategoryId
            ? getBudgetForSubcategory(subcategoryId, year)
            : getBudgetForCategory(categoryId!, year);

        if (fullYearBudget === 0) return null;

        // 逐月累加（尊重 monthlyAmounts 各月設定，避免平均分攤造成誤差）
        const currentMonthIndex = currentMonth.getMonth();
        let accumulatedBudget = 0;
        for (let m = 0; m <= currentMonthIndex; m++) {
            const monthBudget = subcategoryId
                ? getBudgetForSubcategory(subcategoryId, year, m)
                : getBudgetForCategory(categoryId!, year, m);
            accumulatedBudget += monthBudget;
        }

        // 2. Calculate Accumulated Expenses (always use 'expense' type for YTD calculation)
        const ytdTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            const isInRange = isWithinInterval(tDate, { start: ytdStart, end: ytdEnd });
            const isCorrectType = t.type === 'expense'; // Always calculate against expenses
            const matchesCategory = categoryId ? t.categoryId === categoryId : true;
            const matchesSubcategory = subcategoryId ? t.subcategoryId === subcategoryId : true;

            // Project tag filtering behavior:
            // YTD follows the current project tag filter selection (方案B)
            // This means YTD reflects the accumulated balance for ONLY the selected project tags
            // If no tags selected, YTD reflects all transactions in this category
            const matchesProjectTags = appliedProjectTags.length > 0
                ? t.tags && t.tags.some(tag => appliedProjectTags.includes(tag))
                : true;

            return isCorrectType && isInRange && matchesCategory && matchesSubcategory && matchesProjectTags;
        });

        const totalSpent = ytdTransactions.reduce((sum, t) => sum + convertAmountToTWD(t.amount, t.currency || 'TWD'), 0);
        return {
            annualBudget: fullYearBudget,
            expected: accumulatedBudget,
            actual: totalSpent,
            balance: accumulatedBudget - totalSpent
        };
    }, [viewMode, transactionType, currentMonth, dateRange.end, transactions, getBudgetForCategory, getBudgetForSubcategory, appliedProjectTags]);

    const getCurrentPeriodExpense = React.useCallback((categoryId?: string, subcategoryId?: string) => {
        if (transactionType !== 'budget') return 0;
        
        const periodTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            const isInRange = isWithinInterval(tDate, { start: dateRange.start, end: dateRange.end });
            const isCorrectType = t.type === 'expense';
            const matchesCategory = categoryId ? t.categoryId === categoryId : true;
            const matchesSubcategory = subcategoryId ? t.subcategoryId === subcategoryId : true;

            const matchesProjectTags = appliedProjectTags.length > 0
                ? t.tags && t.tags.some(tag => appliedProjectTags.includes(tag))
                : true;

            return isCorrectType && isInRange && matchesCategory && matchesSubcategory && matchesProjectTags;
        });

        return periodTransactions.reduce((sum, t) => sum + convertAmountToTWD(t.amount, t.currency || 'TWD'), 0);
    }, [dateRange, transactions, transactionType, appliedProjectTags]);

    const chartData = useMemo(() => {
        if (transactionType === 'budget') {
            // Handle Budget View
            const data: ChartDataItem[] = [];
            categories.forEach(category => {
                const budget = getCategoryBudget(category.id);
                if (budget !== null) {
                    data.push({
                        categoryId: category.id,
                        name: category.name,
                        value: budget,
                        color: category.color,
                        icon: category.icon,
                        budget: budget, // In budget mode, value IS the budget
                        ytdProgress: getYTDProgress(category.id), // 年度進度（僅預算+月視角有值）
                        currentPeriodExpense: getCurrentPeriodExpense(category.id)
                    });
                }
            });
            return data.sort(byCategoryOrder);
        }

        // Handle Expense/Income View
        const relevantTransactions = getRelevantTransactions();

        const data: {
            categoryId: string;
            name: string;
            value: number;
            color: string;
            icon: string;
            budget: number | null;
            ytdProgress: YTDProgress | null;
        }[] = [];

        relevantTransactions.forEach((t) => {
            const category = categoryMap.get(t.categoryId);
            // Skip if category not found or category type doesn't match current transaction type
            if (!category || category.type !== transactionType) return;

            const existing = data.find((d) => d.categoryId === category.id);
            if (existing) {
                existing.value += convertAmountToTWD(t.amount, t.currency || 'TWD');
            } else {
                data.push({
                    categoryId: category.id,
                    name: category.name,
                    value: convertAmountToTWD(t.amount, t.currency || 'TWD'),
                    color: category.color,
                    icon: category.icon,
                    budget: getCategoryBudget(category.id),
                    ytdProgress: getYTDProgress(category.id)
                });
            }
        });

        return data.sort(byCategoryOrder);
    }, [transactions, categories, dateRange, transactionType, getCategoryBudget, getRelevantTransactions, getYTDProgress, getCurrentPeriodExpense, byCategoryOrder]);

    // Detail list data: same as chart in budget mode; in expense/income mode, also include
    // visible categories with zero spending so users can see "0 spent" rows.
    const detailListData = useMemo(() => {
        if (transactionType === 'budget') return chartData;

        const existingIds = new Set(chartData.map(item => item.categoryId));
        const result = [...chartData];
        categories.forEach(c => {
            if (c.type !== transactionType) return;
            if (c.isHidden) return;
            if (existingIds.has(c.id)) return;
            result.push({
                categoryId: c.id,
                name: c.name,
                value: 0,
                color: c.color,
                icon: c.icon,
                budget: getCategoryBudget(c.id),
                ytdProgress: getYTDProgress(c.id),
            });
        });
        return result.sort(byCategoryOrder);
    }, [chartData, categories, transactionType, getCategoryBudget, getYTDProgress, byCategoryOrder]);

    // Calculate total expenses for percentage
    const totalExpenses = useMemo(() => {
        return chartData.reduce((sum, item) => sum + item.value, 0);
    }, [chartData]);

    // Precompute subcategory data for all categories to keep CategoryReportItem stable
    const allSubcategoryData = useMemo(() => {
        const map = new Map<string, SubcategoryReportData[]>();
        categories.forEach(cat => {
            const categoryId = cat.id;

            if (transactionType === 'budget') {
                const subs = subcategories
                    .filter(s => s.parentId === categoryId)
                    .map(s => {
                        const budget = getSubcategoryBudget(s.id);
                        return {
                            subcategory: s,
                            total: budget ?? 0,
                            hasBudget: budget !== null,
                            subTransactions: [] // No transactions shown in budget mode
                        };
                    })
                    .filter(item => item.hasBudget)
                    .sort(bySubcategoryOrder);

                // Add YTD balance uniformly with expense/income mode approach
                map.set(categoryId, subs.map(item => ({
                    ...item,
                    ytdProgress: viewMode === "month" ? getYTDProgress(categoryId, item.subcategory.id) : null,
                    currentPeriodExpense: getCurrentPeriodExpense(categoryId, item.subcategory.id)
                })));
                return;
            }

            const categoryTransactions = getRelevantTransactions(categoryId);
            const subcategoryMapData = new Map<string, SubcategoryReportData>();

            categoryTransactions.forEach(t => {
                let subcategory = subcategoryMap.get(t.subcategoryId);

                // If subcategory doesn't exist (orphaned transaction), treat it as "未分類"
                if (!subcategory) {
                    // Find or create "未分類" for this category
                    const category = categoryMap.get(categoryId);
                    if (!category) return;

                    subcategory = subcategories.find(s => s.parentId === categoryId && s.name === '未分類');
                    if (!subcategory) return; // Skip if somehow uncategorized doesn't exist
                }

                const existing = subcategoryMapData.get(subcategory.id);
                const amountTWD = convertAmountToTWD(t.amount, t.currency || 'TWD');
                if (existing) {
                    existing.total += amountTWD;
                    existing.subTransactions.push(t);
                } else {
                    subcategoryMapData.set(subcategory.id, {
                        subcategory,
                        total: amountTWD,
                        subTransactions: [t]
                    });
                }
            });

            // Order the detail list: newest day first, then newest entry within the day.
            // Firestore only orders by `date`, which is day-granular — see compareTransactionsDesc.
            subcategoryMapData.forEach(item => {
                item.subTransactions.sort(compareTransactionsDesc);
            });

            // Include visible subcategories with no transactions so they show as 0
            subcategories
                .filter(s => s.parentId === categoryId && !s.isHidden)
                .forEach(s => {
                    if (!subcategoryMapData.has(s.id)) {
                        subcategoryMapData.set(s.id, {
                            subcategory: s,
                            total: 0,
                            subTransactions: []
                        });
                    }
                });

            map.set(categoryId, Array.from(subcategoryMapData.values())
                .map(item => ({
                    ...item,
                    ytdProgress: viewMode === "month" ? getYTDProgress(categoryId, item.subcategory.id) : null
                }))
                .sort(bySubcategoryOrder));
        });
        return map;
    }, [categories, subcategories, transactionType, getRelevantTransactions, getSubcategoryBudget, viewMode, getYTDProgress, getCurrentPeriodExpense]);

    const toggleCategory = React.useCallback((categoryId: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
                // Also collapse all subcategories when collapsing category
                const subcatsToRemove = subcategories
                    .filter(s => s.parentId === categoryId)
                    .map(s => s.id);
                setExpandedSubcategories(prevSub => {
                    const newSubSet = new Set(prevSub);
                    subcatsToRemove.forEach(id => newSubSet.delete(id));
                    return newSubSet;
                });
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    }, [subcategories]);

    const toggleSubcategory = React.useCallback((subcategoryId: string) => {
        setExpandedSubcategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(subcategoryId)) {
                newSet.delete(subcategoryId);
            } else {
                newSet.add(subcategoryId);
            }
            return newSet;
        });
    }, []);


    // Calculate dynamic chart height
    const chartHeight = useMemo(() => {
        const minHeight = 300;
        const itemHeight = 35;
        const calculatedHeight = Math.max(minHeight, chartData.length * itemHeight);
        return calculatedHeight;
    }, [chartData.length]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full bg-gray-50"
        >
            {/* Fixed Header - 只有標題 */}
            <div className="bg-white shadow-sm z-10 p-4">
                <div className="flex items-center">
                    <button onClick={() => navigate('/')} className="mr-4 text-gray-500 text-xl" style={{ fontVariant: 'normal' }}>
                        ↩︎
                    </button>
                    <h1 className="text-lg font-bold flex-1 text-center">報表</h1>
                    <button
                        onClick={() => navigate('/report/search')}
                        className="ml-4 p-1 text-gray-500 active:bg-gray-100 rounded-lg transition-colors"
                        title="搜尋備註"
                        aria-label="搜尋備註"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="7" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Scrollable Content - 包含控制選項和數據 */}
            <div className="flex-1 overflow-y-auto">
                {/* Controls Section */}
                <div className="bg-white p-4 pb-3">
                    {/* 1. View Mode Switcher (月/年/自訂) */}
                    <div className="flex bg-gray-100 rounded-lg p-1 mb-3">
                        {(['month', 'year', 'custom'] as ViewMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${viewMode === mode
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 active:text-gray-700'
                                    }`}
                            >
                                {mode === 'month' ? '月' : mode === 'year' ? '年' : '自訂'}
                            </button>
                        ))}
                    </div>

                    {/* 2. 日期範圍區域 - 保持一致高度 */}
                    <div className="mb-3">
                        {viewMode === 'custom' ? (
                            // 自訂模式：日期輸入 + 套用按鈕在同一列
                            <div className="flex items-center gap-1.5 overflow-x-hidden">
                                <input
                                    type="date"
                                    value={pendingCustomRange.start}
                                    onChange={(e) => setPendingCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                    className="w-[125px] h-10 bg-gray-50 border border-gray-200 rounded-lg px-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                                />
                                <span className="text-gray-400 shrink-0">-</span>
                                <input
                                    type="date"
                                    value={pendingCustomRange.end}
                                    onChange={(e) => setPendingCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                    className="w-[125px] h-10 bg-gray-50 border border-gray-200 rounded-lg px-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                                />
                                <button
                                    onClick={() => {
                                        setAppliedCustomRange(pendingCustomRange);
                                        setCustomRange(pendingCustomRange);
                                    }}
                                    className="flex-1 h-10 px-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors text-xs whitespace-nowrap min-w-[60px]"
                                >
                                    套用
                                </button>
                            </div>
                        ) : (
                            // 月/年模式：日期選擇器 - 與自訂模式同樣高度（h-10）
                            <div className="flex items-center justify-between h-10 bg-gray-50 border border-gray-200 rounded-lg px-3">
                                <button onClick={handlePrev} className="p-1 text-gray-500 active:bg-gray-200 rounded-lg transition-colors">
                                    ←
                                </button>
                                <button
                                    onClick={() => {
                                        if (viewMode === 'month') setIsDatePickerOpen(true);
                                    }}
                                    className={`flex-1 text-center px-4 ${viewMode === 'month' ? 'cursor-pointer active:bg-gray-100 rounded-lg' : ''}`}
                                >
                                    <span className="text-sm font-medium text-gray-800">
                                        {dateRange.label}
                                    </span>
                                </button>
                                <button onClick={handleNext} className="p-1 text-gray-500 active:bg-gray-200 rounded-lg transition-colors">
                                    →
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 3. Transaction Type Switcher (費用/收入) */}
                    <div className="flex bg-gray-100 rounded-lg p-1 mb-3">
                        <button
                            onClick={() => setTransactionType('expense')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${transactionType === 'expense'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 active:text-gray-700'
                                }`}
                        >
                            費用
                        </button>
                        <button
                            onClick={() => setTransactionType('income')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${transactionType === 'income'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 active:text-gray-700'
                                }`}
                        >
                            收入
                        </button>
                        <button
                            onClick={() => setTransactionType('budget')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${transactionType === 'budget'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 active:text-gray-700'
                                }`}
                        >
                            預算
                        </button>
                    </div>

                    {/* 4. 專案標籤篩選 */}
                    <div>
                        <button
                            onClick={() => setIsProjectFilterOpen(!isProjectFilterOpen)}
                            className="flex items-center gap-2 text-sm text-gray-600 active:text-gray-800 mb-2"
                        >
                            <span>專案標籤篩選</span>
                            <span className="text-xs text-gray-400">
                                {appliedProjectTags.length > 0 ? `(已選 ${appliedProjectTags.length} 個)` : '(全部)'}
                            </span>
                            <svg
                                className={`w-4 h-4 transition-transform ${isProjectFilterOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {isProjectFilterOpen && (
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    {projectTags.filter(tag => tag.status === 'active').map(tag => {
                                        const isSelected = pendingProjectTags.includes(tag.id);
                                        return (
                                            <button
                                                key={tag.id}
                                                onClick={() => {
                                                    setPendingProjectTags(prev =>
                                                        isSelected
                                                            ? prev.filter(id => id !== tag.id)
                                                            : [...prev, tag.id]
                                                    );
                                                }}
                                                className={`px-3 py-1 text-xs rounded-full transition-colors ${isSelected
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white text-gray-600 border border-gray-300 active:border-blue-500'
                                                    }`}
                                            >
                                                {tag.name}
                                            </button>
                                        );
                                    })}
                                    {projectTags.filter(tag => tag.status === 'active').length === 0 && (
                                        <span className="text-xs text-gray-400">暫無專案標籤</span>
                                    )}
                                </div>

                                {/* 套用按鈕改為低調的鏈接樣式 */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => {
                                            setAppliedProjectTags(pendingProjectTags);
                                        }}
                                        className="text-xs text-blue-600 active:text-blue-700 active:underline font-medium"
                                    >
                                        套用篩選
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Data Content */}
                <div className="p-4 pb-24">
                    {/* Chart Section */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                        <h2 className="text-lg font-bold mb-4 text-gray-800 capitalize flex flex-wrap items-baseline justify-between gap-x-2">
                            <span>Overview</span>
                            <span className={`text-sm font-normal whitespace-nowrap ${transactionType === 'income' ? 'text-green-500' : transactionType === 'budget' ? 'text-blue-500' : 'text-[#E3B873]'}`}>
                                (Total: ${totalExpenses.toLocaleString()})
                            </span>
                        </h2>
                        <div style={{ height: `${chartHeight}px`, width: '100%' }} className="focus:outline-none">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        layout="vertical"
                                        data={chartData}
                                        margin={{ top: 20, right: 60, bottom: 20, left: 10 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" domain={[0, 'dataMax']} hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={100}
                                            tick={(props) => (
                                                <CustomYAxisTick
                                                    {...props}
                                                    chartData={chartData}
                                                    totalExpenses={totalExpenses}
                                                />
                                            )}
                                        />

                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                            <LabelList
                                                content={(props) => (
                                                    <CustomBarLabel {...props} chartData={chartData} />
                                                )}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-gray-400 text-sm">
                                    No data for this period
                                </div>
                            )}
                        </div>
                    </div >

                    {/* Detailed List Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="font-bold text-gray-700">Details</h3>
                            <span className="text-xs text-gray-500 font-medium">幣別：TWD</span>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
                            {detailListData.map((item) => (
                                <CategoryReportItem
                                    key={item.categoryId}
                                    item={item}
                                    totalValue={totalExpenses}
                                    transactionType={transactionType}
                                    isExpanded={expandedCategories.has(item.categoryId)}
                                    onToggle={toggleCategory}
                                    subcategoryData={allSubcategoryData.get(item.categoryId) || []}
                                    getSubcategoryBudget={getSubcategoryBudget}
                                    expandedSubcategories={expandedSubcategories}
                                    toggleSubcategory={toggleSubcategory}
                                    ytdProgress={item.ytdProgress ?? null}
                                    projectTags={projectTags}
                                    onEditClick={openModal}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <MonthPicker
                isOpen={isDatePickerOpen}
                onClose={closeDatePicker}
                currentDate={currentMonth}
                onSelect={setCurrentMonth}
            />
        </motion.div >
    );
};

export default Report;
