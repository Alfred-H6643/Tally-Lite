import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { useAppContext } from '../context/AppContext';

interface BatchDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const BatchDeleteModal: React.FC<BatchDeleteModalProps> = ({ isOpen, onClose }) => {
    const { transactions, batchDeleteTransactions } = useAppContext();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState<'idle' | 'deleting' | 'success'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [confirmCount, setConfirmCount] = useState(0);

    const handleDelete = async () => {
        if (!startDate || !endDate) {
            setErrorMessage('請選擇日期範圍');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = differenceInDays(end, start);

        if (days < 0) {
            setErrorMessage('結束日期不能早於開始日期');
            return;
        }

        if (days > 365) {
            setErrorMessage('單次刪除範圍不能超過 365 天');
            return;
        }

        const toDelete = transactions.filter(t => {
            const d = new Date(t.date);
            return d >= start && d <= end;
        });

        if (toDelete.length === 0) {
            setErrorMessage('選定範圍內沒有交易記錄');
            return;
        }

        if (confirmCount < 1) {
            setConfirmCount(1);
            setErrorMessage(`⚠️ 此動作無法復原。確定要刪除範圍內的 ${toDelete.length} 筆交易嗎？點擊第二次以確認。`);
            return;
        }

        try {
            setStatus('deleting');
            await batchDeleteTransactions(toDelete.map(t => t.id));
            setStatus('success');
        } catch (error: any) {
            setErrorMessage(`刪除失敗: ${error.message}`);
            setStatus('idle');
            setConfirmCount(0);
        }
    };

    const handleClose = () => {
        setStartDate('');
        setEndDate('');
        setStatus('idle');
        setErrorMessage('');
        setConfirmCount(0);
        onClose();
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
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-red-600">批次刪除交易</h3>
                            <button onClick={handleClose} disabled={status === 'deleting'} className="text-gray-400 hover:text-gray-600">
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {status === 'success' ? (
                                <div className="text-center py-6">
                                    <div className="text-5xl mb-4">🗑️</div>
                                    <h4 className="text-xl font-bold text-gray-800 mb-2">刪除成功！</h4>
                                    <p className="text-gray-500 mb-6 font-medium">資料已永久移除。</p>
                                    <button
                                        onClick={handleClose}
                                        className="w-full bg-gray-100 text-gray-800 font-bold py-3 rounded-xl hover:bg-gray-200"
                                    >
                                        關閉
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg font-medium leading-relaxed">
                                        💡 小技巧：此功能可用於清除錯誤匯入的資料。刪除後無法復原，請務必先匯出備份。
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">開始日期</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => { setStartDate(e.target.value); setConfirmCount(0); }}
                                                disabled={status === 'deleting'}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">結束日期</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => { setEndDate(e.target.value); setConfirmCount(0); }}
                                                disabled={status === 'deleting'}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                            />
                                        </div>
                                    </div>

                                    {errorMessage && (
                                        <div className={`p-3 text-sm rounded-lg flex items-center gap-2 ${confirmCount > 0 ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-600'}`}>
                                            <span>{confirmCount > 0 ? '⚠️' : '❌'}</span>
                                            {errorMessage}
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={handleClose}
                                            disabled={status === 'deleting'}
                                            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            disabled={status === 'deleting'}
                                            className={`flex-1 py-3 rounded-xl text-white font-bold transition-all shadow-sm ${confirmCount > 0 ? 'bg-red-600 scale-105' : 'bg-red-500 hover:bg-red-600'}`}
                                        >
                                            {status === 'deleting' ? '刪除中...' : confirmCount > 0 ? '確定刪除！' : '刪除資料'}
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

export default BatchDeleteModal;
