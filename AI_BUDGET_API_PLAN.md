# Budget API Endpoint Implementation Plan (For Claude)

**Objective**: Create a new Serverless API endpoint `GET /api/agent/budgets` to allow the AI Agent to read the user's budget quota. This is similar to the existing `/api/agent/transactions` endpoint.

## 1. 執行目標
建立一個供 AI Agent 讀取的唯讀端點，用來回傳指定年度的預算設定。

## 2. 實作細節

### 新增檔案: `api/agent/budgets.ts`
建立新的 API route，邏輯上與 `transactions.ts` 類似，請參考並複用 `firebaseAdmin.ts` 進行初始化。

**Step-by-step 邏輯**：
1. **Method Check**: 只允許 `GET`，否則回傳 `405`。
2. **Auth Check**: 檢查 `Authorization` header 是否等於 `Bearer ${process.env.AI_AGENT_API_KEY}`，否則回傳 `401`。
3. **User Check**: 取得 `process.env.AGENT_TARGET_USER_UID` 作為 `userId`。
4. **解析參數**: 讀取 Query Parameter `year`。
   - 若未提供，取得現在的年份（依台北時區 `Asia/Taipei` 取 current year）。
   - 將 `year` 轉為整數。
5. **資料庫連線**:
   - 平行抓取(或依序抓取)三個 collection 的資料：
     1. `users/${userId}/budgets` - 條件是 `where('year', '==', year)`
     2. `users/${userId}/categories` - 取回全部分類建立 name map。
     3. `users/${userId}/subcategories` - 取回全部次分類建立 name map。
6. **Data Mapping && Cleaning**:
   - 走訪 budgets 的 documents。
   - 將 `categoryId` 與 `subcategoryId` 透過 maps 轉換成易讀的中文 `category` 與 `subcategory`。
   - 隱藏內部屬性：`id`, `categoryId`, `subcategoryId`, `createdAt`, `updatedAt` 不需回傳。
   - 保留的屬性需要包含：`year`, `amount` (年度預算), 以及 `monthlyAmounts` (如果有的話)。
7. **Summary 統計**:
   - 加總所有取回項目的 `amount`，做為 `totalYearlyBudget`。
8. **回傳 JSON**: 格式符合現有 API 設計慣例：
```json
{
  "summary": {
    "year": 2026,
    "totalYearlyBudget": 150000,
    "budgetCount": 3
  },
  "data": [
    {
      "year": 2026,
      "amount": 120000,
      "category": "食物",
      "subcategory": "正餐",
      "monthlyAmounts": [10000, 10000, ... ] // 12 elements if it exists
    }
  ]
}
```

## 3. 修改 README 或是現有文件 (可選)
確保這個新的 endpoint 已經成功加入應用程式中。

---
**請 Claude 讀完這份文件後，直接開始建立 `api/agent/budgets.ts` 並實作上述邏輯。完成後請回報給使用者。**
