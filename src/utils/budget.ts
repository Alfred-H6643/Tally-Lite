import type { Budget } from '../types';

type BudgetFigure = Pick<Budget, 'amount' | 'monthlyAmounts'>;

/**
 * A budget is a single figure: `amount` is the annual total, and `monthlyAmounts`
 * is only an optional breakdown of that same figure.
 *
 * Returns the breakdown when it is present and valid, otherwise null. A breakdown
 * that doesn't add back up to `amount` is stale and gets ignored — earlier versions
 * of the editor updated `amount` when saving in yearly mode but left the previous
 * per-month values in place, so the report's month view read the old numbers while
 * the year view showed the new total. Ignoring the mismatch repairs those records
 * on read, without needing to rewrite them.
 */
export const getMonthlyAmounts = (budget: BudgetFigure): number[] | null => {
    const months = budget.monthlyAmounts;
    if (!Array.isArray(months) || months.length !== 12) return null;

    const sum = months.reduce((total, val) => total + (val || 0), 0);
    if (Math.round(sum) !== Math.round(budget.amount)) return null;

    return months;
};

/** The budget for one month: the explicit value if set, otherwise an even split. */
export const getMonthlyBudget = (budget: BudgetFigure, monthIndex: number): number => {
    const months = getMonthlyAmounts(budget);
    return months ? months[monthIndex] : Math.round(budget.amount / 12);
};
