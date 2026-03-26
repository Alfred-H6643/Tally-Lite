# Budget API Endpoint Implementation Plan (For Claude)

**Objective**: Create a new Serverless API endpoint `GET /api/agent/budgets` to allow the AI Agent to read the user's budget quota. This is similar to the existing `/api/agent/transactions` endpoint.

## 1. 執行目標
建立一個供 AI Agent 讀取的唯讀端點，用來回傳指定年度或月份的預算設定。此次更新加入了「指定月份 (`?month=YYYY-MM`)」的支援，以修正原本 Agent 必須自行將年度預算除以 12 而導致「特定月份才有預算（例如 5 月的稅）」計算錯誤的 Bug；同時在 `summary` 中加入 `category` 層級的小計，減少 Agent 計算負擔。

## 2. 實作細節

### 新增檔案: `api/agent/budgets.ts`
建立新的 API route，邏輯上與 `transactions.ts` 類似，請參考並複用 `firebaseAdmin.ts` 進行初始化。

**Step-by-step 邏輯**：
1. **Method Check**: 只允許 `GET`，否則回傳 `405`。
2. **Auth Check**: 檢查 `Authorization` header 是否等於 `Bearer ${process.env.AI_AGENT_API_KEY}`，否則回傳 `401`。
3. **User Check**: 取得 `process.env.AGENT_TARGET_USER_UID` 作為 `userId`。
4. **解析參數 (`year` 與 `month`)**:
   - `month` (格式： `YYYY-MM`，如 `2026-03`)。
   - `year` (格式：`YYYY`)。
   - 若有傳 `month`，從中解析出 `year` 及 `monthIndex` (0-11，例如 `03` 代表 index `2`)。
   - 若只傳 `year`、或皆未傳，則使用現在的年份與月份（請依台北時區 `Asia/Taipei` 認定）。
5. **資料庫連線**:
   - 平行抓取(或依序抓取)三個 collection 的資料：
     1. `users/${userId}/budgets` - 條件是 `where('year', '==', year)`
     2. `users/${userId}/categories` - 取回全部分類建立 name map。
     3. `users/${userId}/subcategories` - 取回全部次分類建立 name map。
6. **Data Mapping && Cleaning**:
   - 走訪 budgets 的 documents。
   - 將 `categoryId` 與 `subcategoryId` 轉換成易讀的中文 `category` 與 `subcategory`。
   - 隱藏內部屬性：`id`, `categoryId`, `subcategoryId`, `createdAt`, `updatedAt` 不需回傳。
   - 保留 `year` 與 `amount` (年度總額)。
   - **計算 `monthlyBudget`**:
     - 檢查 `monthlyAmounts` 陣列是否存在且長度為 12。
     - 若存在：`monthlyBudget = monthlyAmounts[monthIndex]`。
     - 若不存在：`monthlyBudget = Math.round(amount / 12)`。
   - 保留的屬性需包含：`year`, `amount`, `monthlyBudget`, `category`, `subcategory` 以及 `monthlyAmounts`。
7. **Summary 統計**:
   - `totalYearlyBudget`: 加總所有資料的 `amount`。
   - `monthlyBudget`: 加總所有資料計算出的 `monthlyBudget`。
   - `byCategory`: 建立一個 Object，將所有資料依據 `category` (中文名稱) 進行 `monthlyBudget` 的加總。
8. **回傳 JSON**: 格式範例如下：
```json
{
  "summary": {
    "year": 2026,
    "month": "2026-03",
    "totalYearlyBudget": 779400,
    "monthlyBudget": 64950,
    "budgetCount": 3,
    "byCategory": {
      "食物": 10000,
      "生活": 3500,
      "稅": 0
    }
  },
  "data": [
    {
      "year": 2026,
      "amount": 15000,
      "monthlyBudget": 0,
      "category": "稅",
      "subcategory": "",
      "monthlyAmounts": [0, 0, 0, 0, 15000, 0, 0, 0, 0, 0, 0, 0] 
    }
  ]
}
```

## 3. 修改 README 或是現有文件 (可選)
確保這個新的 endpoint 已經成功加入應用程式中。

---
**請 Claude 讀完這份文件後，直接開始建立 `api/agent/budgets.ts` 並實作上述邏輯。完成後請回報給使用者。**
