import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Category, Subcategory, Transaction, ProjectTag, Budget } from '../types';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { useFirestoreCollection } from '../hooks/useFirestore';
import { db } from '../services/firebase';
import { doc, setDoc, deleteDoc, writeBatch, orderBy, where, onSnapshot } from 'firebase/firestore';

export interface UserProfile {
    displayName: string;
    avatar: string;
}

interface AppContextType {
    categories: Category[];
    subcategories: Subcategory[];
    transactions: Transaction[];
    projectTags: ProjectTag[];
    budgets: Budget[];
    addTransaction: (transaction: Transaction) => void;
    deleteTransaction: (id: string) => void;
    updateTransaction: (transaction: Transaction) => void;
    batchDeleteTransactions: (ids: string[]) => Promise<void>;
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

    // Transaction Filtering (Dynamic Loading)
    transactionFilter: { start: Date | null; end: Date | null };
    setTransactionFilter: (range: { start: Date | null; end: Date | null }) => void;

    // UI state
    isModalOpen: boolean;
    editingTransaction?: Transaction;
    initialDate?: Date;
    openModal: (transaction?: Transaction, date?: Date) => void;
    closeModal: () => void;
    lastModifiedTransactionId: string | null;

    // User Profile
    userProfile: UserProfile;
    updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;

    // Export Settings
    exportSettings: {
        scriptUrl: string;
    };
    updateExportSettings: (settings: { scriptUrl: string }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useFirebaseAuth();
    const userId = user?.uid;

    const [userProfile, setUserProfile] = useState<UserProfile>({
        displayName: '匿名的記帳專家',
        avatar: '👤'
    });

    // Fetch user profile from Firestore
    React.useEffect(() => {
        if (!userId) return;

        const docRef = doc(db, 'users', userId, 'config', 'profile');
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setUserProfile(docSnap.data() as UserProfile);
            } else {
                // If it doesn't exist, we don't necessarily need to create it immediately,
                // the default state is already set.
            }
        });

        return () => unsubscribe();
    }, [userId]);

    const updateUserProfile = async (profile: Partial<UserProfile>) => {
        if (!userId) return;
        const docRef = doc(db, 'users', userId, 'config', 'profile');
        const newProfile = { ...userProfile, ...profile };
        await setDoc(docRef, newProfile, { merge: true });
    };

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

    // Dynamic Transaction Filtering State
    // subscribedFilter determines what we FETCH from Firestore
    // We only update this if the requested range is NOT covered by the current range
    const [subscribedFilter, setSubscribedFilter] = useState<{ start: Date | null; end: Date | null }>({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Start of current month
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0) // End of current month
    });

    // Also keep track of the "Requested" filter for debugging or other uses, though consumers actively manage their own filters.
    // Actually we don't need to expose "active" filter if consumers filter locally.

    // We expose setTransactionFilter to consumers
    const setTransactionFilter = React.useCallback((range: { start: Date | null; end: Date | null }) => {
        setSubscribedFilter(prev => {
            const prevStart = prev.start?.getTime();
            const prevEnd = prev.end?.getTime();
            const newStart = range.start?.getTime();
            const newEnd = range.end?.getTime();

            // 1. Exact match check (Optimization 1)
            if (prevStart === newStart && prevEnd === newEnd) {
                return prev;
            }

            // 2. Superset check (Optimization 2)
            // If the new requested range is COMPLETELY INSIDE the existing subscribed range,
            // we DO NOT need to fetch. We can just keep the larger dataset loaded.
            // Consumers (Dashboard/Report) must filter the data locally anyway.
            if (prev.start && prev.end && range.start && range.end) {
                if (range.start >= prev.start && range.end <= prev.end) {
                    // console.log("Cache Hit: Requested range is subset of loaded range. Skipping fetch.");
                    return prev;
                }
            }

            return range;
        });
    }, []);

    const transactionConstraints = React.useMemo(() => {
        const constraints: any[] = [orderBy('date', 'desc')];
        if (subscribedFilter.start) {
            constraints.push(where('date', '>=', subscribedFilter.start));
        }
        if (subscribedFilter.end) {
            constraints.push(where('date', '<=', subscribedFilter.end));
        }
        return constraints;
    }, [subscribedFilter.start, subscribedFilter.end]);

    const { data: transactions, add: addTransactionFn, update: updateTransactionFn } = useFirestoreCollection<Transaction>(
        userId ? `users/${userId}/transactions` : '',
        transactionConstraints
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
        setLastModifiedTransactionId(transaction.id);
    };
    const updateTransaction = (transaction: Transaction) => {
        updateTransactionFn(transaction.id, transaction);
        setLastModifiedTransactionId(transaction.id);
    };

    const deleteTransaction = async (id: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
        } catch (error) {
            console.error('Error deleting transaction:', error);
        }
    };

    const batchDeleteTransactions = async (ids: string[]) => {
        if (!user || ids.length === 0) return;

        // Firestore batch limit is 500. Let's process in chunks.
        const CHUNK_SIZE = 400;
        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
            const chunk = ids.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            chunk.forEach(id => {
                const docRef = doc(db, 'users', user.uid, 'transactions', id);
                batch.delete(docRef);
            });
            try {
                await batch.commit();
            } catch (error) {
                console.error('Error committing batch delete:', error);
            }
        }
    };

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
        // New Logic: Category Budget is the SUM of all its Subcategory Budgets.
        // We ignore explicit parent-level budgets (where subcategoryId is null/undefined).
        const subBudgets = budgets.filter(
            b => b.categoryId === categoryId &&
                b.subcategoryId && // Must be a subcategory budget
                b.year === year
        );

        const total = subBudgets.reduce((sum, b) => sum + b.amount, 0);
        return total;
    };

    const getBudgetForSubcategory = (subcategoryId: string, year: number): number => {
        const budget = budgets.find(
            b => b.subcategoryId === subcategoryId &&
                b.year === year
        );
        if (budget) return budget.amount;
        // Removed deprecated fallback to subcategory.yearlyBudget
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
    const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);
    const [lastModifiedTransactionId, setLastModifiedTransactionId] = useState<string | null>(null);

    // Export Settings State (Persisted to LocalStorage)
    const [exportSettings, setExportSettings] = useState(() => {
        const saved = localStorage.getItem('ah_money_export_settings');
        // Migrate old format or default
        const parsed = saved ? JSON.parse(saved) : {};
        return { scriptUrl: parsed.scriptUrl || '' };
    });

    const updateExportSettings = (settings: { scriptUrl: string }) => {
        setExportSettings(settings);
        localStorage.setItem('ah_money_export_settings', JSON.stringify(settings));
    };

    const openModal = (transaction?: Transaction, date?: Date) => {
        setEditingTransaction(transaction);
        setInitialDate(date);
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
                initialDate,
                openModal,
                closeModal,
                lastModifiedTransactionId,

                addTransaction,
                deleteTransaction,
                updateTransaction,
                batchDeleteTransactions,
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

                transactionFilter: subscribedFilter,
                setTransactionFilter,

                exportSettings,
                updateExportSettings,

                userProfile,
                updateUserProfile,
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
