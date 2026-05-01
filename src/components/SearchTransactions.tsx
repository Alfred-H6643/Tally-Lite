import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { useAppContext } from '../context/AppContext';
import { TransactionReportItem } from './Report';

const SearchTransactions: React.FC = () => {
    const navigate = useNavigate();
    const { transactions, projectTags, categories, subcategories, openModal, setTransactionFilter } = useAppContext();

    const categoryNameMap = useMemo(() => {
        const m = new Map<string, string>();
        categories.forEach(c => m.set(c.id, c.name));
        return m;
    }, [categories]);

    const subcategoryNameMap = useMemo(() => {
        const m = new Map<string, string>();
        subcategories.forEach(s => m.set(s.id, s.name));
        return m;
    }, [subcategories]);

    const buildSubtitle = (t: { categoryId: string; subcategoryId: string; note?: string }) => {
        const parts: string[] = [];
        const cat = categoryNameMap.get(t.categoryId);
        const sub = subcategoryNameMap.get(t.subcategoryId);
        if (cat) parts.push(cat);
        if (sub) parts.push(sub);
        if (t.note) parts.push(t.note);
        return parts.join(' › ');
    };

    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState<number>(currentYear);
    const [keyword, setKeyword] = useState<string>('');
    const [committedKeyword, setCommittedKeyword] = useState<string>('');

    const yearRange = useMemo(() => {
        const anchor = new Date(year, 0, 1);
        return { start: startOfYear(anchor), end: endOfYear(anchor) };
    }, [year]);

    useEffect(() => {
        setTransactionFilter({ start: yearRange.start, end: yearRange.end });
    }, [yearRange, setTransactionFilter]);

    const trimmedKeyword = keyword.trim();
    const canSearch = trimmedKeyword.length > 0;

    const handleSearch = () => {
        if (!canSearch) return;
        setCommittedKeyword(trimmedKeyword);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Skip Enter while IME composition is active (e.g. confirming Chinese input)
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === 'Enter') handleSearch();
    };

    const results = useMemo(() => {
        if (!committedKeyword) return [];
        const needle = committedKeyword.toLowerCase();
        return transactions
            .filter(t => {
                if (!t.note) return false;
                const tDate = new Date(t.date);
                if (!isWithinInterval(tDate, { start: yearRange.start, end: yearRange.end })) return false;
                return t.note.toLowerCase().includes(needle);
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, committedKeyword, yearRange]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full bg-gray-50"
        >
            {/* Header */}
            <div className="bg-white shadow-sm z-10 p-4">
                <div className="flex items-center">
                    <button
                        onClick={() => navigate('/report')}
                        className="mr-4 text-gray-500 text-xl"
                        style={{ fontVariant: 'normal' }}
                        aria-label="返回報表"
                    >
                        ↩︎
                    </button>
                    <h1 className="text-lg font-bold flex-1 text-center pr-8">搜尋備註</h1>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Controls */}
                <div className="bg-white p-4 pb-3 space-y-3">
                    {/* Year Switcher */}
                    <div className="flex items-center justify-between h-10 bg-gray-50 border border-gray-200 rounded-lg px-3">
                        <button
                            onClick={() => setYear(y => y - 1)}
                            className="p-1 text-gray-500 active:bg-gray-200 rounded-lg transition-colors"
                            aria-label="上一年"
                        >
                            ←
                        </button>
                        <span className="text-sm font-medium text-gray-800">{year}</span>
                        <button
                            onClick={() => setYear(y => y + 1)}
                            className="p-1 text-gray-500 active:bg-gray-200 rounded-lg transition-colors"
                            aria-label="下一年"
                        >
                            →
                        </button>
                    </div>

                    {/* Search Input + Button */}
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="輸入備註關鍵字"
                            className="flex-1 h-10 bg-gray-50 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={!canSearch}
                            className={`h-10 px-4 rounded-lg text-sm font-medium transition-colors ${canSearch
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            搜尋
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="p-4 pb-24">
                    {committedKeyword === '' ? null : results.length > 0 ? (
                        <div className="space-y-2">
                            <div className="text-xs text-gray-500 px-1">
                                共 {results.length} 筆結果
                            </div>
                            {results.map(t => (
                                <TransactionReportItem
                                    key={t.id}
                                    transaction={t}
                                    projectTags={projectTags}
                                    onEditClick={openModal}
                                    subtitle={buildSubtitle(t)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-sm text-gray-400 py-8">
                            無符合結果
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default SearchTransactions;
