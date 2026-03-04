# 資料遷移腳本使用說明

這個資料夾包含用於管理用戶資料和角色的 Node.js 腳本。

## 前置準備

### 1. 下載 Firebase Service Account Key

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇你的專案
3. 進入 **Project Settings** (齒輪圖標) → **Service Accounts**
4. 點擊 **Generate New Private Key**
5. 將下載的 JSON 檔案重新命名為 `serviceAccountKey.json`
6. 放置在 `scripts/` 資料夾內

⚠️ **重要**: `serviceAccountKey.json` 包含敏感資訊，請確保它已經加入 `.gitignore`，不要提交到版本控制。

### 2. 設定環境變數

複製 `.env.example` 並填入你的 Firebase 用戶 UID：

```bash
cp .env.example .env
```

編輯 `.env`，填入對應的 Firebase UID：

```
PROD_USER_ID="your-production-firebase-uid"
DEV_USER_ID="your-development-firebase-uid"
```

### 3. 安裝依賴

```bash
cd scripts
npm install
```

## 可用腳本

### 🔑 設定用戶角色 (`setUserRoles.js`)

設定兩個帳號的角色：
- 正式帳號 (PROD_USER_ID) → `user` (一般用戶)
- 開發帳號 (DEV_USER_ID) → `admin` (管理員)

**執行方式:**
```bash
npm run set-roles
# 或
node setUserRoles.js
```

**功能:**
- 為指定用戶設定角色欄位
- 如果 profile 不存在會自動創建

---

### 📋 複製用戶資料 (`copyUserData.js`)

從正式帳號複製資料到開發帳號。

**複製內容:**
- ✅ 所有分類 (categories)
- ✅ 所有子分類 (subcategories)
- ✅ 所有專案標籤 (projectTags)
- ✅ 所有預算設定 (budgets)
- ✅ 指定日期範圍的交易記錄 (transactions)
- ✅ 個人設定 (config/profile) - 並設定開發帳號為管理員

**執行方式:**
```bash
npm run copy-data
# 或
node copyUserData.js
```

**注意事項:**
- 此腳本會直接覆寫目標帳號的資料
- 交易記錄會保留原始的 document ID，避免重複
- 大量交易會自動分批處理 (每批 400 筆)

---

## 修改日期範圍

如果需要修改複製的交易日期範圍，編輯 `copyUserData.js`：

```javascript
// 日期範圍設定
const START_DATE = new Date('2024-11-01T00:00:00+08:00');
const END_DATE = new Date('2025-01-31T23:59:59+08:00');
```

## 常見問題

### Q: 執行腳本時出現 "Cannot find module" 錯誤
**A:** 確保你已經在 `scripts/` 資料夾內執行 `npm install`

### Q: 權限錯誤
**A:** 確保 Service Account Key 檔案路徑正確，且具有 Firestore 的讀寫權限

### Q: 可以重複執行嗎？
**A:** 可以。`copyUserData.js` 會覆寫相同 ID 的文件，`setUserRoles.js` 只會更新角色欄位

## 安全提醒

- ⚠️ **永遠不要** 將 `serviceAccountKey.json` 提交到 Git
- ⚠️ **永遠不要** 將 `scripts/.env` 提交到 Git
- ⚠️ 執行前先備份重要資料
- ⚠️ 建議先在測試環境執行

