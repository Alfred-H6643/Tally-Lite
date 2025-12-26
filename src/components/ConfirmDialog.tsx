import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    hideIcon?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = '確定',
    cancelText = '取消',
    type = 'danger',
    hideIcon = false
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                    />

                    {/* Dialog Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative bg-white w-full max-w-[320px] rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 pb-4 text-center">
                            {!hideIcon && (
                                <div className="mb-4 flex justify-center">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${type === 'danger' ? 'bg-red-50 text-red-500' :
                                        type === 'warning' ? 'bg-orange-50 text-orange-500' :
                                            'bg-blue-50 text-blue-500'
                                        }`}>
                                        {type === 'danger' ? (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                                            </svg>
                                        ) : (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            )}
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                            {message && <p className="text-sm text-gray-500 leading-relaxed px-2">{message}</p>}
                        </div>

                        <div className="p-4 flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                className={`w-full py-3 rounded-xl text-white font-bold transition-all active:scale-[0.98] ${type === 'danger' ? 'bg-red-500 active:bg-red-600 shadow-red-100 shadow-lg' :
                                    type === 'warning' ? 'bg-orange-500 active:bg-orange-600 shadow-orange-100 shadow-lg' :
                                        'bg-blue-500 active:bg-blue-600 shadow-blue-100 shadow-lg'
                                    }`}
                            >
                                {confirmText}
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full py-3 rounded-xl text-gray-500 font-bold hover:bg-gray-50 active:bg-gray-100 transition-all active:scale-[0.98]"
                            >
                                {cancelText}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmDialog;
