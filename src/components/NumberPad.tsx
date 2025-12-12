import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface NumberPadProps {
    onNumberClick: (num: string) => void;
    onDelete: () => void;
    onConfirm: () => void;
    currency: string;
    onCurrencyChange: (currency: string) => void;
}

const CURRENCIES = ['TWD', 'JPY', 'USD', 'EUR'];

const NumberPad: React.FC<NumberPadProps> = ({ onNumberClick, onDelete, onConfirm, currency, onCurrencyChange }) => {
    const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);

    return (
        <div className="bg-[#1C1C1E] p-4 pb-8 relative z-20">
            {/* Currency Menu */}
            <AnimatePresence>
                {isCurrencyOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsCurrencyOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="absolute bottom-20 left-4 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-700 z-20 w-32"
                        >
                            {CURRENCIES.map(c => (
                                <button
                                    key={c}
                                    onClick={() => {
                                        onCurrencyChange(c);
                                        setIsCurrencyOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 text-white font-medium hover:bg-gray-700 flex justify-between ${currency === c ? 'bg-gray-700' : ''}`}
                                >
                                    <span>{c}</span>
                                    {currency === c && <span className="text-[#E3B873]">✓</span>}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-4 gap-x-6 gap-y-4">
                {/* Row 1 */}
                <button onClick={() => onNumberClick('7')} className="text-2xl text-white font-medium py-3">7</button>
                <button onClick={() => onNumberClick('8')} className="text-2xl text-white font-medium py-3">8</button>
                <button onClick={() => onNumberClick('9')} className="text-2xl text-white font-medium py-3">9</button>
                <button onClick={onDelete} className="flex items-center justify-center text-[#E3B873] active:opacity-70">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
                        <line x1="18" y1="9" x2="12" y2="15"></line>
                        <line x1="12" y1="9" x2="18" y2="15"></line>
                    </svg>
                </button>

                {/* Row 2 */}
                <button onClick={() => onNumberClick('4')} className="text-2xl text-white font-medium py-3">4</button>
                <button onClick={() => onNumberClick('5')} className="text-2xl text-white font-medium py-3">5</button>
                <button onClick={() => onNumberClick('6')} className="text-2xl text-white font-medium py-3">6</button>
                <button onClick={() => onNumberClick('plus')} className="text-2xl text-[#E3B873] font-medium py-3">+</button>

                {/* Row 3 */}
                <button onClick={() => onNumberClick('1')} className="text-2xl text-white font-medium py-3">1</button>
                <button onClick={() => onNumberClick('2')} className="text-2xl text-white font-medium py-3">2</button>
                <button onClick={() => onNumberClick('3')} className="text-2xl text-white font-medium py-3">3</button>
                <button onClick={() => onNumberClick('minus')} className="text-2xl text-[#E3B873] font-medium py-3">-</button>

                {/* Row 4 */}
                <button
                    onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                    className="text-lg text-white font-medium py-3 flex items-center justify-center gap-1 active:opacity-70"
                >
                    {currency} <span className="text-[10px] opacity-70">▼</span>
                </button>
                <button onClick={() => onNumberClick('0')} className="text-2xl text-white font-medium py-3">0</button>
                <button onClick={() => onNumberClick('.')} className="text-2xl text-white font-medium py-3">.</button>
                <button onClick={onConfirm} className="flex items-center justify-center text-[#E3B873] active:opacity-70">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default NumberPad;
