import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import type { Category, Subcategory } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// Available color palette
const CATEGORY_COLORS = [
    { name: '紅色', value: '#FF6B6B' },
    { name: '青色', value: '#4ECDC4' },
    { name: '藍色', value: '#45B7D1' },
    { name: '綠色', value: '#96CEB4' },
    { name: '米色', value: '#FFEEAD' },
    { name: '粉色', value: '#D4A5A5' },
    { name: '紫色', value: '#9B59B6' },
    { name: '深藍', value: '#3498DB' },
    { name: '黃色', value: '#F1C40F' },
    { name: '翠綠', value: '#2ECC71' },
    { name: '橘紅', value: '#E74C3C' },
    { name: '深綠', value: '#27AE60' },
    { name: '深橘', value: '#D35400' },
    { name: '靛藍', value: '#3F51B5' },
    { name: '棕色', value: '#8D6E63' },
    { name: '藍灰', value: '#607D8B' },
    { name: '桃紅', value: '#FF4081' },
    { name: '萊姆', value: '#CDDC39' },
    { name: '深紫', value: '#673AB7' },
    { name: '中灰', value: '#7F8C8D' },
    { name: '鴨綠', value: '#009688' },
    { name: '淺藍', value: '#03A9F4' },
    { name: '琥珀', value: '#FFC107' },
    { name: '藕荷', value: '#BA68C8' },
];

// 單獨的 CategoryItem 組件以正確使用 useDragControls
interface CategoryItemProps {
    category: Category;
    subcategories: Subcategory[];
    onEdit: (category: Category) => void;
    onEditSubcategory: (subcategory: Subcategory) => void;
    onAddSubcategory: (categoryId: string) => void;
    onToggleVisibility: (category: Category) => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({
    category,
    subcategories,
    onEdit,
    onEditSubcategory,
    onAddSubcategory,
    onToggleVisibility
}) => {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            key={category.id}
            value={category}
            dragListener={false}
            dragControls={dragControls}
            className="bg-white rounded-xl p-4 shadow-sm"
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => onEdit(category)}>
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                        style={{ backgroundColor: `${category.color}20`, color: category.color }}
                    >
                        {category.icon}
                    </div>
                    <div className="flex flex-col">
                        <span className={`font-medium ${category.isHidden ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {category.name}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Drag Handle Icon - 只有這裡可以拖曳 */}
                    <div
                        className="text-gray-300 cursor-grab active:cursor-grabbing p-2 touch-none"
                        onPointerDown={(e) => dragControls.start(e)}
                    >
                        ☰
                    </div>

                    {/* Toggle Switch */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleVisibility(category); }}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${!category.isHidden ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                        <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${!category.isHidden ? 'translate-x-6' : 'translate-x-0'}`}
                        />
                    </button>
                </div>
            </div>

            {/* Subcategories Preview */}
            <div className="pl-13 flex flex-wrap gap-2 mt-2">
                {subcategories
                    .filter((s) => s.parentId === category.id)
                    .map((sub) => (
                        <button
                            key={sub.id}
                            onClick={() => onEditSubcategory(sub)}
                            className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors"
                        >
                            {sub.name}
                        </button>
                    ))}
                {/* Add Subcategory Button */}
                <button
                    onClick={() => onAddSubcategory(category.id)}
                    className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 border border-transparent transition-colors flex items-center gap-1"
                >
                    <span>+</span> 新增
                </button>
            </div>
        </Reorder.Item>
    );
};

const CategorySettings: React.FC = () => {
    const { categories, subcategories, transactions, updateCategory, addCategory, updateSubcategory, deleteCategory, deleteSubcategory, addSubcategory, updateTransaction } = useAppContext();
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
    const navigate = useNavigate();

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add_category' | 'edit_category' | 'edit_subcategory' | 'add_subcategory' | 'delete_category_prompt'>('add_category');
    const [editingItem, setEditingItem] = useState<Category | Subcategory | null>(null);
    const [targetCategoryId, setTargetCategoryId] = useState<string>('');

    // Form State
    const [formName, setFormName] = useState('');
    const [formIcon, setFormIcon] = useState('❓');
    const [formColor, setFormColor] = useState('#999999');

    const currentTypeCategories = categories
        .filter((c) => c.type === activeTab)
        .sort((a, b) => a.order - b.order);

    const toggleVisibility = (category: Category) => {
        updateCategory({ ...category, isHidden: !category.isHidden });
    };

    const openAddCategoryModal = () => {
        setModalMode('add_category');
        setFormName('');
        setFormIcon('❓');
        setFormColor('#999999');
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const openEditCategoryModal = (category: Category) => {
        setModalMode('edit_category');
        setFormName(category.name);
        setFormIcon(category.icon);
        setFormColor(category.color);
        setEditingItem(category);
        setIsModalOpen(true);
    };

    const openEditSubcategoryModal = (subcategory: Subcategory) => {
        setModalMode('edit_subcategory');
        setFormName(subcategory.name);
        setEditingItem(subcategory);
        setIsModalOpen(true);
    };

    const openAddSubcategoryModal = (categoryId: string) => {
        setModalMode('add_subcategory');
        setFormName('');
        setTargetCategoryId(categoryId); // Temporarily store parent ID in targetCategoryId
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formName.trim()) return;

        if (modalMode === 'add_category') {
            addCategory({
                id: uuidv4(),
                name: formName,
                icon: formIcon,
                color: formColor,
                type: activeTab,
                isHidden: false,
                order: categories.length,
            });
        } else if (modalMode === 'edit_category' && editingItem) {
            updateCategory({
                ...(editingItem as Category),
                name: formName,
                icon: formIcon,
                color: formColor,
            });
        } else if (modalMode === 'edit_subcategory' && editingItem) {
            updateSubcategory({
                ...(editingItem as Subcategory),
                name: formName,
            });
        } else if (modalMode === 'add_subcategory') {
            const parentId = targetCategoryId;
            addSubcategory({
                id: uuidv4(),
                parentId: parentId,
                name: formName,
                isHidden: false,
                order: subcategories.filter(s => s.parentId === parentId).length,
                yearlyBudget: 0
            });
        }

        setIsModalOpen(false);
    };

    const handleReorder = (newOrder: Category[]) => {
        newOrder.forEach((cat, index) => {
            if (cat.order !== index) {
                updateCategory({ ...cat, order: index });
            }
        });
    };

    const handleDeleteSubcategory = () => {
        if (!editingItem || modalMode !== 'edit_subcategory') return;
        const sub = editingItem as Subcategory;

        if (window.confirm(`確定要刪除「${sub.name}」嗎？相關交易將移至「未分類」。`)) {
            let uncategorized = subcategories.find(s => s.parentId === sub.parentId && s.name === 'Uncategorized');

            if (!uncategorized) {
                const newUncategorized: Subcategory = {
                    id: uuidv4(),
                    parentId: sub.parentId,
                    name: 'Uncategorized',
                    yearlyBudget: 0,
                    isHidden: false,
                    order: 999
                };
                addSubcategory(newUncategorized);
                uncategorized = newUncategorized;
            }

            const relatedTransactions = transactions.filter(t => t.subcategoryId === sub.id);
            relatedTransactions.forEach(t => {
                updateTransaction({ ...t, subcategoryId: uncategorized!.id });
            });

            deleteSubcategory(sub.id);
            setIsModalOpen(false);
        }
    };

    const initiateDeleteCategory = () => {
        if (!editingItem || modalMode !== 'edit_category') return;
        setModalMode('delete_category_prompt');
        setTargetCategoryId('');
    };

    const confirmDeleteCategory = () => {
        if (!editingItem || !targetCategoryId) return;
        const cat = editingItem as Category;

        let targetUncategorized = subcategories.find(s => s.parentId === targetCategoryId && s.name === 'Uncategorized');

        if (!targetUncategorized) {
            const newUncategorized: Subcategory = {
                id: uuidv4(),
                parentId: targetCategoryId,
                name: 'Uncategorized',
                yearlyBudget: 0,
                isHidden: false,
                order: 999
            };
            addSubcategory(newUncategorized);
            targetUncategorized = newUncategorized;
        }

        const relatedTransactions = transactions.filter(t => t.categoryId === cat.id);
        relatedTransactions.forEach(t => {
            updateTransaction({
                ...t,
                categoryId: targetCategoryId,
                subcategoryId: targetUncategorized!.id
            });
        });

        const relatedSubcategories = subcategories.filter(s => s.parentId === cat.id);
        relatedSubcategories.forEach(s => deleteSubcategory(s.id));

        deleteCategory(cat.id);
        setIsModalOpen(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full bg-gray-50"
        >
            {/* Header */}
            <div className="bg-white p-4 shadow-sm z-10 flex items-center">
                <button onClick={() => navigate('/settings')} className="mr-4 text-gray-500 text-xl" style={{ fontVariant: 'normal' }}>
                    ↩︎
                </button>
                <h1 className="text-lg font-bold flex-1 text-center pr-8">分類設定</h1>
            </div>

            <div className="bg-white p-2 shadow-sm z-10 border-t border-gray-100">
                <div className="flex p-1 bg-gray-100 rounded-lg">
                    <button
                        onClick={() => setActiveTab('expense')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'expense' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                            }`}
                    >
                        費用
                    </button>
                    <button
                        onClick={() => setActiveTab('income')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'income' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                            }`}
                    >
                        收入
                    </button>
                </div>
            </div>

            {/* Category List */}
            <div className="flex-1 overflow-y-auto p-4 pb-24">
                <Reorder.Group axis="y" values={currentTypeCategories} onReorder={handleReorder} className="space-y-3">
                    {currentTypeCategories.map((category) => (
                        <CategoryItem
                            key={category.id}
                            category={category}
                            subcategories={subcategories}
                            onEdit={openEditCategoryModal}
                            onEditSubcategory={openEditSubcategoryModal}
                            onAddSubcategory={openAddSubcategoryModal}
                            onToggleVisibility={toggleVisibility}
                        />
                    ))}
                </Reorder.Group>

                {/* Add Category Button */}
                <button
                    onClick={openAddCategoryModal}
                    className="w-full py-3 mt-4 bg-blue-50 text-blue-600 font-medium rounded-xl border border-blue-100"
                >
                    + 新增分類
                </button>
            </div>

            {/* Unified Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-sm"
                        >
                            <h3 className="text-lg font-bold mb-4">
                                {modalMode === 'add_category' ? '新增分類' :
                                    modalMode === 'edit_category' ? '編輯分類' :
                                        modalMode === 'add_subcategory' ? '新增子分類' :
                                            modalMode === 'edit_subcategory' ? '編輯子分類' :
                                                '刪除分類'}
                            </h3>

                            {modalMode === 'delete_category_prompt' ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600">
                                        選擇要移動現有交易的目標分類：
                                    </p>
                                    <select
                                        value={targetCategoryId}
                                        onChange={(e) => setTargetCategoryId(e.target.value)}
                                        className="w-full p-2 border rounded-lg"
                                    >
                                        <option value="">請選擇分類</option>
                                        {categories
                                            .filter(c => c.id !== editingItem?.id && c.type === (editingItem as Category).type)
                                            .map(c => (
                                                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                            ))}
                                    </select>
                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={() => setModalMode('edit_category')}
                                            className="flex-1 py-2 text-gray-600 bg-gray-100 rounded-lg"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={confirmDeleteCategory}
                                            disabled={!targetCategoryId}
                                            className="flex-1 py-2 text-white bg-red-500 rounded-lg disabled:opacity-50"
                                        >
                                            確定刪除
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3 mb-6">
                                        {modalMode !== 'edit_subcategory' && modalMode !== 'add_subcategory' && (
                                            <>
                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-1">圖示</label>
                                                    <input
                                                        type="text"
                                                        value={formIcon}
                                                        onChange={(e) => setFormIcon(e.target.value)}
                                                        className="w-12 h-12 text-center text-2xl border rounded-lg"
                                                        placeholder=""
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-2">背景顏色</label>
                                                    <div className="grid grid-cols-6 gap-2">
                                                        {CATEGORY_COLORS.map((colorOption) => (
                                                            <button
                                                                key={colorOption.value}
                                                                type="button"
                                                                onClick={() => setFormColor(colorOption.value)}
                                                                className={`w-10 h-10 rounded-full transition-all ${formColor === colorOption.value
                                                                    ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                                                                    : 'hover:scale-105'
                                                                    }`}
                                                                style={{ backgroundColor: colorOption.value }}
                                                                title={colorOption.name}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">名稱</label>
                                            <input
                                                type="text"
                                                value={formName}
                                                onChange={(e) => setFormName(e.target.value)}
                                                className="w-full px-4 py-2 border rounded-lg"
                                                placeholder="請輸入名稱"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {modalMode !== 'add_category' && modalMode !== 'add_subcategory' && (
                                            <button
                                                onClick={modalMode === 'edit_category' ? initiateDeleteCategory : handleDeleteSubcategory}
                                                className="px-4 py-2 text-red-500 bg-red-50 rounded-lg"
                                            >
                                                刪除
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setIsModalOpen(false)}
                                            className="flex-1 py-2 text-gray-600 bg-gray-100 rounded-lg"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className="flex-1 py-2 text-white bg-blue-500 rounded-lg"
                                        >
                                            儲存
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default CategorySettings;
