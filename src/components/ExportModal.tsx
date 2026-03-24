import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { useAppContext } from '../context/AppContext';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import Papa from 'papaparse';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ExportStatus = 'idle' | 'validating' | 'generating' | 'sending' | 'success' | 'error';

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
    const { user } = useFirebaseAuth();
    const { transactions, categories, subcategories, projectTags, exportSettings } = useAppContext();

    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [recipientEmail, setRecipientEmail] = useState('');
    const [status, setStatus] = useState<ExportStatus>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [progress, setProgress] = useState('');

    useEffect(() => {
        if (isOpen && user?.email) {
            setRecipientEmail(user.email);
            setStatus('idle');
            setErrorMessage('');
            setProgress('');
        }
    }, [isOpen, user]);

    const handleExport = async () => {
        setErrorMessage('');

        // 1. Validation
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = differenceInDays(end, start);

        if (days < 0) {
            setErrorMessage('結束日期不能早於開始日期');
            return;
        }

        if (days > 1100) {
            setErrorMessage('日期範圍不能超過 3 年 (約 1100 天)');
            return;
        }

        if (!recipientEmail || !recipientEmail.includes('@')) {
            setErrorMessage('請輸入有效的 Email 地址');
            return;
        }

        if (!exportSettings.scriptUrl) {
            setErrorMessage('系統尚未設定 Google Script URL，請設定環境變數或至 Admin Settings 手動填入。');
            return;
        }

        try {
            setStatus('generating');
            setProgress('正在準備資料...');

            // 2. Filter Data
            const filteredTransactions = transactions.filter(t => {
                const d = new Date(t.date);
                return d >= start && d <= end;
            });

            if (filteredTransactions.length === 0) {
                setErrorMessage('選定的日期範圍內沒有交易記錄');
                setStatus('idle');
                return;
            }

            setProgress(`包含 ${filteredTransactions.length} 筆交易，正在生成 CSV...`);

            // 3. Generate CSV Data
            const csvData = filteredTransactions.map(t => {
                const category = categories.find(c => c.id === t.categoryId)?.name || 'Unknown';
                const subcategory = subcategories.find(s => s.id === t.subcategoryId)?.name || '';
                const tagNames = (t.tags || []).map(tagId => projectTags.find(p => p.id === tagId)?.name).filter(Boolean).join(', ');

                return {
                    Date: format(new Date(t.date), 'yyyy-MM-dd'),
                    Type: t.type,
                    Category: category,
                    Subcategory: subcategory,
                    Note: t.note || '',
                    Tags: tagNames,
                    Currency: t.currency || 'TWD',
                    Amount: t.amount
                };
            });

            const csvString = Papa.unparse(csvData);

            // 4. Send Email via Google Apps Script
            setStatus('sending');
            setProgress('正在發送 Email，請勿關閉視窗...');

            const payload = {
                email: recipientEmail,
                csvContent: csvString,
                filename: `transactions_${startDate}_${endDate}.csv`,
                start_date: startDate,
                end_date: endDate,
                record_count: filteredTransactions.length
            };

            // Use fetch with 'text/plain' to avoid CORS preflight issues with GAS
            const response = await fetch(exportSettings.scriptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                // Try to read error if possible, but CORS might block it if mode is not correct. 
                // However, with Content-Type text/plain, it's a simple request.
                // GAS usually returns a redirect or JSON.
                throw new Error(`Server responded with ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'error') {
                throw new Error(result.message);
            }

            setStatus('success');
            setProgress('發送成功！');

        } catch (error: any) {
            console.error('Export error:', error);
            setStatus('error');
            setErrorMessage(`發送失敗: ${error.text || error.message || '未知錯誤'}`);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">匯出交易記錄</h3>
                            <button onClick={onClose} disabled={status === 'sending'} className="text-gray-400 hover:text-gray-600">
                                ✕
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            {status === 'success' ? (
                                <div className="text-center py-6">
                                    <div className="text-5xl mb-4">✅</div>
                                    <h4 className="text-xl font-bold text-gray-800 mb-2">已發送完成！</h4>
                                    <p className="text-gray-500 mb-6">
                                        CSV 檔案已發送至 <br />
                                        <span className="font-medium text-gray-900">{recipientEmail}</span>
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className="w-full bg-gray-100 text-gray-800 font-bold py-3 rounded-xl hover:bg-gray-200"
                                    >
                                        關閉
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Date Range */}
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">開始日期</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                disabled={status === 'sending'}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">結束日期</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                disabled={status === 'sending'}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Recipient */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">收件 Email</label>
                                        <input
                                            type="email"
                                            value={recipientEmail}
                                            onChange={(e) => setRecipientEmail(e.target.value)}
                                            disabled={status === 'sending'}
                                            placeholder="請輸入 Email"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">此變更僅影響本次發送，不會修改帳號設定。</p>
                                    </div>

                                    {/* Status / Error */}
                                    {errorMessage && (
                                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                            <span>⚠️</span>
                                            {errorMessage}
                                        </div>
                                    )}

                                    {(status === 'generating' || status === 'sending') && (
                                        <div className="p-4 bg-blue-50 text-blue-700 text-sm rounded-lg flex flex-col items-center gap-2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
                                            <span className="font-medium">{progress}</span>
                                            {status === 'sending' && (
                                                <span className="text-xs text-blue-500 font-bold">⚠️ 請勿關閉此視窗</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={onClose}
                                            disabled={status === 'sending'}
                                            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 disabled:opacity-50"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={handleExport}
                                            disabled={status === 'sending'}
                                            className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 disabled:opacity-50 shadow-sm shadow-blue-200"
                                        >
                                            {status === 'sending' ? '發送中...' : '匯出 CSV'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ExportModal;
