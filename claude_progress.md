# Claude Code 實作進度報告

**最後更新**：2026-03-26
**狀態**：✅ 所有步驟完成，待使用者設定環境變數並部署

---

## 已完成項目

### ✅ 步驟 1：vercel.json 路由設定
- 修改 `vercel.json`，新增 `/api/(.*)` rewrite 規則，確保 API 路徑不被 SPA 攔截。

### ✅ 步驟 2：依賴安裝與 TypeScript 設定
- 安裝 `firebase-admin@13.7.0`
- 安裝 `@vercel/node@5.6.20`（Vercel Serverless Function 型別定義）
- 建立 `api/tsconfig.json`（獨立 Node.js 環境，避免與 Vite 前端 DOM 型別衝突）

### ✅ 步驟 3：Firebase Admin SDK 初始化
- 建立 `api/_utils/firebaseAdmin.ts`
- 從 `process.env` 讀取三個環境變數
- 處理 `FIREBASE_ADMIN_PRIVATE_KEY` 的換行符號問題（`\\n` → `\n`）
- 使用 `admin.apps.length` 防止重複初始化

### ✅ 步驟 4：API 端點實作
- 建立 `api/agent/transactions.ts`（`GET /api/agent/transactions`）
- **安全驗證**：比對 `Authorization: Bearer <AI_AGENT_API_KEY>`，不符則 401
- **userId 鎖死**：固定使用 `AGENT_TARGET_USER_UID` 環境變數，不接受外部傳入
- **日期過濾**：接受 `startDate` / `endDate`（YYYY-MM-DD），預設當月 1 號至今，使用 Firestore `Timestamp` 查詢（因 `date` 欄位在 Firestore 中以 Timestamp 存儲）
- **關聯名稱替換**：平行抓取 categories / subcategories，將 `categoryId` / `subcategoryId` 替換為中文名稱
- **JSON 清洗**：移除 `id`, `categoryId`, `subcategoryId`, `createdAt`, `updatedAt`
- **回傳格式**：符合規格，含 `summary` 與 `data` 陣列

---

## 使用者待辦事項

請在 Vercel Dashboard 設定以下環境變數，然後重新部署：

| 環境變數 | 說明 |
|---|---|
| `AI_AGENT_API_KEY` | AI Agent 呼叫時使用的 Bearer Token |
| `AGENT_TARGET_USER_UID` | 目標 Firebase 使用者的 UID |
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase 服務帳號 Project ID |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase 服務帳號 Email |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase 服務帳號私鑰（含完整 `-----BEGIN...` 內容） |

---

## 呼叫範例

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-app.vercel.app/api/agent/transactions?startDate=2026-03-01&endDate=2026-03-26"
```

---

## 新增的檔案結構

```
api/
├── tsconfig.json
├── _utils/
│   └── firebaseAdmin.ts
└── agent/
    └── transactions.ts
```
