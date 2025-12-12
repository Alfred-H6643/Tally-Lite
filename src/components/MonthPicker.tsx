import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MonthPickerProps {
    isOpen: boolean;
    onClose: () => void;
    currentDate: Date;
    onSelect: (date: Date) => void;
}

const MonthPicker: React.FC<MonthPickerProps> = ({ isOpen, onClose, currentDate, onSelect }) => {
    const [year, setYear] = useState(currentDate.getFullYear());

    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    const handleSelect = (monthIndex: number) => {
        const newDate = new Date(year, monthIndex, 1);
        onSelect(newDate);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
                    />

                    {/* Picker Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
                    >
                        {/* Year Header */}
                        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
                            <button onClick={() => setYear(year - 1)} className="p-2 text-gray-500 hover:text-gray-800">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                            </button>
                            <span className="text-xl font-bold text-gray-800">{year}</span>
                            <button onClick={() => setYear(year + 1)} className="p-2 text-gray-500 hover:text-gray-800">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                            </button>
                        </div>

                        {/* Months Grid */}
                        <div className="p-4 grid grid-cols-4 gap-3">
                            {months.map((m, idx) => (
                                <button
                                    key={m}
                                    onClick={() => handleSelect(idx)}
                                    className={`py-3 rounded-xl text-sm font-medium transition-colors ${year === currentDate.getFullYear() && idx === currentDate.getMonth()
                                            ? 'bg-[#E3B873] text-white shadow-md shadow-orange-100'
                                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    {m}月
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default MonthPicker;
