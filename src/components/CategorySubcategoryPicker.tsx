import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import type { Category } from '../types';

interface PickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (categoryId: string, subcategoryId: string) => void;
    title?: string;
}

const CategorySubcategoryPicker: React.FC<PickerProps> = ({ isOpen, onClose, onSelect, title = '選擇分類' }) => {
    const { categories, subcategories } = useAppContext();
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

    const filteredSubcategories = useMemo(() => {
        if (!selectedCategory) return [];
        return subcategories.filter(s => s.parentId === selectedCategory.id);
    }, [selectedCategory, subcategories]);

    const handleBack = () => setSelectedCategory(null);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-x-0 bottom-0 bg-white rounded-t-[32px] z-[101] max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
                    >
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                {selectedCategory && (
                                    <button onClick={handleBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                    </button>
                                )}
                                <h3 className="text-xl font-bold text-gray-800">
                                    {selectedCategory ? selectedCategory.name : title}
                                </h3>
                            </div>
                            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {!selectedCategory ? (
                                <div className="grid grid-cols-3 gap-3">
                                    {categories.sort((a, b) => (a.order || 0) - (b.order || 0)).map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat)}
                                            className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all text-center"
                                        >
                                            <div
                                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-gray-100"
                                                style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                                            >
                                                {cat.icon}
                                            </div>
                                            <span className="text-xs font-bold text-gray-600 truncate w-full">{cat.name}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {filteredSubcategories.sort((a, b) => (a.order || 0) - (b.order || 0)).map(sub => (
                                        <button
                                            key={sub.id}
                                            onClick={() => {
                                                onSelect(selectedCategory.id, sub.id);
                                                onClose();
                                                setTimeout(() => setSelectedCategory(null), 300);
                                            }}
                                            className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all text-left border border-transparent hover:border-gray-200"
                                        >
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                                                style={{ backgroundColor: `${selectedCategory.color}20`, color: selectedCategory.color }}
                                            >
                                                {selectedCategory.icon}
                                            </div>
                                            <span className="text-sm font-bold text-gray-700 truncate">{sub.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50/50 border-t border-gray-100 shrink-0">
                            <p className="text-xs text-gray-400 text-center">請選擇目標子分類以進行批次修改</p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CategorySubcategoryPicker;
