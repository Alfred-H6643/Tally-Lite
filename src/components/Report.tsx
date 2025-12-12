import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, addYears, subYears, isWithinInterval, parse, differenceInDays } from 'date-fns';
import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import MonthPicker from './MonthPicker';

type ViewMode = 'month' | 'year' | 'custom';
type TransactionType = 'expense' | 'income';

// TypeScript interfaces for chart components
interface ChartDataItem {
    categoryId: string;
    name: string;
    value: number;
    color: string;
    icon: string;
    budget: number | null;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: any; // Recharts provides complex readonly array type
    transactionType: TransactionType;
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
    value?: any; // Recharts can pass various types
    chartData: ChartDataItem[];
    [key: string]: any; // Allow other props from recharts
}

// Custom Tooltip Component (outside of Report component)
const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, transactionType }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const budget = data.budget;
        const remaining = budget !== null ? budget - data.value : null;

        return (
            <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 z-50">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{data.icon}</span>
                    <span className="font-bold text-gray-800">{data.name}</span>
                </div>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-500">{transactionType === 'expense' ? '費用' : '收入'}:</span>
                        <span className="font-bold text-gray-800">TWD ${data.value.toLocaleString()}</span>
                    </div>
                    {budget !== null && remaining !== null && (
                        <>
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-500">預算:</span>
                                <span className="font-medium text-blue-600">TWD ${budget.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between gap-4 pt-1 border-t border-gray-100 mt-1">
                                <span className="text-gray-500">剩餘:</span>
                                <span className={`font-bold ${remaining >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    TWD ${remaining.toLocaleString()}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

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
    if (value === null || value === undefined) return null;

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

const Report: React.FC = () => {
    const { transactions, categories, subcategories, projectTags, getBudgetForCategory, getBudgetForSubcategory } = useAppContext();
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

    // Expandable states
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());

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
    const getCategoryBudget = (categoryId: string) => {
        // 根據報表的日期範圍確定年度 (使用範圍起始日期的年份)
        const year = dateRange.start.getFullYear();

        // 使用新的年度預算系統
        const yearlyBudget = getBudgetForCategory(categoryId, year);
        if (yearlyBudget === 0) return null;

        const daysInRange = differenceInDays(dateRange.end, dateRange.start) + 1;
        const dailyBudget = yearlyBudget / 365;
        const budgetForRange = Math.round(dailyBudget * daysInRange);

        return budgetForRange;
    };

    const getSubcategoryBudget = (subcategoryId: string) => {
        // 根據報表的日期範圍確定年度 (使用範圍起始日期的年份)
        const year = dateRange.start.getFullYear();

        // 使用新的年度預算系統
        const yearlyBudget = getBudgetForSubcategory(subcategoryId, year);
        if (yearlyBudget === 0) return null;

        const daysInRange = differenceInDays(dateRange.end, dateRange.start) + 1;
        const dailyBudget = yearlyBudget / 365;
        const budgetForRange = Math.round(dailyBudget * daysInRange);

        return budgetForRange;
    };

    // Get transactions for a specific category or subcategory - 包含專案標籤篩選
    const getRelevantTransactions = (categoryId?: string, subcategoryId?: string) => {
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
    };

    const chartData = useMemo(() => {
        const relevantTransactions = getRelevantTransactions();

        const data: {
            categoryId: string;
            name: string;
            value: number;
            color: string;
            icon: string;
            budget: number | null
        }[] = [];

        relevantTransactions.forEach((t) => {
            const category = categories.find((c) => c.id === t.categoryId);
            // Skip if category not found or category type doesn't match current transaction type
            if (!category || category.type !== transactionType) return;

            const existing = data.find((d) => d.categoryId === category.id);
            if (existing) {
                existing.value += t.amount;
            } else {
                data.push({
                    categoryId: category.id,
                    name: category.name,
                    value: t.amount,
                    color: category.color,
                    icon: category.icon,
                    budget: getCategoryBudget(category.id)
                });
            }
        });

        return data.sort((a, b) => b.value - a.value);
    }, [transactions, categories, dateRange, transactionType]);

    // Calculate total expenses for percentage
    const totalExpenses = useMemo(() => {
        return chartData.reduce((sum, item) => sum + item.value, 0);
    }, [chartData]);

    // Calculate subcategory data for a category
    const getSubcategoryData = (categoryId: string) => {
        const categoryTransactions = getRelevantTransactions(categoryId);
        const subcategoryMap = new Map<string, { subcategory: any; total: number }>();

        categoryTransactions.forEach(t => {
            const subcategory = subcategories.find(s => s.id === t.subcategoryId);
            if (!subcategory) return;

            const existing = subcategoryMap.get(subcategory.id);
            if (existing) {
                existing.total += t.amount;
            } else {
                subcategoryMap.set(subcategory.id, {
                    subcategory,
                    total: t.amount
                });
            }
        });

        return Array.from(subcategoryMap.values()).sort((a, b) => b.total - a.total);
    };

    const toggleCategory = (categoryId: string) => {
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
    };

    const toggleSubcategory = (subcategoryId: string) => {
        setExpandedSubcategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(subcategoryId)) {
                newSet.delete(subcategoryId);
            } else {
                newSet.add(subcategoryId);
            }
            return newSet;
        });
    };

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
                    <h1 className="text-lg font-bold flex-1 text-center pr-8">報表</h1>
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
                                    : 'text-gray-500 hover:text-gray-700'
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
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={pendingCustomRange.start}
                                    onChange={(e) => setPendingCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                    className="flex-1 h-10 bg-gray-50 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="date"
                                    value={pendingCustomRange.end}
                                    onChange={(e) => setPendingCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                    className="flex-1 h-10 bg-gray-50 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={() => {
                                        setAppliedCustomRange(pendingCustomRange);
                                        setCustomRange(pendingCustomRange);
                                    }}
                                    className="h-10 px-4 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors text-sm whitespace-nowrap"
                                >
                                    套用
                                </button>
                            </div>
                        ) : (
                            // 月/年模式：日期選擇器 - 與自訂模式同樣高度（h-10）
                            <div className="flex items-center justify-between h-10 bg-gray-50 border border-gray-200 rounded-lg px-3">
                                <button onClick={handlePrev} className="p-1 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">
                                    ←
                                </button>
                                <button
                                    onClick={() => {
                                        if (viewMode === 'month') setIsDatePickerOpen(true);
                                    }}
                                    className={`flex-1 text-center px-4 ${viewMode === 'month' ? 'cursor-pointer hover:bg-gray-100 rounded-lg' : ''}`}
                                >
                                    <span className="text-sm font-medium text-gray-800">
                                        {dateRange.label}
                                    </span>
                                </button>
                                <button onClick={handleNext} className="p-1 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">
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
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            費用
                        </button>
                        <button
                            onClick={() => setTransactionType('income')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${transactionType === 'income'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            收入
                        </button>
                    </div>

                    {/* 4. 專案標籤篩選 */}
                    <div>
                        <button
                            onClick={() => setIsProjectFilterOpen(!isProjectFilterOpen)}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-2"
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
                                                    : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-500'
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
                                        className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
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
                        <h2 className="text-lg font-bold mb-4 text-gray-800 capitalize">
                            {transactionType === 'expense' ? '費用' : '收入'} {viewMode} Overview
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
                                        <XAxis type="number" hide />
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
                                        <Tooltip
                                            content={(props) => (
                                                <CustomTooltip {...props} transactionType={transactionType} />
                                            )}
                                            cursor={{ fill: 'transparent' }}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
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
                    < div className="space-y-3" >
                        <h3 className="font-bold text-gray-700 px-1">Details</h3>
                        {
                            chartData.map((item) => {
                                const budget = item.budget;
                                const remaining = budget !== null ? budget - item.value : null;
                                const percent = budget ? Math.min(100, (item.value / budget) * 100) : 0;
                                const isExpanded = expandedCategories.has(item.categoryId);
                                const subcategoryData = getSubcategoryData(item.categoryId);

                                return (
                                    <div key={item.categoryId} className="bg-white rounded-xl shadow-sm overflow-hidden">
                                        {/* Category Header */}
                                        <div
                                            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                            onClick={() => toggleCategory(item.categoryId)}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: `${item.color}20` }}>
                                                        {item.icon}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-800 flex items-center gap-2">
                                                            {item.name}
                                                            <span className="text-xs text-gray-400">
                                                                {isExpanded ? '▼' : '▶'}
                                                            </span>
                                                        </div>
                                                        {budget !== null && (
                                                            <div className="text-xs text-gray-500">
                                                                預算: TWD ${budget.toLocaleString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-gray-800">TWD ${item.value.toLocaleString()}</div>
                                                    {remaining !== null && (
                                                        <div className={`text-xs font-medium ${remaining >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                            {remaining >= 0 ? '剩餘: ' : '超支: '}TWD ${Math.abs(remaining).toLocaleString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {budget !== null && (
                                                <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${remaining && remaining < 0 ? 'bg-red-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${percent}%` }}
                                                    />
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
                                                    className="border-t border-gray-100"
                                                >
                                                    <div className="px-4 py-2 bg-gray-50">
                                                        {subcategoryData.map(({ subcategory, total }) => {
                                                            const subBudget = getSubcategoryBudget(subcategory.id);
                                                            const subRemaining = subBudget !== null ? subBudget - total : null;
                                                            const isSubExpanded = expandedSubcategories.has(subcategory.id);
                                                            const subTransactions = getRelevantTransactions(item.categoryId, subcategory.id);

                                                            return (
                                                                <div key={subcategory.id} className="mb-2 last:mb-0">
                                                                    {/* Subcategory Header */}
                                                                    <div
                                                                        className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleSubcategory(subcategory.id);
                                                                        }}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs text-gray-400">
                                                                                {isSubExpanded ? '▼' : '▶'}
                                                                            </span>
                                                                            <div>
                                                                                <div className="text-sm font-medium text-gray-700">{subcategory.name}</div>
                                                                                {subBudget !== null && (
                                                                                    <div className="text-xs text-gray-400">
                                                                                        預算: TWD ${subBudget.toLocaleString()}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div className="text-sm font-semibold text-gray-700">TWD ${total.toLocaleString()}</div>
                                                                            {subRemaining !== null && (
                                                                                <div className={`text-xs ${subRemaining >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                                                    {subRemaining >= 0 ? '剩餘: ' : '超支: '}TWD ${Math.abs(subRemaining).toLocaleString()}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Transactions */}
                                                                    <AnimatePresence>
                                                                        {isSubExpanded && (
                                                                            <motion.div
                                                                                initial={{ height: 0, opacity: 0 }}
                                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                                exit={{ height: 0, opacity: 0 }}
                                                                                transition={{ duration: 0.2 }}
                                                                                className="mt-2 ml-6 space-y-1"
                                                                            >
                                                                                {subTransactions.map(transaction => (
                                                                                    <div
                                                                                        key={transaction.id}
                                                                                        className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                                                                                    >
                                                                                        <div className="flex-1">
                                                                                            <div className="text-gray-600">
                                                                                                {format(new Date(transaction.date), 'yyyy/MM/dd')}
                                                                                            </div>
                                                                                            {transaction.note && (
                                                                                                <div className="text-gray-400 truncate">{transaction.note}</div>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="font-medium text-gray-700 ml-2">
                                                                                            TWD ${transaction.amount.toLocaleString()}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })
                        }
                    </div >
                </div>
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

export default Report;
