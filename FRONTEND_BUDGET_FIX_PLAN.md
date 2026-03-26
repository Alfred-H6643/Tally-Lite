# 修正前端 Web App 的報表預算計算 Bug (For Claude)

**背景與目標**：
目前的 Web 應用程式 (TallyLite) 在 `src/components/Report.tsx` 與 `src/context/AppContext.tsx` 中，計算「當月預算」時是直接拿「年度預算」除以 12 (`Math.round(yearlyBudget / 12)`)。這會導致「僅設定在特定月份的預算（例如 5 月的稅）」被錯誤地平均分攤到每個月。
我們需要重構這段邏輯，使其在 `viewMode === 'month'` 以及計算 `YTD Balance` 時，能夠優先讀取 `Budget` 資料中的 `monthlyAmounts` 陣列（若存在）。

## 實作步驟：

### 1. 修改 `src/context/AppContext.tsx`
在 `AppContextType` 介面中，為兩個函式新增可選的 `monthIndex` (0-11) 參數：
```typescript
    getBudgetForCategory: (categoryId: string, year: number, monthIndex?: number) => number;
    getBudgetForSubcategory: (subcategoryId: string, year: number, monthIndex?: number) => number;
```

**更新函式實作**：
- `getBudgetForSubcategory`: 找到 budget 後，如果傳入了 `monthIndex`，優先檢查 `budget.monthlyAmounts` 是否存在且長度為 12，若有就回傳 `budget.monthlyAmounts[monthIndex]`；若無則回傳 `Math.round(budget.amount / 12)`。如果沒傳 `monthIndex`，則回傳原本的 `budget.amount`（年度加總）。
- `getBudgetForCategory`: 這是該分類底下所有子分類預算的加總。加總邏輯 (reduce) 中也要比照辦理：若有提供 `monthIndex`，檢查各個 `subBudget` 的 `monthlyAmounts`，將單月數值加總回傳；無則回傳 `Math.round(subBudget.amount / 12)` 加總。若沒提供 `monthIndex`，則維持原樣加總 `amount`。

### 2. 修改 `src/components/Report.tsx`

**A. 修正 `getCategoryBudget` 與 `getSubcategoryBudget`：**
這兩個 hook 在判定 `viewMode === 'month'` 時，需要把取得的現在月份 index (`dateRange.start.getMonth()`) 丟給 Context 的函式。
```tsx
    const getCategoryBudget = React.useCallback((categoryId: string) => {
        const year = dateRange.start.getFullYear();
        
        // 若為月視角，直接向 Context 索取單月預算
        if (viewMode === 'month') {
            const monthIndex = dateRange.start.getMonth();
            const monthlyBudget = getBudgetForCategory(categoryId, year, monthIndex);
            return monthlyBudget === 0 ? null : monthlyBudget;
        }

        // 其餘視角（年、自訂）維持索取年度預算再來運算
        const yearlyBudget = getBudgetForCategory(categoryId, year);
        if (yearlyBudget === 0) return null;
        
        if (viewMode === 'year') return yearlyBudget;
        
        const daysInRange = differenceInDays(dateRange.end, dateRange.start) + 1;
        // ... (保持原本 pro-rate 計算邏輯)
```
(`getSubcategoryBudget` 也需作一模一樣的修改)

**B. 修正 `getYTDBalance` 的 Accumulated Budget 計算：**
目前 `getYTDBalance` 是拿全年度金額除以 12 再乘上累積月數（`Math.round((fullYearBudget / 12) * monthsCount)`）。
這必須改成 `for` 迴圈從 1 月 (0) 累加到當前月 (`currentMonth.getMonth()`)。
```tsx
        // 1. Calculate Accumulated Budget
        const year = currentMonth.getFullYear();
        const currentMonthIndex = currentMonth.getMonth();
        
        // 確認該項目是否有任何預算設定 (用以決定要不要呈現 YTD)
        const fullYearBudget = subcategoryId
            ? getBudgetForSubcategory(subcategoryId, year)
            : getBudgetForCategory(categoryId!, year);

        if (fullYearBudget === 0) return null;

        let accumulatedBudget = 0;
        for (let m = 0; m <= currentMonthIndex; m++) {
            const monthBudget = subcategoryId
                ? getBudgetForSubcategory(subcategoryId, year, m)
                : getBudgetForCategory(categoryId!, year, m);
            accumulatedBudget += monthBudget;
        }

        // ... 接著維持原本的 Accumulated Expenses 計算邏輯
```

---
**請 Claude 讀取此份文件後，實作上面的修正，並確保 Tally Lite React App 在 Monthly View 以及 YTD Balance 都能精準處理 `monthlyAmounts`。**
