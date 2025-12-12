import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { Category, Subcategory, Transaction, ProjectTag, Budget } from '../types';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { orderBy } from 'firebase/firestore';

interface AppContextType {
    categories: Category[];
    subcategories: Subcategory[];
    transactions: Transaction[];
    projectTags: ProjectTag[];
    budgets: Budget[];
    addTransaction: (transaction: Transaction) => void;
    deleteTransaction: (id: string) => void;
    updateTransaction: (transaction: Transaction) => void;
    addCategory: (category: Category) => void;
    updateCategory: (category: Category) => void;
    deleteCategory: (id: string) => void;
    addSubcategory: (subcategory: Subcategory) => void;
    updateSubcategory: (subcategory: Subcategory) => void;
    deleteSubcategory: (id: string) => void;
    addProjectTag: (tag: ProjectTag) => void;
    updateProjectTag: (tag: ProjectTag) => void;
    deleteProjectTag: (id: string) => void;

    // Budget Management
    addBudget: (budget: Budget) => void;
    updateBudget: (budget: Budget) => void;
    deleteBudget: (id: string) => void;
    getBudgetForCategory: (categoryId: string, year: number) => number;
    getBudgetForSubcategory: (subcategoryId: string, year: number) => number;
    copyBudgetsToYear: (fromYear: number, toYear: number) => void;

    // UI State
    isModalOpen: boolean;
    editingTransaction?: Transaction;
    openModal: (transaction?: Transaction) => void;
    closeModal: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useFirebaseAuth();
    const userId = user?.uid;

    // Firestore Collections
    // Only fetch if we have a userId
    const {
        data: categories,
        add: addCategoryFn,
        update: updateCategoryFn,
        remove: deleteCategoryFn
    } = useFirestoreCollection<Category>(
        userId ? `users/${userId}/categories` : '',
        [orderBy('order', 'asc')]
    );

    const {
        data: subcategories,
        add: addSubcategoryFn,
        update: updateSubcategoryFn,
        remove: deleteSubcategoryFn
    } = useFirestoreCollection<Subcategory>(
        userId ? `users/${userId}/subcategories` : '',
        [orderBy('order', 'asc')]
    );

    const {
        data: transactions,
        add: addTransactionFn,
        update: updateTransactionFn,
        remove: deleteTransactionFn
    } = useFirestoreCollection<Transaction>(
        userId ? `users/${userId}/transactions` : '',
        [orderBy('date', 'desc')]
    );

    const {
        data: projectTags,
        add: addProjectTagFn,
        update: updateProjectTagFn,
        remove: deleteProjectTagFn
    } = useFirestoreCollection<ProjectTag>(
        userId ? `users/${userId}/projectTags` : '',
        [orderBy('order', 'asc')]
    );

    const {
        data: budgets,
        add: addBudgetFn,
        update: updateBudgetFn,
        remove: deleteBudgetFn
    } = useFirestoreCollection<Budget>(
        userId ? `users/${userId}/budgets` : ''
    );

    // Wrappers to match Context Interface
    const addTransaction = (transaction: Transaction) => {
        const { id, ...data } = transaction;
        addTransactionFn(data);
    };
    const updateTransaction = (transaction: Transaction) => updateTransactionFn(transaction.id, transaction);
    const deleteTransaction = (id: string) => deleteTransactionFn(id);

    const addCategory = (category: Category) => {
        const { id, ...data } = category;
        addCategoryFn(data);
    };
    const updateCategory = (category: Category) => updateCategoryFn(category.id, category);
    const deleteCategory = (id: string) => deleteCategoryFn(id);

    const addSubcategory = (subcategory: Subcategory) => {
        const { id, ...data } = subcategory;
        addSubcategoryFn(data);
    };
    const updateSubcategory = (subcategory: Subcategory) => updateSubcategoryFn(subcategory.id, subcategory);
    const deleteSubcategory = (id: string) => deleteSubcategoryFn(id);

    const addProjectTag = (tag: ProjectTag) => {
        const { id, ...data } = tag;
        addProjectTagFn(data);
    };
    const updateProjectTag = (tag: ProjectTag) => updateProjectTagFn(tag.id, tag);
    const deleteProjectTag = (id: string) => deleteProjectTagFn(id);

    const addBudget = (budget: Budget) => {
        const { id, ...data } = budget;
        addBudgetFn(data);
    };
    const updateBudget = (budget: Budget) => updateBudgetFn(budget.id, budget);
    const deleteBudget = (id: string) => deleteBudgetFn(id);

    // Helper functions
    const getBudgetForCategory = (categoryId: string, year: number): number => {
        const budget = budgets.find(
            b => b.categoryId === categoryId &&
                !b.subcategoryId &&
                b.year === year
        );
        if (budget) return budget.amount;
        const category = categories.find(c => c.id === categoryId);
        if (category?.yearlyBudget) return category.yearlyBudget;
        return 0;
    };

    const getBudgetForSubcategory = (subcategoryId: string, year: number): number => {
        const subcategory = subcategories.find(s => s.id === subcategoryId);
        if (!subcategory) return 0;
        const budget = budgets.find(
            b => b.subcategoryId === subcategoryId && b.year === year
        );
        if (budget) return budget.amount;
        if (subcategory.yearlyBudget) return subcategory.yearlyBudget;
        return 0;
    };

    const copyBudgetsToYear = (fromYear: number, toYear: number) => {
        const budgetsToCopy = budgets.filter(b => b.year === fromYear);
        budgetsToCopy.forEach(b => {
            // Clone budget to new year
            const { id, createdAt, updatedAt, ...budgetData } = b;
            addBudgetFn({
                ...budgetData,
                year: toYear
            });
        });
    };

    // Modal Global State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);

    const openModal = (transaction?: Transaction) => {
        setEditingTransaction(transaction);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setEditingTransaction(undefined);
        setIsModalOpen(false);
    };

    return (
        <AppContext.Provider
            value={{
                categories,
                subcategories,
                transactions,
                projectTags,
                budgets,

                isModalOpen,
                editingTransaction,
                openModal,
                closeModal,

                addTransaction,
                deleteTransaction,
                updateTransaction,
                addCategory,
                updateCategory,
                deleteCategory,
                addSubcategory,
                updateSubcategory,
                deleteSubcategory,
                addProjectTag,
                updateProjectTag,
                deleteProjectTag,

                addBudget,
                updateBudget,
                deleteBudget,
                getBudgetForCategory,
                getBudgetForSubcategory,
                copyBudgetsToYear,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
