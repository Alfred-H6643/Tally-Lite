import { v4 as uuidv4 } from 'uuid';
import { initializeDefaultData } from '../utils/defaultCategories';
import type { Category, Subcategory, Transaction, Budget, ProjectTag } from '../types';

// Mock Data Types
type MockCollection = {
    categories: Category[];
    subcategories: Subcategory[];
    transactions: Transaction[];
    budgets: Budget[];
    projectTags: ProjectTag[];
};

type CollectionName = keyof MockCollection;

class MockDatabase {
    private static instance: MockDatabase;
    private data: MockCollection;
    private listeners: Map<string, Set<(data: any[]) => void>>;

    private constructor() {
        this.data = {
            categories: [],
            subcategories: [],
            transactions: [],
            budgets: [],
            projectTags: []
        };
        this.listeners = new Map();
        this.reset();
    }

    public static getInstance(): MockDatabase {
        if (!MockDatabase.instance) {
            MockDatabase.instance = new MockDatabase();
        }
        return MockDatabase.instance;
    }

    /**
     * Resets the mock database to its initial state with default categories
     * and generates fake transactions for the demo period (2025/12 - 2026/06).
     */
    public reset() {
        // 1. Load default categories
        const { categories, allSubcategories } = initializeDefaultData();

        // 2. Generate fake transactions
        const transactions = this.generateFakeTransactions(categories, allSubcategories);

        // 3. Generate fake budgets for 2026
        const budgets = this.generateFakeBudgets(allSubcategories, transactions);

        this.data = {
            categories,
            subcategories: allSubcategories,
            transactions,
            budgets,
            projectTags: []
        };

        // Notify all listeners of the reset
        this.notifyAll();
    }

    private generateFakeBudgets(subcategories: Subcategory[], transactions: Transaction[]): Budget[] {
        const budgets: Budget[] = [];
        const YEAR = 2026;
        const now = new Date();

        // Helper to calculate estimated annual expense for 2026 based on mock data (Jan-Jun)
        const getEstimatedAnnualExpense = (subcategoryId: string) => {
            const subTransactions = transactions.filter(t =>
                t.subcategoryId === subcategoryId &&
                t.date.getFullYear() === YEAR &&
                t.type === 'expense'
            );
            const total = subTransactions.reduce((sum, t) => sum + t.amount, 0);
            // Mock data is ~6 months, so annualize it (x2)
            return total * 2;
        };

        // Generate Budget records for Subcategories
        subcategories.forEach(sub => {
            // Calculate "Smart Budget" base
            const estimatedAnnual = getEstimatedAnnualExpense(sub.id);
            let budgetAmount = 0;

            if (estimatedAnnual > 0) {
                // Apply variance: 0.8x to 1.25x of estimated usage
                // This creates a mix of "Under Budget" (if variance > 1.0) and "Over Budget" (if variance < 1.0) scenarios
                // Wait, if Budget = 0.8 * Expense, then Expense > Budget -> Over Budget.
                // If Budget = 1.2 * Expense, then Expense < Budget -> Under Budget.
                const variance = 0.8 + Math.random() * 0.45; // 0.8 to 1.25
                budgetAmount = Math.round(estimatedAnnual * variance / 100) * 100; // Round to nearest 100
            } else if (sub.yearlyBudget && sub.yearlyBudget > 0) {
                // Fallback to default if no transactions generated for this subcategory
                budgetAmount = sub.yearlyBudget;
            }

            if (budgetAmount > 0) {
                budgets.push({
                    id: uuidv4(),
                    year: YEAR,
                    categoryId: sub.parentId,
                    subcategoryId: sub.id,
                    amount: budgetAmount,
                    // Optional: Generate monthly breakdown (evenly distributed for now)
                    monthlyAmounts: Array(12).fill(Math.round(budgetAmount / 12)),
                    createdAt: now,
                    updatedAt: now
                });
            }
        });

        // Also generate for 2025 for seamless transition (Dec 2025 data exists)
        // For 2025, just use the default logic or simplified version since user focuses on 2026
        subcategories.forEach(sub => {
            if (sub.yearlyBudget && sub.yearlyBudget > 0) {
                budgets.push({
                    id: uuidv4(),
                    year: 2025,
                    categoryId: sub.parentId,
                    subcategoryId: sub.id,
                    amount: sub.yearlyBudget,
                    createdAt: now,
                    updatedAt: now
                });
            }
        });

        return budgets;
    }

    private generateFakeTransactions(categories: Category[], subcategories: Subcategory[]): Transaction[] {
        const transactions: Transaction[] = [];
        const startDate = new Date('2025-12-01');
        const endDate = new Date('2026-06-30');
        const now = new Date();

        // Helper to get random item from array
        const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

        // Helper to get random date between start and end
        const getRandomDate = (start: Date, end: Date) => {
            return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
        };

        // Generate ~300 transactions
        for (let i = 0; i < 300; i++) {
            const date = getRandomDate(startDate, endDate);
            // Filter expense categories for transactions
            const expenseCats = categories.filter(c => c.type === 'expense');
            const category = getRandom(expenseCats);

            // Find subcategories for this category
            const relevantSubs = subcategories.filter(s => s.parentId === category.id);
            const subcategory = relevantSubs.length > 0 ? getRandom(relevantSubs) : null;

            if (!category) continue;

            // Random amount between 50 and 5000
            const amount = Math.floor(Math.random() * 100) * 50 + 50;

            transactions.push({
                id: uuidv4(),
                amount,
                currency: 'TWD',
                categoryId: category.id,
                subcategoryId: subcategory ? subcategory.id : '',
                date: date,
                type: 'expense',
                note: '訪客測試資料',
                createdAt: now,
                updatedAt: now
            });
        }

        // Add some income
        const incomeCat = categories.find(c => c.type === 'income');
        if (incomeCat) {
            const relevantSubs = subcategories.filter(s => s.parentId === incomeCat.id);
            // Monthly salary for each month
            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const salaryDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 5); // 5th of each month
                if (salaryDate <= endDate) {
                    transactions.push({
                        id: uuidv4(),
                        amount: 50000,
                        currency: 'TWD',
                        categoryId: incomeCat.id,
                        subcategoryId: relevantSubs.find(s => s.name === '薪資')?.id || '',
                        date: salaryDate,
                        type: 'income',
                        note: '月薪',
                        createdAt: now,
                        updatedAt: now
                    });
                }
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        }

        return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    private getCollectionNameFromPath(path: string): CollectionName | null {
        // Path format: users/GUEST/collectionName
        const parts = path.split('/');
        if (parts.length >= 3 && parts[1] === 'GUEST') {
            const collection = parts[2] as CollectionName;
            if (collection in this.data) {
                return collection;
            }
        }
        return null;
    }

    public subscribe(path: string, callback: (data: any[]) => void): () => void {
        const collectionName = this.getCollectionNameFromPath(path);

        if (!collectionName) {
            // If path is invalid or not mocked, return empty immediately
            callback([]);
            return () => { };
        }

        if (!this.listeners.has(collectionName)) {
            this.listeners.set(collectionName, new Set());
        }

        const collectionListeners = this.listeners.get(collectionName)!;
        collectionListeners.add(callback);

        // Initial callback with current data
        // Filter logic? Firestore queries usually have filters.
        // For simplicity, we pass ALL data and let valid filters happen in memory if we really implemented query parsing.
        // However, `useFirestoreCollection` expects the backend to filter. 
        // For GUEST mode, we can implement basic filtering if strictly needed, but sending all 300 records is fine for client-side app.
        // Wait, `useFirestoreCollection` receives `constraints`. We can't easily parse complex Firestore QueryConstraints here.
        // BUT, `AppContext` filters `transactions` in memory anyway for `Report` via `subscribedFilter`? 
        // No, `AppContext` passes constraints to `useFirestoreCollection` to filter at DB level.
        // We might need to implement basic date filtering for transactions.

        // Let's just return ALL data for now, as 300 items is small.
        callback([...this.data[collectionName]]);

        return () => {
            collectionListeners.delete(callback);
            if (collectionListeners.size === 0) {
                this.listeners.delete(collectionName);
            }
        };
    }

    public async add(path: string, item: any): Promise<any> {
        const collectionName = this.getCollectionNameFromPath(path);
        if (!collectionName) throw new Error(`Invalid mock collection path: ${path}`);

        const newItem = {
            ...item,
            id: uuidv4(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        (this.data[collectionName] as any[]).push(newItem);
        this.notify(collectionName);
        return { id: newItem.id };
    }

    public async update(path: string, id: string, updates: any): Promise<void> {
        const collectionName = this.getCollectionNameFromPath(path);
        if (!collectionName) throw new Error(`Invalid mock collection path: ${path}`);

        const collection = this.data[collectionName] as any[];
        const index = collection.findIndex(item => item.id === id);

        if (index !== -1) {
            collection[index] = { ...collection[index], ...updates, updatedAt: new Date() };
            this.notify(collectionName);
        }
    }

    public async delete(path: string, id: string): Promise<void> {
        const collectionName = this.getCollectionNameFromPath(path);
        if (!collectionName) throw new Error(`Invalid mock collection path: ${path}`);

        const collection = this.data[collectionName] as any[];
        this.data[collectionName] = collection.filter(item => item.id !== id) as any;
        this.notify(collectionName);
    }

    public async set(path: string, id: string, item: any): Promise<void> {
        const collectionName = this.getCollectionNameFromPath(path);
        if (!collectionName) throw new Error(`Invalid mock collection path: ${path}`);

        const collection = this.data[collectionName] as any[];
        const index = collection.findIndex(existing => existing.id === id);

        if (index !== -1) {
            collection[index] = { ...collection[index], ...item, updatedAt: new Date() };
        } else {
            collection.push({ ...item, id: id, createdAt: new Date(), updatedAt: new Date() });
        }
        this.notify(collectionName);
    }

    private notify(collectionName: CollectionName) {
        const listeners = this.listeners.get(collectionName);
        if (listeners) {
            const data = [...this.data[collectionName]];
            // We should sort transactions by date desc by default if it's transaction collection
            if (collectionName === 'transactions') {
                (data as Transaction[]).sort((a, b) => b.date.getTime() - a.date.getTime());
            }
            listeners.forEach(callback => callback(data));
        }
    }

    private notifyAll() {
        for (const collectionName of Object.keys(this.data) as CollectionName[]) {
            this.notify(collectionName);
        }
    }
}

export const mockDb = MockDatabase.getInstance();
