import type { Category, Subcategory } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper to create category and its subcategories with optional budgets
const createCategory = (
    name: string,
    icon: string,
    color: string,
    subNames: string[],
    type: 'expense' | 'income' = 'expense',
    order: number,
    categoryBudget: number = 0,
    subBudgets: Record<string, number> = {}
): { category: Category; subcategories: Subcategory[] } => {
    const categoryId = uuidv4();
    const category: Category = {
        id: categoryId,
        name,
        icon,
        color,
        type,
        isHidden: false,
        order,
        yearlyBudget: categoryBudget,
    };

    const createSubcategory = (parentId: string, name: string, order: number, budget: number = 0): Subcategory => {
        return {
            id: uuidv4(),
            parentId,
            name,
            isHidden: false,
            order,
            yearlyBudget: budget,
        };
    };

    const subcategories: Subcategory[] = [
        createSubcategory(categoryId, '未分類', 0, subBudgets['未分類'] || 0),
        ...subNames.map((subName, index) =>
            createSubcategory(categoryId, subName, index + 1, subBudgets[subName] || 0)
        ),
    ];

    return { category, subcategories };
};

export const initializeDefaultData = () => {
    const categories: Category[] = [];
    let allSubcategories: Subcategory[] = [];

    // 定義費用分類和預算
    // 測試情境：
    // 1. 食物：有分類預算和部分子分類預算
    // 2. 交通：只有分類預算，沒有子分類預算
    // 3. 居家：分類和所有子分類都有預算
    // 4. 健康：沒有分類預算，但有部分子分類預算
    // 5. 外觀：完全沒有預算
    // 6-11. 其他分類：混合情境

    type CategoryData = {
        name: string;
        icon: string;
        color: string;
        subs: string[];
        categoryBudget: number;
        subBudgets: Record<string, number>;
    };

    const expenseCategoriesData: CategoryData[] = [
        // 食物：移除「咖啡」、「食材」
        {
            name: '食物',
            icon: '🍔',
            color: '#FF6B6B',
            subs: ['正餐', '飲料', '零食'],
            categoryBudget: 120000,
            subBudgets: {
                '正餐': 60000
            }
        },
        // 交通：移除「租車」
        {
            name: '交通',
            icon: '🚌',
            color: '#4ECDC4',
            subs: ['大眾運輸', '計程車'],
            categoryBudget: 36000,
            subBudgets: {}
        },
        // 居家：移除「消費品/設備」、「電信」、「稅」
        {
            name: '居家',
            icon: '🏠',
            color: '#45B7D1',
            subs: ['雜費', '日用品'],
            categoryBudget: 72000,
            subBudgets: {
                '雜費': 12000,
                '日用品': 18000
            }
        },
        // 健康：移除「按摩」、「身心」
        {
            name: '健康',
            icon: '💊',
            color: '#96CEB4',
            subs: ['醫療', '保健食品', '保險'],
            categoryBudget: 0,
            subBudgets: {
                '保險': 48000
            }
        },
        // 外觀 → 消費：移除「保養」
        {
            name: '消費',
            icon: '👕',
            color: '#FFEEAD',
            subs: ['剪髮', '服裝', '鞋子'],
            categoryBudget: 0,
            subBudgets: {}
        },
        // 社交：移除「喝酒」、「公益」
        {
            name: '社交',
            icon: '🎁',
            color: '#D4A5A5',
            subs: ['聚餐', '送禮'],
            categoryBudget: 48000,
            subBudgets: {
                '聚餐': 30000,
                '送禮': 12000
            }
        },
        // 娛樂：移除「電影/表演/展覽」
        {
            name: '娛樂',
            icon: '🎮',
            color: '#9B59B6',
            subs: ['閱讀', '體驗', '遊戲', '串流'],
            categoryBudget: 36000,
            subBudgets: {
                '串流': 3600,
                '遊戲': 6000
            }
        },
        // 運動：移除「賽事」、「訓練課」、「補給」
        {
            name: '運動',
            icon: '🏃',
            color: '#3498DB',
            subs: ['裝備', '場地費'],
            categoryBudget: 24000,
            subBudgets: {
                '場地費': 12000
            }
        },
        // 旅行：保持不變
        {
            name: '旅行',
            icon: '✈️',
            color: '#F1C40F',
            subs: ['旅遊交通', '旅遊住宿', '旅遊餐食', '旅遊娛樂', '旅遊其他'],
            categoryBudget: 150000,
            subBudgets: {}
        },
        // 學習：保持不變
        {
            name: '學習',
            icon: '📚',
            color: '#2ECC71',
            subs: ['課程', '工具書', '軟體', '語言'],
            categoryBudget: 0,
            subBudgets: {
                '課程': 30000,
                '軟體': 12000
            }
        },
        // 家人：整個分類刪除
    ];

    expenseCategoriesData.forEach((c, index) => {
        const { category, subcategories } = createCategory(
            c.name,
            c.icon,
            c.color,
            c.subs,
            'expense',
            index,
            c.categoryBudget,
            c.subBudgets
        );
        categories.push(category);
        allSubcategories = [...allSubcategories, ...subcategories];
    });

    // 收入分類（通常不需要預算）
    const { category: incomeCategory, subcategories: incomeSubs } = createCategory(
        '收入',
        '💰',
        '#27AE60',
        ['薪資', '紅包', '中獎', '投資'],
        'income',
        expenseCategoriesData.length
    );
    categories.push(incomeCategory);
    allSubcategories = [...allSubcategories, ...incomeSubs];

    return { categories, allSubcategories };
};
