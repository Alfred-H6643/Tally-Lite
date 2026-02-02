export type TransactionType = 'expense' | 'income';

export interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: TransactionType;
    isHidden: boolean;
    order: number;
    /** @deprecated Use Budget system instead. This field is kept for backward compatibility. */
    yearlyBudget?: number;
}

export interface Subcategory {
    id: string;
    parentId: string;
    name: string;
    /** @deprecated Use Budget system instead. This field is kept for backward compatibility. */
    yearlyBudget?: number;
    isHidden: boolean;
    order: number;
}

export interface Transaction {
    id: string;
    amount: number;
    currency: string; // 'TWD', 'USD', etc.
    categoryId: string;
    subcategoryId: string;
    date: Date; // Stored as Timestamp in Firestore
    note?: string;
    tags?: string[];
    type: TransactionType;
    createdAt: Date;
    updatedAt: Date;
}

export interface User {
    id: string;
    email: string;
    displayName: string;
    photoURL?: string;
}

export interface Currency {
    code: string;
    symbol: string;
    name: string;
}

export interface ExchangeRate {
    from: string;
    to: string;
    rate: number;
    updatedAt: Date;
}

export interface ProjectTag {
    id: string;
    name: string;
    status: 'active' | 'archived';
    order: number;
}

export interface UserSettings {
    defaultCurrency: string;
    theme: 'light' | 'dark' | 'system';
}

// Budget System - Year-based budgets
export interface Budget {
    id: string;
    year: number;                     // 預算年度 (e.g., 2025)
    categoryId?: string;              // 分類 ID（如果是分類預算）
    subcategoryId?: string;           // 子分類 ID（如果是子分類預算）
    amount: number;                   // 年度預算金額
    monthlyAmounts?: number[];        // 每月預算 (12 個月)
    createdAt: Date;
    updatedAt: Date;
}

// Helper type: Budget data with category information for display
export interface BudgetWithCategory extends Budget {
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    categoryType: TransactionType;
    subcategoryName?: string;
}
